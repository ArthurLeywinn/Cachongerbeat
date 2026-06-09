// =============================================================================
// index.js — Servidor HTTP (Express) + WebSockets (Socket.io).
// Incluye autenticación JWT + ELO ranked vía Supabase.
// =============================================================================

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { GameManager } = require('./gameManager');
const { register, login, requireAuth, verifySocketToken } = require('./auth');
const { supabase } = require('./db');
const { calculateElo } = require('./elo');

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const REVEAL_MS = 4800;

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Rutas REST — Auth
// ---------------------------------------------------------------------------

app.get('/health', (_req, res) => res.json({ ok: true, service: 'cachos-server' }));

// POST /auth/register  { username, password }
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  const result = await register(username, password);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// POST /auth/login  { username, password }
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const result = await login(username, password);
  if (result.error) return res.status(401).json(result);
  res.json(result);
});

// GET /auth/me  — verifica token y devuelve datos frescos del usuario
app.get('/auth/me', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ ok: true, user: { userId: req.user.userId, username: req.user.username } });
  const { data: user } = await supabase
    .from('users')
    .select('id, username, elo, games_played, games_won')
    .eq('id', req.user.userId)
    .maybeSingle();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ ok: true, user });
});

// GET /leaderboard  — top 20 por ELO
app.get('/leaderboard', async (_req, res) => {
  if (!supabase) return res.json({ ok: true, players: [] });
  const { data, error } = await supabase
    .from('users')
    .select('username, elo, games_played, games_won')
    .order('elo', { ascending: false })
    .limit(20);
  if (error) return res.status(500).json({ error: 'Error al obtener el ranking.' });
  res.json({ ok: true, players: data });
});

// ---------------------------------------------------------------------------
// Servidor HTTP + Socket.io
// ---------------------------------------------------------------------------

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

const manager = new GameManager();
const revealTimers = new Map();
const turnTimers = new Map();

// ---------------------------------------------------------------------------
// Utilidades de difusión
// ---------------------------------------------------------------------------

function broadcastState(game) {
  for (const player of game.players) {
    if (player.connected && player.socketId) {
      io.to(player.socketId).emit('state', game.serialize(player.id));
    }
  }
  armTurnTimer(game);
}

function armTurnTimer(game) {
  clearTimeout(turnTimers.get(game.code));
  turnTimers.delete(game.code);

  const seconds = game.settings?.turnSeconds;
  if (!seconds || game.status !== 'playing' || game.phase !== 'bidding') return;

  const turnAtArm = game.currentTurnId;
  const timer = setTimeout(() => {
    turnTimers.delete(game.code);
    if (game.status !== 'playing' || game.phase !== 'bidding' || game.currentTurnId !== turnAtArm) return;
    const result = game.autoBid();
    if (result && result.ok) {
      game._addLog?.('(Tiempo agotado: apuesta automática)');
      broadcastState(game);
    }
  }, seconds * 1000);
  turnTimers.set(game.code, timer);
}

function scheduleNextRound(game, nextStarterId) {
  clearTimeout(turnTimers.get(game.code));
  turnTimers.delete(game.code);
  clearTimeout(revealTimers.get(game.code));
  const timer = setTimeout(() => {
    revealTimers.delete(game.code);
    if (game.status !== 'playing') return;
    game.beginNextRound(nextStarterId);
    broadcastState(game);
  }, REVEAL_MS);
  revealTimers.set(game.code, timer);
}

// ---------------------------------------------------------------------------
// ELO — se llama cuando una partida ranked termina
// ---------------------------------------------------------------------------

async function applyRankedElo(game) {
  if (!supabase || !game.ranked) return;

  // Construir lista con (userId, elo actual, place).
  // El ganador tiene place = número de jugadores; el primero en caer place = 1.
  const activePlayers = game.players.filter((p) => p.userId);
  if (activePlayers.length < 2) return;

  // Determinar orden de eliminación guardado en el juego.
  // game.eliminationOrder es un array de playerIds en orden de eliminación
  // (primero en ser eliminado = índice 0). El ganador no está en el array.
  const order = game.eliminationOrder || [];

  // Obtener ELO actuales de Supabase.
  const userIds = activePlayers.map((p) => p.userId);
  const { data: dbUsers } = await supabase
    .from('users')
    .select('id, elo')
    .in('id', userIds);

  if (!dbUsers || dbUsers.length === 0) return;

  const eloMap = Object.fromEntries(dbUsers.map((u) => [u.id, u.elo]));

  const results = activePlayers.map((p) => {
    const placeFromBottom = order.indexOf(p.id); // -1 si es el ganador
    const place = placeFromBottom === -1 ? activePlayers.length : placeFromBottom + 1;
    return { userId: p.userId, elo: eloMap[p.userId] ?? 1000, place };
  });

  const eloChanges = calculateElo(results);

  // Actualizar cada usuario en Supabase.
  const isWinner = (userId) => game.winnerId === activePlayers.find((p) => p.userId === userId)?.id;

  await Promise.all(
    eloChanges.map(({ userId, newElo, delta }) =>
      supabase
        .from('users')
        .update({
          elo: newElo,
          games_played: supabase.rpc ? undefined : undefined, // se hace con increment abajo
        })
        .eq('id', userId)
        // Incremento atómico de games_played y games_won
        .then(() =>
          supabase.rpc('increment_stats', {
            p_user_id: userId,
            p_won: isWinner(userId) ? 1 : 0,
          })
        )
    )
  );

  // Guardar historial de la partida.
  const eloChangesJson = Object.fromEntries(eloChanges.map(({ userId, delta }) => [userId, delta]));
  await supabase.from('ranked_games').insert({
    winner_id: activePlayers.find((p) => p.id === game.winnerId)?.userId || null,
    player_count: activePlayers.length,
    elo_changes: eloChangesJson,
  });

  // Emitir ELO actualizado a cada jugador conectado.
  for (const { userId, delta, newElo } of eloChanges) {
    const player = activePlayers.find((p) => p.userId === userId);
    if (player && player.connected && player.socketId) {
      io.to(player.socketId).emit('elo:update', { delta, newElo });
    }
  }
}

