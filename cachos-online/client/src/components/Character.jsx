import React from 'react';

// =============================================================================
// Character.jsx — Encapuchados doodle personalizables.
//  - 6 colores de capucha (hood 0..5).
//  - 3 expresiones NEUTRALES (cuando no es su turno) y 3 de TURNO (modo apuesta).
//  - El cacho (Cup) tiene 3 estilos y siempre va boca abajo, sostenido por sus
//    dos manos, apoyado en la mesa frente al personaje.
// Solo visual; la lógica del juego no cambia.
// Compatibilidad: la prop `variant` sigue funcionando como selector de capucha.
// =============================================================================

const SKIN = '#e7b489';
const SKIN_D = '#bd835a';
const INK = '#2c2118';

// 6 colores de capucha.
export const HOODS = [
  { hood: '#47512f', dark: '#333a22' }, // 0 verde
  { hood: '#9d362b', dark: '#6f231c' }, // 1 rojo
  { hood: '#202126', dark: '#0f0f12' }, // 2 negro
  { hood: '#2f3e57', dark: '#1f2c40' }, // 3 azul
  { hood: '#4a3357', dark: '#33233d' }, // 4 morado
  { hood: '#7a5a23', dark: '#574013' }, // 5 mostaza
];

// 3 estilos de cacho (cuero negro, cuero claro, peltre/gris).
export const CUPS = [
  { body: '#1a1a20', base: '#23232a', mouth: '#0b0b0e', trim: '#caa86f' }, // 0
  { body: '#6b4a2a', base: '#7d5832', mouth: '#3a2614', trim: '#e0c084' }, // 1
  { body: '#3b3f45', base: '#4a4f57', mouth: '#15171a', trim: '#c2ccd4' }, // 2
];

export const HOOD_COUNT = HOODS.length;
export const CUP_COUNT = CUPS.length;
export const FACE_COUNT = 3;

// ── Caras neutrales (no es su turno) ───────────────────────────────────────
function NeutralFace({ idx }) {
  if (idx === 1) {
    // Serio / neutro: cejas rectas, ojos redondos, boca chica.
    return (
      <>
        <path d="M76 84 L94 84 M124 84 L106 84" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <circle cx="87" cy="99" r="5" fill={INK} />
        <circle cx="113" cy="99" r="5" fill={INK} />
        <path d="M93 119 L107 119" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </>
    );
  }
  if (idx === 2) {
    // Desconfiado: una ceja arriba, mirada de reojo, media sonrisa.
    return (
      <>
        <path d="M75 80 Q84 76 93 82 M124 86 L107 84" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="90" cy="99" rx="4.5" ry="6" fill={INK} />
        <ellipse cx="116" cy="99" rx="4.5" ry="6" fill={INK} />
        <path d="M92 120 Q100 124 108 118" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </>
    );
  }
  // 0 — ceño (enojado), la original.
  return (
    <>
      <path d="M75 82 L92 89 M125 82 L108 89" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="87" cy="99" rx="4.5" ry="6" fill={INK} />
      <ellipse cx="113" cy="99" rx="4.5" ry="6" fill={INK} />
      <path d="M92 119 L108 119" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    </>
  );
}

// Mano en la barbilla (gesto de "pensando"), común a las caras de turno.
function ChinHand() {
  return (
    <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
      <path d="M104 150 q18 -2 22 -16 q2 -8 -4 -10 q-6 -2 -8 6 q-2 8 -14 10 q-8 2 -6 8 q2 4 10 2 Z" />
      <path d="M112 132 l1 8 M118 131 l1 7 M123 129 l1 6" fill="none" stroke={SKIN_D} strokeWidth="1.6" />
    </g>
  );
}

// ── Caras de TURNO (modo apuesta) ───────────────────────────────────────────
function TurnFace({ idx }) {
  if (idx === 1) {
    // Confiado: ceja arriba, media sonrisa, acariciando la barbilla.
    return (
      <>
        <path d="M76 84 Q84 78 93 83 M124 88 Q116 82 107 85" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="87" cy="98" rx="4.5" ry="6" fill={INK} />
        <ellipse cx="113" cy="98" rx="4.5" ry="6" fill={INK} />
        <path d="M92 118 Q100 125 109 117" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <ChinHand />
      </>
    );
  }
  if (idx === 2) {
    // Maquinando: ojos entornados, sonrisa pícara, mano cerca de la boca.
    return (
      <>
        <path d="M76 85 L93 88 M124 85 L107 88" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M82 99 L92 99 M108 99 L118 99" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M92 119 Q100 126 108 119" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        <ChinHand />
      </>
    );
  }
  // 0 — pensativo (la original): mirada arriba, cejas relajadas, boca chica.
  return (
    <>
      <path d="M76 86 Q84 81 93 85 M124 86 Q116 81 107 85" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="87" cy="97" rx="5" ry="6.5" fill="#fff" stroke={SKIN_D} strokeWidth="1" />
      <ellipse cx="113" cy="97" rx="5" ry="6.5" fill="#fff" stroke={SKIN_D} strokeWidth="1" />
      <circle cx="88" cy="93" r="3" fill={INK} />
      <circle cx="114" cy="93" r="3" fill={INK} />
      <path d="M94 120 Q100 118 106 121" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <ChinHand />
    </>
  );
}

