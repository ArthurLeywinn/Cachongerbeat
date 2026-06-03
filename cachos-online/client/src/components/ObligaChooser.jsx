import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import Die from './Die.jsx';
import { FACE_NAMES } from '../lib/rules.js';

// =============================================================================
// ObligaChooser — Overlay que aparece cuando ME toca elegir mi Obliga
// (al quedar con 1 dado por primera y única vez). Permite elegir entre las
// cuatro modalidades; en Kamikaze pide además declarar una pinta.
// =============================================================================

const MODES = [
  {
    id: 'kamikaze',
    title: 'Kamikaze',
    desc: 'Declaras una pinta. Tras lanzar, TODOS (tú incluido) pierden los dados que muestren esa pinta.',
    accent: 'kamikaze',
  },
  {
    id: 'abierto',
    title: 'Abierto',
    desc: 'No ves tu dado, pero sí los de todos los demás. El resto juega normal.',
    accent: 'abierto',
  },
  {
    id: 'cerradoA',
    title: 'Cerrado · "de esta"',
    desc: 'Solo tú ves tu dado. Abres con "1 de esta": la pinta queda oculta. Los demás solo suben cantidad o dudan.',
    accent: 'cerrado',
  },
  {
    id: 'cerradoB',
    title: 'Cerrado · normal',
    desc: 'Tú ves tu dado; los demás no ven los suyos. Reglas normales (cambio de pinta y ases).',
    accent: 'cerrado',
  },
];

export default function ObligaChooser() {
  const { state, chooseObliga } = useGame();
  const [mode, setMode] = useState(null);
  const [face, setFace] = useState(3);
  const [busy, setBusy] = useState(false);

  if (!state?.youMustChooseObliga) return null;

  const confirm = async () => {
    if (!mode) return;
    setBusy(true);
    await chooseObliga(mode, mode === 'kamikaze' ? face : undefined);
    setBusy(false);
  };

  return (
    <div className="obliga-overlay">
      <div className="obliga-card">
        <p className="obliga-tag">Te queda 1 dado · Obliga</p>
        <h2 className="obliga-title">Elige tu Obliga</h2>
        <p className="obliga-sub">Es un beneficio único en toda la partida. Elige bien.</p>

        <div className="obliga-modes">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={['obliga-mode', mode === m.id ? 'obliga-mode--active' : ''].join(' ')}
            >
              <span className="obliga-mode__title">{m.title}</span>
              <span className="obliga-mode__desc">{m.desc}</span>
            </button>
          ))}
        </div>

        {/* Declarar pinta para Kamikaze */}
        {mode === 'kamikaze' && (
          <div className="obliga-declare">
            <p className="text-xs uppercase tracking-wide text-bone/50 mb-2 text-center">
              Declara la pinta
            </p>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6].map((f) => (
                <button
                  key={f}
                  onClick={() => setFace(f)}
                  className={[
                    'flex flex-col items-center gap-1 p-2 rounded-xl transition',
                    face === f ? 'bg-amber-glow/20 ring-2 ring-amber-glow' : 'bg-black/20 hover:bg-black/30',
                  ].join(' ')}
                  title={FACE_NAMES[f]}
                >
                  <Die value={f} size={28} />
                  <span className="text-[10px] text-bone/50 leading-none">{FACE_NAMES[f]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={confirm}
          disabled={!mode || busy}
          className="obliga-confirm"
        >
          {busy ? 'Activando…' : mode ? 'Activar Obliga' : 'Selecciona una modalidad'}
        </button>
      </div>
    </div>
  );
}
