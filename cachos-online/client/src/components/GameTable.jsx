import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import PlayerSeat from './PlayerSeat.jsx';
import BidPanel from './BidPanel.jsx';
import ActionLog from './ActionLog.jsx';
import RoundResult from './RoundResult.jsx';
import { formatBid } from '../lib/rules.js';
import Die from './Die.jsx';

export default function GameTable() {
  const { state, playerId, leave } = useGame();
  if (!state) return null;

  const me = state.players.find((p) => p.id === playerId);
  const others = state.players.filter((p) => p.id !== playerId);
  const finished = state.status === 'finished';
  const winner = finished ? state.players.find((p) => p.id === state.winnerId) : null;

  return (
    <div className="min-h-screen px-4 py-4 sm:py-6 max-w-6xl mx-auto">
      {/* Barra superior */}
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Die value={3} size={28} />
          <div>
            <h1 className="font-display text-2xl font-black leading-none">Cachos</h1>
            <p className="text-xs text-bone/40">
              Sala <span className="text-amber-glow font-semibold tracking-widest">{state.code}</span> · Ronda{' '}
              {state.round}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="text-xs text-bone/40">Descarte central</p>
            <p className="font-display text-xl font-bold text-amber-glow">{state.centerPool}</p>
          </div>
          <button onClick={leave} className="text-sm text-bone/40 hover:text-bone/70 transition">
            Salir
          </button>
        </div>
      </header>

      {/* Apuesta vigente */}
      <div className="text-center mb-4">
        {state.currentBid ? (
          <p className="text-bone/70">
            Apuesta actual:{' '}
            <span className="font-display text-2xl font-bold text-amber-glow">
              {formatBid(state.currentBid)}
            </span>
          </p>
        ) : (
          <p className="text-bone/40">Esperando la primera apuesta de la ronda…</p>
        )}
      </div>

      <RoundResult />

      {/* Disposición principal */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          {/* Otros jugadores */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {others.map((p) => (
              <PlayerSeat key={p.id} player={p} />
            ))}
          </div>

          {/* Mi asiento, destacado */}
          {me && (
            <div className="border-t border-white/10 pt-4">
              <PlayerSeat player={me} />
            </div>
          )}

          {/* Panel de acciones */}
          {!finished && !me?.eliminated && <BidPanel />}
          {me?.eliminated && !finished && (
            <div className="glass rounded-2xl p-5 text-center text-bone/60">
              Quedaste eliminado. Puedes seguir observando la partida.
            </div>
          )}
        </div>

        {/* Historial lateral */}
        <div className="h-[300px] lg:h-auto">
          <ActionLog />
        </div>
      </div>

      {/* Pantalla de victoria */}
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
