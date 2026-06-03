import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { FACE_NAMES, validateRaise, suggestNextBid } from '../lib/rules.js';
import Die from './Die.jsx';

export default function BidPanel() {
  const { state, playerId, bid, doubt, calzar } = useGame();
  const myTurn = state.currentTurnId === playerId;
  const prev = state.currentBid;
  const mode = state.obliga?.mode;
  const isEsta = mode === 'cerradoA'; // Obliga "de esta": pinta oculta y bloqueada

  const [quantity, setQuantity] = useState(1);
  const [face, setFace] = useState(2);

  useEffect(() => {
    if (isEsta) {
      // En "de esta" solo importa la cantidad: sugiere subir 1.
      setQuantity(prev ? prev.quantity + 1 : 1);
    } else {
      const s = suggestNextBid(prev);
      setQuantity(s.quantity);
      setFace(s.face);
    }
  }, [prev?.quantity, prev?.face, isEsta]);

  // Validación local: en "de esta" basta con subir la cantidad.
  const estaOk = !prev || quantity > prev.quantity;
  const check = isEsta
    ? { ok: estaOk, reason: estaOk ? '' : 'Debes subir la cantidad ("X de esta").' }
    : validateRaise(prev, { quantity, face });

  // ── No es mi turno ──
  if (!myTurn) {
    return (
      <div className="hud-waiting">
        <p className="text-bone/50 text-sm">
          Turno de{' '}
          <span className="text-amber-glow font-semibold">
            {state.players.find((p) => p.id === state.currentTurnId)?.name || '…'}
          </span>
          {isEsta && <span className="text-bone/30"> · ronda “de esta”</span>}
        </p>
      </div>
    );
  }

  // ── Mi turno ──
  return (
    <div className="hud-panel">
      {isEsta && (
        <p className="text-center text-[11px] text-emerald-300/80 mb-1">
          Obliga cerrado: pinta oculta. Solo puedes subir la cantidad o dudar.
        </p>
      )}
      <div className="hud-row">
        {/* Selector de cantidad */}
        <div className="hud-qty">
          <button className="hud-btn-circle" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
            −
          </button>
          <div className="hud-qty__value">
            <span className="font-display text-3xl font-black text-amber-glow leading-none">{quantity}</span>
            <span className="text-[10px] text-bone/30 uppercase tracking-widest">
              {isEsta ? 'de esta' : 'cant.'}
            </span>
          </div>
          <button className="hud-btn-circle" onClick={() => setQuantity((q) => q + 1)}>
            +
          </button>
        </div>

        <div className="hud-divider" />

        {/* Selector de pinta — oculto en "de esta" */}
        {!isEsta && (
          <>
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
          </>
        )}

        {/* En "de esta" mostramos un dado oculto como recordatorio visual */}
        {isEsta && (
          <>
            <div className="flex items-center gap-2 px-2">
              <Die value={null} size={32} />
              <span className="text-sm text-bone/50">de esta</span>
            </div>
            <div className="hud-divider" />
          </>
        )}

        {/* Botones de acción */}
        <div className="hud-actions">
          <button
            onClick={() => bid(quantity, isEsta ? 0 : face)}
            disabled={!check.ok}
            className="hud-action hud-action--bid"
            title={!check.ok ? check.reason : 'Apostar'}
          >
            {isEsta ? `${quantity} de esta` : 'Apostar'}
          </button>
          <button onClick={doubt} disabled={!prev} className="hud-action hud-action--doubt">
            Dudar
          </button>
          {/* Calzar no existe en "de esta" */}
          {!isEsta && (
            <button
              onClick={calzar}
              disabled={!prev || !state.canCalzarNow}
              className="hud-action hud-action--calzar"
              title={state.canCalzarNow ? 'Calzar exacto' : 'Solo con más de la mitad de los dados o teniendo 1 dado'}
            >
              Calzar
            </button>
          )}
        </div>
      </div>

      {!check.ok && <p className="text-center text-[11px] text-red-400/80 mt-2">{check.reason}</p>}
    </div>
  );
}
