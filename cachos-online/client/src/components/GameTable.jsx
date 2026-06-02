import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import PlayerSeat from './PlayerSeat.jsx';
import BidPanel from './BidPanel.jsx';
import ActionLog from './ActionLog.jsx';
import RoundResult from './RoundResult.jsx';
import { formatBid } from '../lib/rules.js';
import Die from './Die.jsx';

// Posiciones en arco para los otros jugadores alrededor de la mesa.
// Devuelve clases de posición absoluta según índice y total.
function getArcPosition(index, total) {
  // Distribuimos los jugadores en la mitad superior del óvalo (180°)
  // index 0..total-1, de izquierda a derecha
  const positions = {
    1: ['top-[6%] left-1/2 -translate-x-1/2'],
    2: ['top-[10%] left-[18%]', 'top-[10%] right-[18%]'],
    3: ['top-[6%] left-1/2 -translate-x-1/2', 'top-[22%] left-[6%]', 'top-[22%] right-[6%]'],
    4: ['top-[6%] left-[30%]', 'top-[6%] right-[30%]', 'top-[22%] left-[6%]', 'top-[22%] right-[6%]'],
    5: ['top-[4%] left-1/2 -translate-x-1/2', 'top-[8%] left-[22%]', 'top-[8%] right-[22%]', 'top-[24%] left-[5%]', 'top-[24%] right-[5%]'],
  };
  const clamped = Math.min(Math.max(total, 1), 5);
  return (positions[clamped] || positions[5])[index] || 'top-[6%] left-1/2 -translate-x-1/2';
}

export default function GameTable() {
  const { state, playerId, leave } = useGame();
  if (!state) return null;

  const me = state.players.find((p) => p.id === playerId);
  const others = state.players.filter((p) => p.id !== playerId);
  const finished = state.status === 'finished';
  const winner = finished ? state.players.find((p) => p.id === state.winnerId) : null;
  const totalDice = state.players.reduce((sum, p) => sum + (p.eliminated ? 0 : p.diceCount), 0);

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

        {/* Apuesta vigente — centro */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          {state.currentBid ? (
            <p className="text-bone/70 text-sm">
              Apuesta actual:{' '}
              <span className="font-display text-lg font-bold text-amber-glow">
                {formatBid(state.currentBid)}
              </span>
            </p>
          ) : (
            <p className="text-bone/30 text-sm">Esperando la primera apuesta de la ronda…</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-bone/30 uppercase tracking-widest">Dados en juego</p>
            <p className="font-display text-2xl font-black text-amber-glow leading-none">{totalDice}</p>
          </div>
          <button onClick={leave} className="text-xs text-bone/30 hover:text-bone/60 transition px-2 py-1 rounded border border-white/10 hover:border-white/20">
            Salir
          </button>
        </div>
      </header>

      <RoundResult />

      {/* ── Área de juego — posicionamiento absoluto ── */}
      <div className="play-area">

        {/* Mesa oval */}
        <div className="oval-table">
          {/* Descarte central */}
          {state.centerPool > 0 && (
            <div className="text-center">
              <p className="text-[10px] text-bone/30 uppercase tracking-widest">Descarte</p>
              <p className="font-display text-3xl font-black text-amber-glow">{state.centerPool}</p>
            </div>
          )}
        </div>

        {/* Otros jugadores posicionados en arco */}
        {others.map((p, i) => (
          <div
            key={p.id}
            className={`absolute ${getArcPosition(i, others.length)}`}
          >
            <PlayerSeat player={p} compact />
          </div>
        ))}

        {/* Mis dados — dentro del área de juego, centrados al pie de la mesa
            oval, como si estuvieran puestos sobre la mesa frente a mí. */}
        {me && !me.eliminated && (
          <div className="my-dice-row">
            {me.dice
              ? me.dice.map((v, i) => <Die key={i} value={v} size={44} rolling={state.phase === 'reveal'} highlight={
                  state.phase === 'reveal' && state.lastResult
                    ? (v === state.lastResult.bid?.face || (state.lastResult.bid?.face !== 1 && v === 1))
                    : false
                } />)
              : Array.from({ length: me.diceCount }).map((_, i) => <Die key={i} value={null} size={44} />)
            }
          </div>
        )}

        {/* Historial — esquina inferior derecha del área de juego */}
        <div className="log-panel">
          <ActionLog />
        </div>
      </div>

      {/* ── Zona inferior: SOLO el panel de acción (HUD) ── */}
      <div className="my-zone">
        {/* Panel de acción */}
        {!finished && (
          me?.eliminated ? (
            <div className="text-center text-bone/40 text-sm py-2">
              Eliminado — observando la partida
            </div>
          ) : (
            <BidPanel />
          )
        )}
      </div>

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
