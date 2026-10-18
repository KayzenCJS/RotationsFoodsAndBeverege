-- ============================================================================
--  RETIRAR 10 CUALIDADES DEL CATALOGO DE CAPACITACIONES
-- ============================================================================
--  Borra SOLO las filas de employee_trainings de esas 10 cualidades.
--  No toca ninguna otra tabla, ni el resto deExpect nothing.
-- ============================================================================

DELETE FROM employee_trainings WHERE training_name IN (
    'sundae-training',        -- Sundae Preparation
    'prep-tater-kegs',        -- Preparar Tater Kegs
    'prep-toppings',          -- Preparar Toppings
    'maintain-food-warmer',   -- Mantener Food Warmer
    'handle-toppings',        -- Manejar Toppings
    'handle-cones-cups',      -- Manejar Conos y Cups
    'prep-icee',              -- Preparar/Refill ICEE
    'change-flavors',         -- Cambiar Sabores
    'mop-floors',             -- Trapear pisos
    'handle-freezer'          -- Manejar Freezer
);