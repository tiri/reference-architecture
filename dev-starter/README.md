# dev-starter

Local development environment for the modular portal platform: Keycloak (IAM) and the databases of all modules that need one.

## What's inside

| Service | URL / Port | Credentials |
|---|---|---|
| Keycloak | http://localhost:8080 | admin console: `admin` / `admin` |
| Demo DB (Postgres 17) | localhost:5433, db `demo` | app role `demo_app` / `demo_app`, owner `demo` / `demo` |
| Datenbasis (light stand-in) | database `datenbasis` on localhost:5433 | role `datenbasis_reader` / `datenbasis_reader` |
| Datenbasis (Cloudera stand-in: Impala + Kudu) | only with `--profile impala`: JDBC localhost:21050, shell localhost:21000, web UI http://localhost:25000 | no authentication in the sandbox |

The modules connect as **`demo_app`**, deliberately not as the superuser `demo`: a Postgres superuser bypasses row-level security, which would silently disable the second line of tenant isolation. See [postgres/init/01-app-role.sql](postgres/init/01-app-role.sql).

Realm `platform` is imported automatically from [keycloak/realm-platform.json](keycloak/realm-platform.json).

## Test users

| User | Password | Realm roles |
|---|---|---|
| `alice` | `alice` | `user`, `admin`, `mandant_a`, `mandant_b` |
| `bob` | `bob` | `user`, `mandant_a` |

A `mandant_<id>` role *is* the tenant permission — there is no separate tenant claim.

## Two Datenbasis stand-ins

The Datenbasis is a foreign system, and the module reaches it through an interface rather
than through a driver — so which one is behind it is a property, not a code change.

| | containers | starts in | what it is for |
|---|---|---|---|
| **PostgreSQL** (default) | none of its own | seconds | developing: native on any machine, and a page in milliseconds |
| **Impala + Kudu** | 2, `--profile impala` | ~40 s, emulated on arm64 | measuring: an analytical engine where a page really does cost seconds |

The module picks with `DEMO_DATENBASIS=postgres` (default) or `impala`. Same artefact
either way — what you ran is what you ship.

```bash
docker compose up -d                       # Keycloak + Postgres, two containers
./datenbasis/seed.sh                        # 16 records
./datenbasis/seed.sh 5000000                # or a few million, to feel the paging

docker compose --profile impala up -d      # adds Kudu and Impala
./datenplattform/seed.sh                    # their own seed scripts
DEMO_DATENBASIS=impala java -jar demo-app/target/quarkus-app/quarkus-run.jar
```

**Size costs disk here.** Generating rows is single-threaded and every row is stored, so
on a laptop VM eighty million takes about half an hour and some twenty gigabytes once the
indexes are built — measured, after a first attempt filled the disk. A few million is
enough to see paging behave; the eighty-million case belongs on the Impala profile, which
stores it compressed and columnar.

Everything the module does works the same on both — conditions, sorting, cursor paging,
and writing an accepted change back. What differs is what it costs, and that is the only
reason to keep the heavy one: a design that looks fine at millisecond latency has not been
tested by anything.

## Start

```bash
docker compose up -d
./datenplattform/seed.sh
```

Keycloak takes ~30s on first boot, Impala about 40s — `docker compose up -d` returns
before either is usable, so the seed script waits.

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

**Impala is slow to start**, especially on an arm64 machine: the image is published for
amd64 only and therefore runs emulated. Impala is a query engine and keeps no tables of
its own, so it needs a Hive Metastore for the table definitions plus its own statestore,
catalog and daemon — here all in the single `apache/kudu:impala-latest` image the Kudu
project publishes for its quickstart, which starts them in the right order itself. Kudu
underneath is what makes single rows mutable; on Impala's usual file-backed tables the
module could not write an accepted change back at all.

That image carries **Impala 3.4** against the 4.5 of the separate daemon images. Everything
this platform asks of it is there and verified — `instr`, `strright`, `utc_timestamp`,
`UPSERT` into Kudu, keyset paging. Its `impala-shell` is the 3.4 one and speaks Beeswax on
**21000**; the modules use HiveServer2 on **21050** as before. A deployment runs a current
Cloudera build, and a sandbox that comes up in one step is worth more here than matching
its version.

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
the usual order — install `shared-bff`, install the frontends, then run a module.

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
