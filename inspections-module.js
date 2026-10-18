// ============================================================================
//  MODULO DE INSPECCIONES — FRONTEND
// ============================================================================
//  Reemplaza a las 6 funciones antiguas del modulo (openInspectionModal,
//  openFindingModal, openCorrectionModal y sus 3 formularios) por versiones que:
//
//   - usan comboboxes con busqueda en vez de escribir ids a mano
//   - generan el ID en el servidor (nunca se escribe)
//   - completan la locacion sola a partir de la inspeccion elegida
//   - validan antes de enviar y explican el fallo
//   - tienen Ver / Modificar / Eliminar en las tablas
//   - exportan el historial de auditoria a PDF
//
//  Mantiene el mismo HTML, las mismas clases y los mismos modales: solo cambia
//  como se rellenan y que se puede hacer con ellos.

// ---------------------------------------------------------------------------
//  Estado del modulo
// ---------------------------------------------------------------------------
const insp = {
    tipos: [],            // catalogo de tipos de inspeccion
    categorias: [],       // catalogo de categorias de hallazgo
    responsables: [],     // empleados que pueden atender un problema
    asignables: [],       // empleados (para buscar por nombre y apellido)
    locPorInspeccion: [], // inspections-by-location (el panel)
    editandoHallazgo: null,
    editandoCorreccion: null
};

// Quien esta usando la aplicacion. Se toma del rol que ya guardaba el proyecto,
// sin inventar un sistema de usuarios nuevo.
const inspActor = () => Number(localStorage.getItem('currentUserId') || 1);

// ---------------------------------------------------------------------------
//  Carga de catalogos
// ---------------------------------------------------------------------------
// Se llama una vez y de nuevo al abrir cada modal, para que un tipo o una
// categoria nueva que se haya creado aparezcan sin recargar la pagina.
async function cargarCatalogosInspecciones() {
    const base = `${API_BASE_URL}/${currentType}`;
    const pedir = async (ruta) => {
        const r = await fetch(base + ruta);
        return r.ok ? r.json() : [];
    };
    try {
        const [tipos, categorias, responsables, asignables] = await Promise.all([
            pedir('/inspection-types'),
            pedir('/finding-categories'),
            pedir('/inspection-assignees'),
            pedir('/inspection-assignees')
        ]);
        insp.tipos = tipos || [];
        insp.categorias = categorias || [];
        insp.responsables = responsables || [];
        insp.asignables = asignables || [];
    } catch (e) {
        console.error('No se pudieron cargar los catálogos de inspecciones:', e);
    }
}

// Opciones del combobox de personas. Primero los que pueden atender.
function opcionesResponsables() {
    return insp.responsables.map(e => ({
        id: e.id,
        label: e.name,
        sub: getRoleName(e.role) + (e.puede_atender ? '  ·  puede atender' : ''),
        meta: e.name
    }));
}

function opcionesUbicaciones() {
    return (locations || []).map(l => ({
        id: l.id,
        label: l.name,
        sub: l.id,
        meta: l.id + ' ' + l.name
    }));
}

// Etiqueta de una inspeccion: ID + locacion + fecha + tipo. Es lo que permite
// distinguir una de otra en el combobox.
function etiquetaInspeccion(i) {
    const loc = (i.location_name || i.location_id || 'sin locación');
    return `${i.inspection_number || ('#' + i.id)}  ·  ${loc}  ·  ${i.inspection_date || ''}  ·  ${i.inspection_type || ''}`;
}

function opcionesInspecciones(lista) {
    return (lista || inspections || []).map(i => ({
        id: i.id,
        label: i.inspection_number || ('#' + i.id),
        sub: etiquetaInspeccion(i),
        meta: [i.inspection_number, i.location_name, i.location_id, i.inspection_date, i.inspection_type].filter(Boolean).join(' ')
    }));
}

