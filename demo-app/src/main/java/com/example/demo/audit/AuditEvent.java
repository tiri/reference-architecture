package com.example.demo.audit;

/**
 * One thing that happened, as the trail records it.
 *
 * <p>A record rather than six String parameters. The parameters were all the same type, so
 * any two of them could be swapped and nothing — not the compiler, not a test, not the
 * trail itself — would notice; the entry would simply attribute the action to the tenant
 * and file it under the actor. At a call site the names are now written out.
 *
 * @param actor      who did it: a user's subject, or {@code batch} for the timed run
 * @param tenantId   the tenant whose data it concerns
 * @param recordType what kind of thing was touched
 * @param recordId   which one, where there is a single one
 * @param action     what was done to it
 * @param detail     anything worth keeping beyond that
 */
public record AuditEvent(String actor, String tenantId, String recordType, String recordId,
        String action, String detail) {
}
