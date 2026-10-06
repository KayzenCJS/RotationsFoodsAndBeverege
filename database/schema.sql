-- ============================================
-- DATABASE: storyland_foods
-- ============================================

CREATE DATABASE IF NOT EXISTS storyland_foods;
\c storyland_foods;

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    nationality VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 65),
    role VARCHAR(20) NOT NULL CHECK (role IN ('server', 'cashier', 'dishwasher', 'cook', 'bartender')),
    group_id CHAR(1) CHECK (group_id IN ('A', 'B', 'C')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EMPLOYEE TRAININGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employee_trainings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    training_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, training_name)
);

-- ============================================
-- EMPLOYEE AVAILABILITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employee_availability (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
    is_on_break BOOLEAN DEFAULT FALSE,
    is_on_training BOOLEAN DEFAULT FALSE,
    is_day_off BOOLEAN DEFAULT FALSE,
    is_holiday BOOLEAN DEFAULT FALSE,
    schedule_start_time VARCHAR(5) DEFAULT '09:00',
    schedule_end_time VARCHAR(5) DEFAULT '18:00',
    days_off TEXT[] DEFAULT ARRAY['sunday'],
    holidays TEXT[] DEFAULT ARRAY[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOCATIONS TABLE (Food & Beverage)
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('food-beverage')),
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    serves_alcohol BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOCATION REQUIRED ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS location_required_roles (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(50) REFERENCES locations(id) ON DELETE CASCADE,
    role_name VARCHAR(20) NOT NULL CHECK (role_name IN ('server', 'cashier', 'dishwasher', 'cook', 'bartender')),
    UNIQUE(location_id, role_name)
);

-- ============================================
-- ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(50) REFERENCES locations(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, employee_id, work_date)
);

-- ============================================
-- TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50) CHECK (category IN ('maintenance', 'cleaning', 'training', 'customer-service', 'other')),
    due_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'in-progress', 'completed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BUILDING-SPECIFIC TABLES (Food & Beverage)
-- ============================================

-- Pixie Kitchen
CREATE TABLE IF NOT EXISTS pixie_kitchen_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Barnyard Pizza
CREATE TABLE IF NOT EXISTS barnyard_pizza_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Guard House Snacks
CREATE TABLE IF NOT EXISTS guard_house_snacks_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Food Fair
CREATE TABLE IF NOT EXISTS food_fair_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dutch Village Ice Cream Shop
CREATE TABLE IF NOT EXISTS dutch_village_ice_cream_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Slush Factory
CREATE TABLE IF NOT EXISTS slush_factory_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dippin' Dots
CREATE TABLE IF NOT EXISTS dippin_dots_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sandwich Oasis
CREATE TABLE IF NOT EXISTS sandwich_oasis_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- The Farm Stand
CREATE TABLE IF NOT EXISTS farm_stand_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- World Pavilion
CREATE TABLE IF NOT EXISTS world_pavilion_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teddy's at Oasis
CREATE TABLE IF NOT EXISTS teddys_oasis_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Poblano Cantina
CREATE TABLE IF NOT EXISTS poblano_cantina_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DATABASE: storyland_retail
-- ============================================

CREATE DATABASE IF NOT EXISTS storyland_retail;
\c storyland_retail;

-- ============================================
-- EMPLOYEES TABLE (Retail)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    nationality VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 65),
    role VARCHAR(20) NOT NULL CHECK (role IN ('server', 'cashier', 'dishwasher', 'cook', 'bartender')),
    group_id CHAR(1) CHECK (group_id IN ('A', 'B', 'C')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EMPLOYEE TRAININGS TABLE (Retail)
-- ============================================
CREATE TABLE IF NOT EXISTS employee_trainings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    training_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, training_name)
);

-- ============================================
-- EMPLOYEE AVAILABILITY TABLE (Retail)
-- ============================================
CREATE TABLE IF NOT EXISTS employee_availability (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
    is_on_break BOOLEAN DEFAULT FALSE,
    is_on_training BOOLEAN DEFAULT FALSE,
    is_day_off BOOLEAN DEFAULT FALSE,
    is_holiday BOOLEAN DEFAULT FALSE,
    schedule_start_time VARCHAR(5) DEFAULT '09:00',
    schedule_end_time VARCHAR(5) DEFAULT '18:00',
    days_off TEXT[] DEFAULT ARRAY['sunday'],
    holidays TEXT[] DEFAULT ARRAY[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOCATIONS TABLE (Retail)
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('retail')),
    category VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    description TEXT,
    serves_alcohol BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOCATION REQUIRED ROLES TABLE (Retail)
-- ============================================
CREATE TABLE IF NOT EXISTS location_required_roles (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(50) REFERENCES locations(id) ON DELETE CASCADE,
    role_name VARCHAR(20) NOT NULL CHECK (role_name IN ('server', 'cashier', 'dishwasher', 'cook', 'bartender')),
    UNIQUE(location_id, role_name)
);

-- ============================================
-- ASSIGNMENTS TABLE (Retail)
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    location_id VARCHAR(50) REFERENCES locations(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    work_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, employee_id, work_date)
);

-- ============================================
-- TASKS TABLE (Retail)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(50) CHECK (category IN ('maintenance', 'cleaning', 'training', 'customer-service', 'other')),
    due_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'in-progress', 'completed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BUILDING-SPECIFIC TABLES (Retail)
-- ============================================

-- The Stockyard
CREATE TABLE IF NOT EXISTS stockyard_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Let's Pretend Kids' Costumes
CREATE TABLE IF NOT EXISTS lets_pretend_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Miss Muffet's Market
CREATE TABLE IF NOT EXISTS miss_muffets_market_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Yum Yum Junction Candy Shop
CREATE TABLE IF NOT EXISTS yum_yum_junction_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Whistle Stop Shop
CREATE TABLE IF NOT EXISTS whistle_stop_assignments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    work_date DATE,
    shift_start VARCHAR(5),
    shift_end VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Foods Database Indexes
\c storyland_foods;
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_group ON employees(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_location ON assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_date ON assignments(work_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Retail Database Indexes
\c storyland_retail;
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_group ON employees(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_location ON assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_date ON assignments(work_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
