// ============================================================================
//  ASIGNACION AUTOMATICA INTELIGENTE
// ============================================================================
//  El boton "Asignar Automáticamente" ya no rellena huecos a lo bruto: pide al
//  servidor una PROPUESTA, la enseña y solo guarda si el usuario lo confirma.
//
//  Por que en dos pasos y no en uno:
//    - El reparto depende de datos que cambian (quien esta de libre, quien
//      tiene ya turno, las reglas de cada localizacion). Que se vea antes de
//      tocar la base es lo que evita un desastre silencioso.
//    - La propuesta es un borrador. Al guardarla, el backend vuelve a
//      comprobar los conflictos, porque entre que se vio y se confirmo puede
//      haber cambiado el horario.
//
//  El motor esta en el backend (backend/auto-assign.js). Aqui solo se pinta lo
//  que devuelve, porque el reparto tiene que usar la misma validacion de
//  conflictos que usa el resto del sistema, y esa esta en el servidor.
//
//  Lo que este modulo NO hace:
//    - No borra ni cambia ninguna asignacion existente.
//    - No desactiva la validacion de conflictos para que algo quepa.
//    - No inventa horarios: los que usa son los que devuelve el servidor, y el
//      servidor avisa cuando los deduce.
// ============================================================================

// La propuesta que hay en pantalla. Se guarda para poder confirmar despues sin
// tener que pedirla otra vez.
let autoAssignPropuesta = null;

// ---------------------------------------------------------------------------
//  Paso 1: pedir la propuesta
// ---------------------------------------------------------------------------
async function optimizeAssignment() {
    const fecha = document.getElementById('workDate')?.value;
    if (!fecha) {
        showNotification(t('autoAssign.sinFecha'), 'error');
        return;
    }

    const btn = document.querySelector('.optimization-btn');
    const original = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('autoAssign.calculando');
    }

    try {
        autoAssignPropuesta = await apiRequest('/auto-assign/preview', {
            method: 'POST',
            body: JSON.stringify({ date: fecha })
        });
        mostrarResumenAutoAssign(autoAssignPropuesta);
    } catch (error) {
        console.error('Error pidiendo la propuesta de asignacion:', error);
        showNotification(t('autoAssign.error') + ': ' + (error.message || error), 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }
}

