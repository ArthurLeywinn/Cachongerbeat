import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext.jsx';
import Die from './Die.jsx';

// Sala de espera del matchmaking ranked: muestra cuántos jugadores hay en
// cola en tiempo real; la partida se forma sola con 3 a 6 jugadores.
export default function RankedQueue({ onBack }) {
  const { queue, joinQueue, leaveQueue, connected } = useGame();

  // Entrar a la cola al montar; salir al desmontar (si seguimos en cola).
  useEffect(() => {
    joinQueue();
    return () => { leaveQueue(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = async () => {
    await leaveQueue();
    onBack();
  };

  const count = queue.count || 0;
  const min = queue.min || 3;
  const max = queue.max || 6;

  return (
    <div className="clean-bg">
      <div className="clean-card text-center" style={{ maxWidth: 420 }}>
        <h2 className="font-display text-2xl font-black text-amber-glow mb-1">
          Buscando partida ranked
        </h2>
        <p className="text-bone/40 text-xs uppercase tracking-widest mb-6">
          La partida comienza con {min} a {max} jugadores
        </p>

        {/* Indicador animado */}
        <div className="flex justify-center gap-2 mb-4 queue-dice">
          <Die value={1} size={36} /><Die value={3} size={36} /><Die value={5} size={36} />
        </div>

        <p className="font-display text-5xl font-black text-amber-glow leading-none mb-1">
          {count}<span className="text-bone/30 text-2xl">/{max}</span>
        </p>
        <p className="text-bone/50 text-sm mb-6">
          {count < min
            ? `jugador${count === 1 ? '' : 'es'} en cola · faltan ${min - count} para empezar`
            : 'jugadores en cola · formando partida…'}
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
          onClick={cancel}
          className="w-full py-3 rounded-xl border border-bone/20 text-bone/70 hover:border-bone/40 hover:text-bone font-semibold transition"
        >
          Cancelar búsqueda
        </button>
      </div>
    </div>
  );
}
