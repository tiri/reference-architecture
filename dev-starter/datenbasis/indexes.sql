-- Built after the rows are in, never before.
--
-- The tenant is a predicate of every query and the id breaks every sort tie, so each index
-- ends in the id: the keyset walk then reads the index in order instead of sorting the
-- tenant's whole stock to find the next fifty rows.
create index if not exists record_tenant_id on record (tenant_id, id);
create index if not exists record_tenant_name on record (tenant_id, name, id);
create index if not exists record_tenant_category on record (tenant_id, category, id);
