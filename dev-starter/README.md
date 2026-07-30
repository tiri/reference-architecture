# dev-starter

Local development environment for the modular portal platform: Keycloak (IAM), the databases of all modules that need one, and the Datenbasis they read.

## What's inside

| Service | URL / Port | Credentials |
|---|---|---|
| Keycloak | http://localhost:8080 | admin console: `admin` / `admin` |
| Demo DB (Postgres 17) | localhost:5433, db `demo` | app role `demo_app` / `demo_app`, owner `demo` / `demo` |
| Datenbasis (Postgres 17) | localhost:5435, db `datenbasis` | module login `datenbasis_reader` / `datenbasis_reader`, owner `datenbasis` / `datenbasis` |

The modules connect as **`demo_app`**, deliberately not as the superuser `demo`: a Postgres superuser bypasses row-level security, which would silently disable the second line of tenant isolation. See [postgres/init/01-app-role.sql](postgres/init/01-app-role.sql).

Realm `platform` is imported automatically from [keycloak/realm-platform.json](keycloak/realm-platform.json).

## Test users

| User | Password | Realm roles |
|---|---|---|
| `alice` | `alice` | `user`, `admin`, `mandant_a`, `mandant_b` |
| `bob` | `bob` | `user`, `mandant_a` |

A `mandant_<id>` role *is* the tenant permission — there is no separate tenant claim.

## The Datenbasis

The Datenbasis is a **foreign system**: the leading source of the records, operated by
someone else. The module keeps no copy of them, so every page a user turns is a query
against it.

Here it is a **PostgreSQL server of its own** on 5435, beside the module's own on 5433. Not
a second database on one server: those cannot be joined either, but they share a version, a
restart, a backup and a page cache, so the sandbox would be quietly easier than the thing it
stands for. Separate, the boundary is real — and it can be stopped on its own:

```bash
docker compose stop datenbasis-db
```

With it down the module stays up and readiness stays green — a foreign system being
unreachable is not a reason for an orchestrator to restart this instance. The record pages
and the dashboard answer **503 `Datenbasis nicht erreichbar`** as `application/problem+json`,
and the change queue keeps working, because that is the module's own database. Verified by
stopping it.

The module connects as `datenbasis_reader`, which owns nothing here: rights on the data,
none on the schema. The owner is `datenbasis`, standing in for whoever operates the real
thing. A deployment restricts the same principal with its own policy engine, on hardware
this module never touches.

It reaches the records through `RecordCatalog` rather than through a driver, so a deployment
points the datasource at whatever it actually operates and changes no code. That interface is
the only reason this substitution is possible at all.

```bash
docker compose up -d           # Keycloak + two Postgres servers, three containers
./datenbasis/seed.sh           # 16 named records
./datenbasis/seed.sh 5000000   # or a few million, to feel the paging
```

Keycloak takes ~30s on first boot and `docker compose up -d` returns before it is usable;
the databases are ready in seconds.

## Data size

The base seed is 16 records — enough to see the app work, not enough to see whether the
design holds. Pass a row count to fill it properly; the script is idempotent and leaves the
named base records alone. The module's own database is never seeded: it holds no records,
only the change queue and the audit trail, and both grow from use.

**Size costs time and disk.** Rows are generated single-threaded and every one is stored, so
a few million take a minute or two, and eighty million about half an hour and some twenty
gigabytes once the indexes are built — measured, after a first attempt filled the disk. A
few million is enough to see cursor paging behave.

Measured at 3,000,016 records — 1,800,010 of them tenant `a`'s — through the API, warm:

| | |
|---|---|
| First page, sorted by id — including the count of all 1,800,010 | 97 ms |
| Next page, by cursor | **13 ms** |
| Search "beginnt mit Customer", 225,001 matches | 308 ms |
| Sort by name | 266 ms |
| Dashboard | 911 ms |
| One page of the change queue | 22 ms |

The first two rows are the whole argument for cursor paging: the count is what costs, and it
is asked once per question rather than once per page. The last row is the module's own
database, which holds no records — only the queue and the audit trail — and shows what a
list costs when the data is yours.

The dashboard is the slowest screen, and deliberately one request: it is three aggregates
over every row of the tenant (how many records, how many carry an applied change, how many
categories they span). A screen of small independent requests would not be faster, it would
just fail in pieces.

Why the design is shaped this way at all, when a page here costs milliseconds: a leading
source is not necessarily a row store. The same questions were measured against a columnar
engine over 48 million rows, where a filtered `count(*)` took 8–11 s and the `order by`
behind a first page took 28 s. Cursor paging and counting once per question cost nothing
here and are the difference between usable and not there.

