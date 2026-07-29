package com.example.demo.change;

import com.example.demo.audit.AuditService;
import com.example.demo.tenant.TenantBinding;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    public Long request(String tenantId, String recordId, String kind, String newValue,
            String actor) {
        tenantBinding.bind(tenantId);
        ChangeRequest request = ChangeRequest
                .<ChangeRequest>find("tenantId = ?1 and recordId = ?2 and kind = ?3 and status = ?4",
                        tenantId, recordId, kind, ChangeRequest.DRAFT)
                .firstResultOptional()
                .orElseGet(ChangeRequest::new);
        request.tenantId = tenantId;
        request.recordId = recordId;
        request.kind = kind;
        request.newValue = newValue;
        request.status = ChangeRequest.DRAFT;
        request.requestedBy = actor;
        request.requestedAt = Instant.now();
        request.persist();
        audit.record(actor, tenantId, "change-request", String.valueOf(request.id), "drafted", kind);
        return request.id;
    }

    /** Takes a draft back. Only a draft — once submitted it belongs to the batch. */
    @Transactional
    public boolean discardDraft(String tenantId, Long id, String actor) {
        tenantBinding.bind(tenantId);
        long deleted = ChangeRequest.delete("id = ?1 and tenantId = ?2 and status = ?3",
                id, tenantId, ChangeRequest.DRAFT);
        if (deleted > 0) {
            audit.record(actor, tenantId, "change-request", String.valueOf(id), "discarded", null);
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
                ChangeRequest.OPEN, tenantId, ChangeRequest.DRAFT);
        if (submitted > 0) {
            audit.record(actor, tenantId, "change-request", null, "submitted", "x" + submitted);
        }
        return submitted;
    }

    /**
     * What is still outstanding for the given records, newest first — so the record list
     * can show a row as changed until the platform actually holds the new value.
     */
    @Transactional
    public Map<String, ChangeRequest> pendingFor(String tenantId, List<String> recordIds) {
        if (recordIds.isEmpty()) {
            return Map.of();
        }
        tenantBinding.bind(tenantId);
        List<ChangeRequest> pending = ChangeRequest.list(
                "tenantId = ?1 and status in ?2 and recordId in ?3 order by requestedAt asc",
                tenantId, ChangeRequest.PENDING, recordIds);
        // Ascending, so a later request overwrites an earlier one for the same record and
        // what remains is the most recent.
        Map<String, ChangeRequest> byRecord = new HashMap<>();
        for (ChangeRequest request : pending) {
            byRecord.put(request.recordId, request);
        }
        return byRecord;
    }

    /** How the tenant's requests are distributed across the states they pass through. */
    @Transactional
    public Counts counts(String tenantId) {
        tenantBinding.bind(tenantId);
        return new Counts(
                countOf(tenantId, ChangeRequest.DRAFT),
                countOf(tenantId, ChangeRequest.OPEN),
                countOf(tenantId, ChangeRequest.APPLIED),
                countOf(tenantId, ChangeRequest.FAILED));
    }

    private long countOf(String tenantId, String status) {
        return ChangeRequest.count("tenantId = ?1 and status = ?2", tenantId, status);
    }

    public record Counts(long draft, long open, long applied, long failed) {
    }
}
