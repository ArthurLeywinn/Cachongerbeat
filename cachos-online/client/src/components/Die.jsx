import React from 'react';

// Posiciones de los puntos para cada valor (en una grilla 3x3).
const PIPS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

/**
 * Dado individual.
 * @param value  1..6, o null si está oculto.
 * @param size   tamaño en px.
 * @param highlight  resalta el dado (coincide con la apuesta).
 * @param rolling  aplica animación de tirada.
 */
export default function Die({ value = null, size = 44, highlight = false, rolling = false }) {
  const hidden = value == null;
  const isAce = value === 1;
  const cell = size / 3;

  return (
    <div
      className={[
        'relative rounded-[22%] grid place-items-center select-none shadow-die transition',
        rolling ? 'animate-roll' : '',
        hidden
          ? 'bg-felt-700 border border-felt-600'
          : 'bg-bone',
        highlight ? 'ring-2 ring-amber-glow scale-105' : '',
      ].join(' ')}
      style={{ width: size, height: size }}
      title={hidden ? 'Oculto' : `Valor ${value}`}
    >
      {hidden ? (
        <span className="text-amber-glow/60 font-display font-bold" style={{ fontSize: size * 0.5 }}>
          ?
        </span>
      ) : (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {PIPS[value].map(([r, c], i) => (
            <circle
              key={i}
              cx={c * cell + cell / 2}
              cy={r * cell + cell / 2}
              r={size * 0.085}
              fill={isAce ? '#d97706' : '#143a2a'}
            />
          ))}
          {isAce && (
            <text
              x="50%"
              y={size - size * 0.08}
              textAnchor="middle"
              fontSize={size * 0.18}
              fill="#d97706"
              fontWeight="700"
            >
              ★
            </text>
          )}
        </svg>
      )}
    </div>
  );
}
