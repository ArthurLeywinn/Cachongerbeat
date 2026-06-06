import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import PlayerSeat from './PlayerSeat.jsx';
import BidPanel from './BidPanel.jsx';
import ActionLog from './ActionLog.jsx';
import ChatPanel from './ChatPanel.jsx';
import RoundResult from './RoundResult.jsx';
import ObligaChooser from './ObligaChooser.jsx';
import { bidText } from '../lib/rules.js';
import Die from './Die.jsx';

// Posiciones de los otros jugadores a lo largo del borde superior de la mesa.
function topPositions(total) {
  const layouts = {
    1: ['left-1/2 -translate-x-1/2'],
    2: ['left-[28%] -translate-x-1/2', 'left-[72%] -translate-x-1/2'],
    3: ['left-[20%] -translate-x-1/2', 'left-1/2 -translate-x-1/2', 'left-[80%] -translate-x-1/2'],
  };
  const clamped = Math.min(Math.max(total, 1), 3);
  return layouts[clamped] || layouts[3];
}

// Hook: convierte los mensajes de chat nuevos en burbujas que duran 5s.
function useSpeechBubbles(chat) {
  const [bubbles, setBubbles] = useState({}); // { playerId: { text, id } }
  const seen = useRef(new Set());
  const inited = useRef(false);
  const timers = useRef({});

  useEffect(() => {
    const list = chat || [];
    // En el primer render marcamos lo existente como visto (no mostrar de golpe).
    if (!inited.current) {
      inited.current = true;
      list.forEach((m) => seen.current.add(m.id));
      return;
    }
    list.forEach((m) => {
      if (seen.current.has(m.id)) return;
      seen.current.add(m.id);
      setBubbles((b) => ({ ...b, [m.playerId]: { text: m.text, id: m.id } }));
      clearTimeout(timers.current[m.playerId]);
      timers.current[m.playerId] = setTimeout(() => {
        setBubbles((b) => {
          if (b[m.playerId]?.id !== m.id) return b;
          const nb = { ...b };
          delete nb[m.playerId];
          return nb;
        });
      }, 5000);
    });
  }, [chat]);

  return bubbles;
}

export default function GameTable() {
  const { state, playerId, leave } = useGame();
  const bubbles = useSpeechBubbles(state?.chat);
  if (!state) return null;

  const me = state.players.find((p) => p.id === playerId);
  const others = state.players.filter((p) => p.id !== playerId);
  const finished = state.status === 'finished';
  const winner = finished ? state.players.find((p) => p.id === state.winnerId) : null;
  const totalDice = state.players.reduce((sum, p) => sum + (p.eliminated ? 0 : p.diceCount), 0);
  const positions = topPositions(others.length);
  const myBubble = bubbles[playerId]?.text || null;

  return (
    <div className="table-scene">
      {/* ── Barra superior ── */}
      <header className="table-header">
        <div className="flex items-center gap-3">
          <Die value={3} size={24} />
          <div>
            <h1 className="font-display text-xl font-black leading-none tracking-tight">Cachos</h1>
            <p className="text-[11px] text-bone/40">
              Sala <span className="text-amber-glow font-semibold tracking-widest">{state.code}</span>
              {' · '}Ronda {state.round}
            </p>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          {state.currentBid ? (
            <p className="text-bone/70 text-sm">
              Apuesta actual:{' '}
              <span className="font-display text-lg font-bold text-amber-glow">
                {bidText(state.currentBid)}
              </span>
            </p>
          ) : (
            <p className="text-bone/30 text-sm">Esperando la primera apuesta de la ronda…</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hud-counter">
            <p className="text-[10px] text-bone/40 uppercase tracking-widest leading-none">Dados en juego</p>
            <p className="font-display text-2xl font-black text-amber-glow leading-none mt-0.5">{totalDice}</p>
          </div>
          <button onClick={leave} className="text-xs text-bone/40 hover:text-bone/70 transition px-2 py-1 rounded border border-white/10 hover:border-white/20">
            Salir
          </button>
        </div>
      </header>

      <RoundResult />

      {/* ── Escena de la mesa ── */}
      <div className="play-area">
        <div className="big-table" aria-hidden="true" />

        {/* Descarte: dados pequeños y apagados, agrupados de a 5 (sin número) */}
        {state.centerPool > 0 && (
          <div className="discard" aria-label="dados descartados">
            {Array.from({ length: Math.ceil(state.centerPool / 5) }).map((_, g) => {
              const n = Math.min(5, state.centerPool - g * 5);
              return (
                <div className="discard-stack" key={g}>
                  {Array.from({ length: n }).map((__, i) => (
                    <span className="discard-die" key={i} />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Oponentes sentados en el borde superior (con su burbuja de chat) */}
        {others.map((p, i) => (
          <div key={p.id} className={`seat-slot ${positions[i]}`}>
            <PlayerSeat player={p} compact bubble={bubbles[p.id]?.text || null} />
          </div>
        ))}

        {/* Chat — lateral izquierdo */}
        <ChatPanel />

        {/* Historial — esquina inferior derecha */}
        <div className="log-panel">
          <ActionLog />
        </div>

        {/* Mis dados — sobre la mesa, centrados frente a mí (con mi burbuja) */}
        {me && !me.eliminated && (
          <div className="my-dice-row">
            {myBubble && <div className="speech-bubble speech-bubble--mine">{myBubble}</div>}
            {me.dice
              ? me.dice.map((v, i) => (
                  <Die
                    key={i}
                    value={v}
                    size={48}
                    rolling={state.phase === 'reveal'}
                    highlight={
                      state.phase === 'reveal' && state.lastResult
                        ? (v === state.lastResult.bid?.face || (state.lastResult.bid?.face !== 1 && v === 1))
                        : false
                    }
                  />
                ))
              : Array.from({ length: me.diceCount }).map((_, i) => <Die key={i} value={null} size={48} />)}
          </div>
        )}
      </div>

      {/* ── Zona inferior: HUD ── */}
      <div className="my-zone">
        {finished ? null : me?.eliminated ? (
          <div className="text-center text-bone/40 text-sm py-2">Eliminado — observando la partida</div>
        ) : state.phase === 'obliga-choose' ? (
          <div className="hud-waiting">
            <p className="text-bone/50 text-sm">
              {state.youMustChooseObliga ? (
                <span className="text-amber-glow font-semibold">Elige tu Obliga…</span>
              ) : (
                <>
                  <span className="text-amber-glow font-semibold">
                    {state.players.find((p) => p.id === state.obliga?.playerId)?.name || '…'}
                  </span>{' '}
                  está eligiendo su Obliga…
                </>
              )}
            </p>
          </div>
        ) : (
          <BidPanel />
        )}
      </div>

      <ObligaChooser />

      {/* ── Pantalla de victoria ── */}
      {finished && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm px-4">
          <div className="glass rounded-3xl p-10 text-center shadow-cup animate-pop max-w-md">
            <div className="flex justify-center gap-2 mb-4">
              <Die value={1} size={44} highlight />
              <Die value={6} size={44} />
              <Die value={1} size={44} highlight />
            </div>
            <p className="text-bone/50 uppercase tracking-widest text-sm mb-2">Fin de la partida</p>
            <h2 className="font-display text-4xl font-black text-amber-glow mb-2">
              {winner ? `¡${winner.name} gana!` : 'Empate'}
            </h2>
            <p className="text-bone/60 mb-6">Último jugador con dados en pie.</p>
            <button
              onClick={leave}
              className="px-6 py-3 rounded-xl bg-amber-glow text-felt-900 font-bold hover:brightness-105 transition"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
