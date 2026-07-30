import { useCallback, useEffect, useRef, useState } from "react";
import type { SortDescriptor } from "react-aria-components";
import { ApiError } from "../../../api/problem";
import { apiFetch } from "../../../api/apiFetch";
import { useTenant } from "../../../auth/AuthProvider";
import {
  serializeConditions, usableConditions,
} from "./table-filter";
import type { Condition } from "./table-filter";

/**
 * What a paged list answers, on every endpoint of this platform.
 *
 * <p>{@code total} only on the first page of a walk: counting is a scan of everything the
 * conditions match and does not get cheaper the deeper the reader goes, so it is asked
 * once and carried forward. {@code next} is opaque — where the page ended, in a form only
 * the module that issued it can read.
 */
export interface QueryPage<T> {
  rows: T[];
  total: number | null;
  next: string | null;
  size: number;
}

export interface TableQueryOptions {
  /** Tenant-relative path of the list, e.g. "/records". */
  path: string;
  sort: string;
  direction?: "ascending" | "descending";
  pageSize?: number;
}

/**
 * A list the reader asks questions of: conditions, sort, and one page at a time.
 *
 * <p>This is the whole cycle, and it is the same cycle for every list on the platform —
 * which is the point. What differs between two lists is what they hold and what a page
 * costs, not how it is asked, so neither page reimplements any of the following:
 *
 * <ul>
 * <li><b>Cursor paging.</b> A page is reached by walking to it, and the cursors seen so
 * far are kept, which is what makes "back" possible at all.</li>
 * <li><b>Asking at most once.</b> The cache holds the asking rather than the answer, so
 * clicking ahead of a prefetch waits for that request instead of sending a second one —
 * and it remembers whether a page has <i>arrived</i>, because "asked for" and "on screen"
 * are not the same thing.</li>
 * <li><b>Reading ahead.</b> The next page is fetched while the reader reads this one.</li>
 * <li><b>Two sets of conditions</b> — the one being built and the one in force. That
 * difference is what "Anwenden" is for; nothing is asked until then.</li>
 * </ul>
 */
export function useTableQuery<T>({ path, sort, direction = "ascending", pageSize = 50 }:
TableQueryOptions) {
  const { activeTenant, tenantPath } = useTenant();

  const [data, setData] = useState<QueryPage<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [draft, setDraft] = useState<Condition[]>([]);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: sort,
    direction,
  });
  const [trail, setTrail] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSize);
  const [total, setTotal] = useState<number | null>(null);
  // Bumped after a write: the cached pages were fetched before it and no longer show what
  // the reader just asked for.
  const [revision, setRevision] = useState(0);

  const asked = serializeConditions(usableConditions(conditions));
  const building = serializeConditions(usableConditions(draft));
  const dirty = building.join("") !== asked.join("");

  const cache = useRef(new Map<string, { page: Promise<QueryPage<T>>; arrived: boolean }>());
  const question = `${asked.join("|")}|${String(sortDescriptor.column)}|${sortDescriptor.direction}|${size}`;

  useEffect(() => {
    // A new question means a new walk: the cursors of the old one point into an order
    // that no longer exists.
    cache.current.clear();
    setTrail([null]);
    setPage(0);
    setTotal(null);
  }, [question, activeTenant]);

  const fetchPage = useCallback(
    (after: string | null) => {
      const params = new URLSearchParams({
        sort: String(sortDescriptor.column),
        dir: sortDescriptor.direction === "descending" ? "desc" : "asc",
        size: String(size),
      });
      // One parameter per condition, so a value may contain anything at all.
      asked.forEach((condition) => params.append("f", condition));
      if (after) {
        params.set("after", after);
      }
      return apiFetch<QueryPage<T>>(`${tenantPath(path)}?${params}`);
    },
    [question, tenantPath, path],
  );

  useEffect(() => {
    if (!activeTenant) {
      return;
    }
    let current = true;
    const ask = (after: string | null) => {
      const key = after ?? "";
      const known = cache.current.get(key);
      if (known) {
        return known;
      }
      const entry = { page: fetchPage(after), arrived: false };
      cache.current.set(key, entry);
      entry.page.then(
        () => {
          entry.arrived = true;
        },
        // A failure must not be remembered, or that page could never be asked for again.
        () => cache.current.delete(key),
      );
      return entry;
    };

    const wanted = ask(trail[page] ?? null);
    setLoading(!wanted.arrived);
    wanted.page
      .then((fetched) => {
        if (!current) {
          return;
        }
        setError(null);
        setData(fetched);
        if (fetched.total !== null) {
          setTotal(fetched.total);
        }
        if (fetched.next) {
          ask(fetched.next);
        }
      })
      .catch((failure: unknown) => {
        if (current) {
          setError(failure instanceof ApiError ? failure.message : "Die Liste konnte nicht geladen werden.");
        }
      })
      .finally(() => {
        if (current) {
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [activeTenant, page, trail, fetchPage, revision]);

  const applied = usableConditions(conditions);
  const lastPage = data && total ? Math.max(Math.ceil(total / data.size) - 1, 0) : 0;

  const apply = (next: Condition[]) => {
    setDraft(next);
    setConditions(next);
    setPage(0);
  };

  return {
    rows: data?.rows ?? [],
    total,
    loading,
    error,
    /** Throw the answers away and ask again — after a write whose result is not known. */
    reload: () => {
      cache.current.clear();
      setRevision((n) => n + 1);
    },

    /**
     * Change rows in place, without asking the list again.
     *
     * <p>For a write whose outcome is already known: the caller asked for one thing, it
     * was accepted, and what the row now looks like follows from that. Re-reading the page
     * to learn it costs a query — seconds of one, against the platform — and the reader
     * watches their own table blink for an answer that was never in doubt.
     *
     * <p>The shown page and the cached copy of it are both patched, so leaving the page
     * and coming back does not resurrect the row as it was before the edit.
     */
    patch: (matches: (row: T) => boolean, change: (row: T) => T) => {
      const apply = (rows: T[]) => rows.map((row) => (matches(row) ? change(row) : row));
      setData((shown) => (shown ? { ...shown, rows: apply(shown.rows) } : shown));
      const entry = cache.current.get(trail[page] ?? "");
      if (entry) {
        entry.page = entry.page.then((fetched) => ({ ...fetched, rows: apply(fetched.rows) }));
      }
    },

    conditions: applied,
    draft,
    setDraft,
    dirty,
    apply: () => apply(draft),
    remove: (index: number) => apply(conditions.filter((_, at) => at !== index)),

    sortDescriptor,
    onSortChange: (descriptor: SortDescriptor) => {
      setSortDescriptor(descriptor);
      setPage(0);
    },

    page,
    lastPage,
    size: data?.size ?? size,
    onPageChange: (wanted: number) => {
      if (wanted > page + 1 && data?.next) {
        // Remember the cursor that opens the page being entered, so back works.
        setTrail((known) => (known[page + 1] ? known : [...known, data.next]));
        setPage(page + 1);
      }
      else if (wanted < page + 1) {
        setPage(Math.max(page - 1, 0));
      }
    },
    onPageSizeChange: (wanted: number) => {
      setSize(wanted);
      setTrail([null]);
      setPage(0);
    },
  };
}
