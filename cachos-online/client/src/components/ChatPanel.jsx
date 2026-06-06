import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';

// Chat lateral (izquierda). Los mensajes también aparecen como burbuja sobre
// el avatar del jugador (ver GameTable). Colapsable para no estorbar.
export default function ChatPanel() {
  const { state, playerId, sendChat } = useGame();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(true);
  const listRef = useRef(null);
  const messages = state?.chat || [];

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendChat(t);
    setText('');
  };

  return (
    <div className="chat-panel">
      <div className="glass rounded-2xl p-3 flex flex-col h-full">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center justify-between w-full text-xs uppercase tracking-wide text-bone/50 hover:text-bone/80 transition"
        >
          <span>Chat</span>
          <span className="text-bone/40">{open ? '▾' : '▸'}</span>
        </button>

        {open && (
          <>
            <div ref={listRef} className="space-y-1.5 overflow-y-auto flex-1 pr-1 text-sm mt-2 min-h-0">
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

            <div className="flex gap-2 mt-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                maxLength={200}
                placeholder="Escribe…"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/10 focus:border-amber-glow/60 outline-none text-sm text-bone placeholder:text-bone/30"
              />
              <button
                onClick={send}
                className="px-3 py-2 rounded-lg bg-amber-glow text-felt-900 text-sm font-bold hover:brightness-105 transition"
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
