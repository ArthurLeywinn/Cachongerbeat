import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { FACE_NAMES, validateRaise, suggestNextBid } from '../lib/rules.js';
import Die from './Die.jsx';

export default function BidPanel() {
  const { state, playerId, bid, doubt, calzar, pasar, doubtPass } = useGame();
  const myTurn = state.currentTurnId === playerId;
  const prev = state.currentBid;
  const mode = state.obliga?.mode;
  const isEsta = mode === 'cerradoA';
  const pendingPass = state.pendingPass; // { passerId, mustRespond }
  const respondingToPass = !!pendingPass && myTurn;

  // Límite duro: nunca se puede apostar más que los dados en juego.
  const maxQ = state.totalDiceInPlay || 30;
  // ¿Puedo abrir con ases? (partida falsa, solo una por ronda y nunca en Obliga)
  const falsaAllowed = !prev && !state.falsaUsedThisRound && !state.obliga;
  const falsaActive = !!state.falsa;
  const me = state.players.find((p) => p.id === playerId);

  const [quantity, setQuantity] = useState(1);
  const [face, setFace] = useState(2);
  // Dirección de juego que elige el que abre la ronda.
  const [direction, setDirection] = useState('left');

  // Cuenta regresiva sincronizada con el servidor (turnDeadline = epoch ms del
  // timeout real). Antes era cosmética y podía desfasarse del reloj del server.
  const turnSeconds = state.settings?.turnSeconds || null;
  const deadline = state.turnDeadline || null;
  const [remaining, setRemaining] = useState(turnSeconds);
  useEffect(() => {
    if (!turnSeconds || !deadline || state.phase !== 'bidding') return undefined;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [deadline, turnSeconds, state.phase]);

  useEffect(() => {
    if (isEsta) setQuantity(prev ? Math.min(maxQ, prev.quantity + 1) : 1);
    else {
      const s = suggestNextBid(prev);
      setQuantity(Math.min(maxQ, s.quantity));
      setFace(s.face);
    }
    setDirection('left');
  }, [prev?.quantity, prev?.face, isEsta, state.round]);

  // Si los dados en juego bajan, ajustar la cantidad seleccionada.
  useEffect(() => {
    setQuantity((q) => Math.min(q, maxQ));
  }, [maxQ]);

  const estaOk = (!prev || quantity > prev.quantity) && quantity <= maxQ;
  const check = isEsta
    ? { ok: estaOk, reason: estaOk ? '' : (quantity > maxQ ? `Máximo ${maxQ} (dados en juego).` : 'Debes subir la cantidad ("X de esta").') }
    : validateRaise(prev, { quantity, face }, { totalDice: maxQ, allowFalsa: falsaAllowed });

  const isFalsaBid = !isEsta && !prev && face === 1 && falsaAllowed;

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
          {falsaActive && <span className="text-sky-300/70"> · partida falsa</span>}
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

      {/* Avisos contextuales */}
      {respondingToPass && (
        <p className="text-center text-[11px] text-sky-300/80 mb-1">
          {passerName} pasó. Sube la apuesta vigente o duda su paso (no se puede calzar).
        </p>
      )}
      {falsaActive && (
        <p className="text-center text-[11px] text-sky-300/80 mb-1">
          Partida falsa: tú abres la ronda con la apuesta que quieras (menos ases). No se puede dudar ni calzar.
        </p>
      )}
      {isEsta && (
        <p className="text-center text-[11px] text-emerald-300/80 mb-1">
          Obliga cerrado: pinta oculta. Solo puedes subir la cantidad o dudar.
        </p>
      )}

      {/* El que abre elige la dirección de juego de la ronda */}
      {state.youChooseDirection && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-[11px] text-bone/40 uppercase tracking-widest">¿A quién le pasas el turno?</span>
          <button
            onClick={() => setDirection('right')}
            className={['hud-dir-btn', direction === 'right' ? 'hud-dir-btn--active' : ''].join(' ')}
            title="Jugar hacia la derecha de la mesa"
          >
            ← Derecha
          </button>
          <button
            onClick={() => setDirection('left')}
            className={['hud-dir-btn', direction === 'left' ? 'hud-dir-btn--active' : ''].join(' ')}
            title="Jugar hacia la izquierda de la mesa"
          >
            Izquierda →
          </button>
        </div>
      )}

      <div className="hud-row">
        {/* Selector de cantidad */}
        <div className="hud-qty">
          <button className="hud-btn-circle" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
          <div className="hud-qty__value">
            <span className="font-display text-3xl font-black text-amber-glow leading-none">{quantity}</span>
            <span className="text-[10px] text-bone/30 uppercase tracking-widest">{isEsta ? 'de esta' : 'cant.'}</span>
          </div>
          <button
            className="hud-btn-circle"
            disabled={quantity >= maxQ}
            title={quantity >= maxQ ? `Máximo ${maxQ} dados en juego` : undefined}
            onClick={() => setQuantity((q) => Math.min(maxQ, q + 1))}
          >+</button>
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
            onClick={() => bid(quantity, isEsta ? 0 : face, state.youChooseDirection ? direction : undefined)}
            disabled={!check.ok}
            className="hud-action hud-action--bid"
            title={!check.ok ? check.reason : isFalsaBid ? 'Abrir con ases = partida falsa' : 'Apostar'}
          >
            {isFalsaBid ? 'Partida falsa' : 'Apostar'}
          </button>

          {/* Si hay un paso pendiente: solo Apostar + Dudar el paso */}
          {respondingToPass ? (
            <button onClick={doubtPass} className="hud-action hud-action--doubt">
              Dudar el paso
            </button>
          ) : (
            <>
              <button
                onClick={doubt}
                disabled={!prev || falsaActive}
                title={falsaActive ? 'No se puede dudar una partida falsa' : undefined}
                className="hud-action hud-action--doubt"
              >
                Dudar
              </button>
              {!isEsta && (
                <button
                  onClick={calzar}
                  disabled={!prev || falsaActive || !state.canCalzarNow}
                  className="hud-action hud-action--calzar"
                  title={falsaActive ? 'No se puede calzar una partida falsa' : state.canCalzarNow ? 'Calzar exacto' : 'No disponible ahora'}
                >
                  Calzar
                </button>
              )}
              {/* Pasar: solo con exactamente 5 dados y una vez por ronda */}
              {state.settings?.pasarEnabled && (
                <button
                  onClick={pasar}
                  disabled={!state.canPasarNow}
                  className="hud-action hud-action--pasar"
                  title={me && me.diceCount !== 5
                    ? 'Solo puedes pasar con exactamente 5 dados'
                    : 'Pasar (farol): declaras mano especial. Si te dudan y no la tienes, pierdes un dado.'}
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
