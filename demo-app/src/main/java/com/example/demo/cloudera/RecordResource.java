package com.example.demo.cloudera;

import com.example.demo.change.ChangeRequest;
import com.example.demo.change.ChangeRequests;
import com.example.demo.query.Conditions;
import com.example.demo.query.Cursors;
import com.example.demo.records.RecordCatalog;
import com.example.platform.bff.user.PlatformUser;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * The records of a tenant — read from the catalogue, which is the leading source.
 * The module keeps no copy of them, so there is no second list and no way for the two to
 * disagree.
 *
 * <p>The tenant is part of the path, so every response has its own cache key and no cache
 * has to reason about cookies. It is still checked against the token on every request.
 */
@Path("/api/t/{tenant}/records")
@Authenticated
public class RecordResource {

    @Inject
    RecordCatalog records;

    @Inject
    ChangeRequests changes;

    @Inject
    PlatformUser user;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Page records(@PathParam("tenant") String tenant,
            @QueryParam("f") List<String> filters,
            @QueryParam("sort") @DefaultValue("recordId") String sort,
            @QueryParam("dir") @DefaultValue("asc") String direction,
            @QueryParam("after") String after,
            @QueryParam("size") @DefaultValue("10") int size) {
        String tenantId = user.requireTenant(tenant);
        RecordCatalog.Page found = records.search(tenantId,
                Conditions.parse(filters, RecordCatalog.FILTERABLE), sort,
                "asc".equalsIgnoreCase(direction),
                Cursors.decode(after, RecordCatalog.Cursor::new), size);

        // What the user has asked for but the platform does not hold yet, looked up only
        // for the records on this page — a cheap indexed query on the module's own
        // database, not a second trip to the platform.
        Map<String, ChangeRequest> pending = changes.pendingFor(tenantId,
                found.rows().stream().map(RecordCatalog.Record::id).toList());

        List<RecordView> rows = found.rows().stream()
                .map(record -> RecordView.of(record, pending.get(record.id())))
                .toList();
        RecordCatalog.Cursor next = found.next();
        return new Page(rows, found.total(),
                next == null ? null : Cursors.encode(next.key(), next.id()), found.size());
    }

    /** {@code total} only on the first page of a walk — see {@link RecordCatalog.Page}. */
    public record Page(List<RecordView> rows, Long total, String next, int size) {
    }

    /**
     * A record as the platform holds it, plus the change the user is still waiting for.
     * The name stays the platform's — the requested one is offered beside it, so the list
     * shows what is true and what was asked for without confusing the two.
     */
    public record RecordView(String id, String name, String category, Instant changedAt,
            Pending pending) {

        static RecordView of(RecordCatalog.Record record, ChangeRequest change) {
            return new RecordView(record.id(), record.name(), record.category(),
                    record.changedAt(),
                    change == null ? null
                            : new Pending(change.id, change.kind, change.newValue, change.status));
        }
    }

    public record Pending(Long id, String kind, String newValue, String status) {
    }
}