// ---------------------------------------------------------------------------
//  INSPECCIONES
// ---------------------------------------------------------------------------
async function openInspectionModal(inspeccion) {
    if (!hasRole('supervisor')) { showNotification(t('confirm.permissionSupervisor'), 'error'); return; }
    await cargarCatalogosInspecciones();

    insp.editandoHallazgo = null;
    const esEdicion = !!inspeccion;

    document.getElementById('inspectionModalTitle').textContent =
        esEdicion ? t('insp.editInspection') : t('inspections.newInspection');

    // El ID lo pone el sistema. En edicion se muestra el que ya tiene.
    const num = document.getElementById('inspectionNumberPreview');
    num.textContent = esEdicion ? (inspeccion.inspection_number || '') : '';

    const fecha = document.getElementById('inspectionDate');
    const hora = document.getElementById('inspectionTime');
    const notas = document.getElementById('inspectionNotes');

    const ahora = new Date();
    fecha.value = inspeccion ? (inspeccion.inspection_date || '').slice(0, 10)
                              : getCurrentDateInTimezone();
    hora.value = inspeccion
        ? ((inspeccion.inspection_time || '').toString().slice(0, 5) || '')
        : ahora.toTimeString().slice(0, 5);
    notas.value = inspeccion ? (inspeccion.general_notes || '') : '';

    // --- Inspector: combobox de empleados, con opcion de escribir uno externo
    const cInsp = InspectorCombo.crear(
        document.getElementById('inspectionInspectorBox'),
        insp.responsables.map(e => ({ id: e.id, label: e.name, sub: getRoleName(e.role), meta: e.name })),
        { oculto: document.getElementById('inspectionInspector'),
          placeholder: t('insp.searchInspector'), permiteLibre: true }
    );
    if (inspeccion) {
        const nombre = inspeccion.inspector_name_resuelta || inspeccion.inspector_name;
        if (inspeccion.inspector_id && await nombreDeInspector(inspeccion.inspector_id)) {
            cInsp.setValue(inspeccion.inspector_id);
        } else {
            cInsp.setValue(null, nombre || (inspeccion.inspector_id ? String(inspeccion.inspector_id) : ''));
        }
    }

    // --- Tipo: combobox sobre el catalogo
    const cTipo = InspectorCombo.crear(
        document.getElementById('inspectionTypeBox'),
        insp.tipos.map(x => ({ id: x.key, label: nombreTipo(x), sub: x.description || '', meta: x.key })),
        { oculto: document.getElementById('inspectionType'),
          placeholder: t('insp.searchType'), permiteLibre: false }
    );
    if (inspeccion && inspeccion.inspection_type) cTipo.setValue(inspeccion.inspection_type);

    // --- Locacion: combobox de las locaciones reales
    const cLoc = InspectorCombo.crear(
        document.getElementById('inspectionLocationBox'),
        opcionesUbicaciones(),
        { oculto: document.getElementById('inspectionLocation'),
          placeholder: t('insp.searchLocation'), permiteLibre: false }
    );
    if (inspeccion && inspeccion.location_id) cLoc.setValue(inspeccion.location_id);

    document.getElementById('inspectionForm').dataset.editandoId = inspeccion ? inspeccion.id : '';

    const form = document.getElementById('inspectionForm');
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = esEdicion ? t('insp.saveChanges') : t('insp.saveInspection');

    document.getElementById('inspectionModal').style.display = 'block';
}

function nombreTipo(x) {
    if (!x) return '';
    return (currentLang === 'en' ? (x.name_en || x.name_es) : x.name_es) || x.key;
}

async function nombreDeInspector(id) {
    if (!id) return null;
    const e = insp.responsables.find(x => x.id === Number(id));
    return e ? e.name : null;
}

function closeInspectionModal() {
    document.getElementById('inspectionModal').style.display = 'none';
    const f = document.getElementById('inspectionForm');
    f.dataset.editandoId = '';
    document.getElementById('inspectionNumberPreview').textContent = '';
}

