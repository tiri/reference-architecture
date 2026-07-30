package com.example.demo.records;

import com.example.demo.query.Conditions;
import com.example.demo.query.Conditions.Condition;
import io.quarkus.agroal.DataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The Datenbasis as a PostgreSQL database.
 *
 * <p>A foreign system, and treated as one throughout: its own database, its own role, its
 * own connection, never enlisted in the module's transactions and never joined to the
 * module's own tables. That it happens to be the same PostgreSQL server in development is
 * a convenience of the sandbox and nothing this class relies on — only the JDBC URL says so.
 *
 * <p>Reached through {@link RecordCatalog} rather than directly, because a deployment's
 * leading source is not this: it is whatever the organisation runs, and the adapter for it
 * belongs here beside this one. Everything above the interface — the conditions, the
 * cursor, counting once per question — was written against a catalogue and needs no
 * changing for that.
 *
 * <p><b>What it is not.</b> A row store is not an analytical engine: here a page costs
 * milliseconds, and on a columnar engine over tens of millions of rows the same page costs
 * seconds. Measured, not assumed — an `order by` over 48 million rows took 28 s on Impala
 * while this store answers the same question in half a second. Which is why the design
 * pages by cursor and counts once per question rather than per page: those choices cost
 * nothing here and are the difference between usable and not there.
 */
@ApplicationScoped
public class PostgresRecords implements RecordCatalog, RecordWriter {

    /** What "alle Felder" means: the columns a reader would think of as the record's text. */
    private static final List<String> ANY_COLUMNS = List.of("id", "name", "category");

    /** The port's field names as columns of this schema — see {@link RecordCatalog#FIELDS}. */
    private static final Map<String, String> COLUMNS = Map.of(
            "recordId", "id",
            "name", "name",
            "category", "category",
            "changedAt", "changed_at");

    private static final int MAX_PAGE_SIZE = 100;

    @Inject
    @DataSource("datenbasis")
    javax.sql.DataSource dataSource;

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
            throw new DatenbasisException("reading statistics for tenant " + tenantId, failure);
        }
    }

    @Override
    public Page search(String tenantId, List<Condition> conditions, String sortBy,
            boolean ascending, Cursor after, int size) {
        String column = COLUMNS.getOrDefault(sortBy, "id");
        // The sort key must be a total order or paging repeats and skips rows, so every
        // sort ends in the primary key. Null sorts as the empty string — a column with
        // gaps still has to have exactly one place for every row.
        String key = "id".equals(column) ? "id" : "coalesce(cast(" + column + " as text), '')";
        boolean byKeyAlone = "id".equals(column);
        String direction = ascending ? "asc" : "desc";
        String comparison = ascending ? ">" : "<";
        int safeSize = Math.clamp(size, 1, MAX_PAGE_SIZE);

        Conditions.Where where = Conditions.where("tenant_id", tenantId, conditions,
                COLUMNS, ANY_COLUMNS, Conditions.Parameters.JDBC);
        List<Object> params = new ArrayList<>(where.params());

        String seek = "";
        if (after != null) {
            seek = byKeyAlone
                    // Sorting by the primary key: one plain predicate against the index.
                    ? " and id " + comparison + " ?"
                    : " and (" + key + " " + comparison + " ? or (" + key + " = ?"
                            + " and id " + comparison + " ?))";
            params.add(after.key());
            if (!byKeyAlone) {
                params.add(after.key());
                params.add(after.id());
            }
        }

        try (Connection connection = dataSource.getConnection()) {
            // Counted once, at the start of the walk — the same bargain as on the platform.
            Long total = null;
            if (after == null) {
                try (PreparedStatement count = connection.prepareStatement(
                        "select count(*) from record " + where.sql())) {
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
                    + "from record " + where.sql() + seek
                    + " order by " + key + " " + direction + ", id " + direction
                    + " limit ?";
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                int index = bind(statement, params);
                statement.setInt(index, safeSize);
                try (ResultSet found = statement.executeQuery()) {
                    while (found.next()) {
                        rows.add(new Record(found.getString("id"), found.getString("name"),
                                found.getString("category"), instant(found)));
                        lastKey = found.getString("sort_key");
                    }
                }
            }
            Cursor next = rows.size() < safeSize ? null
                    : new Cursor(lastKey, rows.get(rows.size() - 1).id());
            return new Page(rows, total, next, safeSize);
        }
        catch (SQLException failure) {
            throw new DatenbasisException("reading records for tenant " + tenantId, failure);
        }
    }

    @Override
    public void rename(String tenantId, String recordId, String newName) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update record set name = ?, changed_at = now() at time zone 'utc' "
                                + "where id = ? and tenant_id = ?")) {
            statement.setString(1, newName);
            statement.setString(2, recordId);
            statement.setString(3, tenantId);
            // A change that touched no row is a failure, not a success: the batch must record
            // it as failed rather than mark the request applied. Not every store can tell you
            // this — an analytical engine over HiveServer2 reports no affected-row count at
            // all, and an adapter for one would have to read the record back to find out.
            if (statement.executeUpdate() == 0) {
                throw new DatenbasisException(
                        "record " + recordId + " not found for tenant " + tenantId, null);
            }
        }
        catch (SQLException failure) {
            throw new DatenbasisException("writing record " + recordId + " failed", failure);
        }
    }

    private static int bind(PreparedStatement statement, List<?> values) throws SQLException {
        int index = 1;
        for (Object value : values) {
            statement.setObject(index++, value);
        }
        return index;
    }

    /** The column is a plain timestamp holding UTC, as it is on the platform side. */
    private static Instant instant(ResultSet row) throws SQLException {
        OffsetDateTime value = row.getObject("changed_at", OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }
}
