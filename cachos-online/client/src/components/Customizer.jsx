import React, { useState } from 'react';
import Character, { Cup, HOODS, HOOD_COUNT, FACE_COUNT, FACE_NAMES, CUP_COUNT, CUP_NAMES, BODY_COUNT, BODY_NAMES, HAT_COUNT, HAT_NAMES, ACC_COUNT, ACC_NAMES, PUNK_BODY, MOHAWK_HAT } from './Character.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const HOOD_NAMES = ['Verde', 'Rojo', 'Negro', 'Azul', 'Morado', 'Mostaza'];

// Disponible SIN iniciar sesión (defaults).
const FREE_CUPS = 3;
const FREE_FACES = 3;
const FREE_BODIES = [0, PUNK_BODY];  // capucha simple + punk (default nuevo)
const FREE_HATS = [0, MOHAWK_HAT];   // ninguno + mohawk (default nuevo)
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

// Sección con label claro + contenido. Hace la UI legible de un vistazo.
function Section({ step, title, hint, children }) {
  return (
    <div className="cz-section">
      <div className="flex items-baseline gap-2 mb-2">
        {step && <span className="cz-step">{step}</span>}
        <p className="text-bone/70 text-xs uppercase tracking-wider font-bold">{title}</p>
        {hint && <span className="text-bone/30 text-[11px] normal-case">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function Customizer({ onClose }) {
  const { cosmetic, applyCosmetic, saveCosmetic } = useProfile();
  const { user } = useAuth() || {};
  const unlocked = !!user; // los skins nuevos se desbloquean al iniciar sesión

  const [msg, setMsg] = useState(null);

  const needLogin = () => setMsg('Inicia sesión (arriba a la izquierda) para desbloquear esto.');

  const pickCup = (i) => {
    if (i >= FREE_CUPS && !unlocked) return needLogin();
    setMsg(null);
    applyCosmetic({ cup: i });
  };

  const pickPart = (key, freeList) => (i) => {
    if (!freeList.includes(i) && !unlocked) return needLogin();
    setMsg(null);
    applyCosmetic({ [key]: i });
  };
  const pickBody = pickPart('body', FREE_BODIES);
  const pickHat = pickPart('hat', FREE_HATS);
  const pickAcc = pickPart('acc', FREE_ACCS);

  const doSave = async () => {
    const res = await saveCosmetic();
    setMsg(res?.local ? 'Guardado en este dispositivo.' : 'Personaje guardado en tu cuenta.');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-[#15211a] border border-bone/15 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-bone/10 shrink-0">
          <h2 className="text-amber-glow font-bold tracking-wide">PERSONALIZAR PERSONAJE</h2>
          <button onClick={onClose} className="text-bone/50 hover:text-bone text-xl leading-none">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-4 p-5 overflow-y-auto">
          {/* ── Vista previa (siempre visible) ── */}
          <div className="flex flex-col items-center justify-center bg-black/25 rounded-xl py-6 md:sticky md:top-0 self-start">
            <p className="text-bone/40 text-[11px] uppercase tracking-widest mb-2">Vista previa</p>
            <Character hood={cosmetic.hood} face={cosmetic.face} body={cosmetic.body} hat={cosmetic.hat} acc={cosmetic.acc} size={150} />
            <div className="-mt-5">
              <Cup size={60} style={cosmetic.cup} />
            </div>
            <p className="text-bone/50 text-xs mt-3">
              {BODY_NAMES[cosmetic.body] || '—'} · {HOOD_NAMES[cosmetic.hood] || '—'} · {CUP_NAMES[cosmetic.cup] || '—'}
            </p>
          </div>

          {/* ── Controles en orden claro: 1 Personaje · 2 Capucha · 3 Vaso ── */}
          <div className="flex flex-col gap-5">
            <Section step="1" title="Personaje" hint={!unlocked ? '· Capucha y Punk gratis' : null}>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: BODY_COUNT }).map((_, i) => (
                  <Chip
                    key={i}
                    active={cosmetic.body === i}
                    locked={!FREE_BODIES.includes(i) && !unlocked}
                    onClick={() => pickBody(i)}
                  >
                    {BODY_NAMES[i]}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section step="2" title="Capucha" hint="· color del atuendo">
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
            </Section>

            <Section step="3" title="Vaso (cacho)" hint={!unlocked ? `· ${FREE_CUPS} gratis` : null}>
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
            </Section>

            <div className="border-t border-bone/10 pt-4 flex flex-col gap-5">
              <Section title="Expresión" hint={!unlocked ? `· ${FREE_FACES} gratis` : null}>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: FACE_COUNT }).map((_, i) => (
                    <Chip
                      key={i}
                      active={cosmetic.face === i}
                      locked={i >= FREE_FACES && !unlocked}
                      onClick={() => {
                        if (i >= FREE_FACES && !unlocked) return needLogin();
                        setMsg(null);
                        applyCosmetic({ face: i });
                      }}
                    >
                      {FACE_NAMES[i]}
                    </Chip>
                  ))}
                </div>
              </Section>

              <Section title="Gorro / casco">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: HAT_COUNT }).map((_, i) => (
                    <Chip key={i} active={cosmetic.hat === i} locked={!FREE_HATS.includes(i) && !unlocked} onClick={() => pickHat(i)}>
                      {HAT_NAMES[i]}
                    </Chip>
                  ))}
                </div>
              </Section>

              <Section title="Accesorio">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: ACC_COUNT }).map((_, i) => (
                    <Chip key={i} active={cosmetic.acc === i} locked={!FREE_ACCS.includes(i) && !unlocked} onClick={() => pickAcc(i)}>
                      {ACC_NAMES[i]}
                    </Chip>
                  ))}
                </div>
              </Section>
            </div>

            <div className="border-t border-bone/10 pt-3">
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
