package com.example.demo.change;

import com.example.demo.query.Conditions;
import com.example.demo.query.Conditions.Condition;
import com.example.demo.tenant.TenantBinding;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Reading the queue: one page of a tenant's requests, asked exactly as the platform's
 * records are — same conditions, same sort, same cursor.
 *
 * <p>Separate from {@link ChangeRequests}, which owns what the queue <i>becomes</i>. The
 * two change for different reasons: this one when a reader wants to ask something new,
 * that one when the states a request passes through change. Keeping them together also
 * meant reading the queue dragged in the batch's dependency on the platform.
 *
 * <p>A native query rather than the entity mapper: the comparisons are the ones the shared
 * condition model writes, and the keyset predicate needs the sort key as a column
 * expression. The row-level policy applies exactly as elsewhere — the tenant is bound
 * first, and is a predicate here besides.
 */
@ApplicationScoped
public class ChangeQuery {

    /**
     * The columns of the queue a reader may sort or filter by, under the names the
     * frontend uses. A whitelist for the same reason as on the platform side: these become
     * SQL, the reader's values never do.
     */
    public static final Map<String, String> FILTERABLE = Map.of(
            "recordId", "record_id",
            "kind", "kind",
            "newValue", "new_value",
            "status", "status",
            "requestedAt", "requested_at");

    /**
     * What "alle Felder" searches. Deliberately not the status or the kind: those hold
     * codes, and the reader sees their German names — free text over them could only ever
     * match what nobody is looking at. Both are offered as a choice instead.
     */
    private static final List<String> ANY_COLUMNS = List.of("record_id", "new_value");

    private static final int MAX_PAGE_SIZE = 100;

    @Inject
    EntityManager entityManager;

    @Inject
    TenantBinding tenantBinding;

    @Transactional
    public Page search(String tenantId, List<Condition> conditions, String sortBy,
            boolean ascending, Cursor after, int size) {
        tenantBinding.bind(tenantId);
        String column = FILTERABLE.getOrDefault(sortBy, "requested_at");
        // Every sort ends in the primary key, or paging repeats and skips rows. Null sorts
        // as the empty string: a column with gaps still needs one place for every row.
        String key = "coalesce(cast(" + column + " as text), '')";
        String direction = ascending ? "asc" : "desc";
        String comparison = ascending ? ">" : "<";

        Conditions.Where where = Conditions.where("tenant_id", tenantId, conditions,
                FILTERABLE, ANY_COLUMNS, Conditions.Dialect.POSTGRES);
        List<Object> params = new ArrayList<>(where.params());

        String seek = "";
        if (after != null) {
            seek = " and (" + key + " " + comparison + " ?" + (params.size() + 1)
                    + " or (" + key + " = ?" + (params.size() + 2)
                    + " and id " + comparison + " ?" + (params.size() + 3) + "))";
            params.add(after.key());
            params.add(after.key());
            params.add(Long.valueOf(after.id()));
        }

        // Counted once, at the start of the walk — the same bargain as on the platform.
        Long total = null;
        if (after == null) {
            total = ((Number) bind(entityManager.createNativeQuery(
                    "select count(*) from change_request " + where.sql()), where.params())
                    .getSingleResult()).longValue();
        }

        int safeSize = Math.clamp(size, 1, MAX_PAGE_SIZE);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = bind(entityManager.createNativeQuery(
                "select id, record_id, kind, new_value, status, requested_at, applied_at, "
                        + "last_error, " + key + " as sort_key from change_request "
                        + where.sql() + seek
                        + " order by " + key + " " + direction + ", id " + direction
                        + " limit ?" + (params.size() + 1)),
                params, safeSize).getResultList();

        List<Entry> entries = rows.stream().map(Entry::of).toList();
        Cursor next = entries.size() < safeSize ? null
                : new Cursor((String) rows.get(rows.size() - 1)[8],
                        String.valueOf(entries.get(entries.size() - 1).id()));
        return new Page(entries, total, next, safeSize);
    }

    private static Query bind(Query query, List<?> params, Object... extra) {
        int index = 1;
        for (Object param : params) {
            query.setParameter(index++, param);
        }
        for (Object param : extra) {
            query.setParameter(index++, param);
        }
        return query;
    }

    /** Where a page ended: the sort key of its last row, and that row's id to break ties. */
    public record Cursor(String key, String id) {
    }

    /** {@code total} only on the first page of a walk — see {@link #search}. */
    public record Page(List<Entry> rows, Long total, Cursor next, int size) {
    }

    /** A request as the queue holds it. */
    public record Entry(Long id, String recordId, String kind, String newValue, String status,
            Instant requestedAt, Instant appliedAt, String lastError) {

        static Entry of(Object[] row) {
            return new Entry(((Number) row[0]).longValue(), (String) row[1], (String) row[2],
                    (String) row[3], (String) row[4], instant(row[5]), instant(row[6]),
                    (String) row[7]);
        }

        /**
         * A timestamp as the driver chose to hand it over. Through the entity mapper the
         * type is settled by the field; a native query gets whatever the column maps to,
         * and that is not the same on every driver and version.
         */
        private static Instant instant(Object value) {
            return switch (value) {
                case null -> null;
                case Instant already -> already;
                case java.sql.Timestamp local -> local.toInstant();
                case java.time.OffsetDateTime zoned -> zoned.toInstant();
                default -> throw new IllegalStateException(
                        "unexpected timestamp type " + value.getClass());
            };
        }
    }
}
