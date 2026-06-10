import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const isDev = import.meta.env.DEV;
const SERVER = isDev ? import.meta.env.VITE_SERVER_URL || 'http://localhost:3001' : '';

// Modal con el perfil público de un jugador (ELO, partidas, winrate).
function PlayerProfile({ username, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(`${SERVER}/profile/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((res) => (res.ok ? setData(res.user) : setError(res.error || 'No se pudo cargar.')))
      .catch(() => setError('No se pudo cargar el perfil.'));
  }, [username]);

  const winRate = data && data.games_played > 0
    ? Math.round((data.games_won / data.games_played) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-xs text-center animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-glow/20 grid place-items-center text-amber-glow font-display font-black text-2xl mb-3">
          {username.charAt(0).toUpperCase()}
        </div>
        <h3 className="font-display text-xl font-black text-amber-glow mb-4">{username}</h3>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {!data && !error && <p className="text-bone/40 text-sm mb-3">Cargando…</p>}
        {data && (
          <div className="grid grid-cols-2 gap-2 mb-4 text-left">
            <div className="bg-black/25 rounded-lg px-3 py-2">
              <p className="text-[10px] text-bone/40 uppercase tracking-wider">ELO</p>
              <p className="font-display font-black text-lg text-amber-glow">{data.elo}</p>
            </div>
            <div className="bg-black/25 rounded-lg px-3 py-2">
              <p className="text-[10px] text-bone/40 uppercase tracking-wider">Winrate</p>
              <p className="font-display font-black text-lg">{winRate}%</p>
            </div>
            <div className="bg-black/25 rounded-lg px-3 py-2">
              <p className="text-[10px] text-bone/40 uppercase tracking-wider">Jugadas</p>
              <p className="font-display font-black text-lg">{data.games_played}</p>
            </div>
            <div className="bg-black/25 rounded-lg px-3 py-2">
              <p className="text-[10px] text-bone/40 uppercase tracking-wider">Ganadas</p>
              <p className="font-display font-black text-lg">{data.games_won}</p>
            </div>
          </div>
        )}
        <button onClick={onClose} className="text-sm text-bone/50 hover:text-bone transition">Cerrar</button>
      </div>
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
