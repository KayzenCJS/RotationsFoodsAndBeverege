// Ultima comprobacion antes de publicar: recorre TODOS los ficheros que git va
// a subir y busca nombres de empleados reales de la base de datos.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Pool } = require('pg');

const RAIZ = path.join(__dirname, '..');

const p = new Pool({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.FOODS_DB_NAME
});

const EXTENSIONES = /\.(js|sql|html|css|json|md|txt|yml|yaml|env)$/i;

(async () => {
    const empleados = (await p.query('SELECT name FROM employees')).rows.map(r => r.name);

    // Tokens: cada palabra de cada nombre real de la tabla de empleados.
    const tokens = new Set();
    for (const nombre of empleados) {
        for (const t of nombre.toLowerCase().split(/\s+/)) {
            if (t.length >= 4) tokens.add(t);
        }
    }

    // Solo los ficheros que estan en el indice de git (o sea, los que se suben).
    const ficheros = execSync('git ls-files', { cwd: RAIZ, encoding: 'utf8', maxBuffer: 1 << 24 })
        .split('\n').filter(Boolean);

    const fugas = [];
    for (const f of ficheros) {
        if (!EXTENSIONES.test(f)) continue;
        const abs = path.join(RAIZ, f);
        if (!fs.existsSync(abs)) continue;
        if (fs.statSync(abs).size > 3 * 1024 * 1024) continue;   // no leer binarios grandes
        const txt = fs.readFileSync(abs, 'utf8').toLowerCase();
        for (const t of tokens) {
            if (new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(txt)) {
                fugas.push({ fichero: f, nombre: t });
            }
        }
    }

    console.log('  ficheros que se subirian: ' + ficheros.length);
    console.log('  tokens de nombre real vigilados: ' + tokens.size);
    console.log('');

    if (fugas.length) {
        const porFichero = {};
        for (const x of fugas) (porFichero[x.fichero] = porFichero[x.fichero] || new Set()).add(x.nombre);
        console.log('  FUGAS ENCONTRADAS:');
        for (const f of Object.keys(porFichero)) {
            console.log('    ' + f + '  ->  ' + [...porFichero[f]].join(', '));
        }
    } else {
        console.log('  ok   ningun nombre de empleado real aparece en lo que se sube');
    }

    await p.end();
    process.exitCode = fugas.length ? 1 : 0;
})().catch(e => { console.error(e); process.exit(1); });
