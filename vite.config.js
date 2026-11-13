import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const host = env.HOST || true; // true = bind all interfaces (0.0.0.0)

  return {
    server: { host, port: 5173, strictPort: true, allowedHosts: true },
    preview: { host, port: 4173, strictPort: true, allowedHosts: true },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          embed: resolve(__dirname, 'embed.html'),
        },
      },
    },
  };
});
