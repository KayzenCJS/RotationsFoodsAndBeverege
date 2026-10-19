// ============================================================================
//  EL INTÉRPRETE DE PREGUNTAS
// ============================================================================
//  La pestaña "Por Empleado" acepta preguntas sueltas. Si la pregunta va de
//  gente entrenada en una localización, tiene que saber a cuál se refiere.
//
//  Aquí se prueba solo el reparto: qué localización se saca de una frase. El resto
//  (pintar, filtrar) se prueba en el navegador contra la aplicación real.
//
//  El módulo del navegador se carga en Node con los mínimos globales que
//  necesita al definirse, para poder probar la función sin montar un DOM.
// ============================================================================

// Lo que queries.js necesita del navegador al cargarse.
global.window = {};
global.document = { getElementById: () => null, querySelectorAll: () => [] };

// normalizeQuery vive en script.js, que es un fichero del navegador y aqui no se
// carga. Se reproduce con su misma implementacion: minusculas, sin acentos y
// con los espacios normalizados.
global.normalizeQuery = function (text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const { localizacionDeLaPregunta } = require('../queries.js');

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

// Las localizaciones reales, con los nombres tal como estan en la base.
//
// Dunkin' Donuts NO se incluye: se retiro del sistema y ya no esta en el
// catalogo. Si lo metieras aqui, la prueba del interprete de preguntas pasaria
// con una localizacion que en realidad no existe. Que no lo encuentre se
// comprueba mas abajo.
const LOCS = [
    { id: 'pixie-kitchen', name: 'Pixie Kitchen' },
    { id: 'guard-house-snacks', name: 'Guard House Snacks' },
    { id: 'barnyard-pizza', name: 'Barnyard Pizza' },
    { id: 'food-fair', name: 'Food Fair' },
    { id: 'dutch-village-ice-cream', name: 'Dutch Village Ice Cream Shop' },
    { id: 'slush-factory', name: 'Slush Factory' },
    { id: 'dippin-dots', name: "Dippin' Dots" },
    { id: 'farm-stand', name: 'The Farm Stand' },
    { id: 'world-pavilion', name: 'World Pavilion' },
    { id: 'poblano-cantina', name: 'Poblano Cantina' },
    { id: 'bistro', name: 'Bistro' },
    { id: 'living-shores', name: 'Living Shores' },
    { id: 'teddys-oasis', name: "Teddy's at Oasis" }
];

console.log('\n=== EL INTÉRPRETE DE PREGUNTAS ===\n');

console.log('  --- Las preguntas del encargo ---');
const DEL_ENCARGO = [
    ['¿Quiénes están entrenados en Pixie?', 'pixie-kitchen'],
    ['¿Qué empleados pueden trabajar en Food Fair según sus locaciones entrenadas?', 'food-fair'],
    ['Muéstrame todas las personas entrenadas en Barnyard', 'barnyard-pizza'],
    ['¿Cuántos empleados están entrenados en Oasis?', 'teddys-oasis'],
    ['¿Qué personas entrenadas en World Pavilion tienen certificación de bartender?', 'world-pavilion']
];

for (const [pregunta, esperado] of DEL_ENCARGO) {
    const r = localizacionDeLaPregunta(pregunta, LOCS);
    eq(r && r.localizacion.id, esperado,
        '"' + pregunta.slice(0, 44) + '" -> ' + esperado);
}

console.log('\n  --- Como las escribiría otra persona ---');
const VARIANTES = [
    ['entrenados en pixie', 'pixie-kitchen'],
    ['PIXIE', 'pixie-kitchen'],
    ['quien esta entrenado en Guard House Snacks', 'guard-house-snacks'],
    ['gente de Dippin Dots', 'dippin-dots'],
    ['entrenadas en The Farm Stand', 'farm-stand'],
    ['farmstand', 'farm-stand'],
    ['entrenados en world pavilion', 'world-pavilion'],
    ['personal de living shores', 'living-shores'],
    ['entrenados en oasiss', 'teddys-oasis'],
    ['slush factory', 'slush-factory']
];

for (const [texto, esperado] of VARIANTES) {
    const r = localizacionDeLaPregunta(texto, LOCS);
    eq(r && r.localizacion.id, esperado, '"' + texto + '" -> ' + esperado);
}

console.log('\n  --- Lo que NO debe encontrar ---');
// Una pregunta que no va de localizaciones no debe inventar una.
for (const texto of ['¿quién es el mejor cocinero?', 'horario de hoy', 'buscar empleados', '']) {
    const r = localizacionDeLaPregunta(texto, LOCS);
    // "horario de hoy" no contiene ninguna palabra de localizacion. Si el
    // resultado es algo, tiene que ser por una coincidencia real.
    eq(r, null, '"' + texto + '" no se resuelve a ninguna localizacion');
}

// Las palabras de la propia pregunta no pueden decidir.
const soloRuido = localizacionDeLaPregunta('personas empleadas entrenadas en el parque', LOCS);
eq(soloRuido, null,
    'una pregunta sin nombre de localizacion no elige ninguna por las palabras sueltas');

console.log('\n  --- Con dos localizaciones en la misma frase ---');
// Gana la que aporta la palabra mas larga: es la mas especifica.
const dos = localizacionDeLaPregunta('entrenados en slush o en food fair', LOCS);
ok(dos && ['slush-factory', 'food-fair'].includes(dos.localizacion.id),
    'con dos localizaciones en la frase elige una de las dos, no una tercera');

console.log('\n  --- No le dan las palabras sueltas de la pregunta ---');
// "shores" esta en "living shores"; "shores" sola tambien debe encontrarlo,
// pero "guard" esta en "Guard House Snacks" y no debe encontrar medio parque.
const guard = localizacionDeLaPregunta('guard', LOCS);
eq(guard && guard.localizacion.id, 'guard-house-snacks', '"guard" encuentra Guard House Snacks');

// Y una palabra que no pertenece a nadie no inventa nada.
eq(localizacionDeLaPregunta('zzzz', LOCS), null, 'una palabra desconocida no devuelve nada');

// Una localizacion RETIRADA no se resuelve, porque no esta en el catalogo. Preguntar
// por ella tiene que salir con "no encuentro esa localizacion", no devolviendo a
// quien trained ahi en el pasado.
console.log('\n  --- Localizaciones retiradas ---');
eq(localizacionDeLaPregunta('quien esta entrenado en Dunkin Donuts', LOCS), null,
    'preguntar por una localizacion retirada no encuentra ninguna');
eq(localizacionDeLaPregunta('dunkin donuts', LOCS), null,
    '  tampoco escribiendo solo el nombre');

console.log('\n' + '='.repeat(68));
console.log('  ' + pass + ' pasaron, ' + fail + ' fallaron');
if (fail) { console.log('\nFALLOS:'); fallos.forEach((f, i) => console.log('  ' + (i + 1) + ') ' + f)); }
console.log('='.repeat(68));
process.exitCode = fail ? 1 : 0;