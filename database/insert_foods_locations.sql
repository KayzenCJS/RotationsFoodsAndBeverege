-- ============================================
-- INSERTAR LOCACIONES EN storyland_foods
-- ============================================
-- Ejecuta esto en el Query Tool de storyland_foods

-- Pixie Kitchen
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('pixie-kitchen', 'Pixie Kitchen', 'food-beverage', 'Main Kitchen', 'fa-utensils', 'Cocina principal con hamburguesas, tenders y snacks', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('pixie-kitchen', 'cook'),
('pixie-kitchen', 'cashier'),
('pixie-kitchen', 'dishwasher');

-- Barnyard Pizza
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('barnyard-pizza', 'Barnyard Pizza', 'food-beverage', 'Pizza', 'fa-pizza-slice', 'Pizzas y comida italiana', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('barnyard-pizza', 'cook'),
('barnyard-pizza', 'cashier');

-- Guard House Snacks
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('guard-house-snacks', 'Guard House Snacks', 'food-beverage', 'Snacks', 'fa-cookie', 'Snacks y aperitivos', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('guard-house-snacks', 'cashier');

-- Food Fair
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('food-fair', 'Food Fair', 'food-beverage', 'Variety', 'fa-utensils', 'Variedad de alimentos y bebidas', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('food-fair', 'server'),
('food-fair', 'cashier');

-- Dutch Village Ice Cream Shop
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('dutch-village-ice-cream', 'Dutch Village Ice Cream Shop', 'food-beverage', 'Ice Cream', 'fa-ice-cream', 'Helados y postres', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('dutch-village-ice-cream', 'server'),
('dutch-village-ice-cream', 'cashier');

-- Slush Factory
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('slush-factory', 'Slush Factory', 'food-beverage', 'Beverages', 'fa-glass-water', 'Bebidas frías y slush', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('slush-factory', 'server'),
('slush-factory', 'cashier');

-- Dippin' Dots
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('dippin-dots', 'Dippin'' Dots', 'food-beverage', 'Ice Cream', 'fa-snowflake', 'Helados de perlas', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('dippin-dots', 'server'),
('dippin-dots', 'cashier');

-- Sandwich Oasis
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('sandwich-oasis', 'Sandwich Oasis', 'food-beverage', 'Sandwiches', 'fa-bread-slice', 'Sándwiches y comida rápida', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('sandwich-oasis', 'cook'),
('sandwich-oasis', 'cashier');

-- The Farm Stand
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('farm-stand', 'The Farm Stand', 'food-beverage', 'Fresh Food', 'fa-carrot', 'Comida fresca y saludable', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('farm-stand', 'server'),
('farm-stand', 'cashier');

-- World Pavilion
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('world-pavilion', 'World Pavilion', 'food-beverage', 'International', 'fa-globe', 'Comida internacional', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('world-pavilion', 'cook'),
('world-pavilion', 'server'),
('world-pavilion', 'cashier');

-- Teddy's at Oasis
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('teddys-oasis', 'Teddy''s at Oasis', 'food-beverage', 'American', 'fa-burger', 'Comida americana clásica', false);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('teddys-oasis', 'cook'),
('teddys-oasis', 'server'),
('teddys-oasis', 'cashier');

-- Poblano Cantina
INSERT INTO locations (id, name, type, category, icon, description, serves_alcohol) VALUES
('poblano-cantina', 'Poblano Cantina', 'food-beverage', 'Mexican', 'fa-pepper-hot', 'Comida mexicana y alcohol', true);

INSERT INTO location_required_roles (location_id, role_name) VALUES
('poblano-cantina', 'cook'),
('poblano-cantina', 'server'),
('poblano-cantina', 'bartender'),
('poblano-cantina', 'cashier');
