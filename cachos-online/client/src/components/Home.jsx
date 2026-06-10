import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Rules from './Rules.jsx';
import Leaderboard from './Leaderboard.jsx';
import Customizer from './Customizer.jsx';
import History from './History.jsx';
import RankedQueue from './RankedQueue.jsx';
import { CupMark, HeroScene } from './MenuArt.jsx';

const MENU_THEME = 'clean';

const DEFAULT_SETTINGS = { dicePerPlayer: 5, turnSeconds: null, calzoInfinito: false, pasarEnabled: false };

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const IconEnter = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
);
const IconBook = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);
const IconTrophy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);

// ─── Botón de auth fijo arriba a la izquierda ─────────────────────────────────
function AuthCornerButton({ user, logout, onOpenAuth }) {
  if (user) {
    return (
      <div className="fixed top-3 left-3 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-bone/10 rounded-lg px-3 py-2">
        <IconUser />
        <span className="text-xs text-amber-glow font-semibold">{user.username}</span>
        <span className="text-bone/30 text-xs">·</span>
        <span className="text-xs text-bone/50">ELO {user.elo ?? 1000}</span>
        <button
          onClick={logout}
          className="ml-1 flex items-center gap-1 text-xs text-bone/30 hover:text-bone/60 transition"
          title="Cerrar sesión"
        >
          <IconLogout />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onOpenAuth}
      className="fixed top-3 left-3 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-bone/10 hover:border-bone/25 rounded-lg px-3 py-2 text-xs text-bone/40 hover:text-bone/70 transition"
    >
      <IconUser />
      Iniciar sesión / Registrarse
    </button>
  );
}

