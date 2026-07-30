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
 *
 * <p><b>Why this is not in shared-bff.</b> Every module with a tenant-scoped database needs
 * exactly these four lines, so the library looks like the place for them — but the library
 * has no persistence dependency, and moving this there would put Hibernate and a datasource
 * into every module that includes it, including the ones that have no database at all. Four
 * duplicated lines are the cheaper of the two mistakes. If a second module ever needs it,
 * what belongs in the library is the tenant contract, not an {@code EntityManager}.
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
