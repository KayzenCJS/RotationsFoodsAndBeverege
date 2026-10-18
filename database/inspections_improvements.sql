-- ============================================================================
--  MODULO DE INSPECCIONES — MEJORAS DE ESQUEMA
-- ============================================================================
--  Migración ADITIVA e idempotente. No borra ni reescribe ninguna fila.
--  Todo lo que ya existe se conserva tal cual, incluidas las referencias
--  antiguas que hoy apuntan a ids que no corresponden a un empleado.
-- ============================================================================
--
--  Resumen de lo que añade y por qué:
--
--  1. inspections.location_id
--     Hoy una inspección NO tiene locación: la locación solo vive en sus
--     hallazgos. Eso hace que una inspección sin hallazgos no pueda aparecer
--     en el panel de locaciones. Con la columna, "una inspección pertenece a
--     una locación" pasa a ser verdad en la base de datos.
--     Las inspecciones que ya tienen hallazgos se rellenan solas.
--
--  2. Catálogos: tipos de inspección y categorías de hallazgo
--     Hoy el tipo es texto libre en cada fila y las categorías se escriben a
--     mano, lo que produce duplicados por mayúsculas/espacios ("Food Safety"
--     vs "food safety"). Con un catálogo se ofrecen primero las existentes y
--     se puede añadir una nueva sin romper nada.
--
--  3. assigned_to_name en hallazgos y correcciones
--     assigned_to es un entero SIN clave foránea (hoy hay un 1 que no
--     corresponde a ningún empleado). Se añade el nombre en texto para poder
--     asignar a alguien externo sin inventar un empleado ficticio.
--
--  4. Soft delete en hallazgos y correcciones
--     Los hallazgos tienen correcciones y el historial de auditoría, todos con
--     ON DELETE CASCADE: un borrado físico destruiría histórico. Con
--     deleted_at/deleted_by el registro sale de la vista pero se conserva.
--
--  5. FINDINGS.corrections y FINDINGS.correction_history_ids
--     Para poder mostrar "Visualizar / Modificar / Eliminar" y el detalle sin
--     consultas extra.
-- ============================================================================


-- ---------------------------------------------------------------------------
--  1) inspections.location_id
-- ---------------------------------------------------------------------------
BEGIN;
  ALTER TABLE inspections ADD COLUMN IF NOT EXISTS location_id varchar(50);
  -- inspector_name: para inspectores que no estan en la tabla de empleados
  -- (una empresa externa, unvisitante). Si el inspector SI es un empleado,
  -- esta columna queda vacia y el nombre sale de employees.
  ALTER TABLE inspections ADD COLUMN IF NOT EXISTS inspector_name varchar(120);
  -- IF NOT EXISTS no existe para ADD CONSTRAINT: se comprueba antes. Asi el
  -- script se puede volver a ejecutar sin que falle.
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inspections_location_id_fkey') THEN
      ALTER TABLE inspections
        ADD CONSTRAINT inspections_location_id_fkey
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
    END IF;
  END $$;
  CREATE INDEX IF NOT EXISTS idx_inspections_location
    ON inspections (location_id);
  CREATE INDEX IF NOT EXISTS idx_inspections_date
    ON inspections (inspection_date DESC);
COMMIT;

-- Las inspecciones que YA tienen hallazgos heredan su locación: así el panel
-- de locaciones no pierde ninguna de las que existian.
UPDATE inspections i
   SET location_id = sub.loc
  FROM (SELECT DISTINCT inspection_id, location_id AS loc
          FROM inspection_findings
         WHERE location_id IS NOT NULL) sub
 WHERE sub.inspection_id = i.id
   AND i.location_id IS NULL;

-- Las que no tienen hallazgos se quedan con location_id NULL. No se inventa
-- ninguna: es preferible "no se sabe" a "se adivinó".


