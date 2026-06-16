// =============================================================================
// game.js — Clase Game: estado y transiciones de UNA partida de Cachos.
// -----------------------------------------------------------------------------
// Incluye el sistema OBLIGA: cuando un jugador queda con exactamente 1 dado y
// no ha usado su Obliga, al inicio de la siguiente ronda elige una de cuatro
// modalidades (Kamikaze, Abierto, Cerrado "de esta", Cerrado normal).
// Reglas clave: uso único por jugador, dura una sola ronda y NO se encadena
// (la ronda siguiente a una Obliga es siempre normal).
// =============================================================================

const {
  DICE_PER_PLAYER,
  MAX_DICE,
  ACE,
  rollDice,
  validateRaise,
  canCalzar,
  canPasarHand,
  resolveDoubt,
  resolveCalza,
  countFace,
  formatBid,
  FACE_NAMES_PLURAL,
} = require('./rules');

let SEQ = 0;
const nextId = (prefix) => `${prefix}_${Date.now().toString(36)}_${(SEQ += 1)}`;

const OBLIGA_MODES = ['kamikaze', 'abierto', 'cerradoA', 'cerradoB'];

// Máximo de jugadores por sala. Una sola fuente de verdad en el servidor.
const MAX_PLAYERS = 6;

// Normaliza y acota las reglas personalizadas elegidas al crear la sala.
// Los temas de SALA se eliminaron: solo se conserva el color de mesa (tableTheme).
const TABLE_THEMES = ['clasico', 'nocturno', 'burdeo', 'whisky', 'negro'];

function normalizeSettings(s = {}) {
  const dice = Number(s.dicePerPlayer);
  return {
    dicePerPlayer: Number.isFinite(dice) ? Math.min(6, Math.max(1, Math.round(dice))) : DICE_PER_PLAYER,
    turnSeconds: [15, 30, 60].includes(Number(s.turnSeconds)) ? Number(s.turnSeconds) : null, // null = sin límite
    calzoInfinito: !!s.calzoInfinito, // por defecto OFF (regla normal: al menos la mitad)
    pasarEnabled: !!s.pasarEnabled,
    // Ambiente visual elegido al crear la sala: solo color de mesa.
    tableTheme: TABLE_THEMES.includes(s.tableTheme) ? s.tableTheme : 'clasico',
  };
}

class Game {
  constructor(code, hostName, hostSocketId, settings, ranked = false) {
    this.code = code;
    this.status = 'lobby'; // 'lobby' | 'playing' | 'finished'
    this.phase = 'lobby'; // 'lobby' | 'obliga-choose' | 'bidding' | 'reveal' | 'finished'
    this.ranked = !!ranked; // si true, al terminar se aplica ELO
    this.eliminationOrder = []; // playerIds en orden de eliminación (el primero = cayó antes)

    this.settings = normalizeSettings(settings);

    this.players = [];
    this.seatOrder = [];

    this.currentTurnId = null;
    this.currentBid = null; // { quantity, face, playerId, esta? }
    this.roundStarterId = null;
    this.round = 0;

    // Dirección de juego de la ronda: 1 = izquierda (siguiente en seatOrder),
    // -1 = derecha. La elige el jugador que abre la ronda.
    this.roundDirection = 1;

    // ── Partida falsa ──
    // Si alguien ABRE la ronda apostando ases, no hay apuesta real: el turno
    // pasa y el siguiente jugador abre libremente. No se puede dudar/calzar
    // una partida falsa y no puede haber dos seguidas en la misma ronda.
    this.falsa = null; // { playerId } mientras está activa
    this.falsaUsedThisRound = false;

    // Resultados ELO de la partida (los llena index.js al terminar si es ranked).
    this.eloResults = null; // [{ playerId, userId, delta, newElo }]

    this.initialTotalDice = 0;
    this.centerPool = 0;

    // ── Sistema Obliga ──
    this.obliga = null; // ronda actual: { playerId, mode, declaredFace?, secretFace? }
    this.pendingObligaIds = []; // cola de jugadores que llegaron a 1 dado (pendiente de activar)
    this.blockObligaNextRound = false; // true = la próxima ronda debe ser normal (no encadenar)

    // ── Acción "Pasar" ──
    // Cuando alguien pasa, el SIGUIENTE jugador solo puede apostar o dudar el paso.
    this.pendingPass = null; // { passerId } mientras el siguiente no resuelva

    this.lastResult = null;
    this.winnerId = null;
    this.log = [];
    this.chat = []; // mensajes de chat (separado del historial de juego)

    // ── Resumen de partida (estilo "Game Review") ──
    // Snapshot de dados por jugador al final de cada ronda, para el gráfico
    // del resumen final. Se llena en _recordRoundSnapshot().
    this.roundHistory = []; // [{ round, dice: [{ id, n }] }]
    this.rematchRequests = []; // nombres de quienes pidieron revancha (post-partida)
    this.turnDeadline = null; // epoch ms del fin del turno actual (lo fija index.js)

    const host = this._makePlayer(hostName, hostSocketId, true);
    this.players.push(host);
    this.seatOrder.push(host.id);
    this.hostId = host.id;
  }

  // Estadísticas individuales de la partida (para el resumen final).
  _freshStats() {
    return {
      bids: 0,          // apuestas realizadas
      doubtsWon: 0,     // dudas acertadas (incluye dudar pasos)
      doubtsLost: 0,    // dudas falladas
      calzasWon: 0,     // calzas exactas
      calzasLost: 0,    // calzas falladas
      passes: 0,        // veces que pasó
      passesSurvived: 0,// pasos dudados con mano válida
      passesCaught: 0,  // faroles de paso pillados
      diceLost: 0,      // dados perdidos en total
      diceGained: 0,    // dados recuperados del centro
    };
  }

