// =============================================================================
// game.js — Clase Game: estado y transiciones de UNA partida de Cachos.
// -----------------------------------------------------------------------------
// Mantiene a los jugadores, sus dados, el turno actual, la apuesta vigente,
// el descarte central y la lógica de resolución de rondas. Es agnóstica de la
// red: el orquestador (index.js) llama a sus métodos y difunde el estado.
//
// Toda acción devuelve un objeto resultado que index.js usa para difundir y,
// cuando corresponde, programar el inicio de la siguiente ronda (fase reveal).
// =============================================================================

const {
  DICE_PER_PLAYER,
  MAX_DICE,
  rollDice,
  validateRaise,
  canCalzar,
  resolveDoubt,
  resolveCalza,
  formatBid,
} = require('./rules');

let SEQ = 0;
const nextId = (prefix) => `${prefix}_${Date.now().toString(36)}_${(SEQ += 1)}`;

class Game {
  constructor(code, hostName, hostSocketId) {
    this.code = code;
    this.status = 'lobby'; // 'lobby' | 'playing' | 'finished'
    this.phase = 'lobby'; // 'lobby' | 'bidding' | 'reveal' | 'finished'

    this.players = []; // { id, name, socketId, connected, diceCount, dice, eliminated, isHost }
    this.seatOrder = []; // ids en orden de asiento

    this.currentTurnId = null;
    this.currentBid = null; // { quantity, face, playerId }
    this.roundStarterId = null;
    this.round = 0;

    this.initialTotalDice = 0;
    this.centerPool = 0; // dados en el descarte central

    this.special = null; // ronda "último dado": { obligadoId }
    this.lastResult = null; // resumen de la última resolución (para reveal)
    this.winnerId = null;
    this.log = []; // historial de eventos legible

    const host = this._makePlayer(hostName, hostSocketId, true);
    this.players.push(host);
    this.seatOrder.push(host.id);
    this.hostId = host.id;
  }

  _makePlayer(name, socketId, isHost = false) {
    return {
      id: nextId('p'),
      name: (name || 'Jugador').slice(0, 20),
      socketId,
      connected: true,
      diceCount: DICE_PER_PLAYER,
      dice: [],
      eliminated: false,
      isHost,
    };
  }

  _addLog(message) {
    this.log.push({ id: nextId('l'), message, ts: Date.now() });
    if (this.log.length > 60) this.log.shift();
  }

  getPlayer(playerId) {
    return this.players.find((p) => p.id === playerId) || null;
  }

  getPlayerBySocket(socketId) {
    return this.players.find((p) => p.socketId === socketId) || null;
  }

  activePlayers() {
    return this.seatOrder
      .map((id) => this.getPlayer(id))
      .filter((p) => p && !p.eliminated);
  }

  // ---------------------------------------------------------------------------
  // Lobby
  // ---------------------------------------------------------------------------

  addPlayer(name, socketId) {
    if (this.status !== 'lobby') return { error: 'La partida ya comenzó.' };
    if (this.players.length >= 4) return { error: 'La sala está llena (máximo 4 jugadores).' };
    const player = this._makePlayer(name, socketId);
    this.players.push(player);
    this.seatOrder.push(player.id);
    this._addLog(`${player.name} se unió a la sala.`);
    return { player };
  }

  // Reconexión: vuelve a asociar un jugador existente a un socket nuevo.
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
      // En lobby, salir = abandonar la sala.
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
    this.initialTotalDice = this.players.length * DICE_PER_PLAYER;
    this.centerPool = 0;
    this.round = 0;
    this.players.forEach((p) => {
      p.diceCount = DICE_PER_PLAYER;
      p.eliminated = false;
    });
    this._addLog('¡Comienza la partida!');
    this._startRound(this.hostId);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Manejo de rondas
  // ---------------------------------------------------------------------------

