#!/usr/bin/env bash
# Fills the Datenplattform with a large data set — for trying the module at a size where
# the design decisions actually show: the records live on the platform and nowhere else,
# so every page the user turns is a query against it.
#
#   ./seed-large.sh            # 100_000 records
#   ./seed-large.sh 80000000   # as many as you like, up to 100_000_000
#
# The module's own database is deliberately not filled here. It holds no records — only
# the change queue and the audit trail, both of which grow from use rather than seeding.
#
# Idempotent, and additive to the base seed: it removes what it generated before
# (ids R-0…) and leaves the named records from 01-schema.sql alone.
set -euo pipefail

ROWS="${1:-100000}"
if [ "$ROWS" -gt 100000000 ]; then
    echo "at most 100000000 — beyond that the generator would need a ninth digit" >&2
    exit 1
fi

cd "$(dirname "$0")"

# Impala has no generate_series, so numbers come from cross-joined digit tables: one per
# decimal place. Only as many as the requested size needs — each extra place multiplies
# the rows the query must produce by ten before the filter throws them away again.
PLACES=${#ROWS}
DIGITS=$(for i in $(seq 1 "$PLACES"); do printf 'datenplattform.digit d%s, ' "$i"; done | sed 's/, $//')
SUM=$(for i in $(seq 1 "$PLACES"); do
    printf 'd%s.d * %s + ' "$i" "$(awk -v e=$((PLACES - i)) 'BEGIN{printf "%d", 10 ^ e}')"
done | sed 's/ + $//')
# Ids are padded to the width the largest number needs, so they still sort as text.
WIDTH=$PLACES

#   id  R-00000001 …   tenant  60/40 across a and b   name/category  cycled from a pool
echo "==> Datenbasis: $ROWS records, ids padded to $WIDTH digits"
# The digit table is Kudu because its rows must be deletable and updatable, like the
# records themselves.
docker compose exec -T impala impala-shell -i localhost:21000 <<SQL
create table if not exists datenplattform.digit (d int primary key)
  partition by hash (d) partitions 2 stored as kudu;
-- UPSERT, not INSERT OVERWRITE: Kudu tables do not support the latter, and it fails
-- with "not supported" rather than with an empty result you would notice.
upsert into datenplattform.digit values (0),(1),(2),(3),(4),(5),(6),(7),(8),(9);

delete from datenplattform.record where id like 'R-0%';

insert into datenplattform.record (id, tenant_id, name, category)
select concat('R-', lpad(cast(n as string), $WIDTH, '0')),
       case when n % 10 < 6 then 'a' else 'b' end,
       concat(case n % 8 when 0 then 'Aurora Dashboard'
                         when 1 then 'Invoice Export'
                         when 2 then 'Customer Sync'
                         when 3 then 'Quarterly Report'
                         when 4 then 'Notification Digest'
                         when 5 then 'Audit Trail Export'
                         when 6 then 'Churn Predictor'
                         else 'SEPA Payment Run' end,
              ' ', cast(n as string)),
       case n % 6 when 0 then 'Analytics'
                  when 1 then 'Finance'
                  when 2 then 'Integration'
                  when 3 then 'Reporting'
                  when 4 then 'Communication'
                  else 'Compliance' end
from (select $SUM as n from $DIGITS) t
where n between 1 and $ROWS;

compute stats datenplattform.record;
select tenant_id, count(*) as records from datenplattform.record
group by tenant_id order by tenant_id;
SQL

