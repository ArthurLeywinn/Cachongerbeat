import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import Die from './Die.jsx';

export default function Lobby() {
  const { state, playerId, startGame, leave } = useGame();
  const [copied, setCopied] = useState(false);
  if (!state) return null;

  const me = state.players.find((p) => p.id === playerId);
  const isHost = me?.isHost;
  const canStart = state.players.length >= 2;

  const copyCode = () => {
    navigator.clipboard?.writeText(state.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="glass rounded-2xl p-8 w-full max-w-lg shadow-cup">
        <div className="text-center mb-6">
          <p className="text-bone/50 text-sm uppercase tracking-widest mb-1">Sala de espera</p>
          <button
            onClick={copyCode}
            className="font-display text-6xl font-black tracking-[0.15em] text-amber-glow hover:brightness-110 transition"
            title="Copiar código"
          >
            {state.code}
          </button>
          <p className="text-bone/40 text-xs mt-2">
            {copied ? '¡Código copiado!' : 'Toca el código para copiarlo y compartirlo'}
          </p>
        </div>

        {/* Resumen de reglas activas */}
        {state.settings && (
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <span className="px-3 py-1 rounded-full bg-black/25 text-xs text-bone/70">
              🎲 {state.settings.dicePerPlayer} dados
            </span>
            <span className="px-3 py-1 rounded-full bg-black/25 text-xs text-bone/70">
              ⏱ {state.settings.turnSeconds ? `${state.settings.turnSeconds}s/turno` : 'Sin límite'}
            </span>
            <span className="px-3 py-1 rounded-full bg-black/25 text-xs text-bone/70">
              Calzo {state.settings.calzoInfinito ? 'infinito' : 'normal'}
            </span>
            {state.settings.pasarEnabled && (
              <span className="px-3 py-1 rounded-full bg-sky-500/20 text-xs text-sky-200">Pasar activado</span>
            )}
          </div>
        )}

        <div className="space-y-2 mb-6">
          <p className="text-xs uppercase tracking-wide text-bone/50 mb-1">
            Jugadores ({state.players.length}/4)
          </p>
          {state.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-black/20 animate-pop"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-glow/20 grid place-items-center text-amber-glow font-bold">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">
                  {p.name}
                  {p.id === playerId && <span className="text-bone/40"> (tú)</span>}
                </span>
              </div>
              {p.isHost && (
                <span className="text-xs px-2 py-1 rounded-md bg-amber-glow/15 text-amber-glow font-semibold">
                  Anfitrión
                </span>
              )}
            </div>
          ))}
          {Array.from({ length: 4 - state.players.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/10 text-bone/30"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 grid place-items-center">
                <Die value={null} size={20} />
              </div>
              Esperando jugador…
            </div>
          ))}
        </div>

        {isHost ? (
          <button
            onClick={startGame}
            disabled={!canStart}
            className="w-full py-3 rounded-xl bg-amber-glow text-felt-900 font-bold hover:brightness-105 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {canStart ? 'Comenzar partida' : 'Esperando jugadores (mín. 2)'}
          </button>
        ) : (
          <p className="text-center text-bone/60 py-3">
            Esperando que el anfitrión inicie la partida…
          </p>
        )}

        <button onClick={leave} className="w-full mt-3 text-sm text-bone/40 hover:text-bone/70 transition">
          Salir de la sala
        </button>
      </div>
    </div>
  );
}
