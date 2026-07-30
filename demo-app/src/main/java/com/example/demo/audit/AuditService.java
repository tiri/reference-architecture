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
    public void record(AuditEvent event) {
        AuditEntry entry = new AuditEntry();
        // The one thing the caller does not supply: when. Read here so every entry is
        // stamped by the same clock, and nobody can pass a time of their choosing.
        entry.occurredAt = Instant.now();
        entry.actor = event.actor();
        entry.tenantId = event.tenantId();
        entry.recordType = event.recordType();
        entry.recordId = event.recordId();
        entry.action = event.action();
        entry.detail = event.detail();
        entry.persist();
    }
}
