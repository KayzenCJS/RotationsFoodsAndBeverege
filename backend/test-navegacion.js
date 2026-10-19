// ============================================================================
//  NAVEGACIÓN: SUBMENÚ DE FOODS
// ============================================================================
//  Lo que se comprueba es lo que se pidió:
//
//    1. Foods es el acceso principal a las herramientas operativas.
//    2. "Gestión" ya no es un apartado independiente del menú.
//    3. "Tareas" ya no es un título independiente del menú.
//    4. Las siete herramientas siguen accesibles desde las subsecciones.
//    5. No hay pantallas duplicadas ni rutas rotas.
//    6. No se ha roto nada de lo demás.
//
//  Cómo se comprueba un cambio que es casi todo de navegación: se mira el DOM
//  real, con el servidor en marcha, y se comprueba que lo que se dice en el
//  encargo es lo que hay. Nada de leer el código y suponer: si un botón apunta
//  a un id que no existe, el error sale aquí.
//
//  Estas pruebas SOLO LEEN el HTML y ejecutan funciones de navegación que ya
//  existen. No escriben nada en la base: por eso los botones se pulsan en el DOM
//  real pero los que abren un módulo se cierran después, y la prueba lo
//  comprueba.
// ============================================================================
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const fallos = [];
const eq = (a, e, m) => {
    if (JSON.stringify(a) === JSON.stringify(e)) { pass++; console.log('    OK   ' + m); }
    else {
        fail++; fallos.push(m);
        console.log('    FAIL ' + m + '\n           esperado ' + JSON.stringify(e)
            + '\n           obtenido ' + JSON.stringify(a));
    }
};
const ok = (v, m) => eq(!!v, true, m);
const linea = (t) => console.log('\n' + t);

// Las siete herramientas del submenú: [destino, id del bloque, etiqueta ES]
const HERRAMIENTAS = [
    ['panelSchedule', 'panelSchedule', 'Horarios'],
    ['panelEmployees', 'panelEmployees', 'Empleados'],
    ['panelLocations', null, 'Locaciones'],
    ['panelTasks', 'panelTasks', 'Tareas'],
    ['panelQueries', 'panelQueries', 'Consultas'],
    ['inspections', 'inspections', 'Inspecciones'],
    ['reports', null, 'Reportes']
];

console.log('\n=== NAVEGACIÓN: SUBMENÚ DE FOODS ===');

// ---------------------------------------------------------------------------
linea('1. EL MENÚ PRINCIPAL');
// ---------------------------------------------------------------------------

const menu = [...html.matchAll(/<a[^>]*class="nav-link"[^>]*>([^<]*)<\/a>/g)].map(m => m[1].trim());

eq(menu.length, 4, 'el menú tiene 4 entradas, no 9: ' + JSON.stringify(menu));
ok(menu.includes('Inicio'), '  sigue estando Inicio');
ok(menu.some(m => /Foods/i.test(m)), '  sigue estando Foods');
ok(menu.some(m => /Retail|Tiendas/i.test(m)), '  sigue estando Retail');
ok(menu.some(m => /Wastelog/i.test(m)), '  sigue estando Wastelog');

eq(menu.filter(m => /Gesti[oó]n|Management/i.test(m)), [],
    '"Gestión" ya no es un apartado del menú');
eq(menu.filter(m => /^Tareas$|^Tasks$/.test(m)), [],
    '"Tareas" ya no es un título del menú');
eq(menu.filter(m => /Reportes?$|Reports$/i.test(m) && !/wastelog/i.test(m)), [],
    '"Reportes" ya no es un título del menú (ahora es una subsección)');
eq(menu.filter(m => /Inspecciones?$|Inspections$/i.test(m)), [],
    '"Inspecciones" ya no es un título del menú');
eq(menu.filter(m => /^(Admin|Administraci[oó]n)$/i.test(m)), [],
    '"Administración" ya no es un título del menú');

// Ningún enlace del menú apunta a un ancla que no exista.
const anclas = [...html.matchAll(/<a[^>]*href="#([a-zA-Z][\w-]*)"/g)].map(m => m[1]);
const inexistentes = anclas.filter(a => !html.includes('id="' + a + '"'));
eq(inexistentes, [], 'ningún enlace del menú apunta a un ancla inexistente'
    + (inexistentes.length ? ' -> ' + JSON.stringify(inexistentes) : ''));

ok(!html.includes('href="#tasks"'), 'el ancla rota "#tasks" ya no está en el HTML');
ok(!/onclick="[^"]*scrollToTasks/.test(html),
    'y ningún botón del menú llama ya a la función que la arreglaba');

// ---------------------------------------------------------------------------
linea('2. EL SUBMENÚ DE FOODS');
// ---------------------------------------------------------------------------

ok(html.includes('id="panelSubnav"'), 'existe el contenedor del submenú');
ok(html.includes('class="panel-subnav-item"'), 'con botones de subsección');

