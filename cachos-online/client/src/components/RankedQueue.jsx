import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import Die from './Die.jsx';

const SIZES = [2, 3, 4, 5, 6];

// Búsqueda de partida ranked: primero se elige el tamaño de la partida
// (2 a 6 jugadores) y luego se entra a la cola ESPECÍFICA de ese tamaño.
export default function RankedQueue({ onBack }) {
  const { queue, joinQueue, leaveQueue, connected } = useGame();
  const [size, setSize] = useState(4);
  const [searching, setSearching] = useState(false);

  // Si salimos de la pantalla mientras buscamos, abandonar la cola.
  useEffect(() => () => { leaveQueue(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    const res = await joinQueue(size);
    if (res.ok) setSearching(true);
  };

  const cancel = async () => {
    await leaveQueue();
    setSearching(false);
  };

  // ── Paso 1: elegir tamaño de partida ──
  if (!searching) {
    return (
      <div className="clean-bg">
        <div className="clean-card text-center" style={{ maxWidth: 440 }}>
          <button onClick={onBack} className="clean-back mb-2" style={{ alignSelf: 'flex-start' }}>← Volver</button>
          <h2 className="font-display text-2xl font-black text-amber-glow mb-1">
            Buscar partida ranked
          </h2>
          <p className="text-bone/40 text-xs uppercase tracking-widest mb-6">
            ¿De cuántos jugadores quieres la partida?
          </p>

          {/* Cada tamaño es una cola separada */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            {SIZES.map((n) => (
              <button
                key={n}
                onClick={() => setSize(n)}
                className={[
                  'py-4 rounded-xl font-display text-2xl font-black transition border',
                  size === n
                    ? 'bg-amber-glow text-felt-900 border-amber-glow'
                    : 'bg-black/25 text-bone/60 border-bone/15 hover:border-bone/40 hover:text-bone',
                ].join(' ')}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-bone/40 text-xs mb-6">
            Solo emparejas con jugadores que buscan partida de <span className="text-amber-glow font-bold">{size}</span>.
          </p>

          {/* Reglas fijas de ranked */}
          <div className="bg-black/25 rounded-xl px-4 py-3 text-left mb-6">
            <p className="text-[10px] text-bone/40 uppercase tracking-widest mb-2">Reglas fijas de ranked</p>
            <ul className="text-xs text-bone/60 space-y-1">
              <li>🎲 5 dados por jugador</li>
              <li>⏱ 60 segundos por turno</li>
              <li>✋ Pasar: solo con 5 dados, una vez por ronda</li>
              <li>🎯 Calzo: solo con la mitad o más de los dados (impar redondea arriba)</li>
            </ul>
          </div>

          {!connected && <p className="text-red-400 text-xs mb-3">Conectando al servidor…</p>}

          <button
            onClick={start}
            disabled={!connected}
            className="w-full py-3 rounded-xl bg-amber-glow text-felt-900 font-bold hover:brightness-105 transition disabled:opacity-40"
          >
            Buscar partida de {size}
          </button>
        </div>
      </div>
    );
  }

  // ── Paso 2: en cola — muestra cuántos hay en ESA cola ──
  const count = queue.count || 0;
  const qSize = queue.size || size;

  return (
    <div className="clean-bg">
      <div className="clean-card text-center" style={{ maxWidth: 420 }}>
        <h2 className="font-display text-2xl font-black text-amber-glow mb-1">
          Buscando partida de {qSize}
        </h2>
        <p className="text-bone/40 text-xs uppercase tracking-widest mb-6">
          Cola exclusiva de partidas de {qSize} jugadores
        </p>

        <div className="flex justify-center gap-2 mb-4 queue-dice">
          <Die value={1} size={36} /><Die value={3} size={36} /><Die value={5} size={36} />
        </div>

        <p className="font-display text-5xl font-black text-amber-glow leading-none mb-1">
          {count}<span className="text-bone/30 text-2xl">/{qSize}</span>
        </p>
        <p className="text-bone/50 text-sm mb-6">
          {count < qSize
            ? `jugador${count === 1 ? '' : 'es'} en esta cola · falta${qSize - count === 1 ? '' : 'n'} ${qSize - count}`
            : 'formando partida…'}
        </p>

        {!connected && <p className="text-red-400 text-xs mb-3">Conectando al servidor…</p>}

        <button
          onClick={cancel}
          className="w-full py-3 rounded-xl border border-bone/20 text-bone/70 hover:border-bone/40 hover:text-bone font-semibold transition"
        >
          Cancelar búsqueda
        </button>
      </div>
    </div>
  );
}
