import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import Die from './Die.jsx';

const DEFAULT_SETTINGS = {
  dicePerPlayer: 5,
  turnSeconds: null, // null = sin límite
  calzoInfinito: false, // OFF = regla normal (al menos la mitad de los dados)
  pasarEnabled: false,
};

export default function Home() {
  const { createRoom, joinRoom, connected } = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create');
  const [busy, setBusy] = useState(false);

  // Reglas personalizadas (solo al crear).
  const [showRules, setShowRules] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    if (mode === 'create') {
      await createRoom(name.trim(), settings);
    } else {
      await joinRoom(code.trim().toUpperCase(), name.trim());
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="flex items-center gap-3 mb-2 animate-pop">
        <Die value={5} size={40} />
        <Die value={1} size={40} highlight />
        <Die value={3} size={40} />
      </div>
      <h1 className="font-display text-5xl sm:text-6xl font-black tracking-tight text-bone">Cachos</h1>
      <p className="text-bone/60 mt-2 mb-8 text-center max-w-sm">
        Dudo / Liar&apos;s Dice multijugador en tiempo real. Bluffea, duda y calza.
      </p>

      <div className="glass rounded-2xl p-6 w-full max-w-md shadow-cup">
        <div className="flex gap-2 mb-5 p-1 rounded-xl bg-black/20">
          {['create', 'join'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={[
                'flex-1 py-2 rounded-lg text-sm font-semibold transition',
                mode === m ? 'bg-amber-glow text-felt-900' : 'text-bone/60 hover:text-bone',
              ].join(' ')}
            >
              {m === 'create' ? 'Crear sala' : 'Unirse'}
            </button>
          ))}
        </div>

        <label className="block text-xs uppercase tracking-wide text-bone/50 mb-1">Tu nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Ej: Pancho"
          className="w-full mb-4 px-4 py-3 rounded-xl bg-black/30 border border-white/10 focus:border-amber-glow/60 outline-none text-bone placeholder:text-bone/30"
        />

        {mode === 'join' && (
          <>
            <label className="block text-xs uppercase tracking-wide text-bone/50 mb-1">Código de sala</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="ABCD"
              className="w-full mb-4 px-4 py-3 rounded-xl bg-black/30 border border-white/10 focus:border-amber-glow/60 outline-none text-bone tracking-[0.4em] text-center font-display text-2xl placeholder:tracking-normal placeholder:text-bone/30"
            />
          </>
        )}

        {/* ── Reglas personalizadas (solo al crear) ── */}
        {mode === 'create' && (
          <div className="mb-4 rounded-xl border border-white/10 overflow-hidden">
            <button
              onClick={() => setShowRules((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-bone/80 hover:bg-white/5 transition"
            >
              <span>Reglas personalizadas</span>
              <span className="text-bone/40">{showRules ? '▲' : '▼'}</span>
            </button>

            {showRules && (
              <div className="px-4 pb-4 pt-1 space-y-4">
                {/* Dados por jugador */}
                <div>
                  <p className="text-xs uppercase tracking-wide text-bone/50 mb-2">Dados por jugador</p>
                  <div className="flex items-center gap-4">
                    <button
                      className="w-9 h-9 rounded-full bg-black/30 text-xl hover:bg-black/50 transition"
                      onClick={() => set({ dicePerPlayer: Math.max(1, settings.dicePerPlayer - 1) })}
                    >
                      −
                    </button>
                    <span className="font-display text-2xl font-black text-amber-glow w-8 text-center">
                      {settings.dicePerPlayer}
                    </span>
                    <button
                      className="w-9 h-9 rounded-full bg-black/30 text-xl hover:bg-black/50 transition"
                      onClick={() => set({ dicePerPlayer: Math.min(6, settings.dicePerPlayer + 1) })}
                    >
                      +
                    </button>
                    <span className="text-xs text-bone/30">(1–6, por defecto 5)</span>
                  </div>
                </div>

                {/* Tiempo por turno */}
                <div>
                  <p className="text-xs uppercase tracking-wide text-bone/50 mb-2">Tiempo por turno</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { v: null, l: 'Sin límite' },
                      { v: 15, l: '15s' },
                      { v: 30, l: '30s' },
                      { v: 60, l: '60s' },
                    ].map((opt) => (
                      <button
                        key={String(opt.v)}
                        onClick={() => set({ turnSeconds: opt.v })}
                        className={[
                          'py-2 rounded-lg text-xs font-semibold transition',
                          settings.turnSeconds === opt.v
                            ? 'bg-amber-glow text-felt-900'
                            : 'bg-black/20 text-bone/60 hover:text-bone',
                        ].join(' ')}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calzo infinito (checkbox; OFF = regla normal) */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-bone/50">Calzo infinito</p>
                    <p className="text-[10px] text-bone/30">
                      OFF: solo con la mitad o más de los dados
                    </p>
                  </div>
                  <button
                    onClick={() => set({ calzoInfinito: !settings.calzoInfinito })}
                    className={[
                      'w-12 h-7 rounded-full transition relative',
                      settings.calzoInfinito ? 'bg-amber-glow' : 'bg-black/40',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'absolute top-1 w-5 h-5 rounded-full bg-bone transition-all',
                        settings.calzoInfinito ? 'left-6' : 'left-1',
                      ].join(' ')}
                    />
                  </button>
                </div>

                {/* Pasar */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-bone/50">Acción “Pasar”</p>
                    <p className="text-[10px] text-bone/30">Solo con 5 dados especiales</p>
                  </div>
                  <button
                    onClick={() => set({ pasarEnabled: !settings.pasarEnabled })}
                    className={[
                      'w-12 h-7 rounded-full transition relative',
                      settings.pasarEnabled ? 'bg-amber-glow' : 'bg-black/40',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'absolute top-1 w-5 h-5 rounded-full bg-bone transition-all',
                        settings.pasarEnabled ? 'left-6' : 'left-1',
                      ].join(' ')}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy || !connected || !name.trim() || (mode === 'join' && code.length < 4)}
          className="w-full py-3 rounded-xl bg-amber-glow text-felt-900 font-bold hover:brightness-105 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Conectando…' : mode === 'create' ? 'Crear partida' : 'Entrar a la sala'}
        </button>

        {!connected && <p className="text-center text-xs text-red-400 mt-3">Conectando al servidor…</p>}
      </div>

      <p className="text-bone/30 text-xs mt-8">2 a 4 jugadores</p>
    </div>
  );
}
