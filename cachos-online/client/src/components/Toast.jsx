import React from 'react';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-pop">
      <div className="glass px-5 py-3 rounded-xl text-sm font-medium text-bone shadow-cup border-amber-glow/30">
        {message}
      </div>
    </div>
  );
}
