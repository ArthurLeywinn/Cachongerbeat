import React, { useEffect } from 'react';
import { useGame } from './context/GameContext.jsx';
import Home from './components/Home.jsx';
import Lobby from './components/Lobby.jsx';
import GameTable from './components/GameTable.jsx';
import Toast from './components/Toast.jsx';

// Enruta entre las pantallas según el estado recibido del servidor.
export default function App() {
  const { state, connected, error, setError } = useGame();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error, setError]);

  let screen;
  if (!state) {
    screen = <Home />;
  } else if (state.status === 'lobby') {
    screen = <Lobby />;
  } else {
    screen = <GameTable />;
  }

  return (
    <div className="min-h-full">
      {!connected && (
        <div className="fixed top-0 inset-x-0 z-50 bg-red-600/90 text-center text-sm py-1.5 font-medium">
          Conexión perdida… reintentando
        </div>
      )}
      {screen}
      <Toast message={error} />
    </div>
  );
}
