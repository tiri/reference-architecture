#!/usr/bin/env bash
# Fills the light Datenbasis — the PostgreSQL stand-in that runs by default.
#
#   ./datenbasis/seed.sh              # 16 named records, as the demo starts out
#   ./datenbasis/seed.sh 80000000     # as many as you like
#
# The equivalent for the real engine is datenplattform/seed.sh and seed-large.sh, which
# need the impala profile running. Both put the same records in the same shape; only the
# system underneath differs.
set -euo pipefail
cd "$(dirname "$0")/.."

ROWS="${1:-0}"
psql() { docker compose exec -T demo-db psql -v ON_ERROR_STOP=1 -U datenbasis_reader -d datenbasis "$@"; }

echo "==> Datenbasis: schema"
psql -q -f - < datenbasis/schema.sql

echo "==> Datenbasis: the named records"
psql -q <<'SQL'
truncate record;
insert into record (id, tenant_id, name, category) values
    ('R-1001', 'a', 'Aurora Dashboard',     'Analytics'),
    ('R-1002', 'a', 'Invoice Export',       'Finance'),
    ('R-1003', 'a', 'Customer Sync',        'Integration'),
    ('R-1004', 'a', 'Quarterly Report',     'Reporting'),
    ('R-1005', 'a', 'Notification Digest',  'Communication'),
    ('R-1006', 'a', 'Audit Trail Export',   'Compliance'),
    ('R-1007', 'a', 'Churn Predictor',      'Analytics'),
    ('R-1008', 'a', 'SEPA Payment Run',     'Finance'),
    ('R-1009', 'a', 'Warehouse Feed',       'Integration'),
    ('R-1010', 'a', 'Onboarding Checklist', 'Operations'),
    ('R-2001', 'b', 'Fleet Tracker',        'Logistics'),
    ('R-2002', 'b', 'Route Optimizer',      'Logistics'),
    ('R-2003', 'b', 'Fuel Cost Monitor',    'Finance'),
    ('R-2004', 'b', 'Driver Scorecard',     'Analytics'),
    ('R-2005', 'b', 'Maintenance Planner',  'Operations'),
    ('R-2006', 'b', 'Cargo Manifest Sync',  'Integration');
SQL

if [ "$ROWS" -gt 0 ]; then
    # No digit tables here: Postgres generates the series itself, so the size of the set
    # is one number rather than a query whose shape depends on it.
    WIDTH=${#ROWS}
    echo "==> Datenbasis: $ROWS generated records, ids padded to $WIDTH digits"
    psql -q <<SQL
-- Unlogged while filling: the WAL for eighty million rows is written, flushed and never
-- read again. The table goes back to logged at the end, so what is left behind is an
-- ordinary durable table.
alter table record set unlogged;
insert into record (id, tenant_id, name, category)
select 'R-' || lpad(n::text, $WIDTH, '0'),
       case when n % 10 < 6 then 'a' else 'b' end,
       (array['Aurora Dashboard','Invoice Export','Customer Sync','Quarterly Report',
              'Notification Digest','Audit Trail Export','Churn Predictor',
              'SEPA Payment Run'])[n % 8 + 1] || ' ' || n,
       (array['Analytics','Finance','Integration','Reporting','Communication',
              'Compliance'])[n % 6 + 1]
from generate_series(1, $ROWS) as n
on conflict (id) do nothing;
alter table record set logged;
SQL
fi

echo "==> Datenbasis: indexes"
psql -q -f - < datenbasis/indexes.sql
psql -q -c "analyze record"

psql -c "select tenant_id, count(*) as records from record group by tenant_id order by tenant_id"
