-- `kind` is an enum in the module now, persisted by name. Rows written before that hold
-- the lowercase spelling the wire used, which no longer maps to a constant — a request the
-- batch would read as a kind it does not know.
--
-- Uppercased rather than dropped: the queue is the record of what users asked for, and one
-- of those rows may still be waiting to be applied.
--
-- The policy has to be lifted for it. Migrations run as the application role, the same one
-- the module uses, and the table has FORCE ROW LEVEL SECURITY — which applies to the owner
-- too. Outside a request there is no `app.tenant_id`, so the policy matches no row: a plain
-- UPDATE here reports success, changes nothing, and Flyway records the migration as done.
-- That silent version of this file is what this comment exists to prevent. Setting a tenant
-- instead would not help — one id cannot cover every tenant's rows.
alter table change_request disable row level security;

update change_request set kind = upper(kind);

-- Both flags again, spelled out rather than assumed: tenant isolation is the second line of
-- defence, and a migration that left it off would be silent about that too.
alter table change_request enable row level security;
alter table change_request force row level security;
