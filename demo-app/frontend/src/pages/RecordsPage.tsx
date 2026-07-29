import { useEffect, useState } from "react";
import {
  ApiError, Badge, Button, DataTableCard, FilterConditions, FilterControl, PageHeader,
  PaginationCardMinimal, Table, apiFetch, login, useTableQuery, useTenant,
} from "@platform/shared-ui";
import type { DataColumn, FilterField } from "@platform/shared-ui";
import { changeColors, changeLabels } from "./changes";
import type { Counts, Pending } from "./changes";

/** A record as Cloudera holds it. The module keeps no copy. */
interface PlatformRecord {
  id: string;
  name: string;
  category: string;
  changedAt: string | null;
  pending: Pending | null;
}

/** What a condition can be put on here — the same names the API knows. */
const fields: FilterField[] = [
  { id: "any", label: "Alle Felder" },
  { id: "recordId", label: "Datensatz" },
  { id: "name", label: "Name" },
  { id: "category", label: "Kategorie" },
  { id: "changedAt", label: "Geändert", kind: "presence" },
];

const columns: DataColumn[] = [
  { id: "recordId", label: "Datensatz", isRowHeader: true, allowsSorting: true, placeholder: "w-24" },
  { id: "name", label: "Name", allowsSorting: true, className: "w-full", placeholder: "w-56" },
  { id: "category", label: "Kategorie", allowsSorting: true, placeholder: "w-24" },
  { id: "pending", label: "Änderung", placeholder: "w-16" },
  { id: "changedAt", label: "Geändert", allowsSorting: true, placeholder: "w-28" },
];

export function RecordsPage({ title }: { title: string }) {
  const { activeTenant, tenantPath } = useTenant();
  const records = useTableQuery<PlatformRecord>({ path: "/records", sort: "recordId" });
  const [counts, setCounts] = useState<Counts | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCounts = () =>
    apiFetch<Counts>(tenantPath("/changes/counts")).then(setCounts).catch(() => setCounts(null));

  useEffect(() => {
    if (activeTenant) {
      void loadCounts();
    }
  }, [activeTenant]);

  /**
   * A write that fails must say so. Left unhandled it looks like it worked: the edit
   * closes, the row keeps its old name — which is exactly what a *successful* request
   * looks like here, since nothing changes until the batch runs.
   */
  const submitting = async (work: Promise<unknown>) => {
    try {
      await work;
      setNotice(null);
      records.reload();
      void loadCounts();
    }
    catch (failure: unknown) {
      // An expired session is not an error to report, it is a login to start again.
      if (failure instanceof ApiError && failure.status === 401) {
        login();
        return;
      }
      setNotice(
        failure instanceof ApiError
          ? failure.message
          : "Der Antrag konnte nicht gestellt werden.",
      );
    }
  };

  /**
   * An edit is a *request*, not a write: the module never changes the platform on a
   * keystroke. The row keeps its old name until the batch has applied the change, which
   * is why the queued count next to it goes up straight away.
   */
  const rename = (recordId: string, newValue: string) =>
    submitting(
      apiFetch(tenantPath("/changes"), {
        method: "POST",
        body: JSON.stringify({ recordId, kind: "rename", newValue }),
      }),
    );

  if (records.error) {
    return <p className="text-sm text-error-primary">{records.error}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <p className="rounded-lg bg-error-primary px-4 py-3 text-sm text-error-primary ring-1 ring-error">
          {notice}
        </p>
      )}
      <PageHeader
        title={title}
        description={`Aus der Datenbasis für Mandant ${activeTenant ?? "–"} — der führenden Quelle, nicht aus einer Kopie. Namen lassen sich direkt in der Liste ändern.`}
      />

      {(counts?.draft ?? 0) > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-primary px-4 py-3 ring-1 ring-warning">
          <p className="text-sm text-primary">
            <span className="font-semibold">
              {counts!.draft.toLocaleString("de-DE")} Änderungen vorgemerkt.
            </span>{" "}
            Sie sind noch nicht unterwegs — prüfen und dann gemeinsam einreichen.
          </p>
          <Button size="sm" color="secondary" href="/changes">
            Prüfen
          </Button>
        </div>
      )}

      <DataTableCard
        title="Alle Datensätze"
        unit="Datensätze"
        total={records.total}
        loading={records.loading}
        columns={columns}
        rows={records.rows}
        empty="Kein Datensatz erfüllt diese Bedingungen."
        sortDescriptor={records.sortDescriptor}
        onSortChange={records.onSortChange}
        conditions={
          records.conditions.length > 0 ? (
            <FilterConditions
              fields={fields}
              conditions={records.conditions}
              onRemove={records.remove}
            />
          ) : undefined
        }
        actions={
          <FilterControl
            fields={fields}
            conditions={records.draft}
            onChange={records.setDraft}
            dirty={records.dirty}
            active={records.conditions.length}
            onApply={records.apply}
          />
        }
        footer={
          // Untitled UI's minimal pagination card — forward, back, and how many rows a
          // page holds. Not the one with page numbers: a cursor cannot land on page 137
          // without walking there, and pretending otherwise would mean the offset query
          // this was built to avoid.
          <PaginationCardMinimal
            align="center"
            page={records.page + 1}
            total={records.lastPage + 1}
            pageSize={records.size}
            onPageChange={records.onPageChange}
            onPageSizeChange={records.onPageSizeChange}
          />
        }
      >
        {(row: PlatformRecord) => (
          <Table.Row id={row.id} className={row.pending ? "bg-warning-primary" : undefined}>
            <Table.Cell className="whitespace-nowrap font-medium text-primary">
              {row.id}
            </Table.Cell>
            <Table.Cell>
              <NameCell row={row} onSave={(value) => void rename(row.id, value)} />
            </Table.Cell>
            <Table.Cell>{row.category}</Table.Cell>
            <Table.Cell>
              {row.pending ? (
                <Badge size="sm" type="pill-color" color={changeColors[row.pending.status] ?? "gray"}>
                  {changeLabels[row.pending.status] ?? row.pending.status}
                </Badge>
              ) : (
                <span className="text-tertiary">–</span>
              )}
            </Table.Cell>
            <Table.Cell className="whitespace-nowrap">
              {row.changedAt ? new Date(row.changedAt).toLocaleString("de-DE") : "–"}
            </Table.Cell>
          </Table.Row>
        )}
      </DataTableCard>
    </div>
  );
}

