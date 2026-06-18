import React, { useMemo } from 'react';

// Movimiento leve PROPIO de cada ambiente: partículas temáticas que se animan
// sobre la imagen de fondo y por debajo de la mesa y el HUD.
//  · espacio  → estrellas titilando + estrellas fugaces
//  · infierno → brasas subiendo + resplandor de lava
//  · jungla   → luciérnagas flotando y parpadeando
//  · cielo    → nubes/vapores a la deriva
//  · oeste    → polvo flotando + parpadeo cálido de faroles
// Cada partícula recibe posición, duración y retraso aleatorios (memorizados por
// ambiente) para que el movimiento se vea orgánico y no sincronizado.

const rand = (min, max) => Math.random() * (max - min) + min;
const px = (n) => `${n.toFixed(1)}px`;
const s = (n) => `${n.toFixed(1)}s`;

export default function RoomAmbience({ room }) {
  const particles = useMemo(() => build(room), [room]);
  if (!particles) return null;
  return (
    <div className={`room-fx room-fx--${room}`} aria-hidden="true">
      {particles}
    </div>
  );
}

function build(room) {
  switch (room) {
    case 'espacio': {
      const stars = Array.from({ length: 48 }, (_, i) => (
        <span key={`st${i}`} className="fx-star" style={{
          left: `${rand(0, 100)}%`, top: `${rand(0, 70)}%`,
          width: px(rand(1, 2.6)), height: px(rand(1, 2.6)),
          '--d': s(rand(2, 5)), '--delay': s(rand(0, 5)),
        }} />
      ));
      const shooting = Array.from({ length: 2 }, (_, i) => (
        <span key={`sh${i}`} className="fx-shoot" style={{
          left: `${rand(8, 55)}%`, top: `${rand(2, 28)}%`,
          '--d': s(rand(8, 13)), '--delay': s(i * 5 + rand(0, 4)),
        }} />
      ));
      return [...stars, ...shooting];
    }
    case 'infierno': {
      const embers = Array.from({ length: 28 }, (_, i) => (
        <span key={`em${i}`} className="fx-ember" style={{
          left: `${rand(0, 100)}%`,
          width: px(rand(2, 4)), height: px(rand(2, 4)),
          '--d': s(rand(5, 9)), '--delay': s(rand(0, 8)), '--dx': px(rand(-22, 22)),
        }} />
      ));
      return [...embers, <span key="lava" className="fx-lava" />];
    }
    case 'jungla': {
      return Array.from({ length: 16 }, (_, i) => (
        <span key={`fy${i}`} className="fx-fly" style={{
          left: `${rand(2, 98)}%`, top: `${rand(8, 78)}%`,
          '--d': s(rand(6, 11)), '--delay': s(rand(0, 6)),
          '--dx': px(rand(-32, 32)), '--dy': px(rand(-34, -8)),
        }} />
      ));
    }
    case 'cielo': {
      return Array.from({ length: 4 }, (_, i) => (
        <span key={`wp${i}`} className="fx-wisp" style={{
          top: `${rand(8, 58)}%`,
          width: px(rand(110, 220)), height: px(rand(34, 64)),
          opacity: rand(0.3, 0.6).toFixed(2),
          '--d': s(rand(38, 64)), '--delay': s(i * 11 + rand(0, 8)),
        }} />
      ));
    }
    case 'oeste': {
      const dust = Array.from({ length: 22 }, (_, i) => (
        <span key={`du${i}`} className="fx-dust" style={{
          left: `${rand(0, 100)}%`,
          '--d': s(rand(9, 16)), '--delay': s(rand(0, 10)), '--dx': px(rand(-16, 16)),
        }} />
      ));
      return [...dust, <span key="flick" className="fx-flicker" />];
    }
    default:
      return null;
  }
}
