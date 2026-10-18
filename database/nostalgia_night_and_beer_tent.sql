-- ============================================================================
--  BEER TENT FUERA DE LA INTERFAZ  +  SECCIÓN NOSTALGIA NIGHT
-- ============================================================================
--  Migración ADITIVA e idempotente. No borra nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1) Beer Tent: deja de aparecer, pero se conserva
--
--  Beer Tent es una fila de `schedule_categories` (sección EXTRA_HOURS). Se
--  marca `is_active = false` y a partir de ahí ni la interfaz ni el
--  importador la usan.
--
--  NO SE BORRA la fila del catálogo ni ninguna asignación: si algún día hace
--  falta el dato, está ahí y basta con volver a poner is_active = true.
--  Si llegara a haber asignaciones históricas, quedan intactas.
-- ---------------------------------------------------------------------------
UPDATE schedule_categories
   SET is_active = false
 WHERE key = 'beer-tent'
   AND is_active IS DISTINCT FROM false;

-- ---------------------------------------------------------------------------
--  1b) El CHECK de `section` no incluía la sección nueva
--
--  La tabla traía `CHECK (section IN ('OPS','EXTRA_HOURS','SUPPORT',
--  'EXTRA_TASK'))`, así que insertar Nostalgia Night era rechazado. Se recrea
--  el CHECK con la sección nueva dentro. Va antes de los INSERT de abajo, en su
--  propia transacción, para que si algo falla la tabla quede como estaba.
-- ---------------------------------------------------------------------------
BEGIN;
  ALTER TABLE schedule_categories DROP CONSTRAINT IF EXISTS schedule_categories_section_chk;
  ALTER TABLE schedule_categories ADD CONSTRAINT schedule_categories_section_chk
    CHECK (section = ANY (ARRAY['OPS'::character varying,
                                'EXTRA_HOURS'::character varying,
                                'SUPPORT'::character varying,
                                'EXTRA_TASK'::character varying,
                                'NOSTALGIA_NIGHT'::character varying]));
COMMIT;

-- ---------------------------------------------------------------------------
--  2) Nostalgia Night: sección nueva
--
--  Turnos de tarde y de noche. Usa el MISMO componente que el resto de
--  secciones del horario: las tarjetas se pintan con renderCategoryCard y las
--  asignaciones se guardan en la misma tabla `assignments`, con
--  assignment_type = 'NOSTALGIA_NIGHT' para que no se mezclen con el horario
--  diurno.
--
--  Se insertan sus actividades. Añadir otra más adelante es insertar otra fila
--  aquí: las secciones son datos, no código.
-- ---------------------------------------------------------------------------
INSERT INTO schedule_categories (key, section, name_es, name_en, icon, sort_order, is_active)
VALUES
  ('nostalgia-night',    'NOSTALGIA_NIGHT', 'Nostalgia Night',    'Nostalgia Night',    'fa-moon',       10, true),
  ('nostalgia-dj',       'NOSTALGIA_NIGHT', 'Nostalgia DJ',       'Nostalgia DJ',       'fa-music',      20, true),
  ('nostalgia-character', 'NOSTALGIA_NIGHT', 'Character Meet',    'Character Meet',     'fa-star',       30, true)
ON CONFLICT (key) DO UPDATE
   SET section   = EXCLUDED.section,
       name_es   = EXCLUDED.name_es,
       name_en   = EXCLUDED.name_en,
       icon      = EXCLUDED.icon,
       sort_order= EXCLUDED.sort_order,
       is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------------
--  3) assignment_type admite NOSTALGIA_NIGHT
--
--  La columna es varchar con default 'LOCATION' y no tiene CHECK, así que no
--  hay nada que ampliar. Se anota el valor esperado para quien lo lea después.
--  (Si algún día se añade un CHECK, esta es la lista que tiene que incluirlo.)
-- ---------------------------------------------------------------------------
--  assignment_type IN ('LOCATION','OPS','EXTRA_HOURS','SUPPORT','EXTRA_TASK','NOSTALGIA_NIGHT')

-- ---------------------------------------------------------------------------
--  4) Turnos que cruzan la medianoche
--
--  No hace falta ninguna columna nueva: `work_date` es SIEMPRE la fecha de
--  INICIO del turno, y un turno de 20:00 a 01:00 se guarda con
--  start_time='20:00' y end_time='01:00'. El servidor y el cliente lo
--  interpretan como "termina al día siguiente" (ver minutosTurno() en
--  server.js y hasTimeOverlap() en script.js).
--
--  Índice de apoyo para detectar los turnos de la madrugada siguiente al
--  validar conflictos. No es único: no impone nada, solo acelera la búsqueda.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assignments_emp_date_type
  ON assignments (employee_id, work_date, assignment_type);

-- ---------------------------------------------------------------------------
--  5) Comprobación
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_beer boolean;
  v_nostalgia integer;
BEGIN
  SELECT is_active INTO v_beer FROM schedule_categories WHERE key = 'beer-tent';
  IF v_beer THEN
    RAISE WARNING 'Beer Tent sigue activo: revisa la migración.';
  ELSE
    RAISE NOTICE 'Beer Tent oculto de la interfaz. Su fila y su histórico se conservan.';
  END IF;

  SELECT count(*) INTO v_nostalgia
    FROM schedule_categories WHERE section = 'NOSTALGIA_NIGHT' AND is_active;
  RAISE NOTICE 'Nostalgia Night: % actividades activas.', v_nostalgia;
END $$;
