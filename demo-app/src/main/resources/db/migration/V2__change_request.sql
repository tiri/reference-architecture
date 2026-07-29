-- Requested changes, waiting to be applied to Cloudera (decision E7,
-- concept 8.3). This is the queue: no broker is available, and the database is present,
-- transactional and backed up.
--
-- A change is authorised when it is *written* — the user's tenant and roles were checked
-- then. The timed run afterwards is a system process that only replays what is already
-- recorded here.

create table change_request (
    id           bigserial primary key,
    tenant_id    varchar(64)  not null,
    record_id    varchar(32)  not null,
    kind         varchar(32)  not null,
    new_value    varchar(255),
    status       varchar(16)  not null,
    requested_by varchar(255) not null,
    requested_at timestamptz  not null default now(),
    applied_at   timestamptz,
    last_error   text
);

-- Only open requests are ever searched, so the index stays small as the table grows.
create index idx_change_open on change_request (requested_at) where status = 'OPEN';
create index idx_change_tenant on change_request (tenant_id, requested_at desc);

alter table change_request enable row level security;
alter table change_request force row level security;

create policy change_tenant_isolation on change_request
    using (tenant_id = current_setting('app.tenant_id', true))
    with check (tenant_id = current_setting('app.tenant_id', true));
