import React, { useState } from 'react';
import Character, { Cup, HOODS, CUPS, HOOD_COUNT, FACE_COUNT, CUP_COUNT } from './Character.jsx';
import { useProfile } from '../context/ProfileContext.jsx';

const HOOD_NAMES = ['Verde', 'Rojo', 'Negro', 'Azul', 'Morado', 'Mostaza'];
const CUP_NAMES = ['Cuero negro', 'Cuero claro', 'Peltre'];
const FACE_NAMES = ['Clásica', 'Serena', 'Pícara'];

function Swatch({ active, onClick, color, label }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-9 h-9 rounded-full border-2 transition ${active ? 'border-amber-glow scale-110' : 'border-black/40 hover:border-bone/40'}`}
      style={{ background: color }}
    />
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
        active
          ? 'bg-amber-glow text-black border-amber-glow'
          : 'bg-black/30 text-bone/70 border-bone/15 hover:border-bone/40'
      }`}
    >
      {children}
    </button>
  );
}

export default function Customizer({ onClose }) {
  const prof = useProfile();
  const { cosmetic, applyCosmetic, saveCosmetic, isLoggedIn, profile, loginProfile, registerProfile, logoutProfile } = prof;

  const [previewTurn, setPreviewTurn] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const doAuth = async () => {
    setBusy(true);
    setMsg(null);
    const fn = authMode === 'register' ? registerProfile : loginProfile;
    const res = await fn(username.trim(), password);
    setBusy(false);
    if (res.error) setMsg({ type: 'err', text: res.error });
    else setMsg({ type: 'ok', text: authMode === 'register' ? '¡Cuenta creada! Personaje guardado.' : 'Sesión iniciada.' });
  };

  const doSave = async () => {
    setBusy(true);
    setMsg(null);
    const res = await saveCosmetic();
    setBusy(false);
    if (res.error) setMsg({ type: 'err', text: res.error });
    else setMsg({ type: 'ok', text: res.local ? 'Guardado en este dispositivo.' : 'Personaje guardado en tu cuenta.' });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#15211a] border border-bone/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-bone/10">
          <h2 className="text-amber-glow font-bold tracking-wide">PERSONALIZAR PERSONAJE</h2>
          <button onClick={onClose} className="text-bone/50 hover:text-bone text-xl leading-none">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 p-5">
          {/* Vista previa */}
          <div className="flex flex-col items-center justify-center bg-black/25 rounded-xl py-6">
            <Character hood={cosmetic.hood} face={cosmetic.face} thinking={previewTurn} size={150} />
            <div className="-mt-5">
              <Cup size={60} style={cosmetic.cup} />
            </div>
            <div className="mt-4 flex gap-2">
              <Chip active={!previewTurn} onClick={() => setPreviewTurn(false)}>Neutral</Chip>
              <Chip active={previewTurn} onClick={() => setPreviewTurn(true)}>En su turno</Chip>
            </div>
          </div>

          {/* Controles */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-bone/50 text-xs uppercase tracking-wider mb-2">Capucha</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: HOOD_COUNT }).map((_, i) => (
                  <Swatch
                    key={i}
                    active={cosmetic.hood === i}
                    onClick={() => applyCosmetic({ hood: i })}
                    color={HOODS[i].hood}
                    label={HOOD_NAMES[i]}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-bone/50 text-xs uppercase tracking-wider mb-2">Cacho</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: CUP_COUNT }).map((_, i) => (
                  <Chip key={i} active={cosmetic.cup === i} onClick={() => applyCosmetic({ cup: i })}>
                    {CUP_NAMES[i]}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-bone/50 text-xs uppercase tracking-wider mb-2">Expresión</p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: FACE_COUNT }).map((_, i) => (
                  <Chip key={i} active={cosmetic.face === i} onClick={() => applyCosmetic({ face: i })}>
                    {FACE_NAMES[i]}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Cuenta / guardar */}
            <div className="mt-1 border-t border-bone/10 pt-3">
              {isLoggedIn ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-bone/70">
                    Sesión: <span className="text-amber-glow font-semibold">{profile?.username}</span>
                  </span>
                  <button onClick={logoutProfile} className="text-xs text-bone/40 hover:text-bone/70">Cerrar sesión</button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Chip active={authMode === 'login'} onClick={() => setAuthMode('login')}>Entrar</Chip>
                    <Chip active={authMode === 'register'} onClick={() => setAuthMode('register')}>Crear cuenta</Chip>
                  </div>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Usuario (único)"
                    className="bg-black/30 border border-bone/15 rounded-lg px-3 py-2 text-sm text-bone outline-none focus:border-amber-glow/60"
                  />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Contraseña"
                    className="bg-black/30 border border-bone/15 rounded-lg px-3 py-2 text-sm text-bone outline-none focus:border-amber-glow/60"
                  />
                  <button
                    onClick={doAuth}
                    disabled={busy}
                    className="bg-bone/10 hover:bg-bone/20 text-bone rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {authMode === 'register' ? 'Crear cuenta y guardar' : 'Iniciar sesión'}
                  </button>
                </div>
              )}

              <button
                onClick={doSave}
                disabled={busy}
                className="mt-3 w-full bg-amber-glow text-black rounded-lg px-3 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                Guardar personaje
              </button>

              {msg && (
                <p className={`mt-2 text-xs ${msg.type === 'err' ? 'text-red-400' : 'text-emerald-400'}`}>{msg.text}</p>
              )}
              {!isLoggedIn && (
                <p className="mt-2 text-[11px] text-bone/35">
                  Sin cuenta, tu personaje se guarda solo en este dispositivo. Crea una cuenta para conservarlo.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
