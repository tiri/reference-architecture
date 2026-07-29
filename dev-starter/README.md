# dev-starter

Local development environment for the modular portal platform: Keycloak (IAM) and the databases of all modules that need one.

## What's inside

| Service | URL / Port | Credentials |
|---|---|---|
| Keycloak | http://localhost:8080 | admin console: `admin` / `admin` |
| Demo DB (Postgres 17) | localhost:5433, db `demo` | app role `demo_app` / `demo_app`, owner `demo` / `demo` |
| Datenbasis (Cloudera stand-in: Impala + Kudu) | JDBC localhost:21050, web UI http://localhost:25000 | no authentication in the sandbox |

The modules connect as **`demo_app`**, deliberately not as the superuser `demo`: a Postgres superuser bypasses row-level security, which would silently disable the second line of tenant isolation. See [postgres/init/01-app-role.sql](postgres/init/01-app-role.sql).

Realm `platform` is imported automatically from [keycloak/realm-platform.json](keycloak/realm-platform.json).

## Test users

| User | Password | Realm roles |
|---|---|---|
| `alice` | `alice` | `user`, `admin`, `mandant_a`, `mandant_b` |
| `bob` | `bob` | `user`, `mandant_a` |

A `mandant_<id>` role *is* the tenant permission — there is no separate tenant claim.

## Start

```bash
docker compose up -d
./datenplattform/seed.sh
```

Keycloak takes ~30s on first boot.

**The Datenbasis needs the second command.** Impala has no equivalent of the Postgres
entrypoint that runs SQL on first start, so the table and its records are created
explicitly. The script waits for Impala, loads
[datenplattform/init/01-schema.sql](datenplattform/init/01-schema.sql) and prints the row
count per tenant. It is idempotent — run it again whenever you want the seed back.

## Large data

The base seed is 16 records — enough to see the app work, not enough to see whether the
design holds. [`seed-large.sh`](seed-large.sh) fills the **Datenbasis** — the records live there
and nowhere else, so that is the only place to fill:

```bash
./seed-large.sh            # 100_000 records, ~5s
./seed-large.sh 500000     # up to 1_000_000
```

Idempotent, and it leaves the named base records alone. The module's own database is not
seeded at all: it holds no records, only the change queue and the audit trail, and both
grow from use.

Measured at 100k (60,010 of them for tenant `a`) — every one of these is a query on Impala:

| | |
|---|---|
| First page, sorted | 291 ms |
| Page 5,000 | 312 ms — a deep offset costs the same as a shallow one |
| Sort by name | 219 ms |
| Search, 7,501 matches | 646 ms |
| Batch, per record | ~60 ms, and two round-trips |

The first four are the honest price of keeping no copy: a page costs hundreds of
milliseconds where a row-store would take single digits. The last row is the one to read
before designing any mass operation: the batch writes one record at a time, so a job of
60,010 would run for about an hour. Impala is built for set-based work; chunked
`update … where id in (…)` is the shape that fits it.

**Impala is five containers and it is slow to start**, especially on an arm64 machine: the
images are published for amd64 only and therefore run emulated. Impala is a query engine
and keeps no tables of its own, so the stand-in needs a Hive Metastore for the table
definitions, Impala's statestore/catalog/daemon, and Kudu underneath. Kudu is what makes
single rows mutable — on Impala's usual file-backed tables the module could not write a
verification back at all.

## Re-importing the realm

Realm import only happens when the realm does not exist yet. After editing
`realm-platform.json`, re-import with:

```bash
docker compose down -v && docker compose up -d
```

## Realm design notes

- **Clients** `portal` and `demo` (confidential, Authorization Code Flow with PKCE). Redirect URIs cover both the module ports (8081/8082) and the Vite dev-server ports (5173/5174) so the frontend dev proxy flow works. The modules therefore set `quarkus.oidc.authentication.pkce-required=true`.
- **Audience mapper per client**: Keycloak does not put the client id into `aud` of the access token by default. Each client has an audience mapper — without it, every module's JWT audience validation rejects the token.
- **Tenancy is a realm role**, not a claim of its own: `mandant_a` / `mandant_b`. There are no groups. The modules read roles from the **userinfo** endpoint (`quarkus.oidc.roles.source=userinfo`), so the realm-roles mapper on the `roles` scope must be exposed there — a role revoked in Keycloak then takes effect without waiting for the token to expire.
- **Built-in scopes are declared explicitly** (`basic`, `profile`, `email`, `roles`): a realm import that declares any `clientScopes` suppresses Keycloak's automatic creation of the built-in scopes, so they must be spelled out — otherwise tokens are missing `sub`, profile claims, and `realm_access.roles`.

## Cloud development

[`devfile.yaml`](devfile.yaml) describes the same environment for a cloud workspace
(Eclipse Che, OpenShift Dev Spaces, or any devfile 2.2 runtime): it clones all six
repositories, runs Keycloak, the module database, the Datenbasis and a tools container, and ships commands for
the usual order — install `shared-bff`, install `shared-ui`, then run a module.

All containers of a workspace share one network, so the modules reach the IAM and the
databases under `localhost` on the same ports as locally and the default configuration
applies unchanged.

Two things must be adjusted before first use:

- **Repository URLs** in `projects` point at placeholders.
- **Redirect URIs and the issuer.** In a workspace the modules are served from generated
  HTTPS hostnames, not `localhost:8081`. Add those hostnames to the `portal` and `demo`
  clients in the realm, and set `PLATFORM_IAM_ISSUER` to the workspace's Keycloak URL —
  the browser and the module must agree on the issuer, otherwise the login round-trip
  fails at the authorization endpoint.

## Port map (whole platform)

| App | Served | Vite dev |
|---|---|---|
| Portal | http://localhost:8081 | http://localhost:5173 |
| Demo | http://localhost:8082 | http://localhost:5174 |

## Run order (full platform)

1. `docker compose up -d` (this repo)
2. `shared-bff`: `mvn install`
3. `shared-ui`: `npm install`
4. `portal-app` / `demo-app`: see their READMEs (`mvn quarkus:dev`, or `mvn clean package` and `java -jar target/quarkus-app/quarkus-run.jar`)

See [docs/architecture.md](docs/architecture.md).
