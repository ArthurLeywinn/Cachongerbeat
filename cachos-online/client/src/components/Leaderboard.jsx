import React, { useEffect, useState } from 'react';

const isDev = import.meta.env.DEV;
const SERVER = isDev ? import.meta.env.VITE_SERVER_URL || 'http://localhost:3001' : '';

export default function Leaderboard({ onBack }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/leaderboard`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setPlayers(res.players);
      })
      .finally(() => setLoading(false));
  }, []);

  const winRate = (p) =>
    p.games_played > 0 ? Math.round((p.games_won / p.games_played) * 100) : 0;

  return (
    <div className="clean-bg">
      <div className="clean-card" style={{ maxWidth: 480 }}>
        <button onClick={onBack} className="clean-back mb-4">← Volver</button>
        <h2 className="font-display text-2xl font-black text-amber-glow mb-5 text-center">
          Ranking · Ranked
        </h2>

        {loading ? (
          <p className="text-bone/40 text-center text-sm py-8">Cargando ranking…</p>
        ) : players.length === 0 ? (
          <p className="text-bone/40 text-center text-sm py-8">
            Aún no hay partidas ranked registradas.
          </p>
        ) : (
          <div className="space-y-2">
            {players.map((p, i) => (
              <div
                key={p.username}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/20"
              >
                {/* Posición */}
                <span
                  className={[
                    'w-7 text-center font-display font-black text-sm shrink-0',
                    i === 0 ? 'text-amber-glow' : i === 1 ? 'text-bone/60' : i === 2 ? 'text-amber-700' : 'text-bone/30',
                  ].join(' ')}
                >
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>

                {/* Avatar inicial */}
                <div className="w-8 h-8 shrink-0 rounded-full bg-amber-glow/20 grid place-items-center text-amber-glow font-bold text-sm">
                  {p.username.charAt(0).toUpperCase()}
                </div>

                {/* Nombre */}
                <span className="font-medium flex-1 truncate">{p.username}</span>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <p className="font-display font-black text-amber-glow text-lg leading-none">{p.elo}</p>
                  <p className="text-[10px] text-bone/30 leading-none mt-0.5">
                    {p.games_played} partidas · {winRate(p)}% ganadas
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
