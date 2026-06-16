import React from 'react';
import Die from './Die.jsx';
import Character, { Cup, HOOD_COUNT, FACE_COUNT, CUP_COUNT, BODY_COUNT, HAT_COUNT, ACC_COUNT } from './Character.jsx';
import TurnRing from './TurnRing.jsx';
import { useGame } from '../context/GameContext.jsx';

// Etiquetas cortas para el badge según la modalidad de Obliga activa.
const OBLIGA_LABELS = {
  kamikaze: 'Kamikaze',
  abierto: 'Abierto',
  cerradoA: 'De esta',
  cerradoB: 'Cerrado',
};

// Apariencia del personaje. Si el servidor envía `player.cosmetic`
// ({ hood, face, cup }) la usamos; si no, derivamos algo estable desde el id
// para que igual se vea variedad mientras no haya personalización guardada.
function cosmeticFor(player) {
  const c = player.cosmetic;
  if (c && (c.hood != null || c.face != null || c.cup != null || c.body != null || c.hat != null || c.acc != null)) {
    return {
      hood: (c.hood ?? 0) % HOOD_COUNT,
      face: (c.face ?? 0) % FACE_COUNT,
      cup: (c.cup ?? 0) % CUP_COUNT,
      body: (c.body ?? 0) % BODY_COUNT,
      hat: (c.hat ?? 0) % HAT_COUNT,
      acc: (c.acc ?? 0) % ACC_COUNT,
    };
  }
  let h = 0;
  for (let i = 0; i < player.id.length; i += 1) h = (h * 31 + player.id.charCodeAt(i)) >>> 0;
  return {
    hood: h % HOOD_COUNT,
    face: Math.floor(h / 7) % FACE_COUNT,
    cup: Math.floor(h / 53) % CUP_COUNT,
    body: 0,
    hat: 0,
    acc: 0,
  };
}

export default function PlayerSeat({ player, compact = false, bubble = null, onShowProfile = null, tilt = 0 }) {
  const { state } = useGame();
  const isTurn = state.currentTurnId === player.id && state.phase === 'bidding';
  const isObligado = state.obliga?.playerId === player.id;
  const reveal = state.phase === 'reveal' || state.phase === 'finished';
  const dice = player.dice;
  const highlightFace = reveal && state.lastResult ? state.lastResult.bid?.face : null;
  const cos = cosmeticFor(player);

  const renderDice = (size) => {
    if (player.eliminated) {
      return <span className="text-bone/30 text-[10px]">sin dados</span>;
    }
    // Solo mostramos valores reales si el servidor nos los envió (array con datos).
    // Para los rivales (dice == null) o estados sin valores, mostramos "?" según
    // su cantidad de dados, igual para todos.
    if (Array.isArray(dice) && dice.length > 0) {
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

        {/* Dados del jugador (ocultos como "?" mientras juega; reales al revelar),
            ARRIBA del personaje, junto a su nombre. */}
        <div className="seat__dice">{renderDice(24)}</div>

        {/* Nombre — clicable si el jugador tiene cuenta (abre su perfil) */}
        {player.hasAccount && onShowProfile ? (
          <button
            className="seat__name seat__name--link"
            onClick={() => onShowProfile(player.name)}
            title="Ver perfil"
          >
            {player.name}
            {!player.connected && <span className="seat__dc"> ·✕</span>}
          </button>
        ) : (
          <p className="seat__name">
            {player.name}
            {!player.connected && <span className="seat__dc"> ·✕</span>}
          </p>
        )}

        {/* Badges (TURNO / Obliga) — ARRIBA del personaje, junto al nombre, para
            que NO ocupen espacio bajo el cacho: así el cacho es el elemento más
            bajo del asiento y queda apoyado en la superficie de la mesa. */}
        <div className="seat__badges">
          {isTurn && <span className="badge badge--turn">TURNO</span>}
          {isObligado && (
            <span className="badge badge--obligado">
              {OBLIGA_LABELS[state.obliga?.mode] || 'Obliga'}
            </span>
          )}
        </div>

        {/* Personaje + cacho inclinados JUNTOS según el lugar en la mesa
            (pivote en la base, el punto donde el cacho toca el fieltro). El
            nombre y los dados quedan fuera de esta rotación → siempre derechos.
            La CABEZA tampoco se inclina: el componente Character la contrarrota
            (prop `tilt`) para dejarla perfectamente recta; solo el cuerpo, los
            brazos y el cacho siguen la curvatura de la mesa. */}
        <div className="seat__pose" style={{ transform: `rotate(${tilt}deg)` }}>
          {/* Personaje (+ anillo de tiempo si es su turno y la sala tiene reloj) */}
          <div className="seat__char" style={{ position: 'relative' }}>
            {isTurn && state.turnDeadline && (
              <TurnRing deadline={state.turnDeadline} totalSeconds={state.settings?.turnSeconds} size={108} />
            )}
            <Character hood={cos.hood} face={cos.face} body={cos.body} hat={cos.hat} acc={cos.acc} thinking={isTurn} size={92} arms tilt={tilt} />
          </div>

          {/* Cacho boca abajo, apoyado en la mesa frente al personaje (sus 2 manos
              vienen en el componente Cup). Al dudar se desliza al costado sin
              voltearse (animación de revelado). */}
          {!player.eliminated && (
            <div className={['seat__cup', reveal ? 'seat__cup--away' : ''].join(' ')}>
              <Cup size={46} revealed={false} style={cos.cup} />
            </div>
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
