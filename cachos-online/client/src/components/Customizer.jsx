import React, { useState } from 'react';
import Character, { Cup, HOODS, HOOD_COUNT, FACE_COUNT, CUP_COUNT, CUP_NAMES } from './Character.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const HOOD_NAMES = ['Verde', 'Rojo', 'Negro', 'Azul', 'Morado', 'Mostaza'];
const FACE_NAMES = ['Clásica', 'Serena', 'Pícara'];

// Cuántos elementos están disponibles SIN iniciar sesión (defaults).
const FREE_CUPS = 3;

function Chip({ active, onClick, locked, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
        active
          ? 'bg-amber-glow text-black border-amber-glow'
          : 'bg-black/30 text-bone/70 border-bone/15 hover:border-bone/40'
      } ${locked ? 'opacity-50' : ''}`}
    >
      {children}{locked ? ' 🔒' : ''}
    </button>
  );
}

export default function Customizer({ onClose }) {
  const { cosmetic, applyCosmetic, saveCosmetic } = useProfile();
  const { user } = useAuth() || {};
  const unlocked = !!user; // los skins nuevos se desbloquean al iniciar sesión

  const [previewTurn, setPreviewTurn] = useState(true);
  const [msg, setMsg] = useState(null);

  const pickCup = (i) => {
    if (i >= FREE_CUPS && !unlocked) {
      setMsg('Inicia sesión (arriba a la izquierda) para desbloquear este cacho.');
      return;
    }
    setMsg(null);
    applyCosmetic({ cup: i });
  };

  const doSave = async () => {
    const res = await saveCosmetic();
    setMsg(res?.local ? 'Guardado en este dispositivo.' : 'Personaje guardado en tu cuenta.');
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
                  <button
                    key={i}
                    onClick={() => applyCosmetic({ hood: i })}
                    title={HOOD_NAMES[i]}
                    className={`w-9 h-9 rounded-full border-2 transition ${cosmetic.hood === i ? 'border-amber-glow scale-110' : 'border-black/40 hover:border-bone/40'}`}
                    style={{ background: HOODS[i].hood }}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-bone/50 text-xs uppercase tracking-wider mb-2">
                Cacho{!unlocked && <span className="text-bone/30 normal-case"> · {FREE_CUPS} gratis</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: CUP_COUNT }).map((_, i) => (
                  <Chip
                    key={i}
                    active={cosmetic.cup === i}
                    locked={i >= FREE_CUPS && !unlocked}
                    onClick={() => pickCup(i)}
                  >
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

            <div className="mt-1 border-t border-bone/10 pt-3">
              <button
                onClick={doSave}
                className="w-full bg-amber-glow text-black rounded-lg px-3 py-2.5 text-sm font-bold"
              >
                Guardar personaje
              </button>
              {msg && <p className="mt-2 text-xs text-bone/60">{msg}</p>}
              {!unlocked && (
                <p className="mt-2 text-[11px] text-bone/35">
                  Inicia sesión (botón de arriba a la izquierda) para desbloquear los cachos, personajes y accesorios nuevos.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
