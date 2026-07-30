#!/usr/bin/env bash
# Creates the Datenplattform table and its seed records.
#
# Impala has no equivalent of the Postgres entrypoint that runs SQL on first start, so
# seeding is an explicit step. It is idempotent: the script drops and recreates the table.
#
# impala-shell lives in the same container as the daemons. It is the shell shipped with
# Impala 3.4 and speaks Beeswax by default, so it is pointed at 21000 rather than at the
# 21050 the modules use.
set -euo pipefail

cd "$(dirname "$0")/.."

run() { docker compose exec -T impala impala-shell -i localhost:21000 "$@"; }

echo "waiting for Impala …"
for _ in $(seq 1 90); do
    if run -q "select 1" > /dev/null 2>&1; then
        break
    fi
    sleep 5
done

run -f - < datenplattform/init/01-schema.sql
run -q "select tenant_id, count(*) as records from datenplattform.record
        group by tenant_id order by tenant_id"
