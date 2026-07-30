-- The Datenbasis table: what the leading source holds, in the shape the module reads it.
--
-- Kept to what the module actually asks for, so a deployment can see at a glance what it
-- needs from the real thing. The one addition a row store needs is an index, so a filtered
-- page does not read the whole table — see indexes.sql.
create table if not exists record (
    id          text primary key,
    tenant_id   text not null,
    name        text not null,
    category    text not null,
    changed_at  timestamptz
);

-- The indexes are deliberately not here. A bulk load maintains every index it is given
-- for every row, which at eighty million costs far more than building them once at the
-- end — so the seed creates them after it has loaded, from indexes.sql.
