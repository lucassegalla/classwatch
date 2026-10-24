CREATE TABLE IF NOT EXISTS subjects (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    descricao VARCHAR(1000) NOT NULL DEFAULT '',
    curso VARCHAR(120) NOT NULL,
    turma VARCHAR(120) NOT NULL,
    periodo_letivo VARCHAR(60) NOT NULL,
    access_code VARCHAR(10) NOT NULL,
    professor_id BIGINT NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_subjects_access_code UNIQUE (access_code),
    CONSTRAINT fk_subjects_professor FOREIGN KEY (professor_id) REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_subjects_professor_created
    ON subjects (professor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subject_enrollments (
    id BIGSERIAL PRIMARY KEY,
    subject_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_subject_enrollments_subject_student UNIQUE (subject_id, student_id),
    CONSTRAINT fk_enrollments_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES app_users(id)
);

CREATE INDEX IF NOT EXISTS idx_subject_enrollments_student
    ON subject_enrollments (student_id, enrolled_at DESC);

-- Nullable on purpose: legacy lectures remain unassigned and retain their existing access rules.
ALTER TABLE IF EXISTS lectures ADD COLUMN IF NOT EXISTS subject_id BIGINT NULL;

DO $$
BEGIN
    IF to_regclass('public.lectures') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lectures_subject') THEN
        ALTER TABLE public.lectures
            ADD CONSTRAINT fk_lectures_subject FOREIGN KEY (subject_id) REFERENCES subjects(id);
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.lectures') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_lectures_subject_created ON public.lectures (subject_id, created_at DESC);
    END IF;
END $$;
