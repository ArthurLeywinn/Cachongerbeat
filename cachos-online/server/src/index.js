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
const historyStore = require('./historyStore');
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

// GET /history — últimas partidas del usuario autenticado.
// Mezcla las RANKED guardadas en Supabase (con delta de ELO) con las CASUALES
// del historial local del servidor. Antes solo existían las ranked, por lo que
// el historial salía vacío para quien jugaba casual.
app.get('/history', requireAuth, async (req, res) => {
  let rankedGames = [];

  if (supabase) {
    const { data: mine, error } = await supabase
      .from('ranked_game_players')
      .select('game_id, place, delta, elo_before, elo_after, created_at')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && mine && mine.length > 0) {
      const ids = mine.map((r) => r.game_id);
      const { data: participants } = await supabase
        .from('ranked_game_players')
        .select('game_id, user_id, place, delta, users(username)')
        .in('game_id', ids);

      rankedGames = mine.map((r) => ({
        gameId: r.game_id,
        date: r.created_at,
        ranked: true,
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
    }
  }

  const casualGames = historyStore.getGames(req.user.userId);
  const games = [...rankedGames, ...casualGames]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 20);

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
// Abandono: si un jugador no se reconecta en este tiempo durante una partida,
// se le aplica una rendición automática para que la mesa no quede colgada.
const DISCONNECT_GRACE_MS = 60000;
const disconnectTimers = new Map(); // `code:playerId` -> timer

function cancelDisconnectTimer(code, playerId) {
  const key = `${code}:${playerId}`;
  clearTimeout(disconnectTimers.get(key));
  disconnectTimers.delete(key);
}

function armDisconnectTimer(game, player) {
  const key = `${game.code}:${player.id}`;
  clearTimeout(disconnectTimers.get(key));
  disconnectTimers.set(key, setTimeout(() => {
    disconnectTimers.delete(key);
    const g = manager.getRoom(game.code);
    if (!g || g.status !== 'playing') return;
    const p = g.getPlayer(player.id);
    if (!p || p.connected || p.eliminated) return;
    // Cancelar timers de ronda pendientes: resign reinicia la ronda al tiro.
    clearTimeout(revealTimers.get(g.code)); revealTimers.delete(g.code);
    clearTimeout(turnTimers.get(g.code)); turnTimers.delete(g.code);
    const result = g.resign(p.id, true);
    if (result.ok) {
      broadcastState(g);
      if (result.finished) applyRankedElo(g);
    }
  }, DISCONNECT_GRACE_MS));
}

// ---------------------------------------------------------------------------
// Presencia de usuarios (sistema de amigos)
// ---------------------------------------------------------------------------
// userId -> { socketId, username, status: 'menu' | 'lobby' | 'playing', code }
const presence = new Map();

function presencePayload(userId) {
  const p = presence.get(userId);
  return {
    userId,
    username: p?.username || null,
    status: p ? p.status : 'offline',
    // Solo se expone el código de sala si el amigo está en LOBBY (para "Unirse").
    code: p && p.status === 'lobby' ? p.code : null,
  };
}

async function getAcceptedFriendIds(userId) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('friendships')
    .select('requester_id, receiver_id')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'accepted');
  return (data || []).map((r) => (r.requester_id === userId ? r.receiver_id : r.requester_id));
}

// Difunde el estado de `userId` a todos sus amigos conectados.
async function broadcastPresence(userId) {
  try {
    const payload = presencePayload(userId);
    const friends = await getAcceptedFriendIds(userId);
    for (const fid of friends) {
      const fp = presence.get(fid);
      if (fp?.socketId) io.to(fp.socketId).emit('friends:status', payload);
    }
  } catch { /* sin DB no hay amigos que avisar */ }
}

function setUserPresence(userId, username, socketId, status, code = null) {
  if (!userId) return;
  presence.set(userId, { socketId, username, status, code });
  broadcastPresence(userId);
}

function clearPresenceBySocket(socketId) {
  for (const [userId, p] of presence.entries()) {
    if (p.socketId === socketId) {
      presence.delete(userId);
      broadcastPresence(userId);
    }
  }
}

function notifyUser(userId, payload) {
  const p = presence.get(userId);
  if (p?.socketId) io.to(p.socketId).emit('friends:notify', payload);
}

// ---------------------------------------------------------------------------
// Rutas REST — Amigos
// ---------------------------------------------------------------------------

// GET /friends — lista de amigos (con estado en vivo) + solicitudes pendientes
app.get('/friends', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ ok: true, friends: [], incoming: [], outgoing: [] });
  const me = req.user.userId;

  const { data: rows } = await supabase
    .from('friendships')
    .select('requester_id, receiver_id, status')
    .or(`requester_id.eq.${me},receiver_id.eq.${me}`);

  const all = rows || [];
  const otherIds = [...new Set(all.map((r) => (r.requester_id === me ? r.receiver_id : r.requester_id)))];
  let usersById = {};
  if (otherIds.length) {
    const { data: users } = await supabase
      .from('users')
      .select('id, username, elo')
      .in('id', otherIds);
    usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));
  }

  const friends = [];
  const incoming = [];
  const outgoing = [];
  for (const r of all) {
    const otherId = r.requester_id === me ? r.receiver_id : r.requester_id;
    const u = usersById[otherId];
    if (!u) continue;
    const base = { userId: otherId, username: u.username, elo: u.elo };
    if (r.status === 'accepted') {
      friends.push({ ...base, ...presencePayload(otherId) });
    } else if (r.receiver_id === me) {
      incoming.push(base);
    } else {
      outgoing.push(base);
    }
  }

  res.json({ ok: true, friends, incoming, outgoing });
});

