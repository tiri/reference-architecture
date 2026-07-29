-- Audit trail per module (concept 8.4): who did what, in which tenant, to which record.
-- No tokens and no personal payload data are written here.

create table audit_entry (
    id          bigserial primary key,
    occurred_at timestamptz  not null default now(),
    actor       varchar(255) not null,
    tenant_id   varchar(64)  not null,
    record_type varchar(64)  not null,
    record_id   varchar(64),
    action      varchar(64)  not null,
    detail      text
);

-- Tenant id first in the index, as required for every tenant-scoped table.
create index idx_audit_tenant on audit_entry (tenant_id, occurred_at desc);

alter table audit_entry enable row level security;
alter table audit_entry force row level security;

create policy audit_tenant_isolation on audit_entry
    using (tenant_id = current_setting('app.tenant_id', true))
    with check (tenant_id = current_setting('app.tenant_id', true));

-- Append-only: an audit trail that can be rewritten is not an audit trail.
create rule audit_no_update as on update to audit_entry do instead nothing;
create rule audit_no_delete as on delete to audit_entry do instead nothing;
