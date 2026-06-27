// ============================================
// NAVIGATION
// ============================================
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    const bars = navToggle.querySelectorAll('.bar');
    bars.forEach((bar, index) => {
        if (navMenu.classList.contains('active')) {
            if (index === 0) bar.style.transform = 'rotate(-45deg) translate(-5px, 6px)';
            if (index === 1) bar.style.opacity = '0';
            if (index === 2) bar.style.transform = 'rotate(45deg) translate(-5px, -6px)';
        } else {
            bar.style.transform = 'none';
            bar.style.opacity = '1';
        }
    });
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        document.querySelectorAll('.nav-toggle .bar').forEach(bar => {
            bar.style.transform = 'none';
            bar.style.opacity = '1';
        });
    });
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
    });
});

// ============================================
// NOTIFICATIONS
// ============================================
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ============================================
// CONTACT FORM
// ============================================
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = document.getElementById('email').value;
    if (!emailRegex.test(email)) {
        showNotification('Por favor ingresa un email válido.', 'error');
        return;
    }
    const btn = this.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.textContent = 'Enviando...';
    btn.disabled = true;
    setTimeout(() => {
        showNotification('¡Mensaje enviado con éxito!', 'success');
        this.reset();
        btn.textContent = original;
        btn.disabled = false;
    }, 1500);
});

// ============================================
// STORYLAND LOCATIONS - Comida y Tiendas dentro del parque
// Basado en información oficial y fuentes externas
// ============================================
let locations = [
    // === RESTAURANTES Y COMIDA ===
    {
        id: 'food-fair',
        name: 'Food Fair',
        type: 'restaurant',
        category: 'Comida General',
        icon: 'fa-utensils',
        requiredSkills: ['food-beverage', 'customer-service'],
        description: 'Comida clásica de parque de diversiones para toda la familia'
    },
    {
        id: 'farm-stand',
        name: 'Farm Stand',
        type: 'restaurant',
        category: 'Comida Vegana',
        icon: 'fa-leaf',
        requiredSkills: ['food-beverage', 'customer-service', 'vegetarian'],
        description: 'Opciones vegetarianas y veganas: bananas con chocolate, masa frita, papas, pretzels sin queso'
    },
    {
        id: 'dunkin',
        name: "Dunkin'",
        type: 'restaurant',
        category: 'Café',
        icon: 'fa-coffee',
        requiredSkills: ['food-beverage', 'customer-service', 'cafe'],
        description: 'Café y donas dentro del parque'
    },
    {
        id: 'pixie-kitchen',
        name: 'Pixie Kitchen',
        type: 'restaurant',
        category: 'Comida Infantil',
        icon: 'fa-child',
        requiredSkills: ['food-beverage', 'customer-service'],
        description: 'Comida especialmente diseñada para niños y familias, con menús divertidos'
    },
    {
        id: 'moo-lagoon-snacks',
        name: 'Moo Lagoon Snack Bar',
        type: 'restaurant',
        category: 'Snacks',
        icon: 'fa-ice-cream',
        requiredSkills: ['food-beverage', 'customer-service'],
        description: 'Snacks y refrescos cerca del área de agua Moo Lagoon'
    },

    // === TIENDAS ===
    {
        id: 'whistle-stop',
        name: 'Whistle Stop Shop',
        type: 'store',
        category: 'Souvenirs',
        icon: 'fa-gift',
        requiredSkills: ['customer-service', 'retail', 'souvenirs'],
        description: 'Artículos de novedad, souvenirs, snacks y modelo de tren funcional. Ideal para comprar recuerdos de tu visita.' 
    },
    {
        id: 'miss-muffets-market',
        name: "Miss Muffet's Market",
        type: 'store',
        category: 'Conveniencia',
        icon: 'fa-store',
        requiredSkills: ['customer-service', 'retail'],
        description: 'Artículos de necesidad diaria para el parque: todo lo que puedas necesitar durante tu día en StoryLand'
    }
];

// ============================================
// DATA STORE
// ============================================
let employees = [];
let tasks = [];
let currentAssignments = [];
let currentEditId = null;
let currentTaskEditId = null;
let currentLang = 'es';

// ============================================
// LOCAL STORAGE - Guardado automático
// ============================================
function saveToLocalStorage() {
    try {
        localStorage.setItem('storyland_data', JSON.stringify({
            employees, tasks, currentAssignments,
            lastSaved: new Date().toISOString()
        }));
        return true;
    } catch (e) {
        console.error('Error guardando:', e);
        return false;
    }
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('storyland_data');
        if (data) {
            const parsed = JSON.parse(data);
            employees = parsed.employees || [];
            tasks = parsed.tasks || [];
            currentAssignments = parsed.currentAssignments || [];
            console.log(`✅ Datos cargados: ${employees.length} empleados, ${tasks.length} tareas`);
            return true;
        }
        return false;
    } catch (e) {
        console.error('Error cargando:', e);
        return false;
    }
}

