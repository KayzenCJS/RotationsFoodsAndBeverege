-- Additional tables and columns used by the backend

CREATE TABLE IF NOT EXISTS location_disables (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(50) NOT NULL,
    disable_date DATE NOT NULL,
    disable_reason TEXT,
    disabled_by VARCHAR(100),
    reactivation_date DATE,
    enabled_at TIMESTAMP,
    enable_reason TEXT,
    enabled_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, disable_date)
);

CREATE INDEX IF NOT EXISTS idx_location_disables_location ON location_disables(location_id);
CREATE INDEX IF NOT EXISTS idx_location_disables_date ON location_disables(disable_date);
CREATE INDEX IF NOT EXISTS idx_location_disables_enabled ON location_disables(enabled_at);

CREATE TABLE IF NOT EXISTS employee_breaks (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    work_date DATE NOT NULL,
    location_id VARCHAR(50) NOT NULL,
    break_type VARCHAR(20) NOT NULL CHECK (break_type IN ('self', 'covered')),
    covered_by_employee_id INTEGER,
    break_start_time VARCHAR(5),
    break_end_time VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_breaks_assignment ON employee_breaks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_employee_breaks_employee ON employee_breaks(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_breaks_date ON employee_breaks(work_date);
CREATE INDEX IF NOT EXISTS idx_employee_breaks_location ON employee_breaks(location_id);

CREATE TABLE IF NOT EXISTS supervisor_assignments (
    id SERIAL PRIMARY KEY,
    supervisor_id INTEGER NOT NULL,
    location_id VARCHAR(50) NOT NULL,
    assigned_date DATE NOT NULL,
    role VARCHAR(50) DEFAULT 'supervisor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(supervisor_id, location_id, assigned_date)
);

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor ON supervisor_assignments(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_location ON supervisor_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_date ON supervisor_assignments(assigned_date);

CREATE TABLE IF NOT EXISTS staffing_rules (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(50) NOT NULL UNIQUE,
    min_employees INTEGER DEFAULT 1,
    requirements JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staffing_rules_location ON staffing_rules(location_id);
CREATE INDEX IF NOT EXISTS idx_staffing_rules_active ON staffing_rules(is_active);

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS start_time VARCHAR(5);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS end_time VARCHAR(5);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_versatile BOOLEAN DEFAULT FALSE;
