# Reference implementation ↔ architecture

The architecture itself lives in **[`arch-docs/`](../../arch-docs/README.md)** (German, arc42). Concepts, decisions, rationale and the known pitfalls are **not** repeated here.

This page answers only two questions the documentation cannot: **where does each concept live in the code**, and **where does the reference deliberately differ from the target**.

| Question | Chapter |
|---|---|
| What are the fixed rules? | [2 Randbedingungen](../../arch-docs/README.md#2-randbedingungen) |
| Who are the neighbours (IAM, Datenbasis)? | [3 Kontextabgrenzung](../../arch-docs/README.md#3-kontextabgrenzung) |
| How is a module built, what do the shared libs do? | [5 Bausteinsicht](../../arch-docs/README.md#5-bausteinsicht) |
| Login, SSO, token check, batch | [6 Laufzeitsicht](../../arch-docs/README.md#6-laufzeitsicht) |
| Session, tenant isolation, logging | [8 Querschnittliche Konzepte](../../arch-docs/README.md#8-querschnittliche-konzepte) |
| Why is it built this way? | [9 Architekturentscheidungen](../../arch-docs/README.md#9-architekturentscheidungen) |
| What goes wrong in practice? | [11 Risiken und Praxisfallen](../../arch-docs/README.md#11-risiken-und-praxisfallen) |
| What does this term mean in the code? | [12 Glossar](../../arch-docs/README.md#12-glossar) |

## Concept → file

| Concept | Where it lives |
|---|---|
| Two behaviours in one process (401 on `/api/**`, redirect elsewhere) | `shared-bff` — `PlatformHttpFilter`, `SpaRoutes` |
| Access token verified on every request | `quarkus.oidc.authentication.verify-access-token` per module |
| Tokens encrypted in the cookie, container stateless | `quarkus.oidc.token-state-manager.*` per module |
| Tenant in the path, re-checked against the `mandant_*` role | `shared-bff` — `PlatformUser` |
| Fixed tenant catalogue and display names | `shared-bff` — `META-INF/microprofile-config.properties`, read by `TenantCatalog`; modules configure nothing |
| User object built per request, never persisted | `shared-bff` — `PlatformUser` |
| Roles from the userinfo endpoint, cached | `quarkus.oidc.roles.source=userinfo` per module |
| Standard endpoints `/api/me`, `/api/info`, `/logout` | `shared-bff` — `MeResource`, `InfoResource`, `LogoutResource` |
| Back-channel logout | `quarkus.oidc.logout.backchannel.path` per module |
| Problem+JSON errors | `shared-bff` — `ProblemDetail`, `TenantAccessDeniedMapper` |
| CSP and security headers | `shared-bff` — `PlatformHttpFilter` |
| Row-level security, tenant bound per transaction | `demo-app` — [`V1__audit.sql`](../../demo-app/src/main/resources/db/migration/V1__audit.sql), [`V2__change_request.sql`](../../demo-app/src/main/resources/db/migration/V2__change_request.sql), `TenantBinding` |
| Audit table, append-only | `demo-app` — `V1__audit.sql`, `AuditService` |
| Change queue + batch as a start option | `demo-app` — `V2__change_request.sql`, `ChangeService`, `BatchRunner`, `DemoMain --batch` |
| Datenbasis over JDBC, own principal | `demo-app` — `Datenbasis`, second datasource; `dev-starter` — Impala on :21050 with Kudu underneath |

## Deliberate differences from the target

| Topic | Reference | Why |
|---|---|---|
| Kubernetes deployment, network separation, image hardening | not present | Operational concern of a different team ([8.6](../../arch-docs/README.md#8-querschnittliche-konzepte)); nothing to prove locally |
| Datenbasis authorization | local Impala with seed data, no Ranger | There is no real platform to talk to here; the sandbox has no authorization to enforce |
| Tenant binding to the database lives in `demo-app`, not `shared-bff` | module-level | `shared-bff` must stay usable by modules without a database — the portal has none. Moves to the library as soon as a second database module exists (technical debt, 11.7) |

## Two traps that are invisible in tests

Both are in [chapter 11](../../arch-docs/README.md#11-risiken-und-praxisfallen); they are repeated here only because the fix is a property of *this* repository:

- **The application must not be a database superuser.** A superuser bypasses row-level security unconditionally, so the second line of tenant isolation would be silently off while every test stays green. `dev-starter` therefore creates an unprivileged `demo_app` role — see [postgres/init/01-app-role.sql](../postgres/init/01-app-role.sql). `force row level security` is needed as well, or the policy would not apply to the table owner.
- **The Datenbasis datasource is not JTA-enlisted** (`jdbc.transactions=disabled`). Sharing a transaction with the module's own database would need XA and — worse — a failure on Impala would roll back the queue, so the run would replay the same requests forever.

## Local specifics

Ports, test users, realm design, startup order: [../README.md](../README.md).
