package com.example.demo.tenant;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

/**
 * Binds the tenant that the database row-level policies evaluate.
 *
 * <p>The setting is written with {@code set_config(..., true)}, which scopes it to the
 * <b>current transaction</b>. Binding it to the connection instead would be the most
 * dangerous variant of this mistake: with connection pooling the value would stick to
 * the connection and the next user would inherit it (risk 11.3).
 */
@ApplicationScoped
public class TenantBinding {

    @Inject
    EntityManager entityManager;

    public void bind(String tenantId) {
        entityManager.createNativeQuery("select set_config('app.tenant_id', ?1, true)")
                .setParameter(1, tenantId == null ? "" : tenantId)
                .getSingleResult();
    }
}