// ─── Panel de autenticación inline ────────────────────────────────────────────
function AuthPanel({ onBack, initialMode = 'login' }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);
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
        <button onClick={onBack} className="clean-back">← Volver</button>

        <h2 className="font-display text-2xl font-black text-amber-glow mb-1">
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <p className="text-bone/40 text-xs mb-6 tracking-widest uppercase">
          {mode === 'login' ? 'Accede a tu perfil y ranking' : 'Crea tu perfil para jugar ranked'}
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

        {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}

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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Home() {
  const { createRoom, joinRoom, connected } = useGame();
  const { user, logout } = useAuth();
  const [view, setView] = useState('menu'); // 'menu' | 'auth' | 'form' | 'rules' | 'leaderboard'
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [mode, setMode] = useState('create');
  const [ranked, setRanked] = useState(false);
  const [name, setName] = useState(user?.username || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [rankedHint, setRankedHint] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  React.useEffect(() => {
    if (user?.username) setName(user.username);
    if (user && view === 'auth') setView('menu');
  }, [user]);

  const openAuth = (initialMode = 'login') => {
    setAuthInitialMode(initialMode);
    setView('auth');
  };

  const handleRankedClick = () => {
    if (!user) {
      setRankedHint(true);
      setTimeout(() => setRankedHint(false), 3000);
      return;
    }
    // Ranked ya no crea sala: entra a la cola de matchmaking.
    setView('rankedQueue');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    if (mode === 'create') await createRoom(name.trim(), settings, ranked);
    else await joinRoom(code.trim().toUpperCase(), name.trim());
    setBusy(false);
  };

  if (view === 'rules') return <Rules onBack={() => setView('menu')} theme={MENU_THEME} />;
  if (view === 'leaderboard') return <Leaderboard onBack={() => setView('menu')} />;
  if (view === 'history') return <History onBack={() => setView('menu')} />;
  if (view === 'rankedQueue') return <RankedQueue onBack={() => setView('menu')} />;
  if (view === 'auth') return <AuthPanel onBack={() => setView('menu')} initialMode={authInitialMode} />;

  // ════════════════ MENÚ ════════════════
  if (view === 'menu') {
    return (
      <div className="clean-bg">
        <AuthCornerButton user={user} logout={logout} onOpenAuth={() => openAuth('login')} />
        {showCustomizer && <Customizer onClose={() => setShowCustomizer(false)} />}

        <div className="clean-split">
          <div className="clean-scene-wrap">
            <HeroScene className="clean-scene" />
          </div>
          <div className="clean-hero">
            <CupMark className="clean-cup" />
            <h1 className="clean-logo">CACHOS</h1>
            <p className="clean-tagline">Bluffea · <strong>Duda</strong> · Calza</p>

            <div className="clean-actions">
              <button className="clean-btn clean-btn--primary" onClick={() => { setMode('create'); setRanked(false); setView('form'); }}>
                <IconUsers /> Crear sala
              </button>
              <button className="clean-btn" onClick={() => { setMode('join'); setView('form'); }}>
                <IconEnter /> Unirse a sala
              </button>

              {/* Ranked — bloqueado para invitados */}
              <div className="relative">
                <button
                  className="clean-btn w-full"
                  style={user
                    ? { borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24' }
                    : { borderColor: 'rgba(251,191,36,0.15)', color: 'rgba(251,191,36,0.3)', cursor: 'default' }
                  }
                  onClick={handleRankedClick}
                >
                  {user ? <IconTrophy /> : <IconLock />}
                  Buscar partida ranked
                  {!user && <span className="text-[10px] ml-1 opacity-50">· requiere cuenta</span>}
                </button>
                {rankedHint && (
                  <div className="absolute left-0 right-0 -bottom-9 bg-black/80 border border-amber-glow/20 rounded-lg px-3 py-2 text-[11px] text-amber-glow/80 text-center z-10">
                    <button onClick={() => openAuth('register')} className="underline hover:text-amber-glow transition">Crea una cuenta</button>
                    {' '}o{' '}
                    <button onClick={() => openAuth('login')} className="underline hover:text-amber-glow transition">inicia sesión</button>
                    {' '}para jugar ranked
                  </div>
                )}
              </div>

              {user && (
                <button className="clean-btn" onClick={() => setView('history')}>
                  <IconHistory /> Mi historial
                </button>
              )}

              <button className="clean-btn" onClick={() => setShowCustomizer(true)}>
                <IconUser /> Personalizar personaje
              </button>
              <button className="clean-btn" onClick={() => setView('leaderboard')}>
                <IconTrophy /> Ranking
              </button>
              <button className="clean-btn" onClick={() => setView('rules')}>
                <IconBook /> Reglas
              </button>
            </div>

            <p className="clean-foot">2 a 6 jugadores · multijugador en tiempo real</p>
            {!connected && <p className="clean-foot" style={{ color: '#f87171' }}>Conectando al servidor…</p>}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════ FORMULARIO ════════════════
  const clean = MENU_THEME === 'clean';
  const wrapClass = clean ? 'clean-bg' : 'themed-bg themed-bg--scroll';
  const cardClass = clean ? 'clean-card' : 'themed-card';
  const backClass = clean ? 'clean-back' : 'themed-back';
  const inputClass = clean ? 'clean-input' : 'themed-input';
  const submitClass = clean ? 'clean-btn clean-btn--primary w-full' : 'menu-btn menu-btn--primary w-full';

  return (
    <div className={wrapClass}>
      <AuthCornerButton user={user} logout={logout} onOpenAuth={() => openAuth('login')} />
      <div className={cardClass}>
        <button onClick={() => setView('menu')} className={backClass}>← Volver</button>

        <h2 className="font-display text-2xl font-black text-amber-glow mb-4">
          {mode === 'create' ? 'Crear sala' : 'Unirse a una sala'}
          {ranked && mode === 'create' && (
            <span className="ml-2 text-sm font-normal text-amber-glow/70 border border-amber-glow/30 rounded-md px-2 py-0.5">Ranked</span>
          )}
        </h2>

        <label className="block text-xs uppercase tracking-wide text-bone/50 mb-1">Tu nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Ej: Pancho"
          className={`${inputClass} w-full mb-4`} />

        {mode === 'join' && (
          <>
            <label className="block text-xs uppercase tracking-wide text-bone/50 mb-1">Código de sala</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={4} placeholder="ABCD"
              className={`${inputClass} w-full mb-4 tracking-[0.4em] text-center font-display text-2xl placeholder:tracking-normal`} />
          </>
        )}

        {mode === 'create' && (
          <div className="mb-4 rounded-xl border border-bone/15 overflow-hidden">
            <button onClick={() => setShowRules((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-bone/80 hover:bg-white/5 transition">
              <span>Reglas personalizadas</span><span className="text-bone/40">{showRules ? '▲' : '▼'}</span>
            </button>
            {showRules && (
              <div className="px-4 pb-4 pt-1 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-bone/50 mb-2">Dados por jugador</p>
                  <div className="flex items-center gap-4">
                    <button className="w-9 h-9 rounded-full bg-black/30 text-xl hover:bg-black/50 transition" onClick={() => set({ dicePerPlayer: Math.max(1, settings.dicePerPlayer - 1) })}>−</button>
                    <span className="font-display text-2xl font-black text-amber-glow w-8 text-center">{settings.dicePerPlayer}</span>
                    <button className="w-9 h-9 rounded-full bg-black/30 text-xl hover:bg-black/50 transition" onClick={() => set({ dicePerPlayer: Math.min(6, settings.dicePerPlayer + 1) })}>+</button>
                    <span className="text-xs text-bone/30">(1–6, por defecto 5)</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-bone/50 mb-2">Tiempo por turno</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[{ v: null, l: 'Sin límite' }, { v: 15, l: '15s' }, { v: 30, l: '30s' }, { v: 60, l: '60s' }].map((opt) => (
                      <button key={String(opt.v)} onClick={() => set({ turnSeconds: opt.v })}
                        className={['py-2 rounded-lg text-xs font-semibold transition', settings.turnSeconds === opt.v ? 'bg-amber-glow text-felt-900' : 'bg-black/20 text-bone/60 hover:text-bone'].join(' ')}>{opt.l}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="text-xs uppercase tracking-wide text-bone/50">Calzo infinito</p><p className="text-[10px] text-bone/30">OFF: solo con la mitad o más de los dados</p></div>
                  <button onClick={() => set({ calzoInfinito: !settings.calzoInfinito })} className={['w-12 h-7 rounded-full transition relative', settings.calzoInfinito ? 'bg-amber-glow' : 'bg-black/40'].join(' ')}>
                    <span className={['absolute top-1 w-5 h-5 rounded-full bg-bone transition-all', settings.calzoInfinito ? 'left-6' : 'left-1'].join(' ')} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="text-xs uppercase tracking-wide text-bone/50">Acción "Pasar"</p><p className="text-[10px] text-bone/30">Farol: declara mano especial</p></div>
                  <button onClick={() => set({ pasarEnabled: !settings.pasarEnabled })} className={['w-12 h-7 rounded-full transition relative', settings.pasarEnabled ? 'bg-amber-glow' : 'bg-black/40'].join(' ')}>
                    <span className={['absolute top-1 w-5 h-5 rounded-full bg-bone transition-all', settings.pasarEnabled ? 'left-6' : 'left-1'].join(' ')} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={handleSubmit}
          disabled={busy || !connected || !name.trim() || (mode === 'join' && code.length < 4)}
          className={submitClass} style={{ marginTop: 4 }}>
          {busy ? 'Conectando…' : mode === 'create' ? 'Crear partida' : 'Entrar a la sala'}
        </button>

        {!connected && <p className="text-center text-xs text-red-400 mt-3">Conectando al servidor…</p>}
      </div>
    </div>
  );
}
