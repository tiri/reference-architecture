# @platform/shared-ui

Shared frontend library for all platform modules: one look and feel, one auth contract, one API client.

- **Design system**: vendored free components under `src/components/base` and `src/components/application` (MIT — see [LICENSE-untitledui](LICENSE-untitledui)), plus the matching theme in `src/styles`.
- **App shell**: `AppShell` (header with app name, `TenantSwitcher`, `UserMenu`), `AppTile` launcher card.
- **Auth**: `AuthProvider` / `useUser` / `useTenant` — loads `GET /api/me` from the app's own BFF before rendering, redirects to OIDC login on 401, and holds the active tenant. **No tokens ever touch the browser.**
- **API client**: `apiFetch` — same-origin only, turns RFC 9457 problem responses into typed `ApiError`s.

Login and logout are **top-level navigations**, not XHRs: the OIDC redirect chain has to run in the main window. `logout()` posts a form because the session cookie is `SameSite=Lax`, which withholds it from cross-site POSTs. There is **no CSRF token** anywhere in this library — that is the design, not an omission ([8.1](../arch-docs/README.md#8-querschnittliche-konzepte)).

## Consuming

```jsonc
// app frontend package.json
"dependencies": { "@platform/shared-ui": "^0.1.0" }
```

Publish this package to the organisation's npm registry before consuming it. Configure that
registry for the `@platform` scope in the consuming application's `.npmrc`. The package
ships **TypeScript source only** (`exports: ./src/index.ts`) — the consumer's Vite/tsc
compiles it. Requirements in the app:

1. Peer deps installed: `react`, `react-dom`, `react-aria-components`, `tailwindcss`.
2. App CSS imports the theme and scans the installed package source:

```css
@import "@platform/shared-ui/src/styles/globals.css";
@source "../node_modules/@platform/shared-ui/src";
```

3. `tsconfig` uses `moduleResolution: "bundler"` and `jsx: "react-jsx"`.

## Usage sketch

`AuthProvider` takes no wiring — the module's own BFF is the only endpoint it knows:

```tsx
<AuthProvider fallback={<Spinner />}>
  <AppShell appName="Demo">
    <RecordsPage />
  </AppShell>
</AuthProvider>
```

Inside, `useTenant()` gives the active tenant and `tenantPath("/records")` builds
`/api/t/<tenant>/records`. Switching tenants is pure frontend state — no request, no
reload — because the module re-checks the tenant against the token on every call.

## Development

Installed together with the apps, as one npm workspace — see
`dev-starter/npm-workspace.sh`. That is also what gives the tree a single copy of React,
which shared components require.

```bash
../dev-starter/npm-workspace.sh   # once, from any checkout
npm run typecheck
```

Vendored Untitled UI files are unmodified except that `@/…` imports were rewritten to
relative paths — keep it that way so upstream updates stay diffable. Relative rather than
`@platform/shared-ui/src/…`: a package that imports itself by name only resolves where the
consumer has been told how to map that name, which a published package cannot assume.
