package com.example.demo.job;

import com.example.platform.bff.tenant.TenantCatalog;
import io.quarkus.arc.Unremovable;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Works off the requested changes. Started by {@code DemoMain} when the artifact runs
 * with {@code --batch}; the schedule itself belongs to the runtime environment.
 *
 * <p>It carries no user identity on purpose: it only replays changes that were already
 * authorised when they were written.
 */
// Looked up programmatically by DemoMain, so nothing injects it — without this the
// build would prune it as an unused bean and the lookup would return null.
@Unremovable
@ApplicationScoped
public class BatchRunner {

    private static final int MAX_PASSES_PER_TENANT = 1000;

    @Inject
    ChangeBatch batch;

    @Inject
    TenantCatalog catalog;

    /**
     * One tenant at a time, one transaction per chunk. Going tenant by tenant is what
     * lets the run stay subject to the row-level policies instead of needing an
     * exception from them.
     */
    public int runOnce() {
        int applied = 0;
        for (TenantCatalog.Tenant tenant : catalog.all()) {
            int chunk;
            int passes = 0;
            // Guard: requests that cannot settle stay OPEN and would be claimed forever.
            while ((chunk = batch.applyChunk(tenant.id())) > 0) {
                applied += chunk;
                if (++passes >= MAX_PASSES_PER_TENANT) {
                    Log.errorf("tenant %s still has open requests after %d passes - giving up",
                            tenant.id(), passes);
                    break;
                }
            }
        }
        return applied;
    }
}