  _makePlayer(name, socketId, isHost = false) {
    return {
      id: nextId('p'),
      name: (name || 'Jugador').slice(0, 20),
      socketId,
      connected: true,
      diceCount: this.settings.dicePerPlayer,
      dice: [],
      eliminated: false,
      isHost,
      cosmetic: null, // personalización { hood, face, cup } enviada por el cliente
      obligaUsed: false, // Obliga es un beneficio único por jugador durante toda la partida
      passedThisRound: false, // "Pasar" se permite una vez por ronda por persona
      chatCount: 0, // mensajes enviados en el turno actual (límite anti-spam)
      chatToken: null, // token del turno para el que cuenta chatCount
      stats: this._freshStats(), // resumen de la partida
    };
  }

  _addLog(message) {
    this.log.push({ id: nextId('l'), message, ts: Date.now() });
    if (this.log.length > 60) this.log.shift();
  }

  // Token que identifica el "turno" actual (cambia al avanzar turno o ronda).
  _chatToken() {
    return `${this.round}:${this.currentTurnId || 'none'}`;
  }

  // Agrega un mensaje de chat de un jugador (separado del historial de juego).
  // Límite: máximo 10 mensajes por turno; al cambiar el turno se reinicia.
  addChat(playerId, text) {
    const player = this.getPlayer(playerId);
    if (!player) return { error: 'Jugador no encontrado.' };

    const token = this._chatToken();
    if (player.chatToken !== token) {
      player.chatToken = token;
      player.chatCount = 0;
    }
    if (player.chatCount >= 10) {
      return { error: 'Límite de 10 mensajes por turno alcanzado.' };
    }

    const clean = String(text || '').slice(0, 200).trim();
    if (!clean) return { error: 'Mensaje vacío.' };

    player.chatCount += 1;
    const msg = { id: nextId('c'), playerId, name: player.name, text: clean, ts: Date.now() };
    this.chat.push(msg);
    if (this.chat.length > 50) this.chat.shift();
    return { ok: true, msg };
  }

  getPlayer(playerId) {
    return this.players.find((p) => p.id === playerId) || null;
  }

  getPlayerBySocket(socketId) {
    return this.players.find((p) => p.socketId === socketId) || null;
  }

  activePlayers() {
    return this.seatOrder.map((id) => this.getPlayer(id)).filter((p) => p && !p.eliminated);
  }

  // ---------------------------------------------------------------------------
  // Lobby
  // ---------------------------------------------------------------------------

  addPlayer(name, socketId) {
    if (this.status !== 'lobby') return { error: 'La partida ya comenzó.' };
    if (this.players.length >= MAX_PLAYERS) return { error: `La sala está llena (máximo ${MAX_PLAYERS} jugadores).` };
    const player = this._makePlayer(name, socketId);
    this.players.push(player);
    this.seatOrder.push(player.id);
    this._addLog(`${player.name} se unió a la sala.`);
    return { player };
  }

  reconnect(playerId, socketId) {
    const player = this.getPlayer(playerId);
    if (!player) return { error: 'Jugador no encontrado en esta sala.' };
    player.socketId = socketId;
    player.connected = true;
    this._addLog(`${player.name} se reconectó.`);
    return { player };
  }

  markDisconnected(socketId) {
    const player = this.getPlayerBySocket(socketId);
    if (!player) return null;
    player.connected = false;
    if (this.status === 'lobby') {
      this.players = this.players.filter((p) => p.id !== player.id);
      this.seatOrder = this.seatOrder.filter((id) => id !== player.id);
      if (player.isHost && this.players.length > 0) {
        this.players[0].isHost = true;
        this.hostId = this.players[0].id;
      }
    } else {
      this._addLog(`${player.name} se desconectó.`);
    }
    return player;
  }

  // ---------------------------------------------------------------------------
  // Inicio de partida
  // ---------------------------------------------------------------------------

  start(byPlayerId) {
    if (byPlayerId !== this.hostId) return { error: 'Solo el anfitrión puede iniciar.' };
    if (this.status !== 'lobby') return { error: 'La partida ya comenzó.' };
    if (this.players.length < 2) return { error: 'Se necesitan al menos 2 jugadores.' };

    this.status = 'playing';
    this.initialTotalDice = this.players.length * this.settings.dicePerPlayer;
    this.centerPool = 0;
    this.round = 0;
    this.pendingObligaIds = [];
    this.blockObligaNextRound = false;
    this.eliminationOrder = [];
    this.winnerId = null;
    this.eloResults = null;
    this.roundHistory = [];
    this.rematchRequests = [];
    this.players.forEach((p) => {
      p.diceCount = this.settings.dicePerPlayer;
      p.eliminated = false;
      p.obligaUsed = false;
      p.passedThisRound = false;
      p.stats = this._freshStats();
    });
    this._addLog('¡Comienza la partida!');
    this._recordRoundSnapshot(); // punto de partida del gráfico (ronda 0)
    this._startRound(this.hostId);
    return { ok: true };
  }