-- ---------------------------------------------------------------------------
--  2) Catálogos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspection_types (
  key         varchar(50)  PRIMARY KEY,
  name_es     varchar(80)  NOT NULL,
  name_en     varchar(80)  NOT NULL,
  description text,
  is_active   boolean      NOT NULL DEFAULT true,
  sort_order  integer      NOT NULL DEFAULT 100,
  created_at  timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE inspection_types IS
  'Tipos de inspeccion. Alimenta el combobox del formulario; anadir uno nuevo es insertar una fila.';

CREATE TABLE IF NOT EXISTS finding_categories (
  id         serial       PRIMARY KEY,
  name       varchar(80)  NOT NULL,
  type_key   varchar(50),
  is_active  boolean      NOT NULL DEFAULT true,
  created_at timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Evita duplicados por mayusculas/espacios: "Food Safety", "food safety" y
-- " Food  Safety " son la misma categoria.
--
-- Va como indice UNIQUE y no como constraint de la tabla porque un UNIQUE de
-- columna no admite expresiones: lo que debe ser unico es el nombre ya
-- normalizado, no el texto tal cual.
CREATE UNIQUE INDEX IF NOT EXISTS finding_categories_name_norm_uq
    ON finding_categories (lower(btrim(name)));

COMMENT ON TABLE finding_categories IS
  'Categorias de hallazgo. type_key nullable: si esta vacio, la categoria vale para cualquier tipo de inspeccion.';

-- Tipos que ya estan en uso en la base, para no perder nada:
INSERT INTO inspection_types (key, name_es, name_en, is_active, sort_order) VALUES
  ('food_safety',  'Food Safety',       'Food Safety',       true, 10),
  ('health',       'Health Inspection', 'Health Inspection', true, 20),
  ('safety',       'Safety Inspection', 'Safety Inspection', true, 30),
  ('equipment',    'Equipment Inspection', 'Equipment Inspection', true, 40),
  ('maintenance',  'Maintenance Inspection', 'Maintenance Inspection', true, 50),
  ('general',      'General Inspection', 'General Inspection', true, 60),
  ('other',        'Other',             'Other',             true, 70)
ON CONFLICT (key) DO UPDATE
  SET name_es = EXCLUDED.name_es,
      name_en = EXCLUDED.name_en,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order;

-- Categorias que ya existen en hallazgos historicos: se conservan tal cual.
INSERT INTO finding_categories (name, type_key, is_active)
SELECT DISTINCT btrim(f.category), NULL, true
  FROM inspection_findings f
 WHERE f.category IS NOT NULL
   AND btrim(f.category) <> ''
ON CONFLICT DO NOTHING;


-- ---------------------------------------------------------------------------
--  3) Responsable externo (id de empleado O nombre escrito a mano)
-- ---------------------------------------------------------------------------
BEGIN;
  ALTER TABLE inspection_findings ADD COLUMN IF NOT EXISTS assigned_to_name varchar(120);
  ALTER TABLE corrections          ADD COLUMN IF NOT EXISTS assigned_to_name varchar(120);
COMMIT;

COMMENT ON COLUMN inspection_findings.assigned_to_name IS
  'Nombre del responsable cuando NO es un empleado de la tabla employees.';
COMMENT ON COLUMN corrections.assigned_to_name IS
  'Nombre del responsable cuando NO es un empleado de la tabla employees.';
COMMENT ON COLUMN inspections.inspector_name IS
  'Nombre del inspector cuando NO es un empleado de la tabla employees.';


-- ---------------------------------------------------------------------------
--  4) Soft delete en hallazgos y correcciones
-- ---------------------------------------------------------------------------
BEGIN;
  ALTER TABLE inspection_findings ADD COLUMN IF NOT EXISTS deleted_at timestamp;
  ALTER TABLE inspection_findings ADD COLUMN IF NOT EXISTS deleted_by integer;
  ALTER TABLE corrections          ADD COLUMN IF NOT EXISTS deleted_at timestamp;
  ALTER TABLE corrections          ADD COLUMN IF NOT EXISTS deleted_by integer;
COMMIT;


-- ---------------------------------------------------------------------------
--  5) Enlaces del hallazgo para el detalle
-- ---------------------------------------------------------------------------
BEGIN;
  ALTER TABLE inspection_findings ADD COLUMN IF NOT EXISTS corrections integer NOT NULL DEFAULT 0;
  ALTER TABLE inspection_findings ADD COLUMN IF NOT EXISTS correction_history_ids integer[];
COMMIT;

COMMENT ON COLUMN inspection_findings.corrections IS
  'Cuantas correcciones tiene el hallazgo (contador para la lista).';
COMMENT ON COLUMN inspection_findings.correction_history_ids IS
  'Historial de correcciones en orden cronologico (array de ids).';

-- Se rellena el contador con las correcciones que ya existen, para que el
-- listado no salga en cero mientras no haya correcciones nuevas.
UPDATE inspection_findings f
   SET corrections = COALESCE(sub.n, 0)
  FROM (SELECT finding_id, count(*)::int n FROM corrections
         WHERE deleted_at IS NULL GROUP BY finding_id) sub
 WHERE sub.finding_id = f.id
   AND f.corrections = 0;

-- Orden cronologico de las correcciones de cada hallazgo.
UPDATE inspection_findings f
   SET correction_history_ids = COALESCE(sub.ids, '{}'::int[])
  FROM (SELECT finding_id,
               array_agg(id ORDER BY COALESCE(correction_date, created_at::date), id) AS ids
          FROM corrections GROUP BY finding_id) sub
 WHERE sub.finding_id = f.id;


-- ---------------------------------------------------------------------------
--  6) Comprobacion
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_insp int;
  v_con_loc int;
  v_hall int;
  v_corr int;
BEGIN
  SELECT count(*) INTO v_insp FROM inspections;
  SELECT count(*) INTO v_con_loc FROM inspections WHERE location_id IS NOT NULL;
  SELECT count(*) INTO v_hall FROM inspection_findings;
  SELECT count(*) INTO v_corr FROM corrections;

  RAISE NOTICE 'Inspecciones: % (% con locacion asignada)', v_insp, v_con_loc;
  RAISE NOTICE 'Hallazgos: %   Correcciones: %', v_hall, v_corr;

  IF v_insp = 0 THEN
    RAISE WARNING 'No hay inspecciones: revisa que la migracion apunte a la base correcta.';
  END IF;
  RAISE NOTICE 'Categorias de hallazgo en el catalogo: %',
    (SELECT count(*) FROM finding_categories);
  RAISE NOTICE 'Tipos de inspeccion en el catalogo: %',
    (SELECT count(*) FROM inspection_types WHERE is_active);
END $$;