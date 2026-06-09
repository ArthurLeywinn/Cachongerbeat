// auth.js — Registro, login y middleware JWT.
// Usa bcryptjs para hashear contraseñas y jsonwebtoken para tokens.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRES = '7d';
const SALT_ROUNDS = 10;

// ── Helpers ────────────────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ── Registro ───────────────────────────────────────────────────────────────

async function register(username, password) {
  if (!supabase) return { error: 'Base de datos no disponible.' };

  const clean = String(username || '').trim().toLowerCase();
  if (clean.length < 3 || clean.length > 20) {
    return { error: 'El usuario debe tener entre 3 y 20 caracteres.' };
  }
  if (!/^[a-z0-9_]+$/.test(clean)) {
    return { error: 'Solo letras, números y guión bajo.' };
  }
  if (!password || password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  // Verificar si el username ya existe.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', clean)
    .maybeSingle();

  if (existing) return { error: 'Ese nombre de usuario ya está en uso.' };

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ username: clean, password_hash })
    .select('id, username, elo, games_played, games_won')
    .single();

  if (error) return { error: 'Error al crear el usuario.' };

  const token = signToken({ userId: user.id, username: user.username });
  return { ok: true, token, user };
}

// ── Login ──────────────────────────────────────────────────────────────────

async function login(username, password) {
  if (!supabase) return { error: 'Base de datos no disponible.' };

  const clean = String(username || '').trim().toLowerCase();

  const { data: user } = await supabase
    .from('users')
    .select('id, username, password_hash, elo, games_played, games_won')
    .eq('username', clean)
    .maybeSingle();

  if (!user) return { error: 'Usuario o contraseña incorrectos.' };

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return { error: 'Usuario o contraseña incorrectos.' };

  const { password_hash, ...publicUser } = user;
  const token = signToken({ userId: user.id, username: user.username });
  return { ok: true, token, user: publicUser };
}

// ── Middleware Express ──────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado.' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Token inválido o expirado.' });

  req.user = payload;
  next();
}

// ── Verificación para Socket.io ─────────────────────────────────────────────
// Retorna el payload del token o null si es inválido.

function verifySocketToken(token) {
  if (!token) return null;
  return verifyToken(token);
}

module.exports = { register, login, requireAuth, verifySocketToken };