  // Guarda cuántos dados tiene cada jugador (para el gráfico del resumen).
  _recordRoundSnapshot() {
    this.roundHistory.push({
      round: this.round,
      dice: this.players.map((p) => ({ id: p.id, n: p.eliminated ? 0 : p.diceCount })),
    });
    if (this.roundHistory.length > 300) this.roundHistory.shift();
  }

  // ---------------------------------------------------------------------------
  // Manejo de rondas
  // ---------------------------------------------------------------------------

  // Elige (de la cola) un jugador elegible para activar Obliga esta ronda.
  _pickObligaCandidate() {
    while (this.pendingObligaIds.length > 0) {
      const id = this.pendingObligaIds[0];
      const p = this.getPlayer(id);
      if (p && !p.eliminated && p.diceCount === 1 && !p.obligaUsed) {
        return id; // se mantiene en la cola hasta que active
      }
      this.pendingObligaIds.shift(); // ya no aplica, descartar
    }
    return null;
  }

  _startRound(starterId) {
    this.round += 1;
    this.currentBid = null;
    this.lastResult = null;
    this.obliga = null;
    this.pendingPass = null;
    this.falsa = null;
    this.falsaUsedThisRound = false;
    this.roundDirection = 1;
    // El historial PERSISTE entre rondas (con tope en _addLog): así, cuando
    // alguien se rinde o abandona y la ronda se reinicia, el aviso sigue
    // visible en vez de borrarse al instante.
    this._addLog(`— Ronda ${this.round} —`);
    this.players.forEach((p) => { p.passedThisRound = false; });

    // ¿Esta ronda puede ser de Obliga? No, si la anterior ya lo fue (no encadenar).
    let obligaId = null;
    if (this.blockObligaNextRound) {
      this.blockObligaNextRound = false; // esta ronda "normal forzada" consume el bloqueo
    } else {
      obligaId = this._pickObligaCandidate();
    }

    if (obligaId) {
      // Entrar en fase de ELECCIÓN de modalidad. Los dados aún NO se lanzan
      // (Kamikaze se declara antes de lanzar).
      this.phase = 'obliga-choose';
      this.obliga = { playerId: obligaId, mode: null };
      this.currentTurnId = obligaId;
      this.roundStarterId = obligaId;
      this.players.forEach((p) => { p.dice = []; });
      this._addLog(`${this.getPlayer(obligaId).name} llegó a 1 dado: debe elegir su Obliga.`);
      return;
    }

    // Ronda normal.
    this.phase = 'bidding';
    this.players.forEach((p) => {
      p.dice = p.eliminated ? [] : rollDice(p.diceCount);
    });
    this.roundStarterId = this._resolveActiveStarter(starterId);
    this.currentTurnId = this.roundStarterId;
  }

  _resolveActiveStarter(starterId) {
    const order = this.seatOrder;
    const startIdx = Math.max(0, order.indexOf(starterId));
    for (let i = 0; i < order.length; i += 1) {
      const id = order[(startIdx + i) % order.length];
      const p = this.getPlayer(id);
      if (p && !p.eliminated) return id;
    }
    return starterId;
  }

  // Devuelve el jugador activo a la IZQUIERDA de `id` (siguiente en seatOrder).
  _leftOf(id) {
    const order = this.seatOrder;
    const idx = order.indexOf(id);
    for (let i = 1; i <= order.length; i += 1) {
      const nid = order[(idx + i) % order.length];
      const p = this.getPlayer(nid);
      if (p && !p.eliminated) return nid;
    }
    return id;
  }

