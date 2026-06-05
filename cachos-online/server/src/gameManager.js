// =============================================================================
// gameManager.js — Administra todas las salas (partidas) en memoria.
// -----------------------------------------------------------------------------
// Genera códigos únicos de 4 caracteres, busca salas y limpia las vacías.
// Para producción real se podría reemplazar por Redis; aquí basta memoria.
// =============================================================================

const { Game } = require('./game');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos (0,O,1,I)

class GameManager {
  constructor() {
    this.rooms = new Map(); // code -> Game
  }

  _generateCode() {
    let code;
    do {
      code = Array.from({ length: 4 }, () =>
        CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostName, hostSocketId, settings) {
    const code = this._generateCode();
    const game = new Game(code, hostName, hostSocketId, settings);
    this.rooms.set(code, game);
    return game;
  }

  getRoom(code) {
    if (!code) return null;
    return this.rooms.get(code.toUpperCase()) || null;
  }

  removeRoom(code) {
    this.rooms.delete(code);
  }

  // Elimina salas que quedaron totalmente vacías (sin jugadores conectados).
  cleanupEmptyRooms() {
    for (const [code, game] of this.rooms.entries()) {
      const anyConnected = game.players.some((p) => p.connected);
      if (game.players.length === 0 || !anyConnected) {
        this.rooms.delete(code);
      }
    }
  }
}

module.exports = { GameManager };
