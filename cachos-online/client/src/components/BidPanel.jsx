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

  useEffect(() => {
    const s = suggestNextBid(prev);
    setQuantity(s.quantity);
    setFace(s.face);
  }, [prev?.quantity, prev?.face]);

  const check = validateRaise(prev, { quantity, face });

  // ── No es mi turno ──
  if (!myTurn) {
    return (
      <div className="hud-waiting">
        <p className="text-bone/50 text-sm">
          Turno de{' '}
          <span className="text-amber-glow font-semibold">
            {state.players.find((p) => p.id === state.currentTurnId)?.name || '…'}
          </span>
        </p>
      </div>
    );
  }

  // ── Mi turno ──
  return (
    <div className="hud-panel">
      {/* Fila principal: cantidad + pinta + botones */}
      <div className="hud-row">

        {/* Selector de cantidad */}
        <div className="hud-qty">
          <button
            className="hud-btn-circle"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <div className="hud-qty__value">
            <span className="font-display text-3xl font-black text-amber-glow leading-none">{quantity}</span>
            <span className="text-[10px] text-bone/30 uppercase tracking-widest">cant.</span>
          </div>
          <button
            className="hud-btn-circle"
            onClick={() => setQuantity((q) => q + 1)}
          >
            +
          </button>
        </div>

        <div className="hud-divider" />

        {/* Selector de pinta */}
        <div className="hud-faces">
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <button
              key={f}
              onClick={() => setFace(f)}
              title={FACE_NAMES[f]}
              className={['hud-face-btn', face === f ? 'hud-face-btn--active' : ''].join(' ')}
            >
              <Die value={f} size={32} />
            </button>
          ))}
        </div>

        <div className="hud-divider" />

        {/* Botones de acción */}
        <div className="hud-actions">
          <button
            onClick={() => bid(quantity, face)}
            disabled={!check.ok}
            className="hud-action hud-action--bid"
            title={!check.ok ? check.reason : 'Apostar'}
          >
            Apostar
          </button>
          <button
            onClick={doubt}
            disabled={!prev}
            className="hud-action hud-action--doubt"
          >
            Dudar
          </button>
          <button
            onClick={calzar}
            disabled={!prev || !state.canCalzarNow}
            className="hud-action hud-action--calzar"
            title={state.canCalzarNow ? 'Calzar exacto' : 'Solo con mitad de dados o teniendo 1 dado'}
          >
            Calzar
          </button>
        </div>
      </div>

      {/* Error de validación */}
      {!check.ok && (
        <p className="text-center text-[11px] text-red-400/80 mt-2">{check.reason}</p>
      )}
    </div>
  );
}