// ---------------------------------------------------------------------------
// Conexiones Socket.io
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {

  // Crear sala -------------------------------------------------------------
  socket.on('room:create', ({ name, settings, token, ranked }, cb) => {
    // Si hay token válido, asociamos el userId.
    const auth = verifySocketToken(token);
    const displayName = auth ? auth.username : name;
    const game = manager.createRoom(displayName, socket.id, settings, !!ranked);
    socket.join(game.code);
    const player = game.players[0];
    // Asociar userId al jugador si está autenticado.
    if (auth) player.userId = auth.userId;
    cb?.({ ok: true, code: game.code, playerId: player.id, state: game.serialize(player.id) });
    broadcastState(game);
  });

  // Unirse por código ------------------------------------------------------
  socket.on('room:join', ({ code, name, token }, cb) => {
    const game = manager.getRoom(code);
    if (!game) return cb?.({ ok: false, error: 'No existe una sala con ese código.' });
    const auth = verifySocketToken(token);
    const displayName = auth ? auth.username : name;
    const result = game.addPlayer(displayName, socket.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    if (auth) result.player.userId = auth.userId;
    socket.join(game.code);
    cb?.({ ok: true, code: game.code, playerId: result.player.id, state: game.serialize(result.player.id) });
    broadcastState(game);
  });

  // Reconexión -------------------------------------------------------------
  socket.on('room:reconnect', ({ code, playerId, token }, cb) => {
    const game = manager.getRoom(code);
    if (!game) return cb?.({ ok: false, error: 'La sala ya no existe.' });
    const result = game.reconnect(playerId, socket.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    // Re-asociar userId si llegó con token.
    const auth = verifySocketToken(token);
    if (auth) result.player.userId = auth.userId;
    socket.join(game.code);
    cb?.({ ok: true, code: game.code, playerId, state: game.serialize(playerId) });
    broadcastState(game);
  });

  // Iniciar partida --------------------------------------------------------
  socket.on('game:start', (_payload, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.start(ctx.player.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
  });

  // Apostar ----------------------------------------------------------------
  socket.on('game:bid', ({ quantity, face }, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.placeBid(ctx.player.id, quantity, face);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
  });

  // Dudar ------------------------------------------------------------------
  socket.on('game:doubt', (_payload, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.doubt(ctx.player.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
    if (!result.finished) scheduleNextRound(ctx.game, result.nextStarterId);
    if (result.finished) applyRankedElo(ctx.game);
  });

  // Calzar -----------------------------------------------------------------
  socket.on('game:calzar', (_payload, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.calzar(ctx.player.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
    if (!result.finished) scheduleNextRound(ctx.game, result.nextStarterId);
    if (result.finished) applyRankedElo(ctx.game);
  });

  // Obliga -----------------------------------------------------------------
  socket.on('game:obliga', ({ mode, face }, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.chooseObliga(ctx.player.id, mode, face);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
    if (result.resolved && !result.finished) scheduleNextRound(ctx.game, result.nextStarterId);
    if (result.finished) applyRankedElo(ctx.game);
  });

  // Pasar ------------------------------------------------------------------
  socket.on('game:pasar', (_payload, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.pasar(ctx.player.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
  });

  // Dudar el paso ----------------------------------------------------------
  socket.on('game:doubtPass', (_payload, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.doubtPass(ctx.player.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
    if (!result.finished) scheduleNextRound(ctx.game, result.nextStarterId);
    if (result.finished) applyRankedElo(ctx.game);
  });

  // Chat -------------------------------------------------------------------
  socket.on('game:chat', ({ text }, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.addChat(ctx.player.id, text);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
  });

  // Desconexión ------------------------------------------------------------
  socket.on('disconnect', () => {
    const ctx = locate(socket.id);
    if (!ctx) return;
    ctx.game.markDisconnected(socket.id);
    broadcastState(ctx.game);
    setTimeout(() => manager.cleanupEmptyRooms(), 30000);
  });
});

function locate(socketId) {
  for (const game of manager.rooms.values()) {
    const player = game.getPlayerBySocket(socketId);
    if (player) return { game, player };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Servir frontend compilado
// ---------------------------------------------------------------------------
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get(/^\/(?!socket\.io|health|auth|leaderboard).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(200).send('Servidor de Cachos en ejecución.');
  });
});

server.listen(PORT, () => {
  console.log(`🎲 Servidor de Cachos escuchando en http://localhost:${PORT}`);
});
