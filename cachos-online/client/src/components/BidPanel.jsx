import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { FACE_NAMES, FACE_NAMES_PLURAL, validateRaise, suggestNextBid } from '../lib/rules.js';
import Die from './Die.jsx';

export default function BidPanel() {
  const { state, playerId, bid, doubt, calzar, pasar, doubtPass } = useGame();
  const myTurn = state.currentTurnId === playerId;
  const prev = state.currentBid;
  const mode = state.obliga?.mode;
  const isEsta = mode === 'cerradoA';
  const pendingPass = state.pendingPass; // { passerId, mustRespond }
  const respondingToPass = !!pendingPass && myTurn;

  const [quantity, setQuantity] = useState(1);
  const [face, setFace] = useState(2);

  // Cuenta regresiva visual (cosmética; el servidor es el que decide el timeout).
  const turnSeconds = state.settings?.turnSeconds || null;
  const [remaining, setRemaining] = useState(turnSeconds);
  useEffect(() => {
    if (!turnSeconds || state.phase !== 'bidding') return undefined;
    setRemaining(turnSeconds);
    const t = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [state.currentTurnId, turnSeconds, state.phase, state.round]);

  useEffect(() => {
    if (isEsta) setQuantity(prev ? prev.quantity + 1 : 1);
    else {
      const s = suggestNextBid(prev);
      setQuantity(s.quantity);
      setFace(s.face);
    }
  }, [prev?.quantity, prev?.face, isEsta]);

  const estaOk = !prev || quantity > prev.quantity;
  const check = isEsta
    ? { ok: estaOk, reason: estaOk ? '' : 'Debes subir la cantidad ("X de esta").' }
    : validateRaise(prev, { quantity, face });

  const passerName = pendingPass
    ? state.players.find((p) => p.id === pendingPass.passerId)?.name || '—'
    : null;

  // ── No es mi turno ──
  if (!myTurn) {
    return (
      <div className="hud-waiting">
        <p className="text-bone/50 text-sm">
          Turno de{' '}
          <span className="text-amber-glow font-semibold">
            {state.players.find((p) => p.id === state.currentTurnId)?.name || '…'}
          </span>
          {pendingPass && <span className="text-bone/30"> · {passerName} pasó</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="hud-panel">
      {/* Cuenta regresiva */}
      {turnSeconds && (
        <p className={['text-center text-[11px] mb-1', remaining <= 5 ? 'text-red-400' : 'text-bone/40'].join(' ')}>
          ⏱ {remaining}s
        </p>
      )}

      {/* Aviso de paso pendiente */}
      {respondingToPass && (
        <p className="text-center text-[11px] text-sky-300/80 mb-1">
          {passerName} pasó. Sube la apuesta vigente o duda su paso (no se puede calzar).
        </p>
      )}
      {isEsta && (
        <p className="text-center text-[11px] text-emerald-300/80 mb-1">
          Obliga cerrado: pinta oculta. Solo puedes subir la cantidad o dudar.
        </p>
      )}

      <div className="hud-row">
        {/* Selector de cantidad */}
        <div className="hud-qty">
          <button className="hud-btn-circle" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
          <div className="hud-qty__value">
            <span className="font-display text-3xl font-black text-amber-glow leading-none">{quantity}</span>
            <span className="text-[10px] text-bone/30 uppercase tracking-widest">{isEsta ? 'de esta' : 'cant.'}</span>
          </div>
          <button className="hud-btn-circle" onClick={() => setQuantity((q) => q + 1)}>+</button>
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
            Apostar
          </button>

          {/* Si hay un paso pendiente: solo Apostar + Dudar el paso */}
          {respondingToPass ? (
            <button onClick={doubtPass} className="hud-action hud-action--doubt">
              Dudar el paso
            </button>
          ) : (
            <>
              <button onClick={doubt} disabled={!prev} className="hud-action hud-action--doubt">
                Dudar
              </button>
              {!isEsta && (
                <button
                  onClick={calzar}
                  disabled={!prev || !state.canCalzarNow}
                  className="hud-action hud-action--calzar"
                  title={state.canCalzarNow ? 'Calzar exacto' : 'No disponible ahora'}
                >
                  Calzar
                </button>
              )}
              {/* Pasar: solo si la regla está activa y la mano lo permite */}
              {state.settings?.pasarEnabled && (
                <button
                  onClick={pasar}
                  disabled={!state.canPasarNow}
                  className="hud-action hud-action--pasar"
                  title="Pasar (farol): declaras mano especial. Si te dudan y no la tienes, pierdes un dado."
                >
                  Pasar
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!check.ok && <p className="text-center text-[11px] text-red-400/80 mt-2">{check.reason}</p>}
    </div>
  );
}
