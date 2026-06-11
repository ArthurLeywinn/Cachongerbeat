import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { socket, emitAck } from '../socket.js';
import { useAuth } from './AuthContext.jsx';
import { getLocalCosmetic } from './ProfileContext.jsx';

const GameContext = createContext(null);
export const useGame = () => useContext(GameContext);

const STORAGE_KEY = 'cachos-session';

export function GameProvider({ children }) {
  const { token, applyEloUpdate } = useAuth() || {};
  const [connected, setConnected] = useState(socket.connected);
  const [state, setState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [code, setCode] = useState(null);
  const [error, setError] = useState(null);
  // Cola de matchmaking ranked (separada por tamaño): { inQueue, size, count }
  const [queue, setQueue] = useState({ inQueue: false, size: null, count: 0 });
  const reconnectRef = useRef(false);

  const saveSession = (c, pid) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code: c, playerId: pid }));
  };
  const clearSession = () => sessionStorage.removeItem(STORAGE_KEY);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      // Anunciar presencia (sistema de amigos) si hay sesión iniciada.
      if (token) socket.emit('presence:online', { token });
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw && !reconnectRef.current) {
        reconnectRef.current = true;
        try {
          const { code: c, playerId: pid } = JSON.parse(raw);
          if (c && pid) {
            emitAck('room:reconnect', { code: c, playerId: pid, token }).then((res) => {
              if (res.ok) {
                setCode(c);
                setPlayerId(pid);
                setState(res.state);
              } else {
                clearSession();
              }
            });
          }
        } catch {
          clearSession();
        }
      }
    }
    function onDisconnect() {
      setConnected(false);
      setQueue((q) => ({ ...q, inQueue: false }));
    }
    function onState(s) { setState(s); }
    function onEloUpdate(data) { applyEloUpdate?.(data); }
    function onQueueUpdate({ count, size }) {
      setQueue((q) => ({ ...q, count, size: size ?? q.size }));
    }
    function onQueueMatched({ code: c, playerId: pid, state: st }) {
      setQueue((q) => ({ ...q, inQueue: false }));
      setCode(c);
      setPlayerId(pid);
      setState(st);
      saveSession(c, pid);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('state', onState);
    socket.on('elo:update', onEloUpdate);
    socket.on('queue:update', onQueueUpdate);
    socket.on('queue:matched', onQueueMatched);
    if (socket.connected) onConnect();
    if (socket.connected && token) socket.emit('presence:online', { token });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state', onState);
      socket.off('elo:update', onEloUpdate);
      socket.off('queue:update', onQueueUpdate);
      socket.off('queue:matched', onQueueMatched);
    };
  }, [token, applyEloUpdate]);

  async function createRoom(name, settings, ranked = false) {
    setError(null);
    const res = await emitAck('room:create', { name, settings, token, ranked, cosmetic: getLocalCosmetic() });
    if (res.ok) {
      setCode(res.code);
      setPlayerId(res.playerId);
      setState(res.state);
      saveSession(res.code, res.playerId);
    } else {
      setError(res.error || 'No se pudo crear la sala.');
    }
    return res;
  }

  async function joinRoom(joinCode, name) {
    setError(null);
    const res = await emitAck('room:join', { code: joinCode, name, token, cosmetic: getLocalCosmetic() });
    if (res.ok) {
      setCode(res.code);
      setPlayerId(res.playerId);
      setState(res.state);
      saveSession(res.code, res.playerId);
    } else {
      setError(res.error || 'No se pudo unir a la sala.');
    }
    return res;
  }

  async function startGame() {
    const res = await emitAck('game:start', {});
    if (!res.ok) setError(res.error);
    return res;
  }
  async function bid(quantity, face, direction) {
    const res = await emitAck('game:bid', { quantity, face, direction });
    if (!res.ok) setError(res.error);
    return res;
  }
  async function doubt() {
    const res = await emitAck('game:doubt', {});
    if (!res.ok) setError(res.error);
    return res;
  }
  async function calzar() {
    const res = await emitAck('game:calzar', {});
    if (!res.ok) setError(res.error);
    return res;
  }
  async function chooseObliga(mode, face) {
    const res = await emitAck('game:obliga', { mode, face });
    if (!res.ok) setError(res.error);
    return res;
  }
  async function pasar() {
    const res = await emitAck('game:pasar', {});
    if (!res.ok) setError(res.error);
    return res;
  }
  async function doubtPass() {
    const res = await emitAck('game:doubtPass', {});
    if (!res.ok) setError(res.error);
    return res;
  }
  async function sendChat(text) {
    const res = await emitAck('game:chat', { text });
    if (!res.ok) setError(res.error);
    return res;
  }

  // ── Matchmaking ranked (cola separada por tamaño de partida) ──
  async function joinQueue(size) {
    setError(null);
    const res = await emitAck('queue:join', { token, cosmetic: getLocalCosmetic(), size });
    if (res.ok) {
      setQueue({ inQueue: true, size: res.size ?? size, count: res.count ?? 1 });
    } else {
      setError(res.error || 'No se pudo entrar a la cola.');
    }
    return res;
  }

  async function leaveQueue() {
    const res = await emitAck('queue:leave', {});
    setQueue({ inQueue: false, size: null, count: 0 });
    return res;
  }

  function leave() {
    clearSession();
    setState(null);
    setCode(null);
    setPlayerId(null);
    window.location.reload();
  }

  const value = {
    connected, state, playerId, code, error, setError,
    createRoom, joinRoom, startGame, bid, doubt, calzar,
    chooseObliga, pasar, doubtPass, sendChat, leave,
    queue, joinQueue, leaveQueue,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
