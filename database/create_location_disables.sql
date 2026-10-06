-- ============================================
-- TABLA location_disables
-- ============================================
-- Ejecuta esto en ambas bases de datos: storyland_foods y storyland_retail

-- LOCATION DISABLES TABLE
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

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_location_disables_location ON location_disables(location_id);
CREATE INDEX IF NOT EXISTS idx_location_disables_date ON location_disables(disable_date);
CREATE INDEX IF NOT EXISTS idx_location_disables_enabled ON location_disables(enabled_at);
