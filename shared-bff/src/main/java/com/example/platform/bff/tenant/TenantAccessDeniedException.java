package com.example.platform.bff.tenant;

/** Thrown when a user asks to act in a tenant that their token does not grant. */
public class TenantAccessDeniedException extends RuntimeException {

    public TenantAccessDeniedException(String tenantId) {
        super("No access to tenant '" + tenantId + "'");
    }
}
