package com.example.platform.bff.info;

import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * What module is this, and how is it wired — the answer the frontend needs once at start
 * up. Deployment facts only: no user data, nothing tenant-scoped, identical for everyone.
 */
@Path("/api/info")
@Authenticated
public class InfoResource {

    /** The module's own name, from {@code quarkus.application.name}. */
    @Inject
    @ConfigProperty(name = "quarkus.application.name")
    String name;

    /**
     * The build this module is running. Defaults to the Maven project version and is
     * fixed at build time, so a release pipeline stamps it in with
     * {@code -Dquarkus.application.version=...} — it can never drift from the artifact.
     */
    @Inject
    @ConfigProperty(name = "quarkus.application.version")
    String version;

    /** Absolute URL of the portal; unset in the portal itself, which then shows no back link. */
    @Inject
    @ConfigProperty(name = "platform.portal-url")
    Optional<String> portalUrl;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Info info() {
        return new Info(name, version, portalUrl.orElse(null));
    }

    public record Info(String name, String version, String portalUrl) {
    }
}