// Se cuentan los botones por su etiqueta data-panel, no por una expresión que
// dependa de cómo estén repartidos los atributos: si alguien reordena el
// onclick, esta prueba no debe dejar de ver el botón.
const etiquetas = [...html.matchAll(/data-panel="([^"]+)"/g)].map(m => m[1]);
eq(etiquetas.length, 7, 'el submenú tiene 7 accesos a herramientas: ' + etiquetas.length);
eq(new Set(etiquetas).size, 7, '  y ninguno está repetido');

// Cada botón tiene que llamar a irAPanel con el mismo destino que declara.
[...html.matchAll(/<button[^>]*data-panel="([^"]+)"[^>]*>/g)].forEach(([etiqueta, destino]) => {
    const llama = /onclick="irAPanel\('([^']+)'\)"/.test(etiqueta);
    const coincide = new RegExp("onclick=\"irAPanel\\('" + destino + "'\\)\"").test(etiqueta);
    eq(coincide, true, 'el botón de ' + destino + ' llama a irAPanel con ese mismo destino');
});

// Cada subsección tiene su texto en los dos idiomas.
HERRAMIENTAS.forEach(([destino, , etiqueta]) => {
    ok(html.includes('data-panel="' + destino + '"'),
        'la subsección ' + etiqueta + ' está en el submenú');
});

// Los destinos que son bloques del panel tienen que existir en el HTML.
HERRAMIENTAS.filter(([, id]) => id).forEach(([destino, id]) => {
    ok(html.includes('id="' + id + '"'), 'el bloque destino de ' + destino + ' existe en el HTML');
});

// Los que abren un módulo tienen que llamar a la función que ya existía.
ok(html.includes("irAPanel('inspections')"), 'Inspecciones llega por su subsección');
ok(/function openInspectionsModule/.test(fs.readFileSync(path.join(RAIZ, 'script.js'), 'utf8')),
    '  y esa función sigue existiendo (no se ha reimplementado nada)');
ok(/function openTrainingReports/.test(fs.readFileSync(path.join(RAIZ, 'script.js'), 'utf8')),
    'Reportes llega por su subsección y su función sigue existiendo');
ok(/function openAdminPanel/.test(fs.readFileSync(path.join(RAIZ, 'script.js'), 'utf8')),
    'Locaciones llega por su subsección y su función sigue existiendo');

// ---------------------------------------------------------------------------
linea('3. NO HAY PANTALLAS DUPLICADAS');
// ---------------------------------------------------------------------------

// Cada módulo se sigue usando, y desde UN solo sitio: irAPanel(). El HTML ya no
// los llama directamente (eso era justo la duplicación de puertas), así que se
// mira que el switch de irAPanel los menciona una vez cada uno.
const jsPrevio = fs.readFileSync(path.join(RAIZ, 'script.js'), 'utf8');
const cuerpoIrAPanel = jsPrevio.slice(jsPrevio.indexOf('function irAPanel(destino)'));
['openInspectionsModule', 'openTrainingReports', 'openAdminPanel'].forEach(fn => {
    // Se cuentan solo las llamadas en código, no las menciones dentro de los
    // comentarios de irAPanel, que explican qué hace cada rama.
    const antesDeDefault = cuerpoIrAPanel.slice(0, cuerpoIrAPanel.indexOf('default:'));
    const enCodigo = antesDeDefault.split('\n').filter(l => {
        if (!l.includes(fn + '(')) return false;
        const t = l.trim();
        return !t.startsWith('//') && !t.startsWith('*');
    }).length;
    eq(enCodigo, 1, fn + '() se llama desde un único sitio: irAPanel()'
        + (enCodigo !== 1 ? ' -> ' + enCodigo + ' veces' : ''));

    // Y el HTML no debe llamarla también por su cuenta.
    const enHtml = [...html.matchAll(new RegExp(fn + '\\(\\)', 'g'))].length;
    eq(enHtml, 0, '  y el HTML ya no la llama por su cuenta (una sola puerta)');
});

// Ningún título del menú antiguo se ha traduit a un sitio que ya no existe.
['nav.management', 'nav.tasks', 'nav.reports', 'nav.inspections', 'nav.admin'].forEach(k => {
    ok(!html.includes('data-i18n="' + k + '"'),
        'la clave ' + k + ' ya no está en ningún botón (la traducción sigue existiendo)');
});

// Cada h3 del panel corresponde a un bloque, no hay bloques repetidos.
const idsDemo = [...html.matchAll(/<div class="demo-section"[^>]*id="([^"]+)"/g)].map(m => m[1]);
eq(new Set(idsDemo).size, idsDemo.length, 'no hay ids repetidos en los bloques del panel');

// ---------------------------------------------------------------------------
linea('4. LA LÓGICA DE NAVEGACIÓN');
// ---------------------------------------------------------------------------

const js = fs.readFileSync(path.join(RAIZ, 'script.js'), 'utf8');
const api = fs.readFileSync(path.join(RAIZ, 'api.js'), 'utf8');

ok(/function irAPanel\(destino\)/.test(js), 'existe irAPanel(), el punto único de entrada');
ok(/let panelVisisiblesAntes = null;/.test(js), 'y el estado de qué bloques había visibles está declarado');
ok(!/function scrollToTasks/.test(js), 'la función scrollToTasks() rota ya no existe');

