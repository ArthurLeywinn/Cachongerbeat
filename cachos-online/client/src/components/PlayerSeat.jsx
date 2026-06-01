import React from 'react';
import Die from './Die.jsx';
import { useGame } from '../context/GameContext.jsx';

// Asiento de un jugador en la mesa.
export default function PlayerSeat({ player }) {
  const { state } = useGame();
  const isTurn = state.currentTurnId === player.id && state.phase === 'bidding';
  const isObligado = state.special?.obligadoId === player.id;
  const reveal = state.phase === 'reveal' || state.phase === 'finished';

  // Dados a mostrar: si vienen valores los pintamos; si no, mostramos ocultos.
  const dice = player.dice; // null si están ocultos para mí
  const highlightFace = reveal && state.lastResult ? state.lastResult.bid?.face : null;

  return (
    <div
      className={[
        'glass rounded-2xl p-4 transition w-full',
        isTurn ? 'ring-2 ring-amber-glow shadow-cup' : '',
        player.eliminated ? 'opacity-40' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-full bg-amber-glow/20 grid place-items-center text-amber-glow font-bold">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {player.name}
              {player.isYou && <span className="text-bone/40"> (tú)</span>}
            </p>
            <p className="text-[11px] text-bone/40">
              {player.eliminated ? 'Eliminado' : `${player.diceCount} dado${player.diceCount === 1 ? '' : 's'}`}
              {!player.connected && ' · desconectado'}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isTurn && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-glow text-felt-900 font-bold">
              TURNO
            </span>
          )}
          {isObligado && (
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 font-semibold">
              Último dado
            </span>
          )}
        </div>
      </div>

      {/* Dados */}
      <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center">
        {player.eliminated ? (
          <span className="text-bone/30 text-sm">Sin dados</span>
        ) : dice ? (
          dice.map((v, i) => (
            <Die
              key={i}
              value={v}
              size={36}
              rolling={state.phase === 'reveal'}
              highlight={
                reveal &&
                highlightFace != null &&
                (v === highlightFace || (highlightFace !== 1 && v === 1))
              }
            />
          ))
        ) : (
          Array.from({ length: player.diceCount }).map((_, i) => <Die key={i} value={null} size={36} />)
        )}
      </div>
    </div>
  );
}
