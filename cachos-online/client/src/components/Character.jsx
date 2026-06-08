import React from 'react';

// =============================================================================
// Character.jsx — Encapuchados estilo doodle (inspirados en la ilustración del
// menú): capucha de color, cara asomada con ceño, y un cacho de cuero negro.
// Variantes: 0 verde · 1 rojo · 2 negro · 3 rey (corona + cuello de piel).
// Solo cambia lo visual; la lógica del juego no se toca.
// =============================================================================

const SKIN = '#e7b489';
const SKIN_D = '#bd835a';
const INK = '#2c2118';

// Paleta de capuchas por variante.
const HOODS = [
  { hood: '#47512f', dark: '#333a22' }, // verde
  { hood: '#9d362b', dark: '#6f231c' }, // rojo
  { hood: '#202126', dark: '#0f0f12' }, // negro
  { king: true, cloak: '#2f3a2a', cloakDark: '#1f281d' }, // rey
];

/**
 * Personaje encapuchado.
 * @param variant 0..3
 * @param speaking turno activo (boca/cejas cambian un poco)
 * @param size ancho en px
 */
export default function Character({ variant = 0, speaking = false, size = 120 }) {
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
        // ── Cuello de piel del rey ──
        <g fill="#d9c8a6" stroke="#b6a079" strokeWidth="3" strokeLinejoin="round">
          <path d="M52 168 q14 -22 48 -22 q34 0 48 22 q-10 16 -28 18 q-20 4 -40 0 q-18 -2 -28 -18 Z" />
        </g>
      ) : (
        // ── Capucha (parte trasera alrededor de la cabeza) ──
        <path
          d="M42 98 C38 34 92 18 100 18 C108 18 162 34 158 98 C158 132 132 152 100 152 C68 152 42 132 42 98 Z"
          fill={v.hood}
          stroke={v.dark}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      )}

      {/* Cara (piel) */}
      <ellipse cx="100" cy="94" rx="35" ry="41" fill={SKIN} stroke={SKIN_D} strokeWidth="3" />

      {king ? (
        // ── Corona dorada ──
        <g>
          <path
            d="M62 54 L72 26 L86 48 L100 22 L114 48 L128 26 L138 54 C116 46 84 46 62 54 Z"
            fill="#d7af3c"
            stroke="#9c7d20"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="72" cy="26" r="4" fill="#f0d169" stroke="#9c7d20" strokeWidth="2" />
          <circle cx="100" cy="22" r="4.5" fill="#f0d169" stroke="#9c7d20" strokeWidth="2" />
          <circle cx="128" cy="26" r="4" fill="#f0d169" stroke="#9c7d20" strokeWidth="2" />
        </g>
      ) : (
        // ── Borde de la capucha sobre la frente ──
        <path
          d="M63 70 C68 40 132 40 137 70 C138 58 122 50 100 50 C78 50 62 58 63 70 Z"
          fill={v.hood}
          stroke={v.dark}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      )}

      {/* Cejas (ceño) */}
      <path
        d={speaking ? 'M74 84 L92 86 M126 84 L108 86' : 'M75 82 L92 89 M125 82 L108 89'}
        fill="none"
        stroke={INK}
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Ojos */}
      <ellipse cx="87" cy="99" rx="4.5" ry="6" fill={INK} />
      <ellipse cx="113" cy="99" rx="4.5" ry="6" fill={INK} />

      {/* Boca */}
      {speaking ? (
        <path d="M90 118 Q100 126 110 118" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <path d="M92 119 L108 119" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

/**
 * Cacho de cuero negro con un par de dados asomando y manos sosteniéndolo.
 */
export function Cup({ size = 54 }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 72 90" style={{ overflow: 'visible' }}>
      {/* Manos */}
      <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M8 44 q-7 10 1 22 q5 7 14 6 l4 -10 q-10 1 -13 -8 q-2 -7 1 -13 Z" />
        <path d="M64 44 q7 10 -1 22 q-5 7 -14 6 l-4 -10 q10 1 13 -8 q2 -7 -1 -13 Z" />
      </g>

      {/* Cuerpo del cacho */}
      <path d="M16 20 L56 20 L50 78 L22 78 Z" fill="#16161b" stroke="#caa86f" strokeWidth="3" strokeLinejoin="round" />
      {/* Costura */}
      <path d="M22 30 L50 30 M24 46 L48 46 M26 62 L46 62" stroke="rgba(202,168,111,0.45)" strokeWidth="1.5" strokeDasharray="3 4" />
      {/* Borde superior */}
      <ellipse cx="36" cy="20" rx="20" ry="5.5" fill="#0b0b0e" stroke="#caa86f" strokeWidth="3" />

      {/* Dados asomando */}
      <g>
        <rect x="22" y="6" width="14" height="14" rx="3" fill="#f3ecdf" stroke="#cbbfa4" strokeWidth="1" transform="rotate(-12 29 13)" />
        <circle cx="29" cy="13" r="1.8" fill="#16382a" transform="rotate(-12 29 13)" />
        <rect x="38" y="8" width="13" height="13" rx="3" fill="#f3ecdf" stroke="#cbbfa4" strokeWidth="1" transform="rotate(10 44 14)" />
        <circle cx="41" cy="11" r="1.5" fill="#16382a" /><circle cx="47" cy="17" r="1.5" fill="#16382a" />
      </g>

      {/* Sombra */}
      <ellipse cx="36" cy="82" rx="17" ry="3" fill="rgba(0,0,0,0.3)" />
    </svg>
  );
}
