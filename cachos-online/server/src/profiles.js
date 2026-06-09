// profiles.js — Login simple y autocontenido (sin base de datos externa).
// Guarda los perfiles en un archivo JSON en el servidor: usuario ÚNICO +
// contraseña (hasheada con bcrypt) + la personalización del personaje
// ({ hood, face, cup }). Emite un token JWT propio para identificar al usuario.
//
// Pensado para "guardar el personaje elegido" de forma persistente sin montar
// Supabase. Si en el futuro se quiere mover a una DB, basta con reemplazar las
// funciones de lectura/escritura del store.

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRES = '60d';
const SALT_ROUNDS = 10;

const DATA_DIR = process.env.PROFILES_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'profiles.json');

const HOOD_COUNT = 6;
const FACE_COUNT = 3;
const CUP_COUNT = 3;

// ── Store en archivo ────────────────────────────────────────────────────────

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({ users: {} }, null, 2));
}

function readStore() {
  ensureFile();
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data.users) data.users = {};
    return data;
  } catch {
    return { users: {} };
  }
}

function writeStore(data) {
  ensureFile();
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILE); // escritura atómica
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeCosmetic(c) {
  const n = (v, max) => {
    const x = Number.parseInt(v, 10);
    return Number.isFinite(x) ? ((x % max) + max) % max : 0;
  };
  return {
    hood: n(c?.hood, HOOD_COUNT),
    face: n(c?.face, FACE_COUNT),
    cup: n(c?.cup, CUP_COUNT),
  };
}

function signToken(user) {
  return jwt.sign({ pid: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyProfileToken(token) {
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET);
    return p && p.pid ? p : null;
  } catch {
    return null;
  }
}

function publicProfile(user) {
  return { id: user.id, username: user.username, cosmetic: user.cosmetic };
}

// ── API ───────────────────────────────────────────────────────────────────

async function registerProfile(username, password, cosmetic) {
  const clean = String(username || '').trim().toLowerCase();
  if (clean.length < 3 || clean.length > 20) {
    return { error: 'El usuario debe tener entre 3 y 20 caracteres.' };
  }
  if (!/^[a-z0-9_]+$/.test(clean)) {
    return { error: 'Solo letras, números y guión bajo.' };
  }
  if (!password || password.length < 4) {
    return { error: 'La contraseña debe tener al menos 4 caracteres.' };
  }

  const data = readStore();
  if (data.users[clean]) return { error: 'Ese nombre de usuario ya está en uso.' };

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    username: clean,
    password_hash,
    cosmetic: sanitizeCosmetic(cosmetic),
    createdAt: Date.now(),
  };
  data.users[clean] = user;
  writeStore(data);

  return { ok: true, token: signToken(user), profile: publicProfile(user) };
}

async function loginProfile(username, password) {
  const clean = String(username || '').trim().toLowerCase();
  const data = readStore();
  const user = data.users[clean];
  if (!user) return { error: 'Usuario o contraseña incorrectos.' };

  const valid = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!valid) return { error: 'Usuario o contraseña incorrectos.' };

  return { ok: true, token: signToken(user), profile: publicProfile(user) };
}

function getProfileById(id) {
  const data = readStore();
  const user = Object.values(data.users).find((u) => u.id === id);
  return user ? publicProfile(user) : null;
}

function setCosmetic(id, cosmetic) {
  const data = readStore();
  const key = Object.keys(data.users).find((k) => data.users[k].id === id);
  if (!key) return { error: 'Perfil no encontrado.' };
  data.users[key].cosmetic = sanitizeCosmetic(cosmetic);
  writeStore(data);
  return { ok: true, profile: publicProfile(data.users[key]) };
}

module.exports = {
  registerProfile,
  loginProfile,
  getProfileById,
  setCosmetic,
  verifyProfileToken,
  sanitizeCosmetic,
  HOOD_COUNT,
  FACE_COUNT,
  CUP_COUNT,
};