// --- Alta de un tipo de inspeccion nuevo -------------------------------------
// No modifica los anteriores: el catalogo crece.
function showNewInspectionType() {
    const v = prompt(t('insp.newTypePrompt'));
    if (!v || !v.trim()) return;
    const nombre = v.trim();
    const clave = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!clave) { showNotification(t('insp.typeInvalid'), 'error'); return; }

    fetch(`${API_BASE_URL}/${currentType}/inspection-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: clave, name_es: nombre, name_en: nombre })
    }).then(async (r) => {
        if (!r.ok) throw new Error('No se pudo crear el tipo');
        await cargarCatalogosInspecciones();
        openInspectionModal(insp.editandoHallazgo && document.getElementById('inspectionForm').dataset.editandoId
            ? await getInspection(document.getElementById('inspectionForm').dataset.editandoId) : null);
        const c = document.querySelector('#inspectionTypeBox .insp-cbx');
        if (c && c._inspCbx) c._inspCbx.setValue(clave);
        document.getElementById('inspectionType').value = clave;
        showNotification(t('insp.typeCreated'), 'success');
    }).catch(e => showNotification(e.message, 'error'));
}

async function getInspection(id) {
    if (!id) return null;
    const r = await fetch(`${API_BASE_URL}/${currentType}/inspections/${id}`);
    return r.ok ? r.json() : null;
}

// --- Guardar inspeccion ------------------------------------------------------
document.getElementById('inspectionForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = e.target;
    const editandoId = form.dataset.editandoId || '';
    const fecha = document.getElementById('inspectionDate').value;
    const hora = document.getElementById('inspectionTime').value;
    const inspectorId = document.getElementById('inspectionInspector').value;
    const inspectorTexto = document.querySelector('#inspectionInspectorBox .insp-cbx')._inspCbx.getTexto();
    const tipo = document.getElementById('inspectionType').value;
    const locacion = document.getElementById('inspectionLocation').value;
    const notas = document.getElementById('inspectionNotes').value.trim();

    if (!fecha) { showNotification(t('insp.dateRequired'), 'error'); return; }
    if (!tipo) { showNotification(t('insp.typeRequired'), 'error'); return; }
    if (!locacion) { showNotification(t('insp.locationRequired'), 'error'); return; }
    if (!inspectorId && !inspectorTexto) { showNotification(t('insp.inspectorRequired'), 'error'); return; }

    const payload = {
        inspection_date: fecha,
        inspection_time: hora || null,
        inspection_type: tipo,
        location_id: locacion,
        general_notes: notas || null,
        created_by: inspActor()
    };
    if (inspectorId) payload.inspector_id = Number(inspectorId);
    else if (inspectorTexto) payload.inspector_name = inspectorTexto;

    try {
        const url = editandoId
            ? `${API_BASE_URL}/${currentType}/inspections/${editandoId}`
            : `${API_BASE_URL}/${currentType}/inspections`;
        const res = await fetch(url, {
            method: editandoId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            showNotification(data && data.message ? data.message : (t('notify.errorSaveInspection')), 'error');
            return;
        }
        if (data && data.avisos && data.avisos.includes('inspector_not_in_employees')) {
            showNotification(t('insp.inspectorNotRegistered'), 'info');
        } else {
            showNotification(t(editandoId ? 'insp.inspectionUpdated' : 'notify.breakSavedInspection'), 'success');
        }
        closeInspectionModal();
        await recargarInspecciones();
    } catch (err) {
        console.error(err);
        showNotification(t('notify.errorSaveInspection'), 'error');
    }
});

// ---------------------------------------------------------------------------
//  HALLAZGOS
// ---------------------------------------------------------------------------
async function openFindingModal(inspeccionId, hallazgo) {
    if (!hasRole('op')) { showNotification(t('confirm.permissionOp'), 'error'); return; }
    await cargarCatalogosInspecciones();
    if (!inspections || !inspections.length) {
        showNotification(t('insp.noInspections'), 'error');
        return;
    }

    insp.editandoHallazgo = hallazgo || null;
    const esEdicion = !!hallazgo;

    const warn = document.getElementById('findingEditWarn');
    warn.hidden = !esEdicion;
    if (esEdicion) warn.textContent = t('insp.editingFinding');

    document.getElementById('findingIdPreview').textContent =
        esEdicion ? ('#' + hallazgo.id) : '';
    document.getElementById('findingModalTitle').textContent =
        esEdicion ? t('insp.editFinding') : t('inspections.addFinding');
    document.getElementById('findingSubmitBtn').textContent =
        esEdicion ? t('insp.saveChanges') : t('insp.saveFinding');

    // --- Inspeccion: combobox. Si viene de una inspeccion abierta, se fija.
    const cInsp = InspectorCombo.crear(
        document.getElementById('findingInspectionBox'),
        opcionesInspecciones(),
        { oculto: document.getElementById('findingInspectionId'),
          placeholder: t('insp.searchInspection'), permiteLibre: false }
    );
    const inspInicial = inspeccionValido(inspeccionId)
        || (hallazgo && inspeccionValido(hallazgo.inspection_id) ? hallazgo.inspection_id : null)
        || (inspections[0] && inspections[0].id);
    if (inspInicial) cInsp.setValue(inspInicial);

    // --- Locacion: se completa sola con la de la inspeccion elegida.
    const cLoc = InspectorCombo.crear(
        document.getElementById('findingLocationBox'),
        opcionesUbicaciones(),
        { oculto: document.getElementById('findingLocationId'),
          placeholder: t('insp.searchLocation'), permiteLibre: false }
    );
    document.getElementById('findingLocationId').readOnly = true;

    const sincronizarLocacion = () => {
        const id = document.getElementById('findingInspectionId').value;
        const i = (inspections || []).find(x => String(x.id) === String(id));
        if (i && i.location_id) cLoc.setValue(i.location_id);
        else cLoc.limpiar();
    };
    document.getElementById('findingInspectionId').addEventListener('change', sincronizarLocacion);

    // --- Categoria: depende del tipo de la inspeccion elegida.
    const cCat = InspectorCombo.crear(
        document.getElementById('findingCategoryBox'),
        categoriasParaTipo(document.getElementById('inspectionType').value),
        { oculto: document.getElementById('findingCategory'),
          placeholder: t('insp.searchCategory'), permiteLibre: true }
    );

    // --- Asignado a
    const cAsig = InspectorCombo.crear(
        document.getElementById('findingAssignedToBox'),
        opcionesResponsables(),
        { oculto: document.getElementById('findingAssignedTo'),
          placeholder: t('insp.searchAssignee'), permiteLibre: true }
    );

    document.getElementById('findingTitle').value = hallazgo ? (hallazgo.title || '') : '';
    document.getElementById('findingDescription').value = hallazgo ? (hallazgo.description || '') : '';
    document.getElementById('findingRecommendedAction').value = hallazgo ? (hallazgo.recommended_action || '') : '';
    document.getElementById('findingPriority').value = hallazgo ? (hallazgo.priority || 'medium') : 'medium';
    document.getElementById('findingStatus').value = hallazgo ? (hallazgo.status || 'warning') : 'warning';
    document.getElementById('findingDueDate').value = hallazgo && hallazgo.due_date ? hallazgo.due_date.slice(0, 10) : '';

    sincronizarLocacion();
    if (hallazgo) {
        if (hallazgo.category) cCat.setValue(null, hallazgo.category);
        if (hallazgo.assigned_to) cAsig.setValue(hallazgo.assigned_to);
        else if (hallazgo.assigned_to_name) cAsig.setValue(null, hallazgo.assigned_to_name);
    }

    document.getElementById('findingModal').style.display = 'block';
}

// Un id solo vale si de verdad esta en la lista. Si no, se cae al siguiente
// candidato en vez de dejar el campo en blanco sin avisar: un combobox vacio
// parece "todavia no has elegido" cuando en realidad el id no existe.
function inspeccionValido(id) {
    if (!id) return null;
    return (inspections || []).some(i => String(i.id) === String(id)) ? id : null;
}

function hallazgoValido(id) {
    if (!id) return null;
    return (findings || []).some(f => String(f.id) === String(id)) ? id : null;
}

function closeFindingModal() {
    document.getElementById('findingModal').style.display = 'none';
    insp.editandoHallazgo = null;
}

// Categorias del tipo de inspeccion elegido. Las de tipo especifico van
// primero; las generales despues. Si no hay ninguna, se puede escribir una.
function categoriasParaTipo(tipo) {
    const todas = insp.categorias || [];
    const delTipo = tipo ? todas.filter(c => c.type_key === tipo) : [];
    const generales = todas.filter(c => !c.type_key);
    const otras = todas.filter(c => c.type_key && c.type_key !== tipo);
    return [...delTipo, ...generales, ...otras].map(c => ({
        id: c.id, label: c.name,
        sub: c.type_key ? (c.type_key + (c.usos ? '  ·  ' + c.usos + ' hallazgo(s)' : ''))
                       : (c.usos ? 'todos los tipos  ·  ' + c.usos + ' hallazgo(s)' : 'todos los tipos'),
        meta: c.name
    }));
}

document.getElementById('findingForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const hallazgo = insp.editandoHallazgo;

    const inspeccionId = document.getElementById('findingInspectionId').value;
    const locacion = document.getElementById('findingLocationId').value;
    const titulo = document.getElementById('findingTitle').value.trim();
    const categoriaId = document.getElementById('findingCategory').value;
    const categoriaTexto = document.querySelector('#findingCategoryBox .insp-cbx')._inspCbx.getTexto();
    const asignadoId = document.getElementById('findingAssignedTo').value;
    const asignadoTexto = document.querySelector('#findingAssignedToBox .insp-cbx')._inspCbx.getTexto();

    if (!inspeccionId) { showNotification(t('insp.inspectionRequired'), 'error'); return; }
    if (!titulo) { showNotification(t('insp.titleRequired'), 'error'); return; }
    if (!categoriaId && !categoriaTexto) { showNotification(t('insp.categoryRequired'), 'error'); return; }

    const cuerpo = {
        title: titulo,
        description: document.getElementById('findingDescription').value.trim() || null,
        priority: document.getElementById('findingPriority').value,
        status: document.getElementById('findingStatus').value,
        recommended_action: document.getElementById('findingRecommendedAction').value.trim() || null,
        due_date: document.getElementById('findingDueDate').value || null,
        changed_by: inspActor()
    };

    // La categoria: id del catalogo o el texto escrito a mano.
    if (categoriaId) {
        const c = (insp.categorias || []).find(x => String(x.id) === String(categoriaId));
        cuerpo.category = c ? c.name : categoriaTexto;
    } else {
        cuerpo.category = categoriaTexto;
    }

    // El responsable: id de empleado, o nombre externo.
    if (asignadoId) cuerpo.assigned_to = Number(asignadoId);
    else if (asignadoTexto) cuerpo.assigned_to_name = asignadoTexto;

    try {
        if (hallazgo) {
            // Al modificar NO se cambia la inspeccion: el hallazgo sigue
            // colgando de la misma, y su locacion tampoco se toca.
            const r = await fetch(`${API_BASE_URL}/${currentType}/findings/${hallazgo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cuerpo)
            });
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'error');
            showNotification(t('insp.findingUpdated'), 'success');
        } else {
            cuerpo.location_id = locacion || null;
            cuerpo.created_by = inspActor();
            const r = await fetch(`${API_BASE_URL}/${currentType}/inspections/${inspeccionId}/findings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cuerpo)
            });
            const d = await r.json().catch(() => null);
            if (!r.ok) throw new Error((d && d.message) || 'error');
            document.getElementById('findingIdPreview').textContent = '#' + d.id;
            showNotification(t('notify.findingSaved'), 'success');
        }
        closeFindingModal();
        await recargarInspecciones();
    } catch (err) {
        console.error(err);
        showNotification(err.message === 'error' ? t('notify.errorSaveFinding') : err.message, 'error');
    }
});

// --- Ver / Modificar / Eliminar hallazgo -------------------------------------
// Fechas en formato legible. La base las devuelve en ISO y una fecha sin
// formatear en una pantalla de consulta no se lee de un vistazo.
// Acepta tanto un timestamp completo como una fecha suelta (YYYY-MM-DD).
function fechaLegible(v) {
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v).slice(0, 10);
    return d.toLocaleString('es-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(', ', ' · ');
}

function viewFinding(id) {
    fetch(`${API_BASE_URL}/${currentType}/findings/${id}`)
        .then(r => r.json())
        .then(f => {
            const loc = f.location_name || f.location_id || '—';
            const cuerpo = `
                <p style="color:var(--text-secondary);margin-top:0.5rem;">
                    <strong>${esc(f.inspection_number || '')}</strong> · ${esc(loc)} · ${esc(f.inspection_date || '')}
                </p>
                <div class="detail-card" style="margin-top:1rem;">
                    <h4>${esc(f.title || '')}</h4>
                    <p><strong>ID:</strong> ${f.id}</p>
                    <p><strong>Categoría:</strong> ${esc(f.category || '—')}</p>
                    <p><strong>Prioridad:</strong> ${esc(f.priority || '—')}</p>
                    <p><strong>Estado:</strong> ${esc(f.status || '—')}</p>
                    <p><strong>Asignado a:</strong> ${esc(f.assigned_display || '—')}</p>
                    <p><strong>Creado:</strong> ${esc(fechaLegible(f.created_at))}</p>
                    <p><strong>Fecha límite:</strong> ${esc(f.due_date || '—')}</p>
                </div>
                ${f.description ? `<div class="detail-card" style="margin-top:0.75rem;"><h4>Descripción</h4><p style="white-space:pre-wrap;">${esc(f.description)}</p></div>` : ''}
                ${f.recommended_action ? `<div class="detail-card" style="margin-top:0.75rem;"><h4>Acción recomendada</h4><p style="white-space:pre-wrap;">${esc(f.recommended_action)}</p></div>` : ''}
                <div class="detail-card" style="margin-top:0.75rem;">
                    <h4>Correcciones (${(f.corrections || []).length})</h4>
                    ${(f.corrections || []).length
                        ? f.corrections.map(c => `<p><strong>#${c.id}</strong> ${esc(fechaLegible(c.correction_date))} ·
                            ${esc(c.assigned_display || '—')} · ${esc(c.status || '')}
                            <br><span style="white-space:pre-wrap;">${esc(c.description || '')}</span></p>`).join('')
                        : '<p class="text-muted">Sin correcciones registradas.</p>'}
                </div>
                <div class="detail-card" style="margin-top:0.75rem;">
                    <h4>Historial (${(f.history || []).length})</h4>
                    ${(f.history || []).length
                        ? f.history.map(h => `<p style="font-size:0.85rem;">${esc(fechaLegible(h.changed_at))} ·
                            ${esc(h.previous_status || '—')} → ${esc(h.new_status || '—')}
                            ${h.comment ? '<br>' + esc(h.comment) : ''}</p>`).join('')
                        : '<p class="text-muted">Sin cambios registrados.</p>'}
                </div>`;
            abrirModalDetalle(t('insp.findingDetail'), cuerpo);
        })
        .catch(e => showNotification(t('notify.errorLoad'), 'error'));
}

function editFinding(id) {
    const f = (findings || []).find(x => x.id === id);
    if (!f) { showNotification(t('insp.findingNotFound'), 'error'); return; }
    openFindingModal(f.inspection_id, f);
}

function deleteFinding(id) {
    const f = (findings || []).find(x => x.id === id);
    if (!confirm(t('insp.confirmDeleteFinding'))) return;
    fetch(`${API_BASE_URL}/${currentType}/findings/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_by: inspActor() })
    }).then(async (r) => {
        if (!r.ok) throw new Error('error');
        const d = await r.json().catch(() => ({}));
        showNotification(d.message || t('insp.findingRemoved'), 'success');
        await recargarInspecciones();
    }).catch(() => showNotification(t('insp.errorDeleteFinding'), 'error'));
}

