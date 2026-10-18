// Comprueba encoding y colisiones de nombres globales entre script.js y api.js.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const files = ['script.js', 'api.js', 'index.html', 'style.css', 'quinyx-parser.js',
               'excel-import.js', 'excel-import-ui.js'];
let problems = 0;

files.forEach((f) => {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    const fffd = (s.match(/\uFFFD/g) || []).length;
    const cjk = [...s].filter((c) => /[\u4e00-\u9fff]/.test(c)).length;
    const moj = /\u00c3[\u0080-\u00bf]|\u00e2\u0080|\u00c2\u00a7/.test(s);
    if (fffd || cjk || moj) {
      problems++;
      console.log('FALLO ' + f + '  U+FFFD=' + fffd + ' CJK=' + cjk + ' mojibake=' + moj);
      s.split(/\r?\n/).forEach((l, i) => {
        if (/\uFFFD|[\u4e00-\u9fff]/.test(l)) console.log('     ' + (i + 1) + ': ' + l.trim().slice(0, 100));
      });
    } else {
      console.log('ok    ' + f);
    }
});

// Colisiones de funciones globales entre los dos scripts clásicos.
const globalsOf = (src) => {
    const out = new Set();
    const re = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
    let m;
    while ((m = re.exec(src))) out.add(m[1]);
    return out;
};
const a = globalsOf(fs.readFileSync(path.join(root, 'api.js'), 'utf8'));
const b = globalsOf(fs.readFileSync(path.join(root, 'script.js'), 'utf8'));
const clash = [...a].filter((n) => b.has(n));
if (clash.length) {
    problems++;
    console.log('\nFALLO funciones definidas en api.js Y en script.js (la segunda pisa a la primera):');
    clash.forEach((n) => console.log('  ' + n));
} else {
    console.log('\nok    sin colisiones de funciones globales entre api.js y script.js');
}

console.log('\n' + (problems ? 'HAY ' + problems + ' PROBLEMAS' : 'todo correcto'));
process.exit(problems ? 1 : 0);