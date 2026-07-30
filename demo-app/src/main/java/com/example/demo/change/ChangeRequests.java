package com.example.demo.change;

import com.example.demo.audit.AuditEvent;
import com.example.demo.audit.AuditService;
import com.example.demo.tenant.TenantBinding;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;

/**
 * What the queue becomes: a request is drafted, taken back, or released to the batch.
 *
 * <p>Only the states a request passes through live here. Reading the queue is
 * {@link ChangeQuery}, and applying a released request is the batch's — this class knows
 * nothing about the platform, which is what lets the whole edit path stay independent of
 * it.
 */
@ApplicationScoped
public class ChangeRequests {

    @Inject
    TenantBinding tenantBinding;

    @Inject
    AuditService audit;

    /**
     * Notes a change as a draft and answers at once. Nothing is applied here, and nothing
     * is handed to the batch yet either — the user collects their changes first and
     * releases them together in {@link #submitDrafts}.
     *
     * <p>A second edit of the same record replaces the earlier draft rather than queueing
     * a second one: the user changed their mind, they did not ask for two changes.
     */
    @Transactional
    public Long request(String tenantId, RequestedChange change, String actor) {
        tenantBinding.bind(tenantId);
        ChangeRequest request = ChangeRequest
                .<ChangeRequest>find("tenantId = ?1 and recordId = ?2 and kind = ?3 and status = ?4",
                        tenantId, change.recordId(), change.kind(), ChangeStatus.DRAFT)
                .firstResultOptional()
                .orElseGet(ChangeRequest::new);
        request.tenantId = tenantId;
        request.recordId = change.recordId();
        request.kind = change.kind();
        request.newValue = change.newValue();
        request.status = ChangeStatus.DRAFT;
        request.requestedBy = actor;
        request.requestedAt = Instant.now();
        request.persist();
        audit.record(new AuditEvent(actor, tenantId, "change-request",
                String.valueOf(request.id), "drafted", change.kind().name()));
        return request.id;
    }

    /** Takes a draft back. Only a draft — once submitted it belongs to the batch. */
    @Transactional
    public boolean discardDraft(String tenantId, Long id, String actor) {
        tenantBinding.bind(tenantId);
        long deleted = ChangeRequest.delete("id = ?1 and tenantId = ?2 and status = ?3",
                id, tenantId, ChangeStatus.DRAFT);
        if (deleted > 0) {
            audit.record(new AuditEvent(actor, tenantId, "change-request", String.valueOf(id),
                    "discarded", null));
        }
        return deleted > 0;
    }

    /**
     * Releases everything the user has drafted. This is the moment of handover: from here
     * the batch owns the requests, which is why it is one deliberate act and not a side
     * effect of typing.
     */
    @Transactional
    public int submitDrafts(String tenantId, String actor) {
        tenantBinding.bind(tenantId);
        int submitted = ChangeRequest.update("status = ?1 where tenantId = ?2 and status = ?3",
                ChangeStatus.OPEN, tenantId, ChangeStatus.DRAFT);
        if (submitted > 0) {
            audit.record(new AuditEvent(actor, tenantId, "change-request", null, "submitted",
                    "x" + submitted));
        }
        return submitted;
    }

}
