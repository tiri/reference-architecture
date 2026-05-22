package com.example.refarch.portal;

import io.smallrye.mutiny.Uni;
import io.vertx.mutiny.core.Vertx;
import io.vertx.mutiny.core.buffer.Buffer;
import io.vertx.mutiny.ext.web.client.HttpResponse;
import io.vertx.mutiny.ext.web.client.WebClient;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.security.PermitAll;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Asset gateway for domain static bundles (Module Federation remote entries and chunks).
 * No auth — these are JavaScript files loaded by the browser before the app mounts.
 *
 *   GET /assets/{domain}/{path} → http://domain:port/{path}
 */
@Path("/assets")
@ApplicationScoped
public class AssetGateway {

    @Inject AppRegistryConfig registry;
    @Inject Vertx vertx;

    private WebClient http;

    @PostConstruct
    void init() { http = WebClient.create(vertx); }

    @GET
    @Path("/{domain}/{path: .+}")
    @Produces(MediaType.WILDCARD)
    @PermitAll
    public Uni<Response> proxy(@PathParam("domain") String domain,
                               @PathParam("path") String path) {
        return resolve(domain)
                .flatMap(url -> http.getAbs(url + "/" + path).send())
                .map(this::toResponse);
    }

    private Uni<String> resolve(String domain) {
        return registry.apps().stream()
                .filter(a -> a.id().equals(domain))
                .findFirst()
                .map(a -> Uni.createFrom().item(a.url()))
                .orElseGet(() -> Uni.createFrom().failure(
                        new NotFoundException("Unknown domain: " + domain)));
    }

    private Response toResponse(HttpResponse<Buffer> r) {
        String ct = r.getHeader("Content-Type");
        return Response.status(r.statusCode())
                .entity(r.body() != null ? r.body().getBytes() : new byte[0])
                .type(ct != null ? ct : MediaType.APPLICATION_OCTET_STREAM)
                .build();
    }
}
