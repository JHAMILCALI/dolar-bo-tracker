import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Apunta la carpeta public a la raíz del proyecto,
  // donde el scraper escribe public/data/db.json
  publicDir: path.resolve(__dirname, '../public'),
})
