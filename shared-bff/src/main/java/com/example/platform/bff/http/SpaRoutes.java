package com.example.platform.bff.http;

import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.util.Set;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Makes the frontend's own routes survive a reload.
 *
 * <p>A single-page application routes in the browser: {@code /records} is a state of the
 * loaded page, not a file. Type it, reload it or open a bookmark, though, and the browser
 * asks the server for it — which knows no such resource and answers 404. This hands those
 * requests the application shell instead, and the frontend then reads the address itself.
 *
 * <p>The rule is a deny-list, not a guess. Everything the <em>server</em> owns is named
 * here; anything else that looks like a page belongs to the frontend. Getting this the
 * other way round is the classic way to break login: the OIDC callback is an ordinary
 * path without a file extension, and rerouting it would swallow the authorization code.
 */
@ApplicationScoped
public class SpaRoutes {

    private static final String SHELL = "/index.html";

    /** Server-owned prefixes: the API, the management endpoints, and the OIDC dance. */
    @Inject
    @ConfigProperty(name = "quarkus.oidc.authentication.redirect-path", defaultValue = "/callback")
    String redirectPath;

    @Inject
    @ConfigProperty(name = "quarkus.oidc.logout.path", defaultValue = "/oidc-logout")
    String logoutPath;

    @Inject
    @ConfigProperty(name = "quarkus.oidc.logout.backchannel.path",
            defaultValue = "/back-channel-logout")
    String backchannelPath;

    public void register(@Observes Router router) {
        // After the security headers filter (-1000) and before anything that serves
        // content, so the reroute happens while the request is still up for grabs.
        router.route().order(-900).handler(this::handle);
    }

    private void handle(RoutingContext context) {
        if (isFrontendRoute(context)) {
            context.reroute(SHELL);
            return;
        }
        context.next();
    }

    private boolean isFrontendRoute(RoutingContext context) {
        if (context.request().method() != io.vertx.core.http.HttpMethod.GET) {
            return false;
        }
        String path = context.normalizedPath();
        if (path.equals("/") || path.equals(SHELL)) {
            return false;
        }
        if (owned().stream().anyMatch(owned -> path.equals(owned) || path.startsWith(owned + "/"))) {
            return false;
        }
        // A dot in the last segment means a file — the bundle, the stylesheet, an icon.
        // Those must 404 honestly when missing, or a typo in an asset path would silently
        // return HTML and fail much later with a confusing parse error.
        String lastSegment = path.substring(path.lastIndexOf('/') + 1);
        if (lastSegment.contains(".")) {
            return false;
        }
        // Only a browser asking for a page. An API client that mistypes a path should get
        // its 404, not a document it cannot read.
        String accept = context.request().getHeader("Accept");
        return accept != null && accept.contains("text/html");
    }

    private Set<String> owned() {
        return Set.of("/api", "/q", "/logout", redirectPath, logoutPath, backchannelPath);
    }
}
