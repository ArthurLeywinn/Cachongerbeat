import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Rules from './Rules.jsx';
import Leaderboard from './Leaderboard.jsx';
import { CupMark, HeroScene } from './MenuArt.jsx';

// ─────────────────────────────────────────────────────────────
// Cambia esta línea para elegir el estilo del menú:
//   'clean'        → minimalista limpio estilo plataforma (verde/negro)
//   'illustrated'  → la imagen ilustrada de los encapuchados
const MENU_THEME = 'clean';
// ─────────────────────────────────────────────────────────────

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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

export default function Home() {
  const { createRoom, joinRoom, connected } = useGame();
  const { user, logout } = useAuth();
  const [view, setView] = useState('menu');
  const [mode, setMode] = useState('create');
  const [ranked, setRanked] = useState(false);
  const [name, setName] = useState(user?.username || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  const clean = MENU_THEME === 'clean';

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    if (mode === 'create') await createRoom(name.trim(), settings, ranked);
    else await joinRoom(code.trim().toUpperCase(), name.trim());
    setBusy(false);
  };

  if (view === 'rules') return <Rules onBack={() => setView('menu')} theme={MENU_THEME} />;
  if (view === 'leaderboard') return <Leaderboard onBack={() => setView('menu')} />;

  // ════════════════ MENÚ ════════════════
  if (view === 'menu') {
    if (clean) {
      return (
        <div className="clean-bg">
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
                <button className="clean-btn" style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24' }} onClick={() => { setMode('create'); setRanked(true); setView('form'); }}>
                  <IconTrophy /> Partida ranked
                </button>
                <button className="clean-btn" onClick={() => setView('leaderboard')}>
                  <IconTrophy /> Ranking
                </button>
                <button className="clean-btn" onClick={() => setView('rules')}>
                  <IconBook /> Reglas
                </button>
              </div>
              {user && (
                <div className="flex items-center justify-between mt-4 px-1">
                  <p className="text-bone/40 text-xs">
                    <span className="text-amber-glow font-semibold">{user.username}</span>
                    {' · ELO '}
                    <span className="text-amber-glow font-semibold">{user.elo ?? 1000}</span>
                  </p>
                  <button onClick={logout} className="flex items-center gap-1 text-xs text-bone/30 hover:text-bone/60 transition">
                    <IconLogout /> Salir
                  </button>
                </div>
              )}
              <p className="clean-foot">2 a 6 jugadores · multijugador en tiempo real</p>
              {!connected && <p className="clean-foot" style={{ color: '#f87171' }}>Conectando al servidor…</p>}
            </div>
          </div>
        </div>
      );
    }
    // Versión ilustrada (imagen de fondo)
    return (
      <div className="themed-bg">
        <div className="menu-buttons">
          <button className="menu-btn menu-btn--primary" onClick={() => { setMode('create'); setView('form'); }}><IconUsers /> <span>Crear sala</span></button>
          <button className="menu-btn" onClick={() => { setMode('join'); setView('form'); }}><IconEnter /> <span>Unirse a sala</span></button>
          <button className="menu-btn" onClick={() => setView('rules')}><IconBook /> <span>Reglas</span></button>
        </div>
        {!connected && <p className="menu-conn">Conectando al servidor…</p>}
      </div>
    );
  }

  // ════════════════ FORMULARIO ════════════════
  const wrapClass = clean ? 'clean-bg' : 'themed-bg themed-bg--scroll';
  const cardClass = clean ? 'clean-card' : 'themed-card';
  const backClass = clean ? 'clean-back' : 'themed-back';
  const inputClass = clean ? 'clean-input' : 'themed-input';
  const submitClass = clean ? 'clean-btn clean-btn--primary w-full' : 'menu-btn menu-btn--primary w-full';

  return (
    <div className={wrapClass}>
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
