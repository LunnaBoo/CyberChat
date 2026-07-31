// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // SPA mode: ship a static client shell (dist/client/_shell.html) instead of an SSR server.
    // The app does all data/auth on the client (Supabase + localStorage), so no SSR is needed.
    // This is what makes the nginx Docker deployment possible.
    spa: { enabled: true },
  },
  // The app is a pure client-side SPA; there is no nitro server runtime to deploy.
  nitro: false,
  vite: {
    server: {
      // Allow ngrok's random *.ngrok-free.app host header through the dev server
      // (Vite 8 rejects unknown hosts by default).
      allowedHosts: true,
      // Same-origin API: proxy Supabase (local instance on :54321) so the
      // browser never makes cross-origin requests. Avoids ngrok's free-tier
      // browser interstitial (ERR_NGROK_6024) and CORS preflight overhead.
      proxy: {
        "/rest": { target: "http://127.0.0.1:54321", changeOrigin: true },
        "/realtime": {
          target: "http://127.0.0.1:54321",
          changeOrigin: true,
          ws: true,
        },
        "/auth": { target: "http://127.0.0.1:54321", changeOrigin: true },
        "/storage": { target: "http://127.0.0.1:54321", changeOrigin: true },
      },
    },
  },
});
