// =============================================================================
// index.js — Servidor HTTP (Express) + WebSockets (Socket.io).
// -----------------------------------------------------------------------------
// Orquesta las salas: crear, unirse, reconectar, apostar, dudar y calzar.
// El estado se difunde PERSONALIZADO a cada socket (cada jugador solo ve sus
// propios dados durante la fase de apuestas).
// =============================================================================

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { GameManager } = require('./gameManager');

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const REVEAL_MS = 4800; // tiempo que se muestran los dados revelados antes de la próxima ronda

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'cachos-server' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

const manager = new GameManager();
const revealTimers = new Map(); // code -> Timeout (revelación -> próxima ronda)
const turnTimers = new Map(); // code -> Timeout (tiempo por turno)

// ---------------------------------------------------------------------------
// Utilidades de difusión
// ---------------------------------------------------------------------------

// Envía a cada jugador conectado su vista personalizada del estado y luego
// (re)arma el temporizador de turno si la sala tiene tiempo límite.
function broadcastState(game) {
  for (const player of game.players) {
    if (player.connected && player.socketId) {
      io.to(player.socketId).emit('state', game.serialize(player.id));
    }
  }
  armTurnTimer(game);
}

// (Re)arma el temporizador del turno actual. Al expirar, hace la apuesta
// automática (misma pinta +1, o "1 tonto" si abre) por el jugador en turno.
function armTurnTimer(game) {
  clearTimeout(turnTimers.get(game.code));
  turnTimers.delete(game.code);

  const seconds = game.settings?.turnSeconds;
  if (!seconds || game.status !== 'playing' || game.phase !== 'bidding') return;

  const turnAtArm = game.currentTurnId;
  const timer = setTimeout(() => {
    turnTimers.delete(game.code);
    // Verificar que el turno no cambió mientras corría el reloj.
    if (game.status !== 'playing' || game.phase !== 'bidding' || game.currentTurnId !== turnAtArm) return;
    const result = game.autoBid();
    if (result && result.ok) {
      game._addLog?.('(Tiempo agotado: apuesta automática)');
      broadcastState(game); // re-arma para el siguiente turno
    }
  }, seconds * 1000);
  turnTimers.set(game.code, timer);
}

// Programa el inicio de la siguiente ronda tras la revelación.
function scheduleNextRound(game, nextStarterId) {
  clearTimeout(turnTimers.get(game.code)); // no correr reloj de turno durante la revelación
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
// Conexiones
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  // Crear sala -------------------------------------------------------------
  socket.on('room:create', ({ name, settings }, cb) => {
    const game = manager.createRoom(name, socket.id, settings);
    socket.join(game.code);
    const player = game.players[0];
    cb?.({ ok: true, code: game.code, playerId: player.id, state: game.serialize(player.id) });
    broadcastState(game);
  });

  // Unirse por código ------------------------------------------------------
  socket.on('room:join', ({ code, name }, cb) => {
    const game = manager.getRoom(code);
    if (!game) return cb?.({ ok: false, error: 'No existe una sala con ese código.' });
    const result = game.addPlayer(name, socket.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    socket.join(game.code);
    cb?.({ ok: true, code: game.code, playerId: result.player.id, state: game.serialize(result.player.id) });
    broadcastState(game);
  });

  // Reconexión -------------------------------------------------------------
  socket.on('room:reconnect', ({ code, playerId }, cb) => {
    const game = manager.getRoom(code);
    if (!game) return cb?.({ ok: false, error: 'La sala ya no existe.' });
    const result = game.reconnect(playerId, socket.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    socket.join(game.code);
    cb?.({ ok: true, code: game.code, playerId, state: game.serialize(playerId) });
    broadcastState(game);
  });

  // Iniciar partida (anfitrión) -------------------------------------------
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
  });

  // Elegir modalidad de Obliga --------------------------------------------
  socket.on('game:obliga', ({ mode, face }, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.chooseObliga(ctx.player.id, mode, face);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
    // Kamikaze se resuelve al instante: si no terminó la partida, programa la
    // próxima ronda (igual que dudar/calzar).
    if (result.resolved && !result.finished) scheduleNextRound(ctx.game, result.nextStarterId);
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
    // Limpia salas vacías tras un margen.
    setTimeout(() => manager.cleanupEmptyRooms(), 30000);
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
  });
});

// Encuentra la sala y el jugador asociados a un socket.
function locate(socketId) {
  for (const game of manager.rooms.values()) {
    const player = game.getPlayerBySocket(socketId);
    if (player) return { game, player };
  }
  return null;
}

// ---------------------------------------------------------------------------
// (Opcional) servir el frontend ya compilado si existe client/dist.
// ---------------------------------------------------------------------------
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get(/^\/(?!socket\.io|health).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(200).send('Servidor de Cachos en ejecución. Levanta el cliente con "npm run dev".');
  });
});

server.listen(PORT, () => {
  console.log(`🎲 Servidor de Cachos escuchando en http://localhost:${PORT}`);
});
