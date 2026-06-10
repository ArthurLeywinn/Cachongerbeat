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
const {
  registerProfile, loginProfile, getProfileById, setCosmetic,
  verifyProfileToken, sanitizeCosmetic,
} = require('./profiles');
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

// ---------------------------------------------------------------------------
// Rutas REST — Perfil (login simple + personalización del personaje)
// ---------------------------------------------------------------------------

function requireProfile(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyProfileToken(token);
  if (!payload) return res.status(401).json({ error: 'No autenticado.' });
  req.profile = payload;
  next();
}

// POST /profile/register  { username, password, cosmetic }
app.post('/profile/register', async (req, res) => {
  const { username, password, cosmetic } = req.body || {};
  const result = await registerProfile(username, password, cosmetic);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// POST /profile/login  { username, password }
app.post('/profile/login', async (req, res) => {
  const { username, password } = req.body || {};
  const result = await loginProfile(username, password);
  if (result.error) return res.status(401).json(result);
  res.json(result);
});

// GET /profile/me  — devuelve el perfil (incluye personalización)
app.get('/profile/me', requireProfile, (req, res) => {
  const profile = getProfileById(req.profile.pid);
  if (!profile) return res.status(404).json({ error: 'Perfil no encontrado.' });
  res.json({ ok: true, profile });
});

// PUT /profile/cosmetic  { cosmetic }  — guarda el personaje elegido
app.put('/profile/cosmetic', requireProfile, (req, res) => {
  const result = setCosmetic(req.profile.pid, req.body?.cosmetic);
  if (result.error) return res.status(400).json(result);
  res.json(result);
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

// GET /history — últimas partidas ranked del usuario autenticado
app.get('/history', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ ok: true, games: [] });

  const { data: mine, error } = await supabase
    .from('ranked_game_players')
    .select('game_id, place, delta, elo_before, elo_after, created_at')
    .eq('user_id', req.user.userId)
    .order('created_at', { ascending: false })
    .limit(15);

  if (error || !mine || mine.length === 0) return res.json({ ok: true, games: [] });

  const ids = mine.map((r) => r.game_id);
  const { data: participants } = await supabase
    .from('ranked_game_players')
    .select('game_id, user_id, place, delta, users(username)')
    .in('game_id', ids);

  const games = mine.map((r) => ({
    gameId: r.game_id,
    date: r.created_at,
    place: r.place,
    delta: r.delta,
    eloAfter: r.elo_after,
    players: (participants || [])
      .filter((p) => p.game_id === r.game_id)
      .sort((a, b) => a.place - b.place)
      .map((p) => ({
        username: p.users?.username || '—',
        place: p.place,
        delta: p.delta,
        isYou: p.user_id === req.user.userId,
      })),
  }));

  res.json({ ok: true, games });
});

// GET /profile/:username — estadísticas públicas de un jugador
app.get('/profile/:username', async (req, res) => {
  if (!supabase) return res.status(404).json({ error: 'Base de datos no disponible.' });
  const clean = String(req.params.username || '').trim().toLowerCase();
  const { data: user } = await supabase
    .from('users')
    .select('username, elo, games_played, games_won')
    .eq('username', clean)
    .maybeSingle();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ ok: true, user });
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
      game._addLog?.('(Tiempo agotado: acción automática)');
      broadcastState(game);
      // autoBid puede degradar a "dudar" si subir excede los dados en juego.
      if (result.finished) applyRankedElo(game);
      else if (result.nextStarterId) scheduleNextRound(game, result.nextStarterId);
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

  // Guardar los deltas en la partida para mostrarlos en la pantalla final.
  game.eloResults = eloChanges.map(({ userId, delta, newElo }) => {
    const player = activePlayers.find((p) => p.userId === userId);
    return { playerId: player?.id || null, userId, delta, newElo };
  });

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
  const { data: rankedGame } = await supabase
    .from('ranked_games')
    .insert({
      winner_id: activePlayers.find((p) => p.id === game.winnerId)?.userId || null,
      player_count: activePlayers.length,
      elo_changes: eloChangesJson,
    })
    .select('id')
    .single();

  // Historial por jugador (tabla ranked_game_players).
  if (rankedGame?.id) {
    const rows = eloChanges.map(({ userId, delta, newElo }) => {
      const r = results.find((x) => x.userId === userId);
      // r.place: ganador = N, primero en caer = 1 → posición visible: 1 = ganador.
      const place = activePlayers.length - (r?.place ?? 1) + 1;
      return {
        game_id: rankedGame.id,
        user_id: userId,
        place,
        elo_before: newElo - delta,
        elo_after: newElo,
        delta,
      };
    });
    await supabase.from('ranked_game_players').insert(rows);
  }

  // Emitir ELO actualizado a cada jugador conectado.
  for (const { userId, delta, newElo } of eloChanges) {
    const player = activePlayers.find((p) => p.userId === userId);
    if (player && player.connected && player.socketId) {
      io.to(player.socketId).emit('elo:update', { delta, newElo });
    }
  }

  // Re-emitir el estado: ahora finalStandings incluye los deltas de ELO.
  broadcastState(game);
}

// ---------------------------------------------------------------------------
// Matchmaking ranked — cola de búsqueda de partida
// ---------------------------------------------------------------------------
// Reglas FIJAS de ranked (no personalizables).
const RANKED_SETTINGS = {
  dicePerPlayer: 5,
  turnSeconds: 60,
  calzoInfinito: false, // calzo solo con la mitad o más (impar redondea arriba)
  pasarEnabled: true,   // pasar solo con 5 dados y una vez por ronda (lo valida game.js)
};
const QUEUE_MIN = 3;
const QUEUE_MAX = 6;
const QUEUE_WAIT_MS = 15000; // al llegar a 3, espera 15s por más jugadores

