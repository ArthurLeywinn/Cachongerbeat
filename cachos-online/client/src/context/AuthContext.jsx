import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const STORAGE_KEY = 'cachos-auth';
const isDev = import.meta.env.DEV;
const SERVER = isDev
  ? import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  : '';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${SERVER}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  return res.json();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { id, username, elo, games_played, games_won }
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, intentar recuperar sesión guardada.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { setLoading(false); return; }
    try {
      const { token: t } = JSON.parse(raw);
      if (!t) { setLoading(false); return; }
      // Verificar que el token siga siendo válido contra el servidor.
      apiFetch('/auth/me', { headers: { Authorization: `Bearer ${t}` } })
        .then((res) => {
          if (res.ok) {
            setToken(t);
            setUser(res.user);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        })
        .finally(() => setLoading(false));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setLoading(false);
    }
  }, []);

  const saveSession = (t, u) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t }));
    setToken(t);
    setUser(u);
  };

  const register = useCallback(async (username, password) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) saveSession(res.token, res.user);
    return res;
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) saveSession(res.token, res.user);
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Refrescar datos del usuario (ej: después de una partida ranked).
  const refreshUser = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUser(res.user);
  }, [token]);

  // Escucha el evento elo:update del socket (se llama desde GameContext).
  const applyEloUpdate = useCallback(({ delta, newElo }) => {
    setUser((u) => u ? { ...u, elo: newElo } : u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, applyEloUpdate }}>
      {children}
    </AuthContext.Provider>
  );
}
