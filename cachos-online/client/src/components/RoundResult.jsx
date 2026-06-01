import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import { formatBid } from '../lib/rules.js';

// Banner que resume el resultado de un Dudar / Calzar durante la fase de reveal.
export default function RoundResult() {
  const { state } = useGame();
  if (state.phase !== 'reveal' || !state.lastResult) return null;

  const r = state.lastResult;
  const nameOf = (id) => state.players.find((p) => p.id === id)?.name || '—';

  let headline;
  if (r.type === 'doubt') {
    const loser = nameOf(r.loserId);
    headline = (
      <>
        <span className="text-amber-glow">{nameOf(r.challengerId)}</span> dudó ·{' '}
        había <span className="text-amber-glow">{r.actual}</span> · pierde un dado{' '}
        <span className="text-red-400">{loser}</span>
      </>
    );
  } else {
    headline = r.gainerId ? (
      <>
        <span className="text-emerald-300">{nameOf(r.challengerId)}</span> calzó exacto ·{' '}
        había <span className="text-amber-glow">{r.actual}</span> · ¡gana un dado!
      </>
    ) : (
      <>
        <span className="text-amber-glow">{nameOf(r.challengerId)}</span> calzó · había{' '}
        <span className="text-amber-glow">{r.actual}</span> · falló y pierde un dado
      </>
    );
  }

  return (
    <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4 pointer-events-none">
      <div className="glass rounded-2xl px-6 py-4 shadow-cup animate-pop text-center max-w-lg">
        <p className="text-sm text-bone/50 mb-1">Apuesta: {formatBid(r.bid)}</p>
        <p className="font-display text-lg font-bold leading-snug">{headline}</p>
        <p className="text-xs text-bone/40 mt-2">Nueva ronda en breve…</p>
      </div>
    </div>
  );
}