## Re-importing the realm

Realm import only happens when the realm does not exist yet. After editing
`realm-platform.json`, re-import with:

```bash
docker compose up -d --force-recreate keycloak
```

Keycloak keeps no volume here, so recreating just that container drops its database and
imports the realm again. `docker compose down -v` would also do it — and would take the
module's database and the whole seeded Datenbasis with it, which is rarely what you wanted
for a change to a redirect URI.

## Realm design notes

- **Clients** `portal` and `demo` (confidential, Authorization Code Flow with PKCE). Redirect URIs cover both the module ports (9001/9002) and the Vite dev-server ports (5173/5174) so the frontend dev proxy flow works. The modules therefore set `quarkus.oidc.authentication.pkce-required=true`.
- **Audience mapper per client**: Keycloak does not put the client id into `aud` of the access token by default. Each client has an audience mapper — without it, every module's JWT audience validation rejects the token.
- **Tenancy is a realm role**, not a claim of its own: `mandant_a` / `mandant_b`. There are no groups. The modules read roles from the **userinfo** endpoint (`quarkus.oidc.roles.source=userinfo`), so the realm-roles mapper on the `roles` scope must be exposed there — a role revoked in Keycloak then takes effect without waiting for the token to expire.
- **Built-in scopes are declared explicitly** (`basic`, `profile`, `email`, `roles`): a realm import that declares any `clientScopes` suppresses Keycloak's automatic creation of the built-in scopes, so they must be spelled out — otherwise tokens are missing `sub`, profile claims, and `realm_access.roles`.

## Cloud development

[`devfile.yaml`](devfile.yaml) describes the same environment for a cloud workspace
(Eclipse Che, OpenShift Dev Spaces, or any devfile 2.2 runtime): it clones all six
repositories, runs Keycloak, the module database, the Datenbasis and a tools container, and ships commands for
the usual order — install `shared-bff`, install the frontends, then run a module.

All containers of a workspace share one network, so the modules reach the IAM and the
databases under `localhost` on the same ports as locally and the default configuration
applies unchanged.

Two things must be adjusted before first use:

- **Repository URLs** in `projects` point at placeholders.
- **Redirect URIs and the issuer.** In a workspace the modules are served from generated
  HTTPS hostnames, not `localhost:9001`. Add those hostnames to the `portal` and `demo`
  clients in the realm, and set `PLATFORM_IAM_ISSUER` to the workspace's Keycloak URL —
  the browser and the module must agree on the issuer, otherwise the login round-trip
  fails at the authorization endpoint.

## Port map (whole platform)

| App | Served | Management | Vite dev |
|---|---|---|---|
| Portal | http://localhost:9001 | :9101 | http://localhost:5173 |
| Demo | http://localhost:9002 | :9102 | http://localhost:5174 |

The modules live in the 9000 range, clear of the 8080 Keycloak takes and of anything else
that habitually wants 8080–8082. Each one's management interface — health, metrics — is its
app port plus 100, so the pairing is readable rather than remembered.

## Run order (full platform)

1. `docker compose up -d` (this repo)
2. `shared-bff`: `mvn install`
3. `./npm-workspace.sh` (this repo) — installs all frontends at once, see below
4. `portal-app` / `demo-app`: see their READMEs (`mvn quarkus:dev`, or `mvn clean package` and `java -jar target/quarkus-app/quarkus-run.jar`)

## One npm workspace

The modules ask for the shared library by version — `"@platform/shared-ui": "^0.1.0"`, the
entry they will keep once it is published. There is no registry yet, so
[`npm-workspace.sh`](npm-workspace.sh) installs all three frontends as one npm workspace:
npm links the sibling checkout under that name, and an edit in `shared-ui` is visible to
both apps without a build, a publish or a copy.

```bash
./npm-workspace.sh          # once after cloning, and after changing any dependency
```

Doing it as a workspace rather than per app is what keeps **one** copy of React in the
tree. Two copies do not fail as a duplicate dependency — they fail as a hook called outside
its renderer, from the first shared component that uses state.

The definition is [`npm-workspace.json`](npm-workspace.json), here with the rest of the
development environment. Only the entry point cannot live here: node finds a package by
walking up from the file that imports it, and this repo is a sibling of the modules, never
an ancestor. The script therefore links the checkout root's `package.json` to the file here
— so what you review is in a repository, and the thing above it is just a pointer.
`node_modules` and `package-lock.json` land beside that link, outside every repository;
both are derived and the script rebuilds them.

See [docs/architecture.md](docs/architecture.md).
