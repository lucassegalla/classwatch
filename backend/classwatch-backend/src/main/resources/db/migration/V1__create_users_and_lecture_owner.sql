CREATE TABLE IF NOT EXISTS app_users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_app_users_email UNIQUE (email),
    CONSTRAINT ck_app_users_role CHECK (role IN ('PROFESSOR', 'ESTUDANTE'))
);

-- Existing lectures have no known owner. Leave them NULL instead of assigning
-- them to an arbitrary account; access to legacy rows is restricted in the API.
ALTER TABLE IF EXISTS lectures ADD COLUMN IF NOT EXISTS owner_id BIGINT NULL;

DO $$
BEGIN
    IF to_regclass('public.lectures') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM pg_constraint WHERE conname = 'fk_lectures_owner'
       ) THEN
        ALTER TABLE public.lectures
            ADD CONSTRAINT fk_lectures_owner FOREIGN KEY (owner_id) REFERENCES app_users(id);
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.lectures') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_lectures_owner_created_at ON public.lectures (owner_id, created_at DESC);
    END IF;
END $$;
