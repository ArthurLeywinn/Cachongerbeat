import React, { useEffect, useState } from 'react';

const isDev = import.meta.env.DEV;
const SERVER = isDev ? import.meta.env.VITE_SERVER_URL || 'http://localhost:3001' : '';

// Tarjeta flotante con el perfil público de un jugador (ELO, partidas, winrate).
// Estilo chess.com: clic en cualquier nombre → mini-perfil. Reutilizable desde
// la mesa, el lobby, el ranking y el historial.
export default function PlayerProfile({ username, onClose }) {
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
