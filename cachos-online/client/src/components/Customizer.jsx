import React, { useState } from 'react';
import Character, { Cup, HOODS, HOOD_COUNT, FACE_COUNT, FACE_NAMES, CUP_COUNT, CUP_NAMES, BODY_COUNT, BODY_NAMES, HAT_COUNT, HAT_NAMES, ACC_COUNT, ACC_NAMES, PUNK_BODY, MOHAWK_HAT, HOOD_HAT } from './Character.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const HOOD_NAMES = ['Verde', 'Rojo', 'Negro', 'Azul', 'Morado', 'Mostaza'];

// Disponible SIN iniciar sesión (defaults).
const FREE_CUPS = 3;
const FREE_FACES = 3;
const FREE_BODIES = [0, PUNK_BODY];           // capucha simple + punk
const FREE_HATS = [0, MOHAWK_HAT, HOOD_HAT];  // ninguno + mohawk + capucha clásica
const FREE_ACCS = [0];

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

// Customizador por PESTAÑAS: cada personalización va en su propia sección, una a
// la vez, para que se vea limpia y ordenada. La vista previa queda siempre fija.
export default function Customizer({ onClose }) {
  const { cosmetic, applyCosmetic, saveCosmetic } = useProfile();
  const { user } = useAuth() || {};
  const unlocked = !!user; // los skins nuevos se desbloquean al iniciar sesión

  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState('cuerpo');

  const needLogin = () => setMsg('Inicia sesión (arriba a la izquierda) para desbloquear esto.');

  // Selector genérico con bloqueo por lista de "gratis".
  const pick = (key, i, freeList) => {
    if (freeList && !freeList.includes(i) && !unlocked) return needLogin();
    setMsg(null);
    applyCosmetic({ [key]: i });
  };
  // Cara y vaso se bloquean por índice (los primeros N son gratis).
  const pickByCount = (key, i, freeCount) => {
    if (i >= freeCount && !unlocked) return needLogin();
    setMsg(null);
    applyCosmetic({ [key]: i });
  };

  const doSave = async () => {
    const res = await saveCosmetic();
    setMsg(res?.local ? 'Guardado en este dispositivo.' : 'Personaje guardado en tu cuenta.');
  };

  const TABS = [
    { id: 'cuerpo', label: 'Cuerpo' },
    { id: 'color', label: 'Color' },
    { id: 'cabeza', label: 'Cabeza' },
    { id: 'cara', label: 'Cara' },
    { id: 'accesorio', label: 'Accesorio' },
    { id: 'vaso', label: 'Vaso' },
  ];

  // Pequeña ayuda de "qué viene gratis" por pestaña.
  const freeHint = {
    cuerpo: !unlocked ? 'Capucha y Punk gratis' : null,
    color: 'Todos los colores disponibles',
    cabeza: !unlocked ? 'Ninguno, Mohawk y Capucha gratis' : null,
    cara: !unlocked ? `Las primeras ${FREE_FACES} gratis` : null,
    accesorio: !unlocked ? 'Solo "Ninguno" gratis' : null,
    vaso: !unlocked ? `Los primeros ${FREE_CUPS} gratis` : null,
  }[tab];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#15211a] border border-bone/15 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-bone/10 shrink-0">
          <h2 className="text-amber-glow font-bold tracking-wide">PERSONALIZAR PERSONAJE</h2>
          <button onClick={onClose} className="text-bone/50 hover:text-bone text-xl leading-none">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-5 p-5 overflow-y-auto">
          {/* ── Vista previa (siempre visible) ── */}
          <div className="flex flex-col items-center justify-center bg-black/25 rounded-xl py-6 md:sticky md:top-0 self-start">
            <p className="text-bone/40 text-[11px] uppercase tracking-widest mb-2">Vista previa</p>
            <Character hood={cosmetic.hood} face={cosmetic.face} body={cosmetic.body} hat={cosmetic.hat} acc={cosmetic.acc} size={150} />
            <div className="-mt-5">
              <Cup size={60} style={cosmetic.cup} />
            </div>
            <p className="text-bone/50 text-xs mt-3 text-center px-3">
              {BODY_NAMES[cosmetic.body] || '—'} · {HOOD_NAMES[cosmetic.hood] || '—'} · {CUP_NAMES[cosmetic.cup] || '—'}
            </p>
          </div>

          {/* ── Controles por pestañas ── */}
          <div className="flex flex-col">
            {/* Pestañas */}
            <div className="flex flex-wrap gap-1.5 mb-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setMsg(null); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    tab === t.id ? 'bg-amber-glow text-black' : 'bg-black/30 text-bone/55 hover:text-bone hover:bg-black/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Ayuda de la pestaña activa */}
            <p className="text-bone/35 text-[11px] h-4 mb-3">{freeHint || ''}</p>

            {/* Panel de la pestaña activa */}
            <div className="min-h-[150px]">
              {tab === 'cuerpo' && (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: BODY_COUNT }).map((_, i) => (
                    <Chip key={i} active={cosmetic.body === i} locked={!FREE_BODIES.includes(i) && !unlocked} onClick={() => pick('body', i, FREE_BODIES)}>
                      {BODY_NAMES[i]}
                    </Chip>
                  ))}
                </div>
              )}

              {tab === 'color' && (
                <div className="flex flex-wrap gap-2.5">
                  {Array.from({ length: HOOD_COUNT }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setMsg(null); applyCosmetic({ hood: i }); }}
                      title={HOOD_NAMES[i]}
                      className={`w-9 h-9 rounded-full border-2 transition ${cosmetic.hood === i ? 'border-amber-glow scale-110' : 'border-black/40 hover:border-bone/40'}`}
                      style={{ background: HOODS[i].hood }}
                    />
                  ))}
                </div>
              )}

              {tab === 'cabeza' && (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: HAT_COUNT }).map((_, i) => (
                    <Chip key={i} active={cosmetic.hat === i} locked={!FREE_HATS.includes(i) && !unlocked} onClick={() => pick('hat', i, FREE_HATS)}>
                      {HAT_NAMES[i]}
                    </Chip>
                  ))}
                </div>
              )}

              {tab === 'cara' && (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: FACE_COUNT }).map((_, i) => (
                    <Chip key={i} active={cosmetic.face === i} locked={i >= FREE_FACES && !unlocked} onClick={() => pickByCount('face', i, FREE_FACES)}>
                      {FACE_NAMES[i]}
                    </Chip>
                  ))}
                </div>
              )}

              {tab === 'accesorio' && (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: ACC_COUNT }).map((_, i) => (
                    <Chip key={i} active={cosmetic.acc === i} locked={!FREE_ACCS.includes(i) && !unlocked} onClick={() => pick('acc', i, FREE_ACCS)}>
                      {ACC_NAMES[i]}
                    </Chip>
                  ))}
                </div>
              )}

              {tab === 'vaso' && (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: CUP_COUNT }).map((_, i) => (
                    <Chip key={i} active={cosmetic.cup === i} locked={i >= FREE_CUPS && !unlocked} onClick={() => pickByCount('cup', i, FREE_CUPS)}>
                      {CUP_NAMES[i]}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            {/* Guardar */}
            <div className="border-t border-bone/10 pt-3 mt-4">
              <button onClick={doSave} className="w-full bg-amber-glow text-black rounded-lg px-3 py-2.5 text-sm font-bold">
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
