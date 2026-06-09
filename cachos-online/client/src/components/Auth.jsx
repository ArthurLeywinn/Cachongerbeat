import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Auth() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) return;
    setBusy(true);
    setError('');
    const res = mode === 'login'
      ? await login(username.trim(), password)
      : await register(username.trim(), password);
    if (!res.ok) setError(res.error || 'Ocurrió un error.');
    setBusy(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className="clean-bg">
      <div className="clean-card" style={{ maxWidth: 380 }}>
        <h1 className="font-display text-3xl font-black text-amber-glow mb-1 text-center">CACHOS</h1>
        <p className="text-bone/40 text-xs text-center mb-6 tracking-widest uppercase">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </p>

        <label className="block text-xs uppercase tracking-wide text-bone/50 mb-1">Usuario</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={handleKey}
          placeholder="tu_nombre"
          maxLength={20}
          autoComplete="username"
          className="clean-input w-full mb-3"
        />

        <label className="block text-xs uppercase tracking-wide text-bone/50 mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKey}
          placeholder="••••••"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className="clean-input w-full mb-4"
        />

        {error && (
          <p className="text-red-400 text-xs mb-3 text-center">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy || !username.trim() || !password}
          className="clean-btn clean-btn--primary w-full mb-3"
        >
          {busy ? 'Cargando…' : mode === 'login' ? 'Entrar' : 'Registrarse'}
        </button>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="w-full text-xs text-bone/40 hover:text-bone/70 transition text-center py-1"
        >
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
}
