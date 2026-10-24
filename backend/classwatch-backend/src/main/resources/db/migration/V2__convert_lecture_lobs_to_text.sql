-- @Lob String was mapped to PostgreSQL OID large objects by Hibernate.
-- Convert only columns that are actually OID; already-text columns stay untouched.
-- Do not unlink old large objects here: they may be referenced elsewhere, and
-- retaining an unreferenced object is safer than deleting data during migration.
DO $$
DECLARE
    target_column TEXT;
BEGIN
    IF to_regclass('public.lectures') IS NULL THEN
        RETURN;
    END IF;

    FOREACH target_column IN ARRAY ARRAY['transcricao', 'resumo']
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
              AND c.table_name = 'lectures'
              AND c.column_name = target_column
              AND c.udt_name = 'oid'
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.lectures ALTER COLUMN %I TYPE TEXT USING CASE WHEN %I IS NULL THEN NULL ELSE convert_from(lo_get(%I), current_setting(''server_encoding'')) END',
                target_column, target_column, target_column
            );
        END IF;
    END LOOP;
END $$;
