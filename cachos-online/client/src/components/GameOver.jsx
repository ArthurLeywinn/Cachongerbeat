import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import Character from './Character.jsx';
import Die from './Die.jsx';

// Paleta para distinguir jugadores en el gráfico del resumen.
const CHART_COLORS = ['#f4b840', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c'];

// ─── Gráfico: dados por jugador a lo largo de las rondas ─────────────────────
// La versión cachera del "gráfico de evaluación" de chess.com: muestra cómo
// fue subiendo y bajando cada jugador durante la partida.
function DiceChart({ history, players, colorOf }) {
  if (!history || history.length < 2) return null;

  const W = 360, H = 130, PAD = { l: 22, r: 8, t: 10, b: 18 };
  const maxDice = Math.max(1, ...history.flatMap((h) => h.dice.map((d) => d.n)));
  const n = history.length;

  const x = (i) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - (v / maxDice) * (H - PAD.t - PAD.b);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Dados por ronda">
      {/* Rejilla horizontal */}
      {Array.from({ length: maxDice + 1 }).map((_, v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          <text x={PAD.l - 5} y={y(v) + 3} fontSize="8" fill="rgba(243,236,223,0.35)" textAnchor="end">{v}</text>
        </g>
      ))}
      {/* Una línea por jugador */}
      {players.map((p) => {
        const pts = history.map((h, i) => {
          const d = h.dice.find((e) => e.id === p.id);
          return `${x(i)},${y(d ? d.n : 0)}`;
        });
        return (
          <polyline
            key={p.id}
            points={pts.join(' ')}
            fill="none"
            stroke={colorOf(p.id)}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.9"
          />
        );
      })}
      <text x={W / 2} y={H - 4} fontSize="8" fill="rgba(243,236,223,0.35)" textAnchor="middle">
        Rondas →
      </text>
    </svg>
  );
}

