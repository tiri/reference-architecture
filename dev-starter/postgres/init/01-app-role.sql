-- The module must NOT connect as a superuser.
--
-- PostgreSQL superusers bypass row-level security unconditionally, which would silently
-- switch off the second line of tenant isolation (concept 8.2, decision E9) while every
-- test still looks green. The bootstrap user created by the image is a superuser, so the
-- application gets its own unprivileged role that owns the schema — owning it is enough
-- for Flyway to migrate, and `force row level security` then applies to it as well.

create role demo_app with login password 'demo_app' nosuperuser nocreatedb nocreaterole;

alter schema public owner to demo_app;
grant all privileges on database demo to demo_app;
