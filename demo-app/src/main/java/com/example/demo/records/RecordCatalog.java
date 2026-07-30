package com.example.demo.records;

import com.example.demo.query.Conditions.Condition;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * The records of the Datenbasis, as this module needs to read them.
 *
 * <p>This is the module's side of the boundary, not the platform's: it names what the
 * module asks for, and the answer types belong to it rather than to whatever system
 * happens to answer. Today that is Impala over Cloudera; the pages, resources and
 * dashboard that depend on this interface say nothing about it, which is the whole point —
 * they were written against a record catalogue, not against a query engine.
 *
 * <p>Read-only by construction. Writing back is {@link RecordWriter}, which only the batch
 * holds: a resource serving a page cannot change the leading source by accident.
 */
public interface RecordCatalog {

    /**
     * The fields a reader may sort or filter by, under the names the frontend uses. A
     * whitelist: a field name reaches SQL, so it can only ever be one of these.
     *
     * <p>Names only. Which column each one is depends on the store, so the mapping belongs
     * to the adapter — a port that named columns would be describing one schema, and the
     * second store would have to adopt the first one's spelling to fit an interface it is
     * supposed to be independent of.
     */
    Set<String> FIELDS = Set.of("recordId", "name", "category", "changedAt");

    /** What the catalogue holds for this tenant. */
    Stats stats(String tenantId);

    /**
     * One page of the tenant's records, searched and sorted by the catalogue.
     *
     * <p>Paged by where the last page ended, not by how many rows to skip — an offset
     * makes the source produce and discard everything before the page, so the deeper the
     * reader goes the more it costs. The price is that there is no cheap way to land on
     * page 137: a reader can go forward, back, or start again.
     */
    Page search(String tenantId, List<Condition> conditions, String sortBy, boolean ascending,
            Cursor after, int size);

    /** Records held, how many carry an applied change, and how many categories they span. */
    record Stats(long records, long changed, long categories) {
    }

    record Record(String id, String name, String category, Instant changedAt) {
    }

    /** Where a page ended: the sort key of its last row, and that row's id to break ties. */
    record Cursor(String key, String id) {
    }

    /**
     * A page of rows, and — only on the first page of a walk — how many there are in all.
     *
     * <p>Null on every page after it, deliberately. The count is a full scan of everything
     * the conditions match and does not get cheaper the deeper the reader goes, so
     * re-asking it per page would soon cost more than the page itself. Nothing here adds
     * or removes records, so the answer from the start of the walk still holds.
     */
    record Page(List<Record> rows, Long total, Cursor next, int size) {
    }
}
