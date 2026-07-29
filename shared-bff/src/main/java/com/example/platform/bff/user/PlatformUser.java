package com.example.platform.bff.user;

import com.example.platform.bff.tenant.TenantAccessDeniedException;
import com.example.platform.bff.tenant.TenantCatalog;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Objects;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.jboss.logging.Logger;

/**
 * The acting user of the current request — built from the validated token and the roles
 * the IAM reports, and <b>never stored</b>. There is no user table: the IAM owns
 * identities, and a copy in the module's database would be a second source of truth that
 * silently goes stale.
 */
@RequestScoped
public class PlatformUser {

    private static final String TENANT_ROLE_PREFIX = "mandant_";
    /** Own logger so operations can route security events separately (BSI OPS.1.1.5). */
    private static final Logger SECURITY_LOG = Logger.getLogger("platform.security");

    @Inject
    JsonWebToken token;

    @Inject
    SecurityIdentity identity;

    @Inject
    TenantCatalog catalog;

    public String subject() {
        return token.getSubject();
    }

    public String name() {
        Object name = token.getClaim("name");
        Object fallback = token.getClaim("preferred_username");
        return Objects.toString(name != null ? name : fallback != null ? fallback : token.getSubject());
    }

    public String email() {
        Object email = token.getClaim("email");
        return email == null ? null : email.toString();
    }

    /** Roles that are not tenant assignments, i.e. what the user may *do*. */
    public List<String> roles() {
        return identity.getRoles().stream()
                .filter(role -> !role.startsWith(TENANT_ROLE_PREFIX))
                .sorted()
                .toList();
    }

    /**
     * Tenants the user may act in: one {@code mandant_<id>} role per tenant, named and
     * ordered by the catalogue so every module presents them identically.
     */
    public List<TenantCatalog.Tenant> tenants() {
        return catalog.resolve(identity.getRoles().stream()
                .filter(role -> role.startsWith(TENANT_ROLE_PREFIX))
                .map(role -> role.substring(TENANT_ROLE_PREFIX.length()))
                .toList());
    }

    /**
     * Validates a tenant taken from the request path. The client chooses it, the module
     * never believes it: it counts only if the token carries the matching role.
     */
    public String requireTenant(String tenantId) {
        if (tenantId == null || !catalog.exists(tenantId)
                || !identity.hasRole(TENANT_ROLE_PREFIX + tenantId)) {
            SECURITY_LOG.warnf("tenant access denied: subject=%s requestedTenant=%s", subject(), tenantId);
            throw new TenantAccessDeniedException(tenantId);
        }
        return tenantId;
    }
}
