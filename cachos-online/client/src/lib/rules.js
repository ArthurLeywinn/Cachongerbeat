// =============================================================================
// rules.js (cliente) — Espejo de las reglas del servidor SOLO para feedback
// visual (deshabilitar botones, mostrar nombres de pintas, etc.).
// El servidor sigue siendo la autoridad; nunca confíes solo en esto.
// =============================================================================

export const ACE = 1;

export const FACE_NAMES = {
  1: 'As',
  2: 'Tonto',
  3: 'Tren',
  4: 'Cuarta',
  5: 'Quina',
  6: 'Sexta',
};

export const FACE_NAMES_PLURAL = {
  1: 'ases',
  2: 'tontos',
  3: 'trenes',
  4: 'cuartas',
  5: 'quinas',
  6: 'sextas',
};

export const FACE_NAMES_SINGULAR = {
  1: 'as',
  2: 'tonto',
  3: 'tren',
  4: 'cuarta',
  5: 'quina',
  6: 'sexta',
};

// Concordancia gramatical: singular si la cantidad es 1.
export function faceLabel(face, quantity) {
  return quantity === 1 ? FACE_NAMES_SINGULAR[face] : FACE_NAMES_PLURAL[face];
}

export function formatBid(bid) {
  if (!bid) return '—';
  return `${bid.quantity} ${faceLabel(bid.face, bid.quantity)}`;
}

// Etiqueta de apuesta segura: en modo "de esta" la pinta está oculta, así que
// se muestra "N de esta" en vez de intentar nombrar la pinta (evita "undefined").
export function bidText(bid) {
  if (!bid) return '—';
  if (bid.esta) return `${bid.quantity} de esta`;
  return formatBid(bid);
}

// Misma lógica que el servidor (ver server/src/rules.js).
export function validateRaise(prev, next, opts = {}) {
  if (!next) return { ok: false, reason: 'Apuesta vacía.' };
  if (next.face < 1 || next.face > 6) return { ok: false, reason: 'Pinta inválida.' };
  if (next.quantity < 1) return { ok: false, reason: 'La cantidad debe ser al menos 1.' };
  if (Number.isFinite(opts.totalDice) && next.quantity > opts.totalDice) {
    return { ok: false, reason: `Máximo ${opts.totalDice} (dados en juego).` };
  }

  if (!prev) {
    if (next.face === ACE) {
      // Abrir con ases = partida falsa (si está permitida en esta ronda).
      if (opts.allowFalsa) return { ok: true, falsa: true };
      return { ok: false, reason: 'No puede haber dos partidas falsas seguidas.' };
    }
    return { ok: true };
  }

  const prevIsAce = prev.face === ACE;
  const nextIsAce = next.face === ACE;

  if (prevIsAce && nextIsAce) {
    return next.quantity > prev.quantity
      ? { ok: true }
      : { ok: false, reason: 'Sobre ases solo subes la cantidad.' };
  }
  if (prevIsAce && !nextIsAce) {
    const min = prev.quantity * 2 + 1;
    return next.quantity >= min
      ? { ok: true }
      : { ok: false, reason: `Mínimo ${min} ${faceLabel(next.face, min)}.` };
  }
  if (!prevIsAce && nextIsAce) {
    const min = Math.ceil(prev.quantity / 2);
    return next.quantity >= min
      ? { ok: true }
      : { ok: false, reason: `Mínimo ${min} ${min === 1 ? 'as' : 'ases'}.` };
  }
  if (next.quantity > prev.quantity) return { ok: true };
  if (next.quantity === prev.quantity && next.face > prev.face) return { ok: true };
  return { ok: false, reason: 'Sube la cantidad o la pinta.' };
}

// Calcula una apuesta inicial sugerida válida a partir de la previa.
export function suggestNextBid(prev) {
  if (!prev) return { quantity: 1, face: 2 };
  if (prev.face === ACE) {
    // Subir aces.
    return { quantity: prev.quantity + 1, face: ACE };
  }
  if (prev.face < 6) return { quantity: prev.quantity, face: prev.face + 1 };
  return { quantity: prev.quantity + 1, face: 2 };
}

// --- Acción "Pasar" (espejo cliente para habilitar/deshabilitar el botón) ---
export function handPattern(dice) {
  const counts = {};
  for (const v of dice) counts[v] = (counts[v] || 0) + 1;
  return Object.values(counts).sort((a, b) => b - a);
}

export function canPasarHand(dice) {
  if (!dice || dice.length !== 5) return false;
  const p = handPattern(dice);
  const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  return eq(p, [1, 1, 1, 1, 1]) || eq(p, [5]) || eq(p, [3, 2]);
}
