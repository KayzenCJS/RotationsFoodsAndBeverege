// Respaldo de las tablas del modulo de inspecciones ANTES de la migracion.
// Sale en formato COPY, que es el que sirve para restaurar de verdad.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const TABLAS = ['inspections', 'inspection_findings', 'corrections',
                'inspection_status_history', 'inspection_evidence'];

(async () => {
  const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
  });

  const dir = path.join(__dirname, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, 'inspecciones_antes_' + stamp + '.sql');

  if (fs.existsSync(file)) {
    console.error('AVISO: ' + path.basename(file) + ' ya existe. No se sobreescribe.');
    await p.end();
    process.exit(1);
  }

  const out = [
    '-- Respaldo del modulo de inspecciones, antes de inspections_improvements.sql',
    '-- Generado: ' + new Date().toISOString(),
    '-- Formato COPY. Para restaurar:  psql -d storyland_foods -f ' + path.basename(file),
    ''
  ];
  let filas = 0;

  for (const t of TABLAS) {
    let cols;
    try { cols = (await p.query('SELECT * FROM ' + t + ' LIMIT 0')).fields.map(f => f.name); }
    catch (e) { out.push('-- ' + t + ': no existe'); continue; }

    const r = await p.query('SELECT * FROM ' + t);
    filas += r.rows.length;
    out.push('');
    out.push('-- ----------------------------------------------------------------');
    out.push('-- ' + t + ': ' + r.rows.length + ' filas');
    out.push('-- ----------------------------------------------------------------');
    if (!r.rows.length) continue;

    out.push('COPY ' + t + ' (' + cols.join(', ') + ") FROM stdin;");
    r.rows.forEach(row => {
      out.push(cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return '\\N';
        if (v instanceof Date) return v.toISOString().replace('T', ' ').slice(0, 19);
        if (Array.isArray(v)) return '{' + v.join(',') + '}';
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r');
      }).join('\t'));
    });
    out.push('\\.');
  }

  out.push('');
  fs.writeFileSync(file, out.join('\n'), 'utf8');
  console.log('respaldo escrito: ' + file);
  console.log('  tablas: ' + TABLAS.length);
  console.log('  filas:  ' + filas);
  console.log('  tamano: ' + Math.round(fs.statSync(file).size / 1024) + ' KB');
  await p.end();
})().catch(e => { console.error(e); process.exit(1); });