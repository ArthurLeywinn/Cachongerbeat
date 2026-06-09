import React from 'react';

// =============================================================================
// Character.jsx — Encapuchados doodle (verde/rojo/negro/rey).
//  - Por defecto: cara con ceño (como la ilustración).
//  - En su turno (thinking): cara pensativa, mirada arriba y mano en la barbilla.
// Cup: cacho de cuero. Boca abajo mientras se juega; se levanta al revelar.
// Solo visual; la lógica del juego no cambia.
// =============================================================================

const SKIN = '#e7b489';
const SKIN_D = '#bd835a';
const INK = '#2c2118';

const HOODS = [
  { hood: '#47512f', dark: '#333a22' }, // verde
  { hood: '#9d362b', dark: '#6f231c' }, // rojo
  { hood: '#202126', dark: '#0f0f12' }, // negro
  { king: true, cloak: '#2f3a2a', cloakDark: '#1f281d' }, // rey
];

export default function Character({ variant = 0, thinking = false, size = 120 }) {
  const v = HOODS[variant % HOODS.length];
  const king = !!v.king;

  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 200 224" style={{ overflow: 'visible' }}>
      {/* Hombros / manto */}
      <path
        d="M22 224 C22 168 56 146 100 146 C144 146 178 168 178 224 Z"
        fill={king ? v.cloak : v.hood}
        stroke={king ? v.cloakDark : v.dark}
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {king ? (
        <g fill="#d9c8a6" stroke="#b6a079" strokeWidth="3" strokeLinejoin="round">
          <path d="M52 168 q14 -22 48 -22 q34 0 48 22 q-10 16 -28 18 q-20 4 -40 0 q-18 -2 -28 -18 Z" />
        </g>
      ) : (
        <path
          d="M42 98 C38 34 92 18 100 18 C108 18 162 34 158 98 C158 132 132 152 100 152 C68 152 42 132 42 98 Z"
          fill={v.hood}
          stroke={v.dark}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      )}

      {/* Cara */}
      <ellipse cx="100" cy="94" rx="35" ry="41" fill={SKIN} stroke={SKIN_D} strokeWidth="3" />

      {king ? (
        <g>
          <path d="M62 54 L72 26 L86 48 L100 22 L114 48 L128 26 L138 54 C116 46 84 46 62 54 Z" fill="#d7af3c" stroke="#9c7d20" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="72" cy="26" r="4" fill="#f0d169" stroke="#9c7d20" strokeWidth="2" />
          <circle cx="100" cy="22" r="4.5" fill="#f0d169" stroke="#9c7d20" strokeWidth="2" />
          <circle cx="128" cy="26" r="4" fill="#f0d169" stroke="#9c7d20" strokeWidth="2" />
        </g>
      ) : (
        <path d="M63 70 C68 40 132 40 137 70 C138 58 122 50 100 50 C78 50 62 58 63 70 Z" fill={v.hood} stroke={v.dark} strokeWidth="3.5" strokeLinejoin="round" />
      )}

      {thinking ? (
        <>
          {/* Cejas relajadas (levantadas) */}
          <path d="M76 86 Q84 81 93 85 M124 86 Q116 81 107 85" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          {/* Ojos mirando hacia arriba */}
          <ellipse cx="87" cy="97" rx="5" ry="6.5" fill="#fff" stroke={SKIN_D} strokeWidth="1" />
          <ellipse cx="113" cy="97" rx="5" ry="6.5" fill="#fff" stroke={SKIN_D} strokeWidth="1" />
          <circle cx="88" cy="93" r="3" fill={INK} />
          <circle cx="114" cy="93" r="3" fill={INK} />
          {/* Boca pequeña pensativa (ladeada) */}
          <path d="M94 120 Q100 118 106 121" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />

          {/* ── Doodle de 3 manos en modo pensativo ── */}
          {/* Mano 1: en la pera (gesto de "pensando") */}
          <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
            <path d="M104 150 q18 -2 22 -16 q2 -8 -4 -10 q-6 -2 -8 6 q-2 8 -14 10 q-8 2 -6 8 q2 4 10 2 Z" />
            <path d="M112 132 l1 8 M118 131 l1 7 M123 129 l1 6" fill="none" stroke={SKIN_D} strokeWidth="1.6" />
          </g>

          {/* Mano 2: sostiene un pequeño cacho (vaso) abajo a la izquierda */}
          <g strokeLinejoin="round">
            {/* vasito de cuero */}
            <path d="M40 150 L62 150 L58 182 L44 182 Z" fill="#1a1a20" stroke="#caa86f" strokeWidth="2.5" />
            <ellipse cx="51" cy="150" rx="11" ry="3.4" fill="#23232a" stroke="#caa86f" strokeWidth="2" />
            <path d="M45 160 L57 160 M46 170 L56 170" stroke="rgba(202,168,111,0.4)" strokeWidth="1.2" strokeDasharray="3 3" />
            {/* mano que lo agarra */}
            <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5">
              <path d="M38 168 q-7 4 -6 12 q1 7 9 8 l20 1 q7 0 7 -7 q0 -6 -8 -6 l-14 -1 q-6 0 -7 -6 q-1 -4 -1 -4 Z" />
              <path d="M50 176 l0 7 M58 177 l0 6" fill="none" stroke={SKIN_D} strokeWidth="1.6" />
            </g>
          </g>

          {/* Mano 3: descansa al costado derecho (remata el doodle) */}
          <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
            <path d="M150 158 q15 -3 17 -16 q1 -7 -5 -7 q-5 0 -6 7 q-1 7 -11 9 q-7 1 -5 8 q2 5 10 2 Z" />
            <path d="M156 142 l1 7 M161 141 l1 6 M166 140 l1 5" fill="none" stroke={SKIN_D} strokeWidth="1.6" />
          </g>
        </>
      ) : (
        <>
          {/* Ceño (enojado) */}
          <path d="M75 82 L92 89 M125 82 L108 89" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          <ellipse cx="87" cy="99" rx="4.5" ry="6" fill={INK} />
          <ellipse cx="113" cy="99" rx="4.5" ry="6" fill={INK} />
          <path d="M92 119 L108 119" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/**
 * Cacho de cuero. Por defecto BOCA ABAJO (tapando los dados, como jugando).
 * Al revelar (`revealed`) se levanta y muestra la abertura.
 */
export function Cup({ size = 54, revealed = false }) {
  if (revealed) {
    // Cacho levantado: abertura hacia arriba, dados asomando.
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 72 90" style={{ overflow: 'visible' }}>
        <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M8 40 q-7 10 1 22 q5 7 14 6 l4 -10 q-10 1 -13 -8 q-2 -7 1 -13 Z" />
          <path d="M64 40 q7 10 -1 22 q-5 7 -14 6 l-4 -10 q10 1 13 -8 q2 -7 -1 -13 Z" />
        </g>
        <path d="M16 18 L56 18 L50 76 L22 76 Z" fill="#16161b" stroke="#caa86f" strokeWidth="3" strokeLinejoin="round" />
        <path d="M22 28 L50 28 M24 44 L48 44 M26 60 L46 60" stroke="rgba(202,168,111,0.45)" strokeWidth="1.5" strokeDasharray="3 4" />
        <ellipse cx="36" cy="18" rx="20" ry="5.5" fill="#0b0b0e" stroke="#caa86f" strokeWidth="3" />
        <rect x="22" y="4" width="14" height="14" rx="3" fill="#f3ecdf" stroke="#cbbfa4" strokeWidth="1" transform="rotate(-12 29 11)" />
        <circle cx="29" cy="11" r="1.8" fill="#16382a" transform="rotate(-12 29 11)" />
        <rect x="38" y="6" width="13" height="13" rx="3" fill="#f3ecdf" stroke="#cbbfa4" strokeWidth="1" transform="rotate(10 44 12)" />
        <circle cx="41" cy="9" r="1.5" fill="#16382a" /><circle cx="47" cy="15" r="1.5" fill="#16382a" />
        <ellipse cx="36" cy="80" rx="17" ry="3" fill="rgba(0,0,0,0.3)" />
      </svg>
    );
  }
  // Cacho BOCA ABAJO: base (estrecha) arriba, abertura (ancha) abajo sobre la mesa.
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 72 86" style={{ overflow: 'visible' }}>
      {/* Manos sosteniendo */}
      <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M10 40 q-7 9 0 20 q5 7 13 6 l3 -9 q-9 1 -12 -7 q-2 -7 1 -12 Z" />
        <path d="M62 40 q7 9 0 20 q-5 7 -13 6 l-3 -9 q9 1 12 -7 q2 -7 -1 -12 Z" />
      </g>
      {/* Cuerpo invertido: arriba angosto, abajo ancho */}
      <path d="M26 16 L46 16 L54 70 L18 70 Z" fill="#1a1a20" stroke="#caa86f" strokeWidth="3" strokeLinejoin="round" />
      {/* Costura */}
      <path d="M28 26 L44 26 M25 42 L47 42 M22 58 L50 58" stroke="rgba(202,168,111,0.4)" strokeWidth="1.5" strokeDasharray="3 4" />
      {/* Base (arriba) */}
      <ellipse cx="36" cy="16" rx="10" ry="3.5" fill="#23232a" stroke="#caa86f" strokeWidth="2.5" />
      {/* Abertura apoyada en la mesa (abajo) */}
      <ellipse cx="36" cy="70" rx="18" ry="5" fill="#0b0b0e" stroke="#caa86f" strokeWidth="3" />
      {/* Sombra */}
      <ellipse cx="36" cy="76" rx="19" ry="3" fill="rgba(0,0,0,0.32)" />
    </svg>
  );
}
