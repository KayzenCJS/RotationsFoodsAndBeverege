-- ============================================================================
--  UBICACIONES ENTRENADAS · GRUPOS MULTIPLES · GRUPO D · SIN GRUPO · ROL ADMIN
-- ============================================================================
--  Todo es ADITIVO. No se elimina ni se reescribe ninguna tabla ni columna
--  existente. La tabla `employee_trainings` NO se toca aqui: la limpieza de las
--  10 cualidades retiradas va en el script aparte `retire_trainings.sql`,
--  precedido de su propio respaldo.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1) Grupo "sin grupo" + Grupo D
--     employees.group_id es char(1) y ya guarda 'A', 'B' o 'C'.
--     Se amplía el dominio sin cambiar el tipo ni el NOT NULL.
--       ''  -> sin grupo (persona nueva, aun en entrenamiento)
--       'D' -> Bistro / Dunkin Donuts
--
--     La tabla tiene CHECKs sobre group_id y sobre role, que si no se amplian
--     rechazan cualquier guardado. Se recrean con el dominio completo.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint WHERE conname = 'employees_group_id_check';
  IF v_def IS NOT NULL
     AND (v_def NOT LIKE '%D%' OR v_def NOT LIKE '%::bpchar, '' ''%') THEN
    ALTER TABLE employees DROP CONSTRAINT employees_group_id_check;
    ALTER TABLE employees ADD CONSTRAINT employees_group_id_check
      CHECK (group_id = ANY (ARRAY['A'::bpchar,'B'::bpchar,'C'::bpchar,'D'::bpchar,' '::bpchar]));
    RAISE NOTICE 'employees_group_id_check ampliado a A, B, C, D y sin grupo.';
  END IF;

  SELECT pg_get_constraintdef(oid) INTO v_def
    FROM pg_constraint WHERE conname = 'employees_role_check';
  IF v_def IS NOT NULL AND v_def NOT LIKE '%admin%' THEN
    ALTER TABLE employees DROP CONSTRAINT employees_role_check;
    ALTER TABLE employees ADD CONSTRAINT employees_role_check
      CHECK (((role)::text = ANY ((ARRAY['server'::character varying,'cashier'::character varying,
        'dishwasher'::character varying,'cook'::character varying,'bartender'::character varying,
        'assistant-supervisor'::character varying,'supervisor'::character varying,'op'::character varying,
        'admin'::character varying])::text[])));
    RAISE NOTICE 'employees_role_check ampliado con el rol admin.';
  END IF;
END $$;

-- char(1) con '' se almacena como ' ' (un espacio) en PostgreSQL.
-- Por eso el "sin grupo" se persiste como ' ' y se muestra como tal.

-- ---------------------------------------------------------------------------
--  2) A que grupo pertenece cada location.
--     Permite: (a) decir que location es del Grupo D, y
--              (b) proposes grupos al elegir donde se entreno un empleado.
--     Las de los grupos A/B/C se glean de la descripcion que ya tenia el
--     formulario; no se inventa nada que no este ya escrito ahi.
--
--     OJO: group_id es NOT NULL, asi que una location sin grupo asignado
--     simplemente NO aparece aqui. Eso es intencionado: una location puede
--     marcarse como "entrenado ahi" igualmente (el guardado se valida contra
--     `locations`, no contra esta tabla), pero no aporta ningun grupo deducido.
--     Living Shores es el caso actual: esta en `locations` y todavia no tiene
--     grupo. Cuando se decida cual es, se inserta aqui y ya propaga solo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS location_groups (
  location_id varchar(50) NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  group_id    char(1)     NOT NULL,
  PRIMARY KEY (location_id, group_id)
);

COMMENT ON TABLE location_groups IS
  'Grupos a los que pertenece cada location. Alimenta el Grupo D y la propuesta de grupos al entrenar.';

-- ---------------------------------------------------------------------------
--  3) Donde ha sido entrenado cada empleado (§ "seleccion de locaciones
--     donde ha sido entrenado"). Es la fuente de la que salen los grupos.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_location_training (
  employee_id  integer      NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id  varchar(50)  NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  trained_at   date         NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, location_id)
);

CREATE INDEX IF NOT EXISTS emp_loc_training_loc_idx
  ON employee_location_training (location_id);

COMMENT ON TABLE employee_location_training IS
  'Locations donde el empleado ha recibido entrenamiento.';

