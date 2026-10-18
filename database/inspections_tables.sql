-- Inspections & Compliance tables

CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    inspection_number VARCHAR(100) UNIQUE NOT NULL,
    inspection_date DATE NOT NULL,
    inspection_time TIME,
    inspector_id INTEGER,
    inspection_type VARCHAR(100),
    general_notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspection_findings (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES inspections(id) ON DELETE CASCADE,
    location_id VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    priority VARCHAR(50),
    status VARCHAR(50) DEFAULT 'warning',
    inspector_notes TEXT,
    recommended_action TEXT,
    assigned_to INTEGER,
    due_date DATE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS corrections (
    id SERIAL PRIMARY KEY,
    finding_id INTEGER REFERENCES inspection_findings(id) ON DELETE CASCADE,
    description TEXT,
    assigned_to INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    correction_date DATE,
    completed_by INTEGER,
    completion_notes TEXT,
    supervised_by INTEGER,
    supervised_at TIMESTAMP,
    audit_by INTEGER,
    audited_at TIMESTAMP,
    audit_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspection_evidence (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES inspections(id) ON DELETE CASCADE,
    finding_id INTEGER REFERENCES inspection_findings(id) ON DELETE CASCADE,
    correction_id INTEGER REFERENCES corrections(id) ON DELETE CASCADE,
    file_url TEXT,
    file_type VARCHAR(50),
    description TEXT,
    uploaded_by INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inspection_status_history (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES inspections(id) ON DELETE CASCADE,
    finding_id INTEGER REFERENCES inspection_findings(id) ON DELETE CASCADE,
    correction_id INTEGER REFERENCES corrections(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment TEXT
);