// ---------------------------------------------------------------------------
//  CORRECCIONES
// ---------------------------------------------------------------------------
async function openCorrectionModal(findingId, correccion) {
    if (!hasRole('supervisor')) { showNotification(t('confirm.permissionSupervisor'), 'error'); return; }
    await cargarCatalogosInspecciones();
    if (!findings || !findings.length) {
        showNotification(t('insp.noFindings'), 'error');
        return;
    }

    insp.editandoCorreccion = correccion || null;
    const esEdicion = !!correccion;

    const warn = document.getElementById('correctionEditWarn');
    warn.hidden = !esEdicion;
    if (esEdicion) warn.textContent = t('insp.editingCorrection');

    document.getElementById('correctionModalTitle').textContent =
        esEdicion ? t('insp.editCorrection') : t('inspections.addCorrection');
    document.getElementById('correctionSubmitBtn').textContent =
        esEdicion ? t('insp.saveChanges') : t('insp.saveCorrection');

    // Combobox de hallazgos: se ven todos con su contexto (locacion + estado).
    const cHall = InspectorCombo.crear(
        document.getElementById('correctionFindingBox'),
        (findings || []).map(f => ({
            id: f.id,
            label: '#' + f.id + '  ' + (f.title || ''),
            sub: (f.location_name || f.location_id || '') + '  ·  ' + (f.status || '') +
                 (f.corrections ? '  ·  ' + f.corrections + ' corrección(es)' : ''),
            meta: [f.title, f.location_name, f.location_id, f.status].filter(Boolean).join(' ')
        })),
        { oculto: document.getElementById('correctionFindingId'),
          placeholder: t('insp.searchFinding'), permiteLibre: false }
    );
    const inicial = hallazgoValido(findingId)
        || (correccion && hallazgoValido(correccion.finding_id) ? correccion.finding_id : null)
        || (findings[0] && findings[0].id);
    if (inicial) cHall.setValue(inicial);

    const cAsig = InspectorCombo.crear(
        document.getElementById('correctionAssignedToBox'),
        opcionesResponsables(),
        { oculto: document.getElementById('correctionAssignedTo'),
          placeholder: t('insp.searchAssignee'), permiteLibre: true }
    );

    document.getElementById('correctionDescription').value = correccion ? (correccion.description || '') : '';
    document.getElementById('correctionStatus').value = correccion ? (correccion.status || 'pending') : 'pending';
    document.getElementById('correctionDate').value = correccion && correccion.correction_date
        ? correccion.correction_date.slice(0, 10) : getCurrentDateInTimezone();
    document.getElementById('correctionNotes').value = correccion ? (correccion.completion_notes || '') : '';

    if (correccion) {
        if (correccion.assigned_to) cAsig.setValue(correccion.assigned_to);
        else if (correccion.assigned_to_name) cAsig.setValue(null, correccion.assigned_to_name);
    }

    document.getElementById('correctionModal').style.display = 'block';
}

