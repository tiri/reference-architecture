import { useEffect, useState } from "react";
import { Trash01 } from "@untitledui/icons";
import {
  ApiError, Badge, Button, DataTableCard, FilterConditions, FilterControl, PageHeader,
  PaginationCardMinimal, Table, TableRowActionsDropdown, apiFetch, login, useTableQuery,
  useTenant,
} from "@platform/shared-ui";
import type { DataColumn, FilterField } from "@platform/shared-ui";
import { changeColors, changeLabels, kindLabels } from "./changes";
import type { Change, Counts } from "./changes";

/**
 * Status and Art hold codes, and the table shows their German names. They are offered as
 * a choice of exactly those names — the reader filters by what they can see, and the code
 * that goes to the API is never something they had to know.
 */
const fields: FilterField[] = [
  { id: "any", label: "Alle Felder" },
  { id: "recordId", label: "Datensatz" },
  { id: "newValue", label: "Neuer Wert" },
  {
    id: "status",
    label: "Status",
    options: Object.entries(changeLabels).map(([id, label]) => ({ id, label })),
  },
  {
    id: "kind",
    label: "Art",
    options: Object.entries(kindLabels).map(([id, label]) => ({ id, label })),
  },
];

const columns: DataColumn[] = [
  { id: "recordId", label: "Datensatz", isRowHeader: true, allowsSorting: true, placeholder: "w-24" },
  { id: "kind", label: "Art", allowsSorting: true, placeholder: "w-24" },
  { id: "newValue", label: "Neuer Wert", allowsSorting: true, className: "w-full", placeholder: "w-56" },
  { id: "status", label: "Status", allowsSorting: true, placeholder: "w-20" },
  { id: "requestedAt", label: "Beantragt", allowsSorting: true, placeholder: "w-28" },
  { id: "actions", label: "", placeholder: "w-6" },
];

/**
 * The queue this module owns: what has been asked of the platform and has not happened
 * yet. Asked exactly as the record list is — the same conditions, sort and paging — and
 * answered from this module's own database, which is a difference in cost, not in kind.
 */
export function ChangesPage({ title }: { title: string }) {
  const { activeTenant, tenantPath } = useTenant();
  const changes = useTableQuery<Change>({
    path: "/changes",
    sort: "requestedAt",
    // Newest first: a queue is read from the end that just moved.
    direction: "descending",
  });
  const [counts, setCounts] = useState<Counts | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCounts = () =>
    apiFetch<Counts>(tenantPath("/changes/counts")).then(setCounts).catch(() => setCounts(null));

  useEffect(() => {
    if (activeTenant) {
      void loadCounts();
    }
  }, [activeTenant]);

  const submitting = async (work: Promise<unknown>) => {
    try {
      await work;
      setNotice(null);
      changes.reload();
      void loadCounts();
    }
    catch (failure: unknown) {
      // An expired session is not an error to report, it is a login to start again.
      if (failure instanceof ApiError && failure.status === 401) {
        login();
        return;
      }
      setNotice(failure instanceof ApiError ? failure.message : "Das hat nicht geklappt.");
    }
  };

  if (changes.error) {
    return <p className="text-sm text-error-primary">{changes.error}</p>;
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
        description="Vorgemerkte Änderungen prüfen und einreichen. Der Batch-Lauf übernimmt sie danach in die Datenbasis."
      >
        {(counts?.draft ?? 0) > 0 && (
          <Button
            size="md"
            color="primary"
            onClick={() =>
              void submitting(apiFetch(tenantPath("/changes/submit"), { method: "POST" }))}
          >
            {counts!.draft.toLocaleString("de-DE")} einreichen
          </Button>
        )}
      </PageHeader>

      <DataTableCard
        title="Änderungsanträge"
        unit="Anträge"
        total={changes.total}
        loading={changes.loading}
        columns={columns}
        rows={changes.rows}
        empty="Kein Antrag erfüllt diese Bedingungen."
        sortDescriptor={changes.sortDescriptor}
        onSortChange={changes.onSortChange}
        conditions={
          changes.conditions.length > 0 ? (
            <FilterConditions
              fields={fields}
              conditions={changes.conditions}
              onRemove={changes.remove}
            />
          ) : undefined
        }
        actions={
          <FilterControl
            fields={fields}
            conditions={changes.draft}
            onChange={changes.setDraft}
            dirty={changes.dirty}
            active={changes.conditions.length}
            onApply={changes.apply}
          />
        }
        footer={
          <PaginationCardMinimal
            align="center"
            page={changes.page + 1}
            total={changes.lastPage + 1}
            pageSize={changes.size}
            onPageChange={changes.onPageChange}
            onPageSizeChange={changes.onPageSizeChange}
          />
        }
      >
        {(change: Change) => (
          <Table.Row
            id={change.id}
            className={change.status === "DRAFT" ? "bg-warning-primary" : undefined}
          >
            <Table.Cell className="whitespace-nowrap font-medium text-primary">
              {change.recordId}
            </Table.Cell>
            <Table.Cell>{kindLabels[change.kind] ?? change.kind}</Table.Cell>
            <Table.Cell>{change.newValue ?? "–"}</Table.Cell>
            <Table.Cell>
              <Badge size="sm" type="pill-color" color={changeColors[change.status] ?? "gray"}>
                {changeLabels[change.status] ?? change.status}
              </Badge>
            </Table.Cell>
            <Table.Cell className="whitespace-nowrap">
              {new Date(change.requestedAt).toLocaleString("de-DE")}
            </Table.Cell>
            <Table.Cell>
              {/* Only a draft can be taken back. Once submitted it belongs to the batch,
                  and the row simply has nothing to offer. */}
              {change.status === "DRAFT" && (
                <TableRowActionsDropdown
                  actions={[{ id: "discard", label: "Verwerfen", icon: Trash01 }]}
                  onAction={() =>
                    void submitting(
                      apiFetch(tenantPath(`/changes/${change.id}`), { method: "DELETE" }),
                    )}
                />
              )}
            </Table.Cell>
          </Table.Row>
        )}
      </DataTableCard>
    </div>
  );
}