/**
 * Personaje encapuchado.
 * @param hood   índice de color de capucha (0..5). `variant` es alias.
 * @param face   índice de expresión (0..2).
 * @param thinking  true = expresión de turno; false = neutral.
 * @param size   ancho en px.
 */
export default function Character({ hood, variant = 0, face = 0, thinking = false, size = 120 }) {
  const hi = ((hood == null ? variant : hood) % HOOD_COUNT + HOOD_COUNT) % HOOD_COUNT;
  const v = HOODS[hi];
  const fi = ((face % FACE_COUNT) + FACE_COUNT) % FACE_COUNT;

  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 200 224" style={{ overflow: 'visible' }}>
      {/* Hombros / manto */}
      <path
        d="M22 224 C22 168 56 146 100 146 C144 146 178 168 178 224 Z"
        fill={v.hood}
        stroke={v.dark}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Capucha */}
      <path
        d="M42 98 C38 34 92 18 100 18 C108 18 162 34 158 98 C158 132 132 152 100 152 C68 152 42 132 42 98 Z"
        fill={v.hood}
        stroke={v.dark}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Cara */}
      <ellipse cx="100" cy="94" rx="35" ry="41" fill={SKIN} stroke={SKIN_D} strokeWidth="3" />

      {/* Sombra del borde de la capucha sobre la frente */}
      <path d="M63 70 C68 40 132 40 137 70 C138 58 122 50 100 50 C78 50 62 58 63 70 Z" fill={v.hood} stroke={v.dark} strokeWidth="3.5" strokeLinejoin="round" />

      {thinking ? <TurnFace idx={fi} /> : <NeutralFace idx={fi} />}
    </svg>
  );
}

/**
 * Cacho de cuero. Por defecto BOCA ABAJO (apoyado en la mesa, frente al jugador).
 * @param style  índice de estilo de cacho (0..2).
 * @param revealed  si true, se dibuja levantado (no usado en mesa; se conserva).
 */
export function Cup({ size = 54, revealed = false, style = 0 }) {
  const c = CUPS[((style % CUP_COUNT) + CUP_COUNT) % CUP_COUNT];
  const seam = `${c.trim}`;
  if (revealed) {
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 72 90" style={{ overflow: 'visible' }}>
        <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M8 40 q-7 10 1 22 q5 7 14 6 l4 -10 q-10 1 -13 -8 q-2 -7 1 -13 Z" />
          <path d="M64 40 q7 10 -1 22 q-5 7 -14 6 l-4 -10 q10 1 13 -8 q2 -7 -1 -13 Z" />
        </g>
        <path d="M16 18 L56 18 L50 76 L22 76 Z" fill={c.body} stroke={c.trim} strokeWidth="3" strokeLinejoin="round" />
        <path d="M22 28 L50 28 M24 44 L48 44 M26 60 L46 60" stroke={seam} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.5" />
        <ellipse cx="36" cy="18" rx="20" ry="5.5" fill={c.mouth} stroke={c.trim} strokeWidth="3" />
        <ellipse cx="36" cy="80" rx="17" ry="3" fill="rgba(0,0,0,0.3)" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 72 86" style={{ overflow: 'visible' }}>
      {/* Manos sosteniendo */}
      <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M10 40 q-7 9 0 20 q5 7 13 6 l3 -9 q-9 1 -12 -7 q-2 -7 1 -12 Z" />
        <path d="M62 40 q7 9 0 20 q-5 7 -13 6 l-3 -9 q9 1 12 -7 q2 -7 -1 -12 Z" />
      </g>
      {/* Cuerpo invertido: arriba angosto, abajo ancho */}
      <path d="M26 16 L46 16 L54 70 L18 70 Z" fill={c.body} stroke={c.trim} strokeWidth="3" strokeLinejoin="round" />
      {/* Costura */}
      <path d="M28 26 L44 26 M25 42 L47 42 M22 58 L50 58" stroke={seam} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.5" />
      {/* Base (arriba) */}
      <ellipse cx="36" cy="16" rx="10" ry="3.5" fill={c.base} stroke={c.trim} strokeWidth="2.5" />
      {/* Abertura apoyada en la mesa (abajo) */}
      <ellipse cx="36" cy="70" rx="18" ry="5" fill={c.mouth} stroke={c.trim} strokeWidth="3" />
      {/* Sombra */}
      <ellipse cx="36" cy="76" rx="19" ry="3" fill="rgba(0,0,0,0.32)" />
    </svg>
  );
}
