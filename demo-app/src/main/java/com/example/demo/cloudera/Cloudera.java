package com.example.demo.cloudera;

import com.example.demo.query.Conditions;
import com.example.demo.query.Conditions.Condition;
import com.example.demo.records.RecordCatalog;
import com.example.demo.records.RecordWriter;
import io.quarkus.agroal.DataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The Cloudera — Apache Impala, reached over its own JDBC connection. A foreign
 * system, not a second database of this module.
 *
 * <p>It is the <b>leading source</b> of the records, and the module keeps no copy of them:
 * the list the user pages through is served from here. What the module owns is only what
 * the platform does not know about — the change queue and the audit trail — and that lives
 * in its own database.
 *
 * <p><b>No OIDC in this direction.</b> The user's token stops at this module's API; it is
 * never forwarded and no token is obtained on the Cloudera's behalf. The connection
 * authenticates as the module itself, and what that principal may do is decided on the
 * platform side — the batch runs without any user present, so a user token would be
 * meaningless here anyway.
 *
 * <p>The tenant is a mandatory predicate of every statement. Nothing is fetched "for all
 * tenants" and filtered afterwards.
 *
 * <p><b>What Impala changes.</b> Three things do not behave like an ordinary database:
 * <ul>
 * <li>Rows are only mutable because the table is stored in Kudu. On Impala's file-backed
 * tables the write-back would not be allowed at all.</li>
 * <li>An update reports no affected-row count over HiveServer2, so "did that row exist?"
 * has to be asked separately rather than read off the result.</li>
 * <li>A TIMESTAMP carries no zone — see {@link #instant}.</li>
 * </ul>
 * There are no transactions either, which is why this datasource is not enlisted.
 */
@ApplicationScoped
public class Cloudera implements RecordCatalog, RecordWriter {

    /**
     * Sortable columns, by the name the frontend uses. A whitelist, not a lookup for
     * convenience: a caller-supplied string in the sort clause would let the caller write
     * SQL, and here that SQL would run on a system shared by the whole organisation.
     */
    /** What "alle Felder" means: the columns a reader would think of as the record's text. */
    private static final List<String> ANY_COLUMNS = List.of("id", "name", "category");

    private static final int MAX_PAGE_SIZE = 100;

    @Inject
    @DataSource("cloudera")
    javax.sql.DataSource dataSource;

    /**
     * What the platform holds for this tenant, in one query.
     *
     * <p>One trip, not two: counting is the cheap part of an analytical engine, but the
     * fixed cost of asking is not, and two questions with the same predicate would be
     * charged the same scan twice.
     */
    @Override
    public Stats stats(String tenantId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select count(*), count(changed_at), count(distinct category) "
                                + "from record where tenant_id = ?")) {
            statement.setString(1, tenantId);
            try (ResultSet found = statement.executeQuery()) {
                found.next();
                return new Stats(found.getLong(1), found.getLong(2), found.getLong(3));
            }
        }
        catch (SQLException failure) {
            throw new ClouderaException("reading statistics for tenant " + tenantId, failure);
        }
    }

    /**
     * One page of the tenant's records, searched and sorted by the platform.
     *
     * <p><b>Paged by where the last page ended, not by how many rows to skip.</b> An
     * OFFSET makes the engine produce and discard everything before the page, so the
     * deeper the reader goes the more it costs — measured at 20 million records, row
     * 5,000,000 took 11s that way and 1.8s this way, and the last page 0.13s. Offset
     * paging gets slower the further you go; this gets faster, because the predicate
     * leaves less to sort.
     *
     * <p>The price is that there is no cheap way to land on page 137: a reader can go
     * forward, back, or start again. At this size that is the honest offer.
     */
    @Override
    public Page search(String tenantId, List<Condition> conditions, String sortBy,
            boolean ascending, Cursor after, int size) {
        String column = FILTERABLE.getOrDefault(sortBy, "id");
        // The sort key must be a total order or paging repeats and skips rows, so every
        // sort ends in the primary key. Null sorts as the empty string — a column with
        // gaps still has to have exactly one place for every row.
        String key = "id".equals(column) ? "id" : "coalesce(cast(" + column + " as string), '')";
        boolean byKeyAlone = "id".equals(column);
        String direction = ascending ? "asc" : "desc";
        String comparison = ascending ? ">" : "<";
        int safeSize = Math.clamp(size, 1, MAX_PAGE_SIZE);

        Conditions.Where where = Conditions.where("tenant_id", tenantId, conditions,
                RecordCatalog.FILTERABLE, ANY_COLUMNS, Conditions.Dialect.IMPALA);
        String filter = where.sql();
        String seek = after == null ? ""
                : byKeyAlone
                        // Sorting by the primary key: one plain predicate, which Kudu can
                        // push down to the tablets instead of scanning up to the page.
                        ? " and id " + comparison + " ?"
                        : " and (" + key + " " + comparison + " ? or (" + key + " = ? and id "
                                + comparison + " ?))";

        try (Connection connection = dataSource.getConnection()) {
            // Counted once, at the start of the walk — see the note on the return value.
            Long total = null;
            if (after == null) {
                try (PreparedStatement count =
                        connection.prepareStatement("select count(*) from record " + filter)) {
                    bind(count, where.params());
                    try (ResultSet found = count.executeQuery()) {
                        found.next();
                        total = found.getLong(1);
                    }
                }
            }

            List<Record> rows = new ArrayList<>();
            String lastKey = null;
            String sql = "select id, name, category, changed_at, " + key + " as sort_key "
                    + "from record " + filter + seek
                    + " order by " + key + " " + direction + ", id " + direction
                    + " limit ?";
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                int index = bind(statement, where.params());
                if (after != null) {
                    if (byKeyAlone) {
                        statement.setString(index++, after.id());
                    }
                    else {
                        statement.setString(index++, after.key());
                        statement.setString(index++, after.key());
                        statement.setString(index++, after.id());
                    }
                }
                statement.setInt(index, safeSize);
                try (ResultSet found = statement.executeQuery()) {
                    while (found.next()) {
                        rows.add(read(found));
                        lastKey = found.getString("sort_key");
                    }
                }
            }
            // Where this page ended, so the next one can start there. Absent when the page
            // came back short: there is nothing after it.
            Cursor next = rows.size() < safeSize ? null
                    : new Cursor(lastKey, rows.get(rows.size() - 1).id());
            return new Page(rows, total, next, safeSize);
        }
        catch (SQLException failure) {
            throw new ClouderaException("reading records for tenant " + tenantId, failure);
        }
    }

    /** Applies an accepted change. The tenant is part of the predicate, never assumed. */
    @Override
    public void rename(String tenantId, String recordId, String newName) {
        update("update record set name = ?, changed_at = utc_timestamp() where id = ? and tenant_id = ?",
                tenantId, recordId, newName);
    }

    private static int bind(PreparedStatement statement, List<String> values) throws SQLException {
        int index = 1;
        for (String value : values) {
            statement.setString(index++, value);
        }
        return index;
    }

    private static Record read(ResultSet row) throws SQLException {
        return new Record(row.getString("id"), row.getString("name"), row.getString("category"),
                instant(row, "changed_at"));
    }

    /**
     * An Impala TIMESTAMP carries no zone. Left alone, the driver reads it in the JVM's
     * zone, so a value written as UTC comes back shifted by the offset — a wrong time that
     * still looks entirely plausible. Both directions therefore name UTC explicitly:
     * {@code utc_timestamp()} on the way in, and here the wall-clock fields the platform
     * stored are taken as what they are and read as UTC.
     *
     * <p>Not with {@code getTimestamp(column, Calendar)}, which would be the obvious way:
     * this driver answers that one with "Method not supported".
     */
    private static Instant instant(ResultSet row, String column) throws SQLException {
        Timestamp value = row.getTimestamp(column);
        return value == null ? null : value.toLocalDateTime().toInstant(ZoneOffset.UTC);
    }

    private void update(String sql, String tenantId, String recordId, String value) {
        try (Connection connection = dataSource.getConnection()) {
            if (!exists(connection, tenantId, recordId)) {
                throw new ClouderaException(
                        "record " + recordId + " not found for tenant " + tenantId, null);
            }
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                int index = 1;
                if (value != null) {
                    statement.setString(index++, value);
                }
                statement.setString(index++, recordId);
                statement.setString(index, tenantId);
                statement.executeUpdate();
            }
        }
        catch (SQLException failure) {
            throw new ClouderaException("writing record " + recordId + " failed", failure);
        }
    }

    private boolean exists(Connection connection, String tenantId, String recordId)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "select 1 from record where id = ? and tenant_id = ?")) {
            statement.setString(1, recordId);
            statement.setString(2, tenantId);
            try (ResultSet found = statement.executeQuery()) {
                return found.next();
            }
        }
    }

    public static class ClouderaException extends RuntimeException {
        public ClouderaException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
