import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Same dev pattern as the portal: browser talks only to Vite; BFF paths are proxied
// without Host rewriting so OIDC redirect URIs stay on this origin (registered in the
// dev realm).
const bff = "http://localhost:8082";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // shared-ui is consumed as source and has its own node_modules, so these would be
    // bundled twice — same version, two module instances, two sets of React contexts.
    // The visible symptom is subtle: a react-aria RouterProvider set up here is invisible
    // to the links in shared-ui, and every navigation reloads the whole application.
    dedupe: ["react", "react-dom", "react-aria-components", "react-aria", "react-stately"],
  },
  server: {
    port: 5174,
    proxy: Object.fromEntries(
      ["/api", "/logout", "/oidc-logout", "/callback", "/q"].map((path) => [path, { target: bff, changeOrigin: false }]),
    ),
  },
});
