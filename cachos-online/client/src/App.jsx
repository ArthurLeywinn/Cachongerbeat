import React, { useEffect } from 'react';
import { useGame } from './context/GameContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Home from './components/Home.jsx';
import Lobby from './components/Lobby.jsx';
import GameTable from './components/GameTable.jsx';
import Toast from './components/Toast.jsx';
import InviteToast from './components/InviteToast.jsx';

export default function App() {
  const { state, connected, error, setError } = useGame();
  const { loading } = useAuth();

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3500);
    return () => clearTimeout(t);
  }, [error, setError]);

  // Mientras verificamos la sesión guardada, no renderizamos nada.
  if (loading) return null;

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
      <InviteToast />
    </div>
  );
}
