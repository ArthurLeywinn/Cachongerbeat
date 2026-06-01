import { io } from 'socket.io-client';

// URL del servidor. En desarrollo apunta a localhost:3001.
// Configurable con VITE_SERVER_URL para despliegues.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});

// Promesa simple para emitir eventos con callback (ack).
export function emitAck(event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response) => resolve(response || { ok: false }));
  });
}
