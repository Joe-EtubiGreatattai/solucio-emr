import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// /api calls (and the live-update socket) are forwarded to the backend, so there's no CORS setup needed in dev
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5176, // HR 5173, Payroll 5174
    proxy: {
      '/api': 'http://localhost:4200',
      '/socket.io': { target: 'http://localhost:4200', ws: true },
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:4200',
      '/socket.io': { target: 'http://localhost:4200', ws: true },
    },
  },
});
