import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev flow: the browser talks only to this Vite server. BFF paths (API, OIDC login,
// callback, logout) are proxied to the portal BFF WITHOUT changing the Host header, so
// the BFF generates redirect URIs on this origin — those are registered in the dev realm.
const bff = "http://localhost:9001";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // shared-ui is consumed as source and has its own node_modules, so these would be
    // bundled twice — same version, two module instances, two sets of React contexts.
    dedupe: ["react", "react-dom", "react-aria-components", "react-aria", "react-stately"],
  },
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      ["/api", "/logout", "/oidc-logout", "/callback", "/q"].map((path) => [path, { target: bff, changeOrigin: false }]),
    ),
  },
});
