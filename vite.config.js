import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(() => {
  return {
    plugins: [react(),tailwindcss(),],
    base: '/', 
    server: {
      host: true, // Esto permite que se acceda desde la IP 10.20.1.10
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001', // Usamos la IP local del servidor
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})