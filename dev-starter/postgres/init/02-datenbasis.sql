-- The Datenbasis, as the light stand-in for Cloudera.
--
-- Its own database and its own role on the same server. A foreign system in the sense
-- that matters here: the module reaches it over a separate connection with separate
-- credentials, and cannot join it to its own tables — the two are different databases, and
-- PostgreSQL does not join across them. What is deliberately not modelled is the operator
-- boundary; a deployment has Cloudera on its own hardware with Ranger deciding what the
-- module may read and write.
create role datenbasis_reader with login password 'datenbasis_reader'
    nosuperuser nocreatedb nocreaterole;

create database datenbasis owner datenbasis_reader;

-- The module's own role has no business here, and is not granted any.
revoke all on database datenbasis from demo_app;
