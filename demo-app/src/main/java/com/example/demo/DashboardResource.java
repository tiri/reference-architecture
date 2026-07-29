package com.example.demo;

import com.example.demo.change.ChangeRequests;
import com.example.demo.records.RecordCatalog;
import com.example.platform.bff.user.PlatformUser;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/**
 * The numbers a dashboard shows, from the two places that hold them: the platform knows
 * how many records there are, the module knows what has been asked of them.
 *
 * <p>One endpoint rather than several, because a dashboard asks all of it at once and a
 * page of small independent requests is how a dashboard becomes the slowest screen in an
 * application.
 */
@Path("/api/t/{tenant}/dashboard")
@Authenticated
public class DashboardResource {

    @Inject
    RecordCatalog records;

    @Inject
    ChangeRequests changes;

    @Inject
    PlatformUser user;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Dashboard dashboard(@PathParam("tenant") String tenant) {
        String tenantId = user.requireTenant(tenant);
        RecordCatalog.Stats stats = records.stats(tenantId);
        ChangeRequests.Counts counts = changes.counts(tenantId);
        return new Dashboard(stats.records(), stats.changed(), stats.categories(),
                counts.draft(), counts.open(), counts.applied(), counts.failed());
    }

    public record Dashboard(long records, long changedRecords, long categories,
            long draft, long open, long applied, long failed) {
    }
}
