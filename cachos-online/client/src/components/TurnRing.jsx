import React, { useEffect, useState } from 'react';

// Anillo de cuenta regresiva del turno (estilo reloj de chess.com).
// Usa state.turnDeadline (epoch ms, lo fija el servidor al armar su timer),
// por lo que siempre está sincronizado con el timeout real.
export default function TurnRing({ deadline, totalSeconds, size = 116 }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline) return undefined;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [deadline]);

  if (!deadline || !totalSeconds) return null;

  const remaining = Math.max(0, deadline - now);
  const frac = Math.min(1, remaining / (totalSeconds * 1000));
  const low = remaining <= 5000;

  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;

  return (
    <svg className="turn-ring" width={size} height={size}>
      <circle className="turn-ring__bg" cx={size / 2} cy={size / 2} r={r} strokeWidth="4" />
      <circle
        className={['turn-ring__fg', low ? 'turn-ring__fg--low' : ''].join(' ')}
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth="4"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
      />
    </svg>
  );
}
