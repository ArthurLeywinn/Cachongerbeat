import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { FACE_NAMES, FACE_NAMES_PLURAL, validateRaise, suggestNextBid } from '../lib/rules.js';
import Die from './Die.jsx';

export default function BidPanel() {
  const { state, playerId, bid, doubt, calzar } = useGame();
  const myTurn = state.currentTurnId === playerId;
  const prev = state.currentBid;

  const [quantity, setQuantity] = useState(1);
  const [face, setFace] = useState(2);

  // Cada vez que cambia la apuesta previa, sugiere una válida.
  useEffect(() => {
    const s = suggestNextBid(prev);
    setQuantity(s.quantity);
    setFace(s.face);
  }, [prev?.quantity, prev?.face]);

  const check = validateRaise(prev, { quantity, face });

  if (!myTurn) {
    return (
      <div className="glass rounded-2xl p-5 text-center">
        <p className="text-bone/60">
          Turno de{' '}
          <span className="text-amber-glow font-semibold">
            {state.players.find((p) => p.id === state.currentTurnId)?.name || '…'}
          </span>
        </p>
        {prev && (
          <p className="text-sm text-bone/40 mt-1">
            Apuesta actual: {prev.quantity} {FACE_NAMES_PLURAL[prev.face]}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wide text-bone/50 mb-3 text-center">Tu turno</p>

      {/* Selector de cantidad */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="w-10 h-10 rounded-full bg-black/30 text-2xl hover:bg-black/50 transition"
        >
          −
        </button>
        <div className="text-center min-w-[3rem]">
          <div className="font-display text-4xl font-black text-amber-glow">{quantity}</div>
          <div className="text-xs text-bone/40">cantidad</div>
        </div>
        <button
          onClick={() => setQuantity((q) => q + 1)}
          className="w-10 h-10 rounded-full bg-black/30 text-2xl hover:bg-black/50 transition"
        >
          +
        </button>
      </div>

      {/* Selector de pinta */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6].map((f) => (
          <button
            key={f}
            onClick={() => setFace(f)}
            className={[
              'flex flex-col items-center gap-1 p-2 rounded-xl transition',
              face === f ? 'bg-amber-glow/20 ring-2 ring-amber-glow' : 'bg-black/20 hover:bg-black/30',
            ].join(' ')}
            title={FACE_NAMES[f]}
          >
            <Die value={f} size={30} />
            <span className="text-[10px] text-bone/50 leading-none">{FACE_NAMES[f]}</span>
          </button>
        ))}
      </div>

      {!check.ok && <p className="text-center text-xs text-red-400 mb-2">{check.reason}</p>}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => bid(quantity, face)}
          disabled={!check.ok}
          className="py-3 rounded-xl bg-amber-glow text-felt-900 font-bold hover:brightness-105 transition disabled:opacity-40"
        >
          Apostar
        </button>
        <button
          onClick={doubt}
          disabled={!prev}
          className="py-3 rounded-xl bg-red-500/90 text-white font-bold hover:brightness-110 transition disabled:opacity-30"
        >
          Dudar
        </button>
        <button
          onClick={calzar}
          disabled={!prev || !state.canCalzarNow}
          className="py-3 rounded-xl bg-emerald-500/90 text-white font-bold hover:brightness-110 transition disabled:opacity-30"
          title={state.canCalzarNow ? 'Calzar exacto' : 'Solo con mitad de dados o teniendo 1 dado'}
        >
          Calzar
        </button>
      </div>
    </div>
  );
}
