import { useEffect, useState } from "react";
import { AppTile, PageHeader, apiFetch, useUser } from "@platform/shared-ui";

interface PortalApp {
  id: string;
  name: string;
  description: string;
  url: string;
  icon?: string;
}

export function LauncherPage({ title }: { title: string }) {
  const user = useUser();
  const [apps, setApps] = useState<PortalApp[] | null>(null);

  useEffect(() => {
    apiFetch<PortalApp[]>("/api/apps").then(setApps).catch(() => setApps([]));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <PageHeader
        title={`Willkommen zurück, ${user.name.split(" ")[0]}`}
        description="Ihre Anwendungen. Jede öffnet sich mit der Anmeldung, die Sie bereits haben."
      />
      {apps === null ? (
        <p className="text-sm text-tertiary">Anwendungen werden geladen…</p>
      ) : (
        <div // auto-rows-min, or a lone tile stretches to the full height of the column.
          className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-6 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppTile key={app.id} name={app.name} description={app.description} url={app.url} icon={app.icon} />
          ))}
        </div>
      )}
    </div>
  );
}
