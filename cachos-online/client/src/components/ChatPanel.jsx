import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

// Chat lateral (izquierda). Altura fija con scroll interno: nunca afecta el
// layout del tablero. Límite anti-spam de 10 mensajes por turno.
export default function ChatPanel() {
  const { state, playerId, sendChat } = useGame();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(true);
  const listRef = useRef(null);
  const messages = state?.chat || [];
  const remaining = state?.chatRemaining ?? 10;
  const locked = remaining <= 0;

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = () => {
    const t = text.trim();
    if (!t || locked) return;
    sendChat(t);
    setText('');
  };

  return (
    <div className="chat-panel">
      <div className="glass rounded-2xl p-3 flex flex-col chat-card">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full text-xs uppercase tracking-wide text-bone/50 hover:text-bone/80 transition shrink-0"
        >
          <span>Chat</span>
          <span className="text-bone/40">{open ? '▾' : '▸'}</span>
        </button>

        {open && (
          <>
            <div ref={listRef} className="chat-messages space-y-1.5 overflow-y-auto pr-1 text-sm mt-2">
              {messages.length === 0 ? (
                <p className="text-bone/30 italic">Sin mensajes aún…</p>
              ) : (
                messages.map((m) => (
                  <p key={m.id} className="leading-snug">
                    <span
                      className={[
                        'font-semibold',
                        m.playerId === playerId ? 'text-amber-glow' : 'text-sky-300',
                      ].join(' ')}
                    >
                      {m.name}:
                    </span>{' '}
                    <span className="text-bone/80">{m.text}</span>
                  </p>
                ))
              )}
            </div>

            <div className="flex gap-2 mt-2 shrink-0">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                maxLength={200}
                disabled={locked}
                placeholder={locked ? 'Límite alcanzado…' : 'Escribe…'}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-amber-glow/60 outline-none text-sm text-bone placeholder:text-bone/30 disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={locked}
                className="px-3 py-2 rounded-lg bg-amber-glow text-felt-900 text-sm font-bold hover:brightness-105 transition disabled:opacity-40"
              >
                ➤
              </button>
            </div>
            {locked ? (
              <p className="text-[10px] text-bone/40 mt-1 shrink-0">
                Límite de chat por turno alcanzado. Espera al siguiente turno.
              </p>
            ) : (
              remaining <= 3 && (
                <p className="text-[10px] text-bone/30 mt-1 shrink-0">{remaining} mensajes restantes este turno</p>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
