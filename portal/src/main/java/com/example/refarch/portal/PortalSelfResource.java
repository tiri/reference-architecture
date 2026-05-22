package com.example.refarch.portal;

import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.Uni;
import io.vertx.mutiny.core.Vertx;
import io.vertx.mutiny.ext.web.client.WebClient;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import java.util.List;
import java.util.Map;

/**
 * Portal-owned REST API under /api/portal/*.
 *
 *   GET /api/portal/user    → current user identity                 (authenticated)
 *   GET /api/portal/apps    → registered domain app list, fast      (authenticated)
 *   GET /api/portal/status  → health + version per app, aggregated  (authenticated)
 */
@Path("/api/portal")
@Produces(MediaType.APPLICATION_JSON)
public class PortalSelfResource {

    @Inject SecurityIdentity identity;
    @Inject AppRegistryConfig registry;
    @Inject Vertx vertx;

    private WebClient http;

    @PostConstruct
    void init() { http = WebClient.create(vertx); }

    @GET
    @Path("/user")
    @RolesAllowed("**")
    public Map<String, String> user() {
        // Attributes are populated from the cached UserInfo in the session cookie —
        // no Keycloak call here, userinfo was fetched at login / token refresh.
        Object email = identity.getAttribute("email");
        return Map.of(
                "name",  identity.getPrincipal().getName(),
                "email", email != null ? email.toString() : ""
        );
    }

    @GET
    @Path("/apps")
    @RolesAllowed("**")
    public List<Map<String, String>> apps() {
        return registry.apps().stream()
                .map(a -> Map.of("id", a.id(), "name", a.name(), "description", a.description()))
                .toList();
    }

    @GET
    @Path("/orgs")
    @RolesAllowed("**")
    public List<Map<String, String>> orgs() {
        return registry.orgs().stream()
                .map(o -> Map.of("key", o.key(), "value", o.value()))
                .toList();
    }

    /**
     * Aggregates health and version for every registered domain app in parallel.
     * Fetched separately from /apps so the app list renders immediately in the
     * browser and status badges update when this resolves.
     */
    @GET
    @Path("/status")
    @RolesAllowed("**")
    public Uni<List<Map<String, Object>>> status() {
        return Multi.createFrom().iterable(registry.apps())
                .onItem().transformToUniAndMerge(this::fetchAppStatus)
                .collect().asList();
    }

    private Uni<Map<String, Object>> fetchAppStatus(AppRegistryConfig.AppEntry app) {
        Uni<String> health = http.getAbs(app.url() + "/q/health")
                .timeout(5_000)
                .send()
                .map(r -> r.bodyAsJsonObject().getString("status", "UNKNOWN"))
                .onFailure().recoverWithItem("DOWN");

        Uni<String> version = http.getAbs(app.url() + "/q/info")
                .timeout(5_000)
                .send()
                .map(r -> {
                    io.vertx.core.json.JsonObject build = r.bodyAsJsonObject().getJsonObject("build");
                    return build != null ? build.getString("version", "—") : "—";
                })
                .onFailure().recoverWithItem("—");

        return Uni.combine().all().unis(health, version)
                .asTuple()
                .map(t -> Map.of("id", app.id(), "status", t.getItem1(), "version", t.getItem2()));
    }
}