const rankedQueue = []; // { socketId, userId, username, cosmetic }
let rankedQueueTimer = null;

function broadcastQueue() {
  for (const q of rankedQueue) {
    io.to(q.socketId).emit('queue:update', {
      count: rankedQueue.length,
      min: QUEUE_MIN,
      max: QUEUE_MAX,
    });
  }
}

function removeFromQueue(socketId) {
  const idx = rankedQueue.findIndex((q) => q.socketId === socketId);
  if (idx === -1) return false;
  rankedQueue.splice(idx, 1);
  if (rankedQueue.length < QUEUE_MIN && rankedQueueTimer) {
    clearTimeout(rankedQueueTimer);
    rankedQueueTimer = null;
  }
  broadcastQueue();
  return true;
}

function formRankedMatch() {
  clearTimeout(rankedQueueTimer);
  rankedQueueTimer = null;
  if (rankedQueue.length < QUEUE_MIN) return;

  const members = rankedQueue.splice(0, QUEUE_MAX);
  const host = members[0];
  const game = manager.createRoom(host.username, host.socketId, RANKED_SETTINGS, true);
  const hostPlayer = game.players[0];
  hostPlayer.userId = host.userId;
  if (host.cosmetic) hostPlayer.cosmetic = sanitizeCosmetic(host.cosmetic);
  io.sockets.sockets.get(host.socketId)?.join(game.code);

  const assigned = [{ member: host, playerId: hostPlayer.id }];
  for (const m of members.slice(1)) {
    const result = game.addPlayer(m.username, m.socketId);
    if (result.error) continue;
    result.player.userId = m.userId;
    if (m.cosmetic) result.player.cosmetic = sanitizeCosmetic(m.cosmetic);
    io.sockets.sockets.get(m.socketId)?.join(game.code);
    assigned.push({ member: m, playerId: result.player.id });
  }

  game.start(game.hostId); // la partida arranca de inmediato

  for (const { member, playerId } of assigned) {
    io.to(member.socketId).emit('queue:matched', {
      code: game.code,
      playerId,
      state: game.serialize(playerId),
    });
  }
  broadcastState(game);
  broadcastQueue();
}

function tryFormMatch() {
  if (rankedQueue.length >= QUEUE_MAX) return formRankedMatch();
  if (rankedQueue.length >= QUEUE_MIN && !rankedQueueTimer) {
    rankedQueueTimer = setTimeout(formRankedMatch, QUEUE_WAIT_MS);
  }
}

// ---------------------------------------------------------------------------
// Conexiones Socket.io
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {

  // Crear sala -------------------------------------------------------------
  socket.on('room:create', ({ name, settings, token, ranked, cosmetic }, cb) => {
    // Si hay token válido, asociamos el userId.
    const auth = verifySocketToken(token);
    const displayName = auth ? auth.username : name;
    const game = manager.createRoom(displayName, socket.id, settings, !!ranked);
    socket.join(game.code);
    const player = game.players[0];
    // Asociar userId al jugador si está autenticado.
    if (auth) player.userId = auth.userId;
    if (cosmetic) player.cosmetic = sanitizeCosmetic(cosmetic);
    cb?.({ ok: true, code: game.code, playerId: player.id, state: game.serialize(player.id) });
    broadcastState(game);
  });

  // Unirse por código ------------------------------------------------------
  socket.on('room:join', ({ code, name, token, cosmetic }, cb) => {
    const game = manager.getRoom(code);
    if (!game) return cb?.({ ok: false, error: 'No existe una sala con ese código.' });
    const auth = verifySocketToken(token);
    const displayName = auth ? auth.username : name;
    const result = game.addPlayer(displayName, socket.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    if (auth) result.player.userId = auth.userId;
    if (cosmetic) result.player.cosmetic = sanitizeCosmetic(cosmetic);
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
  socket.on('game:bid', ({ quantity, face, direction }, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.placeBid(ctx.player.id, quantity, face, direction);
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

  // Cola ranked --------------------------------------------------------------
  socket.on('queue:join', ({ token, cosmetic }, cb) => {
    const auth = verifySocketToken(token);
    if (!auth) return cb?.({ ok: false, error: 'Necesitas una cuenta para jugar ranked.' });
    if (locate(socket.id)) return cb?.({ ok: false, error: 'Ya estás en una sala.' });
    if (rankedQueue.some((q) => q.socketId === socket.id || q.userId === auth.userId)) {
      return cb?.({ ok: true, count: rankedQueue.length, min: QUEUE_MIN, max: QUEUE_MAX });
    }
    rankedQueue.push({ socketId: socket.id, userId: auth.userId, username: auth.username, cosmetic });
    cb?.({ ok: true, count: rankedQueue.length, min: QUEUE_MIN, max: QUEUE_MAX });
    broadcastQueue();
    tryFormMatch();
  });

  socket.on('queue:leave', (_payload, cb) => {
    removeFromQueue(socket.id);
    cb?.({ ok: true });
  });

  // Desconexión ------------------------------------------------------------
  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
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
app.get(/^\/(?!socket\.io|health|auth|profile|leaderboard|history).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(200).send('Servidor de Cachos en ejecución.');
  });
});

server.listen(PORT, () => {
  console.log(`🎲 Servidor de Cachos escuchando en http://localhost:${PORT}`);
});