// ─── Tabla de estadísticas por jugador ────────────────────────────────────────
function StatsTable({ players, colorOf, playerId }) {
  const rows = [
    { key: 'bids', label: 'Apuestas' },
    { key: 'doubts', label: 'Dudas ✓/✗', fmt: (s) => `${s.doubtsWon}/${s.doubtsLost}` },
    { key: 'calzas', label: 'Calzas ✓/✗', fmt: (s) => `${s.calzasWon}/${s.calzasLost}` },
    { key: 'passes', label: 'Pasos (faroles ✓)', fmt: (s) => `${s.passes} (${s.passesSurvived})` },
    { key: 'diceLost', label: 'Dados perdidos' },
    { key: 'diceGained', label: 'Dados ganados' },
  ];

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[11px]">
        <thead>
          <tr>
            <th className="text-left text-bone/40 font-normal pb-1 pr-2"> </th>
            {players.map((p) => (
              <th key={p.id} className="pb-1 px-1 font-semibold" style={{ color: colorOf(p.id) }}>
                {p.name.length > 8 ? `${p.name.slice(0, 8)}…` : p.name}
                {p.id === playerId ? ' (tú)' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-white/5">
              <td className="text-left text-bone/50 py-1 pr-2 whitespace-nowrap">{r.label}</td>
              {players.map((p) => {
                const s = p.stats || {};
                return (
                  <td key={p.id} className="py-1 px-1 text-center text-bone/80 font-display font-bold">
                    {r.fmt ? r.fmt(s) : (s[r.key] ?? 0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pantalla de fin de partida ───────────────────────────────────────────────
// Estilo chess.com: ganador + posiciones, botones Revancha / Nueva partida y
// pestaña de Resumen (gráfico de dados por ronda + estadísticas).
export default function GameOver() {
  const { state, playerId, leave, rematch } = useGame();
  const [tab, setTab] = useState('standings'); // 'standings' | 'summary'
  const [rematchAsked, setRematchAsked] = useState(false);
  const [busy, setBusy] = useState(false);

  // Hooks siempre antes de cualquier return condicional.
  const players = state?.players || [];
  const colorOf = useMemo(() => {
    const map = {};
    players.forEach((p, i) => { map[p.id] = CHART_COLORS[i % CHART_COLORS.length]; });
    return (id) => map[id] || '#f3ecdf';
  }, [players]);

  if (!state || state.status !== 'finished') return null;

  const standings = state.finalStandings || [];
  const winner = standings.find((s) => s.isWinner) || standings[0] || null;
  const ranked = !!state.ranked;
  const deltasPending = ranked && standings.length > 0 && standings.every((s) => s.eloDelta == null);
  const me = players.find((p) => p.id === playerId);
  const isHost = !!me?.isHost;
  const requests = state.rematchRequests || [];

  const deltaBadge = (d) => {
    if (d == null) return <span className="text-bone/30 text-xs">…</span>;
    const pos = d >= 0;
    return (
      <span className={['font-display font-black text-sm', pos ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
        {pos ? `+${d}` : d}
      </span>
    );
  };

  const handleRematch = async () => {
    setBusy(true);
    const res = await rematch();
    setBusy(false);
    if (res.ok && res.requested) setRematchAsked(true);
    // Si el anfitrión la inicia, el nuevo estado 'playing' cierra este modal solo.
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <div className="glass rounded-3xl p-7 text-center shadow-cup animate-pop w-full max-w-md">
        {/* ── Ganador destacado ── */}
        <div className="flex justify-center gap-2 mb-3">
          <Die value={1} size={32} highlight />
          <Die value={6} size={32} />
          <Die value={1} size={32} highlight />
        </div>
        <p className="text-bone/50 uppercase tracking-widest text-xs mb-3">
          Fin de la partida{ranked && ' · Ranked'}
        </p>

        {winner && (
          <div className="mb-4">
            <div className="inline-block relative">
              <Character
                hood={winner.cosmetic?.hood ?? 0}
                face={9}
                body={winner.cosmetic?.body ?? 0}
                hat={winner.cosmetic?.hat ?? 0}
                acc={winner.cosmetic?.acc ?? 0}
                size={100}
              />
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl">👑</span>
            </div>
            <h2 className="font-display text-3xl font-black text-amber-glow mt-1">
              ¡{winner.name} gana!
            </h2>
          </div>
        )}

        {/* ── Pestañas Posiciones / Resumen ── */}
        <div className="flex gap-1 bg-black/25 rounded-xl p-1 mb-4">
          {[
            { id: 'standings', label: 'Posiciones' },
            { id: 'summary', label: 'Resumen' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition',
                tab === t.id ? 'bg-amber-glow text-felt-900' : 'text-bone/50 hover:text-bone',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'standings' && (
          <div className="space-y-2 mb-5 text-left">
            {standings.map((s) => (
              <div
                key={s.id}
                className={[
                  'flex items-center justify-between px-4 py-2.5 rounded-xl',
                  s.isWinner ? 'bg-amber-glow/15 border border-amber-glow/30' : 'bg-black/25',
                ].join(' ')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={[
                    'w-7 h-7 rounded-full grid place-items-center font-display font-black text-sm shrink-0',
                    s.place === 1 ? 'bg-amber-glow text-felt-900' : 'bg-white/10 text-bone/60',
                  ].join(' ')}>
                    {s.place}
                  </span>
                  <span className="font-medium truncate">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: colorOf(s.id) }} />
                    {s.name}
                    {s.id === playerId && <span className="text-bone/40 text-xs"> (tú)</span>}
                  </span>
                </div>
                {ranked && (
                  <div className="flex items-center gap-2 shrink-0">
                    {deltaBadge(s.eloDelta)}
                    {s.newElo != null && <span className="text-[11px] text-bone/40">→ {s.newElo}</span>}
                  </div>
                )}
              </div>
            ))}
            {deltasPending && (
              <p className="text-[11px] text-bone/40 text-center pt-1">Calculando cambios de ELO…</p>
            )}
          </div>
        )}

        {tab === 'summary' && (
          <div className="mb-5 text-left space-y-4">
            <div className="bg-black/25 rounded-xl p-3">
              <p className="text-[10px] text-bone/40 uppercase tracking-widest mb-1">Dados por ronda</p>
              <DiceChart history={state.roundHistory} players={players} colorOf={colorOf} />
            </div>
            <div className="bg-black/25 rounded-xl p-3">
              <p className="text-[10px] text-bone/40 uppercase tracking-widest mb-2">Estadísticas</p>
              <StatsTable players={players} colorOf={colorOf} playerId={playerId} />
            </div>
          </div>
        )}

        {/* ── Acciones: Revancha / Nueva partida ── */}
        {requests.length > 0 && isHost && (
          <p className="text-[11px] text-amber-glow/80 mb-2">
            {requests.join(', ')} {requests.length === 1 ? 'pide' : 'piden'} revancha
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleRematch}
            disabled={busy || rematchAsked}
            className="flex-1 px-4 py-3 rounded-xl bg-amber-glow text-felt-900 font-bold hover:brightness-105 transition disabled:opacity-50"
            title={isHost ? 'Jugar de nuevo con los mismos jugadores' : 'Pedirle la revancha al anfitrión'}
          >
            {rematchAsked ? 'Revancha pedida ✓' : busy ? '…' : isHost ? '⚔ Revancha' : 'Pedir revancha'}
          </button>
          <button
            onClick={leave}
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-bone font-bold hover:bg-white/15 transition"
            title="Volver al menú principal"
          >
            Salir
          </button>
        </div>
        {!isHost && !rematchAsked && (
          <p className="text-[10px] text-bone/30 mt-2">La revancha la inicia el anfitrión · tu petición le aparecerá aquí</p>
        )}
      </div>
    </div>
  );
}
