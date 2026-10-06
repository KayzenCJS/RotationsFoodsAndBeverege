-- ============================================
-- INSERTAR LOCACIONES EN storyland_retail
-- ============================================
-- Ejecuta esto en el Query Tool de storyland_retail

-- The Stockyard
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('stockyard', 'The Stockyard', 'retail', 'General Store', 'fa-store', 'Tienda general con variedad de productos', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('stockyard', 'cashier');

-- Let's Pretend Kids' Costumes
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('lets-pretend', 'Let''s Pretend Kids'' Costumes', 'retail', 'Costumes', 'fa-mask', 'Disfraces y accesorios para niños', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('lets-pretend', 'cashier');

-- Miss Muffet's Market
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('miss-muffets-market', 'Miss Muffet''s Market', 'retail', 'Food & Gifts', 'fa-shopping-basket', 'Alimentos y regalos', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('miss-muffets-market', 'cashier');

-- Yum Yum Junction Candy Shop
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('yum-yum-junction', 'Yum Yum Junction Candy Shop', 'retail', 'Candy', 'fa-candy-cane', 'Tienda de dulces y caramelos', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('yum-yum-junction', 'cashier');

-- Whistle Stop Shop
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('whistle-stop', 'Whistle Stop Shop', 'retail', 'Souvenirs', 'fa-gift', 'Artículos de novedad, souvenirs, snacks y modelo de tren funcional', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('whistle-stop', 'cashier');
