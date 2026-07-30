import type { ReactElement, ReactNode } from "react";
import { TableLayout, Virtualizer } from "react-aria-components";
import type { SortDescriptor } from "react-aria-components";
import { Badge } from "../../base/badges/badges";
import { Table, TableCard } from "./table";
import { cx } from "../../../utils/cx";

export interface DataColumn {
  id: string;
  label: string;
  allowsSorting?: boolean;
  /** The column that names the row — one per table. */
  isRowHeader?: boolean;
  className?: string;
  /**
   * What the column takes. Fixed columns give a number of pixels; the one that should
   * absorb whatever is left gives "1fr".
   *
   * <p>Needed because the rows are virtualised: the layout places every cell itself and
   * never measures the content, so a column that says nothing is simply given an equal
   * share — which is what cut the names off. These reproduce what the browser worked out
   * on its own before.
   */
  width?: `${number}fr` | `${number}%` | number;
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
          width={column.width}
          allowsSorting={loading ? undefined : column.allowsSorting}
          // No sticky here. The layout places every cell absolutely and keeps the header
          // where it wants it; declaring the cell sticky replaces that absolute
          // positioning, and the header then scrolls away with the rows — which is exactly
          // what it did. It still needs its own background, or rows show through it.
          className={cx("bg-secondary", column.className)}
        />
      ))}
    </Table.Header>
  );

  return (
    <TableCard.Root size="xs" className="flex min-h-0 flex-1 flex-col">
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

      {/* The rows scroll, the card does not — and the box that scrolls is the table's own
          wrapper, because that is what a sticky header sticks to. Everything around them:
          what is being shown, the conditions, how far in the reader has got — stays put. */}
      {loading ? (
        <SkeletonRows columns={columns} count={rows.length || 12} header={header} />
      ) : (
        <Virtualizer
          // Only the rows on screen exist in the document. The heights are fixed and the
          // widths are given, so it lays the table out without measuring anything — which
          // is the whole trick, and also the whole constraint.
          layout={new TableLayout({ rowHeight: 36, headingHeight: 36, padding: 0 })}
        >
        <Table
          aria-label={title}
          sortDescriptor={sortDescriptor}
          onSortChange={onSortChange}
          // Separate borders, spacing zero. A sticky header cell simply does not stick in
          // a table with collapsed borders — Chrome and Safari both drop it, and it is the
          // table that decides, not the cell. Zero spacing keeps it looking as it did.
          // The table is the box that scrolls. The Virtualizer keeps the header in place
          // itself, but only for its own scroll view — hand the scrolling to an ancestor
          // instead and it has nothing to measure against, so the header rides away with
          // the rows.
          className="min-h-0 flex-1 overflow-auto border-separate border-spacing-0"
          wrapperProps={{ className: "flex min-h-0 flex-1 flex-col" }}
        >
          {header}
          <Table.Body items={rows}>{children}</Table.Body>
        </Table>
        </Virtualizer>
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
    <Table
      aria-label="Wird geladen"
      className="border-separate border-spacing-0"
      wrapperProps={{ className: "min-h-0 flex-1 overflow-auto" }}
    >
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
