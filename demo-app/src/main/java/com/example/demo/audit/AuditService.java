package com.example.demo.audit;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import java.time.Instant;

/**
 * Writes the audit trail (concept 8.4). Called from within the caller's transaction so
 * the trail and the change are committed together — an audit entry for a change that was
 * rolled back would be worse than none.
 */
@ApplicationScoped
public class AuditService {

    @Transactional(Transactional.TxType.MANDATORY)
    public void record(String actor, String tenantId, String recordType, String recordId,
            String action, String detail) {
        AuditEntry entry = new AuditEntry();
        entry.occurredAt = Instant.now();
        entry.actor = actor;
        entry.tenantId = tenantId;
        entry.recordType = recordType;
        entry.recordId = recordId;
        entry.action = action;
        entry.detail = detail;
        entry.persist();
    }
}
