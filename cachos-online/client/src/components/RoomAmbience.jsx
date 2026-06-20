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
      const stars = Array.from({ length: 70 }, (_, i) => (
        <span key={`st${i}`} className="fx-star" style={{
          left: `${rand(0, 100)}%`, top: `${rand(0, 74)}%`,
          width: px(rand(1, 3.2)), height: px(rand(1, 3.2)),
          '--d': s(rand(1.5, 4)), '--delay': s(rand(0, 4)),
        }} />
      ));
      const shooting = Array.from({ length: 4 }, (_, i) => (
        <span key={`sh${i}`} className="fx-shoot" style={{
          left: `${rand(6, 58)}%`, top: `${rand(2, 30)}%`,
          '--d': s(rand(6, 11)), '--delay': s(i * 3 + rand(0, 3)),
        }} />
      ));
      return [...stars, ...shooting];
    }
    case 'infierno': {
      const embers = Array.from({ length: 52 }, (_, i) => (
        <span key={`em${i}`} className="fx-ember" style={{
          left: `${rand(0, 100)}%`,
          width: px(rand(2.5, 5)), height: px(rand(2.5, 5)),
          '--d': s(rand(4, 7)), '--delay': s(rand(0, 6)), '--dx': px(rand(-30, 30)),
        }} />
      ));
      return [...embers, <span key="lava" className="fx-lava" />];
    }
    case 'jungla': {
      return Array.from({ length: 30 }, (_, i) => (
        <span key={`fy${i}`} className="fx-fly" style={{
          left: `${rand(2, 98)}%`, top: `${rand(6, 80)}%`,
          '--d': s(rand(5, 10)), '--delay': s(rand(0, 5)),
          '--dx': px(rand(-46, 46)), '--dy': px(rand(-50, -10)),
        }} />
      ));
    }
    case 'cielo': {
      const wisps = Array.from({ length: 6 }, (_, i) => (
        <span key={`wp${i}`} className="fx-wisp" style={{
          top: `${rand(6, 60)}%`,
          width: px(rand(120, 240)), height: px(rand(38, 70)),
          opacity: rand(0.4, 0.75).toFixed(2),
          '--d': s(rand(30, 54)), '--delay': s(i * 7 + rand(0, 6)),
        }} />
      ));
      const leaves = Array.from({ length: 14 }, (_, i) => (
        <span key={`lf${i}`} className="fx-leaf" style={{
          left: `${rand(0, 100)}%`,
          '--d': s(rand(9, 16)), '--delay': s(rand(0, 12)), '--dx': px(rand(-40, 40)),
        }} />
      ));
      return [...wisps, ...leaves];
    }
    case 'oeste': {
      const dust = Array.from({ length: 40 }, (_, i) => (
        <span key={`du${i}`} className="fx-dust" style={{
          left: `${rand(0, 100)}%`,
          '--d': s(rand(8, 15)), '--delay': s(rand(0, 9)), '--dx': px(rand(-18, 18)),
        }} />
      ));
      return [...dust, <span key="flick" className="fx-flicker" />];
    }
    default:
      return null;
  }
}
