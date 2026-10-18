// Respaldo real (SQL con INSERTs) de las bases de datos.
// Los backups automáticos del servidor salen vacios, asi que este si sirve.
//
// Uso:  node make_backup.js [etiqueta]
// Sin etiqueta escribe  backups/full_<AAAAMMDD-HHMMSS>.sql  (una copia nueva)
// Con etiqueta escribe  backups/<etiqueta>.sql  y avisa si ya existia.
//
// OJO: nunca usa un nombre fijo. Un respaldo que se sobrescribe a si mismo no
// es un respaldo: si hay que volver atras, no queda la foto de antes.
const fs = require('fs');
const path = require('path');
const db = require('./db');

// Las tablas que la aplicacion usa a diario. No se incluyen a proposito las
// tablas de historial de importaciones mas antiguas ni las de catalogo.
const TABLES = ['locations', 'employees', 'assignments', 'supervisor_assignments',
                'tasks', 'employee_breaks', 'location_disables', 'location_required_roles',
                'staffing_rules', 'employee_availability', 'work_hours', 'import_history',
                'employee_trainings', 'schedule_categories', 'schedule_notes',
                'location_groups', 'employee_location_training', 'employee_groups'];

const q = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return "'" + v.toISOString().replace('T', ' ').slice(0, 19) + "'";
  return "'" + String(v).replace(/'/g, "''") + "'";
};

const pad = (n) => String(n).padStart(2, '0');
const sello = () => {
  const d = new Date();
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' +
         pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
};

(async () => {
  const etiqueta = (process.argv[2] || '').trim();
  const dir = path.join(__dirname, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, (etiqueta ? etiqueta + '.sql' : 'full_' + sello() + '.sql'));

  if (fs.existsSync(file)) {
    const kb = Math.round(fs.statSync(file).size / 1024);
    console.error('AVISO: ' + path.basename(file) + ' ya existe (' + kb + ' KB) y se sobreescribiria.');
    console.error('Elige otra etiqueta, o borra ese archivo si de verdad quieres sustituirlo.');
    process.exit(1);
  }

  const out = ['-- Respaldo completo de las bases de datos de StoryManager.',
               '-- Generado: ' + new Date().toISOString(),
               etiqueta ? '-- Etiqueta: ' + etiqueta : '-- Copia automatico con sello de tiempo.',
               ''];
  let totalFilas = 0;

  for (const [nombre, pool] of [['foods', db.foods], ['retail', db.retail]]) {
    out.push('-- ------------------------------------------------------------------');
    out.push('-- Base de datos: ' + nombre);
    out.push('-- ------------------------------------------------------------------');
    for (const t of TABLES) {
      let r;
      try { r = await pool.query('SELECT * FROM ' + t); }
      catch (e) { out.push('-- ' + nombre + '.' + t + ': no existe en este esquema'); continue; }
      if (!r.rows.length) { out.push('-- ' + nombre + '.' + t + ': vacia'); continue; }
      totalFilas += r.rows.length;
      out.push('');
      out.push('BEGIN;  -- ' + nombre + '.' + t);
      r.rows.forEach((row) => {
        const cols = Object.keys(row).join(', ');
        const vals = Object.keys(row).map((k) => q(row[k])).join(', ');
        out.push('INSERT INTO ' + t + ' (' + cols + ') VALUES (' + vals + ');');
      });
      out.push('COMMIT;  -- ' + nombre + '.' + t + ': ' + r.rows.length + ' filas');
    }
    out.push('');
  }

  fs.writeFileSync(file, out.join('\n'), 'utf8');
  console.log('respaldo escrito: ' + file);
  console.log('  tablas por base: ' + TABLES.length);
  console.log('  filas guardadas: ' + totalFilas);
  console.log('  tamano: ' + Math.round(fs.statSync(file).size / 1024) + ' KB');
  await db.foods.end(); await db.retail.end();
})().catch((e) => { console.error(e); process.exit(1); });