-- The Datenbasis table, the light stand-in's copy of what Cloudera holds.
--
-- Same columns and same meaning as datenplattform/init/01-schema.sql, so the module
-- cannot tell the two apart. What differs is only what a row store needs and an
-- analytical engine does not: an index, so a filtered page does not read the table.
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