/**
 * The name, editable in place. An edit does not change the record — it asks for the
 * change, so the cell returns to the old name and the queue count goes up.
 *
 * <p>The draft lives here rather than in the page. React Aria renders table rows through
 * its collection API, which re-renders a cell when its row data changes and not when some
 * unrelated state in the page does — a draft held further up simply never arrives.
 */
function NameCell({ row, onSave }: {
  row: PlatformRecord;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const requested = row.pending?.kind === "rename" ? row.pending.newValue : null;

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(requested ?? row.name)}
        title="Umbenennung beantragen"
        className="-mx-2 w-full cursor-text rounded-md px-2 py-0.5 text-left outline-focus-ring hover:bg-secondary focus-visible:outline-2"
      >
        {/* Both values on one line, because at this density there is no second one: the
            requested name, then the one still in force, struck through. The platform still
            holds the old name, and the new one is only what was asked for. */}
        {requested ? (
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-medium text-primary">{requested}</span>
            <span className="truncate text-xs text-tertiary line-through">{row.name}</span>
          </span>
        ) : (
          <span className="truncate">{row.name}</span>
        )}
      </button>
    );
  }

  const submit = () => {
    const trimmed = draft.trim();
    setDraft(null);
    if (trimmed && trimmed !== row.name) {
      onSave(trimmed);
    }
  };

  return (
    <input
      autoFocus
      value={draft}
      aria-label={`Name von ${row.id}`}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={submit}
      // Capture, not bubble. The surrounding grid handles keys for its own navigation —
      // Enter, arrows, Home/End — and a handler that waits for the bubble phase never
      // sees them: Enter does nothing and the arrows yank the caret out of the field.
      onKeyDownCapture={(event) => {
        if (event.key === "Enter") {
          submit();
        }
        if (event.key === "Escape") {
          setDraft(null);
        }
        event.stopPropagation();
      }}
      className="-mx-2 w-full rounded-md bg-primary px-2 py-0.5 text-sm text-primary ring-1 ring-brand outline-focus-ring focus-visible:outline-2"
    />
  );
}
