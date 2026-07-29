package com.example.demo.change;

import com.example.demo.query.Conditions;
import com.example.demo.query.Cursors;
import com.example.platform.bff.user.PlatformUser;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

/**
 * Change requests and mass operations are accepted, not executed: the caller gets an
 * answer immediately, the timed run applies them later (runtime view 6.6).
 */
@Path("/api/t/{tenant}/changes")
@Authenticated
public class ChangeResource {

    @Inject
    ChangeRequests requests;

    @Inject
    ChangeQuery queue;

    @Inject
    PlatformUser user;

    /**
     * The queue, asked exactly as the record list is: conditions, sort, and a cursor. The
     * two lists differ in what they hold and in what a page costs, not in how they are
     * asked — so one component shows both.
     */
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Page changes(@PathParam("tenant") String tenant,
            @QueryParam("f") List<String> conditions,
            @QueryParam("sort") @DefaultValue("requestedAt") String sort,
            @QueryParam("dir") @DefaultValue("desc") String direction,
            @QueryParam("after") String after,
            @QueryParam("size") @DefaultValue("50") int size) {
        ChangeQuery.Page found = queue.search(user.requireTenant(tenant),
                Conditions.parse(conditions, ChangeQuery.FILTERABLE), sort,
                "asc".equalsIgnoreCase(direction), Cursors.decode(after, ChangeQuery.Cursor::new),
                size);
        ChangeQuery.Cursor next = found.next();
        return new Page(found.rows(), found.total(),
                next == null ? null : Cursors.encode(next.key(), next.id()), found.size());
    }

    /** {@code total} only on the first page of a walk. */
    public record Page(List<ChangeQuery.Entry> rows, Long total, String next, int size) {
    }

    /**
     * How many requests are in each state. Small, exact and tenant-scoped — the record
     * list needs the drafted count for its banner and has no business paging the queue to
     * find it.
     */
    @GET
    @Path("/counts")
    @Produces(MediaType.APPLICATION_JSON)
    public ChangeRequests.Counts counts(@PathParam("tenant") String tenant) {
        return requests.counts(user.requireTenant(tenant));
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response request(@PathParam("tenant") String tenant, ChangeRequestBody body) {
        String tenantId = user.requireTenant(tenant);
        Long id = requests.request(tenantId, body.recordId(), body.kind(), body.newValue(),
                user.subject());
        return Response.accepted(new Accepted(id, 1)).build();
    }

    /**
     * Hands every draft of this tenant to the batch. The one deliberate act in the flow:
     * up to here the user was still editing, from here the requests are on their way.
     */
    @POST
    @Path("/submit")
    @Produces(MediaType.APPLICATION_JSON)
    public Response submit(@PathParam("tenant") String tenant) {
        int count = requests.submitDrafts(user.requireTenant(tenant), user.subject());
        return Response.accepted(new Accepted(null, count)).build();
    }

    /** Takes back a single draft. */
    @DELETE
    @Path("/{id}")
    public Response discard(@PathParam("tenant") String tenant, @PathParam("id") Long id) {
        boolean discarded = requests.discardDraft(user.requireTenant(tenant), id, user.subject());
        return discarded ? Response.noContent().build() : Response.status(404).build();
    }

    public record ChangeRequestBody(String recordId, String kind, String newValue) {
    }

    public record Accepted(Long id, int count) {
    }
}
