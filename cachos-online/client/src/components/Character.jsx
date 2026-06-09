import React, { useId } from 'react';

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
// 10 skins de cacho. `deco` define el adorno dibujado sobre el cuerpo.
export const CUPS = [
  { id: 'cuero',    body: '#1a1a20', base: '#23232a', mouth: '#0b0b0e', trim: '#caa86f', deco: 'seams' }, // 0
  { id: 'madera',   body: '#7a4f28', base: '#8a5d33', mouth: '#3a2412', trim: '#c98f4e', deco: 'wood' },  // 1
  { id: 'estrella', body: '#2f4a32', base: '#37563b', mouth: '#13251a', trim: '#d7b24a', deco: 'star' },  // 2
  { id: 'nubes',    body: '#e7dcc2', base: '#efe7d2', mouth: '#b6a37a', trim: '#c2a86a', deco: 'clouds' },// 3
  { id: 'lava',     body: '#241616', base: '#2c1a1a', mouth: '#0c0606', trim: '#ff6a2a', deco: 'lava' },  // 4
  { id: 'hielo',    body: '#8fd0e8', base: '#aee0f2', mouth: '#3a6b80', trim: '#ffffff', deco: 'snow' },  // 5
  { id: 'corona',   body: '#6a4a8a', base: '#7a57a0', mouth: '#2c1f3d', trim: '#d7b24a', deco: 'crown' }, // 6
  { id: 'neon',     body: '#14121c', base: '#1c1830', mouth: '#06040a', trim: '#27e0e0', deco: 'neon' },  // 7
  { id: 'camo',     body: '#5a6638', base: '#66723f', mouth: '#232a14', trim: '#3c4422', deco: 'camo' },  // 8
  { id: 'oro',      body: '#e2b94e', base: '#eccb66', mouth: '#7a5a18', trim: '#f4dd7e', deco: 'gold' },  // 9
];

export const CUP_NAMES = ['Cuero', 'Madera', 'Estrella', 'Nubes', 'Lava', 'Hielo', 'Corona', 'Neón', 'Camo', 'Oro'];

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

