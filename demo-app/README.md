# demo-app

Demo module of the platform: tenant-scoped records with a mass operation. One deployment that is BFF, UI delivery and self-verifying API at once, with its own database.

- Port **9002** (Vite dev server: **5174**)
- `GET /api/t/{tenant}/records` — the tenant is in the path, so responses cache per tenant
- `POST /api/t/{tenant}/changes` notes a change as a **draft**, `POST .../changes/submit` hands every draft to the batch, `DELETE .../changes/{id}` takes one back. A change is accepted, never executed in the request
- Reads and writes the **Datenbasis** over a JDBC connection as the module itself — no OIDC in that direction, the user's token stops at this module's API
- **Changes are staged.** Editing a name in the list notes it; the row then shows the requested value beside the one the platform still holds, and stays marked until the batch has applied it. Nothing is handed over until the user reviews and submits
- **One source.** The records are paged, sorted and searched *on the Datenbasis*; the module keeps no copy, so there is no second list and no way for the two to disagree. Its own database holds only what the platform does not know about — the change queue and the audit trail. That is also where row-level security applies; the records' isolation rests on the mandatory tenant predicate and on the platform's own authorization

## Run

Prerequisites: [dev-starter](../dev-starter) running, `shared-bff` installed (`mvn install` in that repo).

```bash
mvn quarkus:dev
```

Open http://localhost:9002 and log in as `alice`/`alice`.

### Mass operation (the scheduled run)

The same artifact, started with the other option — one pass over the open change requests, then exit:

```bash
java -Dquarkus.profile=batch -jar target/quarkus-app/quarkus-run.jar --batch
```

The `batch` profile binds no HTTP or management port, so the run can sit beside the running web instance. When and how often it runs belongs to the runtime environment; this repository carries no schedule.

It works one tenant at a time, binding each tenant first — the run is subject to the same row-level policies as a user request, not exempt from them.

### Full build

The version shown in the header comes from the build — the Maven project version by
default, or whatever a release pipeline stamps in:

```bash
mvn clean package -Dquarkus.application.version=2026.07.27-build42
```

```bash
mvn clean package
java -jar target/quarkus-app/quarkus-run.jar
```

`-Dskip.frontend=true` skips the npm build for backend-only iteration.

## Tenant isolation has two lines

1. Every query names the tenant explicitly — on this module's database *and* on the Datenbasis.
2. **Row-level security** turns a forgotten filter into zero rows instead of a silent leak. It is declared with each table it protects: [`V1__audit.sql`](src/main/resources/db/migration/V1__audit.sql) and [`V2__change_request.sql`](src/main/resources/db/migration/V2__change_request.sql). The tenant is bound **per transaction** by [`TenantBinding`](src/main/java/com/example/demo/tenant/TenantBinding.java) — never per connection, which would leak across pooled requests.

The second line only works because the application connects as an **unprivileged** role: a Postgres superuser bypasses row-level security entirely. See `dev-starter/postgres/init/01-app-role.sql`.

Check it by hand — with no tenant bound, both tables must come back empty:

```bash
docker exec platform-dev-demo-db-1 psql -U demo_app -d demo -tAc "select count(*) from change_request; select count(*) from audit_entry;"
```

It covers what this module owns: the change queue and the audit trail. The records themselves live on the Datenbasis, which has no such policies — there, isolation rests on the mandatory tenant predicate and the platform's own authorization ([8.2](../arch-docs/README.md#8-querschnittliche-konzepte)).
