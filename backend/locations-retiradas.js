// ============================================================================
//  LOCALIZACIONES RETIRADAS
// ============================================================================
//  Que significa "retirada" y por que no es lo mismo que "borrada".
//
//  EL MOTIVO POR EL QUE NO SE BORRA
//  -------------------------------
//  En la base, estas cuatro tablas apuntan a locations con ON DELETE CASCADE:
//
//      assignments                   -> el turno se borra solo
//      location_groups               -> la pertenencia al grupo se borra
//      employee_location_training    -> el entrenamiento se borra
//      location_required_roles       -> los roles exigidos se borran
//
//  Un DELETE FROM locations borraria en cascada el turno historico que esa
//  localizacion tuvo, sin avisar. Eso es exactamente lo que no hay que hacer:
//  el encargo pide quitar la localizacion de los catalogos activos y CONSERVAR
//  la historia.
//
//  En vez de borrarla, se marca como retirada:
//
//      locations.is_active = false
//
//  Y a partir de ahi:
//    - no sale de GET /locations, que es de donde el frontend saca las 134
//      referencias que tiene a la lista de localizaciones;
//    - no se puede elegir ni asignar: todos los puntos de escritura lo
//      comprueban antes de insertar;
//    - sigue existiendo para poder leer el pasado, que es justo lo que hay que
//      conservar.
//
//  LO QUE SI SE BORRA
//  ------------------
//  Las filas que son Normas y no Historia, que ademas dejarian datos
//  incoherentes: por ejemplo, que el grupo D siguiera teniendo asignada una
//  localizacion que ya no existe. Eso se limpia a proposito y se dice.
//
//  LO QUE NO SE TOCA
//  -----------------
//  La certificacion "dunkin-trained" (Dunkin Certified) NO es una localizacion:
//  es una habilidad que 27 empleados tienen registrada. Se deja intacta, con sus
//  registros y sus listas, porque es informacion de las personas y no del
//  edificio que se retira.
//
//  COMO SE USA
//  -----------
//      const retiradas = require('./locations-retiradas');
//
//      // en las lecturas de catalogo
//      await pool.query('SELECT * FROM locations WHERE ' + retiradas.SOLO_ACTIVAS);
//
//      // en las escrituras
//      await retiradas.exigirActiva(pool, location_id, res);
//
//  Todo en un solo sitio, para que anadir una retirada nueva sea cambiar la
//  tabla y nada mas.
// ============================================================================

// Columna y predicado. El nombre se usa en varias consultas, asi que vive aqui
// para que no se escriba a mano en quince sitios y se quede la mitad.
const COLUMNA = 'is_active';
const SOLO_ACTIVAS = `${COLUMNA} IS TRUE`;

// Version CON ALIAS, para cuando la consulta hace JOIN con otra tabla que
// tambien tiene una columna `is_active`.
//
// `staffing_rules` tiene la suya, asi que `JOIN locations ... AND is_active IS
// TRUE` falla con "column reference is_active is ambiguous". Con alias no hay
// duda de a que columna se refiere:
//
//     JOIN locations l ON l.id = x.location_id AND " + retiradas.activaDe('l')
//
// El alias es obligatorio: sin el, la funcion devuelve lo mismo que
// SOLO_ACTIVAS y se vuelve a caer en el mismo error.
function activaDe(alias) {
    if (!alias) return SOLO_ACTIVAS;
    return `${alias}.${COLUMNA} IS TRUE`;
}

// Se exporta como texto para poder meterlo en la migracion.
const AGREGAR_COLUMNA = `ALTER TABLE locations ADD COLUMN IF NOT EXISTS ${COLUMNA} boolean NOT NULL DEFAULT true`;

// Codigo de error propio, para que el frontend pueda distinguir "esta
// withdrawn" de "no existe" de "error de verdad".
const ERROR_RETIRADA = 'location_retired';

// -----------------------------------------------------------------------------
//  Escrituras: comprobar antes de insertar
// -----------------------------------------------------------------------------
// Devuelve la localizacion si esta activa, o null si:
//   - no existe con ese id, o
//   - existe pero esta retirada.
//
// Es null en los dos casos a proposito: desde fuera, una localizacion retirada
// tiene que ser indistinguible de una que no existe. Si se distinguiera,
// bastaria con preguntar por el id para saber queahi algo, y el objetivo de
// retirarla es que no aparezca en ningun sitio.
//
// La comprobacion se hace con una consulta suelta y no con un SELECT enorme
// porque es la que va en el camino de escritura y solo necesita una fila.
async function exigirActiva(pool, locationId, res) {
    if (!locationId) return null;

    const r = await pool.query(
        `SELECT id FROM locations WHERE id = $1 AND ${SOLO_ACTIVAS}`,
        [locationId]
    );
    if (r.rows.length) return r.rows[0];

    // Ya se sabe que no es utilizable. Se responde con un mensaje que explica
    // el motivo, porque "error" a secas deja a quien lo ve sin saber que hacer.
    if (res) {
        res.status(400).json({
            error: ERROR_RETIRADA,
            message: `La locación "${locationId}" ya no está disponible. Ha sido retirada del sistema, ` +
                     `así que no se pueden crear nuevas asignaciones ni registros en ella. ` +
                     `Los datos históricos se conservan y siguen siendo consultables.`
        });
    }
    return null;
}

// Igual que exigirActiva, pero para cuando el id viene en la URL y no en el
// cuerpo. Si la localizacion esta retirada, responder 404 y no 400 encaja con
// el resto de "no existe", y evita que se pueda enumerar lo que se ha retirado.
async function exigirActivaUrl(pool, locationId, res) {
    const loc = await exigirActiva(pool, locationId, null);
    if (loc || !res) return loc;
    res.status(404).json({
        error: ERROR_RETIRADA,
        message: `La locación "${locationId}" no existe o ya no está disponible.`
    });
    return null;
}

// -----------------------------------------------------------------------------
//  Lecturas
// -----------------------------------------------------------------------------
// Para cuando ya se ha traido la lista y se quiere filtrar en memoria.
function filtrarActivas(locs) {
    return (locs || []).filter(l => l[COLUMNA] !== false);
}

// ¿Esta esta localizacion retirada? Se usa para pintar "retirada" en vez de
// dejar un hueco cuando sale en un horario del pasado.
function estaRetirada(loc) {
    return !!loc && loc[COLUMNA] === false;
}

// Nombre que se ve cuando la localizacion ya no esta en el catalogo activo,
// por ejemplo un turno del pasado. Antes de la retirada, `nombre` venia de la
// lista; ahora puede no estar, asi que se cae en el id, que al menos no es un
// hueco en blanco.
function nombreONulo(loc, locationId) {
    if (loc && loc.name) return loc.name;
    return locationId ? `${locationId} (retirada)` : '(sin locación)';
}

module.exports = {
    COLUMNA,
    SOLO_ACTIVAS,
    activaDe,
    AGREGAR_COLUMNA,
    ERROR_RETIRADA,
    exigirActiva,
    exigirActivaUrl,
    filtrarActivas,
    estaRetirada,
    nombreONulo
};
