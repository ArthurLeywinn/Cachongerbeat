import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, el cliente corre en :5173 y el servidor en :3001.
// El cliente se conecta directo al servidor vía VITE_SERVER_URL (ver src/socket.js).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
