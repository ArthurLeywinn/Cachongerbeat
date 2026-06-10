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
export const FACE_COUNT = 15;
export const FACE_NAMES = [
  'Enojado', 'Feliz', 'De reojo', 'Aburrido', 'Guiño',
  'Sorpresa', 'Triste', 'Maquinando', 'Confiado', 'Risa',
  'Nervioso', 'En paz', 'Angustia', 'Enamorado', 'Frustrado',
];

// ── 15 expresiones (válidas en turno y fuera de turno) ──────────────────────
function Face({ idx }) {
  const i = ((idx % FACE_COUNT) + FACE_COUNT) % FACE_COUNT;
  const eyeO = (x, y = 99) => <ellipse cx={x} cy={y} rx="4.5" ry="6" fill={INK} />;
  switch (i) {
    case 1: // Feliz
      return (
        <>
          {eyeO(87)}{eyeO(113)}
          <path d="M89 117 Q100 128 111 117" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 2: // De reojo / desinterés
      return (
        <>
          <path d="M75 80 Q84 76 93 82 M124 86 L107 84" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="90" cy="99" rx="4.5" ry="6" fill={INK} /><ellipse cx="116" cy="99" rx="4.5" ry="6" fill={INK} />
          <path d="M92 120 Q100 124 108 118" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 3: // Aburrido (párpados caídos)
      return (
        <>
          <path d="M80 95 L94 95 M106 95 L120 95" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="87" cy="100" r="3" fill={INK} /><circle cx="113" cy="100" r="3" fill={INK} />
          <path d="M93 120 L107 120" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 4: // Guiño
      return (
        <>
          {eyeO(87)}
          <path d="M107 99 Q113 95 119 99" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M90 117 Q100 127 110 118" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 5: // Sorpresa "o"
      return (
        <>
          <circle cx="87" cy="98" r="6" fill="#fff" stroke={SKIN_D} strokeWidth="1" /><circle cx="113" cy="98" r="6" fill="#fff" stroke={SKIN_D} strokeWidth="1" />
          <circle cx="87" cy="98" r="3" fill={INK} /><circle cx="113" cy="98" r="3" fill={INK} />
          <ellipse cx="100" cy="121" rx="5" ry="6" fill={INK} />
        </>
      );
    case 6: // Triste / preocupado
      return (
        <>
          <path d="M78 88 Q86 82 93 86 M122 88 Q114 82 107 86" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          {eyeO(87, 100)}{eyeO(113, 100)}
          <path d="M92 123 Q100 116 108 123" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 7: // Maquinando (sin mano)
      return (
        <>
          <path d="M76 84 L93 88 M124 84 L107 88" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d="M82 99 L92 99 M108 99 L118 99" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M92 119 Q100 126 108 119" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 8: // Confiado
      return (
        <>
          <path d="M76 84 Q84 78 93 83 M124 88 Q116 82 107 85" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          {eyeO(87, 98)}{eyeO(113, 98)}
          <path d="M92 118 Q100 125 109 117" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 9: // Risa (ojos cerrados ^ ^ + boca abierta)
      return (
        <>
          <path d="M81 100 Q87 94 93 100 M107 100 Q113 94 119 100" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M88 116 Q100 132 112 116 Q100 122 88 116 Z" fill={INK} />
        </>
      );
    case 10: // Nervioso (sudor)
      return (
        <>
          <path d="M78 88 Q86 82 93 86 M122 88 Q114 82 107 86" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          {eyeO(87, 100)}{eyeO(113, 100)}
          <path d="M92 121 Q100 117 108 122" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M128 92 q-5 8 0 12 q5 -4 0 -12 Z" fill="#5ab4e6" stroke="#3a86b0" strokeWidth="1" />
        </>
      );
    case 11: // En paz (ojos curvos ◡ + sonrisa chica)
      return (
        <>
          <path d="M81 97 Q87 103 93 97 M107 97 Q113 103 119 97" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M93 119 Q100 124 107 119" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
        </>
      );
    case 12: // Angustia (boca abierta hacia abajo)
      return (
        <>
          <path d="M78 88 Q86 82 93 86 M122 88 Q114 82 107 86" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          {eyeO(87, 100)}{eyeO(113, 100)}
          <ellipse cx="100" cy="123" rx="6" ry="5" fill={INK} />
        </>
      );
    case 13: // Enamorado (corazones)
      return (
        <>
          <path d="M87 95 q-5 -5 -8 0 q-3 4 8 11 q11 -7 8 -11 q-3 -5 -8 0 Z" fill="#e0455a" />
          <path d="M113 95 q-5 -5 -8 0 q-3 4 8 11 q11 -7 8 -11 q-3 -5 -8 0 Z" fill="#e0455a" />
          <path d="M90 118 Q100 128 110 118" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
    case 14: // Frustrado >< (ojos apretados + dientes)
      return (
        <>
          <path d="M82 95 L92 103 M92 95 L82 103 M108 95 L118 103 M118 95 L108 103" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <rect x="90" y="116" width="20" height="9" rx="2" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <path d="M97 116 L97 125 M104 116 L104 125" stroke={INK} strokeWidth="1.6" />
        </>
      );
    case 0:
    default: // Enojado / ceño
      return (
        <>
          <path d="M75 82 L92 89 M125 82 L108 89" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          {eyeO(87)}{eyeO(113)}
          <path d="M92 119 L108 119" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
        </>
      );
  }
}

/**
 * Personaje encapuchado.
 * @param hood   índice de color de capucha (0..5). `variant` es alias.
 * @param face   índice de expresión (0..2).
 * @param thinking  true = expresión de turno; false = neutral.
 * @param size   ancho en px.
 */
const SHOULDERS = 'M22 224 C22 168 56 146 100 146 C144 146 178 168 178 224 Z';

// Nombres para el personalizador.
export const BODY_NAMES = ['Capucha', 'Rey', 'Ninja', 'Mago', 'Vaquero', 'Pirata', 'Caballero', 'Monje', 'Detective', 'Hacker', 'Deportista', 'Punk'];
export const HAT_NAMES = ['Ninguno', 'Corona', 'Sombrero mago', 'Sombrero vaquero', 'Sombrero pirata', 'Casco', 'Gorro detective', 'Capucha hoodie', 'Vincha', 'Capucha monje', 'Cinta ninja', 'Mohawk'];

// Índices del nuevo personaje por defecto (punk con poncho rojo, sin capucha).
export const PUNK_BODY = 11;
export const MOHAWK_HAT = 11;
export const ACC_NAMES = ['Ninguno', 'Lentes', 'Parche', 'Pipa', 'Pañuelo', 'Katana'];
export const BODY_COUNT = BODY_NAMES.length;
export const HAT_COUNT = HAT_NAMES.length;
export const ACC_COUNT = ACC_NAMES.length;

// ── Cuerpo / torso (se dibuja sobre los hombros) ────────────────────────────
function Body({ idx, hoodColor, hoodDark, clip }) {
  switch (idx) {
    case 1: // Rey: capa verde con cuello de piel + broche
      return (
        <>
          <path d={SHOULDERS} fill="#2f3a2a" stroke="#1f281d" strokeWidth="4" strokeLinejoin="round" />
          <path d="M70 150 q30 24 60 0 q-7 24 -30 24 q-23 0 -30 -24 Z" fill="#e9dcc0" stroke="#c7b894" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="100" cy="172" r="5" fill="#d7af3c" stroke="#9c7d20" strokeWidth="2" />
        </>
      );
    case 2: // Ninja: gi negro + correa cruzada
      return (
        <>
          <path d={SHOULDERS} fill="#1c1d22" stroke="#0d0d10" strokeWidth="4" strokeLinejoin="round" />
          <path d="M74 150 L128 214" stroke="#6b5230" strokeWidth="8" strokeLinecap="round" />
        </>
      );
    case 3: // Mago: manto azul + broche redondo
      return (
        <>
          <path d={SHOULDERS} fill="#2f3e57" stroke="#1f2c40" strokeWidth="4" strokeLinejoin="round" />
          <path d="M100 150 L80 224 M100 150 L120 224" stroke="#26344a" strokeWidth="3" />
          <circle cx="100" cy="168" r="6" fill="#5aa0c8" stroke="#2f6a88" strokeWidth="2.5" />
        </>
      );
    case 4: // Vaquero: chaqueta marrón + pañuelo rojo al cuello
      return (
        <>
          <path d={SHOULDERS} fill="#6e4a2b" stroke="#4a2f18" strokeWidth="4" strokeLinejoin="round" />
          <path d="M86 150 L70 200 M114 150 L130 200" stroke="#4a2f18" strokeWidth="3" />
          <path d="M82 150 q18 18 36 0 l-6 18 q-12 8 -24 0 Z" fill="#b23b2e" stroke="#7f2820" strokeWidth="2.5" strokeLinejoin="round" />
        </>
      );
    case 5: // Pirata: camiseta a rayas
      return (
        <g>
          <path d={SHOULDERS} fill="#e6e3da" stroke="#2b2b2b" strokeWidth="4" strokeLinejoin="round" />
          <g clipPath={`url(#${clip})`}>
            <g stroke="#23232a" strokeWidth="9">
              <path d="M22 158 L178 158 M22 178 L178 178 M22 198 L178 198 M22 218 L178 218" />
            </g>
          </g>
          <path d={SHOULDERS} fill="none" stroke="#2b2b2b" strokeWidth="4" strokeLinejoin="round" />
        </g>
      );
    case 6: // Caballero: armadura gris + hombreras + capa roja
      return (
        <>
          <path d="M30 224 C28 200 40 196 40 196 L60 200 L60 224 Z M170 224 C172 200 160 196 160 196 L140 200 L140 224 Z" fill="#7a1f1f" stroke="#561414" strokeWidth="3" strokeLinejoin="round" />
          <path d={SHOULDERS} fill="#9aa1a8" stroke="#5d646b" strokeWidth="4" strokeLinejoin="round" />
          <ellipse cx="54" cy="166" rx="20" ry="15" fill="#b3bac1" stroke="#5d646b" strokeWidth="3" />
          <ellipse cx="146" cy="166" rx="20" ry="15" fill="#b3bac1" stroke="#5d646b" strokeWidth="3" />
          <circle cx="100" cy="172" r="5" fill="#d7af3c" stroke="#9c7d20" strokeWidth="2" />
        </>
      );
    case 7: // Monje: túnica marrón con capucha caída
      return (
        <>
          <path d={SHOULDERS} fill="#5b4226" stroke="#3a2916" strokeWidth="4" strokeLinejoin="round" />
          <path d="M70 150 q30 30 60 0 q-2 18 -30 18 q-28 0 -30 -18 Z" fill="#4a3520" stroke="#3a2916" strokeWidth="3" strokeLinejoin="round" />
          <path d="M100 168 L100 224" stroke="#3a2916" strokeWidth="3" />
        </>
      );
    case 8: // Detective: abrigo café + camisa y corbata
      return (
        <>
          <path d={SHOULDERS} fill="#8a6a44" stroke="#5a4226" strokeWidth="4" strokeLinejoin="round" />
          <path d="M86 150 L74 224 M114 150 L126 224" stroke="#5a4226" strokeWidth="3" />
          <path d="M88 150 L100 176 L112 150 Z" fill="#efe7d6" stroke="#cbbfa4" strokeWidth="2" />
          <path d="M97 158 L103 158 L106 196 L100 204 L94 196 Z" fill="#3a2f26" stroke="#241c16" strokeWidth="2" strokeLinejoin="round" />
        </>
      );
    case 9: // Hacker: hoodie negro con cordones + código
      return (
        <>
          <path d={SHOULDERS} fill="#16171c" stroke="#08080a" strokeWidth="4" strokeLinejoin="round" />
          <path d="M86 150 L70 224 M114 150 L130 224" stroke="#08080a" strokeWidth="3" />
          <path d="M96 150 L94 178 M104 150 L106 178" stroke="#cfcfcf" strokeWidth="3" strokeLinecap="round" />
          <text x="100" y="210" textAnchor="middle" fontFamily="monospace" fontWeight="700" fontSize="22" fill="#39d353">{'</>'}</text>
        </>
      );
    case 10: // Deportista: camiseta verde con número 10
      return (
        <>
          <path d={SHOULDERS} fill="#2f8a3e" stroke="#1c5a28" strokeWidth="4" strokeLinejoin="round" />
          <path d="M82 150 q18 14 36 0 l-5 10 q-13 9 -26 0 Z" fill="#e9e9e9" stroke="#bdbdbd" strokeWidth="2" strokeLinejoin="round" />
          <text x="100" y="208" textAnchor="middle" fontFamily="sans-serif" fontWeight="800" fontSize="30" fill="#e9e9e9">10</text>
        </>
      );
    case 11: // Punk: poncho rojo ancho y redondeado (personaje nuevo por defecto)
      return (
        <>
          <path d="M16 224 C16 168 52 140 100 140 C148 140 184 168 184 224 Z" fill="#a23a2c" stroke="#6f231c" strokeWidth="4" strokeLinejoin="round" />
          <path d="M30 206 Q100 190 170 206" fill="none" stroke="#6f231c" strokeWidth="3" opacity="0.5" />
        </>
      );
    default:
      return null; // 0 = capucha simple (hombros base)
  }
}

// ── Gorro / casco (se dibuja sobre la cabeza) ───────────────────────────────
function Hat({ idx, hoodColor, hoodDark }) {
  switch (idx) {
    case 1: // Corona
      return (
        <g fill="#d7af3c" stroke="#9c7d20" strokeWidth="3" strokeLinejoin="round">
          <path d="M66 56 L77 28 L89 50 L100 24 L111 50 L123 28 L134 56 C112 47 88 47 66 56 Z" />
          <circle cx="77" cy="28" r="3.5" fill="#f0d169" /><circle cx="100" cy="24" r="4" fill="#f0d169" /><circle cx="123" cy="28" r="3.5" fill="#f0d169" />
        </g>
      );
    case 2: // Sombrero de mago (cono inclinado + hebilla)
      return (
        <g stroke="#1f2c40" strokeWidth="3.5" strokeLinejoin="round">
          <ellipse cx="100" cy="58" rx="52" ry="10" fill="#2f3e57" />
          <path d="M74 58 Q86 2 150 16 Q116 40 126 58 Q100 52 74 58 Z" fill="#34465f" />
          <rect x="80" y="50" width="40" height="9" rx="2" fill="#1f2c40" />
          <rect x="95" y="48" width="11" height="11" rx="2" fill="#d7b24a" stroke="#9c7d20" strokeWidth="2" />
        </g>
      );
    case 3: // Sombrero vaquero
      return (
        <g fill="#6e4a2b" stroke="#4a2f18" strokeWidth="3.5" strokeLinejoin="round">
          <ellipse cx="100" cy="56" rx="58" ry="12" />
          <path d="M74 56 Q72 24 100 22 Q128 24 126 56 Q100 48 74 56 Z" />
          <path d="M74 50 Q100 56 126 50" fill="none" stroke="#3a2412" strokeWidth="3" />
        </g>
      );
    case 4: // Sombrero pirata (bicornio + calavera)
      return (
        <g stroke="#0d0d10" strokeWidth="3.5" strokeLinejoin="round">
          <path d="M56 54 Q100 18 144 54 Q150 40 100 34 Q50 40 56 54 Z" fill="#1c1d22" />
          <circle cx="100" cy="44" r="7" fill="#efe7d6" />
          <circle cx="97" cy="43" r="1.4" fill="#1c1d22" /><circle cx="103" cy="43" r="1.4" fill="#1c1d22" />
          <path d="M94 50 L106 50" stroke="#efe7d6" strokeWidth="3" />
        </g>
      );
    case 5: // Casco de caballero
      return (
        <g fill="#b3bac1" stroke="#5d646b" strokeWidth="3.5" strokeLinejoin="round">
          <path d="M62 96 C58 44 142 44 138 96 L132 96 C134 56 66 56 68 96 Z" />
          <rect x="74" y="84" width="52" height="7" rx="2" fill="#2b2f33" stroke="none" />
          <rect x="74" y="98" width="52" height="7" rx="2" fill="#2b2f33" stroke="none" />
          <path d="M98 50 q2 -16 4 0" fill="#c0392b" stroke="#8f271d" strokeWidth="2" />
        </g>
      );
    case 6: // Gorro de detective (deerstalker)
      return (
        <g fill="#8a6a44" stroke="#5a4226" strokeWidth="3.5" strokeLinejoin="round">
          <ellipse cx="100" cy="58" rx="50" ry="9" />
          <path d="M66 58 Q66 30 100 28 Q134 30 134 58 Q100 50 66 58 Z" />
          <circle cx="66" cy="52" r="9" /><circle cx="134" cy="52" r="9" />
        </g>
      );
    case 7: // Capucha hoodie (oscura, levantada)
      return (
        <path d="M40 100 C34 30 96 14 100 14 C104 14 166 30 160 100 C160 116 150 104 138 92 C140 56 60 56 62 92 C50 104 40 116 40 100 Z" fill="#16171c" stroke="#08080a" strokeWidth="4" strokeLinejoin="round" />
      );
    case 8: // Vincha (cinta deportiva)
      return (
        <g>
          <path d="M64 64 Q100 54 136 64 L136 74 Q100 64 64 74 Z" fill="#efe7d6" stroke="#cbbfa4" strokeWidth="2.5" />
          <rect x="92" y="60" width="16" height="10" fill="#c0392b" />
        </g>
      );
    case 9: // Capucha de monje (marrón, más cerrada)
      return (
        <path d="M44 102 C40 34 96 18 100 18 C104 18 160 34 156 102 C156 120 140 108 130 96 C132 58 68 58 70 96 C60 108 44 120 44 102 Z" fill="#5b4226" stroke="#3a2916" strokeWidth="4" strokeLinejoin="round" />
      );
    case 10: // Cinta de ninja (banda negra en la frente con nudo)
      return (
        <g fill="#1c1d22" stroke="#0d0d10" strokeWidth="2.5">
          <path d="M64 74 Q100 64 136 74 L136 84 Q100 74 64 84 Z" />
          <path d="M136 76 l16 -6 -2 10 12 2 -14 8 -2 -8 Z" />
        </g>
      );
    case 11: // Mohawk: cresta de púas negras sobre cabeza calva
      return (
        <g stroke={INK} strokeWidth="7" strokeLinecap="round">
          <path d="M64 62 L46 40" />
          <path d="M74 54 L62 28" />
          <path d="M85 49 L78 20" />
          <path d="M96 46 L94 14" />
          <path d="M107 46 L110 14" />
          <path d="M118 49 L126 20" />
          <path d="M129 55 L140 28" />
          <path d="M138 63 L154 42" />
        </g>
      );
    default:
      return null;
  }
}

// ── Accesorios (sobre la cara/cuello) ───────────────────────────────────────
function Accessory({ idx }) {
  switch (idx) {
    case 1: // Lentes de sol
      return (
        <g fill="#15171a" stroke="#000" strokeWidth="2">
          <rect x="74" y="92" width="22" height="14" rx="4" />
          <rect x="104" y="92" width="22" height="14" rx="4" />
          <path d="M96 96 L104 96" stroke="#15171a" strokeWidth="3" />
        </g>
      );
    case 2: // Parche en el ojo
      return (
        <g>
          <path d="M70 90 Q100 80 132 92" fill="none" stroke="#1a1a1a" strokeWidth="2.5" />
          <ellipse cx="113" cy="99" rx="9" ry="11" fill="#1a1a1a" stroke="#000" strokeWidth="2" />
        </g>
      );
    case 3: // Pipa
      return (
        <g stroke="#3a2916" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M108 122 L128 124" fill="none" strokeWidth="4" stroke="#5a4226" strokeLinecap="round" />
          <path d="M126 120 q10 0 9 12 l-9 0 q-4 -6 0 -12 Z" fill="#3a2916" />
          <path d="M133 116 q4 -6 9 -3" fill="none" stroke="#cfcfcf" strokeWidth="2" opacity="0.6" />
        </g>
      );
    case 4: // Pañuelo cubriendo la boca/nariz
      return (
        <path d="M66 104 Q100 116 134 104 L132 124 Q100 140 68 124 Z" fill="#b23b2e" stroke="#7f2820" strokeWidth="2.5" strokeLinejoin="round" />
      );
    case 5: // Katana al hombro (mango asomando)
      return (
        <g strokeLinejoin="round">
          <path d="M150 150 L120 96" stroke="#7a6a4a" strokeWidth="5" strokeLinecap="round" />
          <path d="M122 100 L108 86" stroke="#2b2b2b" strokeWidth="6" strokeLinecap="round" />
          <rect x="118" y="88" width="14" height="6" rx="2" transform="rotate(40 125 91)" fill="#d7b24a" stroke="#9c7d20" strokeWidth="1.5" />
        </g>
      );
    default:
      return null;
  }
}

/**
 * Personaje encapuchado modular.
 * @param hood   color de capucha base (0..5). `variant` es alias.
 * @param face   expresión (0..2).
 * @param thinking  true = expresión de turno.
 * @param body   torso/cuerpo (0..N). 0 = capucha simple.
 * @param hat    gorro/casco (0..N). 0 = ninguno.
 * @param acc    accesorio (0..N). 0 = ninguno.
 */
export default function Character({ hood, variant = 0, face = 0, thinking = false, body = 0, hat = 0, acc = 0, size = 120 }) {
  const hi = ((hood == null ? variant : hood) % HOOD_COUNT + HOOD_COUNT) % HOOD_COUNT;
  const v = HOODS[hi];
  const fi = ((face % FACE_COUNT) + FACE_COUNT) % FACE_COUNT;
  const bi = ((body % BODY_COUNT) + BODY_COUNT) % BODY_COUNT;
  const hatI = ((hat % HAT_COUNT) + HAT_COUNT) % HAT_COUNT;
  const accI = ((acc % ACC_COUNT) + ACC_COUNT) % ACC_COUNT;
  const uid = useId().replace(/:/g, '');
  const sclip = `sh-${uid}`;

  // Cabeza descubierta (sin capucha): para el Mohawk, el Punk y el personaje
  // que antes era el default (capucha simple sin gorro) — se le quitó la capucha.
  const bareHead = hatI === MOHAWK_HAT || bi === PUNK_BODY || (bi === 0 && hatI === 0);

  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 200 224" style={{ overflow: 'visible' }}>
      <defs><clipPath id={sclip}><path d={SHOULDERS} /></clipPath></defs>

      {/* Hombros base (color de capucha) */}
      <path d={SHOULDERS} fill={v.hood} stroke={v.dark} strokeWidth="4" strokeLinejoin="round" />
      {/* Cuerpo / disfraz */}
      <Body idx={bi} hoodColor={v.hood} hoodDark={v.dark} clip={sclip} />

      {bareHead ? (
        <>
          {/* Cabeza calva con orejas */}
          <ellipse cx="61" cy="98" rx="8" ry="11" fill={SKIN} stroke={SKIN_D} strokeWidth="3" />
          <ellipse cx="139" cy="98" rx="8" ry="11" fill={SKIN} stroke={SKIN_D} strokeWidth="3" />
          <ellipse cx="100" cy="92" rx="39" ry="46" fill={SKIN} stroke={SKIN_D} strokeWidth="3" />
          <path d="M68 64 Q100 48 132 64" fill="none" stroke={SKIN_D} strokeWidth="2" opacity="0.45" />
        </>
      ) : (
        <>
          {/* Capucha de la cabeza */}
          <path d="M42 98 C38 34 92 18 100 18 C108 18 162 34 158 98 C158 132 132 152 100 152 C68 152 42 132 42 98 Z" fill={v.hood} stroke={v.dark} strokeWidth="4" strokeLinejoin="round" />

          {/* Cara */}
          <ellipse cx="100" cy="94" rx="35" ry="41" fill={SKIN} stroke={SKIN_D} strokeWidth="3" />
          {/* Sombra del borde de la capucha sobre la frente */}
          <path d="M63 70 C68 40 132 40 137 70 C138 58 122 50 100 50 C78 50 62 58 63 70 Z" fill={v.hood} stroke={v.dark} strokeWidth="3.5" strokeLinejoin="round" />
        </>
      )}

      {/* Expresión */}
      <Face idx={fi} />

      {/* Gorro/casco encima de la cabeza */}
      <Hat idx={hatI} hoodColor={v.hood} hoodDark={v.dark} />
      {/* Accesorio sobre la cara */}
      <Accessory idx={accI} />
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
