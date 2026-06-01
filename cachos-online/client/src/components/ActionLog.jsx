import React, { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext.jsx';

export default function ActionLog() {
  const { state } = useGame();
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [state?.log]);

  return (
    <div className="glass rounded-2xl p-4 flex flex-col h-full">
      <p className="text-xs uppercase tracking-wide text-bone/50 mb-2">Historial</p>
      <div ref={ref} className="space-y-1.5 overflow-y-auto flex-1 pr-1 text-sm">
        {(state.log || []).map((entry) => (
          <p key={entry.id} className="text-bone/70 leading-snug">
            {entry.message}
          </p>
        ))}
      </div>
    </div>
  );
}
