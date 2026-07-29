package com.example.platform.bff.me;

import com.example.platform.bff.tenant.TenantCatalog;
import com.example.platform.bff.user.PlatformUser;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

/**
 * The whole user context in one call — the only contract between the two shared
 * libraries. Deliberately tenant-independent: the response is the same whichever tenant
 * the user is currently looking at, so it caches cleanly, and switching tenants is a
 * decision the frontend makes without asking the server.
 */
@Path("/api/me")
@Authenticated
public class MeResource {

    @Inject
    PlatformUser user;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Me me() {
        return new Me(user.subject(), user.name(), user.email(),
                user.roles(), user.tenants());
    }

    public record Me(String subject, String name, String email, List<String> roles,
            List<TenantCatalog.Tenant> tenants) {
    }
}