function closeCorrectionModal() {
    document.getElementById('correctionModal').style.display = 'none';
    insp.editandoCorreccion = null;
}

document.getElementById('correctionForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const correccion = insp.editandoCorreccion;

    const findingId = document.getElementById('correctionFindingId').value;
    const descripcion = document.getElementById('correctionDescription').value.trim();
    const asignadoId = document.getElementById('correctionAssignedTo').value;
    const asignadoTexto = document.querySelector('#correctionAssignedToBox .insp-cbx')._inspCbx.getTexto();

    if (!findingId) { showNotification(t('insp.findingRequired'), 'error'); return; }
    if (!descripcion) { showNotification(t('insp.actionRequired'), 'error'); return; }

    const cuerpo = {
        description: descripcion,
        status: document.getElementById('correctionStatus').value,
        correction_date: document.getElementById('correctionDate').value || null,
        completion_notes: document.getElementById('correctionNotes').value.trim() || null,
        changed_by: inspActor()
    };
    if (asignadoId) cuerpo.assigned_to = Number(asignadoId);
    else if (asignadoTexto) cuerpo.assigned_to_name = asignadoTexto;

    try {
        if (correccion) {
            const r = await fetch(`${API_BASE_URL}/${currentType}/corrections/${correccion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cuerpo)
            });
            if (!r.ok) throw new Error('error');
            showNotification(t('insp.correctionUpdated'), 'success');
        } else {
            const r = await fetch(`${API_BASE_URL}/${currentType}/findings/${findingId}/corrections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.assign({}, cuerpo, { created_by: inspActor() }))
            });
            if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || 'error');
            showNotification(t('notify.correctionSaved'), 'success');
        }
        closeCorrectionModal();
        await recargarInspecciones();
    } catch (err) {
        console.error(err);
        showNotification(err.message === 'error' ? t('notify.errorSaveCorrection') : err.message, 'error');
    }
});

