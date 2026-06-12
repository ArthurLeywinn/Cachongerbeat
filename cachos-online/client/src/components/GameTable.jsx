import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import PlayerSeat from './PlayerSeat.jsx';
import BidPanel from './BidPanel.jsx';
import ActionLog from './ActionLog.jsx';
import ChatPanel from './ChatPanel.jsx';
import RoundResult from './RoundResult.jsx';
import ObligaChooser from './ObligaChooser.jsx';
import GameOver from './GameOver.jsx';
import PlayerProfile from './PlayerProfile.jsx';
import { bidText } from '../lib/rules.js';
import { sounds, isMuted, toggleMuted } from '../lib/sounds.js';
import Die from './Die.jsx';

// Reparto horizontal (en % del ancho) de los oponentes a lo largo del borde
// superior de la mesa. Soporta hasta 5 oponentes (6 jugadores en total).
function seatXPercents(total) {
  const layouts = {
    1: [50],
    2: [28, 72],
    3: [20, 50, 80],
    4: [15, 38, 62, 85],
    5: [12, 31, 50, 69, 88],
  };
  const clamped = Math.min(Math.max(total, 1), 5);
  return layouts[clamped] || layouts[5];
}

// Escala del asiento según cuántos oponentes hay: en 1v1 el rival es grande
// (protagonismo de duelo); con la mesa llena se achican para no amontonarse.
function seatScale(opponents) {
  const scales = { 1: 1.5, 2: 1.3, 3: 1.12, 4: 0.95, 5: 0.8 };
  return scales[Math.min(Math.max(opponents, 1), 5)] || 1;
}

// La mesa (.big-table) es un óvalo: top 26%, ancho 150%, alto 150%, redondeado
// al 50%. Calculamos la altura (%) del borde superior del óvalo en una posición
// horizontal dada, para "sentar" a cada jugador justo sobre la curva.
function tableRimTopPct(xPct) {
  // Mesa: top 34%, ancho 118%, alto 124% → centro (50, 96), radios (59, 62).
  const cx = 50, cy = 96, rx = 59, ry = 62; // mismos números que el CSS
  const nx = (xPct - cx) / rx;
  const k = Math.max(0, 1 - nx * nx);
  return cy - ry * Math.sqrt(k); // % de la altura del área de juego
}

