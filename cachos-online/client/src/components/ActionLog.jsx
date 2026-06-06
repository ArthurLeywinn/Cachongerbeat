import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

export default function ActionLog() {
  const { state } = useGame();
  const ref = useRef(null);
  const [open, setOpen] = useState(true); // colapsable

  useEffect(() => {
    if (open && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [state?.log, open]);

  return (
    <div className="glass rounded-2xl p-3 flex flex-col h-full">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-xs uppercase tracking-wide text-bone/50 hover:text-bone/80 transition"
      >
        <span>Historial</span>
        <span className="text-bone/40">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div ref={ref} className="space-y-1.5 overflow-y-auto pr-1 text-sm mt-2" style={{ maxHeight: 260 }}>
          {(state.log || []).length === 0 ? (
            <p className="text-bone/30 italic">Nueva ronda…</p>
          ) : (
            state.log.map((entry) => (
              <p key={entry.id} className="text-bone/70 leading-snug">
                {entry.message}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  );
}
