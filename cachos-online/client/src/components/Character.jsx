import React from 'react';

// =============================================================================
// Character.jsx — Avatar tipo "doodle" dibujado en SVG (trazo a mano).
// Inspirado en la composición de personajes sentados a la mesa. Cada jugador
// recibe una variante distinta (peinado / gorra) de forma determinista según
// su id, en la paleta verde del juego.
// =============================================================================

// Trazo color hueso para que resalte sobre el fieltro verde.
const STROKE = '#f3ecdf';
const STROKE_SOFT = 'rgba(243,236,223,0.85)';

// Estilo de trazo "a mano": redondeado y un poco irregular.
const handStroke = {
  fill: 'none',
  stroke: STROKE,
  strokeWidth: 4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// Variantes de cabello/sombrero (4, una por jugador típico).
function Hair({ variant }) {
  switch (variant) {
    case 0: // pelo puntudo
      return (
        <path
          d="M58 56 C54 30 78 18 100 20 C122 18 146 30 142 56 C150 40 138 30 130 34 C140 22 120 16 116 26 C118 12 96 12 96 26 C92 14 74 18 80 32 C66 28 56 42 58 56 Z"
          fill="rgba(243,236,223,0.12)"
          stroke={STROKE}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      );
    case 1: // pelo liso con flequillo
      return (
        <path
          d="M56 58 C52 28 76 16 100 16 C124 16 148 28 144 58 C140 44 132 40 124 42 C120 34 110 34 108 42 C104 34 94 34 92 42 C84 38 76 42 76 50 C70 44 60 48 56 58 Z"
          fill="rgba(243,236,223,0.12)"
          stroke={STROKE}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      );
    case 2: // gorra
      return (
        <g fill="rgba(243,236,223,0.12)" stroke={STROKE} strokeWidth={3.5} strokeLinejoin="round">
          <path d="M54 52 C54 26 80 18 100 18 C124 18 148 30 146 52 Z" />
          <path d="M146 52 C162 50 172 54 170 60 C150 60 146 56 146 52 Z" />
        </g>
      );
    default: // pelo corto ondulado
      return (
        <path
          d="M58 56 C54 30 78 18 100 18 C122 18 146 30 142 56 C146 46 138 42 132 46 C134 38 122 36 120 44 C118 36 108 36 108 44 C106 36 94 36 94 44 C90 38 80 40 82 48 C74 42 62 46 58 56 Z"
          fill="rgba(243,236,223,0.12)"
          stroke={STROKE}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      );
  }
}

/**
 * Personaje sentado.
 * @param variant 0..3 (peinado)
 * @param speaking resalta (turno activo)
 * @param size ancho en px
 */
export default function Character({ variant = 0, speaking = false, size = 120 }) {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 200 230"
      style={{ overflow: 'visible' }}
    >
      {/* Hombros / cuerpo */}
      <path
        d="M40 230 C40 180 60 158 100 158 C140 158 160 180 160 230"
        fill="rgba(243,236,223,0.06)"
        stroke={STROKE_SOFT}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* Cuello */}
      <path d="M86 150 L86 168 M114 150 L114 168" {...handStroke} />

      {/* Cabeza */}
      <ellipse
        cx="100"
        cy="100"
        rx="46"
        ry="50"
        fill="rgba(243,236,223,0.06)"
        stroke={STROKE}
        strokeWidth={4}
      />

      {/* Pelo / gorra */}
      <Hair variant={variant} />

      {/* Ojos */}
      <ellipse cx="86" cy="98" rx="6.5" ry="9" fill={STROKE} />
      <ellipse cx="114" cy="98" rx="6.5" ry="9" fill={STROKE} />

      {/* Boca: sonríe si está hablando/turno */}
      {speaking ? (
        <path d="M86 122 Q100 134 114 122" {...handStroke} strokeWidth={3.5} />
      ) : (
        <path d="M88 124 L112 124" {...handStroke} strokeWidth={3.5} />
      )}
    </svg>
  );
}

/**
 * Vaso / cacho dibujado a mano (frente al jugador).
 */
export function Cup({ size = 54 }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 60 72" style={{ overflow: 'visible' }}>
      {/* Cuerpo del vaso (trapecio) */}
      <path
        d="M12 8 L48 8 L43 64 L17 64 Z"
        fill="rgba(20,58,42,0.6)"
        stroke={STROKE}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      {/* Borde superior */}
      <ellipse cx="30" cy="8" rx="18" ry="4.5" fill="rgba(12,31,23,0.8)" stroke={STROKE} strokeWidth={3} />
      {/* Sombra bajo el vaso */}
      <ellipse cx="30" cy="68" rx="16" ry="3" fill="rgba(0,0,0,0.25)" stroke="none" />
    </svg>
  );
}
