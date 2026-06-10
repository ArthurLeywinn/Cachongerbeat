import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import Character from './Character.jsx';
import Die from './Die.jsx';

// Pantalla de fin de partida: ganador destacado, posiciones finales y,
// si la partida es ranked, el delta de ELO de cada jugador.
export default function GameOver() {
  const { state, playerId, leave } = useGame();
  if (!state || state.status !== 'finished') return null;

  const standings = state.finalStandings || [];
  const winner = standings.find((s) => s.isWinner) || standings[0] || null;
  const ranked = !!state.ranked;
  // En ranked, los deltas llegan un instante después (cálculo en servidor).
  const deltasPending = ranked && standings.length > 0 && standings.every((s) => s.eloDelta == null);

  const deltaBadge = (d) => {
    if (d == null) return <span className="text-bone/30 text-xs">…</span>;
    const pos = d >= 0;
    return (
      <span className={['font-display font-black text-sm', pos ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
        {pos ? `+${d}` : d}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="glass rounded-3xl p-8 text-center shadow-cup animate-pop w-full max-w-md">
        {/* ── Ganador destacado ── */}
        <div className="flex justify-center gap-2 mb-3">
          <Die value={1} size={36} highlight />
          <Die value={6} size={36} />
          <Die value={1} size={36} highlight />
        </div>
        <p className="text-bone/50 uppercase tracking-widest text-xs mb-3">
          Fin de la partida{ranked && ' · Ranked'}
        </p>

        {winner && (
          <div className="mb-5">
            <div className="inline-block relative">
              <Character
                hood={winner.cosmetic?.hood ?? 0}
                face={9}
                body={winner.cosmetic?.body ?? 0}
                hat={winner.cosmetic?.hat ?? 0}
                acc={winner.cosmetic?.acc ?? 0}
                size={110}
              />
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl">👑</span>
            </div>
            <h2 className="font-display text-3xl font-black text-amber-glow mt-1">
              ¡{winner.name} gana!
            </h2>
          </div>
        )}

        {/* ── Posiciones finales ── */}
        <div className="space-y-2 mb-6 text-left">
          {standings.map((s) => (
            <div
              key={s.id}
              className={[
                'flex items-center justify-between px-4 py-2.5 rounded-xl',
                s.isWinner ? 'bg-amber-glow/15 border border-amber-glow/30' : 'bg-black/25',
              ].join(' ')}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={[
                  'w-7 h-7 rounded-full grid place-items-center font-display font-black text-sm shrink-0',
                  s.place === 1 ? 'bg-amber-glow text-felt-900' : 'bg-white/10 text-bone/60',
                ].join(' ')}>
                  {s.place}
                </span>
                <span className="font-medium truncate">
                  {s.name}
                  {s.id === playerId && <span className="text-bone/40 text-xs"> (tú)</span>}
                </span>
              </div>
              {ranked && (
                <div className="flex items-center gap-2 shrink-0">
                  {deltaBadge(s.eloDelta)}
                  {s.newElo != null && <span className="text-[11px] text-bone/40">→ {s.newElo}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        {deltasPending && (
          <p className="text-[11px] text-bone/40 mb-4">Calculando cambios de ELO…</p>
        )}

        <button
          onClick={leave}
          className="px-6 py-3 rounded-xl bg-amber-glow text-felt-900 font-bold hover:brightness-105 transition w-full"
        >
          Volver al menú principal
        </button>
      </div>
    </div>
  );
}
