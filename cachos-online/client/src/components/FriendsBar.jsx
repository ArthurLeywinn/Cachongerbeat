import React, { useCallback, useEffect, useState } from 'react';
import { socket } from '../socket.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useGame } from '../context/GameContext.jsx';

const isDev = import.meta.env.DEV;
const SERVER = isDev ? import.meta.env.VITE_SERVER_URL || 'http://localhost:3001' : '';

const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
);
const IconFriends = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

const STATUS_META = {
  menu: { dot: '#34d399', label: 'En el menú' },
  lobby: { dot: '#38bdf8', label: 'En sala de espera' },
  playing: { dot: '#f4b840', label: 'En partida' },
  offline: { dot: '#6b7280', label: 'Desconectado' },
};

// Barra de la esquina superior derecha: campana (notificaciones) + amigos.
export default function FriendsBar() {
  const { user, token } = useAuth() || {};
  const { joinRoom } = useGame();
  const [open, setOpen] = useState(null); // null | 'bell' | 'friends'
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]); // solicitudes recibidas
  const [invites, setInvites] = useState([]);   // invitaciones a salas (en vivo)
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState(null);
  const [msg, setMsg] = useState(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const refresh = useCallback(() => {
    if (!token) return;
    fetch(`${SERVER}/friends`, { headers: authHeaders })
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) {
          setFriends(res.friends || []);
          setIncoming(res.incoming || []);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  // Eventos en tiempo real: estado de amigos + notificaciones.
  useEffect(() => {
    function onStatus(payload) {
      setFriends((fs) => fs.map((f) => (f.userId === payload.userId
        ? { ...f, status: payload.status, code: payload.code }
        : f)));
    }
    function onNotify(n) {
      if (n.type === 'request') {
        setIncoming((list) => list.some((r) => r.userId === n.from.userId)
          ? list
          : [...list, { userId: n.from.userId, username: n.from.username }]);
      } else if (n.type === 'invite') {
        setInvites((list) => [...list.filter((i) => i.code !== n.code), { from: n.from, code: n.code }]);
      } else if (n.type === 'accepted') {
        refresh();
      }
    }
    socket.on('friends:status', onStatus);
    socket.on('friends:notify', onNotify);
    return () => {
      socket.off('friends:status', onStatus);
      socket.off('friends:notify', onNotify);
    };
  }, [refresh]);

  if (!user) return null;

  const badge = incoming.length + invites.length;

  const respond = async (requesterId, accept) => {
    await fetch(`${SERVER}/friends/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ requesterId, accept }),
    });
    setIncoming((list) => list.filter((r) => r.userId !== requesterId));
    refresh();
  };

  const search = async () => {
    const q = searchQ.trim();
    if (q.length < 2) { setResults([]); return; }
    const res = await fetch(`${SERVER}/friends/search?q=${encodeURIComponent(q)}`, { headers: authHeaders })
      .then((r) => r.json()).catch(() => null);
    setResults(res?.ok ? res.users : []);
  };

  const sendRequest = async (username) => {
    setMsg(null);
    const res = await fetch(`${SERVER}/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ username }),
    }).then((r) => r.json()).catch(() => ({ error: 'Error de red.' }));
    setMsg(res.ok ? `Solicitud enviada a ${username}.` : res.error);
  };

  const joinFriendLobby = (code) => {
    setOpen(null);
    joinRoom(code, user.username);
  };

  const toggle = (panel) => setOpen((o) => (o === panel ? null : panel));

  return (
    <div className="friends-bar">
      {/* Campana de notificaciones */}
      <button className="friends-icon-btn" onClick={() => toggle('bell')} title="Notificaciones">
        <IconBell />
        {badge > 0 && <span className="friends-badge">{badge}</span>}
      </button>

      {/* Amigos */}
      <button className="friends-icon-btn" onClick={() => toggle('friends')} title="Amigos">
        <IconFriends />
      </button>

      {/* ── Panel de notificaciones ── */}
      {open === 'bell' && (
        <div className="friends-panel glass">
          <p className="friends-panel__title">Notificaciones</p>
          {incoming.length === 0 && invites.length === 0 && (
            <p className="text-bone/35 text-xs py-3 text-center">No tienes notificaciones.</p>
          )}
          {incoming.map((r) => (
            <div key={r.userId} className="friends-row">
              <span className="text-sm min-w-0 truncate">
                <span className="text-amber-glow font-semibold">{r.username}</span>
                <span className="text-bone/50"> quiere ser tu amigo</span>
              </span>
              <div className="flex gap-1 shrink-0">
                <button className="friends-mini-btn friends-mini-btn--ok" onClick={() => respond(r.userId, true)}>Aceptar</button>
                <button className="friends-mini-btn" onClick={() => respond(r.userId, false)}>Rechazar</button>
              </div>
            </div>
          ))}
          {invites.map((inv) => (
            <div key={inv.code} className="friends-row">
              <span className="text-sm min-w-0 truncate">
                <span className="text-amber-glow font-semibold">{inv.from.username}</span>
                <span className="text-bone/50"> te invitó a la sala </span>
                <span className="font-display font-bold tracking-widest">{inv.code}</span>
              </span>
              <button className="friends-mini-btn friends-mini-btn--ok shrink-0" onClick={() => joinFriendLobby(inv.code)}>
                Unirse
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Panel de amigos ── */}
      {open === 'friends' && (
        <div className="friends-panel glass">
          <p className="friends-panel__title">Amigos</p>

          {friends.length === 0 && (
            <p className="text-bone/35 text-xs py-2 text-center">Aún no tienes amigos agregados.</p>
          )}
          {friends.map((f) => {
            const meta = STATUS_META[f.status] || STATUS_META.offline;
            return (
              <div key={f.userId} className="friends-row">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="friends-dot" style={{ background: meta.dot }} />
                  <span className="text-sm font-semibold truncate">{f.username}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  {f.status === 'lobby' && f.code ? (
                    <button className="friends-mini-btn friends-mini-btn--ok" onClick={() => joinFriendLobby(f.code)}>
                      Unirse
                    </button>
                  ) : (
                    <span className="text-[11px] text-bone/40">{meta.label}</span>
                  )}
                </span>
              </div>
            );
          })}

          {/* Buscar usuarios para agregar */}
          <div className="border-t border-bone/10 mt-3 pt-3">
            <p className="text-[10px] text-bone/40 uppercase tracking-widest mb-2">Agregar amigos</p>
            <div className="flex gap-1.5">
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="Buscar usuario…"
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/10 focus:border-amber-glow/60 outline-none text-sm text-bone placeholder:text-bone/30"
              />
              <button onClick={search} className="friends-mini-btn friends-mini-btn--ok">Buscar</button>
            </div>
            {results && results.length === 0 && (
              <p className="text-bone/35 text-xs mt-2">Sin resultados.</p>
            )}
            {(results || []).map((u) => (
              <div key={u.id} className="friends-row">
                <span className="text-sm truncate">{u.username} <span className="text-bone/35 text-[11px]">ELO {u.elo}</span></span>
                <button className="friends-mini-btn friends-mini-btn--ok shrink-0" onClick={() => sendRequest(u.username)}>
                  Agregar
                </button>
              </div>
            ))}
            {msg && <p className="text-xs text-bone/60 mt-2">{msg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
