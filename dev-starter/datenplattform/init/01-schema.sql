-- Stand-in for the Datenplattform: the leading source of the raw records, reached over
-- JDBC. It is a foreign system — the module owns none of this.
--
-- The table is STORED AS KUDU. On its usual file-backed tables Impala can only append,
-- and the module has to write an accepted change back. Kudu is what
-- makes single rows mutable, so it is not an optimisation here but the reason the
-- module's contract with the platform works at all.
--
-- Loaded by `./datenplattform/seed.sh`, or by hand:
--   docker compose exec -T impalad impala-shell -f - < datenplattform/init/01-schema.sql

create database if not exists datenplattform;

drop table if exists datenplattform.record;

create table datenplattform.record (
    id          string,
    tenant_id   string not null,
    name        string not null,
    category    string not null,
    changed_at  timestamp,
    primary key (id)
)
partition by hash (id) partitions 2
stored as kudu;

-- The seed: the same records the module lists, so the demo has something to work on.
insert into datenplattform.record (id, tenant_id, name, category) values
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

-- What the module may do is decided on the platform side, not here: in the target
-- environment by Ranger policies on this table for the module's own principal — read the
-- records, write only the columns an accepted change touches. The local
-- Impala runs without authorization, so there is nothing to grant. The restriction is
-- real in production and simply absent in the sandbox.
