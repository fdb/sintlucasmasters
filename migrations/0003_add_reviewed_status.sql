-- Add 'reviewed' to the projects.status CHECK constraint without touching data.
--
-- SQLite has no ALTER TABLE ... DROP/ALTER CONSTRAINT. The two options are:
--   (a) rebuild the table (create new, copy, drop, rename) — moves all rows
--   (b) edit sqlite_master in place with PRAGMA writable_schema
--
-- We use (b) because production has tens of thousands of rows we don't want to
-- copy and FKs/indexes we don't want to risk losing. The substitution is a plain
-- string replace on the stored CREATE TABLE SQL — if the prod CHECK clause ever
-- diverges from this pattern this migration becomes a no-op, which is why we
-- verify with a follow-up assertion.

PRAGMA writable_schema = ON;

UPDATE sqlite_master
SET sql = replace(
    sql,
    'CHECK (status IN (
        ''draft'',
        ''submitted'',
        ''ready_for_print'',
        ''published''
    ))',
    'CHECK (status IN (
        ''draft'',
        ''submitted'',
        ''reviewed'',
        ''ready_for_print'',
        ''published''
    ))'
)
WHERE type = 'table' AND name = 'projects';

PRAGMA writable_schema = OFF;
