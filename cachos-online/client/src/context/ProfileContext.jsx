import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Contexto de PERFIL: personalización del personaje + login simple (usuario
// único + contraseña) que la guarda en el servidor. Funciona también sin login:
// la personalización siempre se persiste localmente y viaja a la partida.

const ProfileContext = createContext(null);
export const useProfile = () => useContext(ProfileContext);

const COSMETIC_KEY = 'cachos-cosmetic';
const PROFILE_KEY = 'cachos-profile';

const isDev = import.meta.env.DEV;
const SERVER = isDev ? (import.meta.env.VITE_SERVER_URL || 'http://localhost:3001') : '';

const DEFAULT_COSMETIC = { hood: 0, face: 0, cup: 0 };

// Lectura usada también por GameContext al crear/unirse a una sala.
export function getLocalCosmetic() {
  try {
    const raw = localStorage.getItem(COSMETIC_KEY);
    if (!raw) return { ...DEFAULT_COSMETIC };
    const c = JSON.parse(raw);
    return {
      hood: Number(c.hood) || 0,
      face: Number(c.face) || 0,
      cup: Number(c.cup) || 0,
    };
  } catch {
    return { ...DEFAULT_COSMETIC };
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${SERVER}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  return res.json();
}

export function ProfileProvider({ children }) {
  const [cosmetic, setCosmeticState] = useState(getLocalCosmetic);
  const [profile, setProfile] = useState(null); // { id, username, cosmetic }
  const [token, setToken] = useState(null);

  // Recuperar sesión de perfil guardada y refrescar contra el servidor.
  useEffect(() => {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return;
    let saved;
    try { saved = JSON.parse(raw); } catch { return; }
    if (!saved?.token) return;
    setToken(saved.token);
    api('/profile/me', { headers: { Authorization: `Bearer ${saved.token}` } })
      .then((res) => {
        if (res.ok) {
          setProfile(res.profile);
          if (res.profile.cosmetic) applyCosmetic(res.profile.cosmetic, false);
        } else {
          localStorage.removeItem(PROFILE_KEY);
          setToken(null);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistLocal = (c) => localStorage.setItem(COSMETIC_KEY, JSON.stringify(c));

  // Cambia la personalización local (al instante).
  const applyCosmetic = useCallback((patch, persist = true) => {
    setCosmeticState((prev) => {
      const next = { ...prev, ...patch };
      if (persist) persistLocal(next);
      return next;
    });
  }, []);

  const stash = (tok, prof) => {
    setToken(tok);
    setProfile(prof);
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ token: tok }));
    if (prof?.cosmetic) {
      persistLocal(prof.cosmetic);
      setCosmeticState(prof.cosmetic);
    }
  };

  const registerProfile = useCallback(async (username, password) => {
    const res = await api('/profile/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, cosmetic: getLocalCosmetic() }),
    });
    if (res.ok) stash(res.token, res.profile);
    return res;
  }, []);

  const loginProfile = useCallback(async (username, password) => {
    const res = await api('/profile/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) stash(res.token, res.profile);
    return res;
  }, []);

  const logoutProfile = useCallback(() => {
    setToken(null);
    setProfile(null);
    localStorage.removeItem(PROFILE_KEY);
  }, []);

  // Guarda la personalización actual en el servidor (si hay sesión).
  const saveCosmetic = useCallback(async () => {
    const c = getLocalCosmetic();
    if (!token) return { ok: true, local: true }; // sin login, queda local
    const res = await api('/profile/cosmetic', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cosmetic: c }),
    });
    if (res.ok) setProfile(res.profile);
    return res;
  }, [token]);

  const value = {
    cosmetic,
    applyCosmetic,
    saveCosmetic,
    profile,
    token,
    isLoggedIn: !!token,
    registerProfile,
    loginProfile,
    logoutProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
