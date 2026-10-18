-- ============================================================================
--  INSPECTORES: ENTIDAD PROPIA, SEPARADA DE LOS EMPLEADOS
-- ============================================================================
--  Migración ADITIVA e idempotente. No borra ni reescribe ninguna fila.
--
--  POR QUÉ HACE FALTA
--  ------------------
--  Los inspectores no son empleados del Gestor de Empleados. Se registran por
--  su cuenta y no tienen por qué existir en la tabla `employees`. Hasta ahora
--  el campo Inspector offering una lista de empleados, lo que además era
--  incorrecto: los ids que hay guardados (1, 3, 101096) no corresponden a
--  ningún empleado, y `inspector_name` estaba siempre vacío.
--
--  1) Tabla inspectors
--     El registro de quién inspecciona, con su propio identificador. Permite
--     reutilizar a alguien que ya inspeccionó sin volver a escribirlo, y saber
--     cuántas inspecciones lleva cada uno.
--
--  2) inspections.inspector_id apunta a inspectors
--     Se sigue usando la misma columna: así no se duplica el dato y las
--     consultas del módulo no cambian de forma.
--
--  3) inspections.inspector_name es la FOTO del nombre en el momento de la
--     inspección. Es lo que se muestra en listados, detalle, PDF e historial.
--     Aunque luego se cambie el nombre de un inspector, o se desactive, las
--     inspecciones antiguas siguen mostrando el nombre con el que se hicieron.
--     Es lo que pide que el dato sobreviva a los cambios posteriores.
--
--  4) La serie de ids empieza por encima de cualquier valor histórico
--     Las inspecciones que ya existen guardan 1, 3 y 101096 en inspector_id.
--     Esos valores son de otra época (eran ids de empleado) y NO se tocan. Si la
--     serie de inspectors empezara en 1, un inspector nuevo podía recibir el
--     id 1 y las inspecciones antiguas pasarían a parecer suyas. Por eso el
--     generador arranca por encima del máximo histórico.
--
--  LO QUE NO SE HACE
--  -----------------
--  - No se modifica ninguna fila de inspections (ni sus ids, ni sus fechas,
--    ni sus notas). Sus inspector_id antiguos se conservan tal cual.
--  - No se crea ningún empleado a partir de un inspector.
--  - No se añade clave foránea: 1, 3 y 101096 no existirían en inspectors y una
--    FK (incluso NOT VALID) haría fallar cualquier edición posterior de esas
--    inspecciones. La validación se hace en el backend.
--  - No se toca la tabla employees ni nada de hallazgos o correcciones.
-- ============================================================================


-- ---------------------------------------------------------------------------
--  1) Tabla de inspectores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspectors (
  id         serial        PRIMARY KEY,
  name       varchar(120)  NOT NULL,
  is_active  boolean       NOT NULL DEFAULT true,
  note       text,
  created_at timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE inspectors IS
  'Personas que realizan inspecciones. Entity propia: NO son empleados del Gestor de Empleados y no se relacionan con la tabla employees.';

COMMENT ON COLUMN inspectors.name IS
  'Nombre del inspector tal como se escribe. Un indice unico sobre lower(btrim(name)) evita registrar dos veces a la misma persona por mayusculas o espacios.';

CREATE UNIQUE INDEX IF NOT EXISTS inspectors_name_norm_uq
    ON inspectors (lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_inspectors_activo
    ON inspectors (is_active, lower(name));


-- ---------------------------------------------------------------------------
--  2) La serie arranca por encima de los ids historicos
-- ---------------------------------------------------------------------------
--  Se calcula sobre el mayor inspector_id que exista de verdad, para que un id
--  nuevo jamás pueda confundirse con uno de la epoca de los empleados.
--
--  OJO con setval: setval(seq, X, false) hace que la SIGUIENTE llamada a
--  nextval devuelva X (no X+1). Para que el siguiente id sea max+1 hay que
--  pasar max+1, no max.
--
--  Solo se mueve la serie hacia adelante: si ya esta mas advanced, no se toca.
DO $$
DECLARE
  v_max integer;
  v_actual integer;
BEGIN
  IF to_regclass('inspectors') IS NULL THEN RETURN; END IF;

  SELECT COALESCE(max(inspector_id), 0) INTO v_max FROM inspections;

  IF v_max > 0 THEN
    -- Posicion que devolveria la siguiente llamada a nextval, tal cual esta.
    SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END
      INTO v_actual FROM inspectors_id_seq;

    IF v_actual <= v_max THEN
      PERFORM setval('inspectors_id_seq', v_max + 1, false);
      RAISE NOTICE 'Serie de inspectores: el siguiente id sera % (maximo historico: %)',
                   v_max + 1, v_max;
    ELSE
      RAISE NOTICE 'Serie de inspectores: ya estaba en % (> %), no se toca',
                   v_actual, v_max;
    END IF;
  ELSE
    RAISE NOTICE 'Serie de inspectores: no hay ids historicos, empieza en 1';
  END IF;
END $$;


-- ---------------------------------------------------------------------------
--  3) Indices de apoyo
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inspections_inspector
    ON inspections (inspector_id);

COMMENT ON COLUMN inspections.inspector_id IS
  'Inspector que realizo la inspeccion (referencia a inspectors.id). Los valores anteriores a esta migracion eran ids de empleado y se conservan tal cual, sin reasignar.';

COMMENT ON COLUMN inspections.inspector_name IS
  'Foto del nombre del inspector en el momento de la inspeccion. Es lo que se muestra en listados, detalle, PDF e historial, y no cambia aunque luego se edite el inspector.';


-- ---------------------------------------------------------------------------
--  4) Comprobacion
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_insp integer;
  v_inspectores integer;
  v_huerfanos integer;
BEGIN
  SELECT count(*) INTO v_insp FROM inspections;

  -- Las inspecciones cuyo inspector no existe en la tabla son las historicas.
  -- No es un error: son los ids de la epoca de los empleados y se conservan.
  IF v_insp > 0 THEN
    SELECT count(*) INTO v_huerfanos
      FROM inspections i
     WHERE i.inspector_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM inspectors x WHERE x.id = i.inspector_id);

    RAISE NOTICE 'Inspecciones: %   Inspectores registrados: %', v_insp, v_inspectores;
    RAISE NOTICE 'Inspecciones con id de inspector de la epoca de los empleados (se conservan): %', v_huerfanos;
  ELSE
    RAISE NOTICE 'Inspecciones: 0 (base recien creada, no hay nada que conservar)';
  END IF;

  SELECT count(*) INTO v_inspectores FROM inspectors;
  RAISE NOTICE 'Inspectores dados de alta: %', v_inspectores;
END $$;
