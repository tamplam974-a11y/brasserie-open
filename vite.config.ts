import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : le site fonctionne depuis n’importe quel sous-dossier (GitHub Pages).
// Port fixe : les recettes mémorisées dépendent de l’adresse (localhost:5174). Si le port est pris, Vite s’arrête au lieu d’en changer.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  // Partage : `npm run partage` sert le site construit sur le même port, donc avec les mêmes recettes mémorisées.
  // Seuls les noms de domaine des services de tunnel listés ici sont acceptés en plus de localhost et des adresses IP.
  preview: { port: 5174, strictPort: true, allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.app', '.ts.net'] },
});
