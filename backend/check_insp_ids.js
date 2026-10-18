// Comprueba que todos los getElementById que usa el modulo de inspecciones
// existen en index.html. Un id mal escrito es un error en tiempo de ejecucion
// que solo aparece cuando el usuario abre ese modal concreto.
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const idsHtml = new Set();
// <div id="x">, id='x' en atributos sueltos
for (const m of html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)) idsHtml.add(m[1]);

const ficheros = ['inspections-module.js', 'inspections-combo.js', 'script.js'];
let faltan = 0;
let total = 0;

for (const f of ficheros) {
    const src = fs.readFileSync(path.join(raiz, f), 'utf8');
    // Solo se miran los accesos del modulo de inspecciones.
    const usados = new Set();
    for (const m of src.matchAll(/getElementById\(\s*['"]([a-zA-Z][\w-]*)['"]\s*\)/g)) usados.add(m[1]);

    // Los ids que crea el propio modulo no pueden estar en el HTML.
    const propios = new Set(['inspDetailModal', 'insp']);
    const faltanAqui = [];
    for (const id of usados) {
        if (propios.has(id)) continue;
        total++;
        if (!idsHtml.has(id)) { faltanAqui.push(id); faltan++; }
    }
    if (faltanAqui.length) {
        console.log('\n  ' + f + ':');
        faltanAqui.forEach(id => console.log('    FALTA  #' + id));
    }
}

// Al revés: ids del HTML de inspecciones que ningun js usa (restos).
console.log('\n  --- ids de inspecciones en el HTML sin usar en el JS ---');
const deInspeccion = [...idsHtml].filter(id =>
    /^insp|^finding|^correction/i.test(id));
const usados = new Set();
for (const f of ficheros) {
    const src = fs.readFileSync(path.join(raiz, f), 'utf8');
    for (const m of src.matchAll(/getElementById\(\s*['"]([a-zA-Z][\w-]*)['"]\s*\)/g)) usados.add(m[1]);
}
const huerfanos = deInspeccion.filter(id => !usados.has(id));
if (huerfanos.length) huerfanos.forEach(id => console.log('    ' + id));
else console.log('    (ninguno)');

console.log('\n  ids comprobados: ' + total + '   ausentes: ' + faltan);
process.exitCode = faltan ? 1 : 0;
