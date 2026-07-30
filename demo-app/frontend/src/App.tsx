import { lazy, Suspense } from "react";
import { CheckDone01, Database01, PieChart03, Table } from "@untitledui/icons";
import { RouterProvider } from "react-aria-components";
import { BrowserRouter, Navigate, Route, Routes, useHref, useLocation, useNavigate } from "react-router-dom";
import { AppShell, AuthProvider } from "@platform/shared-ui";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then(({ DashboardPage }) => ({ default: DashboardPage })),
);
const RecordsPage = lazy(() =>
  import("./pages/RecordsPage").then(({ RecordsPage }) => ({ default: RecordsPage })),
);
const ChangesPage = lazy(() =>
  import("./pages/ChangesPage").then(({ ChangesPage }) => ({ default: ChangesPage })),
);

/** The navigation *is* the route table — one place, so the two cannot disagree. */
const pages = [
  { id: "/", label: "Übersicht", icon: PieChart03 },
  { id: "/records", label: "Datensätze", icon: Table },
  { id: "/changes", label: "Änderungsanträge", icon: CheckDone01 },
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

/**
 * The router resolves every href against its own base, which turns the portal's absolute
 * address into "/http:/localhost:8081". Links that already name a scheme are not this
 * application's routes and are left alone. (Called unconditionally — it is a hook.)
 */
function useAbsoluteAwareHref(href: string) {
  const routed = useHref(href);
  return /^[a-z][a-z0-9+.-]*:/i.test(href) ? href : routed;
}

function Shell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    // The navigation is built from react-aria links. Without this the browser would
    // follow them itself and reload the whole application on every click.
    <RouterProvider navigate={navigate} useHref={useAbsoluteAwareHref}>
      <AppShell
        appName="Demo"
        icon={Database01}
        nav={pages}
        activeNavId={pathname}
      >
        <Suspense fallback={<p className="text-sm text-tertiary">Lade Ansicht…</p>}>
          <Routes>
            <Route path="/" element={<DashboardPage title={pages[0]!.label} />} />
            <Route path="/records" element={<RecordsPage title={pages[1]!.label} />} />
            <Route path="/changes" element={<ChangesPage title={pages[2]!.label} />} />
            {/* Anything else — the bare root, a stale bookmark — lands on the list rather
                than on an empty frame. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </RouterProvider>
  );
}
