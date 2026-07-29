import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Edit03, MarkerPin01, Tag01 } from "@untitledui/icons";
import { ApiError, MetricCard, PageHeader, apiFetch, useTenant } from "@platform/shared-ui";

/** What the two sources know: the platform holds the records, the module the requests. */
interface Dashboard {
  records: number;
  changedRecords: number;
  categories: number;
  draft: number;
  open: number;
  applied: number;
  failed: number;
}

export function DashboardPage({ title }: { title: string }) {
  const { activeTenant, tenantPath } = useTenant();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTenant) {
      return;
    }
    let current = true;
    setData(null);
    apiFetch<Dashboard>(tenantPath("/dashboard"))
      .then((loaded) => current && setData(loaded))
      .catch((e: unknown) =>
        current && setError(e instanceof ApiError ? e.message : "Übersicht nicht verfügbar"),
      );
    return () => {
      current = false;
    };
  }, [activeTenant]);

  if (error) {
    return <p className="text-sm text-error-primary">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={title}
        description={`Was die Datenbasis für Mandant ${activeTenant ?? "–"} hält und was dieses Modul daran ändern möchte.`}
      />

      <div>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-primary">Bestand</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* Each figure links to the page it was counted on, so a dashboard is a way
                into the work and not only a picture of it. */}
            <MetricCard title="Anschriften" value={data?.records} icon={MarkerPin01} href="/records" />
            <MetricCard title="Bereits geändert" value={data?.changedRecords} icon={Edit03} href="/records" />
            <MetricCard title="Kategorien" value={data?.categories} icon={Tag01} />
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-primary">Änderungen</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* The two that are still on their way, first: they are the ones a reader can
                still do something about. */}
            <MetricCard title="Vorgemerkt" value={data?.draft} icon={Edit03} tone="warning" href="/changes" />
            <MetricCard title="Eingereicht" value={data?.open} icon={Clock} tone="brand" href="/changes" />
            <MetricCard title="Übernommen" value={data?.applied} icon={CheckCircle} tone="success" href="/changes" />
            <MetricCard title="Fehlgeschlagen" value={data?.failed} icon={AlertTriangle} tone="error" href="/changes" />
          </div>
        </section>
      </div>
    </div>
  );
}