function viewCorrection(id) {
    fetch(`${API_BASE_URL}/${currentType}/corrections`)
        .then(r => r.json())
        .then(lista => {
            const c = lista.find(x => x.id === id);
            if (!c) { showNotification(t('insp.correctionNotFound'), 'error'); return; }
            abrirModalDetalle(t('insp.correctionDetail'), `
                <div class="detail-card">
                    <p><strong>ID:</strong> ${c.id}</p>
                    <p><strong>Hallazgo:</strong> #${c.finding_id} · ${esc(c.finding_title || '')}</p>
                    <p><strong>Locación:</strong> ${esc(c.location_name || c.location_id || '—')}</p>
                    <p><strong>Inspección:</strong> ${esc(c.inspection_number || '—')}</p>
                    <p><strong>Fecha:</strong> ${esc(c.correction_date || '—')}</p>
                    <p><strong>Asignado a:</strong> ${esc(c.assigned_display || '—')}</p>
                    <p><strong>Estado:</strong> ${esc(c.status || '—')}</p>
                    <p><strong>Creada:</strong> ${esc(fechaLegible(c.created_at))}</p>
                </div>
                <div class="detail-card" style="margin-top:0.75rem;">
                    <h4>Acción correctiva</h4><p style="white-space:pre-wrap;">${esc(c.description || '')}</p>
                </div>
                ${c.completion_notes ? `<div class="detail-card" style="margin-top:0.75rem;"><h4>Notas de cierre</h4><p style="white-space:pre-wrap;">${esc(c.completion_notes)}</p></div>` : ''}`);
        })
        .catch(() => showNotification(t('notify.errorLoad'), 'error'));
}

