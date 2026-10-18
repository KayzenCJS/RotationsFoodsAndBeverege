-- ============================================================================
--  IMPORTACIÓN INTELIGENTE DE EXCEL / QUINYX
--  Migración idempotente. Se aplica a storyland_foods y storyland_retail.
--
--  Reutiliza las tablas existentes:
--    employees, locations, assignments, location_disables, staffing_rules
--  Solo añade lo que no existía:
--    - columnas de identificadores externos (employees, assignments)
--    - work_hours      : horas trabajadas (NO existía una estructura equivalente)
--    - import_history  : trazabilidad de importaciones
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Identificadores externos en employees (§18)
--    Nullables: no rompen el código existente ni los datos actuales.
-- ---------------------------------------------------------------------------
ALTER TABLE employees ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS badge_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_external_id
    ON employees (external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_badge_number
    ON employees (badge_number) WHERE badge_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_name_lower ON employees (LOWER(name));

-- ---------------------------------------------------------------------------
-- 2. Procedencia en assignments (§18) — source = 'excel' | 'quinyx' | 'manual'
-- ---------------------------------------------------------------------------
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'manual';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_source_external
    ON assignments (source, external_id) WHERE external_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. work_hours — horas realmente trabajadas (§9)
--    assignments = turno PLANIFICADO; work_hours = horas REPORTADAS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_hours (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    work_date       DATE NOT NULL,
    clock_in        TIME,
    clock_out       TIME,
    worked_hours    NUMERIC(5,2),
    regular_hours   NUMERIC(5,2),
    overtime_hours  NUMERIC(5,2),
    break_minutes   INTEGER NOT NULL DEFAULT 0,
    external_id     VARCHAR(100),
    source          VARCHAR(30) NOT NULL DEFAULT 'excel',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Deduplicación fuerte (§10):
--   a) Si hay external_id → la clave fuerte es (source, external_id)
--   b) Si no hay external_id → (employee_id, work_date, clock_in, clock_out)
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_hours_external
    ON work_hours (source, external_id) WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_work_hours_natural
    ON work_hours (employee_id, work_date, COALESCE(clock_in, '00:00'::time), COALESCE(clock_out, '00:00'::time))
    WHERE external_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_hours_date ON work_hours (work_date);
CREATE INDEX IF NOT EXISTS idx_work_hours_employee ON work_hours (employee_id, work_date);

-- ---------------------------------------------------------------------------
-- 4. import_history — trazabilidad (§13)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_history (
    id              SERIAL PRIMARY KEY,
    file_name       VARCHAR(255) NOT NULL,
    source          VARCHAR(30) NOT NULL DEFAULT 'excel',
    detected_type   VARCHAR(30),
    target_type     VARCHAR(20) NOT NULL,
    imported_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imported_by     VARCHAR(120),
    total_records   INTEGER NOT NULL DEFAULT 0,
    imported_count  INTEGER NOT NULL DEFAULT 0,
    updated_count   INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    rejected_count  INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'completed',
    details         JSONB
);

CREATE INDEX IF NOT EXISTS idx_import_history_date ON import_history (imported_at DESC);
-- Dedupe a nivel de BD para filas importadas (source excel/quinyx).
-- Un indice PARCIAL: no afecta a las asignaciones creadas a mano.
CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_import_dedupe
    ON assignments (employee_id, location_id, work_date,
        COALESCE(start_time,'00:00'::time), COALESCE(end_time,'00:00'::time))
    WHERE external_id IS NULL AND source IN ('excel','quinyx');
