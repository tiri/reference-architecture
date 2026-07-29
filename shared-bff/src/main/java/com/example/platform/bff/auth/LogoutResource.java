package com.example.platform.bff.auth;

import io.quarkus.security.Authenticated;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;
import java.net.URI;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Logout is a top-level form submission, not an XHR — the OIDC redirect chain has to run
 * in the main window. It must stay a POST: the session cookie is {@code SameSite=Lax},
 * which withholds it from cross-site POSTs but not from top-level GET navigations.
 *
 * <p>The actual RP-initiated logout is done by the OIDC extension at its own path; this
 * endpoint only hands over.
 */
@Path("/logout")
@Authenticated
public class LogoutResource {

    @ConfigProperty(name = "quarkus.oidc.logout.path", defaultValue = "/oidc-logout")
    String oidcLogoutPath;

    @POST
    public Response logout() {
        return Response.seeOther(URI.create(oidcLogoutPath)).build();
    }
}
