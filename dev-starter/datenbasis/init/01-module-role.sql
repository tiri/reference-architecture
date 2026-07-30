-- The principal the module connects as — not the owner of anything here.
--
-- This server stands in for a system somebody else operates. The bootstrap role
-- `datenbasis` is that operator: it owns the database and creates the table. The module
-- gets its own login with rights on the data and none on the schema, which is the shape a
-- deployment would grant it (there with a policy engine in front, and on hardware this
-- module never touches).
--
-- Why it matters for a sandbox: without it the module would connect as the owner, and
-- nothing would stop this module from creating or dropping a table in the leading source
-- by accident. The architecture says it may only read, and write what an accepted change
-- touches; the credentials should say the same.
create role datenbasis_reader with login password 'datenbasis_reader'
    nosuperuser nocreatedb nocreaterole;

grant connect on database datenbasis to datenbasis_reader;
grant usage on schema public to datenbasis_reader;

-- The table does not exist yet — the seed creates it, as the owner. A default privilege
-- applies to what that role creates from here on, so the grant does not have to be repeated
-- every time the sandbox is reseeded.
alter default privileges for role datenbasis in schema public
    grant select, insert, update, delete on tables to datenbasis_reader;