function clearLocalStorage() {
    if (confirm('⚠️ ¿Borrar TODOS los datos guardados? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('storyland_data');
        showNotification('🗑️ Datos eliminados. Recargando...', 'info');
        setTimeout(() => location.reload(), 1500);
    }
}

// ============================================
// HELPERS
// ============================================
function getAreaName(area) {
    const map = {
        'food-beverage': 'Comida y Bebida',
        'retail': 'Ventas / Tienda',
        'customer-service': 'Servicio al Cliente',
        'cleaning': 'Limpieza',
        'security': 'Seguridad'
    };
    return map[area] || area;
}

function getCategoryName(category) {
    const map = {
        'Comida General': '🍽️ Comida General',
        'Comida Vegana': '🌱 Comida Vegana',
        'Café': '☕ Café',
        'Comida Infantil': '🧒 Comida Infantil',
        'Snacks': '🍿 Snacks',
        'Souvenirs': '🎁 Souvenirs',
        'Conveniencia': '🛒 Conveniencia'
    };
    return map[category] || category;
}

function getSkillName(skill) {
    const map = {
        'food-beverage': 'Comida y Bebida',
        'vegetarian': 'Opciones Vegetarianas',
        'pizza': 'Preparación de Pizza',
        'cafe': 'Barista / Café',
        'customer-service': 'Servicio al Cliente',
        'retail': 'Ventas / Retail',
        'souvenirs': 'Souvenirs / Merchandising',
        'bathroom-cleaning': 'Limpieza de Baños',
        'parking-cleaning': 'Limpieza de Parking',
        'security': 'Seguridad',
        'first-aid': 'Primeros Auxilios',
        'bag-check': 'Bag Check'
    };
    return map[skill] || skill;
}

function getEmployeeStatus(emp) {
    if (emp.availability.isOnBreak) return { text: 'En Break', class: 'status-break' };
    if (emp.availability.isOnTraining) return { text: 'En Training', class: 'status-training' };
    if (emp.availability.isDayOff) return { text: 'Day Off', class: 'status-dayoff' };
    if (emp.availability.isHoliday) return { text: 'Festivo', class: 'status-holiday' };
    return { text: 'Disponible', class: 'status-available' };
}

function isEmployeeAvailable(emp) {
    return !emp.availability.isOnBreak && !emp.availability.isOnTraining &&
           !emp.availability.isDayOff && !emp.availability.isHoliday;
}

function getPriorityName(p) {
    const map = { low:'Baja', medium:'Media', high:'Alta', urgent:'Urgente' };
    return map[p] || p;
}

function getTaskStatusName(s) {
    const map = { pending:'Pendiente', 'in-progress':'En Progreso', completed:'Completada' };
    return map[s] || s;
}

function getCategoryDisplayName(c) {
    const map = {
        maintenance:'🔧 Mantenimiento', cleaning:'🧹 Limpieza',
        training:'📚 Capacitación', 'customer-service':'👥 Servicio al Cliente',
        other:'📋 Otro'
    };
    return map[c] || c;
}

function formatDate(d) {
    const date = new Date(d);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate()+1);
    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
    return date.toLocaleDateString('es-ES', { month:'short', day:'numeric' });
}

