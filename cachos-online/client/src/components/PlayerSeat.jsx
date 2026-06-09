import React from 'react';
import Die from './Die.jsx';
import Character, { Cup } from './Character.jsx';
import { useGame } from '../context/GameContext.jsx';

// Etiquetas cortas para el badge según la modalidad de Obliga activa.
const OBLIGA_LABELS = {
  kamikaze: 'Kamikaze',
  abierto: 'Abierto',
  cerradoA: 'De esta',
  cerradoB: 'Cerrado',
};

// Deriva una variante de personaje (0..3) determinista a partir del id.
function variantFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 4;
  return h;
}

export default function PlayerSeat({ player, compact = false, bubble = null }) {
  const { state } = useGame();
  const isTurn = state.currentTurnId === player.id && state.phase === 'bidding';
  const isObligado = state.obliga?.playerId === player.id;
  const reveal = state.phase === 'reveal' || state.phase === 'finished';
  const dice = player.dice;
  const highlightFace = reveal && state.lastResult ? state.lastResult.bid?.face : null;

  const renderDice = (size) => {
    if (player.eliminated) {
      return <span className="text-bone/30 text-[10px]">sin dados</span>;
    }
    if (dice) {
      return dice.map((v, i) => (
        <Die
          key={i}
          value={v}
          size={size}
          rolling={state.phase === 'reveal'}
          highlight={
            reveal && highlightFace != null &&
            (v === highlightFace || (highlightFace !== 1 && v === 1))
          }
        />
      ));
    }
    return Array.from({ length: player.diceCount }).map((_, i) => (
      <Die key={i} value={null} size={size} />
    ));
  };

  // ── Modo compacto: jugadores ajenos sentados a la mesa ──
  if (compact) {
    return (
      <div className={['seat', isTurn ? 'seat--turn' : '', player.eliminated ? 'opacity-40' : ''].join(' ')}>
        {/* Burbuja de chat (a la derecha del personaje) */}
        {bubble && <div className="speech-bubble speech-bubble--right">{bubble}</div>}

        {/* Nombre + cantidad de dados (sutil, fuera del vaso) */}
        <p className="seat__name">
          {player.name}
          {!player.eliminated && <span className="seat__dc"> · {player.diceCount}🎲</span>}
          {!player.connected && <span className="seat__dc"> ·✕</span>}
        </p>

        {/* Personaje */}
        <div className="seat__char">
          <Character variant={variantFor(player.id)} thinking={isTurn} size={104} />
        </div>

        {/* Mesa del jugador: el cacho va boca abajo SOBRE la mesa, frente al
            personaje, sostenido por sus dos manos y tapando los dados. Al dudar
            se desliza al costado (sin voltearse) dejando ver los dados de abajo. */}
        <div className="seat__table">
          {player.eliminated ? (
            <span className="text-bone/30 text-[10px]">sin dados</span>
          ) : (
            <>
              {/* Dados debajo del cacho: solo visibles al revelar. */}
              {reveal && <div className="seat__dice">{renderDice(26)}</div>}

              {/* Cacho boca abajo (sus 2 manos vienen en el componente Cup). */}
              <div className={['seat__cup', reveal ? 'seat__cup--away' : ''].join(' ')}>
                <Cup size={52} revealed={false} />
              </div>
            </>
          )}
        </div>

        {/* Badges */}
        <div className="seat__badges">
          {isTurn && <span className="badge badge--turn">TURNO</span>}
          {isObligado && (
            <span className="badge badge--obligado">
              {OBLIGA_LABELS[state.obliga?.mode] || 'Obliga'}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Modo normal (fallback, no usado en la mesa) ──
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
          {isTurn && <span className="badge badge--turn">TURNO</span>}
          {isObligado && <span className="badge badge--obligado">Último dado</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[40px] items-center">{renderDice(36)}</div>
    </div>
  );
}