// GET /friends/search?q= — buscar usuarios por nombre para enviar solicitud
app.get('/friends/search', requireAuth, async (req, res) => {
  if (!supabase) return res.json({ ok: true, users: [] });
  const q = String(req.query.q || '').trim().toLowerCase();
  if (q.length < 2) return res.json({ ok: true, users: [] });
  const { data } = await supabase
    .from('users')
    .select('id, username, elo')
    .ilike('username', `%${q}%`)
    .neq('id', req.user.userId)
    .limit(10);
  res.json({ ok: true, users: data || [] });
});

// POST /friends/request  { username } — enviar solicitud de amistad
app.post('/friends/request', requireAuth, async (req, res) => {
  if (!supabase) return res.status(400).json({ error: 'Base de datos no disponible.' });
  const me = req.user.userId;
  const username = String(req.body?.username || '').trim().toLowerCase();
  if (!username) return res.status(400).json({ error: 'Falta el nombre de usuario.' });

  const { data: target } = await supabase
    .from('users').select('id, username').eq('username', username).maybeSingle();
  if (!target) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (target.id === me) return res.status(400).json({ error: 'No puedes agregarte a ti mismo.' });

  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status, requester_id')
    .or(`and(requester_id.eq.${me},receiver_id.eq.${target.id}),and(requester_id.eq.${target.id},receiver_id.eq.${me})`)
    .maybeSingle();
  if (existing) {
    if (existing.status === 'accepted') return res.status(400).json({ error: 'Ya son amigos.' });
    if (existing.requester_id === me) return res.status(400).json({ error: 'Ya enviaste una solicitud.' });
    return res.status(400).json({ error: 'Este usuario ya te envió una solicitud: revisa tus notificaciones.' });
  }

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: me, receiver_id: target.id, status: 'pending' });
  if (error) return res.status(500).json({ error: 'No se pudo enviar la solicitud.' });

  // Notificación en tiempo real (campana) si el receptor está conectado.
  notifyUser(target.id, { type: 'request', from: { userId: me, username: req.user.username } });
  res.json({ ok: true });
});

