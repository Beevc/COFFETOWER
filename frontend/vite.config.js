import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true, // puerto fijo y exclusivo del frappé (evita chocar con otros proyectos)
    host: true, // expone el server en la red local (accesible desde el teléfono)
    proxy: {
      // Todo lo que empiece con /api se reenvía al backend Express.
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
