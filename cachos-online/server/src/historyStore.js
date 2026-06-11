// historyStore.js — Historial local de partidas terminadas.
//
// Supabase solo registra partidas RANKED; las casuales se perdían y "Mi
// historial" quedaba vacío para la mayoría. Este store guarda las partidas
// casuales de usuarios con cuenta en un JSON local (server/data/history.json),
// y el endpoint /history las mezcla con las ranked de la base de datos.
//
// Formato: { [userId]: [ { gameId, date, ranked, place, players:[{username,place,isYou?}] } ] }

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'history.json');
const MAX_PER_USER = 30;

let store = {};
try {
  store = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch {
  store = {};
}

let saveTimer = null;
function save() {
  // Escritura diferida para no golpear el disco en cada partida.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(store));
    } catch (e) {
      console.error('[history] No se pudo guardar el historial local:', e.message);
    }
  }, 250);
}

/**
 * Registra una partida CASUAL terminada para todos sus jugadores con cuenta.
 * Las ranked no se guardan aquí: ya quedan en Supabase con su delta de ELO.
 */
function recordGame(game) {
  if (game.ranked) return;
  if (game._historyRecorded) return;
  game._historyRecorded = true;

  const withAccount = game.players.filter((p) => p.userId);
  if (withAccount.length === 0) return;

  const standings = game._finalStandings ? game._finalStandings() : [];
  const entryPlayers = standings.map((s) => {
    const p = game.getPlayer(s.id);
    return { username: s.name, place: s.place, userId: p?.userId || null };
  });

  const gameId = `local-${game.code}-${Date.now()}`;
  const date = new Date().toISOString();

  for (const p of withAccount) {
    const mine = standings.find((s) => s.id === p.id);
    const list = store[p.userId] || [];
    list.unshift({
      gameId,
      date,
      ranked: false,
      place: mine ? mine.place : null,
      players: entryPlayers.map(({ username, place, userId }) => ({
        username, place, isYou: userId === p.userId,
      })),
    });
    store[p.userId] = list.slice(0, MAX_PER_USER);
  }
  save();
}

/** Partidas casuales guardadas de un usuario (más recientes primero). */
function getGames(userId) {
  return (store[userId] || []).map((g) => ({ ...g }));
}

module.exports = { recordGame, getGames };