// POST /friends/accept  { requesterId, accept } — aceptar o rechazar solicitud
app.post('/friends/accept', requireAuth, async (req, res) => {
  if (!supabase) return res.status(400).json({ error: 'Base de datos no disponible.' });
  const me = req.user.userId;
  const { requesterId, accept } = req.body || {};
  if (!requesterId) return res.status(400).json({ error: 'Falta requesterId.' });

  const { data: row } = await supabase
    .from('friendships')
    .select('id')
    .eq('requester_id', requesterId)
    .eq('receiver_id', me)
    .eq('status', 'pending')
    .maybeSingle();
  if (!row) return res.status(404).json({ error: 'Solicitud no encontrada.' });

  if (accept) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', row.id);
    notifyUser(requesterId, { type: 'accepted', from: { userId: me, username: req.user.username } });
    // Ambos se ven online de inmediato.
    broadcastPresence(me);
    broadcastPresence(requesterId);
  } else {
    await supabase.from('friendships').delete().eq('id', row.id);
  }
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Utilidades de difusión
// ---------------------------------------------------------------------------

function broadcastState(game) {
  // Al terminar, registrar la partida en el historial local (solo casuales;
  // las ranked quedan en Supabase con su delta de ELO).
  if (game.status === 'finished') historyStore.recordGame(game);
  // Armar el reloj ANTES de serializar para que el estado lleve turnDeadline.
  armTurnTimer(game);
  for (const player of game.players) {
    if (player.connected && player.socketId) {
      io.to(player.socketId).emit('state', game.serialize(player.id));
    }
  }
}

function armTurnTimer(game) {
  clearTimeout(turnTimers.get(game.code));
  turnTimers.delete(game.code);
  game.turnDeadline = null;

  const seconds = game.settings?.turnSeconds;
  if (!seconds || game.status !== 'playing' || game.phase !== 'bidding') return;

  game.turnDeadline = Date.now() + seconds * 1000;
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

  // Obtener ELO y estadísticas actuales de Supabase.
  const userIds = activePlayers.map((p) => p.userId);
  const { data: dbUsers } = await supabase
    .from('users')
    .select('id, elo, games_played, games_won')
    .in('id', userIds);

  if (!dbUsers || dbUsers.length === 0) return;

  const statsMap = Object.fromEntries(dbUsers.map((u) => [u.id, u]));
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

  const isWinner = (userId) => game.winnerId === activePlayers.find((p) => p.userId === userId)?.id;

  // ── 1) PERSISTIR EL HISTORIAL PRIMERO ──────────────────────────────────────
  // Esto es lo que hace que el historial sobreviva al cierre del juego, así que
  // se guarda ANTES (y de forma independiente) de actualizar las estadísticas:
  // si algo fallaba al actualizar stats, antes la partida nunca llegaba a
  // registrarse y el historial quedaba vacío.
  try {
    const eloChangesJson = Object.fromEntries(eloChanges.map(({ userId, delta }) => [userId, delta]));
    const { data: rankedGame, error: rgErr } = await supabase
      .from('ranked_games')
      .insert({
        winner_id: activePlayers.find((p) => p.id === game.winnerId)?.userId || null,
        player_count: activePlayers.length,
        elo_changes: eloChangesJson,
      })
      .select('id')
      .single();

    if (rgErr) {
      console.error('[ranked] No se pudo registrar ranked_games:', rgErr.message);
    } else if (rankedGame?.id) {
      // Historial por jugador (tabla ranked_game_players):
      // user_id, game_id, place (1 = ganador), elo_before, elo_after, delta.
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
      const { error: rgpErr } = await supabase.from('ranked_game_players').insert(rows);
      if (rgpErr) console.error('[ranked] No se pudo registrar ranked_game_players:', rgpErr.message);
    }
  } catch (e) {
    console.error('[ranked] Error al guardar el historial de la partida:', e.message);
  }

  // ── 2) ACTUALIZAR ELO + ESTADÍSTICAS DE CADA JUGADOR ────────────────────────
  // Actualización directa (no depende de una función RPC `increment_stats` que
  // podía no existir en la base; cuando no existía, el guardado del historial
  // de arriba nunca llegaba a ejecutarse). Cada fallo se registra pero no
  // interrumpe al resto.
  await Promise.all(
    eloChanges.map(async ({ userId, newElo }) => {
      const prev = statsMap[userId] || { games_played: 0, games_won: 0 };
      const { error } = await supabase
        .from('users')
        .update({
          elo: newElo,
          games_played: (prev.games_played || 0) + 1,
          games_won: (prev.games_won || 0) + (isWinner(userId) ? 1 : 0),
        })
        .eq('id', userId);
      if (error) console.error(`[ranked] No se pudieron actualizar las stats de ${userId}:`, error.message);
    })
  );

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
// Matchmaking ranked — colas separadas por tamaño de partida (2 a 6)
// ---------------------------------------------------------------------------
// Reglas FIJAS de ranked (no personalizables).
const RANKED_SETTINGS = {
  dicePerPlayer: 5,
  turnSeconds: 60,
  calzoInfinito: false, // calzo solo con la mitad o más (impar redondea arriba)
  pasarEnabled: true,   // pasar solo con 5 dados y una vez por ronda (lo valida game.js)
};
const QUEUE_SIZES = [2, 3, 4, 5, 6];

// Una cola independiente por tamaño: quien busca partida de 4 solo
// empareja con otros que también buscan partida de 4.
const rankedQueues = new Map(QUEUE_SIZES.map((n) => [n, []])); // size -> [{ socketId, userId, username, cosmetic }]

function broadcastQueue(size) {
  const queue = rankedQueues.get(size) || [];
  for (const q of queue) {
    io.to(q.socketId).emit('queue:update', { size, count: queue.length });
  }
}

function removeFromQueues(socketId) {
  let removed = false;
  for (const [size, queue] of rankedQueues.entries()) {
    const idx = queue.findIndex((q) => q.socketId === socketId);
    if (idx !== -1) {
      queue.splice(idx, 1);
      broadcastQueue(size);
      removed = true;
    }
  }
  return removed;
}

function formRankedMatch(size) {
  const queue = rankedQueues.get(size);
  if (!queue || queue.length < size) return;

  const members = queue.splice(0, size);
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
    setUserPresence(member.userId, member.username, member.socketId, 'playing', game.code);
  }
  broadcastState(game);
  broadcastQueue(size);
}

// ---------------------------------------------------------------------------
// Matchmaking CASUAL — salas públicas por modo (NO afectan el ranking)
// ---------------------------------------------------------------------------
// "Buscar partida" abre un navegador de salas públicas abiertas. Cada modo fija
// las reglas (clásico/rápido/relámpago); el tamaño (3 a 6) define cuándo la sala
// arranca sola al llenarse. Como ranked=false, no suma ni resta ELO.
const CASUAL_MODES = {
  clasico:   { dicePerPlayer: 5, turnSeconds: null, calzoInfinito: false, pasarEnabled: false },
  rapido:    { dicePerPlayer: 5, turnSeconds: 30,   calzoInfinito: false, pasarEnabled: true  },
  relampago: { dicePerPlayer: 5, turnSeconds: 15,   calzoInfinito: true,  pasarEnabled: true  },
};
const CASUAL_SIZES = [3, 4, 5, 6];

// Lista de salas públicas ABIERTAS (en lobby, con cupo). Filtra por modo opcional.
function listPublicLobbies(mode = null) {
  const out = [];
  for (const game of manager.rooms.values()) {
    if (!game.isPublic || game.status !== 'lobby') continue;
    const target = game.targetSize || 6;
    if (game.players.length >= target) continue;       // ya llena → no se ofrece
    if (mode && game.mode !== mode) continue;
    const host = game.players.find((p) => p.id === game.hostId) || game.players[0];
    out.push({
      code: game.code,
      mode: game.mode || 'clasico',
      size: target,
      count: game.players.length,
      host: host ? host.name : '—',
    });
  }
  out.sort((a, b) => b.count - a.count); // las más llenas primero (arrancan antes)
  return out;
}

// Arranca sola la sala pública en cuanto alcanza su tamaño objetivo (como ranked).
function maybeAutoStartPublic(game) {
  if (!game || !game.isPublic || game.status !== 'lobby') return false;
  const target = game.targetSize || 6;
  if (game.players.length < target) return false;
  const res = game.start(game.hostId);
  if (res.error) return false;
  for (const p of game.players) {
    if (p.userId) {
      const existing = presence.get(p.userId);
      setUserPresence(p.userId, existing?.username || p.name, p.socketId, 'playing', game.code);
    }
  }
  broadcastState(game);
  return true;
}

// ---------------------------------------------------------------------------
// Conexiones Socket.io
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {

  // Presencia: el cliente anuncia su sesión al conectar (sistema de amigos).
  socket.on('presence:online', ({ token }, cb) => {
    const auth = verifySocketToken(token);
    if (!auth) return cb?.({ ok: false });
    socket.data.userId = auth.userId;
    // Si ya está en una sala, refleja ese estado; si no, está en el menú.
    const ctx = locate(socket.id);
    if (ctx) {
      const status = ctx.game.status === 'lobby' ? 'lobby' : 'playing';
      setUserPresence(auth.userId, auth.username, socket.id, status, ctx.game.code);
    } else {
      setUserPresence(auth.userId, auth.username, socket.id, 'menu');
    }
    cb?.({ ok: true });
  });

  // Invitar a un amigo a tu sala actual (notificación con el código).
  socket.on('friends:invite', async ({ token, toUserId }, cb) => {
    const auth = verifySocketToken(token);
    if (!auth) return cb?.({ ok: false, error: 'No autenticado.' });
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    if (!supabase) return cb?.({ ok: false, error: 'Función de amigos no disponible.' });

    // Solo se puede invitar a amigos aceptados (antes cualquiera podía
    // spamear invitaciones a cualquier usuario conectado).
    const { data: friendship } = await supabase
      .from('friendships')
      .select('status')
      .or(`and(requester_id.eq.${auth.userId},receiver_id.eq.${toUserId}),and(requester_id.eq.${toUserId},receiver_id.eq.${auth.userId})`)
      .eq('status', 'accepted')
      .maybeSingle();
    if (!friendship) return cb?.({ ok: false, error: 'Solo puedes invitar a tus amigos.' });

    notifyUser(toUserId, {
      type: 'invite',
      from: { userId: auth.userId, username: auth.username },
      code: ctx.game.code,
    });
    cb?.({ ok: true });
  });

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
    if (auth) setUserPresence(auth.userId, auth.username, socket.id, 'lobby', game.code);
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
    if (auth) setUserPresence(auth.userId, auth.username, socket.id, 'lobby', game.code);
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
    cancelDisconnectTimer(game.code, playerId);
    // Re-asociar userId si llegó con token.
    const auth = verifySocketToken(token);
    if (auth) result.player.userId = auth.userId;
    if (auth) {
      const status = game.status === 'lobby' ? 'lobby' : 'playing';
      setUserPresence(auth.userId, auth.username, socket.id, status, game.code);
    }
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
    // Amigos: todos los jugadores con cuenta pasan a "en partida".
    for (const p of ctx.game.players) {
      if (p.userId) {
        const existing = presence.get(p.userId);
        setUserPresence(p.userId, existing?.username || p.name, p.socketId, 'playing', ctx.game.code);
      }
    }
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

  // Rendirse ----------------------------------------------------------------
  socket.on('game:resign', (_payload, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    // resign reinicia la ronda: limpiar timers de revelación/turno pendientes.
    clearTimeout(revealTimers.get(ctx.game.code)); revealTimers.delete(ctx.game.code);
    clearTimeout(turnTimers.get(ctx.game.code)); turnTimers.delete(ctx.game.code);
    const result = ctx.game.resign(ctx.player.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true });
    broadcastState(ctx.game);
    if (result.finished) applyRankedElo(ctx.game);
  });

  // Revancha ----------------------------------------------------------------
  socket.on('game:rematch', (_payload, cb) => {
    const ctx = locate(socket.id);
    if (!ctx) return cb?.({ ok: false, error: 'No estás en una sala.' });
    const result = ctx.game.rematch(ctx.player.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    cb?.({ ok: true, requested: !!result.requested });
    if (!result.requested) {
      // La revancha arrancó: presencia "en partida" para quienes tienen cuenta.
      for (const p of ctx.game.players) {
        if (p.userId) {
          const existing = presence.get(p.userId);
          setUserPresence(p.userId, existing?.username || p.name, p.socketId, 'playing', ctx.game.code);
        }
      }
    }
    broadcastState(ctx.game);
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

  // Cola ranked (por tamaño de partida) --------------------------------------
  socket.on('queue:join', ({ token, cosmetic, size }, cb) => {
    const auth = verifySocketToken(token);
    if (!auth) return cb?.({ ok: false, error: 'Necesitas una cuenta para jugar ranked.' });
    if (locate(socket.id)) return cb?.({ ok: false, error: 'Ya estás en una sala.' });

    const n = Number(size);
    if (!QUEUE_SIZES.includes(n)) return cb?.({ ok: false, error: 'Tamaño de partida inválido (2 a 6).' });

    // Salir de cualquier otra cola antes de entrar a esta.
    removeFromQueues(socket.id);
    const queue = rankedQueues.get(n);
    if (queue.some((q) => q.userId === auth.userId)) {
      return cb?.({ ok: true, size: n, count: queue.length });
    }
    queue.push({ socketId: socket.id, userId: auth.userId, username: auth.username, cosmetic });
    cb?.({ ok: true, size: n, count: queue.length });
    broadcastQueue(n);
    if (queue.length >= n) formRankedMatch(n);
  });

  socket.on('queue:leave', (_payload, cb) => {
    removeFromQueues(socket.id);
    cb?.({ ok: true });
  });

  // Matchmaking casual — navegador de salas públicas por modo -----------------
  // Listar las salas públicas abiertas (para el menú de lobbys disponibles).
  socket.on('match:list', (payload, cb) => {
    const mode = payload && CASUAL_MODES[payload.mode] ? payload.mode : null;
    cb?.({ ok: true, lobbies: listPublicLobbies(mode) });
  });

  // Buscar partida: entra a una sala pública abierta del mismo modo y tamaño,
  // o crea una nueva si no hay ninguna. Al llenarse arranca sola.
  socket.on('match:quick', ({ name, token, cosmetic, mode, size }, cb) => {
    const m = CASUAL_MODES[mode] ? mode : 'clasico';
    const n = CASUAL_SIZES.includes(Number(size)) ? Number(size) : 4;
    const auth = verifySocketToken(token);
    const displayName = auth ? auth.username : (name || 'Jugador');

    // 1) ¿Hay una sala pública abierta del mismo modo y tamaño con cupo?
    let game = null;
    for (const g of manager.rooms.values()) {
      if (g.isPublic && g.status === 'lobby' && g.mode === m &&
          (g.targetSize || 6) === n && g.players.length < n) { game = g; break; }
    }

    if (game) {
      const result = game.addPlayer(displayName, socket.id);
      if (result.error) return cb?.({ ok: false, error: result.error });
      if (auth) result.player.userId = auth.userId;
      if (cosmetic) result.player.cosmetic = sanitizeCosmetic(cosmetic);
      if (auth) setUserPresence(auth.userId, auth.username, socket.id, 'lobby', game.code);
      socket.join(game.code);
      cb?.({ ok: true, code: game.code, playerId: result.player.id, state: game.serialize(result.player.id) });
      broadcastState(game);
      maybeAutoStartPublic(game);
    } else {
      // 2) No hay → crear una sala pública nueva (casual, no ranked).
      game = manager.createRoom(displayName, socket.id, CASUAL_MODES[m], false);
      game.isPublic = true;
      game.mode = m;
      game.targetSize = n;
      socket.join(game.code);
      const player = game.players[0];
      if (auth) player.userId = auth.userId;
      if (cosmetic) player.cosmetic = sanitizeCosmetic(cosmetic);
      if (auth) setUserPresence(auth.userId, auth.username, socket.id, 'lobby', game.code);
      cb?.({ ok: true, code: game.code, playerId: player.id, state: game.serialize(player.id) });
      broadcastState(game);
    }
  });

  // Unirse a una sala pública concreta elegida en el navegador de lobbys.
  socket.on('match:join', ({ code, name, token, cosmetic }, cb) => {
    const game = manager.getRoom(code);
    if (!game || !game.isPublic) return cb?.({ ok: false, error: 'Esa sala ya no está disponible.' });
    if (game.status !== 'lobby') return cb?.({ ok: false, error: 'La partida ya comenzó.' });
    if (game.players.length >= (game.targetSize || 6)) return cb?.({ ok: false, error: 'La sala está llena.' });
    const auth = verifySocketToken(token);
    const displayName = auth ? auth.username : (name || 'Jugador');
    const result = game.addPlayer(displayName, socket.id);
    if (result.error) return cb?.({ ok: false, error: result.error });
    if (auth) result.player.userId = auth.userId;
    if (cosmetic) result.player.cosmetic = sanitizeCosmetic(cosmetic);
    if (auth) setUserPresence(auth.userId, auth.username, socket.id, 'lobby', game.code);
    socket.join(game.code);
    cb?.({ ok: true, code: game.code, playerId: result.player.id, state: game.serialize(result.player.id) });
    broadcastState(game);
    maybeAutoStartPublic(game);
  });

  // Desconexión ------------------------------------------------------------
  socket.on('disconnect', () => {
    removeFromQueues(socket.id);
    clearPresenceBySocket(socket.id);
    const ctx = locate(socket.id);
    if (!ctx) return;
    ctx.game.markDisconnected(socket.id);
    // Si estaba jugando, se rinde automáticamente si no vuelve a tiempo.
    if (ctx.game.status === 'playing' && !ctx.player.eliminated) {
      armDisconnectTimer(ctx.game, ctx.player);
    }
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
app.get(/^\/(?!socket\.io|health|auth|profile|leaderboard|history|friends).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(200).send('Servidor de Cachos en ejecución.');
  });
});

server.listen(PORT, () => {
  console.log(`🎲 Servidor de Cachos escuchando en http://localhost:${PORT}`);
});
