import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import Character, { Cup } from './Character.jsx';
import Die from './Die.jsx';

// Sala de espera con la temática visual del juego: slots de jugadores con su
// personaje, contador /6 y distinción clara entre lobby normal y ranked.
export default function Lobby() {
  const { state, playerId, startGame, leave } = useGame();
  const [copied, setCopied] = useState(false);
  if (!state) return null;

  const me = state.players.find((p) => p.id === playerId);
  const isHost = me?.isHost;
  const canStart = state.players.length >= 2;
  const maxPlayers = state.maxPlayers || 6;
  const ranked = !!state.ranked;
  const emptySlots = Math.max(0, maxPlayers - state.players.length);

  const copyCode = () => {
    navigator.clipboard?.writeText(state.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="lobby-bg">
      <div className={['lobby-card glass', ranked ? 'lobby-card--ranked' : ''].join(' ')}>
        {/* ── Encabezado ── */}
        <div className="text-center mb-5">
          {ranked ? (
            <span className="lobby-badge lobby-badge--ranked">🏆 Partida ranked</span>
          ) : (
            <span className="lobby-badge">🎲 Partida casual</span>
          )}
          <p className="text-bone/50 text-xs uppercase tracking-widest mt-3 mb-1">Sala de espera</p>
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

        {/* ── Resumen de reglas activas ── */}
        {state.settings && (
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <span className="lobby-chip">🎲 {state.settings.dicePerPlayer} dados</span>
            <span className="lobby-chip">
              ⏱ {state.settings.turnSeconds ? `${state.settings.turnSeconds}s/turno` : 'Sin límite'}
            </span>
            <span className="lobby-chip">Calzo {state.settings.calzoInfinito ? 'infinito' : 'normal'}</span>
            {state.settings.pasarEnabled && (
              <span className="lobby-chip lobby-chip--sky">Pasar activado</span>
            )}
            {ranked && <span className="lobby-chip lobby-chip--gold">Reglas fijas de ranked</span>}
          </div>
        )}

        {/* ── Slots de jugadores ── */}
        <p className="text-xs uppercase tracking-wide text-bone/50 mb-2 text-center">
          Jugadores <span className="text-amber-glow font-bold">{state.players.length}/{maxPlayers}</span>
        </p>
        <div className="lobby-grid mb-6">
          {state.players.map((p) => (
            <div key={p.id} className="lobby-slot animate-pop">
              <div className="lobby-slot__art">
                <Character
                  hood={p.cosmetic?.hood ?? 0}
                  face={p.cosmetic?.face ?? 0}
                  body={p.cosmetic?.body ?? 0}
                  hat={p.cosmetic?.hat ?? 0}
                  acc={p.cosmetic?.acc ?? 0}
                  size={74}
                />
                <div className="lobby-slot__cup">
                  <Cup size={30} style={p.cosmetic?.cup ?? 0} />
                </div>
              </div>
              <p className="lobby-slot__name">
                {p.name}
                {p.id === playerId && <span className="text-bone/40"> (tú)</span>}
              </p>
              {p.isHost && <span className="lobby-slot__host">Anfitrión</span>}
            </div>
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} className="lobby-slot lobby-slot--empty">
              <div className="lobby-slot__art lobby-slot__art--empty">
                <Die value={null} size={30} />
              </div>
              <p className="lobby-slot__name text-bone/30">Esperando…</p>
            </div>
          ))}
        </div>

        {/* ── Acciones ── */}
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
