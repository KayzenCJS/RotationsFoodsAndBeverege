// ============================================
// NAVIGATION
// ============================================
function setupNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
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
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
        });
    });
}

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
// STORYLAND LOCATIONS
// ============================================
let locations = [
    // === FOOD & BEVERAGE ===
    {
        id: 'pixie-kitchen',
        name: 'Pixie Kitchen',
        type: 'food-beverage',
        category: 'Comida',
        icon: 'fa-utensils',
        description: 'Comida especialmente diseñada para niños y familias',
        requiredRoles: ['server', 'cashier', 'cook'],
        servesAlcohol: false
    },
    {
        id: 'guard-house-snacks',
        name: 'Guard House Snacks',
        type: 'food-beverage',
        category: 'Snacks',
        icon: 'fa-cookie',
        description: 'Snacks y bebidas en la entrada del parque',
        requiredRoles: ['cashier'],
        servesAlcohol: false
    },
    {
        id: 'barnyard-pizza',
        name: 'Barnyard Pizza',
        type: 'food-beverage',
        category: 'Pizza',
        icon: 'fa-pizza-slice',
        description: 'Pizza y comida italiana',
        requiredRoles: ['cashier', 'server', 'cook'],
        servesAlcohol: false
    },
    {
        id: 'food-fair',
        name: 'Food Fair',
        type: 'food-beverage',
        category: 'Comida General',
        icon: 'fa-utensils',
        description: 'Comida clásica de parque de diversiones para toda la familia',
        requiredRoles: ['cashier', 'server', 'cook', 'dishwasher'],
        servesAlcohol: false
    },
    {
        id: 'dutch-village-ice-cream',
        name: 'Dutch Village Ice Cream Shop',
        type: 'food-beverage',
        category: 'Helados',
        icon: 'fa-ice-cream',
        description: 'Helados y postres holandeses',
        requiredRoles: ['cashier', 'server'],
        servesAlcohol: false
    },
    {
        id: 'slush-factory',
        name: 'Slush Factory',
        type: 'food-beverage',
        category: 'Bebidas',
        icon: 'fa-glass-water',
        description: 'Bebidas frías y slushies',
        requiredRoles: ['cashier'],
        servesAlcohol: false
    },
    {
        id: 'dippin-dots',
        name: "Dippin' Dots",
        type: 'food-beverage',
        category: 'Helados',
        icon: 'fa-snowflake',
        description: 'Helados de perlas congeladas',
        requiredRoles: ['cashier'],
        servesAlcohol: false
    },
    {
        id: 'sandwich-oasis',
        name: 'Sandwich Oasis',
        type: 'food-beverage',
        category: 'Sandwiches',
        icon: 'fa-bread-slice',
        description: 'Sandwiches frescos y comida rápida',
        requiredRoles: ['cashier', 'server', 'cook'],
        servesAlcohol: false
    },
    {
        id: 'farm-stand',
        name: 'The Farm Stand / Farmstand',
        type: 'food-beverage',
        category: 'Comida Vegana',
        icon: 'fa-leaf',
        description: 'Opciones vegetarianas y veganas: bananas con chocolate, masa frita, papas, pretzels',
        requiredRoles: ['cashier', 'server'],
        servesAlcohol: false
    },
    {
        id: 'world-pavilion',
        name: 'World Pavilion',
        type: 'food-beverage',
        category: 'Comida Internacional',
        icon: 'fa-globe',
        description: 'Comida de diferentes culturas del mundo',
        requiredRoles: ['cashier', 'server', 'cook', 'dishwasher'],
        servesAlcohol: true
    },
    {
        id: 'teddys-oasis',
        name: 'Oasis',
        type: 'food-beverage',
        category: 'Comida',
        icon: 'fa-utensils',
        description: 'Restaurante en el área de Oasis',
        requiredRoles: ['cashier', 'server', 'cook'],
        servesAlcohol: true
    },
    {
        id: 'poblano-cantina',
        name: 'Poblano Cantina',
        type: 'food-beverage',
        category: 'Mexicana',
        icon: 'fa-pepper-hot',
        description: 'Comida mexicana auténtica',
        requiredRoles: ['cashier', 'server', 'cook', 'bartender'],
        servesAlcohol: true
    },
    // === RETAIL / GIFT SHOPS ===
    {
        id: 'stockyard',
        name: 'The Stockyard',
        type: 'retail',
        category: 'Souvenirs',
        icon: 'fa-gift',
        description: 'Artículos de souvenirs y regalos del parque',
        requiredRoles: ['cashier'],
        servesAlcohol: false
    },
    {
        id: 'lets-pretend',
        name: "Let's Pretend Kids' Costumes",
        type: 'retail',
        category: 'Disfraces',
        icon: 'fa-mask',
        description: 'Disfraces y accesorios para niños',
        requiredRoles: ['cashier'],
        servesAlcohol: false
    },
    {
        id: 'miss-muffets-market',
        name: "Miss Muffet's Market",
        type: 'retail',
        category: 'Conveniencia',
        icon: 'fa-store',
        description: 'Artículos de necesidad diaria para el parque',
        requiredRoles: ['cashier'],
        servesAlcohol: false
    },
    {
        id: 'yum-yum-junction',
        name: 'Yum Yum Junction Candy Shop',
        type: 'retail',
        category: 'Dulces',
        icon: 'fa-candy-cane',
        description: 'Tienda de dulces y caramelos',
        requiredRoles: ['cashier'],
        servesAlcohol: false
    },
    {
        id: 'whistle-stop',
        name: 'Whistle Stop Shop',
        type: 'retail',
        category: 'Souvenirs',
        icon: 'fa-gift',
        description: 'Artículos de novedad, souvenirs, snacks y modelo de tren funcional',
        requiredRoles: ['cashier'],
        servesAlcohol: false
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
// CONFIGURATION - New Hampshire Labor Laws
// ============================================
const MIN_AGE_GENERAL = 16; // General employment in NH
const MIN_AGE_ALCOHOL = 18; // Required for serving alcohol in NH
const MIN_AGE_RESTRICTED = 18; // For certain restricted roles

// Locations that serve alcohol by default
const ALCOHOL_LOCATIONS = [
    'barnyard-pizza',
    'world-pavilion',
    'oasis',
    'pixie-kitchen'
];

function getMinAgeForRole(role) {
    if (role === 'bartender') return MIN_AGE_ALCOHOL;
    return MIN_AGE_GENERAL;
}

function canServeAlcohol(employee) {
    return employee.age >= MIN_AGE_ALCOHOL && 
           (employee.trainings || []).includes('nh-alcohol-certification');
}

function locationServesAlcohol(locationId) {
    return ALCOHOL_LOCATIONS.includes(locationId);
}

function canLocationServeAlcohol(locationId, assignedEmployees) {
    // Check if location is configured to serve alcohol
    if (!locationServesAlcohol(locationId)) return false;
    
    // Check if at least one assigned employee can serve alcohol
    return assignedEmployees.some(emp => canServeAlcohol(emp));
}

// ============================================
// SWITCH BETWEEN FOODS AND RETAIL
// ============================================
async function switchType(type) {
    currentType = type;
    setCurrentType(type);

    // Close admin panel if open
    document.getElementById('adminLocationsSection').style.display = 'none';
    document.getElementById('adminStaffingSection').style.display = 'none';

    showNotification(`Cargando datos de ${type === 'foods' ? 'Foods' : 'Retail'}...`, 'info');
    
    try {
        // Clear current data
        employees = [];
        tasks = [];
        currentAssignments = [];
        
        // Fetch new data for the selected type
        const apiLocations = await fetchLocations();
        locations = apiLocations.map(loc => ({
            ...loc,
            name: loc.id === 'teddys-oasis' ? 'Oasis' : loc.name, // Change Teddy's at Oasis to Oasis
            servesAlcohol: locationServesAlcohol(loc.id) || loc.serves_alcohol,
            requiredRoles: loc.required_roles || []
        }));
        
        const apiEmployees = await fetchEmployees();
        employees = apiEmployees.map(emp => ({
            ...emp,
            group: emp.group_id,
            hire_date: emp.hire_date,
            trainings: emp.trainings || [],
            availability: emp.availability || {
                isOnBreak: false,
                isOnTraining: false,
                isDayOff: false,
                isHoliday: false,
                schedule: {
                    startTime: emp.schedule_start_time || '09:00',
                    endTime: emp.schedule_end_time || '18:00'
                }
            }
        }));
        
        tasks = await fetchTasks();
        const allAssignments = await fetchAssignments();

        // Filter assignments by current work date and map to frontend format
        const workDate = document.getElementById('workDate');
        const currentDate = workDate ? workDate.value : new Date().toISOString().split('T')[0];
        currentAssignments = allAssignments.filter(a => a.work_date === currentDate).map(a => ({
            id: a.id,
            locationId: a.location_id,
            locationName: a.location_name,
            employeeId: a.employee_id,
            employeeName: a.employee_name,
            employeeRole: a.employee_role,
            groupId: a.group_id,
            workDate: a.work_date,
            startTime: a.start_time,
            endTime: a.end_time
        }));

        // Re-render everything (assignments after employees are loaded)
        renderEmployees();
        renderLocationCards();
        renderTasks();
        renderLocationsGrid(); // Render after employees are loaded
        displayOptimizationResults(currentAssignments);
        updateStats();

        showNotification(`Datos de ${type === 'foods' ? 'Foods' : 'Retail'} cargados`, 'success');
    } catch (error) {
        console.error('Error switching type:', error);
        showNotification('Error al cambiar de tipo', 'error');
    }
}

// ============================================
// API DATA LOADING
// ============================================

async function loadInitialData() {
    try {
        setCurrentType('foods');
        
        // Fetch and transform locations (convert snake_case to camelCase)
        const apiLocations = await fetchLocations();
        locations = apiLocations.map(loc => ({
            ...loc,
            name: loc.id === 'teddys-oasis' ? 'Oasis' : loc.name, // Change Teddy's at Oasis to Oasis
            servesAlcohol: locationServesAlcohol(loc.id) || loc.serves_alcohol,
            requiredRoles: loc.required_roles || []
        }));
        
        // Fetch and transform employees
        const apiEmployees = await fetchEmployees();
        employees = apiEmployees.map(emp => ({
            ...emp,
            group: emp.group_id,
            hire_date: emp.hire_date,
            trainings: emp.trainings || [],
            availability: emp.availability || {
                isOnBreak: false,
                isOnTraining: false,
                isDayOff: false,
                isHoliday: false,
                schedule: {
                    startTime: emp.schedule_start_time || '09:00',
                    endTime: emp.schedule_end_time || '18:00'
                }
            }
        }));

        tasks = await fetchTasks();
        const allAssignments = await fetchAssignments();

        // Filter assignments by current work date and map to frontend format
        const workDate = document.getElementById('workDate');
        const currentDate = workDate ? workDate.value : new Date().toISOString().split('T')[0];
        currentAssignments = allAssignments.filter(a => a.work_date === currentDate).map(a => ({
            id: a.id,
            locationId: a.location_id,
            locationName: a.location_name,
            employeeId: a.employee_id,
            employeeName: a.employee_name,
            employeeRole: a.employee_role,
            groupId: a.group_id,
            workDate: a.work_date,
            startTime: a.start_time,
            endTime: a.end_time
        }));

        renderEmployees();
        renderLocationCards();
        renderTasks();
        renderLocationsGrid(); // Render after employees are loaded
        displayOptimizationResults(currentAssignments);
        updateStats();
        showNotification('Datos cargados desde la API', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error al cargar datos de la API', 'error');
    }
}

// ============================================
// LOCAL STORAGE - Legacy (No longer used, API handles persistence)
// ============================================
function saveToLocalStorage() { return true; }
function loadFromLocalStorage() { return false; }
function clearLocalStorage() {
    // Clear from API instead
    showNotification('Función no implementada con API', 'info');
}

// ============================================
// HELPERS
// ============================================
function getRoleName(role) {
    const map = {
        'server': 'Server',
        'cashier': 'Cashier',
        'dishwasher': 'Dishwasher',
        'cook': 'Cook',
        'bartender': 'Bartender',
        'assistant-supervisor': 'Assistant Supervisor',
        'supervisor': 'Supervisor',
        'op': 'OP'
    };
    return map[role] || role;
}

function isEmployeeVersatile(emp) {
    const trainings = emp.trainings || [];

    // Role requirements based on trainings
    const roleRequirements = {
        'cashier': ['pos-training', 'cash-register'],
        'server': ['customer-service', 'pos-training'],
        'cook': ['grill-training', 'griddle-training', 'fryer-training', 'oven-training'],
        'bartender': ['nh-alcohol-certification', 'pos-training'],
        'dishwasher': ['dishwashing']
    };

    // Count how many roles the employee qualifies for
    let qualifiedRoles = 0;
    for (const [role, requiredTrainings] of Object.entries(roleRequirements)) {
        const hasRequiredTrainings = requiredTrainings.some(training =>
            trainings.includes(training)
        );
        if (hasRequiredTrainings) {
            qualifiedRoles++;
        }
    }

    // Employee is versatile if they qualify for 3 or more different roles
    return qualifiedRoles >= 3;
}

function getAvailableRoles(emp) {
    const trainings = emp.trainings || [];

    // Role requirements based on trainings
    const roleRequirements = {
        'cashier': ['pos-training', 'cash-register'],
        'server': ['customer-service', 'pos-training'],
        'cook': ['grill-training', 'griddle-training', 'fryer-training', 'oven-training'],
        'bartender': ['nh-alcohol-certification', 'pos-training'],
        'dishwasher': ['dishwashing']
    };

    // Check which roles the employee qualifies for
    const availableRoles = [];
    for (const [role, requiredTrainings] of Object.entries(roleRequirements)) {
        const hasRequiredTrainings = requiredTrainings.some(training =>
            trainings.includes(training)
        );
        if (hasRequiredTrainings) {
            availableRoles.push(role);
        }
    }

    // Always include their primary role
    if (!availableRoles.includes(emp.role)) {
        availableRoles.push(emp.role);
    }

    return availableRoles.length > 0 ? availableRoles : [emp.role];
}

function getSkillName(skill) {
    const map = {
        'dunkin-trained': 'Dunkin\' Certified',
        'food-safety': 'Food Safety / Food Handling',
        'pos-training': 'Cash Register / POS Training',
        'customer-service': 'Servicio al Cliente',
        'retail': 'Ventas / Retail',
        'souvenirs': 'Souvenirs / Merchandising'
    };
    return map[skill] || skill;
}

function getEmployeeStatus(emp) {
    if (!emp.availability) return { text: 'Disponible', class: 'status-available' };
    if (emp.availability.isOnBreak) return { text: 'En Break', class: 'status-break' };
    if (emp.availability.isOnTraining) return { text: 'En Training', class: 'status-training' };
    if (emp.availability.isDayOff) return { text: 'Day Off', class: 'status-dayoff' };
    if (emp.availability.isHoliday) return { text: 'Festivo', class: 'status-holiday' };
    return { text: 'Disponible', class: 'status-available' };
}

function isEmployeeAvailable(emp) {
    if (!emp.availability) return true;
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
    const countBadge = document.getElementById('employeeCountBadge');
    if (!container) return;

    // Update count badge
    if (countBadge) {
        countBadge.textContent = `${employees.length} empleado${employees.length !== 1 ? 's' : ''}`;
    }

    if (!employees || employees.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;">No hay empleados. Haz clic en "Nuevo Empleado".</p>';
        return;
    }

    let html = '';
    employees.forEach(emp => {
        const status = getEmployeeStatus(emp);
        const hireDate = emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('es-ES') : 'N/A';
        html += `
            <div class="employee-card ${status.class}">
                <div class="employee-info">
                    <div class="employee-name">
                        ${emp.name}
                        <span class="group-badge">Grupo ${emp.group || 'N/A'}</span>
                    </div>
                    <div class="employee-details">
                        ${getRoleName(emp.role)} • ${emp.age} años • ${emp.nationality}
                        ${isEmployeeVersatile(emp) ? '<span class="versatile-badge">🌟 Versátil</span>' : ''}
                    </div>
                    <div class="employee-details" style="font-size:0.85rem;color:#6b7280;">
                        📅 Ingreso: ${hireDate}
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
                    <button class="btn btn-sm btn-danger" onclick="handleDeleteEmployee(${emp.id})"><i class="fas fa-trash"></i></button>
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
                <span class="service-tag">${loc.type === 'food-beverage' ? '🍽️ Comida' : '🛍️ Tienda'} • ${loc.category}</span>
                <div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.25rem;">
                    ${loc.requiredRoles.map(r => `<span class="skill-tag">${getRoleName(r)}</span>`).join('')}
                </div>
                ${loc.servesAlcohol ? '<span class="skill-tag" style="background:#ef4444;">🍺 Alcohol</span>' : ''}
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
    if (!container) {
        console.error('Container locationsGrid not found');
        return;
    }

    let html = '';
    locations.forEach(loc => {
        const assigned = currentAssignments.filter(a => a.locationId === loc.id);

        const assignedEmps = assigned.map(a => employees.find(e => e.id === a.employeeId)).filter(e => e);

        html += `
            <div class="location-card">
                <div class="location-name">${loc.name}</div>
                <div class="location-type">${loc.type === 'food-beverage' ? '🍽️' : '🛍️'} ${loc.type === 'food-beverage' ? 'Comida' : 'Tienda'}</div>
                <div class="location-category">${loc.category}</div>
                <div class="location-skills">
                    ${loc.requiredRoles.map(r => `<span class="skill-tag">${getRoleName(r)}</span>`).join('')}
                </div>
                ${loc.servesAlcohol ? '<span class="skill-tag" style="background:#ef4444;">🍺 Alcohol</span>' : ''}
                <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-light);">
                    ${assignedEmps.length > 0 ?
                        assigned.map(a => {
                            const emp = employees.find(e => e.id === a.employeeId);
                            if (!emp) return '';
                            return `
                                <div style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0;border-bottom:1px solid #f1f5f9;">
                                    <span>👤 ${emp.name} (${getRoleName(emp.role)})</span>
                                    <span style="font-size:0.75rem;color:#6b7280;">${a.startTime ? a.startTime + '-' + a.endTime : ''}</span>
                                    <button class="btn btn-sm btn-danger" style="padding:0.25rem 0.5rem;font-size:0.7rem;" onclick="removeAssignment('${loc.id}', ${a.employeeId})">✕</button>
                                </div>
                            `;
                        }).join('') :
                        'Sin asignar'}
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

function toggleCheckboxes(button) {
    const category = button.closest('.training-category');
    const checkboxes = category.querySelectorAll('input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
    });
    
    button.textContent = allChecked ? 'Select All' : 'Deselect All';
}

function editEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    currentEditId = id;
    document.getElementById('modalTitle').textContent = 'Editar Empleado';
    document.getElementById('empName').value = emp.name;
    document.getElementById('empNationality').value = emp.nationality;
    document.getElementById('empAge').value = emp.age;

    // Format hire date for date input (YYYY-MM-DD)
    let hireDate = '';
    if (emp.hire_date) {
        const date = new Date(emp.hire_date);
        hireDate = date.toISOString().split('T')[0];
    }
    document.getElementById('empHireDate').value = hireDate;

    document.getElementById('empRole').value = emp.role;
    document.getElementById('empGroup').value = emp.group || 'A';

    // Reset all checkboxes first
    const checkboxes = document.querySelectorAll('#employeeForm input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
    });

    // Then check only the ones that match employee trainings
    if (emp.trainings && Array.isArray(emp.trainings)) {
        emp.trainings.forEach(training => {
            const matchingCheckbox = document.querySelector(`#employeeForm input[type="checkbox"][value="${training}"]`);
            if (matchingCheckbox) {
                matchingCheckbox.checked = true;
            }
        });
    }

    document.getElementById('employeeModal').style.display = 'block';
}

async function handleDeleteEmployee(id) {
    if (!confirm('¿Eliminar este empleado?')) return;
    try {
        await window.deleteEmployee(id);
        employees = employees.filter(e => e.id !== id);
        currentAssignments = currentAssignments.filter(a => a.employeeId !== id);
        renderEmployees();
        renderLocationsGrid();
        populateEmployeeSelects();
        displayOptimizationResults(currentAssignments);
        showNotification('Empleado eliminado', 'success');
    } catch (error) {
        console.error('Error deleting employee:', error);
        showNotification('Error al eliminar empleado', 'error');
    }
}

document.getElementById('employeeForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('empName').value;
    const nationality = document.getElementById('empNationality').value;
    const age = parseInt(document.getElementById('empAge').value);
    const hireDate = document.getElementById('empHireDate').value;
    const role = document.getElementById('empRole').value;
    const group = document.getElementById('empGroup').value;

    // Validate minimum age for role
    const minAge = getMinAgeForRole(role);
    if (age < minAge) {
        showNotification(`Edad mínima para ${getRoleName(role)} es ${minAge} años (Leyes de NH)`, 'error');
        return;
    }

    const trainings = [];
    document.querySelectorAll('#employeeForm input[type="checkbox"]:checked').forEach(cb => {
        trainings.push(cb.value);
    });

    // Remove duplicates
    const uniqueTrainings = [...new Set(trainings)];

    const availability = {
        is_on_break: false,
        is_on_training: false,
        is_day_off: false,
        is_holiday: false,
        schedule_start_time: '09:00',
        schedule_end_time: '18:00',
        days_off: ['sunday'],
        holidays: []
    };

    const payload = { name, nationality, age, role, group_id: group, hire_date: hireDate || new Date().toISOString().split('T')[0], trainings: uniqueTrainings, availability };
    console.log('Creating employee with payload:', payload);

    try {
        if (currentEditId) {
            const index = employees.findIndex(e => e.id === currentEditId);
            if (index !== -1) {
                const updated = await updateEmployee(currentEditId, { name, nationality, age, role, group_id: group, hire_date: hireDate, trainings: uniqueTrainings, availability });
                // Transform the response to match frontend format
                employees[index] = {
                    ...updated,
                    group: updated.group_id,
                    trainings: updated.trainings || [],
                    availability: updated.availability || {
                        isOnBreak: updated.is_on_break,
                        isOnTraining: updated.is_on_training,
                        isDayOff: updated.is_day_off,
                        isHoliday: updated.is_holiday,
                        schedule: {
                            startTime: updated.schedule_start_time,
                            endTime: updated.schedule_end_time
                        }
                    }
                };
            }
            showNotification('Empleado actualizado', 'success');
            currentEditId = null;
        } else {
            const newEmp = await createEmployee(payload);
            // Transform the response to match frontend format
            const transformedEmp = {
                ...newEmp,
                group: newEmp.group_id,
                trainings: newEmp.trainings || [],
                availability: newEmp.availability || {
                    isOnBreak: newEmp.is_on_break,
                    isOnTraining: newEmp.is_on_training,
                    isDayOff: newEmp.is_day_off,
                    isHoliday: newEmp.is_holiday,
                    schedule: {
                        startTime: newEmp.schedule_start_time,
                        endTime: newEmp.schedule_end_time
                    }
                }
            };
            employees.push(transformedEmp);
            showNotification('Empleado agregado', 'success');
        }

        renderEmployees();
        renderLocationsGrid();
        populateEmployeeSelects();
        closeEmployeeModal();
    } catch (error) {
        console.error('Error saving employee:', error);
        showNotification('Error al guardar empleado', 'error');
    }
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
    showNotification(`Estado actualizado`, 'success');
}

// ============================================
// ASSIGNMENT
// ============================================

function hasScheduleConflict(employeeId, newLocationId, workDate, startTime, endTime) {
    // Check if employee is already assigned to another location at the same time on the same date
    const employeeAssignments = currentAssignments.filter(a =>
        a.employeeId === employeeId &&
        a.locationId !== newLocationId &&
        a.workDate === workDate  // Only check conflicts on the same date
    );

    for (const assignment of employeeAssignments) {
        // Check for time overlap
        const existingStart = assignment.startTime || '09:00';
        const existingEnd = assignment.endTime || '18:00';

        if (hasTimeOverlap(startTime, endTime, existingStart, existingEnd)) {
            return {
                hasConflict: true,
                conflictingLocation: assignment.locationName,
                conflictingTime: `${existingStart} - ${existingEnd}`
            };
        }
    }

    return { hasConflict: false };
}

function hasTimeOverlap(start1, end1, start2, end2) {
    const s1 = timeToMinutes(start1);
    const e1 = timeToMinutes(end1);
    const s2 = timeToMinutes(start2);
    const e2 = timeToMinutes(end2);

    return (s1 < e2 && e1 > s2);
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// ============================================
// SUPERVISOR ASSIGNMENT MODAL
// ============================================
function openSupervisorAssignmentModal() {
    const date = document.getElementById('workDate').value;
    if (!date) {
        showNotification('Por favor selecciona una fecha', 'error');
        return;
    }

    // Get supervisors and assistant supervisors
    const supervisors = employees.filter(emp =>
        emp.role === 'supervisor' || emp.role === 'assistant-supervisor' || emp.role === 'op'
    );

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:800px;">
            <div class="modal-header">
                <h3>Asignar Supervisores a Buildings</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding:1.5rem;">
                <p style="margin-bottom:1rem;color:#6b7280;">
                    Fecha: ${formatDate(date)} | Un supervisor puede supervisar hasta 5 buildings
                </p>

                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Seleccionar Supervisor:</label>
                    <select id="supervisorSelect" style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid #d1d5db;">
                        <option value="">Seleccionar...</option>
                        ${supervisors.map(s => `<option value="${s.id}">${s.name} - ${getRoleName(s.role)}</option>`).join('')}
                    </select>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Buildings a supervisar (máximo 5):</label>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.5rem;">
                        ${locations.map(loc => `
                            <label style="display:flex;align-items:center;padding:0.5rem;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
                                <input type="checkbox" value="${loc.id}" class="building-checkbox" />
                                <span style="margin-left:0.5rem;font-size:0.875rem;">${loc.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Rol de supervisión:</label>
                    <select id="supervisorRole" style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid #d1d5db;">
                        <option value="supervisor">Supervisor</option>
                        <option value="assistant-supervisor">Assistant Supervisor</option>
                        <option value="op">OP</option>
                    </select>
                </div>

                <div style="margin-top:1rem;display:flex;gap:0.5rem;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="confirmSupervisorAssignment('${date}')">Asignar Supervisor</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function confirmSupervisorAssignment(date) {
    const supervisorSelect = document.getElementById('supervisorSelect');
    const supervisorRoleSelect = document.getElementById('supervisorRole');
    const buildingCheckboxes = document.querySelectorAll('.building-checkbox:checked');

    const supervisorId = parseInt(supervisorSelect.value);
    if (!supervisorId) {
        showNotification('Selecciona un supervisor', 'error');
        return;
    }

    if (buildingCheckboxes.length === 0) {
        showNotification('Selecciona al menos un building', 'error');
        return;
    }

    if (buildingCheckboxes.length > 5) {
        showNotification('Un supervisor puede supervisar máximo 5 buildings', 'error');
        return;
    }

    const role = supervisorRoleSelect.value;

    try {
        // Check existing assignments for this supervisor on this date
        const existingAssignments = await fetchSupervisorAssignments(date, supervisorId);

        if (existingAssignments.length + buildingCheckboxes.length > 5) {
            showNotification(`El supervisor ya tiene ${existingAssignments.length} asignaciones. Total excedería el máximo de 5.`, 'error');
            return;
        }

        // Create assignments for each selected building
        for (const checkbox of buildingCheckboxes) {
            const locationId = checkbox.value;
            await createSupervisorAssignment({
                supervisor_id: supervisorId,
                location_id: locationId,
                assigned_date: date,
                role: role
            });
        }

        showNotification(`Supervisor asignado a ${buildingCheckboxes.length} buildings`, 'success');
        document.querySelector('.modal').remove();

        // Refresh the display
        loadAssignmentHistory();
    } catch (error) {
        console.error('Error assigning supervisor:', error);
        showNotification('Error al asignar supervisor', 'error');
    }
}
function assignEmployee(locationId) {
    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    // Get all available employees (not filtering by role anymore)
    const available = employees.filter(emp => isEmployeeAvailable(emp));

    const assigned = currentAssignments.filter(a => a.locationId === locationId);
    const assignedIds = assigned.map(a => a.employeeId);

    if (available.length === 0 && assigned.length === 0) {
        showNotification('No hay empleados disponibles', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
                <h3>Asignar a: ${location.name}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding:1.5rem;">
                <p style="margin-bottom:1rem;color:#6b7280;">Roles requeridos: ${location.requiredRoles.map(r => getRoleName(r)).join(', ')}</p>
                
                ${assigned.length > 0 ? `
                <div style="margin-bottom:1rem;padding:1rem;background:#f3f4f6;border-radius:8px;">
                    <h5 style="margin:0 0 0.5rem 0;">Empleados asignados (${assigned.length}):</h5>
                    ${assigned.map(a => {
                        const emp = employees.find(e => e.id === a.employeeId);
                        return emp ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0;">
                            <span>${emp.name} - ${getRoleName(emp.role)} - Grupo ${emp.group}</span>
                            <button class="btn btn-sm btn-danger" onclick="removeAssignment('${location.id}', ${a.employeeId}); this.closest('.modal').remove();">✕</button>
                        </div>` : '';
                    }).join('')}
                </div>
                ` : ''}
                
                <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Agregar empleado:</label>
                <select id="assignEmpSelect" style="width:100%;padding:10px;border-radius:8px;border:1px solid #e5e7eb;">
                    <option value="">Seleccionar...</option>
                    ${available.filter(e => !assignedIds.includes(e.id)).map(e => `<option value="${e.id}">${e.name} - ${getRoleName(e.role)} - Grupo ${e.group}</option>`).join('')}
                </select>
                
                <div style="margin-top:1rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Horario de trabajo:</label>
                    <div style="display:flex;gap:0.5rem;">
                        <div style="flex:1;">
                            <label style="font-size:0.875rem;">Inicio:</label>
                            <input type="time" id="assignStartTime" value="09:00" style="width:100%;padding:8px;border-radius:6px;border:1px solid #e5e7eb;" />
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.875rem;">Fin:</label>
                            <input type="time" id="assignEndTime" value="17:00" style="width:100%;padding:8px;border-radius:6px;border:1px solid #e5e7eb;" />
                        </div>
                    </div>
                </div>
                
                <div style="margin-top:1rem;display:flex;gap:0.5rem;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button class="btn btn-primary" onclick="confirmAssignment('${location.id}')">Asignar</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function confirmAssignment(locationId) {
    const select = document.getElementById('assignEmpSelect');
    const startTimeInput = document.getElementById('assignStartTime');
    const endTimeInput = document.getElementById('assignEndTime');
    const workDateInput = document.getElementById('workDate');

    const employeeId = parseInt(select.value);
    if (!employeeId) {
        showNotification('Selecciona un empleado', 'error');
        return;
    }

    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const workDate = workDateInput ? workDateInput.value : new Date().toISOString().split('T')[0];

    if (!startTime || !endTime) {
        showNotification('Selecciona el horario de trabajo', 'error');
        return;
    }

    if (startTime >= endTime) {
        showNotification('El horario de fin debe ser después del inicio', 'error');
        return;
    }

    // Check if location is disabled
    const isDisabled = await checkLocationDisabled(locationId, workDate);
    if (isDisabled) {
        const loc = locations.find(l => l.id === locationId);
        showNotification(`❌ No se puede asignar: ${loc.name} está deshabilitado para la fecha ${formatDate(workDate)}. Consulta el estado de la locación en la sección de Gestión de Locaciones.`, 'error');
        return;
    }

    // Check for schedule conflicts
    const conflictCheck = hasScheduleConflict(employeeId, locationId, workDate, startTime, endTime);
    if (conflictCheck.hasConflict) {
        const emp = employees.find(e => e.id === employeeId);
        showNotification(`❌ Conflicto de horario: ${emp.name} ya está asignado a ${conflictCheck.conflictingLocation} durante el horario ${conflictCheck.conflictingTime}. No puede estar en dos lugares al mismo tiempo.`, 'error');
        return;
    }

    const emp = employees.find(e => e.id === employeeId);
    const loc = locations.find(l => l.id === locationId);

    try {
        // Validate staffing requirements before creating assignment (only if rules exist)
        try {
            const currentLocationAssignments = currentAssignments.filter(a => a.locationId === locationId);
            const staffingValidation = await validateStaffingRequirements(locationId, currentLocationAssignments);

            // Only block if validation explicitly says invalid and has missing requirements
            if (!staffingValidation.valid && staffingValidation.missing && staffingValidation.missing.length > 0) {
                const missingRequirements = staffingValidation.missing;
                let errorMessage = `⚠️ Requisitos incompletos para ${loc.name}\n\nEsta locación requiere:\n`;

                missingRequirements.forEach(missing => {
                    const currentCount = staffingValidation.current ? (staffingValidation.current[missing.role] || 0) : 0;
                    const requiredCount = missing.required;
                    const status = currentCount >= requiredCount ? '✓' : '✗';
                    errorMessage += `${status} ${currentCount}/${requiredCount} ${getRoleName(missing.role)}\n`;
                });

                errorMessage += `\nFaltan: ${missingRequirements.map(m => `${m.missing} ${getRoleName(m.role)}`).join(' y ')}.\n\nPuedes asignar este empleado, pero la locación no cumplirá con los requisitos mínimos de personal.`;
                showNotification(errorMessage, 'warning');
                return;
            }
        } catch (validationError) {
            console.error('Error validating staffing requirements:', validationError);
            // Continue with assignment if validation fails
        }

        const assignment = await createAssignment({
            location_id: loc.id,
            employee_id: emp.id,
            work_date: workDate,
            start_time: startTime,
            end_time: endTime
        });
        console.log('Assignment created successfully:', assignment);
        currentAssignments.push({
            locationId: loc.id,
            locationName: loc.name,
            employeeId: emp.id,
            employeeName: emp.name,
            group: emp.group,
            startTime: startTime,
            endTime: endTime
        });
        document.querySelector('.modal').remove();
        renderLocationsGrid();
        displayOptimizationResults(currentAssignments);
        showNotification(`${emp.name} asignado a ${loc.name}`, 'success');
    } catch (error) {
        console.error('Error creating assignment:', error);
        // Handle specific error types
        if (error.message && error.message.includes('schedule_conflict')) {
            showNotification(`❌ Conflicto de horario: ${error.message.replace('schedule_conflict: ', '')}`, 'error');
        } else if (error.message) {
            showNotification(`Error al crear asignación: ${error.message}`, 'error');
        } else {
            showNotification('Error al crear asignación. Por favor intenta nuevamente.', 'error');
        }
    }
}

async function removeAssignment(locationId, employeeId) {
    try {
        // Find assignment ID first
        const assignment = currentAssignments.find(a => a.locationId === locationId && a.employeeId === employeeId);
        if (assignment && assignment.id) {
            await deleteAssignment(assignment.id);
        }
        currentAssignments = currentAssignments.filter(a => !(a.locationId === locationId && a.employeeId === employeeId));
        renderLocationsGrid();
        displayOptimizationResults(currentAssignments);
        showNotification('Asignación eliminada', 'success');
    } catch (error) {
        console.error('Error deleting assignment:', error);
        showNotification('Error al eliminar asignación', 'error');
    }
}

// ============================================
// TASKS
// ============================================
function openTaskModal() {
    document.getElementById('taskModal').style.display = 'block';
    document.getElementById('taskModalTitle').textContent = 'Nueva Tarea';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskCategory').value = 'other';
    document.getElementById('taskDueDate').value = '';
    populateEmployeeSelects();
    document.getElementById('taskAssignedTo').value = '';
    currentTaskEditId = null;
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

function populateEmployeeSelects() {
    const select = document.getElementById('taskAssignedTo');
    if (!select) return;
    select.innerHTML = '<option value="">Sin asignar</option>' + employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
}

function renderTasks() {
    const container = document.getElementById('taskList');
    if (!container) return;

    const groupFilter = document.getElementById('taskGroupFilter').value;
    const statusFilter = document.getElementById('taskStatusFilter').value;
    const categoryFilter = document.getElementById('taskCategoryFilter').value;
    const dateFilter = document.getElementById('taskDateFilter').value;

    let filtered = tasks;
    if (groupFilter) filtered = filtered.filter(t => t.group === groupFilter);
    if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
    if (categoryFilter) filtered = filtered.filter(t => t.category === categoryFilter);
    if (dateFilter) filtered = filtered.filter(t => t.due_date === dateFilter);

    if (!filtered || filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;">No hay tareas.</p>';
        return;
    }

    let html = '';
    filtered.forEach(t => {
        const emp = employees.find(e => e.id === t.assignedTo);
        html += `
            <div class="task-item ${t.status}">
                <div class="task-header">
                    <span class="task-title">${t.title}</span>
                    <span class="task-priority ${t.priority}">${getPriorityName(t.priority)}</span>
                </div>
                <div class="task-body">
                    <p>${t.description}</p>
                    <div class="task-meta">
                        <span>Asignado a: ${emp ? emp.name : 'Sin asignar'}</span>
                        <span>Categoría: ${getCategoryDisplayName(t.category)}</span>
                        <span>Fecha: ${formatDate(t.dueDate)}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-sm btn-secondary" onclick="editTask(${t.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id})"><i class="fas fa-trash"></i></button>
                    <select onchange="updateTaskStatus(${t.id}, this.value)" style="padding:5px;border-radius:4px;">
                        <option value="pending" ${t.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                        <option value="in-progress" ${t.status === 'in-progress' ? 'selected' : ''}>En Progreso</option>
                        <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completada</option>
                    </select>
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

async function deleteTask(id) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
        await deleteTask(id);
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
        showNotification('Tarea eliminada', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Error al eliminar tarea', 'error');
    }
}

async function updateTaskStatus(id, status) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    try {
        await updateTask(id, { status });
        t.status = status;
        renderTasks();
        showNotification(`Tarea: ${getTaskStatusName(status)}`, 'success');
    } catch (error) {
        console.error('Error updating task status:', error);
        showNotification('Error al actualizar tarea', 'error');
    }
}

document.getElementById('taskForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const priority = document.getElementById('taskPriority').value;
    const category = document.getElementById('taskCategory').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const assignedTo = parseInt(document.getElementById('taskAssignedTo').value) || null;

    try {
        if (currentTaskEditId) {
            const index = tasks.findIndex(t => t.id === currentTaskEditId);
            if (index !== -1) {
                const updated = await updateTask(currentTaskEditId, { title, description, priority, category, dueDate, assignedTo });
                tasks[index] = { ...tasks[index], title, description, priority, category, dueDate, assignedTo };
            }
            showNotification('Tarea actualizada', 'success');
            currentTaskEditId = null;
        } else {
            const newTask = await createTask({ title, description, priority, category, dueDate, assignedTo, status: 'pending' });
            tasks.push(newTask);
            showNotification('Tarea creada', 'success');
        }

        renderTasks();
        closeTaskModal();
    } catch (error) {
        console.error('Error saving task:', error);
        showNotification('Error al guardar tarea', 'error');
    }
});

// ============================================
// OPTIMIZATION
// ============================================
function optimizeAssignment() {
    const date = document.getElementById('workDate').value;
    const results = [];
    const assignedEmployees = new Set();

    locations.forEach(loc => {
        // Enhanced availability check considering versatile employees and conflicts
        const available = employees.filter(emp => {
            if (!isEmployeeAvailable(emp)) return false;

            // Skip if already assigned
            if (assignedEmployees.has(emp.id)) return false;

            // If location has no specific role requirements, any available employee works
            if (loc.requiredRoles.length === 0) return true;

            // Check if employee can perform any of the required roles
            const canPerformRole = loc.requiredRoles.some(role => {
                if (isEmployeeVersatile(emp)) {
                    const availableRoles = getAvailableRoles(emp);
                    return availableRoles.includes(role);
                }
                return emp.role === role;
            });

            return canPerformRole;
        });

        if (available.length > 0) {
            const emp = available[0];
            // Determine which role they're being assigned to
            const assignedRole = isEmployeeVersatile(emp) && loc.requiredRoles.length > 0
                ? loc.requiredRoles.find(role => getAvailableRoles(emp).includes(role)) || emp.role
                : emp.role;

            results.push({
                locationId: loc.id,
                locationName: loc.name,
                employeeId: emp.id,
                employeeName: emp.name,
                employeeRole: assignedRole,
                group: emp.group,
                isVersatile: isEmployeeVersatile(emp),
                primaryRole: emp.role,
                workDate: date,
                startTime: '09:00',
                endTime: '18:00'
            });

            assignedEmployees.add(emp.id);
        }
    });

    currentAssignments = results;
    displayOptimizationResults(results);
    renderLocationsGrid();
    showNotification(`Asignación optimizada: ${results.length}/${locations.length} locaciones`, 'success');
}

// ============================================
// QUERY
// ============================================
function processQuery() {
    const query = document.getElementById('queryInput').value.toLowerCase();
    const results = employees.filter(emp => {
        return emp.name.toLowerCase().includes(query) ||
               emp.role.toLowerCase().includes(query) ||
               (emp.trainings || []).some(t => t.toLowerCase().includes(query));
    });

    const container = document.getElementById('queryResults');
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;">No se encontraron resultados.</p>';
        return;
    }

    let html = '<h4>Resultados:</h4>';
    results.forEach(emp => {
        html += `
            <div style="padding:1rem;background:#f9fafb;border-radius:8px;margin-bottom:0.5rem;">
                <strong>${emp.name}</strong> - ${getRoleName(emp.role)} - Grupo ${emp.group}<br>
                Habilidades: ${(emp.trainings || []).map(t => getSkillName(t)).join(', ')}
            </div>
        `;
    });
    container.innerHTML = html;
}

function switchQueryTab(tab) {
    document.querySelectorAll('.query-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'employees') {
        document.getElementById('employeeQueryTab').style.display = 'block';
        document.getElementById('locationQueryTab').style.display = 'none';
    } else {
        document.getElementById('employeeQueryTab').style.display = 'none';
        document.getElementById('locationQueryTab').style.display = 'block';
    }

    document.getElementById('queryResults').innerHTML = '';
}

async function queryByLocation() {
    const locationId = document.getElementById('locationQuerySelect').value;
    if (!locationId) {
        showNotification('Selecciona una locación', 'error');
        return;
    }

    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    try {
        // Get assignments for this location
        const assignments = await fetchAssignments();

        // Count assignments per employee
        const employeeStats = {};
        assignments.filter(a => a.locationId === locationId).forEach(assignment => {
            if (!employeeStats[assignment.employeeId]) {
                employeeStats[assignment.employeeId] = {
                    count: 0,
                    employee: employees.find(e => e.id === assignment.employeeId)
                };
            }
            employeeStats[assignment.employeeId].count++;
        });

        const container = document.getElementById('queryResults');
        if (!container) return;

        const statsArray = Object.values(employeeStats).sort((a, b) => b.count - a.count);

        if (statsArray.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#6b7280;">No hay asignaciones registradas para esta locación</p>';
            return;
        }

        let html = `
            <div class="location-query-header">
                <h4>📍 ${location.name}</h4>
                <p>Historial de asignaciones por empleado</p>
            </div>
            <div class="location-stats-grid">
        `;

        statsArray.forEach(stat => {
            if (stat.employee) {
                html += `
                    <div class="location-stat-card">
                        <div class="stat-employee-name">${stat.employee.name}</div>
                        <div class="stat-employee-details">
                            ${getRoleName(stat.employee.role)} • Grupo ${stat.employee.group}
                        </div>
                        <div class="stat-assignment-count">
                            <span class="count-number">${stat.count}</span>
                            <span class="count-label">asignaciones</span>
                        </div>
                    </div>
                `;
            }
        });

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error querying by location:', error);
        showNotification('Error al consultar historial de locación', 'error');
    }
}

function quickQuery(term) {
    document.getElementById('queryInput').value = term;
    processQuery();
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================
function scrollToTasks() {
    // Close admin panel if open
    document.getElementById('adminLocationsSection').style.display = 'none';
    document.getElementById('adminStaffingSection').style.display = 'none';

    const tasksSection = document.getElementById('tasks-section');
    if (tasksSection) {
        tasksSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Find the task management section
        const taskSections = document.querySelectorAll('.demo-section');
        taskSections.forEach(section => {
            if (section.querySelector('#taskList')) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}

function openWastelog() {
    // Wastelog button - currently prepared for future URL
    showNotification('Wastelog: Funcionalidad en desarrollo. URL pendiente de configuración.', 'info');
    // When URL is available, uncomment the following line:
    // window.open('https://wastelog-platform-url.com', '_blank');
}

// ============================================
// STAFFING RULES MANAGEMENT
// ============================================
async function loadStaffingRules() {
    try {
        const rules = await fetchStaffingRules();
        const container = document.getElementById('staffingRulesContainer');
        if (!container) return;

        if (!rules || !Array.isArray(rules) || rules.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#6b7280;">No hay reglas de staffing configuradas</p>';
            return;
        }

        let html = '<div class="staffing-rules-grid">';
        rules.forEach(rule => {
            try {
                let requirements = [];
                let requirementsText = 'Sin requisitos definidos';

                try {
                    if (rule.requirements && typeof rule.requirements === 'string') {
                        requirements = JSON.parse(rule.requirements);
                    } else if (Array.isArray(rule.requirements)) {
                        requirements = rule.requirements;
                    }

                    if (requirements && requirements.length > 0) {
                        requirementsText = requirements.map(req =>
                            `${req.count} ${getRoleName(req.role)}${req.required_certifications && req.required_certifications.length > 0 ? ` (${req.required_certifications.join(', ')})` : ''}`
                        ).join(' + ');
                    }
                } catch (parseError) {
                    console.error('Error parsing rule requirements:', parseError);
                    requirementsText = 'Error en requisitos';
                }

                html += `
                    <div class="staffing-rule-card">
                        <div class="rule-header">
                            <span class="rule-location">${rule.location_name}</span>
                            <span class="rule-status ${rule.is_active ? 'active' : 'inactive'}">${rule.is_active ? 'Activo' : 'Inactivo'}</span>
                        </div>
                        <div class="rule-details">
                            <div class="rule-detail">
                                <span class="rule-label">Mínimo:</span>
                                <span class="rule-value">${rule.min_employees} empleados</span>
                            </div>
                            <div class="rule-detail">
                                <span class="rule-label">Requisitos:</span>
                                <span class="rule-value">${requirementsText}</span>
                            </div>
                        </div>
                        <div class="rule-actions">
                            <button class="btn btn-sm btn-secondary" onclick="editStaffingRule('${rule.location_id}')">Editar</button>
                            <button class="btn btn-sm btn-danger" onclick="deactivateStaffingRule('${rule.location_id}')">Desactivar</button>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error processing rule:', error);
            }
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading staffing rules:', error);
        const container = document.getElementById('staffingRulesContainer');
        if (container) {
            container.innerHTML = '<p style="text-align:center;color:#ef4444;">Error al cargar reglas de staffing</p>';
        }
    }
}

async function refreshStaffingRules() {
    await loadStaffingRules();
    showNotification('Reglas de staffing actualizadas', 'success');
}

function editStaffingRule(locationId) {
    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
                <h3>Editar Regla: ${location.name}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="staffingRuleForm">
                <div class="form-group">
                    <label>Personal Mínimo</label>
                    <input type="number" id="ruleMinEmployees" min="1" required />
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select id="ruleActive">
                        <option value="true">Activo</option>
                        <option value="false">Inactivo</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Load current rule data
    fetchLocationStaffingRule(locationId).then(rule => {
        if (rule) {
            document.getElementById('ruleMinEmployees').value = rule.min_employees;
            document.getElementById('ruleActive').value = rule.is_active.toString();
        }
    });

    document.getElementById('staffingRuleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const minEmployees = parseInt(document.getElementById('ruleMinEmployees').value);
        const isActive = document.getElementById('ruleActive').value === 'true';

        try {
            await updateStaffingRule(locationId, {
                min_employees: minEmployees,
                is_active: isActive,
                requirements: JSON.stringify([
                    { role: 'cashier', count: 1, required_certifications: [] }
                ]) // Simplified for now - should be expanded
            });

            showNotification('Regla de staffing actualizada', 'success');
            modal.remove();
            loadStaffingRules();
        } catch (error) {
            console.error('Error updating staffing rule:', error);
            showNotification('Error al actualizar regla de staffing', 'error');
        }
    });
}

async function deactivateStaffingRule(locationId) {
    if (!confirm('¿Desactivar esta regla de staffing?')) return;

    try {
        await deactivateStaffingRule(locationId);
        showNotification('Regla de staffing desactivada', 'success');
        loadStaffingRules();
    } catch (error) {
        console.error('Error deactivating staffing rule:', error);
        showNotification('Error al desactivar regla de staffing', 'error');
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
// EXPORT
// ============================================
function exportToExcel() {
    try {
        const data = [];
        employees.forEach(e => {
            data.push({
                Tipo: 'Empleado',
                Nombre: e.name,
                Nacionalidad: e.nationality,
                Edad: e.age,
                Rol: getRoleName(e.role),
                Grupo: e.group || 'N/A',
                Estado: getEmployeeStatus(e).text
            });
        });

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
// ASSIGNMENT HISTORY
// ============================================
async function loadAssignmentHistory() {
    const date = document.getElementById('historyDate').value;
    if (!date) {
        showNotification('Por favor selecciona una fecha', 'error');
        return;
    }

    try {
        const history = await fetchAssignmentHistory(date);
        renderAssignmentHistory(history);
    } catch (error) {
        console.error('Error loading assignment history:', error);
        showNotification('Error al cargar historial de asignaciones', 'error');
    }
}

function renderAssignmentHistory(history) {
    const container = document.getElementById('historyContent');
    if (!container) return;

    let html = `<div class="history-date-header"><h4>Historial para ${formatDate(history.date)}</h4></div>`;

    // Assignments section
    html += `<div class="history-section">
        <h5><i class="fas fa-users"></i> Asignaciones de Empleados</h5>
        <div class="history-table">`;

    if (history.assignments.length === 0) {
        html += `<p>No hay asignaciones para esta fecha</p>`;
    } else {
        html += `<table>
            <thead>
                <tr>
                    <th>Locación</th>
                    <th>Empleado</th>
                    <th>Rol</th>
                    <th>Grupo</th>
                    <th>Horario</th>
                </tr>
            </thead>
            <tbody>`;

        history.assignments.forEach(assignment => {
            html += `
                <tr>
                    <td>${assignment.location_name}</td>
                    <td>${assignment.employee_name}</td>
                    <td>${getRoleName(assignment.employee_role)}</td>
                    <td>Grupo ${assignment.group_id}</td>
                    <td>${assignment.start_time} - ${assignment.end_time}</td>
                </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div></div>`;

    // Supervisors section
    html += `<div class="history-section">
        <h5><i class="fas fa-user-tie"></i> Supervisores Asignados</h5>
        <div class="history-table">`;

    if (history.supervisors.length === 0) {
        html += `<p>No hay supervisores asignados para esta fecha</p>`;
    } else {
        html += `<table>
            <thead>
                <tr>
                    <th>Locación</th>
                    <th>Supervisor</th>
                    <th>Rol</th>
                </tr>
            </thead>
            <tbody>`;

        history.supervisors.forEach(sup => {
            html += `
                <tr>
                    <td>${sup.location_name}</td>
                    <td>${sup.supervisor_name}</td>
                    <td>${getRoleName(sup.supervisor_role)}</td>
                </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div></div>`;

    // Disabled locations section
    html += `<div class="history-section">
        <h5><i class="fas fa-store-slash"></i> Locaciones Cerradas</h5>
        <div class="history-table">`;

    if (history.disabled_locations.length === 0) {
        html += `<p>No hay locaciones cerradas para esta fecha</p>`;
    } else {
        html += `<table>
            <thead>
                <tr>
                    <th>Locación</th>
                    <th>Motivo de cierre</th>
                    <th>Cerrado por</th>
                    <th>Reabierto por</th>
                    <th>Motivo de reapertura</th>
                </tr>
            </thead>
            <tbody>`;

        history.disabled_locations.forEach(disabled => {
            html += `
                <tr>
                    <td>${disabled.location_name}</td>
                    <td>${disabled.disable_reason || 'N/A'}</td>
                    <td>${disabled.disabled_by || 'N/A'}</td>
                    <td>${disabled.enabled_by || 'No reabierto'}</td>
                    <td>${disabled.enable_reason || 'N/A'}</td>
                </tr>`;
        });

        html += `</tbody></table>`;
    }

    html += `</div></div>`;

    container.innerHTML = html;
}

function printAssignmentHistory() {
    const content = document.getElementById('historyContent').innerHTML;
    if (!content || content.includes('Selecciona una fecha')) {
        showNotification('Primero carga un historial para imprimir', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Historial de Asignaciones - StoryLand</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h4 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
                h5 { color: #374151; margin-top: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
                th { background-color: #f3f4f6; font-weight: bold; }
                .history-section { margin-bottom: 20px; }
                @media print { body { -webkit-print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            ${content}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ============================================
// LOCATION MANAGEMENT
// ============================================
function renderManagementGrid() {
    const container = document.getElementById('managementGrid');
    if (!container) return;

    let html = '';
    locations.forEach(loc => {
        html += `
            <div class="location-management-card" id="management-${loc.id}">
                <div class="location-header">
                    <span class="location-name">${loc.name}</span>
                    <span class="location-status" id="status-${loc.id}">Activo</span>
                </div>
                <div class="location-actions">
                    <button class="btn btn-sm btn-danger" onclick="openDisableModal('${loc.id}', '${loc.name}')">
                        <i class="fas fa-ban"></i> Deshabilitar
                    </button>
                    <button class="btn btn-sm btn-success" onclick="openEnableModal('${loc.id}', '${loc.name}')" style="display:none;" id="enable-${loc.id}">
                        <i class="fas fa-check"></i> Habilitar
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function openDisableModal(locationId, locationName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Deshabilitar ${locationName}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="disableForm">
                <div class="form-group">
                    <label>Fecha de deshabilitación</label>
                    <input type="date" id="disableDate" value="${document.getElementById('managementDate').value}" required />
                </div>
                <div class="form-group">
                    <label>Fecha de reactivación automática (opcional)</label>
                    <input type="date" id="reactivationDate" placeholder="Dejar vacío para reactivación manual" />
                    <small style="color:#6b7280;">Si no se especifica, la reactivación será manual</small>
                </div>
                <div class="form-group">
                    <label>Motivo del cierre</label>
                    <textarea id="disableReason" rows="3" required placeholder="Describe por qué se está cerrando esta locación..."></textarea>
                </div>
                <div class="form-group">
                    <label>Responsable del cierre</label>
                    <input type="text" id="disabledBy" required placeholder="Tu nombre o quien está autorizando el cierre" />
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-danger">Deshabilitar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('disableForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const disableDate = document.getElementById('disableDate').value;
        const reactivationDate = document.getElementById('reactivationDate').value;
        const disableReason = document.getElementById('disableReason').value;
        const disabledBy = document.getElementById('disabledBy').value;

        try {
            await disableLocation({
                location_id: locationId,
                disable_date: disableDate,
                disable_reason: disableReason,
                disabled_by: disabledBy,
                reactivation_date: reactivationDate || null
            });

            showNotification(`${locationName} deshabilitado correctamente${reactivationDate ? ' (reactivación programada)' : ''}`, 'success');
            modal.remove();
            updateLocationStatus(locationId, 'disabled', reactivationDate);
        } catch (error) {
            console.error('Error disabling location:', error);
            showNotification('Error al deshabilitar locación', 'error');
        }
    });
}

function openEnableModal(locationId, locationName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Habilitar ${locationName}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="enableForm">
                <div class="form-group">
                    <label>Motivo de reapertura</label>
                    <textarea id="enableReason" rows="3" required placeholder="Describe por qué se está reabriendo esta locación..."></textarea>
                </div>
                <div class="form-group">
                    <label>Responsable de la reapertura</label>
                    <input type="text" id="enabledBy" required placeholder="Tu nombre o quien está autorizando la reapertura" />
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    <button type="submit" class="btn btn-success">Habilitar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('enableForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const enableReason = document.getElementById('enableReason').value;
        const enabledBy = document.getElementById('enabledBy').value;

        try {
            // Find the disable record for this location and date
            const managementDate = document.getElementById('managementDate').value;
            const disables = await fetchLocationDisables(managementDate);
            const disableRecord = disables.find(d => d.location_id === locationId);

            if (disableRecord) {
                await enableLocation(disableRecord.id, {
                    enable_reason: enableReason,
                    enabled_by: enabledBy
                });

                showNotification(`${locationName} habilitado correctamente`, 'success');
                modal.remove();
                updateLocationStatus(locationId, 'enabled');
            } else {
                showNotification('No se encontró registro de deshabilitación', 'error');
            }
        } catch (error) {
            console.error('Error enabling location:', error);
            showNotification('Error al habilitar locación', 'error');
        }
    });
}

function updateLocationStatus(locationId, status, reactivationDate = null) {
    const statusElement = document.getElementById(`status-${locationId}`);
    const disableButton = document.querySelector(`#management-${locationId} .btn-danger`);
    const enableButton = document.getElementById(`enable-${locationId}`);

    if (status === 'disabled') {
        if (reactivationDate) {
            statusElement.textContent = `Programado: ${formatDate(reactivationDate)}`;
            statusElement.style.color = '#f59e0b';
        } else {
            statusElement.textContent = 'Deshabilitado';
            statusElement.style.color = '#ef4444';
        }
        disableButton.style.display = 'none';
        enableButton.style.display = 'inline-block';
    } else {
        statusElement.textContent = 'Activo';
        statusElement.style.color = '#10b981';
        disableButton.style.display = 'inline-block';
        enableButton.style.display = 'none';
    }
}

// ============================================
// INITIALIZATION
// ============================================
function initialize() {
    console.log('🚀 Inicializando StoryManager...');

    setupNavigation();

    const dateInput = document.getElementById('workDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Initialize history date with today
    const historyDate = document.getElementById('historyDate');
    if (historyDate) historyDate.value = new Date().toISOString().split('T')[0];

    // Initialize management date with today
    const managementDate = document.getElementById('managementDate');
    if (managementDate) {
        managementDate.value = new Date().toISOString().split('T')[0];
        managementDate.addEventListener('change', () => {
            loadAssignmentsForDate(managementDate.value);
        });
    }

    // Initialize work date with today
    const workDate = document.getElementById('workDate');
    if (workDate) {
        workDate.value = new Date().toISOString().split('T')[0];
        workDate.addEventListener('change', () => {
            loadAssignmentsForDate(workDate.value);
        });
    }

    // Populate location query select
    const locationQuerySelect = document.getElementById('locationQuerySelect');
    if (locationQuerySelect) {
        locationQuerySelect.innerHTML = '<option value="">Seleccionar locación...</option>' +
            locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('');
    }

    // Language Switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showNotification(`Idioma: ${btn.textContent}`, 'info');
        });
    });

    loadInitialData();
    renderManagementGrid();
    loadStaffingRules();

    // Load assignments for current date
    if (workDate) {
        // Load assignments during initialization with the loaded employees
        setTimeout(() => loadAssignmentsForDate(workDate.value), 100);
    }
}

// ============================================
// LOAD ASSIGNMENTS BY DATE
// ============================================
async function loadAssignmentsForDate(date) {
    try {
        const assignments = await fetchAssignments();

        // Normalize dates for comparison (extract just the date part)
        const normalizedDate = date.split('T')[0];
        const filtered = assignments.filter(a => {
            const assignmentDate = a.work_date ? a.work_date.split('T')[0] : '';
            return assignmentDate === normalizedDate;
        });

        // Map the API response to the frontend format
        currentAssignments = filtered.map(a => ({
            id: a.id,
            locationId: a.location_id,
            locationName: a.location_name,
            employeeId: a.employee_id,
            employeeName: a.employee_name,
            employeeRole: a.employee_role,
            groupId: a.group_id,
            workDate: a.work_date,
            startTime: a.start_time,
            endTime: a.end_time
        }));

        renderLocationsGrid();
        displayOptimizationResults(currentAssignments);
    } catch (error) {
        console.error('Error loading assignments for date:', error);
    }
}

// ============================================
// ADMIN PANEL
// ============================================
function openAdminPanel() {
    console.log('Opening admin panel...');

    // Hide all sections
    document.querySelectorAll('.demo-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show admin sections
    document.getElementById('adminLocationsSection').style.display = 'block';
    document.getElementById('adminStaffingSection').style.display = 'block';

    console.log('Rendering management grid...');
    renderManagementGrid();
    console.log('Loading staffing rules...');
    loadStaffingRules();

    showNotification('Panel de administración abierto', 'success');
}

// ============================================
// START
// ============================================
document.addEventListener('DOMContentLoaded', initialize);
