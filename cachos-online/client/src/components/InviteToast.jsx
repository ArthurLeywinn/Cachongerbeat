import React, { useEffect, useRef, useState } from 'react';
import { socket } from '../socket.js';
import { useGame } from '../context/GameContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { sounds } from '../lib/sounds.js';

const TTL_MS = 45000; // la invitación expira sola a los 45s

// ─── Invitaciones estilo League of Legends ────────────────────────────────────
// Tarjeta flotante arriba a la derecha que aparece EN CUALQUIER PANTALLA de la
// app (menú, perfil, personalizador, lobby…) cuando un amigo te invita a su
// sala: suena una campanita y puedes Aceptar (entras al tiro) o Rechazar.
// La campana de amigos sigue guardando la invitación por si la dejas pasar.
export default function InviteToast() {
  const { state, joinRoom, leave } = useGame();
  const { user } = useAuth() || {};
  const [invites, setInvites] = useState([]); // [{ id, from, code, note }]
  const timersRef = useRef(new Map());

  const dismiss = (id) => {
    clearTimeout(timersRef.current.get(id));
    timersRef.current.delete(id);
    setInvites((list) => list.filter((i) => i.id !== id));
  };

  useEffect(() => {
    const onNotify = (n) => {
      if (!n || n.type !== 'invite' || !n.code || !n.from) return;
      const id = `${n.from.userId}-${n.code}`;
      setInvites((list) => [{ id, from: n.from, code: n.code, note: null }, ...list.filter((i) => i.id !== id)].slice(0, 3));
      sounds.invite();
      // Si la pestaña está en segundo plano y hay permiso, también notificación del sistema.
      try {
        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Cachos — invitación', { body: `${n.from.username} te invita a su sala (${n.code})` });
        }
      } catch { /* sin soporte */ }
      // Expiración automática
      clearTimeout(timersRef.current.get(id));
      timersRef.current.set(id, setTimeout(() => dismiss(id), TTL_MS));
    };
    socket.on('friends:notify', onNotify);
    return () => {
      socket.off('friends:notify', onNotify);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  if (!user || invites.length === 0) return null;

  const accept = async (inv) => {
    // En plena partida no te sacamos: avisamos en la propia tarjeta.
    if (state && state.status === 'playing') {
      setInvites((list) => list.map((i) => (i.id === inv.id ? { ...i, note: 'Termina o abandona tu partida primero' } : i)));
      return;
    }
    if (state) await leave(); // estaba en un lobby: salir antes de entrar
    const res = await joinRoom(inv.code, user.username);
    if (res?.error) {
      setInvites((list) => list.map((i) => (i.id === inv.id ? { ...i, note: res.error } : i)));
      return;
    }
    dismiss(inv.id);
  };

  return (
    <div className="invite-stack">
      {invites.map((inv) => (
        <div key={inv.id} className="invite-toast">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-amber-glow/20 grid place-items-center text-amber-glow font-display font-black shrink-0">
              {inv.from.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-amber-glow/70 leading-none mb-0.5">Invitación</p>
              <p className="text-sm text-bone leading-tight">
                <strong>{inv.from.username}</strong> te invita a su sala
              </p>
            </div>
          </div>
          {inv.note && <p className="text-[11px] text-red-300 mb-2">{inv.note}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => accept(inv)}
              className="flex-1 py-1.5 rounded-lg bg-amber-glow text-felt-900 text-sm font-bold hover:brightness-105 transition"
            >
              Aceptar
            </button>
            <button
              onClick={() => dismiss(inv.id)}
              className="flex-1 py-1.5 rounded-lg bg-white/10 text-bone/70 text-sm font-bold hover:bg-white/15 transition"
            >
              Rechazar
            </button>
          </div>
          <div className="invite-toast__bar" style={{ animationDuration: `${TTL_MS}ms` }} />
        </div>
      ))}
    </div>
  );
}
