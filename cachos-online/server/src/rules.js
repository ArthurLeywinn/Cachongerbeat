// =============================================================================
// rules.js — Motor de reglas PURO de Cachos / Dudo (Liar's Dice)
// -----------------------------------------------------------------------------
// Este módulo NO conoce sockets ni salas. Solo contiene funciones puras que
// implementan las reglas descritas en el instructivo del PDF:
//   - Nombres de las pintas (caras) según su valor.
//   - Validación de apuestas (subir, bajar a ases, cambiar desde ases).
//   - Conteo de caras tratando al AS (1) como comodín.
//   - Resolución de "Dudar" y "Calzar".
//
// El servidor es la AUTORIDAD: el cliente puede usar una copia de estas reglas
// solo para feedback visual, pero la validación real ocurre aquí.
// =============================================================================

const DICE_PER_PLAYER = 5; // Cada jugador inicia con 5 dados.
const MAX_DICE = 5; // Un cacho nunca debe tener más de 5 dados.
const ACE = 1; // El "As" es comodín.

// Nombre de cada cara según el PDF (1=As/Comodín ... 6=Sexta).
const FACE_NAMES = {
  1: 'As',
  2: 'Tonto',
  3: 'Tren',
  4: 'Cuarta',
  5: 'Quina',
  6: 'Sexta',
};

// Versión en plural para mostrar apuestas ("4 trenes", "2 ases", etc.).
const FACE_NAMES_PLURAL = {
  1: 'ases',
  2: 'tontos',
  3: 'trenes',
  4: 'cuartas',
  5: 'quinas',
  6: 'sextas',
};

/**
 * Devuelve una etiqueta legible para una apuesta, ej: { quantity: 4, face: 3 } -> "4 trenes".
 */
function formatBid(bid) {
  if (!bid) return '—';
  return `${bid.quantity} ${FACE_NAMES_PLURAL[bid.face]}`;
}

/**
 * Lanza `count` dados (valores 1..6).
 */
function rollDice(count) {
  const dice = [];
  for (let i = 0; i < count; i += 1) {
    dice.push(1 + Math.floor(Math.random() * 6));
  }
  return dice;
}

/**
 * Cuenta cuántos dados coinciden con la pinta apostada en TODA la mesa.
 * Reglas del PDF:
 *  - Si la pinta apostada NO es as, los ases (1) cuentan como comodín y suman.
 *  - Si la pinta apostada ES as, solo cuentan los ases (no hay comodín extra).
 *
 * @param {number[][]} allDice  Arreglo de manos (cada mano es un arreglo de dados).
 * @param {number} face         Cara apostada (1..6).
 * @returns {number} cantidad total de coincidencias.
 */
function countFace(allDice, face) {
  let total = 0;
  for (const hand of allDice) {
    for (const value of hand) {
      if (face === ACE) {
        if (value === ACE) total += 1;
      } else if (value === face || value === ACE) {
        // El as actúa como comodín de la pinta apostada.
        total += 1;
      }
    }
  }
  return total;
}

/**
 * Valida si `next` es una apuesta legal después de `prev`.
 *
 * Interpretación de las reglas del PDF (ver README para detalle):
 *  - Sin apuesta previa: cualquier cantidad >= 1 sobre una pinta que NO sea as.
 *  - Ambas sobre ases: hay que subir la cantidad.
 *  - De ases -> pinta normal: la cantidad debe ser >= 2*ases + 1 ("el doble más uno").
 *  - De pinta normal -> ases (bajar): la cantidad debe ser >= mitad redondeada hacia
 *    arriba de la cantidad previa (4 trenes -> 2 ases, 5 trenes -> 3 ases).
 *  - Entre pintas normales: sube la cantidad, o misma cantidad con pinta mayor.
 *
 * @returns {{ ok: boolean, reason?: string }}
 */
