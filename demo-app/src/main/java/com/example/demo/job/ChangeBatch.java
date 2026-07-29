package com.example.demo.job;

import com.example.demo.audit.AuditService;
import com.example.demo.change.ChangeRequest;
import com.example.demo.records.RecordWriter;
import com.example.demo.tenant.TenantBinding;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Applying released requests to the Datenbasis — the only place in this module that
 * changes the leading source, and the only one that depends on being able to.
 *
 * <p>It sits here rather than with the queue's own logic because it belongs to the run,
 * not to the request: {@link com.example.demo.change.ChangeRequests} answers a user in
 * milliseconds and knows nothing about the platform, while this works without any user
 * present and is the module's slowest, most failure-prone path.
 */
@ApplicationScoped
public class ChangeBatch {

    @Inject
    EntityManager entityManager;

    @Inject
    TenantBinding tenantBinding;

    @Inject
    AuditService audit;

    /** The write side of the Datenbasis, and nothing else it can reach. */
    @Inject
    RecordWriter records;

    @ConfigProperty(name = "demo.batch.chunk-size", defaultValue = "25")
    int chunkSize;

    /**
     * One chunk, one transaction — never one transaction for the whole run, which would
     * bloat even unrelated tables.
     *
     * <p>{@code for update skip locked} lets several runs coexist without ever handing
     * the same request out twice.
     *
     * @return number of requests handled; zero means there is nothing left to do
     */
    @Transactional
    public int applyChunk(String tenantId) {
        // The queue is tenant-scoped like every other table, so the run works one tenant
        // at a time and binds it first. No bypass for the batch — it is subject to the
        // same row-level policies as a user request.
        tenantBinding.bind(tenantId);
        @SuppressWarnings("unchecked")
        List<Long> claimed = entityManager.createNativeQuery(
                        "select id from change_request where status = 'OPEN' "
                                + "order by requested_at for update skip locked limit ?1")
                .setParameter(1, chunkSize)
                .getResultList()
                .stream()
                .map(id -> ((Number) id).longValue())
                .toList();
        if (claimed.isEmpty()) {
            return 0;
        }
        for (Long id : claimed) {
            ChangeRequest request = ChangeRequest.findById(id);
            try {
                // One kind of change today. The check stays: `kind` is a column, and a row
                // written by an older or newer version of this module must not be applied
                // as though it meant a rename.
                if (!ChangeRequest.KIND_RENAME.equals(request.kind)) {
                    throw new IllegalStateException("unknown kind " + request.kind);
                }
                records.rename(tenantId, request.recordId, request.newValue);
                request.status = ChangeRequest.APPLIED;
                request.appliedAt = Instant.now();
                audit.record("batch", tenantId, "record", request.recordId, "applied", request.kind);
            }
            catch (RuntimeException failure) {
                // One bad record must not stop the rest of the run.
                request.status = ChangeRequest.FAILED;
                request.lastError = failure.getClass().getSimpleName() + ": " + failure.getMessage();
                audit.record("batch", tenantId, "record", request.recordId, "failed", request.kind);
                Log.warnf("change request %d failed: %s", id, failure.toString());
            }
        }
        return claimed.size();
    }
}
