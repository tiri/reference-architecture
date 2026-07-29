# shared-bff

Shared cross-cutting backend logic for platform modules — a plain library, not a framework extension. Adding it to a module makes that module platform-conformant without any module team writing security code.

The jar ships a **Jandex index**; that is what makes the beans and JAX-RS resources inside it visible to the module. Without the index they are silently absent — the application starts and the endpoints simply do not exist.

- **OIDC authorization code flow** with the tokens **encrypted in the cookie** — the container stays stateless, and no token is ever readable by JavaScript.
- **Two behaviours in one process**: `/api/**` answers **401** so the SPA can start the login itself; every other path redirects to the IAM and then serves the UI.
- **Every call authorized on its own**: the **access token** is verified on every request (signature, issuer, audience, expiry), not just the ID token. The session carries the token but authorizes nothing.
- **One IAM per environment** — further identity providers are federated in the IAM, never in application config.
- **Tenant in the path** (`/api/t/{tenant}/…`), so every response is cacheable under its own key instead of varying on a cookie. A tenant is simply a `mandant_<id>` role, re-checked against the token on **every** request — the client chooses, the module never believes it.
- **User object per request**, built from the token and the IAM's userinfo — never stored. There is no user table.
- **Standard endpoints**: `GET /api/me` (the user; tenant-independent, so it caches), `GET /api/info` (the module: name, build version, portal URL), `POST /logout`, and `POST /back-channel-logout` for the IAM — reachable without a session, since it proves itself with the logout token's signature. There is deliberately **no tenant-switch endpoint** — switching is frontend state.
- **Security headers incl. Content-Security-Policy**, **RFC 9457** `problem+json`, and security events on their own logger.
- **No CSRF token**: the session cookie is `SameSite=Lax`, so a cross-site request never carries it and arrives unauthenticated. The one rule this depends on: **every state-changing endpoint stays a non-GET method** — `Lax` does send the cookie on top-level GET navigations.

## Usage

```xml
<dependency>
  <groupId>com.example.platform</groupId>
  <artifactId>shared-bff</artifactId>
  <version>0.1.0-SNAPSHOT</version>
</dependency>
```

The library brings the behaviour; the module brings only its own identity. A complete,
commented example is [`portal-app/src/main/resources/application.properties`](../portal-app/src/main/resources/application.properties) — copy it rather than
reproducing the list here. The four settings that are **not** interchangeable between
modules, and what breaks when they are wrong:

| Setting | Must be | If not |
|---|---|---|
| `quarkus.oidc.client-id` + `quarkus.oidc.token.audience` | the module's own OIDC client | A token issued for another module would be accepted here — module separation gone |
| `quarkus.oidc.authentication.cookie-suffix` | unique per module | Cookies ignore ports: logging into one module logs you out of the other |
| `quarkus.oidc.token-state-manager.encryption-secret` | identical across replicas, set explicitly | Each replica generates its own key and users are logged out at random |
| `platform.portal-url` | the portal's URL; unset **in** the portal | The back link points nowhere, or the portal links to itself |

Optional: `platform.security.content-security-policy`, `platform.security.secure-cookies` (set to `true` behind TLS).

A module does **not** configure the tenant list — see below.

## The tenant catalogue

The fixed list of tenants and their display names ships **with this library**, in `META-INF/microprofile-config.properties`:

```properties
platform.tenants=a:Tenant A,b:Tenant B
```

That is what makes every module show the same tenants, in the same order, under the same name — adding one is a release of this library rather than an edit in each module. The catalogue grants nothing: who may act in which tenant is decided solely by the `mandant_<id>` roles in the token, and the frontend receives the names through `GET /api/me`, so it holds no copy either.

A module may still override `platform.tenants` for a deviating environment; an empty value fails at startup rather than leaving every user without tenants.

## Build

```bash
mvn install
```
