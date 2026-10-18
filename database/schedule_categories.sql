-- ============================================================================
--  EXTENSIÓN DEL HORARIO: OPS · EXTRA HOURS · SUPPORT · EXTRA TASKS · NOTAS
-- ============================================================================
--  Todo lo que sigue es ADITIVO. No se elimina, renombra ni reescribe ninguna
--  tabla, columna ni registro existente.
--
--  Decisión de diseño: las nuevas secciones NO crean un segundo sistema de
--  asignaciones. Viven en la tabla `assignments` que ya usa el horario, que es
--  donde ya funcionan las reglas de conflicto, las location_disables, los
--  backups y el importador de Excel/Quinyx.
--
--    assignments.assignment_type = LOCATION      -> location_id manda (hoy)
--                                 OPS           -> category = grupo OPS
--                                 EXTRA_HOURS   -> category = actividad
--                                 SUPPORT       -> category = tipo de soporte
--                                 EXTRA_TASK    -> category = tarea (+ task_id)
--
--  `category` es el concepto "lugar" que usan las reglas de conflicto, para
--  que un empleado no pueda estar a la vez en Front OPS y en Food Fair.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1) Extender `assignments`. Todas las columnas son opcionales y las
--     existentes no se tocan. El DEFAULT hace que las 152 filas actuales
--     queden clasificadas como LOCATION sin escribir nada.
-- ---------------------------------------------------------------------------
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assignment_type varchar(20)
  NOT NULL DEFAULT 'LOCATION';

-- "Lugar" de la asignación. Para LOCATION coincide con location_id; para el
-- resto es la clave de la sección (front_ops, pavilion-support, ...).
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS category varchar(50);

-- Rol/puesto dentro de esa sección (Server, Cook, Hostess, AM Help...).
-- Antes solo se conservaba el rol del empleado, que no distingue, por ejemplo,
--  un Cook de un Server dentro del mismo turno.
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS role varchar(50);

-- Notas opcionales de la asignación.
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS notes text;

-- Enlace opcional con el módulo de Tareas ya existente (§13).
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS task_id integer
  REFERENCES tasks(id) ON DELETE SET NULL;

-- Rellena `category` en las filas que ya existían para que el concepto
-- "lugar" sea uniforme. No modifica ningún otro campo.
UPDATE assignments
   SET category = location_id
 WHERE category IS NULL
   AND location_id IS NOT NULL
   AND assignment_type = 'LOCATION';

COMMENT ON COLUMN assignments.assignment_type IS
  'LOCATION | OPS | EXTRA_HOURS | SUPPORT | EXTRA_TASK';
COMMENT ON COLUMN assignments.category IS
  'Clave de la sección del horario. Para LOCATION es el mismo location_id.';

-- ---------------------------------------------------------------------------
--  2) Clasificación OPS del empleado (§1)
--     NULL = el empleado no es OPS/Supervisor.
-- ---------------------------------------------------------------------------
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ops_group varchar(30);

COMMENT ON COLUMN employees.ops_group IS
  'front_ops | ff-pav_ops | back_ops | oasis-dutch_ops. NULL si no es OPS.';

-- ---------------------------------------------------------------------------
--  3) Catálogo de secciones del horario.
--     Tabla de datos (no código): añadir una actividad nueva el futuro es
--     insertar una fila, no tocar el frontend.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_categories (
  key         varchar(50) PRIMARY KEY,
  section     varchar(20) NOT NULL,
  name_es     varchar(100) NOT NULL,
  name_en     varchar(100) NOT NULL,
  icon        varchar(20),
  sort_order  integer NOT NULL DEFAULT 100,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT schedule_categories_section_chk
    CHECK (section IN ('OPS','EXTRA_HOURS','SUPPORT','EXTRA_TASK'))
);

-- Registro de reutilización del módulo de Tareas: desde la categoría se puede
--  crear la tarea y viceversa, sin duplicar datos (§13).
ALTER TABLE schedule_categories ADD COLUMN IF NOT EXISTS task_id integer
  REFERENCES tasks(id) ON DELETE SET NULL;

COMMENT ON TABLE schedule_categories IS
  'Secciones no-geográficas del horario (OPS, Extra Hours, Support, Extra Tasks).';

