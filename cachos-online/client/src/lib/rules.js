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

export function formatBid(bid) {
  if (!bid) return '—';
  return `${bid.quantity} ${FACE_NAMES_PLURAL[bid.face]}`;
}

// Misma lógica que el servidor (ver server/src/rules.js).
export function validateRaise(prev, next) {
  if (!next) return { ok: false, reason: 'Apuesta vacía.' };
  if (next.face < 1 || next.face > 6) return { ok: false, reason: 'Pinta inválida.' };
  if (next.quantity < 1) return { ok: false, reason: 'La cantidad debe ser al menos 1.' };

  if (!prev) {
    if (next.face === ACE) return { ok: false, reason: 'No puedes abrir con ases.' };
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
      : { ok: false, reason: `Mínimo ${min} ${FACE_NAMES_PLURAL[next.face]}.` };
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