  _advanceTurn() {
    const order = this.seatOrder;
    const len = order.length;
    const dir = this.roundDirection === -1 ? -1 : 1;
    const idx = order.indexOf(this.currentTurnId);
    for (let i = 1; i <= len; i += 1) {
      const id = order[(((idx + dir * i) % len) + len) % len];
      const p = this.getPlayer(id);
      if (p && !p.eliminated) {
        this.currentTurnId = id;
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Elección de modalidad Obliga
  // ---------------------------------------------------------------------------

  chooseObliga(playerId, mode, face) {
    if (this.phase !== 'obliga-choose') return { error: 'No es momento de elegir Obliga.' };
    if (!this.obliga || this.obliga.playerId !== playerId) return { error: 'No te corresponde elegir Obliga.' };
    if (!OBLIGA_MODES.includes(mode)) return { error: 'Modalidad de Obliga inválida.' };

    const player = this.getPlayer(playerId);
    if (player.obligaUsed) return { error: 'Ya usaste tu Obliga en esta partida.' };

    player.obligaUsed = true;
    this.obliga.mode = mode;

    // Quitar al jugador de la cola de pendientes.
    this.pendingObligaIds = this.pendingObligaIds.filter((id) => id !== playerId);

    // Lanzar los dados de todos los jugadores activos ahora.
    this.players.forEach((p) => { p.dice = p.eliminated ? [] : rollDice(p.diceCount); });

    if (mode === 'kamikaze') {
      const declared = Number(face);
      if (!(declared >= 1 && declared <= 6)) return { error: 'Debes declarar una pinta válida.' };
      this.obliga.declaredFace = declared;
      this._addLog(`${player.name} activa KAMIKAZE y declara ${FACE_NAMES_PLURAL[declared]}.`);
      return this._applyKamikaze();
    }

    // Modalidades con apuestas: el obligado abre la ronda.
    this.phase = 'bidding';
    this.currentTurnId = playerId;

    if (mode === 'cerradoA') {
      this.obliga.secretFace = player.dice[0]; // su único dado define la pinta secreta
      this._addLog(`${player.name} activa OBLIGA CERRADO ("de esta"). Solo él ve su dado.`);
    } else if (mode === 'cerradoB') {
      this._addLog(`${player.name} activa OBLIGA CERRADO. Él ve su dado; el resto a ciegas.`);
    } else {
      this._addLog(`${player.name} activa OBLIGA ABIERTO. Ve los dados ajenos, no el suyo.`);
    }
    return { ok: true, resolved: false };
  }

  // ---------------------------------------------------------------------------
  // Apuestas / Dudar / Calzar
  // ---------------------------------------------------------------------------

  placeBid(playerId, quantity, face, direction) {
    if (this.phase !== 'bidding') return { error: 'No es momento de apostar.' };
    if (this.currentTurnId !== playerId) return { error: 'No es tu turno.' };

    const mode = this.obliga?.mode;
    const q = Number(quantity);
    const f = Number(face);
    const totalInPlay = this.activePlayers().reduce((s, p) => s + p.diceCount, 0);
    const isOpening = !this.currentBid;

    // El que abre la ronda elige la dirección de juego (izquierda/derecha).
    if (isOpening && (direction === 'left' || direction === 'right')) {
      this.roundDirection = direction === 'right' ? -1 : 1;
    }

    // Apostar tras un paso es válido: la ronda continúa con la apuesta previa al
    // paso. Al apostar, el paso deja de poder dudarse.
    this.pendingPass = null;

    // ── Modalidad Cerrado "de esta": pinta bloqueada (secreta), solo sube cantidad ──
    if (mode === 'cerradoA') {
      if (q < 1) return { error: 'La cantidad debe ser al menos 1.' };
      if (q > totalInPlay) return { error: `No puedes apostar más de ${totalInPlay} (dados en juego).` };
      if (this.currentBid && q <= this.currentBid.quantity) {
        return { error: 'Solo puedes aumentar la cantidad ("X de esta") o dudar.' };
      }
      this.currentBid = {
        quantity: q,
        face: this.obliga.secretFace, // valor real (oculto a los demás en serialize)
        esta: true,
        playerId,
      };
      this.getPlayer(playerId).stats.bids += 1;
      this._addLog(`${this.getPlayer(playerId).name} apuesta ${q} de esta.`);
      this._advanceTurn();
      return { ok: true };
    }

    // ── Partida falsa: abrir la ronda apostando ases ──
    if (isOpening && f === ACE && !this.obliga) {
      if (this.falsaUsedThisRound) {
        return { error: 'No puede haber dos partidas falsas seguidas: abre con otra pinta.' };
      }
      this.falsaUsedThisRound = true;
      this.falsa = { playerId };
      const passer = this.getPlayer(playerId);
      this._advanceTurn();
      const opener = this.getPlayer(this.currentTurnId);
      this._addLog(`${passer.name} abre con ases: PARTIDA FALSA. ${opener ? opener.name : 'El siguiente'} abre la ronda libremente.`);
      return { ok: true };
    }

    // ── Resto de modalidades / juego normal ──
    const next = { quantity: q, face: f };
    const check = validateRaise(this.currentBid, next, { totalDice: totalInPlay });
    if (!check.ok) return { error: check.reason };

    // Si veníamos de una partida falsa, esta apuesta abre la ronda de verdad.
    if (this.falsa) this.falsa = null;

    this.currentBid = { ...next, playerId };
    this.getPlayer(playerId).stats.bids += 1;
    this._addLog(`${this.getPlayer(playerId).name} apuesta ${formatBid(this.currentBid)}.`);
    this._advanceTurn();
    return { ok: true };
  }

  doubt(playerId) {
    if (this.phase !== 'bidding') return { error: 'No es momento de dudar.' };
    if (this.currentTurnId !== playerId) return { error: 'No es tu turno.' };
    if (this.pendingPass) {
      return { error: 'Hay un paso pendiente: solo puedes apostar o dudar el paso.' };
    }
    if (this.falsa) return { error: 'No se puede dudar una partida falsa: debes abrir la ronda.' };
    if (!this.currentBid) return { error: 'No hay apuesta para dudar.' };

    const bid = this.currentBid;
    const allDice = this.activePlayers().map((p) => p.dice);
    const { actual, loserRole } = resolveDoubt(allDice, bid);

    const challenger = this.getPlayer(playerId);
    const bidder = this.getPlayer(bid.playerId);
    const loser = loserRole === 'bidder' ? bidder : challenger;

    const bidLabel = bid.esta ? `${bid.quantity} de esta (${FACE_NAMES_PLURAL[bid.face]})` : formatBid(bid);
    this._addLog(
      `${challenger.name} duda de ${bidLabel} (${bidder.name}). Había ${actual}. Pierde un dado ${loser.name}.`
    );

    return this._applyResolution({
      type: 'doubt',
      bid,
      actual,
      challengerId: challenger.id,
      bidderId: bidder.id,
      loserId: loser.id,
      gainerId: null,
    });
  }

  calzar(playerId) {
    if (this.phase !== 'bidding') return { error: 'No es momento de calzar.' };
    if (this.currentTurnId !== playerId) return { error: 'No es tu turno.' };
    if (this.pendingPass) return { error: 'No se puede calzar un paso.' };
    if (this.falsa) return { error: 'No se puede calzar una partida falsa: debes abrir la ronda.' };
    if (!this.currentBid) return { error: 'No hay apuesta para calzar.' };
    if (this.obliga?.mode === 'cerradoA') {
      return { error: 'En Obliga "de esta" no se puede calzar, solo subir cantidad o dudar.' };
    }

    const player = this.getPlayer(playerId);
    const totalInPlay = this.activePlayers().reduce((s, p) => s + p.diceCount, 0);
    if (!canCalzar(totalInPlay, this.initialTotalDice, this.settings.calzoInfinito)) {
      return { error: 'Calzo solo disponible con al menos la mitad de los dados en juego.' };
    }

    const bid = this.currentBid;
    const allDice = this.activePlayers().map((p) => p.dice);
    const { actual, success } = resolveCalza(allDice, bid);

    this._addLog(
      `${player.name} calza ${formatBid(bid)}. Había ${actual}. ` +
        (success ? '¡Acierta y gana un dado!' : 'Falla y pierde un dado.')
    );

    return this._applyResolution({
      type: 'calzar',
      bid,
      actual,
      challengerId: player.id,
      bidderId: bid.playerId,
      loserId: success ? null : player.id,
      gainerId: success ? player.id : null,
    });
  }

  // ---------------------------------------------------------------------------
  // Acción "Pasar" (solo si la regla está activa)
  // ---------------------------------------------------------------------------

  pasar(playerId) {
    if (!this.settings.pasarEnabled) return { error: 'La acción Pasar no está activa en esta sala.' };
    if (this.phase !== 'bidding') return { error: 'No es momento de pasar.' };
    if (this.currentTurnId !== playerId) return { error: 'No es tu turno.' };
    if (this.pendingPass) return { error: 'Tras un paso solo puedes apostar o dudar el paso.' };
    if (this.obliga) return { error: 'No se puede pasar durante una ronda de Obliga.' };
    if (!this.currentBid) return { error: 'No puedes pasar antes de la primera apuesta de la ronda.' };

    if (this.falsa) return { error: 'No se puede pasar durante una partida falsa.' };

    const player = this.getPlayer(playerId);
    if (player.diceCount !== 5) return { error: 'Solo puedes pasar con exactamente 5 dados.' };
    if (player.passedThisRound) return { error: 'Ya pasaste en esta ronda.' };

    // Se permite pasar SIEMPRE (es un farol): el jugador declara tener una mano
    // especial sin que se valide aquí. Si el siguiente duda el paso y la mano NO
    // era válida, el que pasó pierde un dado (ver doubtPass).
    player.passedThisRound = true;
    player.stats.passes += 1;
    this.pendingPass = { passerId: playerId };
    this._addLog(`${player.name} PASA. La apuesta sigue en ${this.currentBid ? formatBid(this.currentBid) : '—'}.`);
    this._advanceTurn();
    return { ok: true };
  }

  // Dudar el PASO (no la pinta): se desafía que la mano del que pasó sea especial.
  doubtPass(playerId) {
    if (this.phase !== 'bidding') return { error: 'No es momento de dudar.' };
    if (this.currentTurnId !== playerId) return { error: 'No es tu turno.' };
    if (!this.pendingPass) return { error: 'No hay ningún paso para dudar.' };

    const passer = this.getPlayer(this.pendingPass.passerId);
    const challenger = this.getPlayer(playerId);
    const valid = passer.diceCount === 5 && canPasarHand(passer.dice);

    // Mano válida → pierde el que dudó. Mano inválida → pierde el que pasó.
    const loser = valid ? challenger : passer;

    this._addLog(
      `${challenger.name} duda el paso de ${passer.name}. ` +
        (valid ? 'La mano era válida: ' : 'La mano NO era válida: ') +
        `pierde un dado ${loser.name}.`
    );

    this.phase = 'reveal';
    loser.diceCount -= 1;
    this.centerPool += 1;
    loser.stats.diceLost += 1;
    if (valid) {
      passer.stats.passesSurvived += 1;
      challenger.stats.doubtsLost += 1;
    } else {
      passer.stats.passesCaught += 1;
      challenger.stats.doubtsWon += 1;
    }
    if (loser.diceCount <= 0) {
      loser.eliminated = true;
      loser.diceCount = 0;
      this._addLog(`${loser.name} se quedó sin dados y queda eliminado.`);
      if (!this.eliminationOrder.includes(loser.id)) this.eliminationOrder.push(loser.id);
    }

    this._queueObligaTriggers();
    this._recordRoundSnapshot();

    this.lastResult = {
      type: 'pass-doubt',
      passerId: passer.id,
      challengerId: challenger.id,
      valid,
      loserId: loser.id,
      reveal: this.players.map((p) => ({ id: p.id, name: p.name, dice: [...p.dice] })),
    };

    this.pendingPass = null;

    if (this._finishIfWon()) return { ok: true, finished: true };

    // Parte la siguiente ronda quien perdió el dado.
    return { ok: true, finished: false, nextStarterId: loser.id };
  }

  // Apuesta automática por tiempo agotado: misma pinta +1, o "1 tonto" si abre.
  autoBid() {
    if (this.phase !== 'bidding') return { ok: false };
    const playerId = this.currentTurnId;
    const totalInPlay = this.activePlayers().reduce((s, p) => s + p.diceCount, 0);

    // Si hay un paso pendiente, el jugador restringido apuesta sobre la apuesta previa.
    if (this.currentBid) {
      // Si subir excedería el total de dados en juego, duda automáticamente.
      if (this.currentBid.quantity + 1 > totalInPlay) {
        return this.pendingPass ? this.doubtPass(playerId) : this.doubt(playerId);
      }
      if (this.currentBid.esta) {
        return this.placeBid(playerId, this.currentBid.quantity + 1, 0);
      }
      return this.placeBid(playerId, this.currentBid.quantity + 1, this.currentBid.face);
    }
    // Sin apuesta previa: abre con "1 tonto" (cantidad 1, pinta 2).
    return this.placeBid(playerId, 1, 2);
  }

  // ---------------------------------------------------------------------------
  // Resolución de KAMIKAZE (sin apuestas)
  // ---------------------------------------------------------------------------

  _applyKamikaze() {
    this.phase = 'reveal';
    const declared = this.obliga.declaredFace;
    const obligadoId = this.obliga.playerId;

    // Cada jugador (incluido el obligado) pierde TODOS los dados que muestren
    // la pinta declarada. Conteo literal (el as NO actúa como comodín aquí).
    const losses = []; // { id, lost }
    this.activePlayers().forEach((p) => {
      const lost = p.dice.filter((v) => v === declared).length;
      if (lost > 0) {
        const remove = Math.min(lost, p.diceCount);
        p.diceCount -= remove;
        this.centerPool += remove;
        p.stats.diceLost += remove;
        losses.push({ id: p.id, lost: remove });
        if (p.diceCount <= 0) {
          p.diceCount = 0;
          p.eliminated = true;
          if (!this.eliminationOrder.includes(p.id)) this.eliminationOrder.push(p.id);
        }
      }
    });

    if (losses.length === 0) {
      this._addLog('Kamikaze: nadie sacó la pinta declarada. Sin bajas.');
    } else {
      losses.forEach(({ id, lost }) => {
        const p = this.getPlayer(id);
        this._addLog(`Kamikaze: ${p.name} pierde ${lost} dado${lost === 1 ? '' : 's'}.${p.eliminated ? ' Queda eliminado.' : ''}`);
      });
    }

    this.lastResult = {
      type: 'kamikaze',
      declaredFace: declared,
      obligadoId,
      losses,
      reveal: this.players.map((p) => ({ id: p.id, name: p.name, dice: [...p.dice] })),
    };

    // Detectar nuevos jugadores que quedaron en 1 dado por el Kamikaze.
    this._queueObligaTriggers();
    this._recordRoundSnapshot();

    if (this._finishIfWon()) return { ok: true, resolved: true, finished: true };

    // La próxima ronda es normal (no se encadena). Tras un Kamikaze parte el
    // propio obligado (el que activó el Kamikaze). Si quedó eliminado por su
    // propia jugada, _startRound -> _resolveActiveStarter avanza al siguiente
    // jugador activo automáticamente.
    this.blockObligaNextRound = true;
    const nextStarterId = obligadoId;
    this.obliga = null;
    return { ok: true, resolved: true, finished: false, nextStarterId };
  }

  // ---------------------------------------------------------------------------
  // Resolución de ronda con apuestas (dudar / calzar)
  // ---------------------------------------------------------------------------

  _applyResolution({ type, bid, actual, challengerId, bidderId, loserId, gainerId }) {
    this.phase = 'reveal';
    const wasObliga = !!this.obliga;
    const obligadoId = this.obliga?.playerId || null;

    // ── Estadísticas del resumen ──
    const challengerStats = this.getPlayer(challengerId)?.stats;
    if (challengerStats) {
      if (type === 'doubt') {
        if (loserId === challengerId) challengerStats.doubtsLost += 1;
        else challengerStats.doubtsWon += 1;
      } else if (type === 'calzar') {
        if (gainerId) challengerStats.calzasWon += 1;
        else challengerStats.calzasLost += 1;
      }
    }

    if (loserId) {
      const loser = this.getPlayer(loserId);
      loser.diceCount -= 1;
      this.centerPool += 1;
      loser.stats.diceLost += 1;
      if (loser.diceCount <= 0) {
        loser.eliminated = true;
        loser.diceCount = 0;
        this._addLog(`${loser.name} se quedó sin dados y queda eliminado.`);
        if (!this.eliminationOrder.includes(loser.id)) this.eliminationOrder.push(loser.id);
      }
    }

    if (gainerId) {
      const gainer = this.getPlayer(gainerId);
      if (this.centerPool > 0 && gainer.diceCount < this.settings.dicePerPlayer) {
        gainer.diceCount += 1;
        this.centerPool -= 1;
        gainer.stats.diceGained += 1;
      } else {
        this._addLog(`No hay dados en el centro para recuperar: ${gainer.name} no recibe ninguno.`);
      }
    }

    // Nuevos jugadores en 1 dado → cola de Obliga (si no la han usado).
    this._queueObligaTriggers();
    this._recordRoundSnapshot();

    this.lastResult = {
      type,
      bid: bid.esta ? { quantity: bid.quantity, face: bid.face, esta: true } : bid,
      actual,
      challengerId,
      bidderId,
      loserId,
      gainerId,
      obliga: wasObliga ? { playerId: obligadoId, mode: this.obliga.mode } : null,
      reveal: this.players.map((p) => ({ id: p.id, name: p.name, dice: [...p.dice] })),
    };

    if (this._finishIfWon()) return { ok: true, finished: true };

    // Si esta fue una ronda de Obliga, la siguiente debe ser normal (no encadenar)
    // y parte la izquierda del obligado.
    let nextStarterId;
    if (wasObliga) {
      this.blockObligaNextRound = true;
      nextStarterId = this._leftOf(obligadoId);
    } else {
      nextStarterId = gainerId || loserId || challengerId;
    }
    this.obliga = null;

    return { ok: true, finished: false, nextStarterId };
  }

  // Añade a la cola a quien haya quedado con exactamente 1 dado y no use Obliga.
  _queueObligaTriggers() {
    // El Obliga pierde el sentido en duelos: con solo 2 jugadores activos no
    // se gatilla (y se limpian los pendientes si la mesa quedó en 2).
    if (this.activePlayers().length <= 2) {
      this.pendingObligaIds = [];
      return;
    }
    this.activePlayers().forEach((p) => {
      if (p.diceCount === 1 && !p.obligaUsed && !this.pendingObligaIds.includes(p.id)) {
        this.pendingObligaIds.push(p.id);
      }
    });
  }

  _finishIfWon() {
    const remaining = this.players.filter((p) => !p.eliminated);
    if (remaining.length <= 1) {
      this.status = 'finished';
      this.phase = 'finished';
      this.winnerId = remaining[0] ? remaining[0].id : null;
      if (this.winnerId) this._addLog(`🏆 ¡${this.getPlayer(this.winnerId).name} gana la partida!`);
      return true;
    }
    return false;
  }

  beginNextRound(starterId) {
    if (this.status !== 'playing') return { ok: false };
    this._startRound(starterId);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Rendirse / abandono — el jugador queda eliminado formalmente y la partida
  // sigue. Sus dados van al centro y la ronda se reinicia (todos vuelven a
  // tirar) para no dejar apuestas o turnos huérfanos.
  // ---------------------------------------------------------------------------

  resign(playerId, auto = false) {
    if (this.status !== 'playing') return { error: 'La partida no está en curso.' };
    const player = this.getPlayer(playerId);
    if (!player) return { error: 'Jugador no encontrado.' };
    if (player.eliminated) return { error: 'Ya estás eliminado.' };

    this.centerPool += player.diceCount;
    player.diceCount = 0;
    player.eliminated = true;
    player.dice = [];
    this.pendingObligaIds = this.pendingObligaIds.filter((id) => id !== playerId);
    if (!this.eliminationOrder.includes(player.id)) this.eliminationOrder.push(player.id);
    this._addLog(auto
      ? `${player.name} no volvió a conectarse y abandona la partida.`
      : `${player.name} se rinde.`);
    this._recordRoundSnapshot();

    if (this._finishIfWon()) return { ok: true, finished: true };

    // Reiniciar la ronda en curso desde el siguiente jugador activo.
    const nextStarterId = this._leftOf(playerId);
    this._startRound(nextStarterId);
    return { ok: true, finished: false };
  }

  // ---------------------------------------------------------------------------
  // Revancha — reinicia la sala con los jugadores conectados.
  // El anfitrión la inicia; el resto puede "pedirla" (queda registrado y el
  // anfitrión lo ve en la pantalla final).
  // ---------------------------------------------------------------------------

  rematch(byPlayerId) {
    if (this.status !== 'finished') return { error: 'La partida aún no termina.' };
    const requester = this.getPlayer(byPlayerId);
    if (!requester) return { error: 'Jugador no encontrado.' };

    const hostP = this.getPlayer(this.hostId);
    const hostConnected = !!(hostP && hostP.connected);

    // No-anfitrión con anfitrión presente: registrar la petición.
    if (byPlayerId !== this.hostId && hostConnected) {
      if (!this.rematchRequests.includes(requester.name)) {
        this.rematchRequests.push(requester.name);
        this._addLog(`${requester.name} pide revancha.`);
      }
      return { ok: true, requested: true };
    }

    // Si el anfitrión se fue, quien pide la revancha hereda el rol.
    if (!hostConnected) {
      if (hostP) hostP.isHost = false;
      requester.isHost = true;
      this.hostId = requester.id;
    }

    // Solo siguen los jugadores conectados.
    this.players = this.players.filter((p) => p.connected);
    this.seatOrder = this.seatOrder.filter((id) => this.players.some((p) => p.id === id));
    if (this.players.length < 2) {
      return { error: 'Se necesitan al menos 2 jugadores conectados para la revancha.' };
    }

    this.status = 'lobby';
    this.phase = 'lobby';
    this.winnerId = null;
    this.lastResult = null;
    this.currentBid = null;
    this.obliga = null;
    this.pendingPass = null;
    this.falsa = null;
    this.eloResults = null;
    this.chat = [];
    this.log = [];
    this._addLog('¡Revancha!');
    return this.start(this.hostId); // arranca de inmediato, mismo código de sala
  }

  // Posiciones finales: ganador primero, luego en orden inverso de eliminación.
  _finalStandings() {
    if (this.status !== 'finished') return null;
    const ids = [];
    if (this.winnerId) ids.push(this.winnerId);
    [...this.eliminationOrder].reverse().forEach((id) => {
      if (!ids.includes(id)) ids.push(id);
    });
    this.players.forEach((p) => { if (!ids.includes(p.id)) ids.push(p.id); });
    return ids.map((id, i) => {
      const p = this.getPlayer(id);
      const er = this.eloResults?.find((r) => r.playerId === id) || null;
      return {
        id,
        name: p?.name || '—',
        cosmetic: p?.cosmetic || null,
        place: i + 1,
        isWinner: id === this.winnerId,
        eloDelta: er ? er.delta : null,
        newElo: er ? er.newElo : null,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Serialización segura por jugador
  // ---------------------------------------------------------------------------

  // Decide qué dados ve `viewerId` de la mano de `target` durante una Obliga.
  _obligaVisibility(viewerId, target) {
    const mode = this.obliga.mode;
    const obligadoId = this.obliga.playerId;
    const isObligado = viewerId === obligadoId;

    if (mode === 'abierto') {
      // El obligado ve TODOS los dados ajenos pero NO el suyo.
      if (isObligado) return target.id === obligadoId ? null : [...target.dice];
      // El resto: solo sus propios dados.
      return target.id === viewerId ? [...target.dice] : null;
    }
    // cerradoA y cerradoB: solo el obligado ve su dado; nadie ve los ajenos.
    if (isObligado && target.id === obligadoId) return [...target.dice];
    return null;
  }

  serialize(forPlayerId) {
    const revealAll = this.phase === 'reveal' || this.phase === 'finished';
    const inObliga = (this.phase === 'bidding' || this.phase === 'obliga-choose') && !!this.obliga;

    const players = this.seatOrder.map((id) => {
      const p = this.getPlayer(id);
      if (!p) return null;

      let dice = null;
      if (revealAll) {
        dice = [...p.dice];
      } else if (inObliga) {
        dice = this._obligaVisibility(forPlayerId, p);
      } else if (p.id === forPlayerId) {
        dice = [...p.dice]; // juego normal: cada quien ve lo suyo
      }

      return {
        id: p.id,
        name: p.name,
        connected: p.connected,
        diceCount: p.diceCount,
        eliminated: p.eliminated,
        isHost: p.isHost,
        isYou: p.id === forPlayerId,
        cosmetic: p.cosmetic || null,
        obligaUsed: p.obligaUsed,
        hasAccount: !!p.userId, // permite abrir su perfil público desde la mesa
        stats: p.stats || null,
        dice,
      };
    }).filter(Boolean);

    const me = this.getPlayer(forPlayerId);
    const totalInPlay = this.activePlayers().reduce((s, p) => s + p.diceCount, 0);

    // Apuesta visible: en "de esta" se enmascara la pinta para todos (durante bidding).
    let currentBidOut = this.currentBid;
    if (this.currentBid && this.currentBid.esta && !revealAll) {
      currentBidOut = { quantity: this.currentBid.quantity, esta: true, playerId: this.currentBid.playerId };
    }

    const obligaOut = this.obliga
      ? {
          playerId: this.obliga.playerId,
          mode: this.obliga.mode,
          // La pinta declarada del Kamikaze y la secreta solo se exponen al revelar.
          declaredFace: revealAll ? this.obliga.declaredFace : undefined,
        }
      : null;

    const calzarBlocked = this.obliga?.mode === 'cerradoA' || !!this.pendingPass;

    // ¿Puedo pasar AHORA? El paso es un farol: disponible siempre en mi turno
    // (sin importar los dados), si la regla está activa y no hay paso pendiente.
    const canPasarNow =
      this.settings.pasarEnabled &&
      this.phase === 'bidding' &&
      this.currentTurnId === forPlayerId &&
      !!this.currentBid &&
      !this.pendingPass &&
      !this.falsa &&
      !this.obliga &&
      me && !me.eliminated &&
      me.diceCount === 5 &&
      !me.passedThisRound;

    return {
      code: this.code,
      status: this.status,
      phase: this.phase,
      round: this.round,
      hostId: this.hostId,
      maxPlayers: MAX_PLAYERS,
      settings: this.settings,
      currentTurnId: this.currentTurnId,
      roundStarterId: this.roundStarterId,
      currentBid: currentBidOut,
      ranked: this.ranked,
      roundDirection: this.roundDirection,
      // El que abre elige a quién le pasa el turno (define la dirección).
      youChooseDirection:
        this.phase === 'bidding' && !this.currentBid && !this.obliga &&
        this.currentTurnId === forPlayerId && this.activePlayers().length > 2,
      falsa: this.falsa ? { playerId: this.falsa.playerId } : null,
      falsaUsedThisRound: this.falsaUsedThisRound,
      finalStandings: this._finalStandings(),
      centerPool: this.centerPool,
      initialTotalDice: this.initialTotalDice,
      totalDiceInPlay: totalInPlay,
      canCalzarNow:
        me && !me.eliminated && !calzarBlocked
          ? canCalzar(totalInPlay, this.initialTotalDice, this.settings.calzoInfinito)
          : false,
      obliga: obligaOut,
      youMustChooseObliga: this.phase === 'obliga-choose' && this.obliga?.playerId === forPlayerId,
      // Estado del paso para la UI del jugador siguiente.
      pendingPass: this.pendingPass
        ? { passerId: this.pendingPass.passerId, mustRespond: this.currentTurnId === forPlayerId }
        : null,
      canPasarNow,
      lastResult: this.lastResult,
      winnerId: this.winnerId,
      // Fin de turno (epoch ms) si la sala tiene reloj — para el anillo de tiempo.
      turnDeadline: this.phase === 'bidding' ? this.turnDeadline : null,
      // Datos del resumen final (solo al terminar, para no inflar cada estado).
      roundHistory: this.status === 'finished' ? this.roundHistory : undefined,
      rematchRequests: this.status === 'finished' ? this.rematchRequests : undefined,
      players,
      log: this.log.slice(-25),
      chat: this.chat.slice(-30),
      chatRemaining: me ? Math.max(0, 10 - (me.chatToken === this._chatToken() ? me.chatCount : 0)) : 10,
      yourId: forPlayerId,
    };
  }
}

module.exports = { Game, MAX_PLAYERS };