function editCorrection(id) {
    fetch(`${API_BASE_URL}/${currentType}/corrections`)
        .then(r => r.json())
        .then(lista => {
            const c = lista.find(x => x.id === id);
            if (!c) { showNotification(t('insp.correctionNotFound'), 'error'); return; }
            openCorrectionModal(c.finding_id, c);
        })
        .catch(() => showNotification(t('notify.errorLoad'), 'error'));
}

function deleteCorrection(id) {
    if (!confirm(t('insp.confirmDeleteCorrection'))) return;
    fetch(`${API_BASE_URL}/${currentType}/corrections/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_by: inspActor() })
    }).then(async (r) => {
        if (!r.ok) throw new Error('error');
        const d = await r.json().catch(() => ({}));
        showNotification(d.message || t('insp.correctionRemoved'), 'success');
        await recargarInspecciones();
    }).catch(() => showNotification(t('insp.errorDeleteCorrection'), 'error'));
}

// ---------------------------------------------------------------------------
//  PDF
// ---------------------------------------------------------------------------
// Exporta lo que hay en pantalla. Los filtros del panel se aplican tal cual; si
// no hay ninguno, el documento sale con todo el historial y lo dice en la
// cabecera.
function exportAuditHistoryPDF() {
    const btn = document.getElementById('exportAuditPdfBtn');
    const params = new URLSearchParams();
    const poner = (campo, valor) => { if (valor) params.set(campo, valor); };

    poner('date_from', document.getElementById('auditDateFrom')?.value);
    poner('date_to', document.getElementById('auditDateTo')?.value);
    poner('location_id', document.getElementById('auditLocationFilter')?.value);
    poner('status', document.getElementById('auditStatusFilter')?.value);

    const url = `${API_BASE_URL}/${currentType}/inspections-audit.pdf?${params.toString()}`;
    const original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('insp.generatingPdf'); }

    // El PDF lo genera el servidor. Se baja con un enlace temporal para que el
    // navegador lo guarde con el nombre que pone el servidor.
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
        showNotification(t('insp.pdfStarted'), 'success');
    }, 1500);
}

function actualizarAlcancePdf() {
    const el = document.getElementById('auditScopeHint');
    if (!el) return;
    const filtros = [];
    const desde = document.getElementById('auditDateFrom')?.value;
    const hasta = document.getElementById('auditDateTo')?.value;
    const loc = document.getElementById('auditLocationFilter')?.value;
    const est = document.getElementById('auditStatusFilter')?.value;
    if (desde) filtros.push(t('insp.since') + ' ' + desde);
    if (hasta) filtros.push(t('insp.until') + ' ' + hasta);
    if (loc) {
        const l = (locations || []).find(x => x.id === loc);
        filtros.push(t('insp.location') + ': ' + (l ? l.name : loc));
    }
    if (est) filtros.push(t('insp.status') + ': ' + est);

    el.textContent = filtros.length
        ? t('insp.pdfScope') + ' ' + filtros.join('  ·  ')
        : t('insp.pdfScopeAll');
}

// ---------------------------------------------------------------------------
//  Modal de detalle (reutiliza el que ya hay para inspecciones)
// ---------------------------------------------------------------------------
function abrirModalDetalle(titulo, cuerpoHtml) {
    let m = document.getElementById('inspDetailModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'inspDetailModal';
        m.className = 'modal';
        document.body.appendChild(m);
    }
    m.innerHTML =
        '<div class="modal-content">' +
            '<div class="modal-header">' +
                '<h3>' + esc(titulo) + '</h3>' +
                '<span class="close" onclick="document.getElementById(\'inspDetailModal\').remove()">&times;</span>' +
            '</div>' +
            '<div style="padding:1.5rem;max-height:70vh;overflow-y:auto;">' + cuerpoHtml + '</div>' +
        '</div>';
    m.style.display = 'block';
}

// ---------------------------------------------------------------------------
//  Recarga de todo el modulo
// ---------------------------------------------------------------------------
// Actualiza solo los paneles del modulo: no se recarga la pagina entera.
async function recargarInspecciones() {
    await cargarCatalogosInspecciones();
    await Promise.all([
        loadInspections(),
        loadFindings(),
        loadStatusHistory(),
        cargarPanelLocacionesInspeccionadas()
    ]);
}