-- ---------------------------------------------------------------------------
--  4) Notas del día (§14)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_notes (
  id          serial PRIMARY KEY,
  work_date   date NOT NULL,
  note        text NOT NULL,
  created_by  varchar(100),
  created_at  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Una nota puede repetirse; lo único único es que no haya dos notas con el
--  mismo id (garantía de la PK). Se indexa por fecha para cargar rápido el
--  día que se está viendo.
CREATE INDEX IF NOT EXISTS schedule_notes_work_date_idx
  ON schedule_notes (work_date);

COMMENT ON TABLE schedule_notes IS
  'Notas libres asociadas a una fecha del horario.';

-- ---------------------------------------------------------------------------
--  5) Living Shores como location válida (§5)
--     Solo se añade. No se toca ninguna location existente.
--
--     Living Shores pertenece al parque de Comida, así que solo se inserta en
--     las bases que ya tienen locations de tipo 'food-beverage'. En la base de
--     Retail el CHECK de `locations.type` solo admite 'retail': insertarla allí
--     no sería un dato válido, y un fallo de CHECK abortaría toda la
--     migración. Por eso va dentro de un bloque con control de excepciones.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM locations WHERE type = 'food-beverage') THEN
        INSERT INTO locations (id, name, type, category)
        VALUES ('living-shores', 'Living Shores', 'food-beverage', 'Snacks')
        ON CONFLICT (id) DO NOTHING;
    END IF;
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Living Shores no insertada: el CHECK de locations.type no admite food-beverage en esta base.';
END $$;

-- ---------------------------------------------------------------------------
--  6) Semilla del catálogo. Los nombres son iguales en ES y EN porque así
--     aparecen en el horario real de Story Land (§23).
-- ---------------------------------------------------------------------------
INSERT INTO schedule_categories (key, section, name_es, name_en, icon, sort_order) VALUES
  ('front_ops',         'OPS',         'Front OPS',        'Front OPS',        'fa-users',      10),
  ('ff-pav_ops',        'OPS',         'FF/PAV OPS',       'FF/PAV OPS',       'fa-users',      20),
  ('back_ops',          'OPS',         'Back OPS',         'Back OPS',         'fa-users',      30),
  ('oasis-dutch_ops',   'OPS',         'Oasis/Dutch OPS',  'Oasis/Dutch OPS',  'fa-users',      40),
  ('character-breakfast','EXTRA_HOURS','Character Breakfast','Character Breakfast','fa-coffee', 50),
  ('student-dining',    'EXTRA_HOURS', 'Student Dining',   'Student Dining',   'fa-graduation-cap', 60),
  ('beer-tent',         'EXTRA_HOURS', 'Beer Tent',        'Beer Tent',        'fa-beer-mug-empty', 70),
  ('pavilion-support',  'SUPPORT',     'Pavilion Support', 'Pavilion Support', 'fa-broom',      80),
  ('pixie-support',     'SUPPORT',     'Pixie Support',    'Pixie Support',    'fa-broom',      90),
  ('oasis-support',     'SUPPORT',     'Oasis Support',    'Oasis Support',    'fa-broom',      100),
  ('ipr-opener',        'EXTRA_TASK',  'IPR Opener',       'IPR Opener',       'fa-clipboard-check', 110),
  ('id-scanning',       'EXTRA_TASK',  'ID Scanning',      'ID Scanning',      'fa-id-card',    120),
  ('cleaning',          'EXTRA_TASK',  'Cleaning',         'Cleaning',         'fa-sparkles',   130),
  ('equipment-check',   'EXTRA_TASK',  'Equipment Check',  'Equipment Check',  'fa-wrench',     140),
  ('closing-task',      'EXTRA_TASK',  'Closing Task',     'Closing Task',     'fa-lock',       150),
  ('setup',             'EXTRA_TASK',  'Setup',            'Setup',            'fa-tools',      160)
ON CONFLICT (key) DO UPDATE
  SET section    = EXCLUDED.section,
      name_es    = EXCLUDED.name_es,
      name_en    = EXCLUDED.name_en,
      icon       = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
--  7) Índices de apoyo
-- ---------------------------------------------------------------------------

-- Carga del horario de un día por sección.
CREATE INDEX IF NOT EXISTS assignments_work_date_idx
  ON assignments (work_date);

-- Evita duplicar una asignación de importación cuando la sección no es una
--  location (category no nulo, location_id nulo). Coincide con la lógica de
--  deduplicación que ya usa el importador.
CREATE UNIQUE INDEX IF NOT EXISTS assignments_category_dedupe_idx
  ON assignments (employee_id, category, work_date,
                  COALESCE(start_time, '00:00:00'::time),
                  COALESCE(end_time,   '00:00:00'::time))
  WHERE external_id IS NULL
    AND category IS NOT NULL
    AND location_id IS NULL
    AND assignment_type <> 'LOCATION'
    AND source IN ('excel','quinyx');

-- Búsqueda de notas por día.
-- (ya cubierto por schedule_notes_work_date_idx)

-- ---------------------------------------------------------------------------
--  RESUMEN DE LA MIGRACIÓN: no se ha DROP ni DELETE de nada.
--  Las filas existentes de `assignments` conservan location_id, employee_id,
--  work_date, start_time, end_time, source y external_id intactos.
-- ---------------------------------------------------------------------------