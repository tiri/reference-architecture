package com.example.platform.bff.tenant;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * The fixed list of tenants with their display names — <b>shipped by this library</b>
 * (see {@code META-INF/microprofile-config.properties}), not configured per module. That
 * is what makes every module show the same tenants, in the same order, under the same
 * name; adding one is a release of this library.
 *
 * <p>It carries no permissions — who may act in which tenant is decided solely by the
 * {@code mandant_<id>} roles in the token. The catalogue only supplies display name and
 * order, and rejects ids that do not exist at all.
 *
 * <p>A module may still override {@code platform.tenants} for a deviating environment;
 * the format is {@code <id>:<display name>}, comma separated.
 */
@ApplicationScoped
public class TenantCatalog {

    private final Map<String, Tenant> byId = new LinkedHashMap<>();

    @Inject
    TenantCatalog(@ConfigProperty(name = "platform.tenants") Optional<List<String>> configured) {
        List<String> entries = configured.orElse(List.of());
        if (entries.isEmpty()) {
            // The library ships the list, so an empty catalogue means someone overrode it
            // with nothing — every user would silently end up without a single tenant.
            throw new IllegalStateException("platform.tenants is empty: no tenant catalogue available");
        }
        for (String entry : entries) {
            String[] parts = entry.split(":", 2);
            String id = parts[0].trim();
            byId.put(id, new Tenant(id, parts.length > 1 ? parts[1].trim() : id));
        }
    }

    public List<Tenant> all() {
        return List.copyOf(byId.values());
    }

    public boolean exists(String tenantId) {
        return byId.containsKey(tenantId);
    }

    /** The given ids in catalogue order, with their display names. */
    public List<Tenant> resolve(List<String> tenantIds) {
        return byId.values().stream().filter(tenant -> tenantIds.contains(tenant.id())).toList();
    }

    public record Tenant(String id, String name) {
    }
}
