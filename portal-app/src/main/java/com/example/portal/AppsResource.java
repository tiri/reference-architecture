package com.example.portal;

import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;

/**
 * Tiles for the launcher grid. Cross-module navigation is a plain link to the other
 * module's own origin — modules never call each other, and the IAM session makes the
 * target module's login invisible.
 */
@Path("/api/apps")
@Authenticated
public class AppsResource {

    @Inject
    PortalAppsConfig config;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<Tile> apps() {
        return config.apps().stream()
                .map(app -> new Tile(app.id(), app.name(), app.description(), app.url(), app.icon().orElse(null)))
                .toList();
    }

    public record Tile(String id, String name, String description, String url, String icon) {
    }
}