// ── Objetos decorativos sobre el fieltro (ambiente de partida de cachos) ──
function TableProps() {
  return (
    <div className="table-props" aria-hidden="true">
      {/* Cenicero */}
      <svg className="prop" style={{ left: '33%', top: '57%' }} width="52" height="30" viewBox="0 0 52 30">
        <ellipse cx="26" cy="17" rx="23" ry="11" fill="#565e66" />
        <ellipse cx="26" cy="14" rx="23" ry="11" fill="#7b848d" />
        <ellipse cx="26" cy="14" rx="15" ry="6.5" fill="#3c4248" />
        <path d="M9 9 l6 3 M43 9 l-6 3 M26 3.5 l0 5" stroke="#565e66" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="22" cy="13" rx="4" ry="1.6" fill="#8e979f" opacity="0.7" />
      </svg>
      {/* Vaso bajo con pisco + posavasos */}
      <svg className="prop" style={{ left: '66%', top: '54%' }} width="40" height="46" viewBox="0 0 40 46">
        <ellipse cx="20" cy="40" rx="17" ry="5" fill="#6e4a2b" opacity="0.9" />
        <ellipse cx="20" cy="38.5" rx="17" ry="5" fill="#8a5f38" />
        <path d="M8 8 L11 36 Q20 40 29 36 L32 8 Z" fill="rgba(220,235,245,0.28)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <path d="M10 18 L12 35 Q20 38.5 28 35 L30 18 Q20 22 10 18 Z" fill="#c98a2e" opacity="0.85" />
        <ellipse cx="20" cy="18.5" rx="10" ry="3" fill="#e8ab4a" opacity="0.9" />
        <path d="M11 10 L12.5 30" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {/* Platito de maní */}
      <svg className="prop" style={{ left: '59%', top: '66%' }} width="48" height="26" viewBox="0 0 48 26">
        <ellipse cx="24" cy="16" rx="21" ry="8.5" fill="#9a8c74" />
        <ellipse cx="24" cy="13.5" rx="21" ry="8.5" fill="#cfc2a6" />
        <ellipse cx="24" cy="13.5" rx="16" ry="6" fill="#b3a384" />
        {[[15,12],[22,10],[29,12],[18,15],[26,15],[33,13],[22,13]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2.3" fill="#caa05c" stroke="#9c7335" strokeWidth="0.8" transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
      </svg>
      {/* Segundo vaso (cerveza pequeña), lado izquierdo */}
      <svg className="prop" style={{ left: '40%', top: '66%' }} width="32" height="42" viewBox="0 0 32 42">
        <ellipse cx="16" cy="37" rx="12" ry="3.6" fill="rgba(0,0,0,0.28)" />
        <path d="M6 6 L8 34 Q16 37.5 24 34 L26 6 Z" fill="rgba(220,235,245,0.25)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" />
        <path d="M7.5 12 L9 33 Q16 36 23 33 L24.5 12 Q16 15 7.5 12 Z" fill="#d8a23a" opacity="0.85" />
        <ellipse cx="16" cy="11.5" rx="8.6" ry="3" fill="#f3e3c0" />
        <path d="M8.5 8 L9.5 28" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
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

// Hook: dispara los efectos de sonido según los cambios de estado del juego.
function useGameSounds(state, playerId) {
  const prev = useRef({ turnId: null, phase: null, bidKey: null, status: null, round: null });
  useEffect(() => {
    if (!state) return;
    const p = prev.current;
    const bidKey = state.currentBid
      ? `${state.currentBid.playerId}:${state.currentBid.quantity}:${state.currentBid.face ?? 'x'}`
      : null;

    // Fin de partida: fanfarria o derrota.
    if (state.status === 'finished' && p.status !== 'finished') {
      if (state.winnerId === playerId) sounds.win();
      else sounds.lose();
    } else if (state.phase === 'reveal' && p.phase !== 'reveal') {
      // Revelación: dados rodando + resultado personal.
      sounds.roll();
      const r = state.lastResult;
      if (r?.gainerId === playerId) setTimeout(() => sounds.gainDie(), 600);
      else if (r?.loserId === playerId) setTimeout(() => sounds.loseDie(), 600);
      else if (r?.type === 'kamikaze' && (r.losses || []).some((l) => l.id === playerId)) {
        setTimeout(() => sounds.loseDie(), 600);
      }
    } else if (state.phase === 'bidding') {
      // Ronda nueva: todos agitan el cacho y tiran los dados.
      if (state.status === 'playing' && state.round !== p.round) sounds.shake();
      // Apuesta nueva de otro jugador.
      if (bidKey && bidKey !== p.bidKey && state.currentBid.playerId !== playerId) sounds.bid();
      // Me toca a mí.
      if (state.currentTurnId === playerId && p.turnId !== playerId) sounds.myTurn();
    }

    prev.current = { turnId: state.currentTurnId, phase: state.phase, bidKey, status: state.status, round: state.round };
  }, [state, playerId]);
}

export default function GameTable() {
  const { state, playerId, leave, resign } = useGame();
  const bubbles = useSpeechBubbles(state?.chat);
  const [muted, setMuted] = useState(isMuted());
  const [confirmResign, setConfirmResign] = useState(false);
  const [profileOf, setProfileOf] = useState(null); // username del perfil abierto
  useGameSounds(state, playerId);
  if (!state) return null;

  const me = state.players.find((p) => p.id === playerId);
  // Oponentes rotados según el orden de turnos: el jugador que sigue después
  // de mí (+1 en seatOrder) se sienta en el extremo IZQUIERDO de la mesa, el
  // que juega justo antes que yo, en el DERECHO. Así "jugar a la izquierda"
  // corre visualmente hacia la izquierda para todos (antes estaba al revés
  // porque los asientos seguían el orden de llegada, no el de turnos).
  const meIdx = state.players.findIndex((p) => p.id === playerId);
  const others = meIdx >= 0
    ? [...state.players.slice(meIdx + 1), ...state.players.slice(0, meIdx)]
    : state.players.filter((p) => p.id !== playerId);
  const finished = state.status === 'finished';
  const winner = finished ? state.players.find((p) => p.id === state.winnerId) : null;
  const totalDice = state.players.reduce((sum, p) => sum + (p.eliminated ? 0 : p.diceCount), 0);
  const xs = seatXPercents(others.length);
  const scale = seatScale(others.length);
  const myDieSize = others.length === 1 ? 62 : others.length >= 4 ? 44 : 52;
  const myBubble = bubbles[playerId]?.text || null;
  const bidderName = state.currentBid
    ? state.players.find((p) => p.id === state.currentBid.playerId)?.name
    : null;
  const canResign = state.status === 'playing' && me && !me.eliminated;

  const handleResign = async () => {
    if (!confirmResign) {
      setConfirmResign(true);
      setTimeout(() => setConfirmResign(false), 4000);
      return;
    }
    setConfirmResign(false);
    await resign();
  };

  const theme = state.settings?.tableTheme || 'clasico';

  return (
    <div className={`table-scene theme-${theme}`}>
      {/* ── Barra superior ── */}
      <header className="table-header">
        <div className="flex items-center gap-3">
          <Die value={3} size={24} />
          <div>
            <h1 className="font-display text-xl font-black leading-none tracking-tight">Cachos</h1>
            <p className="text-[11px] text-bone/40">
              Sala <span className="text-amber-glow font-semibold tracking-widest">{state.code}</span>
              {' · '}Ronda {state.round}
              {state.status === 'playing' && (
                <span title={state.roundDirection === -1 ? 'Jugando hacia la derecha' : 'Jugando hacia la izquierda'}>
                  {' '}{state.roundDirection === -1 ? '→ derecha' : '← izquierda'}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hud-counter">
            <p className="text-[10px] text-bone/40 uppercase tracking-widest leading-none">Dados en juego</p>
            <p className="font-display text-2xl font-black text-amber-glow leading-none mt-0.5">{totalDice}</p>
          </div>
          <button
            onClick={() => setMuted(toggleMuted())}
            className="text-base text-bone/40 hover:text-bone/70 transition px-2 py-1 rounded border border-white/10 hover:border-white/20"
            title={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {canResign ? (
            <button
              onClick={handleResign}
              className={[
                'text-xs transition px-2 py-1 rounded border',
                confirmResign
                  ? 'text-red-300 border-red-400/60 bg-red-500/15'
                  : 'text-bone/40 hover:text-red-300 border-white/10 hover:border-red-400/40',
              ].join(' ')}
              title="Abandonar la partida (quedas eliminado y la mesa sigue)"
            >
              {confirmResign ? '¿Seguro? Rendirse' : 'Rendirse'}
            </button>
          ) : (
            <button onClick={leave} className="text-xs text-bone/40 hover:text-bone/70 transition px-2 py-1 rounded border border-white/10 hover:border-white/20">
              Salir
            </button>
          )}
        </div>
      </header>

      <RoundResult />

      {/* ── Escena de la mesa ── */}
      <div className="play-area">
        <div className="big-table" aria-hidden="true" />
        <div className="table-stitch" aria-hidden="true" />
        <TableProps />

        {/* Placa central con la apuesta vigente (sobre el fieltro) */}
        {state.status === 'playing' && (
          state.currentBid ? (
            <div className="bid-plaque" key={`${state.currentBid.quantity}-${state.currentBid.face ?? 'x'}-${state.currentBid.playerId}`}>
              <span className="bid-plaque__label">Apuesta actual</span>
              <span className="bid-plaque__value">{bidText(state.currentBid)}</span>
              {bidderName && <span className="bid-plaque__by">de {bidderName}</span>}
            </div>
          ) : state.phase === 'bidding' ? (
            <div className="bid-plaque bid-plaque--empty">
              <span className="bid-plaque__value">Esperando la primera apuesta…</span>
            </div>
          ) : null
        )}

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

        {/* Oponentes sentados sobre el borde curvo de la mesa (con su burbuja) */}
        {others.map((p, i) => {
          const x = xs[i];
          const rim = tableRimTopPct(x); // % donde está el borde de la mesa en esa x
          return (
            <div
              key={p.id}
              className="seat-slot"
              style={{
                left: `${x}%`,
                top: `${rim}%`,
                // El asiento crece hacia ARRIBA desde el borde: el cacho queda
                // apoyado en la mesa. -50% centra horizontalmente; -86% sube el
                // asiento dejando el cacho sobre la curva. La escala depende de
                // cuántos rivales hay (1v1 grandes → mesa llena chicos).
                transform: `translate(-50%, -86%) scale(${scale})`,
                animationDelay: `${i * 0.07}s`,
              }}
            >
              <PlayerSeat player={p} compact bubble={bubbles[p.id]?.text || null} onShowProfile={setProfileOf} />
            </div>
          );
        })}

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
                    size={myDieSize}
                    rolling={state.phase === 'reveal'}
                    highlight={
                      state.phase === 'reveal' && state.lastResult
                        ? (v === state.lastResult.bid?.face || (state.lastResult.bid?.face !== 1 && v === 1))
                        : false
                    }
                  />
                ))
              : Array.from({ length: me.diceCount }).map((_, i) => <Die key={i} value={null} size={myDieSize} />)}
          </div>
        )}
      </div>

      {/* Chat — lateral izquierdo, FUERA del play-area (overflow hidden lo cortaba) */}
      <ChatPanel />

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

      {/* ── Pantalla de fin de partida ── */}
      <GameOver />

      {/* Perfil público de un jugador (clic en su nombre) */}
      {profileOf && <PlayerProfile username={profileOf} onClose={() => setProfileOf(null)} />}
    </div>
  );
}