  _startRound(starterId) {
    this.round += 1;
    this.phase = 'bidding';
    this.currentBid = null;
    this.lastResult = null;

    // Tirar dados ocultos para cada jugador activo.
    this.players.forEach((p) => {
      p.dice = p.eliminated ? [] : rollDice(p.diceCount);
    });

    // Resolver quién parte (saltando eliminados).
    this.roundStarterId = this._resolveActiveStarter(starterId);
    this.currentTurnId = this.roundStarterId;

    // ¿Ronda especial del "último dado"?
    if (this.special && this.special.obligadoId) {
      const obligado = this.getPlayer(this.special.obligadoId);
      if (obligado && !obligado.eliminated) {
        this._addLog(`Ronda del último dado: ${obligado.name} ve su dado, el resto apuesta a ciegas.`);
      } else {
        this.special = null;
      }
    }
  }

  // Devuelve el primer jugador activo a partir de `starterId` (inclusive).
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

  // Avanza el turno al siguiente jugador activo.
  _advanceTurn() {
    const order = this.seatOrder;
    const idx = order.indexOf(this.currentTurnId);
    for (let i = 1; i <= order.length; i += 1) {
      const id = order[(idx + i) % order.length];
      const p = this.getPlayer(id);
      if (p && !p.eliminated) {
        this.currentTurnId = id;
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Acciones de los jugadores
  // ---------------------------------------------------------------------------

  placeBid(playerId, quantity, face) {
    if (this.phase !== 'bidding') return { error: 'No es momento de apostar.' };
    if (this.currentTurnId !== playerId) return { error: 'No es tu turno.' };

    const next = { quantity: Number(quantity), face: Number(face) };
    const check = validateRaise(this.currentBid, next);
    if (!check.ok) return { error: check.reason };

    this.currentBid = { ...next, playerId };
    const player = this.getPlayer(playerId);
    this._addLog(`${player.name} apuesta ${formatBid(this.currentBid)}.`);
    this._advanceTurn();
    return { ok: true };
  }

  doubt(playerId) {
    if (this.phase !== 'bidding') return { error: 'No es momento de dudar.' };
    if (this.currentTurnId !== playerId) return { error: 'No es tu turno.' };
    if (!this.currentBid) return { error: 'No hay apuesta para dudar.' };

    const bid = this.currentBid;
    const allDice = this.activePlayers().map((p) => p.dice);
    const { actual, loserRole } = resolveDoubt(allDice, bid);

    const challenger = this.getPlayer(playerId);
    const bidder = this.getPlayer(bid.playerId);
    const loser = loserRole === 'bidder' ? bidder : challenger;

    this._addLog(
      `${challenger.name} duda de ${formatBid(bid)} (${bidder.name}). ` +
        `Había ${actual}. Pierde un dado ${loser.name}.`
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
    if (!this.currentBid) return { error: 'No hay apuesta para calzar.' };

    const player = this.getPlayer(playerId);
    const totalInPlay = this.activePlayers().reduce((s, p) => s + p.diceCount, 0);
    if (!canCalzar(totalInPlay, this.initialTotalDice, player.diceCount)) {
      return {
        error: 'Solo puedes calzar con la mitad de los dados en juego o teniendo un solo dado.',
      };
    }

    const bid = this.currentBid;
    const allDice = this.activePlayers().map((p) => p.dice);
    const { actual, success } = resolveCalza(allDice, bid);

    this._addLog(
      `${player.name} calza ${formatBid(bid)}. Había ${actual}. ` +
        (success ? `¡Acierta y gana un dado!` : `Falla y pierde un dado.`)
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
  // Resolución de ronda (pérdida/ganancia de dados, eliminación, victoria)
  // ---------------------------------------------------------------------------

  _applyResolution({ type, bid, actual, challengerId, bidderId, loserId, gainerId }) {
    this.phase = 'reveal';

    let triggeredObligadoId = null;

    if (loserId) {
      const loser = this.getPlayer(loserId);
      const before = loser.diceCount;
      loser.diceCount -= 1;
      this.centerPool += 1; // el dado perdido va al centro
      if (loser.diceCount <= 0) {
        loser.eliminated = true;
        loser.diceCount = 0;
        this._addLog(`${loser.name} se quedó sin dados y queda eliminado.`);
      } else if (before === 2 && loser.diceCount === 1) {
        // Transición a "último dado": la próxima ronda es especial.
        triggeredObligadoId = loser.id;
      }
    }

    if (gainerId) {
      const gainer = this.getPlayer(gainerId);
      if (this.centerPool > 0 && gainer.diceCount < MAX_DICE) {
        gainer.diceCount += 1;
        this.centerPool -= 1;
      } else {
        this._addLog(`No hay dados en el centro para recuperar: ${gainer.name} no recibe ninguno.`);
      }
    }

    // Guardar revelación para el cliente (todas las manos visibles).
    this.lastResult = {
      type,
      bid,
      actual,
      challengerId,
      bidderId,
      loserId,
      gainerId,
      reveal: this.players.map((p) => ({ id: p.id, name: p.name, dice: [...p.dice] })),
    };

    // ¿Victoria?
    const remaining = this.players.filter((p) => !p.eliminated);
    if (remaining.length <= 1) {
      this.status = 'finished';
      this.phase = 'finished';
      this.winnerId = remaining[0] ? remaining[0].id : null;
      if (this.winnerId) {
        this._addLog(`🏆 ¡${this.getPlayer(this.winnerId).name} gana la partida!`);
      }
      return { ok: true, finished: true };
    }

    // Preparar siguiente ronda. La inicia el perdedor; si calzó con éxito, el que calzó.
    const nextStarterId = gainerId || loserId || challengerId;
    this.special = triggeredObligadoId ? { obligadoId: triggeredObligadoId } : null;

    return { ok: true, finished: false, nextStarterId };
  }

  // Llamado por el orquestador tras el período de "reveal".
  beginNextRound(starterId) {
    if (this.status !== 'playing') return { ok: false };
    this._startRound(starterId);
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Serialización segura por jugador (oculta dados ajenos)
  // ---------------------------------------------------------------------------

  serialize(forPlayerId) {
    const revealAll = this.phase === 'reveal' || this.phase === 'finished';
    const obligadoId = this.special ? this.special.obligadoId : null;

    const players = this.seatOrder.map((id) => {
      const p = this.getPlayer(id);
      if (!p) return null;

      let dice = null;
      let canSeeOwn = false;

      if (revealAll) {
        dice = [...p.dice];
      } else if (p.id === forPlayerId) {
        if (obligadoId) {
          // Ronda especial: solo el "obligado" ve su dado; el resto a ciegas.
          canSeeOwn = p.id === obligadoId;
          dice = canSeeOwn ? [...p.dice] : null;
        } else {
          dice = [...p.dice];
          canSeeOwn = true;
        }
      }

      return {
        id: p.id,
        name: p.name,
        connected: p.connected,
        diceCount: p.diceCount,
        eliminated: p.eliminated,
        isHost: p.isHost,
        isYou: p.id === forPlayerId,
        dice, // null si está oculto
      };
    }).filter(Boolean);

    const totalInPlay = this.activePlayers().reduce((s, p) => s + p.diceCount, 0);
    const me = this.getPlayer(forPlayerId);

    return {
      code: this.code,
      status: this.status,
      phase: this.phase,
      round: this.round,
      hostId: this.hostId,
      currentTurnId: this.currentTurnId,
      roundStarterId: this.roundStarterId,
      currentBid: this.currentBid,
      centerPool: this.centerPool,
      initialTotalDice: this.initialTotalDice,
      totalDiceInPlay: totalInPlay,
      canCalzarNow: me && !me.eliminated
        ? canCalzar(totalInPlay, this.initialTotalDice, me.diceCount)
        : false,
      special: obligadoId ? { obligadoId } : null,
      lastResult: this.lastResult,
      winnerId: this.winnerId,
      players,
      log: this.log.slice(-25),
      yourId: forPlayerId,
    };
  }
}

module.exports = { Game };
