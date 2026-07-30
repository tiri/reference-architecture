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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
     * What is still outstanding for the supplied records, keyed by record id.
     *
     * <p>Asked by the record list, which shows the platform's name and the one the user has
     * requested in the same row. It stays here because it is a question about the queue, and
     * the queue's tenant binding and states are this package's to know — the alternative is
     * the record list writing its own query over another feature's table, which is how two
     * places end up disagreeing about what "pending" means.
     */
    @Transactional
    public Map<String, ChangeRequest> pendingFor(String tenantId, List<String> recordIds) {
        if (recordIds.isEmpty()) {
            return Map.of();
        }
        tenantBinding.bind(tenantId);
        Map<String, ChangeRequest> pending = new HashMap<>();
        ChangeRequest.<ChangeRequest>list(
                "tenantId = ?1 and status in ?2 and recordId in ?3 order by requestedAt asc",
                tenantId, ChangeStatus.PENDING, recordIds)
                .forEach(request -> pending.put(request.recordId, request));
        return pending;
    }

    /** How the tenant's requests are distributed across their lifecycle states. */
    @Transactional
    public Counts counts(String tenantId) {
        tenantBinding.bind(tenantId);
        return new Counts(
                count(tenantId, ChangeStatus.DRAFT),
                count(tenantId, ChangeStatus.OPEN),
                count(tenantId, ChangeStatus.APPLIED),
                count(tenantId, ChangeStatus.FAILED));
    }

    /**
     * What a reader may sort or filter the queue by, under the names the frontend uses. A
     * whitelist for the same reason as on the platform side: these reach SQL, the reader's
     * values never do.
     */
    public static final Set<String> FIELDS =
            Set.of("recordId", "kind", "newValue", "status", "requestedAt");

    /** Those names as columns. The schema is this class's business and nobody else's. */
    private static final Map<String, String> COLUMNS = Map.of(
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
        String column = COLUMNS.getOrDefault(sortBy, "requested_at");
        // Every sort ends in the primary key, or paging repeats and skips rows. Null sorts
        // as the empty string: a column with gaps still needs one place for every row.
        String key = "coalesce(cast(" + column + " as text), '')";
        String direction = ascending ? "asc" : "desc";
        String comparison = ascending ? ">" : "<";

        Conditions.Where where = Conditions.where("tenant_id", tenantId, conditions,
                COLUMNS, ANY_COLUMNS, Conditions.Dialect.POSTGRES,
                Conditions.Parameters.NUMBERED);
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

    private static long count(String tenantId, ChangeStatus status) {
        return ChangeRequest.count("tenantId = ?1 and status = ?2", tenantId, status);
    }

    /** Where a page ended: the sort key of its last row, and that row's id to break ties. */
    public record Cursor(String key, String id) {
    }

    /** {@code total} only on the first page of a walk — see {@link #search}. */
    public record Page(List<Entry> rows, Long total, Cursor next, int size) {
    }

    public record Counts(long draft, long open, long applied, long failed) {
    }

    /**
     * A request as the queue holds it, and as the wire carries it.
     *
     * <p>Not mapped to a separate view: this is a projection written for this one query, so
     * a view beside it would be the same eight fields copied across, with nothing to decide
     * on the way. The record list is the case that does need one — a row there is the
     * platform's record and this queue's request put together.
     */
    public record Entry(Long id, String recordId, ChangeKind kind, String newValue, String status,
            Instant requestedAt, Instant appliedAt, String lastError) {

        static Entry of(Object[] row) {
            return new Entry(((Number) row[0]).longValue(), (String) row[1],
                    ChangeKind.of((String) row[2]),
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
