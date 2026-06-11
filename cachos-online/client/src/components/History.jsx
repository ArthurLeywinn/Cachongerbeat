import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import PlayerProfile from './PlayerProfile.jsx';

const isDev = import.meta.env.DEV;
const SERVER = isDev ? import.meta.env.VITE_SERVER_URL || 'http://localhost:3001' : '';

// Curva de ELO de las últimas partidas (estilo gráfico de rating de chess.com).
function EloChart({ games }) {
  // games viene del más reciente al más antiguo → lo invertimos para el eje X.
  const pts = [...games].reverse().map((g) => g.eloAfter).filter((v) => v != null);
  if (pts.length < 2) return null;

  const W = 440, H = 110, PAD = { l: 34, r: 10, t: 12, b: 14 };
  const min = Math.min(...pts), max = Math.max(...pts);
  const span = Math.max(10, max - min);
  const lo = min - span * 0.15, hi = max + span * 0.15;
  const x = (i) => PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - ((v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = pts.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `${PAD.l},${H - PAD.b} ${line} ${x(pts.length - 1)},${H - PAD.b}`;
  const up = pts[pts.length - 1] >= pts[0];

  return (
    <div className="bg-black/25 rounded-xl p-3 mb-4">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[10px] text-bone/40 uppercase tracking-widest">Evolución de ELO</p>
        <p className="font-display font-black text-amber-glow">{pts[pts.length - 1]}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[lo + (hi - lo) * 0.25, lo + (hi - lo) * 0.5, lo + (hi - lo) * 0.75].map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
            <text x={PAD.l - 5} y={y(v) + 3} fontSize="8" fill="rgba(243,236,223,0.3)" textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <polygon points={area} fill={up ? 'rgba(52,211,153,0.10)' : 'rgba(248,113,113,0.10)'} />
        <polyline points={line} fill="none" stroke={up ? '#34d399' : '#f87171'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="#f4b840" />
        ))}
      </svg>
    </div>
  );
}

// "Mi historial": últimas partidas ranked del jugador autenticado.
export default function History({ onBack }) {
  const { token } = useAuth() || {};
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null); // username del perfil abierto

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${SERVER}/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.ok) setGames(res.games || []); })
      .finally(() => setLoading(false));
  }, [token]);

  const fmtDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  const resultLabel = (place) => (place === 1 ? 'Ganaste' : `${place}º lugar`);

  return (
    <div className="clean-bg">
      {viewing && <PlayerProfile username={viewing} onClose={() => setViewing(null)} />}
      <div className="clean-card" style={{ maxWidth: 520 }}>
        <button onClick={onBack} className="clean-back mb-4">← Volver</button>
        <h2 className="font-display text-2xl font-black text-amber-glow mb-5 text-center">
          Mi historial · Ranked
        </h2>

        {!loading && games.length >= 2 && <EloChart games={games} />}

        {loading && <p className="text-bone/40 text-center text-sm py-8">Cargando historial…</p>}
        {!loading && games.length === 0 && (
          <p className="text-bone/40 text-center text-sm py-8">
            Aún no tienes partidas ranked registradas.
          </p>
        )}

        <div className="space-y-3">
          {games.map((g) => (
            <div key={g.gameId} className="bg-black/25 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={[
                    'text-xs font-bold px-2 py-0.5 rounded-md',
                    g.place === 1 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-bone/60',
                  ].join(' ')}>
                    {resultLabel(g.place)}
                  </span>
                  <span className="text-[11px] text-bone/35">{fmtDate(g.date)}</span>
                </div>
                <span className={['font-display font-black', g.delta >= 0 ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                  {g.delta >= 0 ? `+${g.delta}` : g.delta}
                </span>
              </div>
              {/* Jugadores de la partida — toca uno para ver su perfil */}
              <div className="flex flex-wrap gap-1.5">
                {g.players.map((p) => (
                  <button
                    key={p.username}
                    onClick={() => setViewing(p.username)}
                    className={[
                      'text-[11px] px-2 py-1 rounded-md transition border',
                      p.isYou
                        ? 'border-amber-glow/40 text-amber-glow bg-amber-glow/10'
                        : 'border-bone/10 text-bone/60 hover:border-bone/30 hover:text-bone',
                    ].join(' ')}
                    title="Ver perfil"
                  >
                    {p.place}º {p.username}{p.isYou ? ' (tú)' : ''}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
