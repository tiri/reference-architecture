package com.example.refarch.portal;

import io.quarkus.oidc.AccessTokenCredential;
import io.quarkus.security.identity.SecurityIdentity;
import io.smallrye.common.annotation.Blocking;
import io.smallrye.mutiny.Uni;
import io.vertx.core.http.HttpMethod;
import io.vertx.mutiny.core.Vertx;
import io.vertx.mutiny.core.buffer.Buffer;
import io.vertx.mutiny.ext.web.client.HttpRequest;
import io.vertx.mutiny.ext.web.client.HttpResponse;
import io.vertx.mutiny.ext.web.client.WebClient;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.security.RolesAllowed;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;

/**
 * API gateway for all registered domain services.
 * Forwards /api/{domain}/{path}?{query} → http://domain:port/api/{path}?{query}.
 * Query parameters are preserved via UriInfo so sorting, pagination and
 * filtering reach the domain app unchanged.
 */
@Path("/api")
@ApplicationScoped
public class ApiGateway {

    @Inject AppRegistryConfig registry;
    @Inject SecurityIdentity identity;
    @Inject Vertx vertx;

    private WebClient http;

    @PostConstruct
    void init() { http = WebClient.create(vertx); }

    @GET
    @Path("/{domain}/{path: .+}")
    @Produces(MediaType.WILDCARD)
    @RolesAllowed("**")
    public Uni<Response> apiGet(@PathParam("domain") String domain,
                                @PathParam("path") String path,
                                @Context UriInfo uriInfo) {
        return forward(domain, path, HttpMethod.GET, null, null, rawQuery(uriInfo));
    }

    @DELETE
    @Path("/{domain}/{path: .+}")
    @Produces(MediaType.WILDCARD)
    @RolesAllowed("**")
    public Uni<Response> apiDelete(@PathParam("domain") String domain,
                                   @PathParam("path") String path,
                                   @Context UriInfo uriInfo) {
        return forward(domain, path, HttpMethod.DELETE, null, null, rawQuery(uriInfo));
    }

    @POST
    @Path("/{domain}/{path: .+}")
    @Produces(MediaType.WILDCARD)
    @Consumes(MediaType.WILDCARD)
    @RolesAllowed("**")
    @Blocking
    public Uni<Response> apiPost(@PathParam("domain") String domain,
                                 @PathParam("path") String path,
                                 @Context ContainerRequestContext rc,
                                 byte[] body) {
        return forward(domain, path, HttpMethod.POST,
                rc.getHeaderString(HttpHeaders.CONTENT_TYPE), body,
                rawQuery(rc.getUriInfo()));
    }

    @PUT
    @Path("/{domain}/{path: .+}")
    @Produces(MediaType.WILDCARD)
    @Consumes(MediaType.WILDCARD)
    @RolesAllowed("**")
    @Blocking
    public Uni<Response> apiPut(@PathParam("domain") String domain,
                                @PathParam("path") String path,
                                @Context ContainerRequestContext rc,
                                byte[] body) {
        return forward(domain, path, HttpMethod.PUT,
                rc.getHeaderString(HttpHeaders.CONTENT_TYPE), body,
                rawQuery(rc.getUriInfo()));
    }

    @PATCH
    @Path("/{domain}/{path: .+}")
    @Produces(MediaType.WILDCARD)
    @Consumes(MediaType.WILDCARD)
    @RolesAllowed("**")
    @Blocking
    public Uni<Response> apiPatch(@PathParam("domain") String domain,
                                  @PathParam("path") String path,
                                  @Context ContainerRequestContext rc,
                                  byte[] body) {
        return forward(domain, path, HttpMethod.PATCH,
                rc.getHeaderString(HttpHeaders.CONTENT_TYPE), body,
                rawQuery(rc.getUriInfo()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Uni<Response> forward(String domain, String path, HttpMethod method,
                                  String contentType, byte[] body, String query) {
        return resolve(domain).flatMap(url -> {
            String target = url + "/api/" + path;
            if (query != null && !query.isEmpty()) target += "?" + query;
            HttpRequest<Buffer> req = withToken(http.requestAbs(method, target));
            if (contentType != null) req.putHeader(HttpHeaders.CONTENT_TYPE, contentType);
            return (body != null && body.length > 0)
                    ? req.sendBuffer(Buffer.buffer(body))
                    : req.send();
        }).map(this::toResponse);
    }

    private static String rawQuery(UriInfo uriInfo) {
        return uriInfo.getRequestUri().getRawQuery();
    }

    private Uni<String> resolve(String domain) {
        return registry.apps().stream()
                .filter(a -> a.id().equals(domain))
                .findFirst()
                .map(a -> Uni.createFrom().item(a.url()))
                .orElseGet(() -> Uni.createFrom().failure(
                        new NotFoundException("Unknown domain: " + domain)));
    }

    private HttpRequest<Buffer> withToken(HttpRequest<Buffer> req) {
        AccessTokenCredential cred = identity.getCredential(AccessTokenCredential.class);
        if (cred != null) req.bearerTokenAuthentication(cred.getToken());
        return req;
    }

    private Response toResponse(HttpResponse<Buffer> r) {
        String ct = r.getHeader("Content-Type");
        return Response.status(r.statusCode())
                .entity(r.body() != null ? r.body().getBytes() : new byte[0])
                .type(ct != null ? ct : MediaType.APPLICATION_OCTET_STREAM)
                .build();
    }
}
