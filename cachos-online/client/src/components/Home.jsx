import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import Die from './Die.jsx';

export default function Home() {
  const { createRoom, joinRoom, connected } = useGame();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    if (mode === 'create') {
      await createRoom(name.trim());
    } else {
      await joinRoom(code.trim().toUpperCase(), name.trim());
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-2 animate-pop">
        <Die value={5} size={40} />
        <Die value={1} size={40} highlight />
        <Die value={3} size={40} />
      </div>
      <h1 className="font-display text-5xl sm:text-6xl font-black tracking-tight text-bone">
        Cachos
      </h1>
      <p className="text-bone/60 mt-2 mb-8 text-center max-w-sm">
        Dudo / Liar&apos;s Dice multijugador en tiempo real. Bluffea, duda y calza.
      </p>

      {/* Tarjeta */}
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
            <label className="block text-xs uppercase tracking-wide text-bone/50 mb-1">
              Código de sala
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="ABCD"
              className="w-full mb-4 px-4 py-3 rounded-xl bg-black/30 border border-white/10 focus:border-amber-glow/60 outline-none text-bone tracking-[0.4em] text-center font-display text-2xl placeholder:tracking-normal placeholder:text-bone/30"
            />
          </>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy || !connected || !name.trim() || (mode === 'join' && code.length < 4)}
          className="w-full py-3 rounded-xl bg-amber-glow text-felt-900 font-bold hover:brightness-105 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? 'Conectando…' : mode === 'create' ? 'Crear partida' : 'Entrar a la sala'}
        </button>

        {!connected && (
          <p className="text-center text-xs text-red-400 mt-3">Conectando al servidor…</p>
        )}
      </div>

      <p className="text-bone/30 text-xs mt-8">2 a 4 jugadores · 5 dados cada uno</p>
    </div>
  );
}