function validateRaise(prev, next) {
  if (!next || typeof next.quantity !== 'number' || typeof next.face !== 'number') {
    return { ok: false, reason: 'Apuesta mal formada.' };
  }
  if (next.face < 1 || next.face > 6) {
    return { ok: false, reason: 'Pinta inválida.' };
  }
  if (next.quantity < 1) {
    return { ok: false, reason: 'La cantidad debe ser al menos 1.' };
  }

  // Primera apuesta de la ronda.
  if (!prev) {
    if (next.face === ACE) {
      return { ok: false, reason: 'No se puede abrir la ronda apostando ases.' };
    }
    return { ok: true };
  }

  const prevIsAce = prev.face === ACE;
  const nextIsAce = next.face === ACE;

  // Ases -> Ases: solo subir cantidad.
  if (prevIsAce && nextIsAce) {
    if (next.quantity > prev.quantity) return { ok: true };
    return { ok: false, reason: 'Sobre ases solo puedes subir la cantidad.' };
  }

  // Ases -> pinta normal: doble más uno (o más).
  if (prevIsAce && !nextIsAce) {
    const min = prev.quantity * 2 + 1;
    if (next.quantity >= min) return { ok: true };
    return {
      ok: false,
      reason: `Al salir de ases debes apostar al menos ${min} ${FACE_NAMES_PLURAL[next.face]}.`,
    };
  }

  // Pinta normal -> ases (bajar): mitad redondeada hacia arriba.
  if (!prevIsAce && nextIsAce) {
    const min = Math.ceil(prev.quantity / 2);
    if (next.quantity >= min) return { ok: true };
    return {
      ok: false,
      reason: `Para bajar a ases debes apostar al menos ${min} ${min === 1 ? 'as' : 'ases'}.`,
    };
  }

  // Pinta normal -> pinta normal.
  if (next.quantity > prev.quantity) return { ok: true };
  if (next.quantity === prev.quantity && next.face > prev.face) return { ok: true };

  return {
    ok: false,
    reason: 'Debes subir la cantidad, o mantenerla y subir la pinta.',
  };
}

/**
 * ¿Se permite "Calzar" en este momento?
 * Regla usada: solo se puede calzar cuando hay MÁS de la mitad de los dados
 * totales en juego, o cuando el participante tenga un solo dado.
 *
 * @param {number} totalDiceInPlay  Dados actualmente en manos de los jugadores.
 * @param {number} initialTotalDice Dados al inicio de la partida.
 * @param {number} playerDiceCount  Dados del jugador que quiere calzar.
 */
function canCalzar(totalDiceInPlay, initialTotalDice, playerDiceCount) {
  if (playerDiceCount === 1) return true;
  // Solo se puede calzar cuando hay MÁS de la mitad de los dados totales en juego.
  return totalDiceInPlay > initialTotalDice / 2;
}

/**
 * Resuelve un "Dudar".
 *  - Si la cantidad real es MENOR que la apuesta: el apostador pierde un dado.
 *  - Si es MAYOR o IGUAL: el que dudó pierde un dado.
 *
 * @returns {{ actual: number, loserRole: 'bidder' | 'challenger' }}
 */
function resolveDoubt(allDice, bid) {
  const actual = countFace(allDice, bid.face);
  const loserRole = actual < bid.quantity ? 'bidder' : 'challenger';
  return { actual, loserRole };
}

/**
 * Resuelve un "Calzar".
 *  - Si la cantidad real COINCIDE exactamente con la apuesta: el que calzó gana un dado.
 *  - Si no coincide: el que calzó pierde un dado.
 *
 * @returns {{ actual: number, success: boolean }}
 */
function resolveCalza(allDice, bid) {
  const actual = countFace(allDice, bid.face);
  const success = actual === bid.quantity;
  return { actual, success };
}

module.exports = {
  DICE_PER_PLAYER,
  MAX_DICE,
  ACE,
  FACE_NAMES,
  FACE_NAMES_PLURAL,
  formatBid,
  rollDice,
  countFace,
  validateRaise,
  canCalzar,
  resolveDoubt,
  resolveCalza,
};
