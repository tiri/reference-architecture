package com.example.platform.bff.security;

import io.vertx.core.http.HttpServerResponse;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * One filter in front of everything the module serves — including the static SPA, which
 * never passes through JAX-RS. It does two things:
 *
 * <ol>
 * <li><b>Security headers</b> on every response, including the Content-Security-Policy
 * (XSS is the remaining main risk once the token is unreadable).</li>
 * <li><b>401 instead of a redirect for {@code /api/**}</b>: the browser holds only a
 * cookie, so authentication is an authorization code flow. For an API call a redirect to
 * the IAM is useless — the SPA must see a 401 to start the login itself.</li>
 * </ol>
 */
@ApplicationScoped
public class PlatformHttpFilter {

    @Inject
    @ConfigProperty(name = "platform.security.content-security-policy",
            defaultValue = "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; "
                    + "object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'")
    String contentSecurityPolicy;

    /** Off by default so plain-HTTP local development works; on behind TLS. */
    @Inject
    @ConfigProperty(name = "platform.security.secure-cookies", defaultValue = "false")
    boolean secureCookies;

    public void register(@Observes Router router) {
        router.route().order(-1000).handler(this::handle);
    }

    private void handle(RoutingContext context) {
        boolean apiCall = context.normalizedPath().startsWith("/api/");
        context.addHeadersEndHandler(v -> {
            HttpServerResponse response = context.response();
            putIfAbsent(response, "Content-Security-Policy", contentSecurityPolicy);
            putIfAbsent(response, "X-Content-Type-Options", "nosniff");
            putIfAbsent(response, "X-Frame-Options", "DENY");
            // Nothing leaves this origin, but our own requests keep their referrer — and
            // with it their Origin header. Under "no-referrer" the browser sends
            // "Origin: null" on a form post, and the module's own CORS rule rejects it.
            putIfAbsent(response, "Referrer-Policy", "same-origin");
            if (secureCookies) {
                putIfAbsent(response, "Strict-Transport-Security", "max-age=31536000; includeSubDomains");
            }
            // Only a redirect that leaves this origin is a login redirect; local ones stay.
            String location = response.headers().get("location");
            if (apiCall && response.getStatusCode() == 302 && location != null && !location.startsWith("/")) {
                response.headers().remove("location");
                response.setStatusCode(401);
            }
        });
        context.next();
    }

    private void putIfAbsent(HttpServerResponse response, String header, String value) {
        if (!response.headers().contains(header)) {
            response.putHeader(header, value);
        }
    }
}
