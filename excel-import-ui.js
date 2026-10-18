// ============================================================================
//  UI DEL IMPORTADOR DE EXCEL  (§19, §20)
// ============================================================================
//  Flujo:  1 Archivo -> 2 Analizando -> 3 Tipo -> 4 Mapeo -> 5 Preview
//          -> 6 Validacion -> 7 Confirmar -> 8 Resultado
//
//  Usa el sistema i18n existente: t('clave') para todo texto visible.
//  Todos los textos pasan por el diccionario (validado al arrancar).
// ============================================================================

const ExcelImportUI = (() => {

  let state = {
    step: 1,
    file: null,
    fileName: '',
    workbook: null,
    sheetName: null,
    detected: 'unknown',
    // 'flat'          -> tabla con encabezados (formato genérico anterior)
    // 'quinyx'        -> layout visual de horario Quinyx / Story Land
    format: 'flat',
    scheduleDate: '',        // §8: la fecha la elige el usuario
    dateFromFile: false,     // ¿el archivo ya traía la fecha?
    sheetMeta: null,         // secciones/bloques detectados por el parser
    headerIndex: 0,
    headers: [],
    mapping: {},
    rows: [],
    validated: null,
    target: 'foods',
    importing: false,
    history: []
  };

  // Columnas de StoryManager disponibles para el mapeo manual (§6)
  const FIELDS = [
    { key: 'employee', label: 'Employee' },
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'badge', label: 'Badge' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'location', label: 'Location' },
    { key: 'date', label: 'Date' },
    { key: 'start_time', label: 'Start Time' },
    { key: 'end_time', label: 'End Time' },
    { key: 'hours', label: 'Worked Hours' },
    { key: 'regular_hours', label: 'Regular Hours' },
    { key: 'overtime', label: 'Overtime' },
    { key: 'break', label: 'Break (min)' },
    { key: 'department', label: 'Department' }
  ];

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // -----------------------------------------------------------------------
  //  Issue -> etiqueta traducida + clase CSS
  // -----------------------------------------------------------------------
  const ISSUE_KEYS = {
    employee_not_found: 'imp.issueEmployee',
    location_not_found: 'imp.issueLocation',
    date_invalid: 'imp.issueDate',
    start_time_invalid: 'imp.issueStart',
    end_time_invalid: 'imp.issueEnd',
    end_before_start: 'imp.issueEndBefore',
    location_disabled: 'imp.issueClosed',
    schedule_conflict: 'imp.issueConflict',
    duplicate_record: 'imp.issueDuplicate',
    section_hidden: 'imp.issueSectionHidden',
    schedule_changed: 'imp.issueChanged'
  };

  // Motivos que devuelve el parser del horario real (§23: nada se inventa).
  const PARSER_ISSUE_KEYS = {
    missing_time: 'imp.issueMissingTime',
    no_separator: 'imp.issueBadTime',
    bad_start: 'imp.issueBadTime',
    bad_end: 'imp.issueBadTime',
    until_without_previous: 'imp.issueUntil',
    multiple_ranges_single_employee: 'imp.issueMergedRanges',
    more_employees_than_ranges: 'imp.issueRangeMismatch'
  };
  const STATUS_KEYS = {
    ready: 'imp.statusReady',
    skipped: 'imp.statusSkipped',
    review: 'imp.statusReview',
    conflict: 'imp.statusConflict',
    duplicate: 'imp.statusDuplicate',
    changed: 'imp.statusChanged'
  };

  // -----------------------------------------------------------------------
  //  Estructura del modal
  // -----------------------------------------------------------------------
  function render() {
    const body = renderStep();
    const el = document.getElementById('excelImportModal');
    if (!el) return;
    el.innerHTML = `
      <div class="modal-content imp-modal-content">
        <div class="modal-header">
          <h3><i class="fas fa-file-import"></i> ${esc(t('imp.title'))}</h3>
          <span class="close" onclick="closeExcelImport()">&times;</span>
        </div>
        ${renderStepper()}
        <div class="form-content imp-body">${body}</div>
        <div class="form-actions imp-actions">${renderActions()}</div>
      </div>`;
  }

  function renderStepper() {
    const labels = [
      t('imp.stepFile'), t('imp.stepAnalyze'), t('imp.stepType'),
      state.format === 'quinyx' ? t('imp.stepDate') : t('imp.stepMapping'),
      t('imp.stepPreview'), t('imp.stepValidate'),
      t('imp.stepConfirm'), t('imp.stepResult')
    ];
    return `<div class="imp-stepper">${labels.map((l, i) => {
      const n = i + 1;
      const cls = n === state.step ? 'active' : (n < state.step ? 'done' : '');
      return `<div class="imp-step ${cls}"><span class="imp-step-n">${n}</span><span class="imp-step-l">${esc(l)}</span></div>`;
    }).join('')}</div>`;
  }

  // -----------------------------------------------------------------------
  //  Cada paso
  // -----------------------------------------------------------------------
  function renderStep() {
    switch (state.step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      default: return '';
    }
  }

  // STEP 1 — seleccionar archivo (§1)
  function renderStep1() {
    return `
      <div class="imp-drop" id="impDrop" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="event.preventDefault();this.classList.remove('drag');impOnFileChosen(event.dataTransfer.files[0])">
        <i class="fas fa-file-excel imp-drop-icon"></i>
        <p class="imp-drop-title">${esc(t('imp.selectFile'))}</p>
        <p class="imp-drop-sub">${esc(t('imp.selectFileHint'))}</p>
        <input type="file" id="impFileInput" accept=".xlsx,.xls" style="display:none" onchange="impOnFileChosen(this.files[0])" />
        <button class="btn btn-primary" onclick="document.getElementById('impFileInput').click()">
          <i class="fas fa-folder-open"></i> ${esc(t('imp.browse'))}
        </button>
      </div>
      <div class="imp-target-row">
        <label for="impTarget">${esc(t('imp.targetLabel'))}</label>
        <select id="impTarget">
          <option value="foods"${state.target === 'foods' ? ' selected' : ''}>${esc(t('imp.targetFoods'))}</option>
          <option value="retail"${state.target === 'retail' ? ' selected' : ''}>${esc(t('imp.targetRetail'))}</option>
        </select>
      </div>
      <p class="imp-note"><i class="fas fa-info-circle"></i> ${esc(t('imp.noteNothingSaved'))}</p>
      ${renderHistory()}`;
  }

  function renderHistory() {
    if (!state.history.length) return '';
    return `
      <div class="imp-history">
        <h4><i class="fas fa-clock-rotate-left"></i> ${esc(t('imp.historyTitle'))}</h4>
        <div class="imp-history-list">
          ${state.history.map((h) => `
            <div class="imp-history-row">
              <span class="imp-h-file">${esc(h.file_name)}</span>
              <span class="imp-h-meta">${esc(t('imp.' + h.detected_type))} ·
                ${esc(String(h.total_records))} ${esc(t('imp.records'))}</span>
              <span class="imp-h-res">
                <em class="ok">+${h.imported_count}</em>
                <em class="dupe">${esc(t('imp.dupShort'))} ${h.duplicate_count}</em>
                <em class="rej">${esc(t('imp.rejectedShort'))} ${h.rejected_count}</em>
              </span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // STEP 2 — analizando (§1)
  function renderStep2() {
    return `<div class="imp-loading">
      <div class="imp-spinner"></div>
      <p>${esc(t('imp.analyzing'))}</p>
    </div>`;
  }

  // STEP 3 — tipo detectado (§2)
  function renderStep3() {
    if (state.format === 'quinyx') return renderStep3Quinyx();

    const badge = {
      schedule: 'imp.typeSchedule',
      timesheet: 'imp.typeTimesheet',
      unknown: 'imp.typeUnknown'
    }[state.detected];
    const isUnknown = state.detected === 'unknown';

    return `
      <div class="imp-detected imp-detected-${state.detected}">
        <p class="imp-detected-label">${esc(t('imp.detectedType'))}</p>
        <p class="imp-detected-type">${esc(t(badge))}</p>
        ${isUnknown
          ? `<p class="imp-warn"><i class="fas fa-exclamation-triangle"></i> ${esc(t('imp.unknownHint'))}</p>`
          : `<p class="imp-ok"><i class="fas fa-check-circle"></i> ${esc(t('imp.detectedHint'))}</p>`}
      </div>
      ${renderSheetPicker()}
      ${renderMappingSummary(true)}`;
  }

  // Paso 3 para el formato real de horario: en lugar de "tipo de archivo"
  // se explica qué se entendió del horario (§6, §7).
  function renderStep3Quinyx() {
    const m = state.sheetMeta || { sections: [], blocks: 0, issues: [], skipped: [] };
    const sheet = currentSheet();
    const preview = ExcelImport.buildQuinyxScheduleRows(sheet.rows, sheet.name);
    const n = preview.rows.length;
    // OJO: no llamar "locations" a esta variable, tapa el catálogo global.
    const fileLocs = [...new Set(preview.rows.map((r) => r.location_name).filter(Boolean))];
    const unknownLocs = fileLocs.filter((loc) => !ExcelImport.matchLocation(loc, locations || []).location);

    return `
      <div class="imp-detected imp-detected-quinyx">
        <p class="imp-detected-label">${esc(t('imp.detectedType'))}</p>
        <p class="imp-detected-type">${esc(t('imp.typeQuinyxSchedule'))}</p>
        <p class="imp-ok"><i class="fas fa-check-circle"></i> ${esc(t('imp.quinyxHint'))}</p>
      </div>

      <div class="imp-summary-cards">
        ${card('imp.recordsFound', n)}
        ${card('imp.locationsFound', fileLocs.length)}
        ${card('imp.sectionsFound', m.sections.length)}
        ${card('imp.needsReviewRows', preview.rows.filter((r) => r.needs_review).length)}
      </div>

      ${m.sections.length ? `
      <div class="imp-issues">
        <p class="imp-section-title">${esc(t('imp.sectionsTitle'))}</p>
        <div class="imp-chips">
          ${m.sections.map((s) => `<span class="imp-tag">${esc(s)}</span>`).join('')}
        </div>
      </div>` : ''}

      ${unknownLocs.length ? `
      <div class="imp-issues">
        <p class="imp-section-title">${esc(t('imp.unknownLocationsTitle'))}</p>
        <p class="imp-note"><i class="fas fa-info-circle"></i> ${esc(t('imp.unknownLocationsHint'))}</p>
        <div class="imp-chips">
          ${unknownLocs.map((s) => `<span class="imp-tag imp-tag-warn">${esc(s)}</span>`).join('')}
        </div>
      </div>` : ''}

      ${renderSheetPicker()}`;
  }

  // STEP 4 — fecha del horario (§8) o mapeo de columnas (§6)
  function renderStep4() {
    if (state.format === 'quinyx') return renderStep4Date();
    return renderStep4Mapping();
  }

  // §8: el horario debe tener fecha. Si el Excel no la trae, se pregunta.
  function renderStep4Date() {
    return `
      <p class="imp-section-title">${esc(t('imp.scheduleDateTitle'))}</p>
      <p class="imp-note"><i class="fas fa-info-circle"></i> ${esc(t('imp.scheduleDateHint'))}</p>
      <div class="imp-target-row">
        <label for="impScheduleDate">${esc(t('imp.scheduleDateLabel'))}</label>
        <input type="date" id="impScheduleDate" value="${esc(state.scheduleDate)}"
               onchange="impOnDateChange(this.value)">
      </div>
      ${state.scheduleDate ? `
        <div class="imp-imp-datepreview">
          <p class="imp-ok"><i class="fas fa-calendar-check"></i>
            ${esc(t('imp.scheduleDateApplied').replace('{{date}}', formatDateForUser(state.scheduleDate)))}</p>
        </div>` : `<p class="imp-warn"><i class="fas fa-exclamation-triangle"></i> ${esc(t('imp.scheduleDateRequired'))}</p>`}`;
  }

  function formatDateForUser(iso) {
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return iso;
    try {
      return new Date(y, m - 1, d).toLocaleDateString(
        (typeof getLocale === 'function' ? getLocale() : 'en-US'),
        { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return iso; }
  }

  function onDateChange(iso) {
    state.scheduleDate = iso || '';
    render();
  }

  function renderSheetPicker() {
    if (!state.workbook || state.workbook.sheets.length < 2) return '';
    return `
      <div class="imp-target-row">
        <label for="impSheet">${esc(t('imp.sheetLabel'))}</label>
        <select id="impSheet" onchange="impOnSheetChange(this.value)">
          ${state.workbook.sheets.map((s) =>
            `<option value="${esc(s.name)}"${s.name === state.sheetName ? ' selected' : ''}>${esc(s.name)}</option>`
          ).join('')}
        </select>
      </div>`;
  }

  // STEP 4 (formato tabla plana) — mapeo de columnas (§6)
  function renderStep4Mapping() {
    return `
      <p class="imp-section-title">${esc(t('imp.mappingTitle'))}</p>
      <div class="imp-map-scroll">
        <table class="imp-map-table">
          <thead><tr>
            <th>${esc(t('imp.excelColumn'))}</th>
            <th>${esc(t('imp.storyField'))}</th>
            <th>${esc(t('imp.sample'))}</th>
          </tr></thead>
          <tbody>
          ${state.headers.map((h, i) => {
            const assigned = Object.keys(state.mapping).find((k) => state.mapping[k] === i) || '';
            return `<tr>
              <td class="imp-map-excel">${esc(h || t('imp.emptyHeader'))}</td>
              <td>
                <select class="imp-map-select" onchange="impOnMapChange('${assigned}', ${i}, this.value)">
                  <option value="">${esc(t('imp.notUsed'))}</option>
                  ${FIELDS.map((f) => `<option value="${f.key}"${f.key === assigned ? ' selected' : ''}>${esc(t('imp.f.' + f.key))}</option>`).join('')}
                </select>
              </td>
              <td class="imp-map-sample">${esc(sampleFor(i))}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>
      ${renderMappingSummary(false)}`;
  }

  function sampleFor(colIdx) {
    const sheet = currentSheet();
    if (!sheet) return '';
    for (let i = state.headerIndex + 1; i < Math.min(sheet.rows.length, state.headerIndex + 8); i++) {
      const v = (sheet.rows[i] || [])[colIdx];
      if (v !== undefined && String(v).trim() !== '') return String(v);
    }
    return '—';
  }

  function renderMappingSummary(readonly) {
    const rows = FIELDS.filter((f) => state.mapping[f.key] !== undefined);
    if (!rows.length) return '';
    return `
      <div class="imp-map-summary">
        <p class="imp-section-title">${esc(t('imp.mappingSummary'))}</p>
        <div class="imp-map-summary-grid">
          ${rows.map((f) => `<div class="imp-map-chip">
            <span class="imp-chip-from">${esc(state.headers[f.key === 'location' ? state.mapping[f.key] : state.mapping[f.key]] || '')}</span>
            <i class="fas fa-arrow-right"></i>
            <span class="imp-chip-to">${esc(t('imp.f.' + f.key))}</span>
          </div>`).join('')}
        </div>
      </div>`;
  }

  // STEP 5 — preview (§7)
  function renderStep5() {
    const c = counts();
    return `
      <div class="imp-summary-cards">
        ${card('imp.totalRecords', c.total)}
        ${card('imp.readyCount', c.ready)}
        ${card('imp.reviewCount', c.review)}
        ${card('imp.conflictCount', c.conflict)}
        ${card('imp.duplicateCount', c.duplicate)}
        ${c.skipped ? card('imp.statusSkipped', c.skipped) : ''}
        ${c.changed ? card('imp.statusChanged', c.changed) : ''}
      </div>
      ${renderPreviewTable()}`;
  }

  function card(key, n) {
    return `<div class="imp-card"><span class="imp-card-n">${n}</span><span class="imp-card-l">${esc(t(key))}</span></div>`;
  }

  function renderPreviewTable() {
    if (!state.validated) return '';
    const isHours = state.detected === 'timesheet';
    const isQuinyx = state.format === 'quinyx';
    const rows = state.validated.rows;

    return `
      <div class="imp-table-scroll">
        <table class="imp-table">
          <thead><tr>
            <th>#</th>
            <th>${esc(t('imp.colEmployee'))}</th>
            ${isHours ? '' : `<th>${esc(t('imp.colLocation'))}</th>`}
            ${isQuinyx && !isHours ? `<th>${esc(t('imp.colRole'))}</th>` : ''}
            <th>${esc(t('imp.colDate'))}</th>
            ${isHours
              ? `<th>${esc(t('imp.colClockIn'))}</th><th>${esc(t('imp.colClockOut'))}</th><th>${esc(t('imp.colHours'))}</th>`
              : `<th>${esc(t('imp.colStart'))}</th><th>${esc(t('imp.colEnd'))}</th>`}
            <th>${esc(t('imp.colStatus'))}</th>
            <th>${esc(t('imp.colAction'))}</th>
          </tr></thead>
          <tbody>
          ${rows.map((r, i) => renderPreviewRow(r, i, isHours)).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function renderPreviewRow(r, i, isHours) {
    const src = state.rows[r.index] || {};
    const empId = r.normalized.employee_id;
    const emp = empId ? (employees || []).find((e) => e.id === empId) : null;
    const locId = r.normalized.location_id;
    const loc = locId ? (locations || []).find((l) => l.id === locId) : null;
    const n = r.normalized;
    const isQuinyx = state.format === 'quinyx';

    // Secciones retiradas de la interfaz (Beer Tent): se muestran atenuadas y
    // sin botón de acción, porque no se van a importar. No es un error.
    if (r.status === 'skipped') {
      const nombreSeccion = esc(src.location_name || n.section_name || '—');
      return `<tr class="imp-st-skipped">
        <td class="imp-n" data-i18n-ignore>${src.__excelRow || i + 1}</td>
        <td><span class="imp-tag" data-i18n-ignore>${esc(src.employee_name || '—')}</span></td>
        ${isHours ? '' : `<td><span class="imp-tag imp-tag-role">${nombreSeccion}</span></td>`}
        ${isQuinyx && !isHours
          ? `<td data-i18n-ignore>${src.role ? `<span class="imp-tag imp-tag-role">${esc(src.role)}</span>` : '—'}</td>`
          : ''}
        <td>${esc(n.work_date || '—')}</td>
        ${isHours
          ? `<td>${esc(n.clock_in || '—')}</td><td>${esc(n.clock_out || '—')}</td><td>${esc(n.worked_hours ?? '—')}</td>`
          : `<td>${esc(n.start_time || '—')}</td><td>${esc(n.end_time || '—')}</td>`}
        <td><span class="imp-status">${esc(t('imp.statusSkipped'))}</span>
            <div class="imp-reason">${esc(t('imp.issueSectionHidden'))}</div></td>
        <td>—</td>
      </tr>`;
    }

    const statusCls = 'imp-st-' + r.status;
    const reasons = r.issues.length
      ? r.issues.map((x) => (x.code === 'schedule_changed'
          ? renderChangedReason(x.detail, n)
          : esc(t(ISSUE_KEYS[x.code] || 'imp.issueOther')))).join('<br>')
      : esc(t('imp.ok'));

    // selectores inline para corregir (§7, §11)
    const empCell = empId
      ? `<span class="imp-tag">${esc(emp ? emp.name : '#' + empId)}</span>`
      : empSelect(src.__index, i);
    const locCell = (isHours || locId)
      ? (locId ? `<span class="imp-tag">${esc(loc ? loc.name : locId)}</span>` : '')
      : locSelect(src.__index, i);
    // El nombre del empleado viene del Excel: se muestra literal.
    const empNameCell = empCell.replace('<span class="imp-tag"', '<span data-i18n-ignore class="imp-tag"');

    // §12/§14: el turno (Day/Night) y el rol viajan como metadatos, no como
    // parte del nombre del empleado. El rol se muestra tal cual viene del
    // archivo: data-i18n-ignore evita que el traductor automático lo cambie
    // (p.ej. "Cook" -> "Cocinero"), que no es lo que se va a guardar.
    const roleCell = (isQuinyx && !isHours)
      ? `<td data-i18n-ignore>${src.role ? `<span class="imp-tag imp-tag-role">${esc(src.role)}</span>` : '—'}
           ${src.shift_label ? `<span class="imp-tag imp-tag-shift">${esc(t('imp.shift.' + src.shift_label))}</span>` : ''}</td>`
      : '';

    return `<tr class="${statusCls}">
      <td class="imp-n" data-i18n-ignore>${src.__excelRow || i + 1}</td>
      <td>${empNameCell}</td>
      ${isHours ? '' : `<td>${locCell}</td>`}
      ${roleCell}
      <td>${esc(n.work_date || '—')}${src.date_ambiguous ? `<span class="imp-warnbadge" title="${esc(t('imp.dateAmbiguous'))}">?</span>` : ''}</td>
      ${isHours
        ? `<td>${esc(n.clock_in || '—')}</td><td>${esc(n.clock_out || '—')}</td><td>${esc(n.worked_hours ?? '—')}</td>`
        : `<td>${esc(n.start_time || '—')}</td><td>${esc(n.end_time || '—')}</td>`}
      <td><span class="imp-status">${esc(t(STATUS_KEYS[r.status]))}</span><div class="imp-reason">${reasons}</div></td>
      <td>${r.status === 'changed'
        ? renderChangedAction(src.__index, r.changed)
        : `<button class="imp-mini-btn" onclick="impExcludeRow(${src.__index})" title="${esc(t('imp.excludeRow'))}">
             <i class="fas fa-times"></i></button>`}</td>
    </tr>`;
  }

  // §19 El horario cambió: se muestra el antes y el después, y el usuario
  // decide. Nunca se sobrescribe nada en silencio.
  function renderChangedReason(d, n) {
    if (!d) return esc(t('imp.issueChanged'));
    const newStart = fmtTime(n && n.start_time);
    const newEnd = fmtTime(n && n.end_time);
    return `<span class="imp-change">${esc(t('imp.existingLabel'))}
      <strong>${esc(fmtTime(d.existing_start))}–${esc(fmtTime(d.existing_end))}</strong></span>
      <span class="imp-change-arrow"><i class="fas fa-arrow-right"></i></span>
      <span class="imp-change imp-change-new">${esc(t('imp.importedLabel'))}
      <strong>${esc(newStart)}–${esc(newEnd)}</strong></span>`;
  }

  function fmtTime(v) {
    if (!v) return '—';
    return String(v).slice(0, 5);
  }

  // Selector mantener / actualizar / omitir (§19)
  function renderChangedAction(rowIdx, changed) {
    const cur = (state.rows[rowIdx] || {}).action || '';
    return `<select class="imp-inline-select" onchange="impOnChangedAction(${rowIdx}, this.value)">
      <option value=""${cur === '' ? ' selected' : ''}>${esc(t('imp.actionSkip'))}</option>
      <option value="update"${cur === 'update' ? ' selected' : ''}>${esc(t('imp.actionUpdate'))}</option>
      <option value="keep"${cur === 'keep' ? ' selected' : ''}>${esc(t('imp.actionKeep'))}</option>
    </select>`;
  }

  function empSelect(rowIdx, rowPos) {
    const cur = state.rows[rowIdx];
    const sugg = cur && cur.__candidates ? cur.__candidates : [];
    const opts = sugg.length
      ? sugg.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')
      : (employees || []).slice(0, 300).map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('');
    return `<select class="imp-inline-select" onchange="impAssignEmployee(${rowIdx}, this.value)">
      <option value="">${esc(t('imp.selectEmployeeShort'))}</option>${opts}</select>`;
  }

  function locSelect(rowIdx) {
    const opts = (locations || []).map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');
    return `<select class="imp-inline-select" onchange="impAssignLocation(${rowIdx}, this.value)">
      <option value="">${esc(t('imp.selectLocationShort'))}</option>${opts}</select>`;
  }

  // STEP 6 — validación (§8)
  function renderStep6() {
    const c = counts();
    const byIssue = {};
    state.validated.rows.forEach((r) => r.issues.forEach((i) => {
      byIssue[i.code] = (byIssue[i.code] || 0) + 1;
    }));
    return `
      <div class="imp-summary-cards">
        ${card('imp.readyCount', c.ready)}
        ${card('imp.reviewCount', c.review)}
        ${card('imp.conflictCount', c.conflict)}
        ${card('imp.duplicateCount', c.duplicate)}
        ${c.skipped ? card('imp.statusSkipped', c.skipped) : ''}
        ${c.changed ? card('imp.statusChanged', c.changed) : ''}
      </div>
      ${Object.keys(byIssue).length ? `
      <div class="imp-issues">
        <p class="imp-section-title">${esc(t('imp.issuesTitle'))}</p>
        ${Object.entries(byIssue).map(([code, n]) => `
          <div class="imp-issue-row">
            <span class="imp-issue-dot imp-issue-${code}"></span>
            <span class="imp-issue-l">${esc(t(ISSUE_KEYS[code] || 'imp.issueOther'))}</span>
            <span class="imp-issue-n">${n}</span>
          </div>`).join('')}
      </div>` : `<p class="imp-ok"><i class="fas fa-check-circle"></i> ${esc(t('imp.noIssues'))}</p>`}
      <p class="imp-note"><i class="fas fa-shield-halved"></i> ${esc(t('imp.validationNote'))}</p>`;
  }

  // STEP 7 — confirmar (§7, §12, §14)
  function renderStep7() {
    const c = counts();
    return `
      <div class="imp-confirm">
        <p class="imp-confirm-title">${esc(t('imp.confirmTitle'))}</p>
        <ul class="imp-confirm-list">
          <li><strong>${c.ready}</strong> ${esc(t('imp.readyCount'))}</li>
          <li><strong>${c.conflict}</strong> ${esc(t('imp.conflictCount'))}</li>
          <li><strong>${c.duplicate}</strong> ${esc(t('imp.duplicateCount'))}</li>
          ${c.changed ? `<li><strong>${c.changed}</strong> ${esc(t('imp.statusChanged'))}</li>` : ''}
          ${c.review ? `<li><strong>${c.review}</strong> ${esc(t('imp.reviewCount'))}</li>` : ''}
        </ul>
        <p class="imp-note"><i class="fas fa-database"></i> ${esc(t('imp.targetLabel'))}:
          <strong>${esc(state.target === 'foods' ? t('imp.targetFoods') : t('imp.targetRetail'))}</strong></p>
        <p class="imp-note"><i class="fas fa-info-circle"></i> ${esc(t('imp.confirmNote'))}</p>
      </div>`;
  }

  // STEP 8 — resultado
  function renderStep8() {
    const r = state.lastSummary || {};
    return `
      <div class="imp-result">
        <p class="imp-result-title"><i class="fas fa-check-circle"></i> ${esc(t('imp.completed'))}</p>
        <div class="imp-summary-cards">
          ${card('imp.totalRecords', r.total || 0)}
          ${card('imp.importedCount', r.imported || 0)}
          ${card('imp.updatedCount', r.updated || 0)}
          ${card('imp.duplicateCount', r.duplicates || 0)}
          ${card('imp.rejectedCount', (r.rejected || 0) + (r.conflicts || 0))}
        </div>
        ${(r.errors && r.errors.length) ? `
          <div class="imp-errors">
            <p class="imp-section-title">${esc(t('imp.errorsTitle'))}</p>
            ${r.errors.slice(0, 10).map((e) => `<div class="imp-error-row">${esc(e.message)}</div>`).join('')}
          </div>` : ''}
      </div>`;
  }

  // -----------------------------------------------------------------------
  //  Acciones
  // -----------------------------------------------------------------------
  function renderActions() {
    const btns = [];
    if (state.step > 1 && state.step < 8) {
      btns.push(`<button class="btn btn-secondary" onclick="impGoBack()">
        <i class="fas fa-arrow-left"></i> ${esc(t('common.back'))}</button>`);
    }
    if (state.step === 1 && state.file) {
      btns.push(`<button class="btn btn-primary" onclick="impAnalyze()">
        <i class="fas fa-search"></i> ${esc(t('imp.analyzeBtn'))}</button>`);
    }
    if (state.step === 3) {
      btns.push(`<button class="btn btn-primary" onclick="impNext()">
        ${esc(t('common.next'))} <i class="fas fa-arrow-right"></i></button>`);
    }
    if (state.step === 4) {
      btns.push(`<button class="btn btn-primary" onclick="impRebuildRows()">
        <i class="fas ${state.format === 'quinyx' ? 'fa-calendar-check' : 'fa-sync-alt'}"></i>
        ${esc(t(state.format === 'quinyx' ? 'imp.applyDate' : 'imp.applyMapping'))}</button>`);
    }
    if (state.step === 5) {
      btns.push(`<button class="btn btn-primary" onclick="impValidate()">
        <i class="fas fa-shield-halved"></i> ${esc(t('imp.validateBtn'))}</button>`);
    }
    if (state.step === 6) {
      btns.push(`<button class="btn btn-primary" onclick="impCommit()">
        <i class="fas fa-check"></i> ${esc(t('imp.commitBtn'))}</button>`);
    }
    if (state.step === 8) {
      btns.push(`<button class="btn btn-primary" onclick="closeExcelImport()">
        ${esc(t('common.close'))}</button>`);
    }
    if (state.step !== 8) {
      btns.push(`<button class="btn btn-secondary" onclick="closeExcelImport()">
        ${esc(t('common.cancel'))}</button>`);
    }
    return btns.join('');
  }

  function counts() {
    const c = { total: state.rows.length, ready: 0, review: 0, conflict: 0, duplicate: 0, changed: 0 };
    if (!state.validated) return c;
    c.total = state.validated.rows.length;
    state.validated.rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }

  function currentSheet() {
    if (!state.workbook) return null;
    return state.workbook.sheets.find((s) => s.name === state.sheetName) || state.workbook.sheets[0];
  }

  // -----------------------------------------------------------------------
  //  Acciones públicas (expuestas a window por onclick inline)
  // -----------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  //  ANÁLISIS DE UNA HOJA  — decide si es tabla plana o horario Quinyx
  // ---------------------------------------------------------------------------
  function analyzeSheet(name) {
    const sheet = state.workbook.sheets.find((s) => s.name === name) || state.workbook.sheets[0];
    state.sheetName = sheet.name;

    // El formato se detecta por el CONTENIDO, nunca por el nombre del archivo.
    if (ExcelImport.isQuinyxSchedule(sheet.rows)) {
      state.format = 'quinyx';
      state.detected = 'schedule';
      state.headerIndex = 0;
      state.headers = [];
      state.mapping = {};
      state.sheetMeta = ExcelImport.buildQuinyxScheduleRows(sheet.rows, sheet.name).meta;
      state.rows = [];
      state.validated = null;
      return;
    }

    state.format = 'flat';
    state.sheetMeta = null;
    state.headerIndex = ExcelImport.findHeaderRow(sheet.rows);
    state.headers = (sheet.rows[state.headerIndex] || []).map((h) => String(h == null ? '' : h).trim());
    state.mapping = ExcelImport.guessMapping(state.headers);
    state.detected = ExcelImport.detectType(state.headers, sheet.rows.slice(state.headerIndex + 1));
    state.validated = null;
  }

  // Una hoja de empleados de Quinyx no es un horario: solo sirve de referencia
  // para resolver nombres (§11).
  function isEmployeesSheet(sheet) {
    if (!sheet || !sheet.rows.length) return false;
    const head = (sheet.rows[0] || []).map((h) => String(h).toLowerCase());
    const hasName = head.some((h) => /nombre|name/.test(h));
    const hasAttrs = head.some((h) => /nacionalidad|edad|age|grupo|group/.test(h));
    return hasName && hasAttrs;
  }

  // ---------------------------------------------------------------------------
  //  Acciones públicas (expuestas a window por onclick inline)
  // ---------------------------------------------------------------------------
  async function open() {
    state = Object.assign(state, {
      step: 1, file: null, workbook: null, rows: [], validated: null,
      lastSummary: null, format: 'flat', scheduleDate: '', sheetMeta: null
    });
    await loadHistory();
    render();
    document.getElementById('excelImportModal').style.display = 'flex';
  }

  function close() {
    document.getElementById('excelImportModal').style.display = 'none';
  }

  async function loadHistory() {
    try {
      const r = await fetch(`${API_BASE_URL}/${currentType}/import/history?limit=10`);
      if (r.ok) state.history = (await r.json()).history || [];
    } catch (e) { state.history = []; }
  }

  function onFileChosen(file) {
    if (!file) return;
    const ok = /\.(xlsx|xls)$/i.test(file.name);
    if (!ok) { showNotification(t('imp.errBadFile'), 'error'); return; }
    state.file = file;
    state.fileName = file.name;
    render();
  }

  async function analyze() {
    if (!state.file) return;
    state.step = 2;
    render();
    try {
      const wb = await ExcelImport.readFile(state.file);
      state.workbook = wb;

      // Se recorren las hojas buscando el horario. El nombre del archivo no
      // manda: manda el contenido de cada hoja (§2).
      const scheduleSheet = wb.sheets.find((s) => ExcelImport.isQuinyxSchedule(s.rows))
        || wb.sheets.find((s) => !isEmployeesSheet(s))
        || wb.sheets[0];

      analyzeSheet(scheduleSheet.name);
      state.step = 3;
      render();
    } catch (e) {
      state.step = 1;
      render();
      showNotification(t('imp.errParse'), 'error');
    }
  }

  function onSheetChange(name) {
    analyzeSheet(name);
    render();
  }

  function onMapChange(oldField, colIdx, newField) {
    // libera la columna si ya estaba asignada
    Object.keys(state.mapping).forEach((k) => {
      if (state.mapping[k] === colIdx && k !== oldField) delete state.mapping[k];
    });
    if (newField) {
      Object.keys(state.mapping).forEach((k) => {
        if (k !== newField && state.mapping[k] !== undefined) delete state.mapping[k];
      });
      state.mapping[newField] = colIdx;
    } else if (oldField) {
      delete state.mapping[oldField];
    }
    state.validated = null;
    render();
  }

  function rebuildRows() {
    if (state.format === 'quinyx') return rebuildQuinyxRows();

    const sheet = currentSheet();
    if (!sheet) return;
    state.rows = ExcelImport.buildRows(sheet, state.headerIndex, state.mapping, state.detected);
    state.validated = null;
    state.step = 5;
    render();
    // el preview inicial no tiene validación de servidor todavía
    state.validated = { rows: state.rows.map((r) => localPreview(r)), counts: {} };
    render();
  }

  // El formato de horario real ya viene normalizado: no hay mapeo que hacer,
  // solo aplicarle la fecha elegida (§8).
  function rebuildQuinyxRows() {
    const sheet = currentSheet();
    if (!sheet) return;
    if (!state.scheduleDate) {
      showNotification(t('imp.scheduleDateRequired'), 'error');
      return;
    }
    const built = ExcelImport.buildQuinyxScheduleRows(sheet.rows, sheet.name);
    state.sheetMeta = built.meta;
    state.rows = built.rows.map((r) => Object.assign({}, r, { work_date: state.scheduleDate }));
    state.validated = { rows: state.rows.map((r) => localPreview(r)), counts: {} };
    state.step = 5;
    render();
  }

  // preview optimista antes de llamar al servidor
  function localPreview(r) {
    const empMatch = ExcelImport.matchEmployee(r, employees || []);
    const locMatch = ExcelImport.matchLocation(r.location_name, locations || []);
    const issues = [];
    if (!empMatch.employee) {
      if (empMatch.candidates) r.__candidates = empMatch.candidates;
      issues.push({ code: 'employee_not_found' });
    }
    let location_id = null;
    if (r.kind === 'schedule') {
      if (!locMatch.location) issues.push({ code: 'location_not_found' });
      else location_id = locMatch.location.id;
    }
    if (!r.work_date) issues.push({ code: 'date_invalid' });
    if (r.kind === 'schedule' && r.start_time && r.end_time) {
      const [h1, m1] = r.start_time.split(':').map(Number);
      const [h2, m2] = r.end_time.split(':').map(Number);
      if (h2 * 60 + m2 <= h1 * 60 + m1) issues.push({ code: 'end_before_start' });
    }
    // El parser del horario real ya sabe qué filas no pudo interpretar (§23):
    // se respetan tal cual, sin inventar horario ni empleado.
    if (r.needs_review) issues.unshift({ code: PARSER_ISSUE_KEYS[r.needs_review] || 'imp.issueOther' });

    return {
      index: r.__index,
      kind: r.kind,
      status: issues.length ? 'review' : 'ready',
      issues,
      normalized: {
        employee_id: empMatch.employee ? empMatch.employee.id : null,
        location_id,
        work_date: r.work_date,
        start_time: r.start_time,
        end_time: r.end_time,
        clock_in: r.clock_in,
        clock_out: r.clock_out,
        worked_hours: r.worked_hours,
        regular_hours: r.regular_hours,
        overtime_hours: r.overtime_hours,
        break_minutes: r.break_minutes,
        role: r.role || null,
        shift_label: r.shift_label || null
      }
    };
  }

  function assignEmployee(rowIdx, empId) {
    state.rows[rowIdx].employee_id = empId;
    state.rows[rowIdx].__candidates = null;
    // re-resuelve el nombre contra el empleado elegido
    const e = (employees || []).find((x) => String(x.id) === String(empId));
    if (e) state.rows[rowIdx].name = e.name;
    state.validated = { rows: state.rows.map((r) => localPreview(r)), counts: {} };
    render();
  }

  function assignLocation(rowIdx, locId) {
    const l = (locations || []).find((x) => x.id === locId);
    state.rows[rowIdx].location_name = l ? l.name : locId;
    state.validated = { rows: state.rows.map((r) => localPreview(r)), counts: {} };
    render();
  }

  function excludeRow(rowIdx) {
    state.rows[rowIdx].__excluded = true;
    state.validated = { rows: state.rows.filter((r) => !r.__excluded).map((r) => localPreview(r)), counts: {} };
    render();
  }

  // §19 mantener / actualizar / omitir
  function onChangedAction(rowIdx, value) {
    state.rows[rowIdx].action = value || null;
    render();
  }

  async function validate() {
    const rows = state.rows.filter((r) => !r.__excluded).map((r, i) => ({
      __index: r.__index,
      kind: r.kind,
      employee_id: r.employee_id,
      location_id: locationIdOf(r),
      work_date: r.work_date,
      start_time: r.start_time,
      end_time: r.end_time,
      clock_in: r.clock_in,
      clock_out: r.clock_out,
      worked_hours: r.worked_hours,
      regular_hours: r.regular_hours,
      overtime_hours: r.overtime_hours,
      break_minutes: r.break_minutes,
      external_id: r.external_id || null,
      role: r.role || null,
      shift_label: r.shift_label || null,
      action: r.action || null          // §19: keep | update | null
    }));
    // el servidor necesita el id de empleado resuelto
    rows.forEach((out, i) => {
      const src = state.rows.filter((r) => !r.__excluded)[i];
      const m = ExcelImport.matchEmployee(src, employees || []);
      out.employee_id = m.employee ? m.employee.id : null;
    });

    try {
      const r = await fetch(`${API_BASE_URL}/${state.target}/import/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, source: 'excel', file_format: state.format })
      });
      if (!r.ok) throw new Error('validate_http_' + r.status);
      state.validated = await r.json();
      state.step = 6;
      render();
    } catch (e) {
      showNotification(t('imp.errValidate'), 'error');
    }
  }

  function locationIdOf(r) {
    if (r.__locationId) return r.__locationId;
    const m = ExcelImport.matchLocation(r.location_name, locations || []);
    return m.location ? m.location.id : null;
  }

  function commit() {
    if (state.importing) return;
    state.importing = true;
    render();
    const rows = state.rows.filter((r) => !r.__excluded).map((r) => ({
      __index: r.__index,
      kind: r.kind,
      employee_id: r.employee_id,
      location_id: locationIdOf(r),
      work_date: r.work_date,
      start_time: r.start_time,
      end_time: r.end_time,
      clock_in: r.clock_in,
      clock_out: r.clock_out,
      worked_hours: r.worked_hours,
      regular_hours: r.regular_hours,
      overtime_hours: r.overtime_hours,
      break_minutes: r.break_minutes,
      external_id: r.external_id || null,
      role: r.role || null,
      shift_label: r.shift_label || null,
      action: r.action || null          // §19: keep | update | null
    }));
    rows.forEach((out, i) => {
      const src = state.rows.filter((r) => !r.__excluded)[i];
      const m = ExcelImport.matchEmployee(src, employees || []);
      out.employee_id = m.employee ? m.employee.id : null;
    });

    fetch(`${API_BASE_URL}/${state.target}/import/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows, source: 'excel',
        file_name: state.fileName,
        file_format: state.format,
        detected_type: state.detected,
        imported_by: (localStorage.getItem('userRole') || 'admin')
      })
    })
      .then((r) => r.json())
      .then((sum) => {
        state.lastSummary = sum;
        state.importing = false;
        state.step = 8;
        loadHistory().then(render);
        showNotification(t('imp.completed'), 'success');
        // refresca la vista para que se vean los cambios
        if (typeof loadInitialData === 'function') loadInitialData();
      })
      .catch(() => {
        state.importing = false;
        render();
        showNotification(t('imp.errCommit'), 'error');
      });
  }

  function next() {
    if (state.step === 3) {
      // aun sin tipo, se puede mapear a mano y tratar como horario
      if (state.detected === 'unknown') state.detected = 'schedule';
      state.step = 4;
    }
    render();
  }

  function back() {
    if (state.step > 1) state.step--;
    render();
  }

  return { open, close, render, onFileChosen, analyze, onSheetChange, onMapChange, rebuildRows,
           assignEmployee, assignLocation, excludeRow, validate, commit, next, back,
           onDateChange, analyzeSheet, onChangedAction,
           state, renderStep, counts };
})();

// Expone las acciones que se invocan desde onclick inline
window.closeExcelImport = () => ExcelImportUI.close();
window.impAnalyze = () => ExcelImportUI.analyze();
window.impOnSheetChange = (v) => ExcelImportUI.onSheetChange(v);
window.impOnMapChange = (o, c, v) => ExcelImportUI.onMapChange(o, c, v);
window.impOnDateChange = (v) => ExcelImportUI.onDateChange(v);
window.impOnChangedAction = (r, v) => ExcelImportUI.onChangedAction(r, v);
window.impRebuildRows = () => ExcelImportUI.rebuildRows();
window.impAssignEmployee = (r, v) => ExcelImportUI.assignEmployee(r, v);
window.impAssignLocation = (r, v) => ExcelImportUI.assignLocation(r, v);
window.impExcludeRow = (r) => ExcelImportUI.excludeRow(r);
window.impValidate = () => ExcelImportUI.validate();
window.impCommit = () => ExcelImportUI.commit();
window.impNext = () => ExcelImportUI.next();
window.impGoBack = () => ExcelImportUI.back();
window.openExcelImport = () => ExcelImportUI.open();
window.impOnFileChosen = (f) => ExcelImportUI.onFileChosen(f);