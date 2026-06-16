import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Die from './Die.jsx';

// Modos casuales: mismas reglas que fija el servidor (CASUAL_MODES). Cambian la
// velocidad; en clásico se puede calzar con la regla normal (mitad o más).
const MODES = [
  { id: 'clasico', icon: '🎲', name: 'Clásico', desc: 'Sin reloj · se puede calzar' },
  { id: 'rapido', icon: '⚡', name: 'Rápido', desc: '30s por turno · pasar' },
  { id: 'relampago', icon: '🔥', name: 'Relámpago', desc: '15s · calzo infinito · pasar' },
];
const SIZES = [3, 4, 5, 6];

// Navegador de partidas casuales (no afectan el ranking). Eliges un modo y ves
// las salas públicas abiertas de ese modo; te unes a una o creas/buscar una de
// 3, 4, 5 o 6 jugadores. La sala arranca sola cuando se llena.
export default function MatchBrowser({ onBack }) {
  const { listMatches, quickMatch, joinPublicLobby, connected } = useGame();
  const { user } = useAuth() || {};
  const [mode, setMode] = useState('clasico');
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  const myName = user?.username || 'Jugador';

  // Refresca la lista al entrar, al cambiar de modo y cada 3 s.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const list = await listMatches(mode);
      if (alive) { setLobbies(list); setLoading(false); }
    };
    setLoading(true);
    refresh();
    pollRef.current = setInterval(refresh, 3000);
    return () => { alive = false; clearInterval(pollRef.current); };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const doQuick = async (size) => {
    setBusy(true);
    await quickMatch(mode, size, myName); // si entra, App pasa al Lobby solo
    setBusy(false);
  };

  const doJoin = async (code) => {
    setBusy(true);
    await joinPublicLobby(code, myName);
    setBusy(false);
  };

  const modeMeta = (id) => MODES.find((m) => m.id === id) || MODES[0];

  return (
    <div className="clean-bg">
      <div className="clean-card" style={{ maxWidth: 480 }}>
        <button onClick={onBack} className="clean-back">← Volver</button>
        <h2 className="font-display text-2xl font-black text-amber-glow mb-1">Buscar partida</h2>
        <p className="text-bone/40 text-xs mb-5 tracking-widest uppercase">
          Partidas casuales · no afectan el ranking
        </p>

        {/* Selector de modo */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {MODES.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={[
                  'rounded-xl px-2 py-2.5 border text-center transition',
                  active ? 'border-amber-glow/60 bg-amber-glow/10' : 'border-bone/10 bg-black/15 hover:border-bone/25',
                ].join(' ')}
              >
                <p className="text-sm font-bold text-bone flex items-center justify-center gap-1">
                  <span>{m.icon}</span> {m.name}
                </p>
                <p className="text-[9px] text-bone/40 mt-0.5 leading-tight">{m.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Lobbys abiertos disponibles */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-wide text-bone/50">Salas abiertas</label>
          <span className="text-[10px] text-bone/30">{modeMeta(mode).name}</span>
        </div>

        <div className="space-y-2 mb-5 min-h-[88px]">
          {loading ? (
            <p className="text-bone/30 text-sm text-center py-6">Buscando salas…</p>
          ) : lobbies.length === 0 ? (
            <p className="text-bone/30 text-sm text-center py-6 leading-relaxed">
              No hay salas abiertas de este modo.<br />
              <span className="text-bone/40">Crea una abajo y otros se unirán.</span>
            </p>
          ) : (
            lobbies.map((l) => (
              <div key={l.code} className="flex items-center justify-between bg-black/25 rounded-xl px-3 py-2.5 border border-bone/10">
                <div className="min-w-0">
                  <p className="text-sm text-bone font-semibold truncate">
                    Sala de {l.host}
                  </p>
                  <p className="text-[11px] text-bone/40">
                    {modeMeta(l.mode).icon} {modeMeta(l.mode).name} ·{' '}
                    <span className="text-amber-glow/80 font-bold">{l.count}/{l.size}</span> jugadores
                  </p>
                </div>
                <button
                  onClick={() => doJoin(l.code)}
                  disabled={busy || !connected}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-glow/15 text-amber-glow border border-amber-glow/30 hover:bg-amber-glow/25 transition disabled:opacity-40"
                >
                  Unirse
                </button>
              </div>
            ))
          )}
        </div>

        {/* Crear / buscar por tamaño */}
        <label className="block text-xs uppercase tracking-wide text-bone/50 mb-2">
          Buscar partida nueva de…
        </label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {SIZES.map((n) => (
            <button
              key={n}
              onClick={() => doQuick(n)}
              disabled={busy || !connected}
              className="py-3 rounded-xl font-display text-xl font-black bg-black/25 text-bone/70 border border-bone/15 hover:border-amber-glow/50 hover:text-amber-glow transition disabled:opacity-40"
              title={`Buscar/crear partida de ${n} jugadores`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-bone/30 text-center mb-2">
          Te une a una sala abierta de ese tamaño o crea una nueva. Arranca sola al llenarse.
        </p>

        <div className="flex justify-center gap-1.5 mt-3 opacity-60">
          <Die value={2} size={22} /><Die value={4} size={22} /><Die value={6} size={22} />
        </div>

        {!connected && <p className="text-red-400 text-xs mt-3 text-center">Conectando al servidor…</p>}
      </div>
    </div>
  );
}
