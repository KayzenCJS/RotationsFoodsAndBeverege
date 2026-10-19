// ============================================
// API CLIENT
// ============================================

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = window.API_BASE_URL || (isLocalhost ? 'http://localhost:3002/api' : `${window.location.origin}/api`);
let currentType = 'foods'; // 'foods' or 'retail'

// ============================================
// SET CURRENT TYPE
// ============================================

function setCurrentType(type) {
    currentType = type;
}

// ============================================
// API HELPERS
// ============================================

async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}/${currentType}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// EMPLOYEES API
// ============================================

async function fetchEmployees() {
    return await apiRequest('/employees');
}

async function fetchEmployee(id) {
    return await apiRequest(`/employees/${id}`);
}

async function createEmployee(data) {
    return await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateEmployee(id, data) {
    return await apiRequest(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteEmployee(id) {
    return await apiRequest(`/employees/${id}`, {
        method: 'DELETE'
    });
}

// ============================================
// LOCATIONS API
// ============================================

async function fetchLocations() {
    return await apiRequest('/locations');
}

async function fetchLocation(id) {
    return await apiRequest(`/locations/${id}`);
}

// ============================================
// ASSIGNMENTS API
// ============================================

async function fetchAssignments(date = null) {
    const query = date ? `?date=${date}` : '';
    return await apiRequest(`/assignments${query}`);
}

async function fetchLocationAssignments(locationId, date = null) {
    const query = date ? `?date=${date}` : '';
    return await apiRequest(`/locations/${locationId}/assignments${query}`);
}

async function fetchBuildingAssignments(locationId, date = null) {
    const query = date ? `?date=${date}` : '';
    return await apiRequest(`/buildings/${locationId}/assignments${query}`);
}

async function createAssignment(data) {
    return await apiRequest('/assignments', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateAssignment(id, data) {
    return await apiRequest(`/assignments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function createBuildingAssignment(locationId, data) {
    return await apiRequest(`/buildings/${locationId}/assignments`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

// ============================================
// SECCIONES DEL HORARIO (OPS / EXTRA HOURS / SUPPORT / EXTRA TASKS)
// ============================================

async function fetchScheduleCategories() {
    return await apiRequest('/schedule-categories');
}

async function createScheduleCategory(data) {
    return await apiRequest('/schedule-categories', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function deleteScheduleCategory(key) {
    return await apiRequest(`/schedule-categories/${encodeURIComponent(key)}`, {
        method: 'DELETE'
    });
}

// ============================================
// LOCATIONS ENTRENADAS Y GRUPOS DEL EMPLEADO
// ============================================

async function fetchLocationGroups() {
    return await apiRequest('/location-groups');
}

async function fetchEmployeeTrainingLocations(employeeId) {
    return await apiRequest(`/employees/${employeeId}/training-locations`);
}

async function saveEmployeeTrainingLocations(employeeId, data) {
    return await apiRequest(`/employees/${employeeId}/training-locations`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

// Reporte de capacitaciones por empleado (solo lectura, para el modulo Reportes)
async function fetchEmployeesTrainingReport() {
    return await apiRequest('/employees-training-report');
}

// ============================================
// NOTAS DEL DÍA
// ============================================

async function fetchScheduleNotes(date = null) {
    const query = date ? `?date=${date}` : '';
    return await apiRequest(`/schedule-notes${query}`);
}

async function createScheduleNote(data) {
    return await apiRequest('/schedule-notes', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateScheduleNote(id, data) {
    return await apiRequest(`/schedule-notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteScheduleNote(id) {
    return await apiRequest(`/schedule-notes/${id}`, {
        method: 'DELETE'
    });
}

async function deleteAssignment(id) {
    return await apiRequest(`/assignments/${id}`, {
        method: 'DELETE'
    });
}

// ============================================
// TASKS API
// ============================================

async function fetchTasks() {
    return await apiRequest('/tasks');
}

async function createTask(data) {
    return await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateTask(id, data) {
    return await apiRequest(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

async function deleteTask(id) {
    return await apiRequest(`/tasks/${id}`, {
        method: 'DELETE'
    });
}

// Referencia a la función de ARRIBA, capturada mientras esta es la global.
//
// script.js declara después su propia `deleteTask` global (la que pregunta por
// confirmación y repinta) y pisa a esta. Si deleteTaskDeApi la llamara por
// nombre, resolvería a la de script.js y la recursión volvería a aparecer.
//
// Guardando la referencia en una constante al definirla, el vínculo queda
// resuelto para siempre y esta función siempre habla con el servidor.
const _borrarTareaEnServidor = deleteTask;

async function deleteTaskDeApi(id) {
    return await _borrarTareaEnServidor(id);
}

// ============================================
// HEALTH CHECK
// ============================================

async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
        return await response.json();
    } catch (error) {
        console.error('Health check failed:', error);
        return null;
    }
}

// ============================================
// LOCATION DISABLES
// ============================================

async function fetchLocationDisables(date = null) {
    const query = date ? `?date=${date}` : '';
    return await apiRequest(`/location-disables${query}`);
}

async function disableLocation(data) {
    return await apiRequest('/location-disables', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function checkLocationDisabled(locationId, date) {
    try {
        const response = await fetch(`${API_BASE_URL}/${currentType}/location-disables?date=${date}`);
        const disables = await response.json();
        return disables.some(d => d.location_id === locationId && !d.enabled_at);
    } catch (error) {
        console.error('Error checking location disabled status:', error);
        return false;
    }
}

// ============================================
// STAFFING RULES
// ============================================

async function fetchStaffingRules() {
    return await apiRequest('/staffing-rules');
}

async function fetchLocationStaffingRule(locationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/${currentType}/staffing-rules/${locationId}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching location staffing rule:', error);
        return null;
    }
}

async function validateStaffingRequirements(locationId, assignments) {
    try {
        const response = await fetch(`${API_BASE_URL}/${currentType}/staffing-rules/validate/${locationId}?assignments=${encodeURIComponent(JSON.stringify(assignments))}`);
        return await response.json();
    } catch (error) {
        console.error('Error validating staffing requirements:', error);
        return { valid: true, message: 'Validation error' };
    }
}

async function createStaffingRule(data) {
    return await apiRequest('/staffing-rules', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function updateStaffingRule(locationId, data) {
    return await apiRequest('/staffing-rules', {
        method: 'POST',
        body: JSON.stringify({ ...data, location_id })
    });
}

async function deactivateStaffingRule(locationId) {
    return await apiRequest(`/staffing-rules/${locationId}`, {
        method: 'DELETE'
    });
}

async function enableLocation(id, data) {
    return await apiRequest(`/location-disables/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

// ============================================
// SUPERVISOR ASSIGNMENTS
// ============================================

async function fetchSupervisorAssignments(date = null, supervisorId = null) {
    let query = '';
    if (date) query += `?date=${date}`;
    if (supervisorId) query += query ? `&supervisor_id=${supervisorId}` : `?supervisor_id=${supervisorId}`;
    return await apiRequest(`/supervisor-assignments${query}`);
}

async function createSupervisorAssignment(data) {
    return await apiRequest('/supervisor-assignments', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function deleteSupervisorAssignment(id) {
    return await apiRequest(`/supervisor-assignments/${id}`, {
        method: 'DELETE'
    });
}

// ============================================
// ASSIGNMENT HISTORY
// ============================================

async function fetchAssignmentHistory(date) {
    const response = await fetch(`${API_BASE_URL}/${currentType}/assignment-history?date=${date}`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// ============================================
// EMPLOYEE BREAKS API
// ============================================

async function fetchBreaks(date = null, locationId = null) {
    let query = '';
    if (date) query += `?date=${date}`;
    if (locationId) query += query ? `&location_id=${locationId}` : `?location_id=${locationId}`;
    return await apiRequest(`/breaks${query}`);
}

async function fetchBreakByAssignment(assignmentId) {
    return await apiRequest(`/breaks/assignment/${assignmentId}`);
}

async function createBreak(data) {
    return await apiRequest('/breaks', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

async function deleteBreak(id) {
    return await apiRequest(`/breaks/${id}`, {
        method: 'DELETE'
    });
}

// ============================================
// BACKUP API
// ============================================

async function createBackup() {
    return await apiRequest('/backup', {
        method: 'POST'
    });
}
