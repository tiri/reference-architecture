#!/usr/bin/env bash
# Creates the Datenplattform table and its seed records.
#
# Impala has no equivalent of the Postgres entrypoint that runs SQL on first start, so
# seeding is an explicit step. It is idempotent: the script drops and recreates the table.
#
# The daemon images carry no client, so impala-shell comes from its own image — started
# for this one command and removed again.
set -euo pipefail

cd "$(dirname "$0")/.."

run() { docker compose run --rm -T impala-client "$@"; }

echo "waiting for Impala on 21050 …"
for _ in $(seq 1 90); do
    if run -q "select 1" > /dev/null 2>&1; then
        break
    fi
    sleep 5
done

run -f /datenplattform/init/01-schema.sql
run -q "select tenant_id, count(*) as records from datenplattform.record
        group by tenant_id order by tenant_id"
