import { lazy, Suspense } from "react";
import { Grid01, Rows01 } from "@untitledui/icons";
import { RouterProvider } from "react-aria-components";
import { BrowserRouter, Navigate, Route, Routes, useHref, useLocation, useNavigate } from "react-router-dom";
import { AppShell, AuthProvider } from "@platform/shared-ui";

const LauncherPage = lazy(() =>
  import("./pages/LauncherPage").then(({ LauncherPage }) => ({ default: LauncherPage })),
);

/** The navigation *is* the route table — one place, so the two cannot disagree. */
const pages = [
  { id: "/apps", label: "Anwendungen", icon: Rows01 },
];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}

function Shell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    // The navigation is built from react-aria links. Without this the browser would
    // follow them itself and reload the whole application on every click.
    <RouterProvider navigate={navigate} useHref={useHref}>
      {/* The portal wears the same shape as every module. It holds a launcher rather than
          a business list, but that is a difference in content, not in how it is read. */}
      <AppShell appName="Portal" icon={Grid01} nav={pages} activeNavId={pathname}>
        <Suspense fallback={<p className="text-sm text-tertiary">Lade Ansicht…</p>}>
          <Routes>
            <Route path="/apps" element={<LauncherPage title={pages[0]!.label} />} />
            <Route path="*" element={<Navigate to="/apps" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </RouterProvider>
  );
}
