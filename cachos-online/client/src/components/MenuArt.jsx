import React from 'react';

// Posiciones de pintas (col,row en -1..1) para dibujar dados.
const PIPS = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

// Un dado dibujado (centro en x,y).
function Die({ x, y, v = 5, size = 20, rot = 0 }) {
  const s = size;
  const off = s * 0.28;
  const r = s * 0.085;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.22} fill="#f3ecdf" stroke="#cbbfa4" strokeWidth="1" />
      {PIPS[v].map(([c, rr], i) => (
        <circle key={i} cx={c * off} cy={rr * off} r={r} fill={v === 1 ? '#d97706' : '#16382a'} />
      ))}
    </g>
  );
}

// Cacho (vaso de cuero) volcado de lado con dados saliendo. Para sobre el título.
export function CupMark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 150 92" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Cuerpo del cacho, recostado, abertura a la derecha */}
      <path d="M20 35 L78 22 L78 64 L20 51 Z" fill="rgba(243,236,223,0.07)" stroke="#e9dcc0" strokeWidth="3" strokeLinejoin="round" />
      {/* Costura */}
      <path d="M28 35 L74 25" stroke="rgba(233,220,192,0.45)" strokeWidth="1.5" strokeDasharray="3 4" />
      {/* Abertura */}
      <ellipse cx="78" cy="43" rx="7" ry="21" fill="#0c1710" stroke="#e9dcc0" strokeWidth="3" />
      {/* Extremo cerrado */}
      <ellipse cx="20" cy="43" rx="3.2" ry="8" fill="none" stroke="rgba(233,220,192,0.5)" strokeWidth="2" />
      {/* Dados saliendo */}
      <Die x={97} y={28} v={2} size={17} rot={-18} />
      <Die x={114} y={44} v={5} size={18} rot={12} />
      <Die x={101} y={60} v={1} size={16} rot={26} />
    </svg>
  );
}

// Escena lateral (estilo "tablero" de chess): mesa de fieltro con cachos y dados.
export function HeroScene({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="felt" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#1c3a28" />
          <stop offset="70%" stopColor="#143027" />
          <stop offset="100%" stopColor="#0d2019" />
        </radialGradient>
      </defs>
      {/* Panel/mesa */}
      <rect x="6" y="6" width="508" height="408" rx="26" fill="url(#felt)" stroke="rgba(243,236,223,0.10)" strokeWidth="2" />
      {/* Aro de la mesa */}
      <ellipse cx="260" cy="210" rx="226" ry="176" fill="none" stroke="rgba(243,236,223,0.08)" strokeWidth="3" />
      <ellipse cx="260" cy="210" rx="200" ry="152" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="10" />

      {/* Cacho parado (izquierda) */}
      <g transform="translate(120 150)">
        <path d="M-34 -44 L34 -44 L26 56 L-26 56 Z" fill="rgba(12,23,16,0.85)" stroke="#e9dcc0" strokeWidth="3.5" strokeLinejoin="round" />
        <ellipse cx="0" cy="-44" rx="34" ry="11" fill="#0c1710" stroke="#e9dcc0" strokeWidth="3.5" />
        <ellipse cx="0" cy="-44" rx="27" ry="8" fill="none" stroke="rgba(233,220,192,0.4)" strokeWidth="1.5" strokeDasharray="4 5" />
      </g>

      {/* Cacho volcado (derecha) con dados saliendo */}
      <g transform="translate(330 250) rotate(8)">
        <path d="M-30 -30 L40 -42 L40 42 L-30 30 Z" fill="rgba(12,23,16,0.85)" stroke="#e9dcc0" strokeWidth="3.5" strokeLinejoin="round" />
        <ellipse cx="40" cy="0" rx="11" ry="42" fill="#0c1710" stroke="#e9dcc0" strokeWidth="3.5" />
        <path d="M-22 -28 L34 -38" stroke="rgba(233,220,192,0.4)" strokeWidth="1.5" strokeDasharray="4 5" />
      </g>

      {/* Dados sobre la mesa */}
      <Die x={250} y={150} v={3} size={40} rot={-12} />
      <Die x={300} y={130} v={6} size={36} rot={10} />
      <Die x={395} y={235} v={2} size={34} rot={-20} />
      <Die x={420} y={285} v={5} size={32} rot={16} />
      <Die x={372} y={300} v={1} size={34} rot={4} />
      <Die x={195} y={300} v={4} size={36} rot={-8} />
      <Die x={245} y={325} v={1} size={32} rot={22} />
    </svg>
  );
}