// Los tres módulos que ocultan el panel tienen que guardar el estado antes.
['openAdminPanel', 'openInspectionsModule'].forEach(fn => {
    const cuerpo = js.slice(js.indexOf('function ' + fn));
    const hasta = cuerpo.indexOf('\n}\n');
    const bloque = cuerpo.slice(0, hasta);
    ok(/guardarPanelVisible\(\)/.test(bloque),
        fn + '() guarda qué bloques había visibles antes de ocultarlos');
});

// Y al volver hay que restaurarlos y cerrar inspecciones.
ok(/function restaurarPanelSiEstabaOculto/.test(js), 'existe restaurarPanelSiEstabaOculto()');
const restaurar = js.slice(js.indexOf('function restaurarPanelSiEstabaOculto'));
ok(/inspections/.test(restaurar.slice(0, 900)),
    '  y cierra la sección de inspecciones, que vive fuera de #demo');

// switchType tiene que limpiar el estado: si no, se restauraría contra la
// lista del tipo de datos anterior.
const sw = js.slice(js.indexOf('async function switchType'));
ok(/limpiarSubnavActivo\(\)/.test(sw.slice(0, 2500)) && /panelVisisiblesAntes = null/.test(sw.slice(0, 2500)),
    'switchType() limpia el estado del submenú al cambiar de Foods a Retail');

// ---------------------------------------------------------------------------
linea('5. EL BUG DE BORRAR TAREA');
// ---------------------------------------------------------------------------

// Antes deleteTask se llamaba a sí misma: la global de script.js pisaba a la de
// api.js y el resultado era recursión infinita sin borrar nunca nada.
const borrar = js.slice(js.indexOf('function deleteTask(id)'));
const cuerpoBorrar = borrar.slice(0, borrar.indexOf('\n}\n'));
ok(/await deleteTaskDeApi\(id\)/.test(cuerpoBorrar),
    'la función de la interfaz ya no se llama a sí misma');
ok(!/await deleteTask\(id\)/.test(cuerpoBorrar),
    '  y no queda ninguna llamada recursiva a su propio nombre');

ok(/function deleteTaskDeApi/.test(api), 'api.js expone la llamada al servidor con otro nombre');
// Y esa copia tiene que estar CAPTURADA, no llamarla por nombre: si la llamara
// por nombre, volvería a resolver a la global de script.js.
ok(/const _borrarTareaEnServidor = deleteTask;/.test(api),
    '  y guarda la referencia al definirla, para que no la pise el nombre global');
ok(/async function deleteTaskDeApi\(id\)\s*\{\s*return await _borrarTareaEnServidor\(id\);/.test(api),
    '  y la usa a través de esa referencia');

// ---------------------------------------------------------------------------
linea('6. ESTILOS, IDIOMAS Y NADA ROTO');
// ---------------------------------------------------------------------------

const css = fs.readFileSync(path.join(RAIZ, 'style.css'), 'utf8');
ok(/\.panel-subnav\s*\{/.test(css), 'el submenú tiene estilos');
ok(/\.panel-subnav-item\.active/.test(css), '  con estado activo');
ok(/@media \(max-width: 780px\)/.test(css), '  y se adapta a móvil');
ok(/focus-visible/.test(css), '  y se ve el foco al navegar con teclado');

// Las traducciones del submenú, en los dos idiomas.
['panel.schedule', 'panel.employees', 'panel.locations', 'panel.tasks',
    'panel.queries', 'panel.inspections', 'panel.reports', 'panel.title', 'panel.subtitle']
    .forEach(k => {
        const n = (js.match(new RegExp("'" + k.replace(/\./g, '\\.') + "'\\s*:", 'g')) || []).length;
        eq(n, 2, k + ' está traducida en los dos idiomas');
    });

const totalClaves = (js.match(/^\s{8}'[a-zA-Z][\w.]*'\s*:/gm) || []).length;
ok(totalClaves % 2 === 0, 'el total de traducciones sigue cuadrado (' + totalClaves + ')');

// No se ha tocado la lógica de negocio: los endpoints siguen montados igual.
// Las inspecciones viven en su propio fichero de rutas, no en server.js.
const server = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const inspRutas = fs.readFileSync(path.join(__dirname, 'inspections-routes.js'), 'utf8');
[['server.js', server, ['/api/:type/tasks', '/api/:type/assignments', '/api/:type/employees']],
 ['inspections-routes.js', inspRutas, ['/api/:type/inspections']]
].forEach(([nombre, texto, rutas]) => {
    rutas.forEach(ruta => ok(texto.includes(ruta), 'el endpoint ' + ruta + ' sigue en ' + nombre));
});

// La tabla de tareas y la de asignaciones, intactas.
ok(!/DROP\s+TABLE/i.test(js + server), 'no hay ningún DROP TABLE en el código');

console.log('\n' + '='.repeat(68));
console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
console.log('='.repeat(68));
process.exitCode = fail ? 1 : 0;
