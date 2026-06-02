import { io } from 'socket.io-client';

// URL del servidor de WebSockets.
// - En desarrollo: usa VITE_SERVER_URL o localhost:3001.
// - En producción (build servido por el propio servidor): usa el MISMO origen,
//   por lo que basta con una cadena vacía (Socket.io se conecta a window.location).
const isDev = import.meta.env.DEV;
const SERVER_URL = isDev
  ? import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
  : import.meta.env.VITE_SERVER_URL || ''; // mismo origen en producción

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
