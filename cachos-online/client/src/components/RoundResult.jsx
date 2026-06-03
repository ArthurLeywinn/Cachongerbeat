import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import { formatBid, FACE_NAMES_PLURAL } from '../lib/rules.js';

// Banner que resume la resolución de la ronda durante la fase de reveal:
// Dudar, Calzar o Kamikaze.
export default function RoundResult() {
  const { state } = useGame();
  if (state.phase !== 'reveal' || !state.lastResult) return null;

  const r = state.lastResult;
  const nameOf = (id) => state.players.find((p) => p.id === id)?.name || '—';

  // ── Kamikaze ──
  if (r.type === 'kamikaze') {
    const total = (r.losses || []).reduce((s, l) => s + l.lost, 0);
    return (
      <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4 pointer-events-none">
        <div className="glass rounded-2xl px-6 py-4 shadow-cup animate-pop text-center max-w-lg border border-red-400/30">
          <p className="text-sm text-bone/50 mb-1">
            Kamikaze de <span className="text-amber-glow">{nameOf(r.obligadoId)}</span> ·{' '}
            declaró <span className="text-amber-glow">{FACE_NAMES_PLURAL[r.declaredFace]}</span>
          </p>
          {total === 0 ? (
            <p className="font-display text-lg font-bold">Nadie sacó la pinta. Sin bajas.</p>
          ) : (
            <p className="font-display text-lg font-bold leading-snug">
              {(r.losses || []).map((l, i) => (
                <span key={l.id}>
                  {i > 0 && ' · '}
                  <span className="text-red-400">{nameOf(l.id)}</span> −{l.lost}
                </span>
              ))}
            </p>
          )}
          <p className="text-xs text-bone/40 mt-2">Nueva ronda en breve…</p>
        </div>
      </div>
    );
  }

  // ── Apuesta (dudar / calzar) ──
  const bidLabel = r.bid?.esta
    ? `${r.bid.quantity} de esta (${FACE_NAMES_PLURAL[r.bid.face]})`
    : formatBid(r.bid);

  let headline;
  if (r.type === 'doubt') {
    headline = (
      <>
        <span className="text-amber-glow">{nameOf(r.challengerId)}</span> dudó · había{' '}
        <span className="text-amber-glow">{r.actual}</span> · pierde un dado{' '}
        <span className="text-red-400">{nameOf(r.loserId)}</span>
      </>
    );
  } else {
    headline = r.gainerId ? (
      <>
        <span className="text-emerald-300">{nameOf(r.challengerId)}</span> calzó exacto · había{' '}
        <span className="text-amber-glow">{r.actual}</span> · ¡gana un dado!
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
        <p className="text-sm text-bone/50 mb-1">Apuesta: {bidLabel}</p>
        <p className="font-display text-lg font-bold leading-snug">{headline}</p>
        <p className="text-xs text-bone/40 mt-2">Nueva ronda en breve…</p>
      </div>
    </div>
  );
}