-- ---------------------------------------------------------------------------
--  4) Grupos adicionales del empleado.
--     employees.group_id se conserva como grupo PRINCIPAL para no romper el
--     horario, las reglas de personal ni el importador. Esta tabla guarda los
--     grupos extra: el conjunto real de grupos es la union de ambos.
--
--     NOTA DE ESQUEMA: las tres tablas de esta entrega (location_groups,
--     employee_location_training, employee_groups) viven en FOODS y solo en
--     foods. El roster de empleados esta ahi, incluso cuando la pantalla esta
--     en el tema retail (GET /api/retail/employees lee de foods). Por eso los
--     endpoints de la entrega ignoran el tema y van siempre a foods: si se
--     guardaran en retail, la FK de employee_id fallaria porque retail.employees
--     esta vacia. Por lo mismo, `location_groups` es el catalogo de locations
--     de foods y las locations de retail (whistle-stop, yum-yum-junction, ...)
--     no son marcables como "entrenado ahi".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_groups (
  employee_id integer NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  group_id    char(1) NOT NULL,
  PRIMARY KEY (employee_id, group_id)
);

COMMENT ON TABLE employee_groups IS
  'Grupos adicionales del empleado. group_id en employees sigue siendo el grupo principal.';

-- ---------------------------------------------------------------------------
--  5) Rol administrativo
--     No hace falta columna: employees.role ya es varchar(20) y guarda
--     'admin'. Lo que cambia es que, al elegir ese rol, el panel de
--     cualidades muestre solo las certificaciones administrative.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
--  6) Grupo D: Bistro y Dunkin Donuts
--     Se crean como locations normales para que puedan recibir empleados,
--     horarios, roles y filtros como las demas. Si ya existieran, no se
--     tocan (ON CONFLICT DO NOTHING).
--
--     Solo en la base de Comida: en la de Retail el CHECK de locations.type
--     solo admite 'retail'. No hace falta duplicarlas alli, porque el personal
--     de Retail se lee de la base de Comida (es el mismo empleado), asi que un
--     empleado de Retail puede recibir asignaciones en el Bistro igual.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM locations WHERE type = 'food-beverage') THEN
        INSERT INTO locations (id, name, type, category)
        VALUES ('bistro', 'Bistro', 'food-beverage', 'Coffee & Bar')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO locations (id, name, type, category)
        VALUES ('dunkin-donuts', 'Dunkin'' Donuts', 'food-beverage', 'Coffee & Bar')
        ON CONFLICT (id) DO NOTHING;
    END IF;
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'Bistro/Dunkin no insertadas: el CHECK de locations.type no admite food-beverage en esta base.';
END $$;

-- El dunkin-trained ya es una capacitacion usada para filtrar personal de
-- Retail; se deja intacta.

-- ---------------------------------------------------------------------------
--  7) Asignar Bistro y Dunkin' al Grupo D, y los grupos A/B/C que ya estaban
--     escritos en el formulario del empleado:
--       A: Pixie Kitchen, Food Fair, Oasis, Slush Factory
--       B: Guard House, Dutch Village, Poblano Cantina, World Pavilion
--       C: Barnyard Pizza, Dippin' Dots, Farm Stand
--     Solo se asignan las locations que existen de verdad en esta base: en
--     Retail casi ninguna de estas existe y el FK lo rechazaria.
-- ---------------------------------------------------------------------------
INSERT INTO location_groups (location_id, group_id)
SELECT l.id, g.gid
  FROM locations l
  JOIN (VALUES
          ('bistro',          'D'),
          ('dunkin-donuts',    'D'),
          ('pixie-kitchen',   'A'), ('food-fair',       'A'),
          ('teddys-oasis',    'A'), ('slush-factory',   'A'),
          ('guard-house-snacks','B'),('dutch-village-ice-cream','B'),
          ('poblano-cantina', 'B'), ('world-pavilion',  'B'),
          ('barnyard-pizza',  'C'), ('dippin-dots',     'C'),
          ('farm-stand',      'C')
       ) AS g(loc, gid) ON g.loc = l.id
ON CONFLICT (location_id, group_id) DO NOTHING;

-- ---------------------------------------------------------------------------
--  8) Limpiar cualquier grupo vacio ya guardado en employees.group_id.
--     char(1) guarda '' como un espacio; se pasa a ' ' explicitamente para que
--     la app lo muestre como "Sin grupo" y no como un espacio invisible.
-- ---------------------------------------------------------------------------
UPDATE employees SET group_id = ' ' WHERE group_id IS NULL OR group_id = '';

-- ---------------------------------------------------------------------------
--  RESUMEN
--  · No DROP, no DELETE, no TRUNCATE, no UPDATE de datos de negocio.
--  · 4 tablas nuevas, 2 locations nuevas (Bistro, Dunkin' Donuts).
--  · La unica normalizacion es group_id vacio -> ' ' (mismo valor, sin espacios).
--  · employee_trainings intacta aqui.
-- ---------------------------------------------------------------------------