// ============================================
// RENDER: EMPLOYEES
// ============================================
function renderEmployees() {
    const container = document.getElementById('employeesList');
    if (!container) return;

    if (!employees || employees.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;">No hay empleados. Haz clic en "Nuevo Empleado".</p>';
        return;
    }

    let html = '';
    employees.forEach(emp => {
        const status = getEmployeeStatus(emp);
        html += `
            <div class="employee-card ${status.class}">
                <div class="employee-info">
                    <div class="employee-name">
                        ${emp.name}
                        <span class="group-badge">Grupo ${emp.group || 'N/A'}</span>
                    </div>
                    <div class="employee-details">
                        ${getAreaName(emp.area)} • ${emp.age} años • ${emp.nationality}
                    </div>
                    <div class="employee-status">
                        <span class="status-indicator ${status.class}">${status.text}</span>
                        <span class="schedule-info">${emp.availability?.schedule?.startTime || '09:00'} - ${emp.availability?.schedule?.endTime || '18:00'}</span>
                    </div>
                    <div class="employee-skills">
                        ${emp.trainings && emp.trainings.length > 0 ?
                            emp.trainings.slice(0,3).map(s => `<span class="skill-tag">${getSkillName(s)}</span>`).join('') :
                            '<span class="skill-tag">Sin habilidades</span>'
                        }
                        ${emp.trainings && emp.trainings.length > 3 ? `<span class="skill-tag">+${emp.trainings.length-3}</span>` : ''}
                    </div>
                </div>
                <div class="employee-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editEmployee(${emp.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})"><i class="fas fa-trash"></i></button>
                    <button class="btn btn-sm btn-info" onclick="toggleEmployeeStatus(${emp.id})"><i class="fas fa-clock"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    updateStats();
}

// ============================================
// RENDER: LOCATIONS (Servicios)
// ============================================
function renderLocationCards() {
    const container = document.getElementById('locationsList');
    if (!container) return;

    let html = '';
    locations.forEach(loc => {
        html += `
            <div class="service-card">
                <div class="service-icon"><i class="fas ${loc.icon || 'fa-store'}"></i></div>
                <h3>${loc.name}</h3>
                <p>${loc.description}</p>
                <span class="service-tag">${loc.type === 'restaurant' ? '🍽️ Restaurante' : '🛍️ Tienda'} • ${loc.category}</span>
                <div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.25rem;">
                    ${loc.requiredSkills.map(s => `<span class="skill-tag">${getSkillName(s)}</span>`).join('')}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============================================
// RENDER: LOCATIONS GRID (para asignación)
// ============================================
function renderLocationsGrid() {
    const container = document.getElementById('locationsGrid');
    if (!container) return;

    let html = '';
    locations.forEach(loc => {
        const assignment = currentAssignments.find(a => a.locationId === loc.id);
        const assignedEmp = assignment ? employees.find(e => e.id === assignment.employeeId) : null;

        html += `
            <div class="location-card">
                <div class="location-name">${loc.name}</div>
                <div class="location-type">${loc.type === 'restaurant' ? '🍽️' : '🛍️'} ${loc.type === 'restaurant' ? 'Restaurante' : 'Tienda'}</div>
                <div class="location-category">${loc.category}</div>
                <div class="location-skills">
                    ${loc.requiredSkills.map(s => `<span class="skill-tag">${getSkillName(s)}</span>`).join('')}
                </div>
                <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-light);">
                    ${assignedEmp ? `👤 ${assignedEmp.name}` : 'Sin asignar'}
                </div>
                <div style="margin-top:0.5rem;">
                    <div class="assignee-slot" onclick="assignEmployee('${loc.id}')">
                        <i class="fas fa-plus"></i>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    updateStats();
}

// ============================================
// RENDER: OPTIMIZATION RESULTS
// ============================================
function displayOptimizationResults(assignments) {
    const container = document.getElementById('optimizationResults');
    if (!container) return;

    if (!assignments || assignments.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;">No hay asignaciones. Usa "Asignar Automáticamente" o asigna manualmente.</p>';
        return;
    }

    let html = `
        <div class="results-header">
            <h4>Resultados de Asignación</h4>
            <div class="efficiency-score">${assignments.length}/${locations.length} locaciones</div>
        </div>
    `;

    assignments.forEach(a => {
        const emp = employees.find(e => e.id === a.employeeId);
        const status = emp ? getEmployeeStatus(emp) : { text: 'N/A', class: 'status-unknown' };
        html += `
            <div class="assignment-item">
                <div class="assignment-header">
                    <span class="assigned-ride">${a.locationName}</span>
                    <span class="assigned-employee">${a.employeeName || 'Sin asignar'}</span>
                    <span class="assigned-group">Grupo ${a.group || 'N/A'}</span>
                </div>
                <div class="assignment-status">
                    <span class="status-indicator ${status.class}">${status.text}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ============================================
// EMPLOYEE CRUD
// ============================================
function openEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'block';
    document.getElementById('modalTitle').textContent = 'Nuevo Empleado';
    document.getElementById('employeeForm').reset();
    currentEditId = null;
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

function editEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    currentEditId = id;
    document.getElementById('modalTitle').textContent = 'Editar Empleado';
    document.getElementById('empName').value = emp.name;
    document.getElementById('empNationality').value = emp.nationality;
    document.getElementById('empAge').value = emp.age;
    document.getElementById('empArea').value = emp.area;

    const checkboxes = document.querySelectorAll('#employeeForm input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = emp.trainings && emp.trainings.includes(cb.value);
    });

    document.getElementById('employeeModal').style.display = 'block';
}

function deleteEmployee(id) {
    if (!confirm('¿Eliminar este empleado?')) return;
    employees = employees.filter(e => e.id !== id);
    currentAssignments = currentAssignments.filter(a => a.employeeId !== id);
    renderEmployees();
    renderLocationsGrid();
    populateEmployeeSelects();
    displayOptimizationResults(currentAssignments);
    saveToLocalStorage();
    showNotification('Empleado eliminado', 'success');
}

document.getElementById('employeeForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('empName').value;
    const nationality = document.getElementById('empNationality').value;
    const age = parseInt(document.getElementById('empAge').value);
    const area = document.getElementById('empArea').value;

    const trainings = [];
    document.querySelectorAll('#employeeForm input[type="checkbox"]:checked').forEach(cb => {
        trainings.push(cb.value);
    });

    const group = ['A','B','C'][Math.floor(Math.random()*3)];
    const availability = {
        isOnBreak: false, isOnTraining: false, isDayOff: false, isHoliday: false,
        schedule: { startTime: '09:00', endTime: '18:00', breakTimes: ['12:00-12:30'], trainingTimes: [] },
        daysOff: ['sunday'], holidays: []
    };

    if (currentEditId) {
        const index = employees.findIndex(e => e.id === currentEditId);
        if (index !== -1) {
            employees[index] = { ...employees[index], name, nationality, age, area, trainings };
        }
        showNotification('Empleado actualizado', 'success');
        currentEditId = null;
    } else {
        const newEmp = {
            id: employees.length > 0 ? Math.max(...employees.map(e=>e.id)) + 1 : 1,
            name, nationality, age, area, trainings, group, availability
        };
        employees.push(newEmp);
        showNotification('Empleado agregado', 'success');
    }

    renderEmployees();
    renderLocationsGrid();
    populateEmployeeSelects();
    saveToLocalStorage();
    closeEmployeeModal();
});

// ============================================
// EMPLOYEE STATUS
// ============================================
function toggleEmployeeStatus(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <div class="modal-header">
                <h3>Estado: ${emp.name}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding:1.5rem;">
                <div style="margin-bottom:1rem;">
                    <label>Actual: <strong>${getEmployeeStatus(emp).text}</strong></label>
                </div>
                <div style="margin-bottom:1rem;">
                    <label>Nuevo Estado:</label>
                    <select id="newStatus" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e5e7eb;">
                        <option value="available">Disponible</option>
                        <option value="break">En Break</option>
                        <option value="training">En Training</option>
                        <option value="dayoff">Day Off</option>
                        <option value="holiday">Festivo</option>
                    </select>
                </div>
                <div style="display:flex;gap:1rem;justify-content:flex-end;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="updateEmployeeStatus(${id}, document.getElementById('newStatus').value); this.closest('.modal').remove()">Actualizar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function updateEmployeeStatus(id, newStatus) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    emp.availability.isOnBreak = false;
    emp.availability.isOnTraining = false;
    emp.availability.isDayOff = false;
    emp.availability.isHoliday = false;
    switch(newStatus) {
        case 'break': emp.availability.isOnBreak = true; break;
        case 'training': emp.availability.isOnTraining = true; break;
        case 'dayoff': emp.availability.isDayOff = true; break;
        case 'holiday': emp.availability.isHoliday = true; break;
    }
    renderEmployees();
    renderLocationsGrid();
    saveToLocalStorage();
    showNotification(`Estado actualizado`, 'success');
}

// ============================================
// ASSIGNMENT
// ============================================
function assignEmployee(locationId) {
    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    const available = employees.filter(emp =>
        isEmployeeAvailable(emp) &&
        (location.requiredSkills.length === 0 ||
         location.requiredSkills.some(s => emp.trainings.includes(s)))
    );

    if (available.length === 0) {
        showNotification('No hay empleados disponibles con las habilidades requeridas', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <div class="modal-header">
                <h3>Asignar a: ${location.name}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding:1.5rem;">
                <select id="assignEmpSelect" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e5e7eb;">
                    <option value="">Seleccionar...</option>
                    ${available.map(e => `<option value="${e.id}">${e.name} - ${getAreaName(e.area)} - Grupo ${e.group}</option>`).join('')}
                </select>
                <div style="margin-top:1rem;display:flex;gap:1rem;justify-content:flex-end;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="confirmAssignment('${location.id}', document.getElementById('assignEmpSelect').value); this.closest('.modal').remove()">Asignar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function confirmAssignment(locationId, employeeId) {
    if (!employeeId) { showNotification('Selecciona un empleado', 'error'); return; }

    const emp = employees.find(e => e.id == employeeId);
    const loc = locations.find(l => l.id === locationId);

    const existing = currentAssignments.find(a => a.employeeId == employeeId && a.locationId === locationId);
    if (existing) { showNotification('Ya está asignado', 'error'); return; }

    // Remove previous assignment for this location
    currentAssignments = currentAssignments.filter(a => a.locationId !== locationId);

    currentAssignments.push({
        locationId, locationName: loc.name,
        employeeId: parseInt(employeeId), employeeName: emp.name,
        group: emp.group
    });

    renderLocationsGrid();
    displayOptimizationResults(currentAssignments);
    saveToLocalStorage();
    showNotification(`${emp.name} asignado a ${loc.name}`, 'success');
}

// ============================================
// OPTIMIZE ASSIGNMENT
// ============================================
function optimizeAssignment() {
    const assignments = [];
    const usedEmployees = new Set();

    locations.forEach(loc => {
        const suitable = employees.filter(emp =>
            isEmployeeAvailable(emp) &&
            !usedEmployees.has(emp.id) &&
            (loc.requiredSkills.length === 0 ||
             loc.requiredSkills.some(s => emp.trainings.includes(s)))
        );

        if (suitable.length > 0) {
            const scored = suitable.map(emp => {
                let score = 10;
                loc.requiredSkills.forEach(s => { if (emp.trainings.includes(s)) score += 5; });
                const relevant = emp.trainings.filter(s => locations.some(l => l.requiredSkills.includes(s)));
                score += relevant.length * 2;
                const load = assignments.filter(a => a.employeeId === emp.id).length;
                score -= load * 3;
                return { employee: emp, score };
            });
            scored.sort((a,b) => b.score - a.score);
            const best = scored[0].employee;
            assignments.push({
                locationId: loc.id, locationName: loc.name,
                employeeId: best.id, employeeName: best.name,
                group: best.group
            });
            usedEmployees.add(best.id);
        }
    });

    currentAssignments = assignments;
    renderLocationsGrid();
    displayOptimizationResults(assignments);
    saveToLocalStorage();
    showNotification(`Asignación completada: ${assignments.length}/${locations.length} locaciones`, 'success');
}

// ============================================
// SMART QUERY
// ============================================
function processQuery() {
    const input = document.getElementById('queryInput').value.toLowerCase();
    if (!input.trim()) { showNotification('Ingresa un término', 'error'); return; }
    const results = searchEmployees(input);
    displayQueryResults(results, input);
}

function quickQuery(q) {
    document.getElementById('queryInput').value = q;
    processQuery();
}

function searchEmployees(query) {
    const results = [];
    employees.forEach(emp => {
        let matched = [];
        let score = 0;
        emp.trainings.forEach(s => {
            const name = getSkillName(s).toLowerCase();
            if (name.includes(query) || query.includes(name)) {
                matched.push(s);
                score += 10;
            }
        });
        const areaName = getAreaName(emp.area).toLowerCase();
        if (areaName.includes(query) || query.includes(areaName)) score += 5;
        if (emp.name.toLowerCase().includes(query)) score += 3;
        if (score > 0) results.push({ employee: emp, matchedSkills: matched, score });
    });
    return results.sort((a,b) => b.score - a.score);
}

function displayQueryResults(results, query) {
    const container = document.getElementById('queryResults');
    if (!container) return;

    let html = `<h4 style="margin-bottom:1rem;">Resultados para "${query}" (${results.length})</h4>`;
    if (results.length === 0) {
        html += '<p style="text-align:center;color:#6b7280;">No se encontraron empleados.</p>';
    } else {
        results.forEach(r => {
            html += `
                <div class="query-result-item">
                    <div class="query-result-header">
                        <span class="query-result-name">${r.employee.name}</span>
                        <span class="query-result-match">${r.score} pts</span>
                    </div>
                    <div class="query-result-details">${getAreaName(r.employee.area)} • ${r.employee.age} años • Grupo ${r.employee.group}</div>
                    <div class="query-result-skills">
                        ${r.matchedSkills.map(s => `<span class="query-skill-tag">${getSkillName(s)}</span>`).join('')}
                    </div>
                </div>
            `;
        });
    }
    container.innerHTML = html;
}

// ============================================
// TASKS
// ============================================
function populateEmployeeSelects() {
    const selects = ['taskAssignedTo'];
    selects.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        let opts = '<option value="">Seleccionar empleado...</option>';
        employees.forEach(e => {
            opts += `<option value="${e.id}">${e.name} - ${getAreaName(e.area)} - Grupo ${e.group}</option>`;
        });
        sel.innerHTML = opts;
    });
}

function openTaskModal() {
    document.getElementById('taskModal').style.display = 'block';
    document.getElementById('taskModalTitle').textContent = 'Nueva Tarea';
    document.getElementById('taskForm').reset();
    currentTaskEditId = null;
    populateEmployeeSelects();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate()+1);
    document.getElementById('taskDueDate').value = tomorrow.toISOString().split('T')[0];
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

function saveTask(event) {
    event.preventDefault();
    const data = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        assignedTo: parseInt(document.getElementById('taskAssignedTo').value),
        priority: document.getElementById('taskPriority').value,
        category: document.getElementById('taskCategory').value,
        dueDate: document.getElementById('taskDueDate').value
    };

    if (currentTaskEditId) {
        const idx = tasks.findIndex(t => t.id === currentTaskEditId);
        tasks[idx] = { ...tasks[idx], ...data };
        showNotification('Tarea actualizada', 'success');
        currentTaskEditId = null;
    } else {
        const newTask = {
            id: tasks.length > 0 ? Math.max(...tasks.map(t=>t.id)) + 1 : 1,
            ...data, status: 'pending', createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        showNotification('Tarea agregada', 'success');
    }
    renderTasks();
    saveToLocalStorage();
    closeTaskModal();
}

document.getElementById('taskForm').addEventListener('submit', saveTask);

function renderTasks() {
    const container = document.getElementById('taskList');
    if (!container) return;

    const groupFilter = document.getElementById('taskGroupFilter').value;
    const statusFilter = document.getElementById('taskStatusFilter').value;

    let filtered = tasks.filter(t => {
        const emp = employees.find(e => e.id === t.assignedTo);
        if (groupFilter && emp && emp.group !== groupFilter) return false;
        if (statusFilter && t.status !== statusFilter) return false;
        return true;
    });

    filtered.sort((a,b) => {
        const order = { urgent:4, high:3, medium:2, low:1 };
        if (order[a.priority] !== order[b.priority]) return order[b.priority] - order[a.priority];
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">No hay tareas con esos filtros.</p>';
        return;
    }

    let html = '';
    filtered.forEach(t => {
        const emp = employees.find(e => e.id === t.assignedTo);
        const isOverdue = new Date(t.dueDate) < new Date() && t.status !== 'completed';
        html += `
            <div class="task-item ${t.status === 'completed' ? 'status-completed' : ''} ${isOverdue ? 'overdue' : ''}">
                <div class="task-header">
                    <div class="task-title">${t.title}</div>
                    <div class="task-priority"><span class="priority-badge priority-${t.priority}">${getPriorityName(t.priority)}</span></div>
                </div>
                <div class="task-description">${t.description}</div>
                <div class="task-details">
                    <div class="task-assignment"><strong>Asignado a:</strong> ${emp ? emp.name : 'Sin asignar'} ${emp ? `<span class="group-badge">Grupo ${emp.group}</span>` : ''}</div>
                    <div class="task-meta">
                        <span class="task-category">${getCategoryDisplayName(t.category)}</span>
                        <span class="task-due-date ${isOverdue ? 'overdue' : ''}">📅 ${formatDate(t.dueDate)}</span>
                        <span class="task-status status-${t.status.replace(' ', '-')}">${getTaskStatusName(t.status)}</span>
                    </div>
                </div>
                <div class="task-actions">
                    ${t.status !== 'completed' ? `
                        <button class="btn btn-sm btn-success" onclick="updateTaskStatus(${t.id},'completed')"><i class="fas fa-check"></i> Completar</button>
                        <button class="btn btn-sm btn-primary" onclick="updateTaskStatus(${t.id},'in-progress')"><i class="fas fa-play"></i> En Progreso</button>
                    ` : ''}
                    <button class="btn btn-sm btn-secondary" onclick="editTask(${t.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    updateStats();
}

function filterTasks() { renderTasks(); }

function editTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    currentTaskEditId = id;
    document.getElementById('taskModalTitle').textContent = 'Editar Tarea';
    document.getElementById('taskTitle').value = t.title;
    document.getElementById('taskDescription').value = t.description;
    document.getElementById('taskPriority').value = t.priority;
    document.getElementById('taskCategory').value = t.category;
    document.getElementById('taskDueDate').value = t.dueDate;
    populateEmployeeSelects();
    document.getElementById('taskAssignedTo').value = t.assignedTo;
    document.getElementById('taskModal').style.display = 'block';
}

function deleteTask(id) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
    saveToLocalStorage();
    showNotification('Tarea eliminada', 'success');
}

function updateTaskStatus(id, status) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.status = status;
    renderTasks();
    saveToLocalStorage();
    showNotification(`Tarea: ${getTaskStatusName(status)}`, 'success');
}

// ============================================
// EXPORT TO EXCEL (CSV)
// ============================================
function exportToExcel() {
    try {
        const data = [];

        // Employees
        employees.forEach(e => {
            data.push({
                Tipo: 'Empleado',
                Nombre: e.name,
                Nacionalidad: e.nationality,
                Edad: e.age,
                Área: getAreaName(e.area),
                Grupo: e.group || 'N/A',
                Estado: getEmployeeStatus(e).text,
                Habilidades: (e.trainings || []).map(s => getSkillName(s)).join(', '),
                Horario: `${e.availability?.schedule?.startTime || '09:00'} - ${e.availability?.schedule?.endTime || '18:00'}`
            });
        });

        // Locations
        locations.forEach(l => {
            const assignment = currentAssignments.find(a => a.locationId === l.id);
            const emp = assignment ? employees.find(e => e.id === assignment.employeeId) : null;
            data.push({
                Tipo: 'Locación',
                Nombre: l.name,
                Categoría: l.category,
                'Tipo de Local': l.type === 'restaurant' ? 'Restaurante' : 'Tienda',
                Descripción: l.description || '',
                'Empleado Asignado': emp ? emp.name : 'Sin asignar',
                'Habilidades Requeridas': (l.requiredSkills || []).map(s => getSkillName(s)).join(', '),
                Estado: assignment ? 'Asignado' : 'Sin asignar'
            });
        });

        // Assignments
        currentAssignments.forEach(a => {
            const loc = locations.find(l => l.id === a.locationId);
            const emp = employees.find(e => e.id === a.employeeId);
            data.push({
                Tipo: 'Asignación',
                Locación: loc ? loc.name : 'Desconocida',
                Empleado: emp ? emp.name : 'Desconocido',
                Grupo: a.group || 'N/A',
                'Estado Empleado': emp ? getEmployeeStatus(emp).text : 'N/A'
            });
        });

        // Tasks
        tasks.forEach(t => {
            const emp = employees.find(e => e.id === t.assignedTo);
            data.push({
                Tipo: 'Tarea',
                Título: t.title,
                Descripción: t.description,
                'Asignado a': emp ? emp.name : 'Sin asignar',
                Prioridad: getPriorityName(t.priority),
                Categoría: getCategoryDisplayName(t.category),
                'Fecha Límite': t.dueDate,
                Estado: getTaskStatusName(t.status)
            });
        });

        // Build CSV
        if (data.length === 0) { showNotification('No hay datos para exportar', 'error'); return; }
        const headers = Object.keys(data[0]);
        let csv = headers.join(',') + '\n';
        data.forEach(row => {
            csv += headers.map(h => {
                let v = row[h] || '';
                if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
                    v = `"${v.replace(/"/g, '""')}"`;
                }
                return v;
            }).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `storyland_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification(`📊 Exportado: ${data.length} registros`, 'success');
    } catch (e) {
        console.error(e);
        showNotification('Error al exportar', 'error');
    }
}

// ============================================
// STATS
// ============================================
function updateStats() {
    document.getElementById('statEmployees').textContent = employees.length;
    document.getElementById('statLocations').textContent = locations.length;
    document.getElementById('statTasks').textContent = tasks.filter(t => t.status !== 'completed').length;
}

// ============================================
// SAMPLE DATA
// ============================================
function loadSampleData() {
    employees = [
        { id:1, name:'Juan García', nationality:'México', age:21, area:'food-beverage',
          trainings:['food-beverage','customer-service','vegetarian'], group:'A',
          availability:{ isOnBreak:false, isOnTraining:false, isDayOff:false, isHoliday:false,
            schedule:{ startTime:'09:00', endTime:'18:00', breakTimes:['12:00-12:30'], trainingTimes:[] },
            daysOff:['sunday'], holidays:[] } },
        { id:2, name:'María López', nationality:'Argentina', age:23, area:'retail',
          trainings:['customer-service','retail','souvenirs'], group:'B',
          availability:{ isOnBreak:false, isOnTraining:false, isDayOff:false, isHoliday:false,
            schedule:{ startTime:'10:00', endTime:'19:00', breakTimes:['13:00-13:30'], trainingTimes:[] },
            daysOff:['monday'], holidays:[] } },
        { id:3, name:'Carlos Rodríguez', nationality:'México', age:28, area:'security',
          trainings:['security','first-aid','bag-check'], group:'C',
          availability:{ isOnBreak:false, isOnTraining:false, isDayOff:false, isHoliday:false,
            schedule:{ startTime:'08:00', endTime:'17:00', breakTimes:['11:00-11:30'], trainingTimes:[] },
            daysOff:['tuesday'], holidays:[] } },
        { id:4, name:'Ana Silva', nationality:'Brasil', age:24, area:'food-beverage',
          trainings:['food-beverage','customer-service','cafe','vegetarian'], group:'A',
          availability:{ isOnBreak:false, isOnTraining:false, isDayOff:false, isHoliday:false,
            schedule:{ startTime:'09:00', endTime:'18:00', breakTimes:['12:30-13:00'], trainingTimes:[] },
            daysOff:['wednesday'], holidays:[] } },
        { id:5, name:'Luis Fernández', nationality:'España', age:26, area:'cleaning',
          trainings:['bathroom-cleaning','parking-cleaning','security'], group:'B',
          availability:{ isOnBreak:false, isOnTraining:false, isDayOff:false, isHoliday:false,
            schedule:{ startTime:'07:00', endTime:'16:00', breakTimes:['10:00-10:30'], trainingTimes:[] },
            daysOff:['thursday'], holidays:[] } },
        { id:6, name:'Sofia Chen', nationality:'China', age:22, area:'customer-service',
          trainings:['customer-service','retail','food-beverage'], group:'C',
          availability:{ isOnBreak:false, isOnTraining:false, isDayOff:false, isHoliday:false,
            schedule:{ startTime:'10:00', endTime:'19:00', breakTimes:['14:00-14:30'], trainingTimes:[] },
            daysOff:['friday'], holidays:[] } },
        { id:7, name:'Miguel Torres', nationality:'México', age:30, area:'security',
          trainings:['security','first-aid','bag-check','customer-service'], group:'A',
          availability:{ isOnBreak:false, isOnTraining:false, isDayOff:false, isHoliday:false,
            schedule:{ startTime:'08:00', endTime:'17:00', breakTimes:['11:30-12:00'], trainingTimes:[] },
            daysOff:['saturday'], holidays:[] } },
        { id:8, name:'Laura Martínez', nationality:'Colombia', age:25, area:'food-beverage',
          trainings:['food-beverage','customer-service','pizza'], group:'B',
          availability:{ isOnBreak:false, isOnTraining:false, isDayOff:false, isHoliday:false,
            schedule:{ startTime:'09:00', endTime:'18:00', breakTimes:['12:00-12:30'], trainingTimes:[] },
            daysOff:['sunday'], holidays:[] } }
    ];

    tasks = [
        { id:1, title:'Revisión de inventario Food Fair', description:'Verificar niveles de stock y caducidades',
          assignedTo:1, priority:'high', category:'maintenance', dueDate:'2025-06-28', status:'pending',
          createdAt: new Date().toISOString() },
        { id:2, title:'Limpieza profunda de Miss Muffet\'s', description:'Limpieza y organización de tienda',
          assignedTo:5, priority:'medium', category:'cleaning', dueDate:'2025-06-25', status:'in-progress',
          createdAt: new Date().toISOString() },
        { id:3, title:'Capacitación en atención al cliente', description:'Curso de servicio al cliente para todo el personal',
          assignedTo:6, priority:'high', category:'training', dueDate:'2025-07-01', status:'pending',
          createdAt: new Date().toISOString() }
    ];

    currentAssignments = [
        { locationId:'food-fair', locationName:'Food Fair', employeeId:1, employeeName:'Juan García', group:'A' },
        { locationId:'farm-stand', locationName:'Farm Stand', employeeId:4, employeeName:'Ana Silva', group:'A' },
        { locationId:'whistle-stop', locationName:'Whistle Stop Shop', employeeId:2, employeeName:'María López', group:'B' },
        { locationId:'dunkin', locationName:"Dunkin'", employeeId:8, employeeName:'Laura Martínez', group:'B' }
    ];
}

// ============================================
// INITIALIZATION
// ============================================
function initialize() {
    console.log('🚀 Inicializando StoryManager...');

    // Set date
    const dateInput = document.getElementById('workDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Try loading saved data
    const hasSaved = loadFromLocalStorage();

    if (!hasSaved || employees.length === 0) {
        loadSampleData();
        console.log('📦 Datos de ejemplo cargados');
    }

    // Render everything
    renderEmployees();
    renderLocationCards();
    renderLocationsGrid();
    renderTasks();
    populateEmployeeSelects();
    displayOptimizationResults(currentAssignments);
    updateStats();

    // Auto-save after 5 seconds of inactivity
    let saveTimeout;
    document.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveToLocalStorage, 3000);
    });

    console.log(`✅ Listo: ${employees.length} empleados, ${locations.length} locaciones, ${tasks.length} tareas`);
}

// ============================================
// LANGUAGE SWITCHER
// ============================================
// Versión simplificada para mantener funcionalidad
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showNotification(`Idioma: ${btn.textContent}`, 'info');
    });
});

// ============================================
// START
// ============================================
document.addEventListener('DOMContentLoaded', initialize);