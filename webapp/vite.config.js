// EduWeb – React portal for the Campus ERP backend. Fetches go straight to the
// Flask API on :5000 (CORS is open); production build is static files for Flask.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: { port: 5173 },
  plugins: [react()],
})