// ---------------------------------------------------------------------------
//  Paso 2: enseñarla
// ---------------------------------------------------------------------------
// El resumen lleva, como pide el encargo: a quien se propone, donde, el
// horario, el motivo, que locales quedan cubiertos, cuales no, que puestos
// quedan sin cubrir y por que, a quien se ha descartado, y los avisos sobre lo
// que el algoritmo no sabe.
function mostrarResumenAutoAssign(p) {
    document.querySelectorAll('.auto-assign-modal').forEach(m => m.remove());

    const locales = Object.values(p.porLocalizacion || {});
    const cumplidos = locales.filter(v => v.cumple);
    const sinCumplir = locales.filter(v => !v.cumple);
    const cerrados = locales.filter(v => v.cerrada);

    const modal = document.createElement('div');
    modal.className = 'modal auto-assign-modal';
    // Los modales de la app vienen con display:none en el CSS y se abren
    // ponerles display:flex (asi lo hace el importador de Excel).
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="modal-content" style="max-width:1000px;max-height:92vh;overflow-y:auto;">

            <div class="results-header">
                <h4><i class="fas fa-robot"></i> ${esc(t('autoAssign.titulo'))}</h4>
                <button class="close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>

            ${resumenCabecera(p)}

            ${p.avisos && p.avisos.length ? `
                <div class="auto-assign-avisos">
                    <h5><i class="fas fa-circle-info"></i> ${esc(t('autoAssign.avisosTitulo'))}</h5>
                    ${p.avisos.map(a => `
                        <div class="auto-assign-aviso">
                            <div>${esc(a.texto)}</div>
                            <small>${esc(a.porque)}</small>
                        </div>`).join('')}
                </div>` : ''}

            ${p.compromisosDuplicados ? `
                <div class="auto-assign-nota">
                    <i class="fas fa-clone"></i>
                    ${esc(t('autoAssign.duplicados', { n: p.compromisosDuplicados }))}
                </div>` : ''}

            ${resumenCobertura(locales, cumplidos, sinCumplir, cerrados)}

            ${p.asignaciones.length ? `
                <div class="auto-assign-bloque">
                    <h5><i class="fas fa-user-plus"></i>
                        ${esc(t('autoAssign.propuestas', { n: p.asignaciones.length }))}</h5>
                    <table class="auto-assign-tabla">
                        <thead><tr>
                            <th>${esc(t('autoAssign.colEmpleado'))}</th>
                            <th>${esc(t('autoAssign.colLocalizacion'))}</th>
                            <th>${esc(t('autoAssign.colPuesto'))}</th>
                            <th>${esc(t('autoAssign.colHorario'))}</th>
                            <th>${esc(t('autoAssign.colMotivo'))}</th>
                        </tr></thead>
                        <tbody>
                            ${p.asignaciones.map(a => `
                                <tr${a.esIntercambio ? ' class="auto-assign-intercambio"' : ''}>
                                    <td>${esc(a.employee_name)}
                                        <small class="auto-assign-id">#${a.employee_id}</small></td>
                                    <td>${esc(a.locationName)}</td>
                                    <td>${esc(a.rol)}
                                        ${a.certificaciones && a.certificaciones.length
                                            ? `<small class="auto-assign-cert">${esc(a.certificaciones.join(', '))}</small>` : ''}</td>
                                    <td>${esc(a.start_time)} - ${esc(a.end_time)}</td>
                                    <td class="auto-assign-motivo">${esc(a.motivo)}
                                        ${a.avisos && a.avisos.length
                                            ? `<small class="auto-assign-avisos-lista">${esc(a.avisos.join(' · '))}</small>` : ''}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>` : ''}

            ${p.sinCubrir && p.sinCubrir.length ? `
                <div class="auto-assign-bloque auto-assign-huecos">
                    <h5><i class="fas fa-triangle-exclamation"></i>
                        ${esc(t('autoAssign.sinCubrir', { n: p.sinCubrir.length }))}</h5>
                    <table class="auto-assign-tabla">
                        <thead><tr>
                            <th>${esc(t('autoAssign.colLocalizacion'))}</th>
                            <th>${esc(t('autoAssign.colPuesto'))}</th>
                            <th>${esc(t('autoAssign.colHorario'))}</th>
                            <th>${esc(t('autoAssign.colPorQue'))}</th>
                        </tr></thead>
                        <tbody>
                            ${p.sinCubrir.map(h => `
                                <tr>
                                    <td>${esc(h.location)}</td>
                                    <td>${esc(h.rol)}</td>
                                    <td>${esc(h.inicio)} - ${esc(h.fin)}</td>
                                    <td>
                                        ${(h.sinCubrirPorque || []).map(x =>
                                            `<div><span class="auto-assign-cuenta">${x.personas}</span> ${esc(x.motivo)}</div>`).join('')}
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>` : ''}

            ${resumenDescartes(p)}

            <div class="auto-assign-pie">
                <div class="auto-assign-pie-nota">
                    <i class="fas fa-shield-halved"></i>
                    ${esc(t('autoAssign.noToca'))}
                </div>
                <div class="auto-assign-pie-botones">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        ${esc(t('common.cancel'))}
                    </button>
                    <button class="btn btn-primary" id="autoAssignConfirmBtn"
                            onclick="confirmarAutoAssign()" ${p.asignaciones.length ? '' : 'disabled'}>
                        <i class="fas fa-check"></i>
                        ${esc(t('autoAssign.guardar', { n: p.asignaciones.length }))}
                    </button>
                </div>
            </div>
        </div>`;

    document.body.appendChild(modal);
}

// ---------------------------------------------------------------------------
//  Partes del resumen
// ---------------------------------------------------------------------------
function resumenCabecera(p) {
    const clase = p.todoCubierto ? 'auto-assign-ok' : 'auto-assign-parcial';
    const titular = p.todoCubierto ? t('autoAssign.todoCubierto') : t('autoAssign.falta');

    return `
        <div class="auto-assign-cabecera ${clase}">
            <div class="auto-assign-cifras">
                <div class="auto-assign-cifra">
                    <span class="cifra">${p.totalCubiertos}/${p.totalPuestos}</span>
                    <span class="etiqueta">${esc(t('autoAssign.puestosCubiertos'))}</span>
                </div>
                <div class="auto-assign-cifra">
                    <span class="cifra">${p.compromisos}</span>
                    <span class="etiqueta">${esc(t('autoAssign.compromisosRespetados'))}</span>
                </div>
                <div class="auto-assign-cifra">
                    <span class="cifra">${(p.sinCubrir || []).length}</span>
                    <span class="etiqueta">${esc(t('autoAssign.puestosSinCubrir'))}</span>
                </div>
            </div>
            <div class="auto-assign-titular">${esc(titular)}</div>
        </div>`;
}

function resumenCobertura(locales, cumplidos, sinCumplir, cerrados) {
    if (!locales.length) return '';

    const fila = (v) => {
        const estado = v.cerrada
            ? `<span class="auto-assign-pill pill-cerrada">${esc(t('autoAssign.cerrada'))}</span>`
            : v.cumple
                ? `<span class="auto-assign-pill pill-ok">${esc(t('autoAssign.cumpleMinimo'))}</span>`
                : `<span class="auto-assign-pill pill-falta">${esc(t('autoAssign.faltaMinimo'))}</span>`;
        const detalle = v.cerrada ? '' : (v.faltan || [])
            .map(f => `${esc(f.rol)} ×${f.faltan}`
                + (f.certificaciones && f.certificaciones.length ? ` (${esc(f.certificaciones.join(', '))})` : ''))
            .join(', ');
        return `<tr>
            <td>${esc(v.nombre)}</td>
            <td>${v.cerrada ? '-' : v.min_employees}</td>
            <td>${estado}</td>
            <td class="auto-assign-motivo">${esc(detalle)}</td>
        </tr>`;
    };

    return `
        <div class="auto-assign-bloque">
            <h5><i class="fas fa-store"></i> ${esc(t('autoAssign.cobertura'))}</h5>
            <div class="auto-assign-tablero">
                <table class="auto-assign-tabla">
                    <thead><tr>
                        <th>${esc(t('autoAssign.colLocalizacion'))}</th>
                        <th>${esc(t('autoAssign.colMinimo'))}</th>
                        <th>${esc(t('autoAssign.colEstado'))}</th>
                        <th>${esc(t('autoAssign.colFalta'))}</th>
                    </tr></thead>
                    <tbody>${locales.map(fila).join('')}</tbody>
                </table>
            </div>
        </div>`;
}

// Los descartes pueden ser cientos (44 personas x 22 puestos). Se agrupan por
// motivo y se enseñan solo los grupos, que es lo que ayuda a decidir; el
// detalle persona a persona no cabe ni sirve en esta pantalla.
function resumenDescartes(p) {
    const d = p.descartes || [];
    if (!d.length) return '';

    const grupos = {};
    for (const x of d) {
        const clave = x.motivo;
        grupos[clave] = grupos[clave] || { total: 0, ejemplos: new Set() };
        grupos[clave].total++;
        if (grupos[clave].ejemplos.size < 4) grupos[clave].ejemplos.add(x.employee_name);
    }

    return `
        <div class="auto-assign-bloque">
            <h5><i class="fas fa-user-slash"></i>
                ${esc(t('autoAssign.descartados', { n: d.length }))}</h5>
            <ul class="auto-assign-descartes">
                ${Object.entries(grupos).sort((a, b) => b[1].total - a[1].total).map(([motivo, g]) => `
                    <li>
                        <span class="auto-assign-cuenta">${g.total}</span>
                        <span>${esc(motivo)}</span>
                        <small>${esc([...g.ejemplos].join(', '))}</small>
                    </li>`).join('')}
            </ul>
        </div>`;
}

// ---------------------------------------------------------------------------
//  Paso 3: guardar
// ---------------------------------------------------------------------------
// Se manda lo que se vio, no lo que el servidor recuerde: si alguien ha
// quitado una fila de la tabla, esa no se guarda.
async function confirmarAutoAssign() {
    if (!autoAssignPropuesta) return;

    const btn = document.getElementById('autoAssignConfirmBtn');
    const original = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('autoAssign.guardando');
    }

    try {
        const r = await apiRequest('/auto-assign/apply', {
            method: 'POST',
            body: JSON.stringify({
                date: autoAssignPropuesta.fecha,
                asignaciones: autoAssignPropuesta.asignaciones.map(a => ({
                    employee_id: a.employee_id,
                    location_id: a.location_id,
                    rol: a.rol,
                    start_time: a.start_time,
                    end_time: a.end_time
                }))
            })
        });

        document.querySelectorAll('.auto-assign-modal').forEach(m => m.remove());
        showNotification(r.mensaje, 'success');

        // Los rechazos se enseñan aparte: son conflictos que han aparecido
        // entre la propuesta y el guardado, y hay que saber cuales son.
        if (r.rechazadas && r.rechazadas.length) {
            r.rechazadas.forEach(x => showNotification(
                t('autoAssign.rechazada', { nombre: x.employee_name, motivo: x.motivo }), 'info'));
        }

        autoAssignPropuesta = null;
        await refreshAssignmentsPanel();
        await loadAssignmentsForDate(document.getElementById('workDate')?.value);
    } catch (error) {
        console.error('Error guardando la asignacion automatica:', error);
        showNotification(t('autoAssign.errorGuardar') + ': ' + (error.message || error), 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = original;
        }
    }
}

// ---------------------------------------------------------------------------
//  API
// ---------------------------------------------------------------------------
// Se anade al lado de las demas llamadas, para que quede todo junto.
async function fetchAutoAssignPreview(date) {
    return await apiRequest('/auto-assign/preview', {
        method: 'POST',
        body: JSON.stringify({ date })
    });
}

async function applyAutoAssign(date, asignaciones) {
    return await apiRequest('/auto-assign/apply', {
        method: 'POST',
        body: JSON.stringify({ date, asignaciones })
    });
}

window.optimizeAssignment = optimizeAssignment;
window.confirmarAutoAssign = confirmarAutoAssign;
window.fetchAutoAssignPreview = fetchAutoAssignPreview;
window.applyAutoAssign = applyAutoAssign;