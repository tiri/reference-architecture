# portal-app

The platform portal: an **authenticated application launcher**. One deployment that is BFF and UI delivery at once, exposing `GET /api/apps` — the tile list from configuration (`portal.apps[*]`). The portal has **no database**: module URLs are deployment configuration, not data.

- Port **8081** (Vite dev server: **5173**)
- The whole module is behind login: an unauthenticated visit redirects straight to the IAM.
- Tiles are plain links to each module's own origin — modules stay independent, and the IAM session makes the target module's login invisible.

## Run

Prerequisites: [dev-starter](../dev-starter) running, `shared-bff` installed (`mvn install` in that repo).

```bash
mvn quarkus:dev
```

Open http://localhost:8081 and log in as `alice`/`alice`.

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

## Adding a module

Configuration only — no deployment of the portal's code:

```properties
portal.apps[1].id=reports
portal.apps[1].name=Reports
portal.apps[1].description=Monthly reporting
portal.apps[1].url=https://reports.example.com
portal.apps[1].icon=grid
```
