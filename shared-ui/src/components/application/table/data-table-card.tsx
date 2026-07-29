import type { ReactElement, ReactNode } from "react";
import type { SortDescriptor } from "react-aria-components";
import { Badge } from "@platform/shared-ui/src/components/base/badges/badges";
import { Table, TableCard } from "@platform/shared-ui/src/components/application/table/table";
import { cx } from "@platform/shared-ui/src/utils/cx";

export interface DataColumn {
  id: string;
  label: string;
  allowsSorting?: boolean;
  /** The column that names the row — one per table. */
  isRowHeader?: boolean;
  className?: string;
  /** Width of this column's placeholder while the rows are on their way. */
  placeholder?: string;
}

export interface DataTableCardProps<T> {
  title: string;
  description?: string;
  /**
   * How many rows the question matches. Undefined means nobody has counted yet — which is
   * a different answer from zero, and is shown as such.
   */
  total?: number | null;
  /** What is counted, for the badge: "12.000.012 Datensätze". */
  unit?: string;
  loading?: boolean;
  columns: DataColumn[];
  rows: T[];
  /** The conditions in force, shown across the head of the table where they are read. */
  conditions?: ReactNode;
  /** Controls belonging to the table itself — filtering, above all. */
  actions?: ReactNode;
  /** Shown under the rows: pagination, or a note about what is not being shown. */
  footer?: ReactNode;
  /** What to say when the question has an answer and the answer is nothing. */
  empty?: string;
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  /** One row, rendered by whoever owns the data — this component owns everything else. */
  children: (row: T) => ReactElement;
}

/**
 * A table as this platform shows one: the card, what is in it and how many, the conditions
 * in force, the rows, and what sits under them.
 *
 * <p>The columns are declared once and used twice — for the real rows and for the
 * placeholders that stand in while they load — so the two can never drift apart and
 * nothing shifts when the answer arrives.
 *
 * <p>Everything specific to a table is passed in: its columns, its rows, its conditions.
 * What is not passed in is any of the layout, which is exactly the part that should not be
 * decided again per page.
 */
export function DataTableCard<T extends object>({
  title, description, total, unit = "gesamt", loading = false, columns, rows,
  conditions, actions, footer, empty, sortDescriptor, onSortChange, children,
}: DataTableCardProps<T>) {
  const header = (
    <Table.Header>
      {columns.map((column) => (
        <Table.Head
          key={column.id}
          id={column.id}
          label={column.label}
          isRowHeader={column.isRowHeader}
          allowsSorting={loading ? undefined : column.allowsSorting}
          className={column.className}
        />
      ))}
    </Table.Header>
  );

  return (
    <TableCard.Root size="xs">
      <TableCard.Header
        title={title}
        description={description}
        // In the count's place, because that is where the reader looks to find out how
        // much there is — and while it is being worked out, that is the answer.
        badge={
          loading ? (
            <span className="flex items-center gap-2 text-sm text-tertiary">
              <Spinner />
              wird gesucht …
            </span>
          ) : total === null || total === undefined ? undefined : (
            <Badge size="sm" color="brand" type="pill-color">
              {total.toLocaleString("de-DE")} {unit}
            </Badge>
          )
        }
        contentTrailing={actions}
      />

      {/* Their own row, full width: conditions are a list that grows, and a list that
          grows does not belong in a corner shared with the controls. */}
      {conditions && (
        <div className="flex flex-wrap items-center gap-2 border-b border-secondary px-4 py-2.5 md:px-5">
          {conditions}
        </div>
      )}

      {loading ? (
        <SkeletonRows columns={columns} count={rows.length || 10} header={header} />
      ) : (
        <Table aria-label={title} sortDescriptor={sortDescriptor} onSortChange={onSortChange}>
          {header}
          <Table.Body items={rows}>{children}</Table.Body>
        </Table>
      )}

      {!loading && rows.length === 0 && empty && (
        <p className="px-5 py-8 text-center text-sm text-tertiary">{empty}</p>
      )}

      {footer}
    </TableCard.Root>
  );
}

/** The same table, with the shape of the rows instead of the rows. */
function SkeletonRows({ columns, count, header }: {
  columns: DataColumn[];
  count: number;
  header: ReactElement;
}) {
  const placeholders = Array.from({ length: count }, (_, index) => ({ id: index }));
  return (
    <Table aria-label="Wird geladen">
      {header}
      <Table.Body items={placeholders}>
        {(row) => (
          <Table.Row id={row.id}>
            {columns.map((column) => (
              <Table.Cell key={column.id}>
                <span
                  className={cx("skeleton block h-4 rounded", column.placeholder ?? "w-24")}
                />
              </Table.Cell>
            ))}
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  );
}

export function Spinner() {
  return (
    <span
      role="status"
      aria-label="Wird geladen"
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent"
    />
  );
}