// ── Caras de TURNO (modo apuesta) ───────────────────────────────────────────
function TurnFace({ idx }) {
  if (idx === 1) {
    // Confiado: ceja arriba, media sonrisa.
    return (
      <>
        <path d="M76 84 Q84 78 93 83 M124 88 Q116 82 107 85" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="87" cy="98" rx="4.5" ry="6" fill={INK} />
        <ellipse cx="113" cy="98" rx="4.5" ry="6" fill={INK} />
        <path d="M92 118 Q100 125 109 117" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </>
    );
  }
  if (idx === 2) {
    // Maquinando: ojos entornados, sonrisa pícara.
    return (
      <>
        <path d="M76 85 L93 88 M124 85 L107 88" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M82 99 L92 99 M108 99 L118 99" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M92 119 Q100 126 108 119" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
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
 * Cacho personalizable. Por defecto BOCA ABAJO (apoyado en la mesa).
 * @param style  índice de skin de cacho (0..9).
 */
export function Cup({ size = 54, revealed = false, style = 0 }) {
  const c = CUPS[((style % CUP_COUNT) + CUP_COUNT) % CUP_COUNT];
  const uid = useId().replace(/:/g, '');
  const clip = `cupclip-${uid}`;
  const BODY = 'M26 16 L46 16 L54 70 L18 70 Z';

  if (revealed) {
    return (
      <svg width={size} height={size * 1.25} viewBox="0 0 72 90" style={{ overflow: 'visible' }}>
        <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M8 40 q-7 10 1 22 q5 7 14 6 l4 -10 q-10 1 -13 -8 q-2 -7 1 -13 Z" />
          <path d="M64 40 q7 10 -1 22 q-5 7 -14 6 l-4 -10 q10 1 13 -8 q2 -7 -1 -13 Z" />
        </g>
        <path d="M16 18 L56 18 L50 76 L22 76 Z" fill={c.body} stroke={c.trim} strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="36" cy="18" rx="20" ry="5.5" fill={c.mouth} stroke={c.trim} strokeWidth="3" />
        <ellipse cx="36" cy="80" rx="17" ry="3" fill="rgba(0,0,0,0.3)" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 72 86" style={{ overflow: 'visible' }}>
      <defs>
        <clipPath id={clip}><path d={BODY} /></clipPath>
      </defs>
      {/* Manos sosteniendo */}
      <g fill={SKIN} stroke={SKIN_D} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M10 40 q-7 9 0 20 q5 7 13 6 l3 -9 q-9 1 -12 -7 q-2 -7 1 -12 Z" />
        <path d="M62 40 q7 9 0 20 q-5 7 -13 6 l-3 -9 q9 1 12 -7 q2 -7 -1 -12 Z" />
      </g>
      {/* Cuerpo (color base) */}
      <path d={BODY} fill={c.body} stroke={c.trim} strokeWidth="3" strokeLinejoin="round" />
      {/* Adorno del skin, recortado al cuerpo */}
      <g clipPath={`url(#${clip})`}>
        <CupDeco c={c} />
      </g>
      {/* Re-trazo del borde por encima del adorno */}
      <path d={BODY} fill="none" stroke={c.trim} strokeWidth="3" strokeLinejoin="round" />
      {/* Base (arriba) */}
      <ellipse cx="36" cy="16" rx="10" ry="3.5" fill={c.base} stroke={c.trim} strokeWidth="2.5" />
      {/* Abertura apoyada en la mesa (abajo) */}
      <ellipse cx="36" cy="70" rx="18" ry="5" fill={c.mouth} stroke={c.trim} strokeWidth="3" />
      {/* Sombra */}
      <ellipse cx="36" cy="76" rx="19" ry="3" fill="rgba(0,0,0,0.32)" />
    </svg>
  );
}

// Adorno dibujado sobre el cuerpo del cacho (coordenadas del viewBox 0..72 / 0..86).
function CupDeco({ c }) {
  const t = c.trim;
  switch (c.deco) {
    case 'wood':
      return (
        <g fill="none" stroke="#5e3c1e" strokeLinecap="round">
          <path d="M30 17 Q27 43 31 69 M37 17 Q39 43 36 69 M44 17 Q42 43 45 69" strokeWidth="1.2" opacity="0.55" />
          <path d="M20 28 L52 28 M18 60 L54 60" strokeWidth="3.5" opacity="0.5" />
        </g>
      );
    case 'star':
      return (
        <g>
          <path d="M20 26 L52 26 M18 60 L54 60" stroke={t} strokeWidth="2.4" />
          <path d="M36 30 L39.5 39.5 L49 43 L39.5 46.5 L36 56 L32.5 46.5 L23 43 L32.5 39.5 Z" fill={t} />
          <circle cx="27" cy="36" r="1.3" fill={t} /><circle cx="45" cy="36" r="1.3" fill={t} />
          <circle cx="27" cy="50" r="1.3" fill={t} /><circle cx="45" cy="50" r="1.3" fill={t} />
        </g>
      );
    case 'clouds':
      return (
        <g fill="none" stroke={t} strokeWidth="1.6" strokeLinecap="round" opacity="0.55">
          <path d="M24 34 q3 -4 7 -2 q3 -3 6 0 q3 -1 4 2" />
          <path d="M38 52 q3 -4 7 -2 q3 -3 6 0 q3 -1 4 2" />
          <path d="M22 60 q3 -3 6 -1 q3 -2 5 1" />
        </g>
      );
    case 'lava':
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M31 17 L35 30 L29 42 L36 54 L31 69 M45 18 L41 32 L47 46 L42 60 L46 70 M24 30 L30 40 L25 52" stroke="#ff5a1e" strokeWidth="2" />
          <path d="M31 17 L35 30 L29 42 L36 54 L31 69 M45 18 L41 32 L47 46 L42 60" stroke="#ffd24a" strokeWidth="0.8" opacity="0.9" />
        </g>
      );
    case 'snow':
      return (
        <g stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round">
          <path d="M20 28 L52 28 M18 60 L54 60" strokeWidth="2.2" opacity="0.9" />
          <g transform="translate(36 44)">
            <path d="M0 -10 L0 10 M-9 -5 L9 5 M-9 5 L9 -5" />
            <path d="M0 -10 L-3 -7 M0 -10 L3 -7 M0 10 L-3 7 M0 10 L3 7" strokeWidth="1.3" />
          </g>
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M20 26 L52 26 M18 60 L54 60" stroke={t} strokeWidth="2.4" />
          <path d="M27 50 L30 40 L36 47 L42 40 L45 50 Z" fill={t} />
          <circle cx="30" cy="39" r="1.6" fill={t} /><circle cx="36" cy="45" r="1.6" fill={t} /><circle cx="42" cy="39" r="1.6" fill={t} />
        </g>
      );
    case 'neon':
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M23 32 L49 32" stroke="#ff36c8" strokeWidth="2.4" />
          <path d="M21 46 L51 46" stroke="#27e0e0" strokeWidth="2.4" />
          <path d="M24 60 L48 60" stroke="#ff36c8" strokeWidth="2.4" />
        </g>
      );
    case 'camo':
      return (
        <g stroke="none">
          <path d="M20 20 q8 -2 12 4 q-2 8 -10 7 q-6 -3 -2 -11 Z" fill="#3a4322" />
          <path d="M40 24 q8 0 9 8 q-4 6 -11 3 q-3 -7 2 -11 Z" fill="#71804a" />
          <path d="M22 44 q9 -1 10 7 q-5 7 -12 3 q-4 -6 2 -10 Z" fill="#2c331a" />
          <path d="M42 50 q9 1 8 9 q-6 5 -12 0 q-2 -7 4 -9 Z" fill="#3a4322" />
          <path d="M30 62 q7 -1 9 5 q-4 5 -10 2 q-3 -4 1 -7 Z" fill="#71804a" />
        </g>
      );
    case 'gold':
      return (
        <g>
          <path d="M29 17 L32 70" stroke="#fff3c4" strokeWidth="3.5" opacity="0.4" strokeLinecap="round" />
          <path d="M44 17 L48 70" stroke="#a87f22" strokeWidth="3" opacity="0.25" strokeLinecap="round" />
          <path d="M20 28 L52 28 M18 60 L54 60" stroke="#fff3c4" strokeWidth="1.4" opacity="0.5" />
        </g>
      );
    case 'seams':
    default:
      return (
        <path d="M28 26 L44 26 M25 42 L47 42 M22 58 L50 58" stroke={t} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.5" />
      );
  }
}
