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
            // Skip if the anchor has an onclick handler
            if (this.getAttribute('onclick')) {
                return;
            }
            e.preventDefault();
            const href = this.getAttribute('href');
            // Skip empty href or just "#"
            if (!href || href === '#') {
                return;
            }
            const target = document.querySelector(href);
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
window.employeeSection = window.employeeSection || 'all';
let tasks = [];
let currentAssignments = [];
let currentLocationDisables = []; // Track location disables for current date
let currentBreaks = []; // Break configurations for current date
let scheduleCategories = []; // Secciones no-geográficas del horario
let scheduleNotes = [];      // Notas del día
let inspections = []; // Latest inspections for dashboard
let findings = []; // Latest findings
let statusHistory = []; // Audit history
let currentEditId = null;
let currentTaskEditId = null;
let currentLang = localStorage.getItem('appLanguage') || 'es';

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
    document.getElementById('adminClosureHistorySection').style.display = 'none';
    document.getElementById('inspections').style.display = 'none';
    document.querySelectorAll('#inspections .demo-section').forEach(section => {
        section.style.display = 'none';
    });

    // Restore the main demo sections if they were hidden by Admin/Tabs logic
    document.querySelectorAll('.demo-section').forEach(section => {
        if (section.id === 'adminLocationsSection' || section.id === 'adminClosureHistorySection') {
            section.style.display = 'none';
        } else {
            section.style.display = '';
        }
    });

    // Cambiar de Foods a Retail (o al revés) rehace el panel entero con datos
    // de otro tipo, así que lo que estuviera abierto en el submenú ya no
    // significa nada. Se limpia la marca y también la nota de qué bloques había
    // visibles, que pertenecía al tipo anterior: si se guardara, al volver a un
    // bloque se restauraría contra la lista equivocada.
    limpiarSubnavActivo();
    panelVisisiblesAntes = null;

    showNotification(`Cargando datos de ${type === 'foods' ? 'Foods' : 'Retail'}...`, 'info');
    
    try {
        // Clear current data
        employees = [];
        tasks = [];
        currentAssignments = [];
        currentLocationDisables = [];
        currentBreaks = [];
        
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
        const currentDate = workDate ? workDate.value : getCurrentDateInTimezone();
        currentAssignments = allAssignments.filter(a => {
            const assignmentDate = a.work_date ? a.work_date.split('T')[0] : '';
            return assignmentDate === currentDate;
        }).map(a => ({
            id: a.id,
            locationId: a.location_id,
            locationName: a.location_name,
            // Las localizaciones RETIRADAS no salen del catalogo, asi que un turno
            // antiguo puede apuntar a una que ya no esta. El turno se conserva y
            // se sigue viendo, pero marcado como retirado para que nadie lo
            // confunda con uno vigente ni intente tocarlo.
            locationRetirada: a.location_active === false,
            employeeId: a.employee_id,
            employeeName: a.employee_name,
            employeeRole: a.employee_role,
            groupId: a.group_id,
            workDate: a.work_date,
            startTime: a.start_time,
            endTime: a.end_time
        }));

        // Re-render everything (assignments after employees are loaded)
        try {
            const disables = await fetchLocationDisables(currentDate);
            currentLocationDisables = disables.filter(d => !d.enabled_at);
            try {
                currentBreaks = await fetchBreaks(currentDate);
            } catch (error) {
                console.error('Error loading breaks:', error);
                currentBreaks = [];
            }
        } catch (error) {
            console.error('Error loading location disables:', error);
            currentLocationDisables = [];
        }

        renderEmployees();
        renderLocationCards();
        renderTasks();
        renderLocationsGrid(); // Render after employees are loaded
        displayOptimizationResults(currentAssignments);
        updateStats();

        showNotification(`Datos de ${type === 'foods' ? 'Foods' : 'Retail'} cargados`, 'success');
    } catch (error) {
        console.error('Error switching type:', error);
        showNotification(t('notify.errorChangeType'), 'error');
    }
}

// ============================================
// API DATA LOADING
// ============================================

async function loadInitialData() {
    try {
        // Do not reset currentType; preserve whichever section (Foods/Retail) is active
        setCurrentType(currentType);
        currentLocationDisables = [];
        currentBreaks = [];

        // Restore main sections after Admin changed their display state
        document.querySelectorAll('.demo-section').forEach(section => {
            if (section.id === 'adminLocationsSection' || section.id === 'adminClosureHistorySection') {
                section.style.display = 'none';
            } else {
                section.style.display = '';
            }
        });

        
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
        const currentDate = workDate ? workDate.value : getCurrentDateInTimezone();
        currentAssignments = allAssignments.filter(a => {
            const assignmentDate = a.work_date ? a.work_date.split('T')[0] : '';
            return assignmentDate === currentDate;
        }).map(a => ({
            id: a.id,
            locationId: a.location_id,
            locationName: a.location_name,
            // Las localizaciones RETIRADAS no salen del catalogo, asi que un turno
            // antiguo puede apuntar a una que ya no esta. El turno se conserva y
            // se sigue viendo, pero marcado como retirado para que nadie lo
            // confunda con uno vigente ni intente tocarlo.
            locationRetirada: a.location_active === false,
            employeeId: a.employee_id,
            employeeName: a.employee_name,
            employeeRole: a.employee_role,
            groupId: a.group_id,
            workDate: a.work_date,
            startTime: a.start_time,
            endTime: a.end_time
        }));

        try {
            const disables = await fetchLocationDisables(currentDate);
            currentLocationDisables = disables.filter(d => !d.enabled_at);
            try {
                currentBreaks = await fetchBreaks(currentDate);
            } catch (error) {
                console.error('Error loading breaks:', error);
                currentBreaks = [];
            }
        } catch (error) {
            console.error('Error loading location disables:', error);
            currentLocationDisables = [];
        }

        renderEmployees();
        renderLocationCards();
        renderTasks();
        renderLocationsGrid(); // Render after employees are loaded
        displayOptimizationResults(currentAssignments);
        updateStats();
        showNotification(t('notify.apiLoaded'), 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification(t('notify.errorLoadApi'), 'error');
    }
}

// ============================================
// LOCAL STORAGE - Legacy (No longer used, API handles persistence)
// ============================================
function saveToLocalStorage() { return true; }
function loadFromLocalStorage() { return false; }
function clearLocalStorage() {
    // Clear from API instead
    showNotification(t('notify.notImplemented'), 'info');
}

// ============================================
// HELPERS
// ============================================
// Mapa de valores del backend -> claves i18n (§7: el valor técnico
// del backend nunca se muestra tal cual).
const ROLE_KEYS = {
    'server': 'role.server',
    'cashier': 'role.cashier',
    'dishwasher': 'role.dishwasher',
    'cook': 'role.cook',
    'bartender': 'role.bartender',
    'assistant-supervisor': 'role.assistant-supervisor',
    'supervisor': 'role.supervisor',
    'op': 'role.op'
};

function getRoleName(role) {
    const key = ROLE_KEYS[role];
    return key ? t(key) : role;
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


// Mapa de slugs de capacitacion (valor del backend) -> claves i18n.
// Se genera desde el diccionario para evitar duplicar el mapeo a mano.
const SKILL_KEYS = {
    'change-cooking-oil': 'skill.change-cooking-oil',
    'change-flavors': 'skill.change-flavors',
    'clean-beverage-machine': 'skill.clean-beverage-machine',
    'clean-cooking-equipment': 'skill.clean-cooking-equipment',
    'clean-freezer': 'skill.clean-freezer',
    'clean-fryer': 'skill.clean-fryer',
    'clean-fryers': 'skill.clean-fryers',
    'clean-griddle': 'skill.clean-griddle',
    'clean-grill': 'skill.clean-grill',
    'clean-ice-cream-machine': 'skill.clean-ice-cream-machine',
    'clean-oven': 'skill.clean-oven',
    'clean-prep-area': 'skill.clean-prep-area',
    'clean-slush-machines': 'skill.clean-slush-machines',
    'clean-work-surfaces': 'skill.clean-work-surfaces',
    'closing-cleanup': 'skill.closing-cleanup',
    'control-flavors': 'skill.control-flavors',
    'control-ice': 'skill.control-ice',
    'cooking-times': 'skill.cooking-times',
    'customer-service': 'skill.customer-service',
    'cut-pizza': 'skill.cut-pizza',
    'deep-cleaning': 'skill.deep-cleaning',
    'dippin-dots-training': 'skill.dippin-dots-training',
    'disassemble-ice-cream': 'skill.disassemble-ice-cream',
    'dishwashing': 'skill.dishwashing',
    'dough-training': 'skill.dough-training',
    'dunkin-trained': 'skill.dunkin-trained',
    'filter-oil': 'skill.filter-oil',
    'food-safety': 'skill.food-safety',
    'food-warmer-training': 'skill.food-warmer-training',
    'freezer-training': 'skill.freezer-training',
    'fryer-training': 'skill.fryer-training',
    'griddle-training': 'skill.griddle-training',
    'grill-training': 'skill.grill-training',
    'handle-cones-cups': 'skill.handle-cones-cups',
    'handle-dippin-dots': 'skill.handle-dippin-dots',
    'handle-dough': 'skill.handle-dough',
    'handle-freezer': 'skill.handle-freezer',
    'handle-ice-cream-machine': 'skill.handle-ice-cream-machine',
    'handle-popcorn': 'skill.handle-popcorn',
    'handle-refills': 'skill.handle-refills',
    'handle-toppings': 'skill.handle-toppings',
    'ice-cream-training': 'skill.ice-cream-training',
    'icee-training': 'skill.icee-training',
    'lemonade-training': 'skill.lemonade-training',
    'maintain-food-warmer': 'skill.maintain-food-warmer',
    'mop-floors': 'skill.mop-floors',
    'nh-alcohol-certification': 'skill.nh-alcohol-certification',
    'operate-fryer': 'skill.operate-fryer',
    'operate-oven': 'skill.operate-oven',
    'operate-slush-machines': 'skill.operate-slush-machines',
    'oven-training': 'skill.oven-training',
    'pizza-prep-training': 'skill.pizza-prep-training',
    'pos-training': 'skill.pos-training',
    'prep-beverages': 'skill.prep-beverages',
    'prep-burgers': 'skill.prep-burgers',
    'prep-cheese-curds': 'skill.prep-cheese-curds',
    'prep-fries': 'skill.prep-fries',
    'prep-grilled-cheese': 'skill.prep-grilled-cheese',
    'prep-icee': 'skill.prep-icee',
    'prep-lemonade': 'skill.prep-lemonade',
    'prep-onion-rings': 'skill.prep-onion-rings',
    'prep-pizzas': 'skill.prep-pizzas',
    'prep-sandwiches': 'skill.prep-sandwiches',
    'prep-snacks': 'skill.prep-snacks',
    'prep-souvenir-cups': 'skill.prep-souvenir-cups',
    'prep-sundaes': 'skill.prep-sundaes',
    'prep-tater-kegs': 'skill.prep-tater-kegs',
    'prep-tenders': 'skill.prep-tenders',
    'prep-toppings': 'skill.prep-toppings',
    'prep-tornado-potatoes': 'skill.prep-tornado-potatoes',
    'restock-supplies': 'skill.restock-supplies',
    'restocking': 'skill.restocking',
    'retail': 'skill.retail',
    'sandwich-training': 'skill.sandwich-training',
    'sanitize-ice-cream-area': 'skill.sanitize-ice-cream-area',
    'sanitize-nozzles': 'skill.sanitize-nozzles',
    'sanitize-surfaces': 'skill.sanitize-surfaces',
    'serve-dippin-dots': 'skill.serve-dippin-dots',
    'serve-soft-serve': 'skill.serve-soft-serve',
    'soda-fountain-training': 'skill.soda-fountain-training',
    'souvenirs': 'skill.souvenirs',
    'sundae-training': 'skill.sundae-training',
    'wash-utensils': 'skill.wash-utensils'
};

function getSkillName(skill) {
    const key = SKILL_KEYS[skill];
    return key ? t(key) : skill;
}

function getEmployeeStatus(emp) {
    if (!emp.availability) return { text: t('status.available'), class: 'status-available' };
    if (emp.availability.isOnBreak) return { text: t('status.break'), class: 'status-break' };
    if (emp.availability.isOnTraining) return { text: t('status.training'), class: 'status-training' };
    if (emp.availability.isDayOff) return { text: t('status.dayoff'), class: 'status-dayoff' };
    if (emp.availability.isHoliday) return { text: t('status.holiday'), class: 'status-holiday' };
    return { text: t('status.available'), class: 'status-available' };
}

function isEmployeeAvailable(emp) {
    if (!emp.availability) return true;
    return !emp.availability.isOnBreak && !emp.availability.isOnTraining &&
           !emp.availability.isDayOff && !emp.availability.isHoliday;
}

function getPriorityName(p) {
    const key = { low: 'tasks.priority.low', medium: 'tasks.priority.medium', high: 'tasks.priority.high', urgent: 'tasks.priority.urgent' }[p];
    return key ? t(key) : p;
}

function getTaskStatusName(s) {
    const key = { pending: 'tasks.status.pending', 'in-progress': 'tasks.status.in-progress', completed: 'tasks.status.completed' }[s];
    return key ? t(key) : s;
}

function getCategoryDisplayName(c) {
    const key = {
        maintenance: 'category.maintenance',
        cleaning: 'category.cleaning',
        training: 'category.training',
        'customer-service': 'category.customer-service',
        other: 'category.other'
    }[c];
    return key ? t(key) : c;
}

function formatDate(d) {
    const date = new Date(d);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate()+1);
    if (date.toDateString() === today.toDateString()) return t('common.today');
    if (date.toDateString() === tomorrow.toDateString()) return t('common.tomorrow');
    return date.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });
}

// ============================================
// RENDER: EMPLOYEES
// ============================================
function getFilteredEmployees() {
    const searchTerm = (document.getElementById('employeeSearch')?.value || '').toLowerCase().trim();
    const roleFilter = document.getElementById('employeeRoleFilter')?.value || '';
    const statusFilter = document.getElementById('employeeStatusFilter')?.value || '';
    const typeFilter = document.getElementById('employeeTypeFilter')?.value || '';

    return employees.filter(emp => {
        const status = getEmployeeStatus(emp);
        const statusMap = { 'status-available': 'available', 'status-break': 'break', 'status-training': 'training', 'status-dayoff': 'dayoff', 'status-holiday': 'holiday' };
        const statusValue = statusMap[status.class] || 'available';

        const matchesSearch = !searchTerm || emp.name.toLowerCase().includes(searchTerm) || `${emp.name}`.toLowerCase().includes(searchTerm) || getRoleName(emp.role).toLowerCase().includes(searchTerm) || emp.nationality.toLowerCase().includes(searchTerm);
        const matchesRole = !roleFilter || emp.role === roleFilter;
        const matchesStatus = !statusFilter || statusValue === statusFilter;
        const matchesType = !typeFilter || (typeFilter === 'foods' ? currentType !== 'retail' : currentType === 'retail');

        let matchesSection = true;
        if (window.employeeSection === 'skills') {
            matchesSection = emp.trainings && emp.trainings.length > 0;
        } else if (window.employeeSection === 'certifications') {
            matchesSection = emp.trainings && emp.trainings.some(t => /cert|dunkin|alcohol|food-safety/i.test(t));
        } else if (window.employeeSection === 'availability') {
            matchesSection = !!emp.availability;
        } else if (window.employeeSection === 'service') {
            matchesSection = emp.trainings && emp.trainings.some(t => /customer|service|retail|souvenirs|pos|cash/i.test(t));
        } else if (window.employeeSection === 'retail') {
            matchesSection = emp.trainings && emp.trainings.some(t => /retail|souvenirs|store|cash/i.test(t));
        } else if (window.employeeSection === 'history') {
            matchesSection = true;
        }

        return matchesSearch && matchesRole && matchesStatus && matchesType && matchesSection;
    });
}

function filterEmployees() {
    renderEmployees();
}

function setEmployeeSection(section) {
    window.employeeSection = section;
    document.querySelectorAll('.employee-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });
    renderEmployees();
}

// Busca un empleado por id sin que importe si el id llega como texto o numero.
// Los botones generan el id, pero un id de otra forma (un enlace, un
// atajo) dejaba la tarjeta sin hacer nada.
function findEmployee(id) {
    const n = Number(id);
    return employees.find(e => e.id === n) || employees.find(e => String(e.id) === String(id));
}

function openEmployeeDetail(id) {
    const emp = findEmployee(id);
    if (!emp) { showNotification(t('notify.employeeNotFound') || 'Empleado no encontrado', 'error'); return; }

    const status = getEmployeeStatus(emp);
    const hireDate = emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('es-ES') : 'N/A';
    const skills = (emp.trainings || []).map(s => `<span class="skill-tag">${getSkillName(s)}</span>`).join('') || '<span class="skill-tag">Sin habilidades</span>';
    const certifications = (emp.trainings || []).filter(s => /cert|dunkin|alcohol|food-safety/i.test(s)).map(s => `<span class="skill-tag certification-tag">${getSkillName(s)}</span>`).join('') || '<span class="text-muted">Sin certificaciones</span>';
    const serviceSales = (emp.trainings || []).filter(s => /customer|service|retail|souvenirs|pos|cash/i.test(s)).map(s => `<span class="skill-tag">${getSkillName(s)}</span>`).join('') || '<span class="text-muted">Sin información</span>';
    const retail = (emp.trainings || []).filter(s => /retail|souvenirs|store|cash/i.test(s)).map(s => `<span class="skill-tag">${getSkillName(s)}</span>`).join('') || '<span class="text-muted">Sin información</span>';

    document.getElementById('employeeDetailTitle').textContent = emp.name;
    document.getElementById('employeeDetailBody').innerHTML = `
        <div class="employee-detail-grid">
            <div class="detail-card">
                <h4>Employee Information</h4>
                <p><strong>Name:</strong> ${emp.name}</p>
                <p><strong>Age:</strong> ${emp.age}</p>
                <p><strong>Nationality:</strong> ${emp.nationality}</p>
                <p><strong>Role:</strong> ${getRoleName(emp.role)}</p>
                <p><strong>Group:</strong> Grupo ${emp.group || 'N/A'}</p>
                <p><strong>Hire Date:</strong> ${hireDate}</p>
                <p><strong>Status:</strong> <span class="status-indicator ${status.class}">${status.text}</span></p>
                <p><strong>Versatile:</strong> ${isEmployeeVersatile(emp) ? 'Sí' : 'No'}</p>
            </div>

            <div class="detail-card">
                <h4>Roles & Skills</h4>
                <div class="badge-list">${skills}</div>
            </div>

            <div class="detail-card">
                <h4>Certifications</h4>
                <div class="badge-list">${certifications}</div>
            </div>

            <div class="detail-card">
                <h4>Service & Sales</h4>
                <div class="badge-list">${serviceSales}</div>
            </div>

            <div class="detail-card">
                <h4>Retail</h4>
                <div class="badge-list">${retail}</div>
            </div>

            <div class="detail-card">
                <h4>Availability</h4>
                <p><strong>Schedule:</strong> ${emp.availability?.schedule?.startTime || '09:00'} - ${emp.availability?.schedule?.endTime || '18:00'}</p>
                <p><strong>On Break:</strong> ${emp.availability?.isOnBreak ? 'Yes' : 'No'}</p>
                <p><strong>On Training:</strong> ${emp.availability?.isOnTraining ? 'Yes' : 'No'}</p>
                <p><strong>Day Off:</strong> ${emp.availability?.isDayOff ? 'Yes' : 'No'}</p>
                <p><strong>Holiday:</strong> ${emp.availability?.isHoliday ? 'Yes' : 'No'}</p>
            </div>
        </div>
    `;
    document.getElementById('employeeDetailModal').style.display = 'block';
}

function closeEmployeeDetail() {
    document.getElementById('employeeDetailModal').style.display = 'none';
}

function renderEmployees() {
    const container = document.getElementById('employeesList');
    const countBadge = document.getElementById('employeeCountBadge');
    if (!container) return;

    const filtered = getFilteredEmployees();

    if (countBadge) {
        countBadge.textContent = t('employees.count', { count: filtered.length });
    }

    if (!filtered || filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">No hay empleados. Haz clic en "Nuevo Empleado".</p>';
        return;
    }

    let html = '';
    filtered.forEach(emp => {
        const status = getEmployeeStatus(emp);
        const hireDate = emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('es-ES') : 'N/A';
        // El id viaja en data-emp-id, no dentro del onclick: asi el boton
        // siempre apunta a SU fila y no a un id pegado en el HTML.
        const eid = esc(String(emp.id));
        const ids = esc(String(emp.id));
        const skills = (emp.trainings || []).filter(Boolean);
        // La celda muestra un resumen y deja el resto para "Visualizar":
        // antes se metian 3 tags mas "+N" en una fila que no cabia, y los tags
        // acababan encima de los botones.
        html += `
            <tr class="employee-row" data-emp-id="${eid}">
                <td class="emp-col-name">
                    <div class="employee-cell-main">
                        <strong>${esc(emp.name)}</strong>
                        <small>${esc(emp.nationality)} • ${esc(emp.age)} años</small>
                    </div>
                </td>
                <td class="emp-col-role"><span class="skill-tag">${esc(getRoleName(emp.role))}</span></td>
                <td class="emp-col-group"><span class="skill-tag">${emp.group && String(emp.group).trim() ? 'Grupo ' + esc(String(emp.group).trim()) : esc(t('employees.noGroup') || 'Sin grupo')}</span></td>
                <td class="emp-col-versatile"><span class="skill-tag">${isEmployeeVersatile(emp) ? esc(t('employees.versatile') || 'Versátil') : esc(t('employees.base') || 'Base')}</span></td>
                <td class="emp-col-skills">
                    <div class="table-badge-list">
                        ${skills.slice(0, 2).map(s => `<span class="skill-tag" title="${esc(getSkillName(s))}">${esc(getSkillName(s))}</span>`).join('')}
                        ${skills.length > 2 ? `<span class="skill-tag skill-tag-more" title="${esc(skills.slice(2).map(getSkillName).join(', '))}">+${skills.length - 2}</span>` : ''}
                        ${skills.length === 0 ? `<span class="text-muted">${esc(t('employees.noSkills') || 'Sin habilidades')}</span>` : ''}
                    </div>
                </td>
                <td class="emp-col-status"><span class="status-indicator ${esc(status.class)}">${esc(status.text)}</span></td>
                <td class="emp-col-actions">
                    <div class="employee-table-actions">
                        <button class="btn btn-sm btn-secondary" data-act="view" data-emp-id="${ids}" title="${esc(t('common.view') || 'Ver')}"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-secondary" data-act="edit" data-emp-id="${ids}" title="${esc(t('common.edit') || 'Modificar')}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-info" data-act="status" data-emp-id="${ids}" title="${esc(t('common.status') || 'Estado')}"><i class="fas fa-clock"></i></button>
                        <button class="btn btn-sm btn-danger" data-act="delete" data-emp-id="${ids}" title="${esc(t('common.delete') || 'Eliminar')}"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    container.innerHTML = `
        <div class="employee-table-wrapper">
            <table class="employee-admin-table">
                <thead>
                    <tr>
                        <th class="emp-col-name">${t('employees.thEmployee')}</th>
                        <th class="emp-col-role">${t('employees.thRole')}</th>
                        <th class="emp-col-group">${t('employees.thGroup')}</th>
                        <th class="emp-col-versatile">${t('employees.thVersatile')}</th>
                        <th class="emp-col-skills">${t('employees.thSkills')}</th>
                        <th class="emp-col-status">${t('employees.thStatus')}</th>
                        <th class="emp-col-actions">${t('employees.thActions')}</th>
                    </tr>
                </thead>
                <tbody>${html}</tbody>
            </table>
        </div>
    `;

    updateStats();
}

// Botones de cada fila (Ver / Modificar / Estado / Eliminar).
//
// Un unico manejador para toda la tabla, en vez de un onclick por boton. Asi
// no queda ningun manejador viejo colgando cuando la tabla se vuelve a pintar
// y cada boton actsia SIEMPRE sobre el id de SU fila: pulsar "Modificar" en la
// tarjeta de Ana no puede abrir el formulario de otra persona.
document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('#employeesList button[data-act]');
    if (!btn) return;
    const id = Number(btn.dataset.empId);
    const emp = findEmployee(id);
    if (!emp) {
        showNotification(t('notify.employeeNotFound') || 'Empleado no encontrado', 'error');
        return;
    }
    ev.preventDefault();
    switch (btn.dataset.act) {
        case 'view':   openEmployeeDetail(emp.id);   break;
        case 'edit':   editEmployee(emp.id);         break;
        case 'status': toggleEmployeeStatus(emp.id); break;
        case 'delete': handleDeleteEmployee(emp.id); break;
    }
});

// ============================================
// RENDER: LOCATIONS (Servicios)
// ============================================
function scrollLocationsCarousel(distance) {
    const el = document.getElementById('locationsCarousel');
    if (el) el.scrollBy({ left: distance, behavior: 'smooth' });
}

function renderLocationCards() {
    const container = document.getElementById('locationsList');
    if (!container) return;

    let html = '';
    locations.forEach(loc => {
        const assignedCount = (currentAssignments || []).filter(a => a.locationId === loc.id).length;
        const lastInspection = (inspections || []).filter(i => (findings || []).some(f => f.inspection_id === i.id && f.location_id === loc.id))[0];
        const lastInspectionText = lastInspection
            ? `${lastInspection.inspection_date ? lastInspection.inspection_date.split('T')[0] : ''} - ${lastInspection.inspection_type || ''}`
            : (t('locations.noInspections'));

        html += `
            <div class="service-card" style="min-width:280px;scroll-snap-align:start;" onclick="openInspectionDetail('${loc.id}')">
                <div class="service-icon"><i class="fas ${loc.icon || 'fa-store'}"></i></div>
                <h3>${loc.name}</h3>
                <p>${loc.description}</p>
                <span class="service-tag">${t('locations.typeCategory', { type: loc.type === 'food-beverage' ? t('locations.food') : t('locations.store'), category: loc.category })}</span>
                <div style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.25rem;">
                    ${loc.requiredRoles.map(r => `<span class="skill-tag">${getRoleName(r)}</span>`).join('')}
                </div>
                ${loc.servesAlcohol ? `<span class="skill-tag skill-tag-alert">🍺 ${t('locations.alcohol')}</span>` : ''}
                <div class="location-info-box">
                    <div style="margin-bottom:0.75rem;">
                        <strong>${t('common.status')}:</strong>
                        ${currentLocationDisables && currentLocationDisables.some(d => d.location_id === loc.id) ?
                            `<span class="location-status-closed">${t('locations.closedToday')}</span>` :
                            `<span class="location-status-active">${t('locations.active')}</span>`}
                    </div>
                    <p><strong>${t('locations.employeesAssignedToday')}:</strong> ${assignedCount}</p>
                    <p><strong>${t('locations.lastInspection')}:</strong> ${lastInspectionText}</p>
                </div>
                <button class="btn btn-secondary" style="margin-top:0.75rem;" onclick="event.stopPropagation(); openInspectionDetail('${loc.id}')">${t('locations.viewRecords')}</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============================================
// RENDER: LOCATIONS GRID (para asignación)
// ============================================
function getBreakDisplayForAssignment(assignmentId) {
    const breakRecord = (currentBreaks || []).find(b => b.assignment_id === assignmentId);
    const noBreakLabel = t('breaks.noBreak');
    const coveredLabel = t('breaks.coveredBy');
    const selfBreakLabel = t('breaks.selfBreak');
    if (!breakRecord) {
        return `<span class="skill-tag">${noBreakLabel}</span>`;
    }

    const start = breakRecord.break_start_time || '--:--';
    const end = breakRecord.break_end_time || '--:--';

    if (breakRecord.break_type === 'covered' && breakRecord.covered_by_employee_id) {
        const coveringEmp = employees.find(e => e.id === breakRecord.covered_by_employee_id);
        return `<span class="skill-tag">☕ ${coveredLabel} ${coveringEmp ? coveringEmp.name : '#' + breakRecord.covered_by_employee_id}</span> <span class="skill-tag">${start}-${end}</span>`;
    }

    return `<span class="skill-tag">☕ ${selfBreakLabel}</span> <span class="skill-tag">${start}-${end}</span>`;
}

function renderLocationsGrid() {
    const container = document.getElementById('locationsGrid');
    if (!container) {
        console.error('Container locationsGrid not found');
        return;
    }

    const workDate = document.getElementById('workDate');
    const currentDate = workDate ? workDate.value : getCurrentDateInTimezone();

    let html = '';
    locations.forEach(loc => {
        const assigned = currentAssignments.filter(a => a.locationId === loc.id);
        const assignedEmps = assigned.map(a => employees.find(e => e.id === a.employeeId)).filter(e => e);

        // Check if location is disabled for current date
        const isDisabled = currentLocationDisables.some(d => d.location_id === loc.id);
        const disableInfo = currentLocationDisables.find(d => d.location_id === loc.id);

        html += `
            <div class="location-card ${isDisabled ? 'disabled' : ''}" data-location-id="${loc.id}">
                <div class="location-name">${loc.name}</div>
                <div class="location-type">${loc.type === 'food-beverage' ? '🍽️' : '🛍️'} ${loc.type === 'food-beverage' ? 'Comida' : 'Tienda'}</div>
                <div class="location-category">${loc.category}</div>
                <div class="location-skills">
                    ${loc.requiredRoles.map(r => `<span class="skill-tag">${getRoleName(r)}</span>`).join('')}
                </div>
                ${loc.servesAlcohol ? `<span class="skill-tag skill-tag-alert">🍺 ${t('locations.alcohol')}</span>` : ''}
                ${isDisabled ? `<div class="location-disabled-message">CERRADA POR EL DÍA DE HOY</div>` : ''}
                <div class="location-assignments" data-location-id="${loc.id}">
                    ${assignedEmps.length > 0 ?
                        assigned.map(a => {
                            const emp = employees.find(e => e.id === a.employeeId);
                            if (!emp) return '';
                            return `
                                <div class="assignment-row" data-assignment-id="${a.id}">
                                    <span>👤 ${emp.name} (${getRoleName(emp.role)})</span>
                                    <span class="assignment-time">${a.startTime ? esc(hhmm(a.startTime)) + '-' + esc(hhmm(a.endTime)) : ''}</span>
                                    <span class="assignment-break">${getBreakDisplayForAssignment(a.id)}</span>
                                    <button class="btn btn-sm btn-danger" style="padding:0.25rem 0.5rem;font-size:0.7rem;" onclick="removeAssignment('${loc.id}', ${a.employeeId})">✕</button>
                                </div>
                            `;
                        }).join('') :
                        '<span class="no-assignments">Sin asignar</span>'}
                </div>
                <div style="margin-top:0.5rem;">
                    <div class="assignee-slot ${isDisabled ? 'disabled' : ''}" onclick="${isDisabled ? '' : `assignEmployee('${loc.id}')`}">
                        <i class="fas fa-plus"></i>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    updateStats();
}

// Optimized: Update only a single location's assignments
// ============================================
// SECCIONES DEL HORARIO: OPS · EXTRA HOURS · SUPPORT · EXTRA TASKS · NOTAS
// ============================================
// Son las mismas tarjetas que las locations (clase .location-card), dentro del
// mismo panel y para la misma fecha. No cambian el diseño: solo añaden grupos.

// Escapa texto que viene de datos (nombres, notas, roles) antes de meterlo en
// el HTML. Los nombres de categoría y de empleado son texto libre.
function esc(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const SCHEDULE_SECTIONS = [
    { key: 'OPS',         labelKey: 'sched.sectionOps',         icon: 'fa-user-tie' },
    { key: 'EXTRA_HOURS', labelKey: 'sched.sectionExtraHours', icon: 'fa-clock' },
    { key: 'SUPPORT',     labelKey: 'sched.sectionSupport',    icon: 'fa-hands-helping' },
    { key: 'EXTRA_TASK',  labelKey: 'sched.sectionExtraTasks', icon: 'fa-list-check' },
    // Turnos de tarde y noche. Usa el MISMO componente que las demas secciones:
    // las tarjetas se pintan con renderCategoryCard y las asignaciones se
    // guardan en la misma tabla `assignments`, con assignment_type propio para
    // que no se mezclen con el horario normal.
    { key: 'NOSTALGIA_NIGHT', labelKey: 'sched.sectionNostalgiaNight', icon: 'fa-moon' }
];

function categoryName(cat) {
    // Nombre legible de una categoría, en el idioma activo.
    const c = scheduleCategories.find(x => x.key === cat);
    if (!c) return cat;
    return currentLang === 'en' ? (c.name_en || c.name_es) : c.name_es;
}

function renderScheduleSections() {
    const container = document.getElementById('scheduleSections');
    if (!container) return;
    if (!scheduleCategories.length) { container.hidden = true; container.innerHTML = ''; return; }
    container.hidden = false;

    let html = '';
    SCHEDULE_SECTIONS.forEach(sec => {
        // is_active = false retira la actividad de la interfaz sin borrarla:
        // Beer Tent sigue en la base de datos, con su histórico, pero no se ve.
        const cats = scheduleCategories
            .filter(c => c.section === sec.key && c.is_active !== false)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        if (!cats.length) return;

        const sectionLabel = t(sec.labelKey);
        let total = 0;
        cats.forEach(c => { total += currentAssignments.filter(a => a.category === c.key).length; });

        html += `
          <div class="schedule-section" data-section="${sec.key}">
            <h4 class="schedule-section-title">
              <i class="fas ${sec.icon}"></i> ${esc(sectionLabel)}
              <span class="schedule-section-count">${total}</span>
            </h4>
            <div class="locations-grid locations-grid-sections">
              ${cats.map(c => renderCategoryCard(c)).join('')}
            </div>
          </div>`;
    });

    html += renderScheduleNotesBlock();
    container.innerHTML = html;
}

// Una categoría se dibuja exactamente como una location, cambiando solo el
// encabezado para no mentir sobre lo que es.
function renderCategoryCard(cat) {
    const assigned = currentAssignments.filter(a => a.category === cat.key);
    const name = currentLang === 'en' ? (cat.name_en || cat.name_es) : cat.name_es;
    const icon = cat.icon || 'fa-circle';

    return `
        <div class="location-card location-card-section" data-category="${esc(cat.key)}">
            <div class="location-name"><i class="fas ${esc(icon)}"></i> ${esc(name)}</div>
            <div class="location-category">${esc(t('sched.sectionTag'))}</div>
            <div class="location-assignments" data-category="${esc(cat.key)}">
                ${assigned.length > 0 ? assigned.map(a => renderSectionAssignmentRow(a)).join('')
                    : `<span class="no-assignments">${esc(t('sched.notAssigned'))}</span>`}
            </div>
            <div style="margin-top:0.5rem;">
                <div class="assignee-slot" onclick="assignEmployeeToCategory('${esc(cat.key)}')">
                    <i class="fas fa-plus"></i>
                </div>
            </div>
        </div>`;
}

// Horario en HH:MM. PostgreSQL devuelve las horas como "20:00:00" y sin esto
// el turno se veia como "20:00:00-01:00:00".
function hhmm(t) {
    if (!t) return '';
    const s = String(t);
    return s.length >= 16 ? s.slice(11, 16) : s.slice(0, 5);
}

function renderSectionAssignmentRow(a) {
    const emp = employees.find(e => e.id === a.employeeId);
    const roleLabel = a.role ? ` · ${esc(a.role)}` : '';
    // Un turno que cruza la medianoche lo dice, para que "20:00-01:00" no se
    // lea como un error.
    const cruza = a.startTime && a.endTime && hhmm(a.startTime) > hhmm(a.endTime);
    const overnight = cruza
        ? `<span class="assignment-notes" title="${esc(t('sched.overnightHint'))}">🌙</span>` : '';
    return `
        <div class="assignment-row" data-assignment-id="${a.id}">
            <span>👤 ${esc(emp ? emp.name : t('sched.unknownEmployee'))}${esc(roleLabel)}</span>
            <span class="assignment-time">${a.startTime ? esc(hhmm(a.startTime)) + '-' + esc(hhmm(a.endTime)) : ''}</span>
            ${overnight}
            ${a.notes ? `<span class="assignment-notes" title="${esc(a.notes)}">📝</span>` : ''}
            <button class="btn btn-sm btn-danger" style="padding:0.25rem 0.5rem;font-size:0.7rem;"
                    onclick="removeSectionAssignment('${esc(a.category)}', ${a.id})">✕</button>
        </div>`;
}

function renderScheduleNotesBlock() {
    return `
      <div class="schedule-section" data-section="NOTES">
        <h4 class="schedule-section-title">
          <i class="fas fa-sticky-note"></i> ${esc(t('sched.sectionNotes'))}
          <span class="schedule-section-count">${scheduleNotes.length}</span>
        </h4>
        <div class="schedule-notes-box">
          ${scheduleNotes.length
            ? scheduleNotes.map(n => `
                <div class="schedule-note" data-note-id="${n.id}">
                  <span class="schedule-note-text" data-i18n-ignore>${esc(n.note)}</span>
                  <button class="btn btn-sm btn-danger" style="padding:0.15rem 0.4rem;font-size:0.7rem;"
                          onclick="removeScheduleNote(${n.id})">✕</button>
                </div>`).join('')
            : `<span class="no-assignments">${esc(t('sched.noNotes'))}</span>`}
          <div class="schedule-note-add">
            <input type="text" id="scheduleNoteInput" maxlength="2000"
                   placeholder="${esc(t('sched.notePlaceholder'))}"
                   onkeydown="if(event.key==='Enter') addScheduleNote()">
            <button class="btn btn-secondary btn-sm" onclick="addScheduleNote()">
              <i class="fas fa-plus"></i> ${esc(t('sched.addNote'))}
            </button>
          </div>
        </div>
      </div>`;
}

// ============================================
// Optimized: Update only a single location's assignments
// ============================================
function updateLocationAssignments(locationId) {
    const container = document.querySelector(`.location-assignments[data-location-id="${locationId}"]`);
    if (!container) return;

    const assigned = currentAssignments.filter(a => a.locationId === locationId);
    const assignedEmps = assigned.map(a => employees.find(e => e.id === a.employeeId)).filter(e => e);

    container.innerHTML = assignedEmps.length > 0 ?
        assigned.map(a => {
            const emp = employees.find(e => e.id === a.employeeId);
            if (!emp) return '';
            // Escape location ID and employee name for JavaScript
            const escapedLocationId = locationId.replace(/'/g, "\\'");
            const escapedEmpName = emp.name.replace(/'/g, "\\'");
            return `
                <div class="assignment-row" data-assignment-id="${a.id}">
                    <span>👤 ${emp.name} (${getRoleName(emp.role)})</span>
                    <span class="assignment-time">${a.startTime ? esc(hhmm(a.startTime)) + '-' + esc(hhmm(a.endTime)) : ''}</span>
                    <button class="btn btn-sm btn-info" style="padding:0.25rem 0.5rem;font-size:0.7rem;" onclick="openBreakConfigModal(${a.id}, '${escapedLocationId}', ${a.employeeId}, '${escapedEmpName}')">☕ Break</button>
                    <button class="btn btn-sm btn-danger" style="padding:0.25rem 0.5rem;font-size:0.7rem;" onclick="removeAssignment('${escapedLocationId}', ${a.employeeId})">✕</button>
                </div>
            `;
        }).join('') :
        '<span class="no-assignments">Sin asignar</span>';
}

// Optimized: Update all location assignments without rebuilding entire grid
function updateLocationAssignmentsForAll() {
    locations.forEach(loc => {
        updateLocationAssignments(loc.id);
    });
}

// ============================================
// RENDER: OPTIMIZATION RESULTS
// ============================================
function displayOptimizationResults(assignments) {
    const container = document.getElementById('optimizationResults');
    if (!container) return;

    if (!assignments || assignments.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">No hay asignaciones. Usa "Asignar Automáticamente" o asigna manualmente.</p>';
        return;
    }

    let html = `
        <div class="results-header">
            <h4>${t('assignments.results')}</h4>
            <div class="efficiency-score">${t('assignments.score', { assigned: assignments.length, total: locations.length })}</div>
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
                    <div style="margin-top:0.5rem;">${getBreakDisplayForAssignment(a.id)}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}


function filterInspectionMap() {
    renderInspectionsMap();
}

function showTemperaturesPlaceholder(locationId) {
    const loc = locations.find(l => l.id === locationId);
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:550px;">
            <div class="modal-header">
                <h3>Temperature History - ${loc ? loc.name : locationId}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding:1.5rem;">
                <p style="color:var(--text-tertiary);">Temperature data is not available yet.</p>
                <p style="color:var(--text-tertiary);">This feature will become available once the WasteLog integration is completed.</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function openPermissionsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:420px;">
            <div class="modal-header">
                <h3>Permissions</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding:1.5rem;">
                <label>Current role:</label>
                <select id="currentUserRoleSelect" style="width:100%;padding:0.5rem;margin:0.5rem 0;border:1px solid var(--border-soft);border-radius:8px;">
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="op">OP</option>
                    <option value="assistant">Assistant</option>
                </select>
                <button class="btn btn-primary" onclick="setCurrentUserRole()">Save Role</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const current = localStorage.getItem('userRole') || 'admin';
    const select = document.getElementById('currentUserRoleSelect');
    if (select) select.value = current;
}

function setCurrentUserRole() {
    const select = document.getElementById('currentUserRoleSelect');
    const role = select ? select.value : 'admin';
    localStorage.setItem('userRole', role);
    showNotification(`Role set to ${role}`, 'info');
    document.querySelector('.modal-content button')?.closest('.modal')?.remove();
}

function hasRole(minRole) {
    const order = { assistant: 0, op: 1, supervisor: 2, admin: 3 };
    const current = (localStorage.getItem('userRole') || 'admin').toLowerCase();
    return order[current] >= order[minRole];
}

function openInspectionDetail(locationId) {
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return;

    // Inspect/filter findings for this location
    const locFindings = (findings || []).filter(f => f.location_id === locationId);
    const openFindingsCount = locFindings.length;
    const pendingCorrections = 0; // Extended backend needed to count centrally
    const criticalFindings = locFindings.filter(f => (f.priority || '').toLowerCase() === 'critical' && (f.status || '').toLowerCase() !== 'closed');
    const currentStatus = locFindings.length > 0 ? 'Warning' : 'Normal';
    const lastInspection = (typeof inspections !== 'undefined' && inspections && inspections.length > 0) ? inspections[0].inspection_date : 'N/A';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:650px;">
            <div class="modal-header">
                <h3>${loc.name}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding:1.5rem;">
                <p><strong>Category:</strong> ${loc.category || 'N/A'}</p>
                <p><strong>Type:</strong> ${loc.type === 'food-beverage' ? 'Food & Beverage' : 'Retail'}</p>
                <p><strong>Serves alcohol:</strong> ${loc.servesAlcohol ? 'Yes' : 'No'}</p>
                <p><strong>Current Status:</strong> ${currentStatus}</p>
                <p><strong>Open Findings:</strong> ${openFindingsCount}</p>
                <p><strong>Pending Corrections:</strong> ${pendingCorrections}</p>
                <p><strong>Last Inspection:</strong> ${lastInspection}</p>

                <button class="btn btn-sm btn-secondary" onclick="showTemperaturesPlaceholder('${loc.id}')">View Temperatures</button>
                <button class="btn btn-sm btn-secondary" onclick="openPermissionsModal()" style="margin-left:0.5rem;">Permissions</button>

                <h4 style="margin-top:1rem;">Asset / Equipment</h4>
                <p style="color:var(--text-tertiary);">Asset-specific findings can be linked using the finding's description/notes or extra metadata. Extended table fields are pending.</p>

                <h4 style="margin-top:1rem;">Required Roles</h4>
                <div style="display:flex;gap:0.25rem;flex-wrap:wrap;">
                    ${(loc.requiredRoles || []).map(r => `<span class="skill-tag">${getRoleName(r)}</span>`).join('')}
                </div>

                <h4 style="margin-top:1rem;">Assigned Employees</h4>
                <div>
                    ${currentAssignments.filter(a => a.locationId === locationId).map(a => {
                        const emp = employees.find(e => e.id === a.employeeId);
                        return emp ? `<div>• ${emp.name} - ${getRoleName(emp.role)}</div>` : '';
                    }).join('') || '<p>No employees assigned today.</p>'}
                </div>

                <h4 style="margin-top:1rem;">Inspection History</h4>
                <div style="max-height:200px;overflow:auto;">
                    ${locFindings.length > 0 ? `
                        <table class="employee-admin-table" style="width:100%;">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Finding</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${locFindings.map(f => `
                                    <tr>
                                        <td>${f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}</td>
                                        <td>${f.title}</td>
                                        <td>${f.priority}</td>
                                        <td>${f.status}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `<p style="color:var(--text-tertiary);">No inspection history recorded for this location.</p>`}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ============================================
// EMPLOYEE CRUD
// ============================================
function openEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'block';
    document.getElementById('modalTitle').textContent = t('employees.new');
    document.getElementById('employeeForm').reset();
    currentEditId = null;
    // Un empleado nuevo empieza "sin grupo": esta siendo entrenado.
    const g = document.getElementById('empGroup');
    if (g) g.value = ' ';
    applyAdminTrainingFilter();
    renderEmployeeTrainingFields(null);
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

// Las casillas de CAPACITACIONES, y solo esas.
//
// OJO: dentro de #employeeForm hay otras casillas que NO son capacitaciones:
// las de "Grupos adicionales", cuyos valores son A, B, C y D. Si se cogieran
// por un selector generico, esas letras se guardarian como si fueran
// certificaciones (y aparecerian luego en el informe). Por eso todo el codigo
// que lee o escribe capacitaciones pasa por aqui.
function employeeTrainingCheckboxes() {
    const box = document.querySelector('#employeeForm .trainings-container');
    return box ? [...box.querySelectorAll('input[type="checkbox"][value]')] : [];
}

function toggleCheckboxes(button) {
    const category = button.closest('.training-category');
    const checkboxes = category.querySelectorAll('input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(cb => {
        cb.checked = !allChecked;
    });
    
    button.textContent = allChecked ? t('common.selectAll') : t('common.deselectAll');
}

function editEmployee(id) {
    const emp = findEmployee(id);
    if (!emp) { showNotification(t('notify.employeeNotFound') || 'Empleado no encontrado', 'error'); return; }
    currentEditId = emp.id;
    document.getElementById('modalTitle').textContent = t('employees.editTitle');
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
    // char(1) guarda el "sin grupo" como un espacio.
    document.getElementById('empGroup').value = (emp.group || ' ').trim() || ' ';
    const opsGroupEl = document.getElementById('empOpsGroup');
    if (opsGroupEl) opsGroupEl.value = emp.ops_group || '';

    // Si el rol es administrativo, el panel de cualidades se reduce antes de
    // marcar las casillas (para no marcar de paso algo no permitido).
    applyAdminTrainingFilter();

    // Se desmarcan solo las casillas de capacitaciones: las de grupos
    // adicionales las repone despues renderEmployeeTrainingFields().
    employeeTrainingCheckboxes().forEach(cb => { cb.checked = false; });

    // Then check only the ones that match employee trainings
    if (emp.trainings && Array.isArray(emp.trainings)) {
        emp.trainings.forEach(training => {
            const matchingCheckbox = employeeTrainingCheckboxes()
                .find(cb => cb.value === training);
            if (matchingCheckbox) {
                matchingCheckbox.checked = true;
            }
        });
    }

    document.getElementById('employeeModal').style.display = 'block';

    // Locations entrenadas + grupos adicionales (se carga despues de mostrar
    // el modal para no retrasarlo).
    renderEmployeeTrainingFields(emp.id);
}

async function handleDeleteEmployee(id) {
    if (!confirm(t('confirm.deleteEmployee'))) return;
    try {
        await window.deleteEmployee(id);
        employees = employees.filter(e => e.id !== id);
        currentAssignments = currentAssignments.filter(a => a.employeeId !== id);
        renderEmployees();
        updateLocationAssignmentsForAll(); // Optimized: Update only assignments
        populateEmployeeSelects();
        displayOptimizationResults(currentAssignments);
        showNotification(t('notify.employeeDeleted'), 'success');
    } catch (error) {
        console.error('Error deleting employee:', error);
        showNotification(t('notify.errorDeleteEmployee'), 'error');
    }
}

document.getElementById('employeeForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Se fija AHORA cual es el empleado que se esta guardando. Si durante el
    // guardado se abre otro formulario, el id guardado sigue siendo el
    // correcto y no se acaban escribiendo las locations de uno sobre otro.
    const editandoId = currentEditId;

    const name = document.getElementById('empName').value;
    const nationality = document.getElementById('empNationality').value;
    const age = parseInt(document.getElementById('empAge').value);
    const hireDate = document.getElementById('empHireDate').value;
    const role = document.getElementById('empRole').value;
    const group = document.getElementById('empGroup').value;
    // Grupo OPS/Supervisor. Vacio = el empleado no es OPS.
    const opsGroupEl = document.getElementById('empOpsGroup');
    const opsGroup = opsGroupEl ? opsGroupEl.value : '';

    // Grupo D (Bistro) solo admite bartender / cashier / cook.
    if (group === 'D' && !['bartender', 'cashier', 'cook'].includes(role)) {
        showNotification(t('employees.groupDRoleError'), 'error');
        return;
    }

    // Validate minimum age for role
    const minAge = getMinAgeForRole(role);
    if (age < minAge) {
        showNotification(`Edad mínima para ${getRoleName(role)} es ${minAge} años (Leyes de NH)`, 'error');
        return;
    }

    const trainings = employeeTrainingCheckboxes()
        .filter(cb => cb.checked)
        .map(cb => cb.value);

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

    const payload = { name, nationality, age, role, group_id: group, ops_group: opsGroup || null, hire_date: hireDate || getCurrentDateInTimezone(), trainings, availability };

    try {
        if (editandoId) {
            const index = employees.findIndex(e => e.id === editandoId);
            if (index !== -1) {
                const updated = await updateEmployee(editandoId, { name, nationality, age, role, group_id: group, ops_group: opsGroup || null, hire_date: hireDate, trainings, availability });
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
            showNotification(t('notify.employeeUpdated'), 'success');
            await saveEmployeeTrainingFields(editandoId);
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
            await saveEmployeeTrainingFields(newEmp.id);
            showNotification(t('notify.employeeSaved'), 'success');
        }

        renderEmployees();
        updateLocationAssignmentsForAll(); // Update all location assignments efficiently
        populateEmployeeSelects();
        closeEmployeeModal();
    } catch (error) {
        console.error('Error saving employee:', error);
        showNotification(t('notify.errorSaveEmployee'), 'error');
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
                    <select id="newStatus" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-soft);">
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

function hasScheduleConflict(employeeId, newLocationId, workDate, startTime, endTime, opts) {
    // opts.overnight: el turno nuevo cruza la medianoche (20:00 -> 01:00). En ese
    // caso ocupa tambien la primera hora del dia siguiente, asi que hay que
    // mirar los turnos de AMANANA del mismo empleado, no solo los de hoy.
    const overnight = !!(opts && opts.overnight);

    // Check if employee is already assigned to another location at the same time on the same date
    const fechas = overnight ? [workDate, siguienteDia(workDate)] : [workDate];
    const employeeAssignments = currentAssignments.filter(a =>
        a.employeeId === employeeId &&
        a.locationId !== newLocationId &&
        fechas.includes(a.workDate)
    );

    for (const assignment of employeeAssignments) {
        // Check for time overlap
        const existingStart = assignment.startTime || '09:00';
        const existingEnd = assignment.endTime || '18:00';

        // Un turno nocturno que empieza manana se compara contra el tramo de la
        // madrugada que ocupa el turno nuevo (de 00:00 a su hora de fin).
        let solapa = false;
        if (overnight && assignment.workDate === siguienteDia(workDate)) {
            const existingEndMin = timeToMinutes(existingEnd);
            solapa = existingEndMin > 0 && existingEndMin > timeToMinutes(endTime);
        } else {
            solapa = hasTimeOverlap(startTime, endTime, existingStart, existingEnd, overnight);
        }

        if (solapa) {
            return {
                hasConflict: true,
                conflictingLocation: assignment.locationName,
                conflictingTime: `${existingStart} - ${existingEnd}`
            };
        }
    }

    return { hasConflict: false };
}

// work_date + 1 dia en formato YYYY-MM-DD, sin liarse con zonas horarias.
function siguienteDia(fechaISO) {
    const d = new Date(fechaISO + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
}

function hasTimeOverlap(start1, end1, start2, end2, overnight) {
    const s1 = timeToMinutes(start1);
    const s2 = timeToMinutes(start2);
    // Un turno que cruza la medianoche se prolonga 24h: si acaba a la 01:00
    // son 25:00, no 01:00. Sin esto, un turno de 20:00-01:00 pareceria
    // terminar "antes" de empezar y no solaparia con nada.
    const e1 = timeToMinutes(end1) + (overnight ? 1440 : 0);
    const e2 = timeToMinutes(end2) + (overnight ? 1440 : 0);

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
        showNotification(t('notify.selectDateFirst'), 'error');
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
                <p style="margin-bottom:1rem;color:var(--text-tertiary);">
                    Fecha: ${formatDate(date)} | Un supervisor puede supervisar hasta 5 buildings
                </p>

                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Seleccionar Supervisor:</label>
                    <select id="supervisorSelect" style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid var(--border-soft);">
                        <option value="">Seleccionar...</option>
                        ${supervisors.map(s => `<option value="${s.id}">${s.name} - ${getRoleName(s.role)}</option>`).join('')}
                    </select>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Buildings a supervisar (máximo 5):</label>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.5rem;">
                        ${locations.map(loc => `
                            <label style="display:flex;align-items:center;padding:0.5rem;background:var(--bg-section);border-radius:6px;border:1px solid var(--border-soft);">
                                <input type="checkbox" value="${loc.id}" class="building-checkbox" />
                                <span style="margin-left:0.5rem;font-size:0.875rem;">${loc.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Rol de supervisión:</label>
                    <select id="supervisorRole" style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid var(--border-soft);">
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
        showNotification(t('notify.selectSupervisor'), 'error');
        return;
    }

    if (buildingCheckboxes.length === 0) {
        showNotification(t('notify.selectBuilding'), 'error');
        return;
    }

    if (buildingCheckboxes.length > 5) {
        showNotification(t('notify.supervisorLimit'), 'error');
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
        showNotification(t('notify.errorAssignSupervisor'), 'error');
    }
}
function assignEmployee(locationId) {
    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    // Check if location is disabled for current date
    const workDate = document.getElementById('workDate');
    const currentDate = workDate ? workDate.value : getCurrentDateInTimezone();
    const isDisabled = currentLocationDisables.some(d => d.location_id === locationId);

    if (isDisabled) {
        const disableInfo = currentLocationDisables.find(d => d.location_id === locationId);
        showNotification(`La locación ${location.name} está cerrada para la fecha ${currentDate}. Motivo: ${disableInfo?.disable_reason || 'No especificado'}`, 'error');
        return;
    }

    // Get all available employees (not filtering by role anymore)
    const available = employees.filter(emp => isEmployeeAvailable(emp));

    const assigned = currentAssignments.filter(a => a.locationId === locationId);
    const assignedIds = assigned.map(a => a.employeeId);

    if (available.length === 0 && assigned.length === 0) {
        showNotification(t('notify.noEmployeesAvailable'), 'error');
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
                <p style="margin-bottom:1rem;color:var(--text-tertiary);">Roles requeridos: ${location.requiredRoles.map(r => getRoleName(r)).join(', ')}</p>
                
                ${assigned.length > 0 ? `
                <div style="margin-bottom:1rem;padding:1rem;background:var(--bg-section);border-radius:8px;">
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
                <input type="text" id="assignEmpSearch" placeholder="Buscar empleado por nombre..." style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-soft);margin-bottom:0.5rem;" />
                <div id="assignEmpList" style="max-height:200px;overflow-y:auto;border:1px solid var(--border-soft);border-radius:8px;padding:0.5rem;">
                    ${available.filter(e => !assignedIds.includes(e.id)).map(e => `
                        <div class="employee-option" data-employee-id="${e.id}" onclick="selectEmployee(${e.id})" style="padding:0.5rem;cursor:pointer;border-bottom:1px solid var(--border-soft);">
                            <div style="font-weight:500;">${e.name}</div>
                            <div style="font-size:0.875rem;color:var(--text-tertiary);">${getRoleName(e.role)} - Grupo ${e.group}</div>
                        </div>
                    `).join('')}
                </div>
                <input type="hidden" id="assignEmpSelect" value="" />
                
                <div style="margin-top:1rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">Horario de trabajo:</label>
                    <div style="display:flex;gap:0.5rem;">
                        <div style="flex:1;">
                            <label style="font-size:0.875rem;">Inicio:</label>
                            <input type="time" id="assignStartTime" value="09:00" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-soft);" />
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.875rem;">Fin:</label>
                            <input type="time" id="assignEndTime" value="17:00" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-soft);" />
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

    // Setup search functionality
    const searchInput = document.getElementById('assignEmpSearch');
    const empList = document.getElementById('assignEmpList');
    const availableEmployees = available.filter(e => !assignedIds.includes(e.id));

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = availableEmployees.filter(emp =>
            emp.name.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            empList.innerHTML = '<div style="padding:0.5rem;color:var(--text-tertiary);text-align:center;">No se encontraron empleados.</div>';
        } else {
            empList.innerHTML = filtered.map(e => `
                <div class="employee-option" data-employee-id="${e.id}" onclick="selectEmployee(${e.id})" style="padding:0.5rem;cursor:pointer;border-bottom:1px solid var(--border-soft);">
                    <div style="font-weight:500;">${e.name}</div>
                    <div style="font-size:0.875rem;color:var(--text-tertiary);">${getRoleName(e.role)} - Grupo ${e.group}</div>
                </div>
            `).join('');
        }
    });
}

function selectEmployee(employeeId) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    // Update hidden input
    document.getElementById('assignEmpSelect').value = employeeId;

    // Highlight selected employee
    document.querySelectorAll('.employee-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    const selectedOption = document.querySelector(`.employee-option[data-employee-id="${employeeId}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }

    // Update search input to show selected employee
    document.getElementById('assignEmpSearch').value = emp.name;
}

// ============================================
// ASIGNAR A UNA SECCIÓN (OPS / EXTRA HOURS / SUPPORT / EXTRA TASK)
// ============================================
// Mismo modal, misma validación y mismas reglas de conflicto que las
// locations. La única diferencia es que no hay location_id: la "columna" es
// la categoría de la sección.

function assignEmployeeToCategory(categoryKey) {
    const cat = scheduleCategories.find(c => c.key === categoryKey);
    if (!cat) return;
    const workDateInput = document.getElementById('workDate');
    const workDate = workDateInput ? workDateInput.value : getCurrentDateInTimezone();
    if (!workDate) {
        showNotification(t('notify.selectDateFirst'), 'error');
        return;
    }

    const name = currentLang === 'en' ? (cat.name_en || cat.name_es) : cat.name_es;
    const assigned = currentAssignments.filter(a => a.category === categoryKey);
    const assignedIds = assigned.map(a => a.employeeId);
    const available = employees.filter(emp => isEmployeeAvailable(emp));

    if (available.length === 0 && assigned.length === 0) {
        showNotification(t('notify.noEmployeesAvailable'), 'error');
        return;
    }

    // En OPS se ofrecen primero los empleados clasificados en ese grupo.
    const preferOps = cat.section === 'OPS' && cat.key;
    const sorted = [...available].sort((a, b) => {
        const ao = a.ops_group === cat.key ? 0 : 1;
        const bo = b.ops_group === cat.key ? 0 : 1;
        return ao - bo;
    });

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.id = 'categoryAssignModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
                <h3>${esc(t('sched.assignTo'))}: <i class="fas ${esc(cat.icon || 'fa-circle')}"></i> ${esc(name)}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div style="padding:1.5rem;">
                <p style="margin-bottom:1rem;color:var(--text-tertiary);">
                    ${esc(t('sched.assignTo'))}: <strong>${esc(name)}</strong> ·
                    ${esc(t('imp.colDate'))}: <strong>${esc(workDate)}</strong>
                </p>

                ${assigned.length > 0 ? `
                <div style="margin-bottom:1rem;padding:1rem;background:var(--bg-section);border-radius:8px;">
                    <h5 style="margin:0 0 0.5rem 0;">${esc(t('sched.assignedTo'))} (${assigned.length}):</h5>
                    ${assigned.map(a => {
                        const emp = employees.find(e => e.id === a.employeeId);
                        return emp ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.25rem 0;">
                            <span>${esc(emp.name)}${a.role ? ' · ' + esc(a.role) : ''} · ${esc(a.startTime || '')}-${esc(a.endTime || '')}</span>
                            <button class="btn btn-sm btn-danger" onclick="removeSectionAssignment('${esc(a.category)}', ${a.id}); this.closest('.modal').remove();">✕</button>
                        </div>` : '';
                    }).join('')}
                </div>` : ''}

                <label style="display:block;margin-bottom:0.5rem;font-weight:500;">${esc(t('sched.addEmployee'))}:</label>
                <input type="text" id="catEmpSearch" placeholder="${esc(t('sched.searchEmployee'))}"
                       style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-soft);margin-bottom:0.5rem;" />
                <div id="catEmpList" style="max-height:200px;overflow-y:auto;border:1px solid var(--border-soft);border-radius:8px;padding:0.5rem;">
                    ${sorted.filter(e => !assignedIds.includes(e.id)).map(e => `
                        <div class="employee-option" data-employee-id="${e.id}" onclick="selectCategoryEmployee(${e.id})" style="padding:0.5rem;cursor:pointer;border-bottom:1px solid var(--border-soft);">
                            <div style="font-weight:500;">${esc(e.name)}</div>
                            <div style="font-size:0.875rem;color:var(--text-tertiary);">
                                ${esc(getRoleName(e.role))}${e.ops_group ? ' · ' + esc(categoryName(e.ops_group)) : ''}
                            </div>
                        </div>`).join('')}
                </div>
                <input type="hidden" id="catEmpSelect" value="" />

                <div style="margin-top:1rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">${esc(t('sched.workSchedule'))}:</label>
                    <div style="display:flex;gap:0.5rem;">
                        <div style="flex:1;">
                            <label style="font-size:0.875rem;">${esc(t('imp.colStart'))}:</label>
                            <input type="time" id="catStartTime" value="${cat.section === 'NOSTALGIA_NIGHT' ? '20:00' : '09:00'}" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-soft);" />
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.875rem;">${esc(t('imp.colEnd'))}:</label>
                            <input type="time" id="catEndTime" value="${cat.section === 'NOSTALGIA_NIGHT' ? '01:00' : '17:00'}" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-soft);" />
                        </div>
                    </div>
                    ${cat.section === 'NOSTALGIA_NIGHT' ? `
                    <p style="margin:0.5rem 0 0;font-size:0.8rem;color:var(--text-tertiary);">
                        <i class="fas fa-moon"></i> ${esc(t('sched.overnightHint'))}
                    </p>` : ''}
                </div>

                <div style="margin-top:1rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">${esc(t('sched.roleOptional'))}:</label>
                    <input type="text" id="catRole" list="catRoleList" placeholder="${esc(t('sched.rolePlaceholder'))}"
                           style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-soft);" />
                    <datalist id="catRoleList">
                      ${['Server','Cook','Cashier','Hostess','AM Help','Cash','Barback','Dish','Supervisor','OP']
                        .map(r => `<option value="${esc(r)}">`).join('')}
                    </datalist>
                </div>

                <div style="margin-top:1rem;">
                    <label style="display:block;margin-bottom:0.5rem;font-weight:500;">${esc(t('sched.notesOptional'))}:</label>
                    <input type="text" id="catNotes" maxlength="2000" placeholder="${esc(t('sched.notesPlaceholder'))}"
                           style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-soft);" />
                </div>

                <div style="margin-top:1rem;display:flex;gap:0.5rem;">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">${esc(t('common.cancel'))}</button>
                    <button class="btn btn-primary" onclick="confirmCategoryAssignment('${esc(categoryKey)}')">${esc(t('sched.assign'))}</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);

    const searchInput = document.getElementById('catEmpSearch');
    const empList = document.getElementById('catEmpList');
    const pool = sorted.filter(e => !assignedIds.includes(e.id));
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = pool.filter(emp => emp.name.toLowerCase().includes(term));
        empList.innerHTML = filtered.length
            ? filtered.map(e => `
                <div class="employee-option" data-employee-id="${e.id}" onclick="selectCategoryEmployee(${e.id})" style="padding:0.5rem;cursor:pointer;border-bottom:1px solid var(--border-soft);">
                    <div style="font-weight:500;">${esc(e.name)}</div>
                    <div style="font-size:0.875rem;color:var(--text-tertiary);">${esc(getRoleName(e.role))}</div>
                </div>`).join('')
            : `<div style="padding:0.5rem;color:var(--text-tertiary);text-align:center;">${esc(t('sched.noEmployeesFound'))}</div>`;
    });
}

function selectCategoryEmployee(employeeId) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;
    document.getElementById('catEmpSelect').value = employeeId;
    document.querySelectorAll('#categoryAssignModal .employee-option').forEach(opt => opt.classList.remove('selected'));
    const sel = document.querySelector(`#categoryAssignModal .employee-option[data-employee-id="${employeeId}"]`);
    if (sel) sel.classList.add('selected');
    document.getElementById('catEmpSearch').value = emp.name;
}

async function confirmCategoryAssignment(categoryKey) {
    const cat = scheduleCategories.find(c => c.key === categoryKey);
    if (!cat) return;

    const employeeId = parseInt(document.getElementById('catEmpSelect').value);
    if (!employeeId) {
        showNotification(t('notify.selectEmployee'), 'error');
        return;
    }
    const startTime = document.getElementById('catStartTime').value;
    const endTime = document.getElementById('catEndTime').value;
    const role = document.getElementById('catRole').value.trim() || null;
    const notes = document.getElementById('catNotes').value.trim() || null;
    const workDate = (document.getElementById('workDate') || {}).value || getCurrentDateInTimezone();

    if (!startTime || !endTime) {
        showNotification(t('notify.selectSchedule'), 'error');
        return;
    }

    // Nostalgia Night trabaja de tarde y de noche, asi que un turno puede
    // acabar AL DIA SIGUIENTE (20:00 -> 01:00). Ahi "start < end" ya no vale:
    // si termina antes de empezar, se entiende que cruza la medianoche y es
    // un turno valido. Solo se rechaza en las secciones diurnas, donde seria un
    // error de tecleo.
    const esNocturna = cat.section === 'NOSTALGIA_NIGHT';
    // Un turno de noche puede acabar al dia siguiente: si la hora de fin es
    // anterior a la de inicio, cruza la medianoche y es un turno valido. En
    // las secciones diurnas eso es un error de tecleo y se rechaza.
    const cruzaMedianoche = esNocturna && startTime > endTime;
    if (!cruzaMedianoche && startTime >= endTime) {
        showNotification(t('notify.scheduleOrder'), 'error');
        return;
    }

    // Misma regla de conflicto que las locations: solapar en el mismo dia con
    // otro sitio es conflicto; consecutivos son validos. Para los turnos que
    // cruzan la medianoche se compara con el intervalo ya prolongado.
    const conflictCheck = hasScheduleConflict(
        employeeId, '__category__', workDate, startTime, endTime,
        { overnight: cruzaMedianoche });
    if (conflictCheck.hasConflict) {
        const emp = employees.find(e => e.id === employeeId);
        showNotification(`❌ ${t('sched.conflictPrefix')}: ${emp.name} → ${conflictCheck.conflictingLocation} (${conflictCheck.conflictingTime}). ${t('sched.noTwoPlaces')}`, 'error');
        return;
    }

    try {
        await createAssignment({
            location_id: null,
            employee_id: employeeId,
            work_date: workDate,
            start_time: startTime,
            end_time: endTime,
            assignment_type: cat.section,
            category: categoryKey,
            role: role,
            notes: notes
        });
        const modal = document.getElementById('categoryAssignModal');
        if (modal) modal.remove();
        await loadAssignmentsForDate(workDate);
        renderScheduleSections();
        showNotification(t('sched.assignedOk'), 'success');
    } catch (err) {
        showNotification(err.message || t('sched.assignError'), 'error');
    }
}

async function removeSectionAssignment(categoryKey, assignmentId) {
    try {
        const a = currentAssignments.find(x => x.id === assignmentId);
        await deleteAssignment(assignmentId);
        const workDate = a ? a.workDate : (document.getElementById('workDate') || {}).value;
        await loadAssignmentsForDate(workDate || getCurrentDateInTimezone());
        renderScheduleSections();
        showNotification(t('sched.removed'), 'success');
    } catch (err) {
        showNotification(err.message || t('sched.removeError'), 'error');
    }
}

// ============================================
// NOTAS DEL DÍA
// ============================================

async function addScheduleNote() {
    const input = document.getElementById('scheduleNoteInput');
    const note = input ? input.value.trim() : '';
    const workDate = (document.getElementById('workDate') || {}).value || getCurrentDateInTimezone();
    if (!note) return;
    try {
        await createScheduleNote({
            work_date: workDate,
            note: note,
            created_by: localStorage.getItem('userRole') || null
        });
        await loadScheduleNotes(workDate);
        renderScheduleSections();
        showNotification(t('sched.noteAdded'), 'success');
    } catch (err) {
        showNotification(err.message || t('sched.noteError'), 'error');
    }
}

// OJO: el nombre NO puede ser deleteScheduleNote: esa funcion ya existe en
// api.js y ambos scripts son clasicos, asi que una sobrescribiria a la otra
// y la llamada se llamaria a si misma en bucle infinito.
async function removeScheduleNote(noteId) {
    const workDate = (document.getElementById('workDate') || {}).value || getCurrentDateInTimezone();
    try {
        await deleteScheduleNote(noteId);
        await loadScheduleNotes(workDate);
        renderScheduleSections();
    } catch (err) {
        showNotification(err.message || t('sched.noteError'), 'error');
    }
}

async function loadScheduleCategories() {
    try {
        scheduleCategories = await fetchScheduleCategories() || [];
    } catch (e) {
        console.error('Error loading schedule categories:', e);
        scheduleCategories = [];
    }
}

async function loadScheduleNotes(date) {
    try {
        scheduleNotes = date ? (await fetchScheduleNotes(date)) || [] : [];
    } catch (e) {
        console.error('Error loading schedule notes:', e);
        scheduleNotes = [];
    }
}

async function confirmAssignment(locationId) {
    const select = document.getElementById('assignEmpSelect');
    const startTimeInput = document.getElementById('assignStartTime');
    const endTimeInput = document.getElementById('assignEndTime');
    const workDateInput = document.getElementById('workDate');

    const employeeId = parseInt(select.value);
    if (!employeeId) {
        showNotification(t('notify.selectEmployee'), 'error');
        return;
    }

    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const workDate = workDateInput ? workDateInput.value : getCurrentDateInTimezone();

    if (!startTime || !endTime) {
        showNotification(t('notify.selectSchedule'), 'error');
        return;
    }

    if (startTime >= endTime) {
        showNotification(t('notify.scheduleOrder'), 'error');
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
        updateLocationAssignments(loc.id); // Update only this location
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
            showNotification(t('notify.errorCreateAssignment'), 'error');
        }
    }
}

async function clearAssignmentsForDate() {
    const workDateInput = document.getElementById('workDate');
    const date = workDateInput ? workDateInput.value : getCurrentDateInTimezone();

    const assignmentsForDate = currentAssignments.filter(a => {
        const assignmentDate = a.workDate ? a.workDate.split('T')[0] : '';
        return assignmentDate === date;
    });

    if (!assignmentsForDate || assignmentsForDate.length === 0) {
        showNotification(t('notify.noAssignmentsDate'), 'info');
        return;
    }

    if (!confirm(`¿Eliminar todas las asignaciones del ${date}? Esta acción no se puede deshacer.`)) {
        return;
    }

    try {
        for (const assignment of assignmentsForDate) {
            if (assignment && assignment.id) {
                await deleteAssignment(assignment.id);
            }
        }

        currentAssignments = currentAssignments.filter(a => {
            const assignmentDate = a.workDate ? a.workDate.split('T')[0] : '';
            return assignmentDate !== date;
        });

        updateLocationAssignmentsForAll();
        displayOptimizationResults(currentAssignments);
        showNotification(t('notify.dayDeleted'), 'success');
    } catch (error) {
        console.error('Error clearing assignments:', error);
        showNotification(t('notify.errorDeleteDayAssignments'), 'error');
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
        updateLocationAssignments(locationId); // Update only this location
        displayOptimizationResults(currentAssignments);
        showNotification(t('notify.assignmentDeleted'), 'success');
    } catch (error) {
        console.error('Error deleting assignment:', error);
        showNotification(t('notify.errorDeleteAssignment'), 'error');
    }
}

// ============================================
// TASKS
// ============================================
function openTaskModal() {
    document.getElementById('taskModal').style.display = 'block';
    document.getElementById('taskModalTitle').textContent = t('tasks.new');
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
        container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">No hay tareas.</p>';
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
    document.getElementById('taskModalTitle').textContent = t('tasks.editTitle');
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
    if (!confirm(t('confirm.deleteTask'))) return;
    try {
        // Se llama a deleteTaskDeApi, NO a deleteTask.
        //
        // Aquí se declara una función global llamada deleteTask que pisa la
        // homónima de api.js. Escribir `deleteTask(id)` dentro era llamarse a sí
        // misma: recursión infinita y un RangeError, sin borrarse nunca nada.
        // Es el mismo choque de nombres que checkLocationDisabled y
        // deactivateStaffingRule.
        //
        // Por eso api.js expone además esta copia con otro nombre. No se cambia
        // el nombre original, que sigue usándose desde apiRequest y desde el
        // HTML donde no hay sombra.
        await deleteTaskDeApi(id);
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
        showNotification(t('notify.taskDeleted'), 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification(t('notify.errorDeleteTask'), 'error');
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
        showNotification(t('notify.errorUpdateTask'), 'error');
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
            showNotification(t('notify.taskUpdated'), 'success');
            currentTaskEditId = null;
        } else {
            const newTask = await createTask({ title, description, priority, category, dueDate, assignedTo, status: 'pending' });
            tasks.push(newTask);
            showNotification(t('notify.taskCreated'), 'success');
        }

        renderTasks();
        closeTaskModal();
    } catch (error) {
        console.error('Error saving task:', error);
        showNotification(t('notify.errorSaveTask'), 'error');
    }
});

// ============================================
// OPTIMIZATION
// ============================================
// La asignacion automatica inteligente vive en auto-assign-module.js.
//
// Antes vivia aqui: un reparto que cogia la primera persona disponible para
// cada localizacion, sin mirar minsimos por rol, sin certificados, sin zonas y
// sin respetar lo que ya estaba asignado. Se ha movido al backend y ahora pide
// una propuesta que se revisa antes de guardarse. Ver auto-assign-module.js.

// ============================================
// QUERY
// ============================================
function normalizeQuery(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function findBreakInfoForAssignment(assignmentId) {
    const breakRecord = (currentBreaks || []).find(b => b.assignment_id === assignmentId);
    const noBreakLabel = t('breaks.noBreak');
    if (!breakRecord) return noBreakLabel;
    const coveredLabel = t('breaks.coveredBy');
    const selfBreakLabel = t('breaks.selfBreak');
    if (breakRecord.break_type === 'covered' && breakRecord.covered_by_employee_id) {
        const covered = employees.find(e => e.id === breakRecord.covered_by_employee_id);
        return `${coveredLabel} ${covered ? covered.name : '#' + breakRecord.covered_by_employee_id}, ${breakRecord.break_start_time || '--:--'} - ${breakRecord.break_end_time || '--:--'}`;
    }
    return `${selfBreakLabel}, ${breakRecord.break_start_time || '--:--'} - ${breakRecord.break_end_time || '--:--'}`;
}

// Consulta de la pestaña "Por Empleado". Se llama desde queries.js, que decide
// antes si la pregunta va de gente entrenada en una localizacion y, si es asi,
// contesta con esos datos. Aqui queda la busqueda de siempre.
function processQueryOriginal() {
    const input = document.getElementById('queryInput')?.value || '';
    const query = normalizeQuery(input);
    const container = document.getElementById('queryResults');
    if (!container) return;

    if (!query) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-tertiary);">${t('queries.typeHint')}</p>`;
        return;
    }

    // 1. Búsqueda por locación
    const matchedLocations = locations.filter(loc =>
        normalizeQuery(loc.name).includes(query) || normalizeQuery(loc.id).includes(query)
    );

    if (matchedLocations.length > 0) {
        let html = '';
        matchedLocations.forEach(loc => {
            const assignments = currentAssignments.filter(a => a.locationId === loc.id);
            html += `<h4>📍 ${loc.name}</h4>`;

            if (assignments.length === 0) {
                html += `<p style="color:var(--text-tertiary);">${t('queries.noEmployeesDate')}</p>`;
                return;
            }

            html += `<div style="display:grid;gap:0.5rem;">`;
            assignments.forEach(a => {
                const emp = employees.find(e => e.id === a.employeeId);
                if (!emp) return;
                const status = getEmployeeStatus(emp);
                html += `
                    <div class="query-result-card">
                        <strong>${emp.name}</strong> - ${getRoleName(a.employeeRole || emp.role)} - ${t('common.group')} ${emp.group || 'N/A'}<br>
                        <small>${t('assignments.schedule')}: ${a.startTime || 'N/A'} - ${a.endTime || 'N/A'}</small><br>
                        <small>${t('common.status')}: ${status.text}</small><br>
                        <small>${t('assignments.break')}: ${findBreakInfoForAssignment(a.id)}</small>
                    </div>
                `;
            });
            html += `</div>`;
        });
        container.innerHTML = html;
        return;
    }

    // 2. Búsqueda por nombre de empleado
    const employeesMatched = employees.filter(emp => normalizeQuery(emp.name).includes(query));
    if (employeesMatched.length > 0) {
        let html = `<h4>${t('queries.resultsByEmployee')}</h4>`;
        employeesMatched.forEach(emp => {
            const assignment = currentAssignments.find(a => a.employeeId === emp.id);
            html += `
                <div style="padding:0.75rem;background:var(--bg-section);border:1px solid var(--border-soft);border-radius:8px;margin-bottom:0.5rem;">
                    <strong>${emp.name}</strong><br>
                    Rol: ${getRoleName(emp.role)}<br>
                    ${t('common.group')}: ${emp.group || 'N/A'}<br>
                    ${t('common.status')}: ${getEmployeeStatus(emp).text}<br>
                    ${assignment ? `${t('common.location')}: ${assignment.locationName}<br>${t('assignments.schedule')}: ${assignment.startTime || 'N/A'} - ${assignment.endTime || 'N/A'}<br>${t('assignments.break')}: ${findBreakInfoForAssignment(assignment.id)}` : `${t('assignments.notAssignedDate')}`}
                </div>
            `;
        });
        container.innerHTML = html;
        return;
    }

    // 3. Búsqueda por rol
    const roleMatched = employees.filter(emp => normalizeQuery(getRoleName(emp.role)).includes(query) || normalizeQuery(emp.role).includes(query));
    if (roleMatched.length > 0) {
        let html = `<h4>${t('queries.resultsByRole')}</h4>`;
        roleMatched.forEach(emp => {
            const assignment = currentAssignments.find(a => a.employeeId === emp.id);
            const status = getEmployeeStatus(emp);
            html += `
                <div style="padding:0.75rem;background:var(--bg-section);border:1px solid var(--border-soft);border-radius:8px;margin-bottom:0.5rem;">
                    <strong>${emp.name}</strong> - ${getRoleName(emp.role)}<br>
                    ${t('common.group')}: ${emp.group || 'N/A'}<br>
                    ${t('common.status')}: ${status.text}<br>
                    ${assignment ? `${t('common.assignedTo')}: ${assignment.locationName}<br>${t('assignments.schedule')}: ${assignment.startTime || 'N/A'} - ${assignment.endTime || 'N/A'}<br>${t('assignments.break')}: ${findBreakInfoForAssignment(assignment.id)}` : `${t('assignments.notAssignedDate')}`}
                </div>
            `;
        });
        container.innerHTML = html;
        return;
    }

    container.innerHTML = `<p style="text-align:center;color:var(--text-tertiary);">${t('queries.noResults')}</p>`;
}

function switchQueryTab(tab) {
    document.querySelectorAll('.query-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    // Tres pestañas: por persona, por localizacion (asignaciones del día) y por
    // localizacion entrenada (el perfil de cada persona). Se muestran de una en
    // una y el hueco de resultados de abajo se limpia al cambiar.
    //
    // El catalogo de la pestaña nueva se pide una sola vez, la primera vez que
    // se abre: el desplegable tiene que salir de la base, no de una lista
    // escrita en el HTML.
    const paneles = {
        employees: 'employeeQueryTab',
        locations: 'locationQueryTab',
        trained: 'trainedQueryTab'
    };

    for (const clave of Object.keys(paneles)) {
        const el = document.getElementById(paneles[clave]);
        if (el) el.style.display = clave === tab ? 'block' : 'none';
    }

    document.getElementById('queryResults').innerHTML = '';

    if (tab === 'trained' && typeof cargarCatalogoEntrenados === 'function') {
        cargarCatalogoEntrenados();
    }
}

async function queryByLocation() {
    const locationId = document.getElementById('locationQuerySelect').value;
    if (!locationId) {
        showNotification(t('notify.selectLocation'), 'error');
        return;
    }

    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    try {
        // Get assignments for this location for the active date
        const assignments = currentAssignments || [];

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
            container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">No hay asignaciones registradas para esta locación</p>';
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
        showNotification(t('notify.errorQueryLocationHistory'), 'error');
    }
}

function quickQuery(term) {
    document.getElementById('queryInput').value = term;
    processQuery();
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================
// ============================================================================
//  SUBMENÚ DE FOODS
// ============================================================================
//  Un único acceso por herramienta. El menú principal dice DÓNDE estás (Inicio,
//  Foods, Retail, Wastelog) y este submenú dice QUÉ estás haciendo.
//
//  POR QUÉ UN SOLO PUNTO DE ENTRADA
//  --------------------------------
//  Antes cada herramienta tenía su propia puerta: cinco títulos en el menú
//  principal (Gestión, Tareas, Reportes, Inspecciones, Administración) más los
//  bloques del panel. Cuatro de esos títulos eran exactamente el mismo bloque
//  del panel con otro nombre, y uno ("Tareas") apuntaba a un ancla que no
//  existía: scrollToTasks() buscaba "#tasks-section", no lo encontraba y caía a
//  una alternativa que acababa en el bloque de tareas. Dos caminos, un destino.
//
//  QUÉ HACE, Y QUÉ NO
//  ------------------
//  No crea ninguna copia de nada. Cuatro botones hacen scroll a un bloque que ya
//  está en el panel, y tres llaman al mismo openX() que llamaba el título del
//  menú antes. Las herramientas son exactamente las mismas; lo único que cambia
//  es por dónde se llega a ellas.
//
//  AL VOLVER DE UN MÓDULO
//  ----------------------
//  Los tres que abren un módulo aparte (inspecciones, reportes, locaciones)
//  ocultan los bloques del panel para dejar sitio. Volver al panel es volver a
//  pulsar cualquiera de los otros cuatro botones: por eso antes de abrir uno se
//  guardan los bloques que estaban visibles, y al volver se restauran.
//  Sin eso, quien abriera inspecciones y volviera se encontraría el panel en
//  blanco sin haber tocado nada.
// ============================================================================

// Qué bloques del panel estaban visibles antes de abrir un módulo que los
// oculta. Se guarda para poder devolverlos exactamente como estaban.
let panelVisisblesAntes = null;

// Estado de navegación del panel.
//
// Va declarado aquí, antes de irAPanel, y no pegado a la función que lo usa:
// switchType() también lo toca, y está definida más arriba en el fichero. Con
// `let` no importa el orden (una función no lee esto hasta que se la llama, y
// para entonces el script ya ha terminado de cargarse), pero declararlo en un
// sitio y usarlo en dosclaro es pedir que alguien lo mueza después.
let panelVisisiblesAntes = null;

function irAPanel(destino) {
    switch (destino) {

        // --- Bloques que están en el panel: solo hay que llegar -------------
        case 'panelSchedule':
        case 'panelEmployees':
        case 'panelTasks':
        case 'panelQueries': {
            restaurarPanelSiEstabaOculto();
            const bloque = document.getElementById(destino);
            if (!bloque) {
                console.warn('[nav] el bloque ' + destino + ' no está en el HTML');
                return;
            }
            marcarSubnavActivo(destino);
            desplazarA(bloque);
            break;
        }

        // --- Locaciones: el panel de cierres, que ya existía ----------------
        // Se reutiliza openAdminPanel() tal cual. Ese botón ya no está en el
        // menú, pero la función no se toca: sigue siendo la forma de abrirlo y
        // de paso se le quita el aviso de "panel abierto" que era ruido.
        case 'panelLocations':
            marcarSubnavActivo(destino);
            openAdminPanel();
            break;

        // --- Inspecciones ----------------------------------------------------
        case 'inspections':
            marcarSubnavActivo(destino);
            openInspectionsModule();
            break;

        // --- Reportes --------------------------------------------------------
        case 'reports':
            marcarSubnavActivo(destino);
            openTrainingReports();
            break;

        default:
            console.warn('[nav] destino desconocido: ' + destino);
    }
}

// remembers which blocks were visible before a module hid them.
function guardarPanelVisible() {
    if (panelVisisblesAntes) return;      // ya estaba guardado: no se pisa
    panelVisisiblesAntes = Array.from(document.querySelectorAll('.demo-section'))
        .filter(s => s.style.display !== 'none')
        .map(s => s.id || null);
}

// Vuelve a dejar el panel como estaba. Se llama antes de abrir un bloque que no
// lo oculta, por si se venía de inspecciones o del panel de locaciones.
function restaurarPanelSiEstabaOculto() {
    // El módulo de inspecciones vive FUERA de #demo, en su propia <section>, así
    // que no la recoge el recorrido de .demo-section. Sin esta línea, al volver
    // desde inspecciones se quedaría abierta encima del panel y se verían los
    // dos a la vez.
    //
    // Antes esto no había que hacerlo porque tampoco había forma de volver: la
    // única salida era cambiar de Foods a Retail, que es lo único que hacía
    // switchType(). El submenú es ahora esa salida, y por eso cierra esto.
    const inspecciones = document.getElementById('inspections');
    if (inspecciones) inspecciones.style.display = 'none';

    if (!panelVisisiblesAntes) return;

    document.querySelectorAll('.demo-section').forEach(section => {
        const id = section.id || null;
        section.style.display = panelVisisiblesAntes.includes(id) ? '' : 'none';
    });
    panelVisisiblesAntes = null;
}

// Scroll suave dejando sitio para la cabecera fija.
function desplazarA(elemento) {
    const cabecera = document.querySelector('.header');
    const alturaCabecera = cabecera ? cabecera.offsetHeight : 0;
    const y = elemento.getBoundingClientRect().top + window.pageYOffset - alturaCabecera - 12;
    window.scrollTo({ top: y, behavior: 'smooth' });
}

// Marca en el submenú qué herramienta está abierta, para que se vea dónde se
// está. Solo uno a la vez: si varios estuvieran marcados no significaría nada.
function marcarSubnavActivo(panel) {
    document.querySelectorAll('.panel-subnav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.panel === panel);
    });
}

// Cuando se abre un módulo por otra vía (el botón antiguo que quedara, o una
// tecla), el submenú no se queda diciendo otra cosa.
function limpiarSubnavActivo() {
    document.querySelectorAll('.panel-subnav-item').forEach(btn => btn.classList.remove('active'));
}

// La plataforma de Wastelog vive en su propia aplicacion (Cocina Control).
// Esta aplicacion no tiene (ni necesita) una copia del modulo.
//
// El boton NAVEGA a Wastelog en la pestana actual: se reemplaza la pagina de
// StoryManager por la de Wastelog. No se abre pestana nueva, ventana ni una
// seccion interna, y el boton del menu queda tal cual.
const WASTELOG_URL = 'https://cocina-control-two.vercel.app/';

function openWastelog() {
    window.location.href = WASTELOG_URL;
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
            container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">No hay reglas de staffing configuradas</p>';
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
            container.innerHTML = '<p style="text-align:center;color:var(--accent-danger);">Error al cargar reglas de staffing</p>';
        }
    }
}

async function refreshStaffingRules() {
    await loadStaffingRules();
    showNotification(t('notify.staffingRulesUpdated'), 'success');
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

            showNotification(t('notify.staffingRuleUpdated'), 'success');
            modal.remove();
            loadStaffingRules();
        } catch (error) {
            console.error('Error updating staffing rule:', error);
            showNotification(t('notify.errorUpdateRule'), 'error');
        }
    });
}

async function deactivateStaffingRule(locationId) {
    if (!confirm(t('confirm.disableRule'))) return;

    try {
        await deactivateStaffingRule(locationId);
        showNotification(t('notify.staffingRuleDisabled'), 'success');
        loadStaffingRules();
    } catch (error) {
        console.error('Error deactivating staffing rule:', error);
        showNotification(t('notify.errorDisableRule'), 'error');
    }
}

// ============================================
// STATS
// ============================================
function updateStats() {
    document.getElementById('statEmployees').textContent = employees.length;
    document.getElementById('statLocations').textContent = locations.length;
    document.getElementById('statTasks').textContent = tasks.filter(t => t.status !== 'completed').length;
    document.getElementById('statInspections').textContent = inspections.length;
    document.getElementById('statReports').textContent = (findings || []).length;
    // Wastelog no vive aqui: es una aplicacion aparte, asi que la tarjeta no
    // muestra un numero, sino que abre ahi.
    document.getElementById('statWastelog').textContent = t('wastelog.open');
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

        if (data.length === 0) { showNotification(t('notify.exportEmpty'), 'error'); return; }
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
        showNotification(t('notify.errorExport'), 'error');
    }
}

function exportFindingsCSV() {
    try {
        const data = (findings || []).map(f => ({
            ID: f.id,
            InspectionID: f.inspection_id,
            LocationID: f.location_id,
            Title: f.title,
            Category: f.category,
            Priority: f.priority,
            Status: f.status,
            AssignedTo: f.assigned_to,
            DueDate: f.due_date,
            CreatedAt: f.created_at
        }));

        if (data.length === 0) { showNotification(t('notify.noFindingsToExport'), 'error'); return; }
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
        link.setAttribute('download', `storyland_findings_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification(`Exported ${data.length} findings`, 'success');
    } catch (e) {
        console.error(e);
        showNotification(t('notify.errorExportFindings'), 'error');
    }
}

// ============================================
// ASSIGNMENT HISTORY
// ============================================
async function loadAssignmentHistory() {
    const date = document.getElementById('historyDate').value;
    if (!date) {
        showNotification(t('notify.selectDateFirst'), 'error');
        return;
    }

    try {
        const history = await fetchAssignmentHistory(date);
        renderAssignmentHistory(history);
    } catch (error) {
        console.error('Error loading assignment history:', error);
        showNotification(t('notify.errorLoadHistory'), 'error');
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
        showNotification(t('history.printFirst'), 'error');
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
// LOCATION DISABLE CHECK
// ============================================
async function checkLocationDisabled(locationId, date) {
    try {
        const disables = await fetchLocationDisables(date);
        const isDisabled = disables.some(d => d.location_id === locationId && !d.enabled_at);
        return isDisabled;
    } catch (error) {
        console.error('Error checking location disabled status:', error);
        return false;
    }
}

// ============================================
// LOCATION MANAGEMENT
// ============================================
async function renderManagementGrid() {
    console.log('renderManagementGrid called');
    const container = document.getElementById('managementGrid');
    if (!container) {
        console.error('managementGrid container not found');
        return;
    }

    const managementDate = document.getElementById('managementDate');
    const currentDate = managementDate ? managementDate.value : getCurrentDateInTimezone();
    console.log('Management date:', currentDate);

    // Fetch disables for the current management date
    let disables = [];
    try {
        disables = await fetchLocationDisables(currentDate);
        console.log('Fetched disables:', disables);
    } catch (error) {
        console.error('Error fetching location disables:', error);
    }

    let html = '';
    locations.forEach(loc => {
        const disableRecord = disables.find(d => d.location_id === loc.id && !d.enabled_at);
        const isDisabled = !!disableRecord;

        let statusText = 'Activo';
        let statusClass = 'status-available';
        let disableButtonDisplay = 'inline-block';
        let enableButtonDisplay = 'none';

        if (isDisabled) {
            if (disableRecord.reactivation_date) {
                statusText = `Reactivación: ${formatDate(disableRecord.reactivation_date)}`;
                statusClass = 'status-break';
            } else {
                statusText = 'Deshabilitado';
                statusClass = 'status-holiday';
            }
            disableButtonDisplay = 'none';
            enableButtonDisplay = 'inline-block';
        }

        // Escape single quotes in location name for JavaScript
        const escapedName = loc.name.replace(/'/g, "\\'");

        html += `
            <div class="location-management-card" id="management-${loc.id}">
                <div class="location-header">
                    <span class="location-name">${loc.name}</span>
                    <span class="location-status ${statusClass}" id="status-${loc.id}">${statusText}</span>
                </div>
                <div class="location-actions">
                    <button class="btn btn-sm btn-danger" onclick="openDisableModal('${loc.id}', '${escapedName}')" style="display: ${disableButtonDisplay};">
                        <i class="fas fa-ban"></i> Deshabilitar
                    </button>
                    <button class="btn btn-sm btn-success" onclick="openEnableModal('${loc.id}', '${escapedName}')" style="display: ${enableButtonDisplay};" id="enable-${loc.id}">
                        <i class="fas fa-check"></i> Habilitar
                    </button>
                </div>
            </div>
        `;
    });

    console.log('Generated HTML for', locations.length, 'locations');
    container.innerHTML = html;
    console.log('HTML set to container');
}

function openDisableModal(locationId, locationName) {
    console.log('Opening disable modal for:', locationId, locationName);

    const managementDate = document.getElementById('managementDate');
    console.log('Management date element:', managementDate);
    console.log('Management date value:', managementDate ? managementDate.value : 'not found');

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Deshabilitar ${locationName}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="disableForm">
                <div class="form-group">
                    <label>Fecha de deshabilitación</label>
                    <input type="date" id="disableDate" value="${managementDate ? managementDate.value : getCurrentDateInTimezone()}" required />
                </div>
                <div class="form-group">
                    <label>Fecha de reactivación automática (opcional)</label>
                    <input type="date" id="reactivationDate" placeholder="Dejar vacío para reactivación manual" />
                    <small style="color:var(--text-tertiary);">Si no se especifica, la reactivación será manual</small>
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

    console.log('Modal created:', modal);
    document.body.appendChild(modal);
    console.log('Modal appended to body');

    document.getElementById('disableForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Disable form submitted');
        const disableDate = document.getElementById('disableDate').value;
        const reactivationDate = document.getElementById('reactivationDate').value;
        const disableReason = document.getElementById('disableReason').value;
        const disabledBy = document.getElementById('disabledBy').value;

        console.log('Disable data:', { locationId, disableDate, reactivationDate, disableReason, disabledBy });

        try {
            console.log('Calling disableLocation API...');
            await disableLocation({
                location_id: locationId,
                disable_date: disableDate,
                disable_reason: disableReason,
                disabled_by: disabledBy,
                reactivation_date: reactivationDate || null
            });

            console.log('Disable successful');
            showNotification(`${locationName} deshabilitado correctamente${reactivationDate ? ' (reactivación programada)' : ''}`, 'success');
            modal.remove();
            updateLocationStatus(locationId, 'disabled', reactivationDate);
            refreshClosureHistoryPanel();
        } catch (error) {
            console.error('Error disabling location:', error);
            showNotification(t('notify.errorDisableLocation') + error.message, 'error');
        }
    });
}

function openEnableModal(locationId, locationName) {
    console.log('Opening enable modal for:', locationId, locationName);

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
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
        console.log('Enable form submitted');
        const enableReason = document.getElementById('enableReason').value;
        const enabledBy = document.getElementById('enabledBy').value;

        try {
            // Find the disable record for this location and date
            const managementDate = document.getElementById('managementDate').value;
            console.log('Management date for enable:', managementDate);
            const disables = await fetchLocationDisables(managementDate);
            console.log('Disables for enable:', disables);
            const disableRecord = disables.find(d => d.location_id === locationId);
            console.log('Disable record found:', disableRecord);

            if (disableRecord) {
                console.log('Calling enableLocation API...');
                await enableLocation(disableRecord.id, {
                    enable_reason: enableReason,
                    enabled_by: enabledBy
                });

                console.log('Enable successful');
                showNotification(`${locationName} habilitado correctamente`, 'success');
                modal.remove();
                updateLocationStatus(locationId, 'enabled');
            } else {
                console.error('No disable record found');
                showNotification(t('notify.noDisableRecord'), 'error');
            }
        } catch (error) {
            console.error('Error enabling location:', error);
            showNotification(t('notify.errorEnableLocation') + error.message, 'error');
        }
    });
}

async function updateLocationStatus(locationId, status, reactivationDate = null) {
    // Re-render the management grid to update all statuses and refresh global disable state
    renderManagementGrid();
    renderLocationsGrid();
    const managementDate = document.getElementById('managementDate');
    const date = managementDate && managementDate.value ? managementDate.value : getCurrentDateInTimezone();
    try {
        const disables = await fetchLocationDisables(date);
        currentLocationDisables = disables.filter(d => !d.enabled_at);
    } catch (error) {
        console.error('Error refreshing location disables:', error);
        currentLocationDisables = [];
    }
}

// ============================================
// INITIALIZATION
// ============================================
function initialize() {
    console.log('🚀 Inicializando StoryManager...');

    setupNavigation();

    const dateInput = document.getElementById('workDate');
    if (dateInput) dateInput.value = getCurrentDateInTimezone();

    // Initialize history date with today
    const historyDate = document.getElementById('historyDate');
    if (historyDate) historyDate.value = getCurrentDateInTimezone();

    // Initialize management date with today
    const managementDate = document.getElementById('managementDate');
    if (managementDate) {
        managementDate.value = getCurrentDateInTimezone();
        managementDate.addEventListener('change', () => {
            loadAssignmentsForDate(managementDate.value);
            loadLocationDisablesForManagement(managementDate.value);
            renderManagementGrid(); // Re-render to reset UI states
        });
    }

    // Initialize work date with today
    const workDate = document.getElementById('workDate');
    if (workDate) {
        workDate.value = getCurrentDateInTimezone();
        workDate.addEventListener('change', async () => {
            // Se espera a los dos: si no, las secciones se pintan con los datos
            // del día anterior (condición de carrera).
            await Promise.all([
                loadAssignmentsForDate(workDate.value),
                loadScheduleNotes(workDate.value)
            ]);
            renderScheduleSections();
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
            const lang = btn.dataset.lang;
            handleLanguageChange(lang);
        });
    });

    loadInitialData();
    renderManagementGrid();
    loadStaffingRules();

    // Catálogo de secciones del horario (OPS, Extra Hours, Support, Extra Tasks).
    // Es un dato, no código: añadir una sección es insertar una fila.
    loadScheduleCategories();

    // A que grupo pertenece cada location (para el formulario de empleado y
    // para el reporte de capacitaciones).
    loadTrainingLocationGroups();

    // Load assignments for current date
    if (workDate) {
        // Load assignments during initialization with the loaded employees
        setTimeout(async () => {
            await loadAssignmentsForDate(workDate.value);
            await loadScheduleNotes(workDate.value);
            renderScheduleSections();
        }, 100);
    }
}

// ============================================
// BREAK CONFIGURATION
// ============================================

async function openBreakConfigModal(assignmentId, locationId, employeeId, employeeName) {
    console.log('Opening break config modal for assignment:', assignmentId);

    // Fetch existing break configuration
    let existingBreak = null;
    try {
        const result = await fetchBreakByAssignment(assignmentId);
        existingBreak = result;
    } catch (error) {
        console.error('Error fetching existing break:', error);
        existingBreak = null;
    }

    const workDate = document.getElementById('workDate').value;
    const assignment = currentAssignments.find(a => a.id === assignmentId);

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
                <h3>Configurar Break - ${employeeName}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form id="breakConfigForm">
                <div class="form-group">
                    <label>Tipo de Break</label>
                    <select id="breakType" required onchange="handleBreakTypeChange()">
                        <option value="">Seleccionar...</option>
                        <option value="self" ${existingBreak?.break_type === 'self' ? 'selected' : ''}>Self Break</option>
                        <option value="covered" ${existingBreak?.break_type === 'covered' ? 'selected' : ''}>Cubierto por otro empleado</option>
                    </select>
                </div>

                <div id="coveredBySection" style="display:${existingBreak?.break_type === 'covered' ? 'block' : 'none'};">
                    <div class="form-group">
                        <label>Empleado que cubre el break</label>
                        <input type="text" id="coveredBySearch" placeholder="Buscar empleado..." style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-soft);margin-bottom:0.5rem;" />
                        <div id="coveredByList" style="max-height:200px;overflow-y:auto;border:1px solid var(--border-soft);border-radius:8px;padding:0.5rem;">
                            <p style="color:var(--text-tertiary);text-align:center;">Busca un empleado...</p>
                        </div>
                        <input type="hidden" id="coveredByEmployeeId" value="${existingBreak?.covered_by_employee_id || ''}" />
                    </div>
                </div>

                <div class="form-group">
                    <label>Horario del Break</label>
                    <div style="display:flex;gap:0.5rem;">
                        <div style="flex:1;">
                            <label style="font-size:0.875rem;">Inicio:</label>
                            <input type="time" id="breakStartTime" value="${existingBreak?.break_start_time || '12:00'}" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-soft);" />
                        </div>
                        <div style="flex:1;">
                            <label style="font-size:0.875rem;">Fin:</label>
                            <input type="time" id="breakEndTime" value="${existingBreak?.break_end_time || '13:00'}" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border-soft);" />
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                    ${existingBreak && existingBreak.id ? `<button type="button" class="btn btn-danger" onclick="deleteBreakConfig(${existingBreak.id}); this.closest('.modal').remove();">Eliminar</button>` : ''}
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Handle break type change
    window.handleBreakTypeChange = function() {
        const breakType = document.getElementById('breakType').value;
        const coveredBySection = document.getElementById('coveredBySection');
        coveredBySection.style.display = breakType === 'covered' ? 'block' : 'none';
    };

    // Setup search functionality for covered by employee
    const searchInput = document.getElementById('coveredBySearch');
    const empList = document.getElementById('coveredByList');
    const availableEmployees = employees.filter(e => e.id !== employeeId && isEmployeeAvailable(e));

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = availableEmployees.filter(emp =>
            emp.name.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            empList.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;">No se encontraron empleados.</p>';
        } else {
            empList.innerHTML = filtered.map(e => {
                const escapedName = e.name.replace(/'/g, "\\'");
                return `
                <div class="employee-option" data-employee-id="${e.id}" onclick="selectCoveringEmployee(${e.id}, '${escapedName}')" style="padding:0.5rem;cursor:pointer;border-bottom:1px solid var(--border-soft);">
                    <div style="font-weight:500;">${e.name}</div>
                    <div style="font-size:0.875rem;color:var(--text-tertiary);">${getRoleName(e.role)} - Grupo ${e.group}</div>
                </div>
            `;
            }).join('');
        }
    });

    // If there's an existing covered employee, show them
    if (existingBreak && existingBreak.covered_by_employee_id) {
        const coveredEmp = employees.find(e => e.id === existingBreak.covered_by_employee_id);
        if (coveredEmp) {
            const escapedName = coveredEmp.name.replace(/'/g, "\\'");
            empList.innerHTML = `
                <div class="employee-option selected" data-employee-id="${coveredEmp.id}" onclick="selectCoveringEmployee(${coveredEmp.id}, '${escapedName}')" style="padding:0.5rem;cursor:pointer;border-bottom:1px solid var(--border-soft);">
                    <div style="font-weight:500;">${coveredEmp.name}</div>
                    <div style="font-size:0.875rem;color:var(--text-tertiary);">${getRoleName(coveredEmp.role)} - Grupo ${coveredEmp.group}</div>
                </div>
            `;
            document.getElementById('coveredBySearch').value = coveredEmp.name;
        }
    }

    // Function to select covering employee
    window.selectCoveringEmployee = function(empId, empName) {
        document.getElementById('coveredByEmployeeId').value = empId;
        document.getElementById('coveredBySearch').value = empName;
        empList.innerHTML = `
            <div class="employee-option selected" data-employee-id="${empId}" style="padding:0.5rem;cursor:pointer;border-bottom:1px solid var(--border-soft);">
                <div style="font-weight:500;">${empName}</div>
                <div style="font-size:0.875rem;color:var(--text-tertiary);">Seleccionado</div>
            </div>
        `;
    };

    // Handle form submission
    document.getElementById('breakConfigForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const breakType = document.getElementById('breakType').value;
        const coveredByEmployeeId = document.getElementById('coveredByEmployeeId').value;
        const breakStartTime = document.getElementById('breakStartTime').value;
        const breakEndTime = document.getElementById('breakEndTime').value;

        if (!breakType) {
            showNotification(t('notify.selectBreakType'), 'error');
            return;
        }

        if (breakType === 'covered' && !coveredByEmployeeId) {
            showNotification(t('notify.selectBreakEmployee'), 'error');
            return;
        }

        try {
            const breakData = {
                assignment_id: assignmentId,
                employee_id: employeeId,
                work_date: workDate,
                location_id: locationId,
                break_type: breakType,
                break_start_time: breakStartTime,
                break_end_time: breakEndTime
            };

            if (breakType === 'covered' && coveredByEmployeeId) {
                breakData.covered_by_employee_id = parseInt(coveredByEmployeeId);
            }

            await createBreak(breakData);

            showNotification(t('notify.breakSaved'), 'success');
            modal.remove();
            loadAssignmentsForDate(workDate);
        } catch (error) {
            console.error('Error saving break config:', error);
            // Try to parse error message from backend response
            let errorMessage = 'Error al guardar configuración de break';
            if (error.message) {
                if (error.message.includes('insufficient_staffing_during_break')) {
                    errorMessage = 'Self Break no permitido: No hay suficientes empleados disponibles durante el horario del break';
                } else if (error.message.includes('no_alcohol_certification_during_break')) {
                    errorMessage = 'Self Break no permitido: Ningún empleado disponible tiene certificación de alcohol';
                } else {
                    errorMessage = error.message;
                }
            }
            showNotification(errorMessage, 'error');
        }
    });
}

async function deleteBreakConfig(breakId) {
    try {
        await deleteBreak(breakId);
        showNotification(t('notify.breakDeleted'), 'success');
        const currentDate = document.getElementById('workDate')?.value || getCurrentDateInTimezone();
        loadAssignmentsForDate(currentDate);
    } catch (error) {
        console.error('Error deleting break config:', error);
        showNotification(t('notify.errorDeleteBreak'), 'error');
    }
}

// ============================================
// LOAD ASSIGNMENTS BY DATE
// ============================================
async function loadAssignmentsForDate(date) {
    try {
        console.log('Loading assignments for date:', date);

        const assignments = await fetchAssignments();

        // Normalize dates for comparison (extract just the date part)
        const normalizedDate = date.split('T')[0];
        console.log('Normalized date:', normalizedDate);

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
            endTime: a.end_time,
            // Secciones no geográficas (OPS, Extra Hours, Support, Extra Tasks).
            // category va vacío en las asignaciones normales de location.
            assignmentType: a.assignment_type || 'LOCATION',
            category: a.assignment_type && a.assignment_type !== 'LOCATION' ? a.category : null,
            section: a.section || null,
            sectionName: a.section_name || null,
            role: a.role || null,
            notes: a.notes || null,
            taskId: a.task_id || null
        }));

        console.log('Filtered assignments:', currentAssignments.length);

        // Load location disables for this date
        try {
            const disables = await fetchLocationDisables(normalizedDate);
            console.log('Location disables for date:', disables);
            currentLocationDisables = disables.filter(d => !d.enabled_at);
        } catch (error) {
            console.error('Error loading location disables:', error);
            currentLocationDisables = [];
        }

        try {
            currentBreaks = await fetchBreaks(normalizedDate);
        } catch (error) {
            console.error('Error loading breaks:', error);
            currentBreaks = [];
        }

        console.log('Current location disables:', currentLocationDisables);

        renderLocationsGrid();
        // Las secciones (OPS, Extra Hours, Support, Extra Tasks) se pintan
        // siempre junto a las locations: ambas leen de currentAssignments.
        renderScheduleSections();
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

    // Se apunta que bloques estaban visibles ANTES de ocultarlos, para poder
    // devolverlos cuando se vuelva a cualquier bloque del panel. Sin esto,
    // quien abriera el panel de locaciones y luego pulsara "Schedule" en el
    // submenú se encontraría el resto del panel en blanco.
    guardarPanelVisible();

    // Hide all sections
    document.querySelectorAll('.demo-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show admin sections
    document.getElementById('adminLocationsSection').style.display = 'block';
    document.getElementById('adminClosureHistorySection').style.display = 'block';

    console.log('Rendering management grid...');
    renderManagementGrid();
    console.log('Loading closure history...');
    refreshClosureHistoryPanel();

    // Load location disables for management date
    const managementDate = document.getElementById('managementDate');
    if (managementDate && managementDate.value) {
        loadLocationDisablesForManagement(managementDate.value);
    }

    // Sin aviso. Antes salía "Panel abierto" cada vez, y como el botón del menú
    // ya no existe, solo se ve al llegar aquí desde el submenú de Locations: un
    // aviso de algo que uno mismo acaba de pulsar no aporta nada.
}

async function openInspectionsModule() {
    console.log('Opening Inspections & Compliance...');

    // Se apunta qué bloques estaban visibles antes de ocultarlos,
    // para poder devolverlos al pulsar cualquier bloque del submenú de Foods.
    // Este módulo oculta todos los .demo-section: sin esta nota, al volver
    // al panel se lo encontraría medio en blanco sin haber tocado nada.
    guardarPanelVisible();

    // Hide all sections
    document.querySelectorAll('.demo-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show inspections demo-section and restore its child panels
    const inspectionsEl = document.getElementById('inspections');
    if (inspectionsEl) {
        inspectionsEl.style.display = 'block';
        inspectionsEl.querySelectorAll('.demo-section').forEach(panel => {
            panel.style.display = 'block';
        });
    }

    // Panel de locaciones: los datos vienen del servidor, no de una lista fija.
    await cargarPanelLocacionesInspeccionadas();
    await cargarCatalogosInspecciones();
    prepararFiltrosAuditoria();

    showNotification(t('inspections.opened'), 'info');

    await loadInspections();
}

// Rellena el filtro de locacion del PDF con las locaciones reales y dice, en
// texto, que alcance va a tener la exportación. Sin esto el botón descargaría
// "todo" sin que el usuario lo supiera.
function prepararFiltrosAuditoria() {
    const sel = document.getElementById('auditLocationFilter');
    if (sel && (!sel.options.length || sel.options.length - 1 !== (locations || []).length)) {
        sel.innerHTML = '<option value="">—</option>' +
            (locations || []).map(l => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join('');
    }
    if (typeof actualizarAlcancePdf === 'function') actualizarAlcancePdf();
}

async function loadInspections() {
    try {
        const res = await fetch(`${API_BASE_URL}/${currentType}/inspections`);
        if (!res.ok) throw new Error('Failed to load inspections');
        inspections = await res.json();
        updateInspectionsDashboard();
        await loadFindings();
        await loadStatusHistory();
        return;
    } catch (err) {
        console.error(err);
        showNotification(t('notify.errorLoadInspections'), 'error');
    }
}

function updateInspectionsDashboard() {
    const total = inspections.length;
    const active = inspections.filter(i => ['pending','in_progress','under_analysis','warning'].includes((i.status || '').toLowerCase())).length;
    const openFindings = 0; // Extended backend needed to count centrally
    const pendingCorrections = 0; // Extended backend needed to count centrally
    const stats = document.querySelectorAll('#inspections .stat h3');
    if (stats.length >= 4) {
        stats[0].textContent = total;
        stats[1].textContent = active;
        stats[2].textContent = openFindings;
        stats[3].textContent = pendingCorrections;
    }

    renderInspectionsList();
    renderReportsCharts();
    populateReportFilters();
}

function renderReportsCharts() {
    const container = document.getElementById('reportsContainer');
    if (!container) return;

    const byLocation = {};
    const byCategory = {};
    const byStatus = {};

    (findings || []).forEach(f => {
        const loc = f.location_id || 'Unknown';
        byLocation[loc] = (byLocation[loc] || 0) + 1;
        const cat = f.category || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + 1;
        const st = f.status || 'Unknown';
        byStatus[st] = (byStatus[st] || 0) + 1;
    });

    const maxLocation = Math.max(1, ...Object.values(byLocation));
    const maxCategory = Math.max(1, ...Object.values(byCategory));
    const maxStatus = Math.max(1, ...Object.values(byStatus));

    const dashboardContainer = document.getElementById('dashboardCharts');
    if (dashboardContainer) {
        dashboardContainer.innerHTML = container.innerHTML;
    }

    container.innerHTML = `
        <h4>Findings by Location</h4>
        ${Object.entries(byLocation).sort((a,b) => b[1]-a[1]).map(([key, count]) => `
            <div style="margin-bottom:0.35rem;">
                <strong>${key}</strong>: ${count}
                <div class="progress-track">
                    <div class="progress-fill progress-fill-success" style="width:${(count / maxLocation) * 100}%;"></div>
                </div>
            </div>
        `).join('')}

        <h4>Findings by Category</h4>
        ${Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([key, count]) => `
            <div style="margin-bottom:0.35rem;">
                <strong>${key}</strong>: ${count}
                <div class="progress-track">
                    <div class="progress-fill" style="width:${(count / maxCategory) * 100}%;"></div>
                </div>
            </div>
        `).join('')}

        <h4>Findings by Status</h4>
        ${Object.entries(byStatus).sort((a,b) => b[1]-a[1]).map(([key, count]) => `
            <div style="margin-bottom:0.35rem;">
                <strong>${key}</strong>: ${count}
                <div class="progress-track">
                    <div class="progress-fill progress-fill-warning" style="width:${(count / maxStatus) * 100}%;"></div>
                </div>
            </div>
        `).join('')}
    `;
}

function populateReportFilters() {
    const locSet = [...new Set((findings || []).map(f => f.location_id).filter(Boolean))];
    const catSet = [...new Set((findings || []).map(f => f.category).filter(Boolean))];
    const statusSet = [...new Set((findings || []).map(f => f.status).filter(Boolean))];
    const prioritySet = [...new Set((findings || []).map(f => f.priority).filter(Boolean))];

    const select = document.getElementById('reportLocation');
    if (select) {
        select.innerHTML = '<option value="">All Locations</option>' + locSet.map(s => `<option value="${s}">${s}</option>`).join('');
    }
    const catSel = document.getElementById('reportCategory');
    if (catSel) {
        catSel.innerHTML = '<option value="">All Categories</option>' + catSet.map(s => `<option value="${s}">${s}</option>`).join('');
    }
    const stSel = document.getElementById('reportStatus');
    if (stSel) {
        stSel.innerHTML = '<option value="">All Statuses</option>' + statusSet.map(s => `<option value="${s}">${s}</option>`).join('');
    }
    const prSel = document.getElementById('reportPriority');
    if (prSel) {
        prSel.innerHTML = '<option value="">All Priorities</option>' + prioritySet.map(s => `<option value="${s}">${s}</option>`).join('');
    }
}

function generateReport() {
    const location = document.getElementById('reportLocation').value;
    const category = document.getElementById('reportCategory').value;
    const status = document.getElementById('reportStatus').value;
    const priority = document.getElementById('reportPriority').value;
    const dateFrom = document.getElementById('reportDateFrom').value;
    const dateTo = document.getElementById('reportDateTo').value;

    let filtered = findings || [];
    if (location) filtered = filtered.filter(f => f.location_id === location);
    if (category) filtered = filtered.filter(f => f.category === category);
    if (status) filtered = filtered.filter(f => f.status === status);
    if (priority) filtered = filtered.filter(f => f.priority === priority);
    if (dateFrom) filtered = filtered.filter(f => (f.created_at || '') >= dateFrom);
    if (dateTo) filtered = filtered.filter(f => (!(f.created_at) || (f.created_at || '') <= dateTo));

    const container = document.getElementById('reportResults');
    if (!container) return;

    if (!filtered || filtered.length === 0) {
        container.innerHTML = '<p style="color:var(--text-tertiary);">No findings match the selected filters.</p>';
        return;
    }

    let html = `<h4>Inspection Report</h4>`;
    html += `<table class="employee-admin-table" style="width:100%;min-width:700px;"><thead><tr><th>ID</th><th>Inspection</th><th>Location</th><th>Category</th><th>Priority</th><th>Status</th><th>Due Date</th></tr></thead><tbody>`;
    filtered.forEach(f => {
        html += `<tr><td>${f.id}</td><td>${f.inspection_id || ''}</td><td>${f.location_id || ''}</td><td>${f.category || ''}</td><td>${f.priority || ''}</td><td>${f.status || ''}</td><td>${f.due_date || ''}</td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderInspectionsList() {
    const container = document.getElementById('inspectionsContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('inspectionsSearch')?.value || '').toLowerCase().trim();
    const renderedInspections = searchTerm
        ? (inspections || []).filter(i => {
            const hay = `${i.inspection_number || ''} ${i.id} ${i.inspection_type || ''} ${i.status || ''} ${i.inspection_date || ''} ${i.general_notes || ''}`.toLowerCase();
            return hay.includes(searchTerm);
        })
        : (inspections || []);

    if (!renderedInspections || renderedInspections.length === 0) {
        container.innerHTML = '<p style="color:var(--text-tertiary);">No inspections yet.</p>';
        return;
    }

    let html = `
        <table class="employee-admin-table" style="width:100%;min-width:700px;">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th data-i18n="employees.thActions">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    renderedInspections.forEach(i => {
        // inspector_display es el nombre guardado en la propia inspeccion. Si no
        // hubiera (inspecciones antiguas), el backend pone una aviso con el id.
        const inspector = i.inspector_display || i.inspector_name || '';
        html += `
            <tr>
                <td><strong>${esc(i.inspection_number || i.id)}</strong>${inspector
                    ? `<br><small style="color:var(--text-tertiary);">${esc(t('insp.inspector'))}: ${esc(inspector)}</small>`
                    : ''}</td>
                <td>${esc(i.inspection_date || '')}${i.inspection_time
                    ? `<br><small style="color:var(--text-tertiary);">${esc(String(i.inspection_time).slice(0,5))}</small>` : ''}</td>
                <td>${esc(i.location_name || i.location_id || '')}</td>
                <td>${esc(i.inspection_type || '')}</td>
                <td>${esc(i.status || '')}</td>
                <td style="max-width:260px;white-space:normal;">${esc(i.general_notes || '')}</td>
                <td>
                    <div class="insp-acciones">
                        <button class="btn btn-sm btn-secondary" title="${esc(t('insp.viewDetail'))}"
                                onclick="viewInspection(${i.id})"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-secondary" title="${esc(t('insp.edit'))}"
                                onclick="editInspection(${i.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-info" title="${esc(t('insp.addFinding'))}"
                                onclick="openFindingModal(${i.id})"><i class="fas fa-flag"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function loadFindings() {
    try {
        const res = await fetch(`${API_BASE_URL}/${currentType}/findings`);
        if (!res.ok) throw new Error('Failed to load findings');
        findings = await res.json();
        renderFindingsTable();
        renderPendingActions();
    } catch (err) {
        console.error(err);
        const container = document.getElementById('findingsContainer');
        if (container) container.innerHTML = '<p style="color:var(--text-tertiary);">No findings yet.</p>';
    }
}

function renderFindingsTable() {
    const container = document.getElementById('findingsContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('findingsSearch')?.value || '').toLowerCase().trim();
    const filteredFindings = searchTerm
        ? (findings || []).filter(f => {
            const hay = `${f.location_id || ''} ${f.title || ''} ${f.category || ''} ${f.priority || ''} ${f.status || ''}`.toLowerCase();
            return hay.includes(searchTerm);
        })
        : (findings || []);

    if (!filteredFindings || filteredFindings.length === 0) {
        container.innerHTML = '<p style="color:var(--text-tertiary);">No findings recorded.</p>';
        return;
    }

    const renderedFindings = filteredFindings;

    let html = `
        <table class="employee-admin-table" style="width:100%;min-width:700px;">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Location</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th data-i18n="employees.thActions">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    renderedFindings.forEach(f => {
        const asignado = f.assigned_display || f.assigned_to_name || '';
        html += `
            <tr>
                <td>${esc(f.id)}</td>
                <td>${esc(f.location_name || f.location_id || 'N/A')}</td>
                <td style="max-width:260px;white-space:normal;">${esc(f.title || 'N/A')}</td>
                <td>${esc(f.category || 'N/A')}</td>
                <td>${esc(f.priority || 'N/A')}</td>
                <td>${esc(f.status || 'N/A')}</td>
                <td>${esc(asignado || '—')}</td>
                <td>
                    <div class="insp-acciones">
                        <button class="btn btn-sm btn-secondary" title="${esc(t('insp.viewDetail'))}"
                                onclick="viewFinding(${f.id})"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-secondary" title="${esc(t('insp.edit'))}"
                                onclick="editFinding(${f.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger" title="${esc(t('insp.delete'))}"
                                onclick="deleteFinding(${f.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function filterInspections() {
    renderInspectionsList();
}

function filterFindings() {
    renderFindingsTable();
}

// --- Ver y editar una inspeccion --------------------------------------------
async function viewInspection(id) {
    const i = await getInspection(id);
    if (!i) { showNotification(t('insp.inspectionNotFound'), 'error'); return; }

    // El nombre que se muestra es el guardado en la propia inspeccion, mas su
    // id de inspector. Ese id es propio del registro de inspectores: no es el de
    // un empleado. Cuando no hay nombre (inspecciones antiguas), el backend ya
    // devuelve un texto que explica el id, asi que no se le añade otra vez.
    const inspector = i.inspector_name
        ? i.inspector_name + (i.inspector_id ? '  ·  ' + t('insp.inspectorIdShort') + ' ' + i.inspector_id : '')
        : (i.inspector_display || (i.inspector_id ? 'ID ' + i.inspector_id : t('insp.inspectorNone')));

    abrirModalDetalle(t('insp.inspectionDetail'), `
        <div class="detail-card">
            <p><strong>${esc(t('insp.inspectionId'))}:</strong> ${esc(i.inspection_number || '')}</p>
            <p><strong>${esc(t('insp.inspector'))}:</strong> ${esc(inspector)}</p>
            <p><strong>${esc(t('insp.inspectionDate'))}:</strong> ${esc(i.inspection_date || '')}
               ${i.inspection_time ? ' · ' + esc(String(i.inspection_time).slice(0, 5)) : ''}</p>
            <p><strong>${esc(t('insp.inspectionType'))}:</strong> ${esc(i.inspection_type || '—')}</p>
            <p><strong>${esc(t('insp.location'))}:</strong> ${esc(i.location_name || i.location_id || '—')}</p>
            <p><strong>${esc(t('insp.status'))}:</strong> ${esc(i.status || '—')}</p>
        </div>
        ${i.general_notes ? `<div class="detail-card" style="margin-top:0.75rem;">
            <h4>${esc(t('insp.generalNotes'))}</h4><p style="white-space:pre-wrap;">${esc(i.general_notes)}</p></div>` : ''}
        <div class="detail-card" style="margin-top:0.75rem;">
            <h4>${esc(t('inspections.findings'))} (${(i.findings || []).length})</h4>
            ${(i.findings || []).length
                ? (i.findings || []).map(f => `<p style="margin-bottom:0.5rem;">
                      <strong>#${f.id}</strong> ${esc(f.title || '')} — ${esc(f.category || '')} ·
                      ${esc(f.status || '')}${f.assigned_display ? ' · ' + esc(t('insp.assignedTo')) + ': ' + esc(f.assigned_display) : ''}
                      ${f.corrections ? ' · ' + f.corrections + ' ' + esc(t('insp.correctionShort')) : ''}
                      <br><span class="insp-acciones" style="justify-content:flex-start;margin-top:0.25rem;">
                        <button class="btn btn-sm btn-secondary" onclick="viewFinding(${f.id})"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-sm btn-secondary" onclick="editFinding(${f.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-info" onclick="openCorrectionModal(${f.id})"><i class="fas fa-wrench"></i></button>
                      </span>
                    </p>`).join('')
                : `<p class="text-muted">${esc(t('insp.noFindings'))}</p>`}
        </div>
        <div class="detail-card" style="margin-top:0.75rem;">
            <h4>${esc(t('insp.auditHistory'))} (${(i.history || []).length})</h4>
            ${(i.history || []).length
                ? (i.history || []).map(h => `<p style="font-size:0.85rem;">
                      ${esc((h.changed_at || '').slice(0, 16).replace('T', ' '))} ·
                      ${esc(h.previous_status || '—')} → ${esc(h.new_status || '—')}
                      ${h.comment ? '<br>' + esc(h.comment) : ''}</p>`).join('')
                : `<p class="text-muted">${esc(t('insp.noHistory'))}</p>`}
        </div>`);
}

async function editInspection(id) {
    if (!hasRole('supervisor')) { showNotification(t('confirm.permissionSupervisor'), 'error'); return; }
    await cargarCatalogosInspecciones();
    const i = await getInspection(id);
    if (!i) { showNotification(t('insp.inspectionNotFound'), 'error'); return; }
    openInspectionModal(i);
}

// ---------------------------------------------------------------------------
//  PANEL DE LOCACIONES INSPECCIONADAS
// ---------------------------------------------------------------------------
// La informacion viene de /inspections-by-location, que la lee de
// inspections.location_id. No hay nada escrito a mano en el frontend: si no hay
// inspeccion para esa locacion, no aparece como inspeccionada.
async function cargarPanelLocacionesInspeccionadas() {
    const contenedor = document.getElementById('inspectionMapGrid');
    if (!contenedor) return;

    try {
        const r = await fetch(`${API_BASE_URL}/${currentType}/inspections-by-location`);
        if (!r.ok) throw new Error('sin datos');
        insp.locPorInspeccion = await r.json();
    } catch (e) {
        console.error('No se pudo cargar el panel de locaciones inspeccionadas:', e);
        insp.locPorInspeccion = [];
    }

    renderInspectionsMap();
}

function renderInspectionsMap() {
    const container = document.getElementById('inspectionMapGrid');
    if (!container) return;

    const searchTerm = (document.getElementById('inspectionMapSearch')?.value || '').toLowerCase().trim();
    const datos = insp.locPorInspeccion || [];

    let filas = datos;
    if (searchTerm) {
        filas = datos.filter(f => {
            const t = `${f.location_name || ''} ${f.location_id || ''} ${f.inspection_number || ''} ${f.category || ''}`.toLowerCase();
            return t.includes(searchTerm);
        });
    }

    const statusFilter = document.getElementById('mapStatusFilter')?.value || '';
    if (statusFilter) filas = filas.filter(f => String(f.hallazgos_abiertos || 0) === '0' ? false : true);

    if (!filas.length) {
        container.innerHTML = '<p style="color:var(--text-tertiary);">' + esc(t('insp.noLocations')) + '</p>';
        return;
    }

    container.innerHTML = filas.map(f => {
        // Solo se marcan como "inspeccionada" las que de verdad lo estan.
        const inspeccionada = !!f.inspection_id;
        const resumen = inspeccionada
            ? `${f.inspecciones_total} ${t('insp.inspectionsCount')} · ` +
              `${f.hallazgos_total} ${t('insp.findingsCount').toLowerCase()}` +
              (f.hallazgos_abiertos ? ` · ${f.hallazgos_abiertos} ` + t('insp.openShort') : '')
            : t('insp.neverInspected');

        const inspector = f.inspector_display || f.inspector_name || '';

        return `
            <div class="location-card ${inspeccionada ? 'location-card-inspected' : ''}" data-location-id="${esc(f.location_id)}"
                 style="cursor:pointer;" onclick="openInspectionDetail('${esc(f.location_id)}')">
                <div class="location-name">
                    <i class="fas fa-store"></i> ${esc(f.location_name || f.location_id)}
                    ${inspeccionada ? `<span class="skill-tag" style="margin-left:auto;">${esc(t('insp.inspected'))}</span>` : ''}
                </div>
                <div class="location-type">${esc(f.category || '')}</div>
                <div class="location-category">
                    <span style="color:var(--text-tertiary);font-size:0.78rem;">${esc(resumen)}</span>
                </div>
                ${inspeccionada ? `
                    <div class="location-assignments" style="font-size:0.8rem;line-height:1.5;">
                        <div><strong>${esc(t('insp.inspectionDate'))}:</strong>
                             ${esc(f.inspection_date || '')}${f.inspection_time ? ' ' + esc(String(f.inspection_time).slice(0, 5)) : ''}</div>
                        <div><strong>${esc(t('insp.inspectionType'))}:</strong> ${esc(f.inspection_type || '—')}</div>
                        <div><strong>${esc(t('insp.inspector'))}:</strong> ${esc(inspector || '—')}</div>
                        <div><strong>${esc(t('insp.inspectionId'))}:</strong> ${esc(f.inspection_number || '')}</div>
                    </div>` : ''}
            </div>`;
    }).join('');
}

async function loadStatusHistory() {
    try {
        const res = await fetch(`${API_BASE_URL}/${currentType}/status-history`);
        if (!res.ok) throw new Error('Failed to load audit history');
        statusHistory = await res.json();
        renderStatusHistory();
    } catch (err) {
        console.error(err);
        const container = document.getElementById('statusHistoryContainer');
        if (container) container.innerHTML = '<p style="color:var(--text-tertiary);">No audit history.</p>';
    }
}

function renderStatusHistory() {
    const container = document.getElementById('statusHistoryContainer');
    if (!container) return;

    if (!statusHistory || statusHistory.length === 0) {
        container.innerHTML = '<p style="color:var(--text-tertiary);">No audit history.</p>';
        return;
    }

    // Fechas legibles y el nombre de quien hizo el cambio. La API ya devuelve
    // las relaciones resueltas (inspector, hallazgo, locacion), asi que aqui no
    // hay que adivinar nada.
    const fechaBonita = (v) => {
        if (!v) return '—';
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
        return d.toLocaleString('es-US', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        }).replace(', ', ' · ');
    };

    let html = `
        <table class="employee-admin-table" style="width:100%;min-width:980px;">
            <thead>
                <tr>
                    <th data-i18n="insp.date">Fecha</th>
                    <th data-i18n="insp.status">Estado</th>
                    <th data-i18n="insp.whoChanged">Hecho por</th>
                    <th data-i18n="insp.inspectionId">Inspección</th>
                    <th data-i18n="insp.location">Locación</th>
                    <th data-i18n="insp.changeComment">Comentario</th>
                </tr>
            </thead>
            <tbody>
    `;

    statusHistory.forEach(h => {
        const quien = h.changed_by_name
            || (h.changed_by ? ('ID ' + h.changed_by) : '—');

        html += `
            <tr>
                <td style="white-space:nowrap;">${esc(fechaBonita(h.changed_at))}</td>
                <td>${esc(h.previous_status || '—')} &rarr;<br>
                    <strong>${esc(h.new_status || '—')}</strong></td>
                <td>${esc(quien)}</td>
                <td style="word-break:break-all;">${esc(h.inspection_number || (h.inspection_id ? '#' + h.inspection_id : '—'))}</td>
                <td>${esc(h.location_name || '—')}</td>
                <td style="max-width:280px;white-space:normal;">${esc(h.comment || '—')}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderPendingActions() {
    const container = document.getElementById('pendingActionsContainer');
    if (!container) return;

    const pending = (findings || []).filter(f => {
        const s = (f.status || '').toLowerCase();
        return !['closed','audited','supervised','corrected'].includes(s);
    });

    const sortBy = document.getElementById('pendingActionsSort')?.value || 'priority';
    const sorted = (pending || []).sort((a, b) => {
        if (sortBy === 'priority') return (a.priority || '').localeCompare(b.priority || '');
        if (sortBy === 'due_date') return (a.due_date || '').localeCompare(b.due_date || '');
        if (sortBy === 'location') return (a.location_id || '').localeCompare(b.location_id || '');
        if (sortBy === 'assigned_to') return (a.assigned_to || '').toString().localeCompare((b.assigned_to || '').toString());
        if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '');
        return 0;
    });

    if (!sorted || sorted.length === 0) {
        container.innerHTML = '<p style="color:var(--text-tertiary);">No pending actions.</p>';
        return;
    }

    let html = `
        <table class="employee-admin-table" style="width:100%;min-width:700px;">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Location</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    sorted.forEach(f => {
        html += `
            <tr class="${(f.priority || '').toLowerCase() === 'critical' ? 'row-critical' : ''}">
                <td>${f.id}</td>
                <td>${f.location_id || 'N/A'}</td>
                <td>${f.title || 'N/A'}</td>
                <td>${f.priority || 'N/A'}</td>
                <td>${f.status || 'N/A'}</td>
                <td>${f.assigned_to || 'N/A'}</td>
                <td>${f.due_date || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="quickMarkFinding(${f.id}, 'corrected')">Mark Corrected</button>
                    <button class="btn btn-sm btn-secondary" onclick="quickMarkFinding(${f.id}, 'supervised')">Mark Supervised</button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function quickMarkFinding(id, newStatus) {
    if (!hasRole('supervisor')) { showNotification(t('confirm.permissionSupervisor'), 'error'); return; }
    if (!confirm(`Mark finding #${id} as ${newStatus}?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/${currentType}/findings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (!res.ok) throw new Error(`Failed to update finding ${id}`);

        const finding = (findings || []).find(f => f.id === id);
        try {
            await fetch(`${API_BASE_URL}/${currentType}/status-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inspection_id: finding?.inspection_id || null,
                    finding_id: id,
                    previous_status: finding?.status || null,
                    new_status: newStatus,
                    changed_by: 1,
                    comment: 'Quick update'
                })
            });
        } catch (err2) {
            console.error('Error logging status history', err2);
        }

        showNotification(`Finding #${id} marked as ${newStatus}`, 'success');
        await loadFindings();
    } catch (err) {
        console.error(err);
        showNotification(t('notify.errorUpdateFinding'), 'error');
    }
}













async function loadLocationDisablesForManagement(date) {
    try {
        const disables = await fetchLocationDisables(date);
        // Update the UI to show disabled locations
        disables.forEach(disable => {
            const disableRecord = disable;
            if (!disableRecord.enabled_at) {
                updateLocationStatus(disableRecord.location_id, 'disabled', disableRecord.reactivation_date);
            }
        });
    } catch (error) {
        console.error('Error loading location disables for management:', error);
    }
}

// ============================================
// PANEL REFRESH FUNCTIONS
// ============================================

async function refreshEmployeesPanel() {
    const btn = document.getElementById('refreshEmployeesBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    btn.disabled = true;

    try {
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

        renderEmployees();
        populateEmployeeSelects();
        showNotification(t('notify.employeesUpdated'), 'success');
    } catch (error) {
        console.error('Error refreshing employees panel:', error);
        showNotification(t('notify.errorUpdateEmployees'), 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ============================================================================
//  EXPORTAR EL HORARIO A EXCEL
// ============================================================================
//  El archivo se genera en el servidor con el mismo formato que el importador ya
//  entiende (hojas "Schedule", "Import Data" y "Empleados"), de modo que se
//  puede volver a subir sin convertir nada. Aqui solo se le pide la fecha y se
//  deja que el navegador guarde la respuesta.
//
//  Antes de descargar se consulta la vista previa. No es un adorno: el servidor
//  avisa de lo que no puede representar (una supervisión sin localización, un
//  turno que empieza a medianoche) y quien exportar decide con la información a
//  la vista, en vez de descubrirlo al reimportar el archivo.
// ============================================================================
async function exportScheduleExcel() {
    const btn = document.getElementById('exportScheduleExcelBtn');
    const workDate = document.getElementById('workDate');
    const fecha = workDate ? workDate.value : '';

    // Sin fecha no hay nada que exportar, y mandar la de hoy sin avisar sería
    // entregar un archivo que no es el que se ha pedido.
    if (!fecha) {
        showNotification(t('sched.exportBadDate'), 'error');
        return;
    }

    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('sched.exporting');
    }

    try {
        // Vista previa: qué se va a exportar y con qué avisos.
        const prev = await apiRequest(`/schedule/export-preview?date=${encodeURIComponent(fecha)}`);
        const dia = (prev.detalle && prev.detalle[0]) || {};

        // Un día sin turnos produce un archivo con las hojas vacías. Se avisa y se
        // pregunta, porque casi siempre es que la fecha está mal.
        if (!dia.asignaciones) {
            if (!confirm(t('sched.exportEmptyConfirm'))) return;
        }

        // Avisos que no impiden exportar pero conviene conocer.
        const avisos = [];
        const sinZona = (dia.locacionesSinZona || 0);
        if (sinZona > 0) avisos.push(sinZona + ' ' + t('sched.exportNoArea'));
        const sinUbic = dia.supervisionSinUbicacion || [];
        if (sinUbic.length) {
            avisos.push(t('sched.exportSupervisionMissing') + ': '
                + sinUbic.map(x => `${x.localizacion} (${(x.supervisores || []).join(', ')})`).join('; '));
        }
        if ((dia.turnosInrepresentables || []).length) {
            avisos.push('Turnos que el importador no puede representar: ' + dia.turnosInrepresentables.join('; '));
        }
        avisos.forEach(a => showNotification(a, 'info'));

        // La descarga la hace el navegador con un enlace temporal, que es lo que
        // hace que respete el nombre que pone el servidor.
        const url = `${API_BASE_URL}/${currentType}/schedule/export.xlsx?date=${encodeURIComponent(fecha)}`;
        const a = document.createElement('a');
        a.href = url;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();

        showNotification(t('sched.exportStarted'), 'success');
    } catch (error) {
        console.error('Error exportando horario:', error);
        showNotification(t('sched.exportErrors') + ': ' + (error.message || error), 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

async function refreshAssignmentsPanel() {
    const btn = document.getElementById('refreshAssignmentsBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    btn.disabled = true;

    try {
        const workDate = document.getElementById('workDate');
        const currentDate = workDate ? workDate.value : getCurrentDateInTimezone();

        await loadAssignmentsForDate(currentDate);
        showNotification(t('notify.assignmentsUpdated'), 'success');
    } catch (error) {
        console.error('Error refreshing assignments panel:', error);
        showNotification(t('notify.errorUpdateAssignments'), 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function refreshHistoryPanel() {
    const btn = document.getElementById('refreshHistoryBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    btn.disabled = true;

    try {
        const historyDate = document.getElementById('historyDate');
        if (historyDate && historyDate.value) {
            await loadAssignmentHistory();
            showNotification(t('notify.historyUpdated'), 'success');
        } else {
            showNotification(t('notify.selectDate'), 'info');
        }
    } catch (error) {
        console.error('Error refreshing history panel:', error);
        showNotification(t('notify.errorUpdateHistory'), 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function refreshLocationManagementPanel() {
    const btn = document.getElementById('refreshLocationManagementBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    btn.disabled = true;

    try {
        await renderManagementGrid();
        const managementDate = document.getElementById('managementDate');
        if (managementDate && managementDate.value) {
            await loadLocationDisablesForManagement(managementDate.value);
        }
        showNotification(t('notify.locationsUpdated'), 'success');
    } catch (error) {
        console.error('Error refreshing location management panel:', error);
        showNotification(t('notify.errorUpdateLocations'), 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function refreshStaffingRulesPanel() {
    const btn = document.getElementById('refreshStaffingRulesBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    btn.disabled = true;

    try {
        // Reuse existing loadStaffingRules function
        await loadStaffingRules();
        showNotification(t('notify.staffingRulesUpdated'), 'success');
    } catch (error) {
        console.error('Error refreshing staffing rules panel:', error);
        showNotification(t('notify.errorUpdateRules'), 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function refreshTasksPanel() {
    const btn = document.getElementById('refreshTasksBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
    btn.disabled = true;

    try {
        tasks = await fetchTasks();
        filterTasks();
        showNotification(t('notify.tasksUpdated'), 'success');
    } catch (error) {
        console.error('Error refreshing tasks panel:', error);
        showNotification(t('notify.errorUpdateTasks'), 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

let closureHistoryRecords = [];

async function refreshClosureHistoryPanel() {
    const btn = document.getElementById('refreshClosureHistoryBtn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        btn.disabled = true;
    }

    try {
        closureHistoryRecords = await fetchLocationDisables();
        renderClosureHistory();
        if (btn) showNotification(t('notify.closureLogUpdated'), 'success');
    } catch (error) {
        console.error('Error refreshing closure history:', error);
        showNotification(t('notify.errorUpdateClosureLog'), 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

function filterClosureHistory() {
    renderClosureHistory();
}

function renderClosureHistory() {
    const container = document.getElementById('closureHistoryContainer');
    const dateFilter = document.getElementById('closureHistoryDate')?.value || '';
    const locationFilter = document.getElementById('closureHistoryLocation')?.value || '';
    const userFilter = (document.getElementById('closureHistoryUser')?.value || '').toLowerCase().trim();

    if (!container) return;

    // Populate location dropdown if empty or changed
    const locationSelect = document.getElementById('closureHistoryLocation');
    if (locationSelect && locationSelect.options.length === 1) {
        const uniqueLocations = [...new Set((closureHistoryRecords || []).map(r => r.location_id))];
        uniqueLocations.forEach(locId => {
            const loc = locations.find(l => l.id === locId);
            const option = document.createElement('option');
            option.value = locId;
            option.textContent = loc ? loc.name : locId;
            locationSelect.appendChild(option);
        });
    }

    const filtered = (closureHistoryRecords || []).filter(record => {
        const matchesDate = !dateFilter || record.disable_date === dateFilter || record.disable_date?.startsWith(dateFilter);
        const matchesLocation = !locationFilter || record.location_id === locationFilter;
        const matchesUser = !userFilter || (record.disabled_by || '').toLowerCase().includes(userFilter);
        return matchesDate && matchesLocation && matchesUser;
    }).sort((a, b) => {
        const dateA = new Date(`${a.disable_date} ${a.created_at || ''}`).getTime();
        const dateB = new Date(`${b.disable_date} ${b.created_at || ''}`).getTime();
        return dateB - dateA;
    });

    if (!filtered || filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);">No hay registros que coincidan con los filtros.</p>';
        return;
    }

    container.innerHTML = `
        <table class="employee-admin-table" style="width:100%;min-width:700px;">
            <thead>
                <tr>
                    <th>Locación</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Motivo</th>
                    <th>Cerrado por</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.map(record => {
                    const location = locations.find(l => l.id === record.location_id);
                    const time = record.created_at ? new Date(record.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    return `
                        <tr>
                            <td>${location ? location.name : record.location_id}</td>
                            <td>${record.disable_date ? formatDateInTimezone(record.disable_date) : 'N/A'}</td>
                            <td>${time}</td>
                            <td>${record.disable_reason || 'N/A'}</td>
                            <td>${record.disabled_by || 'N/A'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// TIMEZONE HELPER FUNCTIONS
// ============================================
const TIMEZONE = 'America/Santo_Domingo';

function getCurrentDateInTimezone() {
    const now = new Date();
    const dateInTimezone = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
    return dateInTimezone.toISOString().split('T')[0];
}

function formatDateInTimezone(dateString) {
    const date = new Date(dateString);
    const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
    return dateInTimezone.toISOString().split('T')[0];
}

// ============================================
// LANGUAGE SYSTEM (i18n)
// ============================================
// Diccionario centralizado ES/EN + aplicador automático.
// Reglas:
//  - Todo texto visible se resuelve con t('clave') o con data-i18n.
//  - Las claves existen en ambos idiomas (validado al arrancar).
//  - Si falta una clave se avisa por consola y se usa el valor EN
//    (nunca se muestra español con el idioma en inglés).
//  - applyI18n es idempotente: guarda el texto original en
//    data-i18n-src, de modo que cambiar de idioma N veces no corrompe.

const I18N = {
    es: {

        // ---------- comun ----------
        'common.actions': 'Acciones',
        'common.add': 'Agregar',
        'common.all': 'Todos',
        'common.apply': 'Aplicar',
        'common.assignedTo': 'Asignado a',
        'common.back': 'Volver',
        'common.cancel': 'Cancelar',
        'common.category': 'Categoría',
        'common.chooseLocation': 'Elegir locación...',
        'common.close': 'Cerrar',
        'common.closedBy': 'Cerrado por',
        'common.comingSoon': 'Próximamente',
        'common.confirm': 'Confirmar',
        'common.date': 'Fecha',
        'common.delete': 'Eliminar',
        'common.description': 'Descripción',
        'common.deselectAll': 'Deseleccionar todo',
        'common.dueDate': 'Fecha Límite',
        'common.edit': 'Editar',
        'common.employee': 'Empleado',
        'common.employees': 'Empleados',
        'common.group': 'Grupo',
        'common.loading': 'Cargando...',
        'common.loadingShort': 'Cargando',
        'common.location': 'Locación',
        'common.locations': 'Locaciones',
        'common.na': 'N/D',
        'common.name': 'Nombre',
        'common.new': 'Nuevo',
        'common.next': 'Siguiente',
        'common.noRecords': 'No hay registros que coincidan con los filtros.',
        'common.none': 'Ninguno',
        'common.notes': 'Notas',
        'common.previous': 'Anterior',
        'common.priority': 'Prioridad',
        'common.reason': 'Motivo',
        'common.requiredField': 'Este campo es obligatorio',
        'common.reset': 'Limpiar',
        'common.role': 'Rol',
        'common.save': 'Guardar',
        'common.search': 'Buscar',
        'common.searchUser': 'Buscar por usuario...',
        'common.select': 'Seleccionar',
        'common.selectAll': 'Seleccionar todo',
        'common.selectDay': 'Seleccionar Día:',
        'common.selectEllipsis': 'Seleccionar...',
        'common.selectEmployee': 'Seleccionar empleado',
        'common.selectLocation': 'Seleccionar Locación',
        'common.status': 'Estado',
        'common.submit': 'Enviar',
        'common.task': 'Tarea',
        'common.time': 'Hora',
        'common.title': 'Título',
        'common.today': 'Hoy',
        'common.tomorrow': 'Mañana',
        'common.view': 'Ver',
        'common.yesterday': 'Ayer',

        // ---------- navegacion ----------
        'nav.admin': 'Administración',
        // Submenú del panel de Foods. Reemplazan a los títulos que estaban
        // sueltos en el menú principal (Gestión, Tareas, Reportes,
        // Inspecciones, Administración), que eran dos puertas a lo mismo.
        'nav.panel': 'Herramientas',
        'panel.title': 'Panel operativo',
        'panel.subtitle': 'Empleados, horarios, tareas e inspecciones del parque',
        'panel.schedule': 'Horarios',
        'panel.employees': 'Empleados',
        'panel.locations': 'Locaciones',
        'panel.tasks': 'Tareas',
        'panel.queries': 'Consultas',
        'panel.inspections': 'Inspecciones y correcciones',
        'panel.reports': 'Reportes',
        'nav.changeTheme': 'Cambiar tema',
        'nav.foods': 'Foods',
        'nav.home': 'Inicio',
        'nav.inspections': 'Inspecciones',
        'nav.language': 'Idioma',
        'nav.management': 'Gestión',
        'nav.retail': 'Retail',
        'nav.tasks': 'Tareas',
        'nav.toggleMenu': 'Abrir menú de navegación',
        'nav.wastelog': 'Wastelog',

        // ---------- portada ----------
        'hero.demo': 'Ir al Demo',
        'hero.statEmployees': 'Empleados',
        'hero.statInspections': 'Inspecciones',
        'hero.statLocations': 'Locaciones',
        'hero.statReports': 'Reports',
        'hero.statTasks': 'Tareas Activas',
        'hero.statWastelog': 'Wastelog',
        'hero.subtitle': 'Administra eficientemente el personal de todas las locaciones de comida y tiendas dentro del parque.',
        'hero.titleA': 'Gestión de Personal para',
        'hero.viewLocations': 'Ver Locaciones',

        // ---------- locaciones ----------
        'locations.active': 'Activa',
        'locations.alcohol': 'Alcohol',
        'locations.allLocations': 'Todas las locaciones',
        'locations.closedToday': 'Cerrada hoy',
        'locations.disabledToday': 'CERRADA POR EL DÍA DE HOY',
        'locations.employeesAssignedToday': 'Empleados asignados hoy',
        'locations.food': 'Comida',
        'locations.lastInspection': 'Última inspección',
        'locations.minimumStaff': 'Personal Mínimo',
        'locations.nextSlide': 'Locación siguiente',
        'locations.noInspections': 'Sin inspecciones',
        'locations.prevSlide': 'Locación anterior',
        'locations.sectionSubtitle': 'StoryLand ofrece múltiples opciones para comer y comprar souvenirs dentro del parque',
        'locations.sectionTitle': 'Locaciones de Comida y Tiendas',
        'locations.selectLocationEllipsis': 'Seleccionar locación...',
        'locations.status': 'Estado',
        'locations.store': 'Tienda',
        'locations.typeCategory': '{{type}} • {{category}}',
        'locations.viewRecords': 'Ver registros',

        // ---------- panel de gestion ----------
        'management.allCategories': 'Todas las Categorías',
        'management.allDepartments': 'Todos los departamentos',
        'management.allGroups': 'Todos los Grupos',
        'management.allRoles': 'Todos los roles',
        'management.allStatuses': 'Todos los estados',
        'management.clearData': 'Borrar Datos',
        'management.exportExcel': 'Exportar a Excel',
        'management.quickFood': 'Café',
        'management.quickStore': 'Tienda',
        'management.search': 'Consultar',
        'management.smartQueries': 'Consultas Inteligentes',
        // Consulta por locación entrenada. Ver queries.js.
        'queries.trainedTab': 'Por Locación Entrenada',
        'queries.trainedHint': 'Muestra quién tiene esa localización en su apartado «Locaciones entrenadas», esté donde esté trabajando.',
        'queries.trainedPlaceholder': 'Escribe una localización: Pixie, Food Fair, Farmstand…',
        'queries.trainedFor': 'Personas entrenadas en {{loc}}',
        'queries.trainedSource': 'Datos del apartado «Locaciones entrenadas» de cada perfil.',
        'queries.trainedSince': 'Entrenado desde',
        'queries.totalFound': '{{n}} persona(s) encontrada(s)',
        'queries.noneTrained': 'No hay ningún empleado registrado como entrenado en {{loc}}.',
        'queries.noneTrainedHint': 'Esa localización todavía no tiene entrenamiento registrado en ningún perfil. No se muestran personas de otros sitios ni del historial de turnos: solo lo que está en la ficha.',
        'queries.noneMatchFilters': 'Nadie entrenado en {{loc}} cumple el filtro.',
        'queries.noneMatchFiltersHint': 'Sí hay gente registrada como entrenada en esta localización, pero ninguno coincide con el filtro de rol, grupo o certificación. Quítalo para verlos a todos.',
        'queries.noLocationMatch': 'Ninguna localización se parece a «{{q}}».',
        'queries.didYouMean': 'Localizaciones que sí existen:',
        'queries.whyNoData': 'Localizaciones sin nadie registrado',
        'queries.whyNoDataHint': 'Estas localizaciones no tienen entrenamiento registrado en ningún perfil. No significa que no haya quien pueda trabajar ahí, sino que nadie lo tiene anotado todavía.',
        'queries.multiMatch': 'La búsqueda coincide con varias localizaciones; se muestran todas.',
        'queries.filters': 'Filtros',
        'queries.filterRole': 'Rol',
        'queries.filterGroup': 'Grupo',
        'queries.filterCert': 'Certificación',
        'queries.filterDept': 'Departamento',
        'queries.anyRole': 'Cualquier rol',
        'queries.anyGroup': 'Cualquier grupo',
        'queries.anyCert': 'Cualquier certificación',
        'queries.applyFilters': 'Aplicar',
        'queries.clearFilters': 'Quitar filtros',
        'queries.colName': 'Nombre',
        'queries.colRole': 'Rol',
        'queries.colGroup': 'Grupo',
        'queries.colDept': 'Departamento',
        'queries.colStatus': 'Estado',
        'queries.colSince': 'Entrenado desde',
        'queries.colCerts': 'Certificaciones',
        'queries.noCerts': 'Sin certificaciones',
        'queries.certCount': '{{n}} certificación(es)',
        'queries.moreCerts': 'y {{n}} más',
        'queries.searchByName': 'Filtrar por nombre…',
        'queries.departmentFoods': 'Foods',
        'queries.departmentRetail': 'Retail',
        'queries.departmentNote': 'Reparto actual: {{foods}} en Foods, {{retail}} en Retail.',
        'queries.certMeaning': 'Estar entrenado en una localización no es lo mismo que poder cubrir un puesto: puede faltar alguna certificación que el puesto exija.',
        'management.smartQueriesHint': 'Busca por habilidad, área o nombre...',
        'management.specificDate': 'Fecha específica',
        'management.subtitle': 'Administra empleados, asigna personal a locaciones y gestiona tareas',
        'management.title': 'Panel de Gestión',

        // ---------- empleados ----------
        'employees.assignedToday': 'Asignado hoy',
        'employees.base': 'Base',
        'employees.breadcrumbAll': 'Gestión de Empleados / Empleados',
        'employees.confirmDelete': '¿Está seguro de que desea eliminar este empleado?',
        'employees.count': '{{count}} empleados',
        'employees.detailTitle': 'Detalles del Empleado',
        'employees.editTitle': 'Editar Empleado',
        'employees.fieldAge': 'Edad',
        'employees.fieldGroup': 'Grupo',
        'employees.fieldHireDate': 'Fecha de Ingreso',
        'employees.fieldName': 'Nombre',
        'employees.fieldNationality': 'Nacionalidad',
        'employees.fieldRole': 'Rol',
        'employees.fieldTrainings': 'Habilidades / Capacitaciones',
        'employees.filterDepartment': 'Todos los departamentos',
        'employees.filterRole': 'Todos los roles',
        'employees.filterStatus': 'Todos los estados',
        'employees.new': 'Nuevo Empleado',
        'employees.noAssignment': 'Sin asignación',
        'employees.noEmployees': 'No hay empleados. Haz clic en "Nuevo Empleado".',
        'employees.refresh': 'Actualizar',
        'employees.searchPlaceholder': 'Buscar empleados...',
        'employees.sectionAll': 'Todos los Empleados',
        'employees.sectionAvailability': 'Disponibilidad',
        'employees.sectionCertifications': 'Certificaciones',
        'employees.sectionHistory': 'Historial',
        'employees.sectionRetail': 'Retail',
        'employees.sectionService': 'Servicio y Ventas',
        'employees.sectionSkills': 'Habilidades',
        'employees.selectAllTrainings': 'Seleccionar todo',
        'employees.sidebarTitle': 'Gestión de Empleados',
        'employees.thActions': 'Acciones',
        'employees.noGroup': 'Sin grupo',
        'employees.noSkills': 'Sin habilidades',
        'employees.versatile': 'Versátil',
        'employees.base': 'Base',
        'common.view': 'Ver detalles',
        'common.edit': 'Modificar',
        'common.status': 'Cambiar estado',
        'common.delete': 'Eliminar',
        'notify.employeeNotFound': 'Ese empleado ya no existe. Actualiza la lista.',
        'employees.thEmployee': 'Empleado',
        'employees.thGroup': 'Grupo',
        'employees.thRole': 'Rol',
        'employees.thSkills': 'Habilidades',
        'employees.thStatus': 'Estado',
        'employees.thVersatile': 'Versátil',
        'employees.trainingsCleaning': 'Limpieza y Seguridad (Food & Beverage)',
        'employees.trainingsFnb': '🍔 Capacitaciones Food & Beverage',
        'employees.trainingsOps': '🛠️ Habilidades Operativas',
        'employees.trainingsService': 'Servicio y Ventas',
        'employees.versatile': 'Versátil',

        // ---------- roles ----------
        'role.assistant-supervisor': 'Supervisor Asistente',
        'role.bartender': 'Bartender',
        'role.cashier': 'Cajero',
        'role.cook': 'Cocinero',
        'role.dishwasher': 'Lavaplatos',
        'role.op': 'OP',
        'role.server': 'Server',
        'role.supervisor': 'Supervisor',

        // ---------- grupos ----------
        'group.A': 'Grupo A - Frente del parque (Pixie Kitchen, Food Fair, Oasis, Slush Factory)',
        'group.B': 'Grupo B - Medio del parque (Guard House, Dutch Village, Poblano Cantina, World Pavilion, Teddy\\\'s Oasis)',
        'group.C': 'Grupo C - Fondo del parque (Barnyard Pizza, Dippin\\\' Dots, Farm Stand)',

        // ---------- asignaciones ----------
        'assignments.assign': 'Asignar',
        'assignments.assignSupervisor': 'Asignar Supervisor',
        'assignments.assignSupervisors': 'Asignar Supervisores',
        'assignments.auto': 'Asignar Automáticamente',
        'assignments.break': 'Break',
        'assignments.byEmployee': 'Por Empleado',
        'assignments.byLocation': 'Por Locación',
        'assignments.clearAll': 'Eliminar Todas las Asignaciones',
        'assignments.clearDay': 'Borrar Asignaciones del Día',
        'assignments.confirmClearDay': '¿Está seguro de que desea borrar todas las asignaciones del día?',
        'assignments.descriptionLabel': 'Descripción',
        'assignments.end': 'Hora de fin',
        'assignments.errorRules': 'Error al cargar reglas de staffing',
        'assignments.noAssignments': 'No hay asignaciones. Usa "Asignar Automáticamente" o asigna manualmente.',
        'assignments.noRules': 'No hay reglas de staffing configuradas',
        'assignments.notAssignedDate': 'No asignado para esta fecha.',
        'assignments.optimizedMsg': 'Asignación optimizada: {{assigned}}/{{total}} locaciones',
        'assignments.parkLocations': 'Locaciones del Parque (Asignación Operativa)',
        'assignments.remove': 'Remover',
        'assignments.requiredRoles': 'Roles requeridos: {{roles}}',
        'assignments.results': 'Resultados de Asignación',
        'assignments.rule': 'Un empleado no puede estar asignado operativamente en múltiples locaciones simultáneamente en el mismo horario.',
        'assignments.schedule': 'Horario',
        'assignments.score': '{{assigned}}/{{total}} locaciones',
        'assignments.searchEmployee': 'Buscar empleado por nombre...',
        'assignments.selectSupervisor': 'Seleccionar Supervisor:',
        'assignments.selected': 'Seleccionado',
        'assignments.start': 'Hora de inicio',
        'assignments.title': 'Asignación a Locaciones',
        'assignments.titleLabel': 'Título',
        'assignments.unassigned': 'Sin asignar',

        // ---------- historial ----------
        'history.assignedLocation': 'Locación asignada',
        'history.byEmployee': 'Historial de asignaciones por empleado',
        'history.employee': 'Empleado',
        'history.print': 'Imprimir',
        'history.printFirst': 'Primero carga un historial para imprimir',
        'history.scheduleRange': 'Horario',
        'history.selectHint': 'Selecciona una fecha para ver el historial de asignaciones',
        'history.title': 'Historial de Asignaciones',
        'history.view': 'Ver Historial',

        // ---------- consultas ----------
        'queries.noEmployeesDate': 'No hay empleados asignados en la fecha seleccionada.',
        'queries.noResults': 'No se encontraron resultados.',
        'queries.resultsByEmployee': 'Resultados por empleado:',
        'queries.resultsByRole': 'Resultados por rol:',
        'queries.searchPlaceholder': 'Buscar por habilidad, área o nombre...',
        'queries.typeHint': 'Escribe una locación, nombre o rol.',

        // ---------- tareas ----------
        'tasks.catEquipment': '⚙️ Equipos',
        'tasks.catSafety': '⚠️ Seguridad',
        'tasks.catSupplies': '📦 Suministros',
        'tasks.editTitle': 'Editar Tarea',
        'tasks.fieldAssignTo': 'Asignar a',
        'tasks.fieldCategory': 'Categoría',
        'tasks.fieldDescription': 'Descripción',
        'tasks.fieldDueDate': 'Fecha Límite',
        'tasks.fieldPriority': 'Prioridad',
        'tasks.fieldStatus': 'Estado',
        'tasks.fieldTitle': 'Título',
        'tasks.new': 'Nueva Tarea',
        'tasks.noTasks': 'No hay tareas.',
        'tasks.priority.high': 'Alta',
        'tasks.priority.low': 'Baja',
        'tasks.priority.medium': 'Media',
        'tasks.priority.urgent': 'Urgente',
        'tasks.saved': 'Tarea guardada',
        'tasks.status.completed': 'Completada',
        'tasks.status.in-progress': 'En Progreso',
        'tasks.status.pending': 'Pendiente',
        'tasks.title': 'Gestión de Tareas',

        // ---------- categorias ----------
        'category.cleaning': '🧹 Limpieza',
        'category.customer-service': '👥 Servicio al Cliente',
        'category.maintenance': '🔧 Mantenimiento',
        'category.other': '📋 Otro',
        'category.training': '📚 Capacitación',

        // ---------- breaks ----------
        'breaks.config': 'Configuración de Break',
        'breaks.coveredBy': 'Cubierto por',
        'breaks.coveringEmployee': 'Empleado que cubre el break',
        'breaks.endTime': 'Hora fin',
        'breaks.noBreak': 'Sin break',
        'breaks.noResults': 'No se encontraron empleados.',
        'breaks.schedule': 'Horario del Break',
        'breaks.searchEmployee': 'Buscar empleado...',
        'breaks.selfBreak': 'Self Break',
        'breaks.startTime': 'Hora inicio',
        'breaks.type': 'Tipo de Break',

        // ---------- estados ----------
        'status.available': 'Disponible',
        'status.break': 'En Break',
        'status.dayoff': 'Day Off',
        'status.holiday': 'Festivo',
        'status.training': 'En Training',

        // ---------- administracion ----------
        'admin.active': 'Activo',
        'admin.closureLog': 'Registro de Locaciones Cerradas',
        'admin.confirmDisable': '¿Está seguro de que desea deshabilitar {{name}}?',
        'admin.confirmEnable': '¿Está seguro de que desea habilitar {{name}}?',
        'admin.date': 'Fecha:',
        'admin.disable': 'Deshabilitar',
        'admin.disabled': 'Deshabilitado',
        'admin.enable': 'Habilitar',
        'admin.loadError': 'Error al cargar el registro',
        'admin.loadingRecord': 'Cargando registro...',
        'admin.locationsTitle': 'Gestión de Locaciones',
        'admin.noDisables': 'No hay registros de locaciones cerradas',
        'admin.reactivation': 'Reactivación: {{date}}',
        'admin.reactivationDate': 'Fecha de reactivación',
        'admin.reactivationNote': 'Si no se especifica, la reactivación será manual',
        'admin.wastelogOpened': 'Wastelog abierto',

        // ---------- inspecciones ----------
        'inspections.activeInspections': 'Inspecciones Activas',
        'insp.inspectionId': "ID de inspección",
        'insp.autoGenerated': "Se genera al guardar",
        'insp.inspectionDate': "Fecha de inspección",
        'insp.inspectionTime': "Hora de inspección",
        'insp.inspector': "Inspector",
        'insp.inspectorHint': "Escribe el nombre de quien hizo la inspección. No hace falta que esté dado de alta como empleado.",
        'insp.inspectorRegistered': "Inspector {{nombre}} registrado con su propio identificador.",
        'insp.inspectorUses': "{{n}} inspección/es",
        'insp.inspectorNeverUsed': "sin inspecciones todavía",
        'insp.inspectorIdShort': "ID de inspector",
        'insp.inspectorNone': "sin inspector registrado",
        'insp.searchInspector': "Escribe el nombre del inspector…",
        'insp.inspectionType': "Tipo de inspección",
        'insp.searchType': "Buscar tipo…",
        'insp.newType': "Nuevo tipo",
        'insp.newTypePrompt': "Nombre del tipo de inspección nuevo:",
        'insp.typeInvalid': "Ese nombre no sirve como identificador de tipo.",
        'insp.typeCreated': "Tipo de inspección creado.",
        'insp.location': "Locación",
        'insp.searchLocation': "Buscar locación…",
        'insp.generalNotes': "Notas generales",
        'insp.saveInspection': "Guardar inspección",
        'insp.editInspection': "Modificar inspección",
        'insp.saveChanges': "Guardar cambios",
        'insp.inspectionUpdated': "Inspección actualizada.",
        'insp.dateRequired': "Indica la fecha de la inspección.",
        'insp.typeRequired': "Elige el tipo de inspección.",
        'insp.locationRequired': "Elige la locación inspeccionada.",
        'insp.inspectorRequired': "Escribe el nombre de quien hizo la inspección.",
        'insp.findingId': "ID del hallazgo",
        'insp.relatedInspection': "Inspección relacionada",
        'insp.searchInspection': "Buscar inspección…",
        'insp.findingTitle': "Título del hallazgo",
        'insp.description': "Descripción",
        'insp.category': "Categoría",
        'insp.searchCategory': "Buscar o escribir categoría…",
        'insp.categoryHint': "Las categorías dependen del tipo de inspección. Puedes escribir una propia.",
        'insp.priority': "Prioridad",
        'insp.status': "Estado",
        'insp.recommendedAction': "Acción recomendada",
        'insp.assignedTo': "Asignado a",
        'insp.searchAssignee': "Buscar persona…",
        'insp.dueDate': "Fecha límite",
        'insp.saveFinding': "Guardar hallazgo",
        'insp.editFinding': "Modificar hallazgo",
        'insp.findingUpdated': "Hallazgo actualizado.",
        'insp.editingFinding': "Estás modificando un hallazgo existente. El ID y la inspección no se cambian.",
        'insp.inspectionRequired': "Elige la inspección a la que pertenece el hallazgo.",
        'insp.titleRequired': "Escribe el título del hallazgo.",
        'insp.categoryRequired': "Elige o escribe una categoría.",
        'insp.noInspections': "Primero crea una inspección.",
        'insp.noFindings': "Primero crea un hallazgo.",
        'insp.findingNotFound': "Ese hallazgo ya no está en la vista.",
        'insp.findingDetail': "Detalle del hallazgo",
        'insp.confirmDeleteFinding': "¿Retirar este hallazgo de la vista? Su historial y sus correcciones se conservan. No se borra nada.",
        'insp.findingRemoved': "Hallazgo retirado de la vista. El registro se conserva.",
        'insp.errorDeleteFinding': "No se pudo retirar el hallazgo.",
        'insp.relatedFinding': "Hallazgo relacionado",
        'insp.searchFinding': "Buscar hallazgo…",
        'insp.correctiveAction': "Acción correctiva",
        'insp.date': "Fecha",
        'insp.completionNotes': "Notas de cierre",
        'insp.saveCorrection': "Guardar corrección",
        'insp.editCorrection': "Modificar corrección",
        'insp.correctionUpdated': "Corrección actualizada.",
        'insp.editingCorrection': "Estás modificando una corrección existente.",
        'insp.findingRequired': "Elige el hallazgo que corrige.",
        'insp.actionRequired': "Describe la acción correctiva.",
        'insp.correctionNotFound': "Esa corrección ya no está en la vista.",
        'insp.correctionDetail': "Detalle de la corrección",
        'insp.confirmDeleteCorrection': "¿Retirar esta corrección de la vista? El registro se conserva.",
        'insp.correctionRemoved': "Corrección retirada de la vista. El registro se conserva.",
        'insp.errorDeleteCorrection': "No se pudo retirar la corrección.",
        'insp.inspected': "Inspeccionada",
        'insp.neverInspected': "Nunca inspeccionada",
        'insp.inspectionsCount': "inspecciones",
        'insp.findingsCount': "hallazgos",
        'insp.openShort': "abiertos",
        'insp.noLocations': "No hay locaciones que mostrar.",
        'insp.noHistory': "Sin cambios registrados.",
        'insp.auditHistory': "Historial de auditoría",
        'insp.exportPdf': "Exportar historial a PDF",
        'insp.generatingPdf': "Generando…",
        'insp.pdfStarted': "Se ha iniciado la descarga del PDF.",
        'insp.pdfScope': "El PDF incluirá:",
        'insp.pdfScopeAll': "El PDF incluirá TODO el historial de auditoría, sin filtros.",
        'insp.from': "Desde",
        'insp.to': "Hasta",
        'insp.since': "Desde",
        'insp.until': "Hasta",
        'insp.viewDetail': "Ver detalle",
        'insp.edit': "Modificar",
        'insp.delete': "Eliminar",
        'insp.inspectionDetail': "Detalle de la inspección",
        'insp.inspectionNotFound': "Esa inspección no existe.",
        'insp.correctionShort': "corrección(es)",
        'insp.whoChanged': "Hecho por",
        'insp.changeComment': "Comentario",
        'insp.previousStatus': "Anterior",
        'inspections.addCorrection': 'Agregar Corrección',
        'inspections.addFinding': 'Agregar Hallazgo',
        'inspections.assetNote': 'Los hallazgos específicos de un activo se pueden vincular mediante la descripción/notas del hallazgo o metadatos adicionales. Los campos de tabla extendidos están pendientes.',
        'inspections.assignedTo': 'Asignado a',
        'inspections.auditHistory': 'Historial de Auditoría',
        'inspections.categoryField': 'Categoría',
        'inspections.completionNotes': 'Notas de Finalización',
        'inspections.confirmMark': '¿Marcar el hallazgo #{{id}} como {{status}}?',
        'inspections.dashboard': 'Panel de Inspecciones',
        'inspections.dateField': 'Fecha',
        'inspections.descriptionField': 'Descripción',
        'inspections.dueDate': 'Fecha Límite',
        'inspections.findingId': 'ID de Hallazgo',
        'inspections.findingsByCategory': 'Hallazgos por Categoría',
        'inspections.findingsByLocation': 'Hallazgos por Locación',
        'inspections.findingsByStatus': 'Hallazgos por Estado',
        'inspections.findingsCorrections': 'Hallazgos y Correcciones',
        'inspections.generalNotes': 'Notas Generales',
        'inspections.inspectionDate': 'Fecha de Inspección',
        'inspections.inspectionId': 'ID de Inspección',
        'inspections.inspectionTime': 'Hora de Inspección',
        'inspections.inspectionType': 'Tipo de Inspección',
        'inspections.inspectorId': 'ID del Inspector',
        'inspections.loadingAudit': 'Cargando historial de auditoría...',
        'inspections.loadingFindings': 'Cargando hallazgos...',
        'inspections.locationId': 'ID de Locación',
        'inspections.locations': 'Locaciones',
        'inspections.markCorrected': 'Marcar Corregido',
        'inspections.markSupervised': 'Marcar Supervisado',
        'inspections.newInspection': 'Nueva Inspección',
        'inspections.newStatus': 'Nuevo Estado',
        'inspections.noAuditHistory': 'No hay historial de auditoría.',
        'inspections.noFindings': 'Aún no hay hallazgos.',
        'inspections.noFindingsFilter': 'Ningún hallazgo coincide con los filtros seleccionados.',
        'inspections.noInspectionHistory': 'No hay historial de inspecciones para esta locación.',
        'inspections.noInspections': 'Aún no hay inspecciones.',
        'inspections.noPendingActions': 'No hay acciones pendientes.',
        'inspections.noRecordsFound': 'No hay hallazgos registrados.',
        'inspections.openFindings': 'Hallazgos Abiertos',
        'inspections.opened': 'Inspecciones y Cumplimiento abierto',
        'inspections.pendingActions': 'Acciones Pendientes',
        'inspections.pendingCorrections': 'Correcciones Pendientes',
        'inspections.priorityField': 'Prioridad',
        'inspections.recommendedAction': 'Acción Recomendada',
        'inspections.reports': 'Informes',
        'inspections.reportsPlaceholder': 'El módulo de informes estará disponible en el futuro.',
        'inspections.searchFindings': 'Buscar por locación, título, categoría, prioridad, estado...',
        'inspections.searchMap': 'Buscar locación, estado, hallazgo o empleado...',
        'inspections.statusField': 'Estado',
        'inspections.subtitle': 'Inspecciones, hallazgos, correcciones, evidencia y auditoría',
        'inspections.title': 'Inspecciones y Cumplimiento',
        'inspections.titleField': 'Título',
        'inspections.totalInspections': 'Inspecciones Totales',

        // ---------- inspecciones (detalle) ----------
        'ins.categoryLabel': 'Categoría:',
        'ins.comment': 'Comentario',
        'ins.finding': 'Hallazgo',
        'ins.findingId': 'ID de Hallazgo',
        'ins.history': 'Historial de Inspecciones',
        'ins.historyPrintTitle': 'Historial de Asignaciones - StoryLand',
        'ins.inspection': 'Inspección',
        'ins.inspectionId': 'ID de Inspección',
        'ins.inspections': 'Inspecciones',
        'ins.lastInspection': 'Última Inspección:',
        'ins.newStatus': 'Nuevo Estado:',
        'ins.noLocationsFound': 'No locations found.',
        'ins.openFindingsLabel': 'Hallazgos Abiertos:',
        'ins.pendingCorrections': 'Correcciones Pendientes:',
        'ins.report': 'Reporte de Inspección',
        'ins.scheduleLabel': 'Horario:',
        'ins.statusLabel': 'Estado:',
        'ins.type': 'Tipo',
        'ins.typeLabel': 'Tipo:',
        'ins.viewTemperatures': 'Ver Temperaturas',

        // ---------- wastelog ----------
        'wastelog.comingSoon': 'This feature will become available once the WasteLog integration is completed.',
        'wastelog.open': 'Abrir',
        'wastelog.noData': 'Temperature data is not available yet.',
        'wastelog.subtitle': 'Registro de desperdicio de alimentos',
        'wastelog.title': 'Wastelog',

        // ---------- pie de pagina ----------
        'footer.company': 'Empresa',
        'footer.copyright': '© 2025 StoryManager. Todos los derechos reservados.',
        'footer.demo': 'Demo',
        'footer.description': 'Gestión de personal para StoryLand NH.',
        'footer.restaurants': 'Restaurantes',
        'footer.stores': 'Tiendas',

        // ---------- notificaciones ----------
        'notify.apiLoaded': 'Datos cargados desde la API',
        'notify.assignmentCreated': 'Asignación creada',
        'notify.assignmentDeleted': 'Asignación eliminada',
        'notify.assignmentsUpdated': 'Asignaciones actualizadas',
        'notify.breakConfigured': 'Break configurado',
        'notify.breakDeleted': 'Break eliminado',
        'notify.breakSaved': 'Configuración de break guardada',
        'notify.breakSavedInspection': 'Inspection saved',
        'notify.clearing': 'Limpiando datos...',
        'notify.closureLogUpdated': 'Registro de locaciones cerradas actualizado',
        'notify.correctionSaved': 'Correction saved',
        'notify.dataUpdated': 'Datos actualizados',
        'notify.dayDeleted': 'Asignaciones del día eliminadas',
        'notify.employeeDeleted': 'Empleado eliminado',
        'notify.employeeSaved': 'Empleado agregado',
        'notify.employeeUpdated': 'Empleado actualizado',
        'notify.employeesUpdated': 'Empleados actualizados',
        'notify.errorAssignSupervisor': 'Error al asignar supervisor',
        'notify.errorChangeType': 'Error al cambiar de tipo',
        'notify.errorCreateAssignment': 'Error al crear asignación. Por favor intenta nuevamente.',
        'notify.errorDeleteAssignment': 'Error al eliminar asignación',
        'notify.errorDeleteBreak': 'Error al eliminar configuración de break',
        'notify.errorDeleteDayAssignments': 'Error al eliminar asignaciones del día',
        'notify.errorDeleteEmployee': 'Error al eliminar empleado',
        'notify.errorDeleteTask': 'Error al eliminar tarea',
        'notify.errorDisableLocation': 'Error al deshabilitar locación: {{msg}}',
        'notify.errorDisableRule': 'Error al desactivar regla de staffing',
        'notify.errorEnableLocation': 'Error al habilitar locación: {{msg}}',
        'notify.errorExport': 'Error al exportar',
        'notify.errorExportFindings': 'Error exporting findings',
        'notify.errorLoadApi': 'Error al cargar datos de la API',
        'notify.errorLoadHistory': 'Error al cargar historial de asignaciones',
        'notify.errorLoadInspections': 'Error al cargar inspecciones',
        'notify.errorQueryLocationHistory': 'Error al consultar historial de locación',
        'notify.errorSaveCorrection': 'Error saving correction',
        'notify.errorSaveEmployee': 'Error al guardar empleado',
        'notify.errorSaveFinding': 'Error saving finding',
        'notify.errorSaveInspection': 'Error saving inspection',
        'notify.errorSaveTask': 'Error al guardar tarea',
        'notify.errorUpdateAssignments': 'Error al actualizar asignaciones',
        'notify.errorUpdateClosureLog': 'Error al actualizar registro de locaciones cerradas',
        'notify.errorUpdateEmployees': 'Error al actualizar empleados',
        'notify.errorUpdateFinding': 'Error updating finding',
        'notify.errorUpdateHistory': 'Error al actualizar historial',
        'notify.errorUpdateLocations': 'Error al actualizar gestión de locaciones',
        'notify.errorUpdateRule': 'Error al actualizar regla de staffing',
        'notify.errorUpdateRules': 'Error al actualizar reglas de staffing',
        'notify.errorUpdateTask': 'Error al actualizar tarea',
        'notify.errorUpdateTasks': 'Error al actualizar tareas',
        'notify.exportEmpty': 'No hay datos para exportar',
        'notify.exportReady': 'Archivo generado',
        'notify.findingSaved': 'Finding saved',
        'notify.foodsLoaded': 'Datos de Foods cargados',
        'notify.historyUpdated': 'Historial actualizado',
        'notify.localStorageCleared': 'Datos locales eliminados',
        'notify.locationsUpdated': 'Gestión de locaciones actualizada',
        'notify.noAssignmentsDate': 'No hay asignaciones para esa fecha',
        'notify.noDisableRecord': 'No se encontró registro de deshabilitación',
        'notify.noEmployeesAvailable': 'No hay empleados disponibles',
        'notify.noFindingsToExport': 'No findings to export',
        'notify.notImplemented': 'Función no implementada con API',
        'notify.panelOpened': 'Panel de administración abierto',
        'notify.permissionDenied': 'Permiso denegado',
        'notify.retailLoaded': 'Datos de Retail cargados',
        'notify.scheduleOrder': 'El horario de fin debe ser después del inicio',
        'notify.selectBreakEmployee': 'Selecciona el empleado que cubrirá el break',
        'notify.selectBreakType': 'Selecciona el tipo de break',
        'notify.selectBuilding': 'Selecciona al menos un building',
        'notify.selectDate': 'Selecciona una fecha primero',
        'notify.selectDateFirst': 'Por favor selecciona una fecha',
        'notify.selectEmployee': 'Selecciona un empleado',
        'notify.selectLocation': 'Selecciona una locación',
        'notify.selectSchedule': 'Selecciona el horario de trabajo',
        'notify.selectSupervisor': 'Selecciona un supervisor',
        'notify.staffingRuleDisabled': 'Regla de staffing desactivada',
        'notify.staffingRuleUpdated': 'Regla de staffing actualizada',
        'notify.staffingRulesUpdated': 'Reglas de staffing actualizadas',
        'notify.supervisorLimit': 'Un supervisor puede supervisar máximo 5 buildings',
        'notify.taskCreated': 'Tarea creada',
        'notify.taskDeleted': 'Tarea eliminada',
        'notify.taskUpdated': 'Tarea actualizada',
        'notify.tasksUpdated': 'Tareas actualizadas',
        'notify.wastelogDev': 'Wastelog: Funcionalidad en desarrollo. URL pendiente de configuración.',

        // ---------- capacitaciones ----------
        'skill.change-cooking-oil': 'Filtrar/cambiar el aceite de cocina',
        'skill.change-flavors': 'Cambiar Sabores',
        'skill.clean-beverage-machine': 'Limpieza Máquina Bebidas',
        'skill.clean-cooking-equipment': 'Limpiar equipos de cocina',
        'skill.clean-freezer': 'Limpieza de Freezer',
        'skill.clean-fryer': 'Limpiar Fryer',
        'skill.clean-fryers': 'Limpieza de freidoras',
        'skill.clean-griddle': 'Limpiar Griddle',
        'skill.clean-grill': 'Limpiar Grill',
        'skill.clean-ice-cream-machine': 'Limpiar la máquina de helado',
        'skill.clean-oven': 'Limpiar Horno',
        'skill.clean-prep-area': 'Limpiar Área de Preparación',
        'skill.clean-slush-machines': 'Limpiar Máquinas',
        'skill.clean-work-surfaces': 'Limpiar superficies de trabajo',
        'skill.closing-cleanup': 'Limpieza al cierre de la location',
        'skill.control-flavors': 'Controlar Sabores',
        'skill.control-ice': 'Controlar Hielo/Bebidas',
        'skill.cooking-times': 'Controlar Tiempos de Cocción',
        'skill.customer-service': 'Servicio al Cliente',
        'skill.cut-pizza': 'Cortar Pizza',
        'skill.deep-cleaning': 'Limpieza Profunda',
        'skill.disassemble-ice-cream': 'Desarmar/Limpiar Componentes',
        'skill.dishwashing': 'Dishwashing',
        'skill.dough-training': 'Dough / Food Preparation',
        'skill.filter-oil': 'Filtrar/Cambiar Aceite',
        'skill.food-safety': 'Food Safety / Food Handling',
        'skill.food-warmer-training': 'Food Warmer Training',
        'skill.freezer-training': 'Freezer Handling',
        'skill.fryer-training': 'Fryer Training',
        'skill.griddle-training': 'Griddle Training',
        'skill.grill-training': 'Grill Training',
        'skill.handle-cones-cups': 'Manejar Conos y Cups',
        'skill.handle-dough': 'Manejar Dough',
        'skill.handle-freezer': 'Manejar Freezer',
        'skill.handle-ice-cream-machine': 'Manejar Máquina de Helado',
        'skill.handle-popcorn': 'Manejar Popcorn/Snack Equipment',
        'skill.handle-refills': 'Manejar Refills',
        'skill.handle-toppings': 'Manejar Toppings',
        'skill.ice-cream-training': 'Ice Cream Machine Training',
        'skill.icee-training': 'ICEE / Slush Machine',
        'skill.lemonade-training': 'Lemonade Station Training',
        'skill.maintain-food-warmer': 'Mantener Food Warmer',
        'skill.mop-floors': 'Trapear pisos',
        'skill.nh-alcohol-certification': '🍺 Certificación Alcohol NH',
        'skill.operate-fryer': 'Operar Fryer',
        'skill.operate-oven': 'Operar Horno',
        'skill.operate-slush-machines': 'Operar Máquinas de Slush',
        'skill.oven-training': 'Oven Training',
        'skill.pizza-prep-training': 'Pizza Preparation',
        'skill.pos-training': 'Cash Register / POS Training',
        'skill.prep-beverages': 'Preparar Bebidas',
        'skill.prep-burgers': 'Preparar Burgers',
        'skill.prep-cheese-curds': 'Preparar Cheese Curds',
        'skill.prep-fries': 'Preparar Fries',
        'skill.prep-grilled-cheese': 'Preparar Grilled Cheese',
        'skill.prep-icee': 'Preparar/Refill ICEE',
        'skill.prep-lemonade': 'Preparar Fresh-Squeezed Lemonade',
        'skill.prep-onion-rings': 'Preparar Onion Rings',
        'skill.prep-pizzas': 'Preparar Pizzas',
        'skill.prep-sandwiches': 'Preparar Sandwiches',
        'skill.prep-snacks': 'Preparación de Snacks',
        'skill.prep-souvenir-cups': 'Preparar Souvenir Cups',
        'skill.prep-sundaes': 'Preparar Sundaes',
        'skill.prep-tater-kegs': 'Preparar Tater Kegs',
        'skill.prep-tenders': 'Preparar Tenders',
        'skill.prep-toppings': 'Preparar Toppings',
        'skill.prep-tornado-potatoes': 'Preparar Tornado Potatoes',
        'skill.restock-supplies': 'Reponer suministros',
        'skill.restocking': 'Restocking',
        'skill.retail': 'Ventas / Retail',
        'skill.sandwich-training': 'Sandwich Prep',
        'skill.sanitize-ice-cream-area': 'Sanitizar Área de Helados',
        'skill.sanitize-nozzles': 'Sanitizar Nozzles',
        'skill.sanitize-surfaces': 'Sanitización de Superficies',
        'skill.serve-soft-serve': 'Servir Soft-Serve',
        'skill.soda-fountain-training': 'Soda Fountain Training',
        'skill.souvenirs': 'Souvenirs / Merchandising',
        'skill.sundae-training': 'Sundae Preparation',
        'skill.wash-utensils': 'Lavado de Utensilios',

        // ---------- empleados (detalle) ----------
        'emp.available': 'Disponible:',
        'emp.currentRole': 'Rol actual:',
        'emp.currentStatus': 'Estado actual:',
        'emp.dayOff': 'Day Off:',
        'emp.fieldAge': 'Edad:',
        'emp.fieldAssistant': 'Asistente:',
        'emp.fieldGroup': 'Grupo:',
        'emp.fieldHireDate': 'Fecha de Ingreso:',
        'emp.fieldName': 'Nombre:',
        'emp.fieldNationality': 'Nacionalidad:',
        'emp.fieldRole': 'Rol:',
        'emp.fieldVersatile': 'Versátil:',
        'emp.holiday': 'Festivo:',
        'emp.noCertifications': 'Sin certificaciones',
        'emp.noInfo': 'Sin información',
        'emp.noSkills': 'Sin habilidades',
        'emp.onBreak': 'En Break:',
        'emp.onTraining': 'En Training:',
        'emp.permissions': 'Permisos',
        'emp.requiredRoles': 'Roles Requeridos',
        'emp.saveRole': 'Guardar Rol',
        'emp.sectionInfo': 'Información del Empleado',
        'emp.sectionRoles': 'Roles y Habilidades',

        // ---------- supervisores ----------
        'sup.add': 'Agregar empleado:',
        'sup.assigned': 'Supervisores Asignados',
        'sup.buildings': 'Buildings a supervisar (máximo 5):',
        'sup.employeeAssignments': 'Asignaciones de Empleados',
        'sup.none': 'No hay supervisores asignados para esta fecha',
        'sup.role': 'Rol de supervisión:',
        'sup.search': 'Busca un empleado...',
        'sup.title': 'Asignar Supervisores a Buildings',

        // ---------- asignacion (detalle) ----------
        'asg.active': 'Activo',
        'asg.actual': 'Actual:',
        'asg.asset': 'Activo / Equipo',
        'asg.assignedEmployees': 'Empleados Asignados',
        'asg.assignments': 'asignaciones',
        'asg.coveredByOther': 'Cubierto por otro empleado',
        'asg.end': 'Fin:',
        'asg.inactive': 'Inactivo',
        'asg.minimum': 'Mínimo:',
        'asg.noEmployeesToday': 'No hay empleados asignados hoy.',
        'asg.noForDate': 'No hay asignaciones para esta fecha',
        'asg.noForLocation': 'No hay asignaciones registradas para esta locación',
        'asg.requiredRoles': 'Requisitos:',
        'asg.scheduleLabel': 'Horario de trabajo:',
        'asg.servesAlcohol': 'Sirve alcohol:',
        'asg.start': 'Inicio:',

        // ---------- locaciones (detalle) ----------
        'loc.autoReactivation': 'Fecha de reactivación automática (opcional)',
        'loc.closeReason': 'Motivo de cierre',
        'loc.closeTitle': 'Locaciones Cerradas',
        'loc.closedByLabel': 'Responsable del cierre',
        'loc.deactivate': 'Desactivar',
        'loc.disableDate': 'Fecha de deshabilitación',
        'loc.noClosed': 'No hay locaciones cerradas para esta fecha',
        'loc.reopenByLabel': 'Responsable de la reapertura',
        'loc.reopenReason': 'Motivo de reapertura',
        'loc.reopenedBy': 'Reabierto por',

        // ---------- filtros ----------
        'filter.allCategories': 'Todas las Categorías',
        'filter.allLocations': 'Todas las Locaciones',
        'filter.allPriorities': 'Todas las Prioridades',
        'filter.allStatuses': 'Todos los Estados',
        'filter.chooseLocation': 'Seleccionar locación...',
        'filter.select': 'Seleccionar...',

        // ---------- confirmaciones ----------
        'confirm.deleteEmployee': '¿Eliminar este empleado?',
        'confirm.deleteTask': '¿Eliminar esta tarea?',
        'confirm.disableRule': '¿Desactivar esta regla de staffing?',
        'confirm.permissionOp': 'Permission denied: need OP or higher',

        // ---------- importador de excel ----------
        'imp.analyzeBtn': 'Analizar',
        'imp.analyzing': 'Analizando el archivo...',
        'imp.applyMapping': 'Aplicar mapeo y ver vista previa',
        'imp.applyDate': 'Aplicar fecha y ver vista previa',
        'imp.scheduleDateTitle': 'Fecha del horario',
        'imp.scheduleDateLabel': '¿Para qué fecha corresponde este horario?',
        'imp.scheduleDateHint': 'El archivo de horario no incluye la fecha. La fecha que elijas se aplicará a todas las asignaciones de este archivo.',
        'imp.scheduleDateRequired': 'Selecciona la fecha del horario para continuar.',
        'imp.scheduleDateApplied': 'La fecha {{date}} se aplicará a todas las asignaciones.',
        'imp.typeQuinyxSchedule': 'Horario Quinyx / Story Land',
        'imp.quinyxHint': 'Se reconoce el formato de horario real: dos bloques, locaciones por sección, varios empleados y varios rangos por fila.',
        'imp.recordsFound': 'Asignaciones',
        'imp.locationsFound': 'Locaciones',
        'imp.sectionsFound': 'Secciones',
        'imp.needsReviewRows': 'Para revisar',
        'imp.sectionsTitle': 'Secciones de ubicación detectadas',
        'imp.unknownLocationsTitle': 'Ubicaciones no reconocidas',
        'imp.unknownLocationsHint': 'Estas ubicaciones del archivo no existen en StoryManager. No se crearán: podrás elegir una ubicación existente en la vista previa.',
        'imp.stepDate': 'Fecha',
        'imp.colRole': 'Rol',
        'imp.shift.Day': 'Día',
        'imp.shift.Night': 'Noche',
        'imp.issueMissingTime': 'La fila no tiene horario',
        'imp.issueBadTime': 'El horario no se pudo interpretar',
        'imp.issueUntil': '"hasta" sin turno anterior',
        'imp.issueMergedRanges': 'Varios horarios para un solo empleado: revisa la duración',
        'imp.issueRangeMismatch': 'Más empleados que horarios en la misma fila',
        'imp.issueChanged': 'El turno de ese empleado cambió en esta fecha',
        'imp.statusChanged': 'Cambiado',
        'imp.statusSkipped': 'No se importa',
        'imp.issueSectionHidden': 'Sección retirada de la interfaz. No se importa, pero el histórico se conserva.',
        'imp.existingLabel': 'Actual:',
        'imp.importedLabel': 'Importado:',
        'imp.actionKeep': 'Mantener el actual',
        'imp.actionUpdate': 'Actualizar',
        'imp.actionSkip': 'Omitir',
        'imp.browse': 'Seleccionar archivo',
        'imp.button': 'Importar Excel',
        'imp.colAction': 'Acción',
        'imp.colClockIn': 'Entrada',
        'imp.colClockOut': 'Salida',
        'imp.colDate': 'Fecha',
        'imp.colEmployee': 'Empleado',
        'imp.colEnd': 'Fin',
        'imp.colHours': 'Horas',
        'imp.colLocation': 'Locación',
        'imp.colStart': 'Inicio',
        'imp.colStatus': 'Estado',
        'imp.commitBtn': 'Confirmar importación',
        'imp.completed': 'Importación completada',
        'imp.confirmNote': 'Solo se guardarán los registros válidos. Los que estén en revisión o con conflictos se omitirán.',
        'imp.confirmTitle': '¿Confirmas la importación?',
        'imp.conflictCount': 'Conflictos',
        'imp.dateAmbiguous': 'Formato de fecha ambiguo (se asumió mes/día). Verifica esta fecha.',
        'imp.detectedHint': 'Se detectaron las columnas automáticamente. Revisa el mapeo antes de continuar.',
        'imp.detectedType': 'Tipo detectado',
        'imp.dupShort': 'Dup.',
        'imp.duplicateCount': 'Duplicados',
        'imp.emptyHeader': '(sin título)',
        'imp.errBadFile': 'El archivo debe ser .xlsx o .xls',
        'imp.errCommit': 'Error al guardar la importación',
        'imp.errParse': 'No se pudo leer el archivo',
        'imp.errValidate': 'Error al validar los registros',
        'imp.errorsTitle': 'Errores',
        'imp.excelColumn': 'Columna del Excel',
        'imp.excludeRow': 'Excluir esta fila de la importación',
        'imp.f.badge': 'Badge',
        'imp.f.break': 'Break (min)',
        'imp.f.date': 'Fecha',
        'imp.f.department': 'Departamento',
        'imp.f.employee': 'Empleado',
        'imp.f.employee_id': 'ID de Empleado',
        'imp.f.end_time': 'Hora de finalización',
        'imp.f.first_name': 'Nombre',
        'imp.f.hours': 'Horas trabajadas',
        'imp.f.last_name': 'Apellido',
        'imp.f.location': 'Locación',
        'imp.f.overtime': 'Horas extra',
        'imp.f.regular_hours': 'Horas regulares',
        'imp.f.start_time': 'Hora de inicio',
        'imp.historyTitle': 'Importaciones anteriores',
        'imp.importedCount': 'Importados',
        'imp.issueClosed': 'La locación está cerrada en esa fecha',
        'imp.issueConflict': 'Conflicto de horario con otra asignación',
        'imp.issueDate': 'Fecha inválida',
        'imp.issueDuplicate': 'Registro ya importado anteriormente',
        'imp.issueEmployee': 'Empleado no encontrado',
        'imp.issueEnd': 'Hora de finalización inválida',
        'imp.issueEndBefore': 'La hora de fin no es posterior a la de inicio',
        'imp.issueLocation': 'Locación no reconocida',
        'imp.issueOther': 'Revisar este registro',
        'imp.issueStart': 'Hora de inicio inválida',
        'imp.issuesTitle': 'Problemas detectados',
        'imp.mappingSummary': 'Resumen del mapeo',
        'imp.mappingTitle': 'Mapeo de columnas',
        'imp.noIssues': 'No se detectaron problemas en estos registros.',
        'imp.notUsed': '— No usar —',
        'imp.noteNothingSaved': 'No se guarda absolutamente nada hasta que confirmes la importación.',
        'imp.ok': 'Correcto',
        'imp.readyCount': 'Listos',
        'imp.records': 'registros',
        'imp.rejectedCount': 'Rechazados',
        'imp.rejectedShort': 'Rech.',
        'imp.reviewCount': 'Requieren revisión',
        'imp.sample': 'Ejemplo',
        'imp.schedule': 'Horario',
        'imp.selectEmployeeShort': 'Elegir empleado...',
        'imp.selectFile': 'Selecciona un archivo de Excel',
        'imp.selectFileHint': 'Formatos aceptados: .xlsx y .xls. Se analizará antes de guardar nada.',
        'imp.selectLocationShort': 'Elegir locación...',
        'imp.sheetLabel': 'Hoja',
        'imp.statusConflict': 'Conflicto',
        'imp.statusDuplicate': 'Ya importado',
        'imp.statusReady': 'Listo',
        'imp.statusReview': 'Requiere revisión',
        'imp.stepAnalyze': 'Análisis',
        'imp.stepConfirm': 'Confirmar',
        'imp.stepFile': 'Archivo',
        'imp.stepMapping': 'Mapeo',
        'imp.stepPreview': 'Vista previa',
        'imp.stepResult': 'Resultado',
        'imp.stepType': 'Tipo',
        'imp.stepValidate': 'Validación',
        'imp.storyField': 'Campo de StoryManager',
        'imp.targetFoods': 'Comida (Foods)',
        'imp.targetLabel': 'Importar en',
        'imp.targetRetail': 'Tiendas (Retail)',
        'imp.timesheet': 'Horas',
        'imp.title': 'Importar Excel',
        'imp.totalRecords': 'Registros encontrados',
        'imp.typeSchedule': 'Horario / Schedule',
        'imp.typeTimesheet': 'Reporte de horas / Timesheet',
        'imp.typeUnknown': 'Formato no reconocido',
        'imp.unknown': 'Desconocido',
        'imp.unknownHint': 'No se reconoció el formato. Indica a mano cómo mapear las columnas; se tratará como un horario.',
        'imp.updatedCount': 'Actualizados',
        'imp.validateBtn': 'Validar registros',
        'imp.validationNote': 'Se aplican las mismas reglas de StoryManager: locación activa en la fecha, inicio antes que fin y sin solapamiento de horarios. Dos turnos que se tocan (10:00-14:00 y 14:00-18:00) son válidos.',

        // ---------- secciones del horario (OPS / Extra Hours / Support / Extra Tasks / Notas) ----------
        'sched.sectionOps': 'OPS',
        'sched.sectionExtraHours': 'Horas Extra',
        'sched.sectionSupport': 'Soporte',
        'sched.sectionExtraTasks': 'Tareas Extra',
        'sched.sectionNostalgiaNight': 'Nostalgia Night',
        'sched.overnightHint': 'Turno de noche: si la hora de fin es menor que la de inicio, el turno termina al día siguiente.',
        // Asignación automática inteligente. Ver auto-assign-module.js.
        'autoAssign.titulo': 'Propuesta de asignación automática',
        'autoAssign.calculando': 'Calculando...',
        'autoAssign.guardando': 'Guardando...',
        'autoAssign.error': 'No se pudo calcular la propuesta',
        'autoAssign.errorGuardar': 'No se pudo guardar',
        'autoAssign.sinFecha': 'Selecciona un día antes de asignar.',
        'autoAssign.puestosCubiertos': 'puestos cubiertos',
        'autoAssign.compromisosRespetados': 'compromisos respetados',
        'autoAssign.puestosSinCubrir': 'puestos sin cubrir',
        'autoAssign.todoCubierto': 'Todos los mínimos quedan cubiertos',
        'autoAssign.falta': 'No se han podido cubrir todos los mínimos',
        'autoAssign.cobertura': 'Cobertura por localización',
        'autoAssign.colLocalizacion': 'Localización',
        'autoAssign.colMinimo': 'Mínimo',
        'autoAssign.colEstado': 'Estado',
        'autoAssign.colFalta': 'Qué falta',
        'autoAssign.colEmpleado': 'Empleado',
        'autoAssign.colPuesto': 'Puesto',
        'autoAssign.colHorario': 'Horario',
        'autoAssign.colMotivo': 'Motivo',
        'autoAssign.colPorQue': 'Por qué no se pudo cubrir',
        'autoAssign.cumpleMinimo': 'Cumple',
        'autoAssign.faltaMinimo': 'Por debajo',
        'autoAssign.cerrada': 'Cerrada',
        'autoAssign.propuestas': 'Se propone asignar ({{n}})',
        'autoAssign.sinCubrir': 'Puestos que quedan sin cubrir ({{n}})',
        'autoAssign.descartados': 'Personas descartadas y por qué ({{n}})',
        'autoAssign.avisosTitulo': 'Lo que el sistema no sabe',
        'autoAssign.duplicados': 'Se han detectado {{n}} actividades reflejadas en más de una sección. Se cuentan una sola vez: es el mismo compromiso.',
        'autoAssign.noToca': 'No se modifica nada de lo que ya está asignado. Si algo no cuadra, se explica en vez de forzar la asignación.',
        'autoAssign.guardar': 'Guardar ({{n}} asignaciones)',
        'autoAssign.rechazada': 'No se ha guardado la asignación de {{n}} a {{l}}: {{m}}',
        // Exportación del horario a Excel. El archivo usa el mismo formato que el
        // importador, así que se puede volver a subir sin convertir nada.
        'sched.exportSchedule': 'Exportar Horario',
        'sched.exportScheduleHint': 'Descarga el horario del día seleccionado en un Excel que se puede volver a importar.',
        'sched.exporting': 'Generando Excel...',
        'sched.exportStarted': 'Descarga iniciada. Si no empieza, revisa las descargas del navegador.',
        'sched.exportEmpty': 'Ese día no tiene turnos asignados: el archivo sale solo con las hojas y los encabezados.',
        'sched.exportEmptyConfirm': 'Ese día no tiene turnos asignados. ¿Descargar el archivo igualmente?',
        'sched.exportErrors': 'No se pudo exportar el horario',
        'sched.exportBadDate': 'Selecciona un día válido antes de exportar.',
        'sched.exportSupervisionMissing': 'Supervisión sin localización conocida',
        'sched.exportNoArea': 'No se pudo determinar a qué área OPS pertenece cada localización, porque el campo «Grupo OPS» está vacío. La exportación usa nombres neutros en lugar de inventar un área.',
        'sched.exportGood': 'Turnos exportados',
        'sched.sectionNotes': 'Notas',
        'sched.sectionTag': 'Sección',
        'sched.notAssigned': 'Sin asignar',
        'sched.unknownEmployee': 'Desconocido',
        'sched.assignTo': 'Asignar a',
        'sched.assignedTo': 'Asignados',
        'sched.addEmployee': 'Agregar empleado',
        'sched.searchEmployee': 'Buscar empleado por nombre...',
        'sched.workSchedule': 'Horario de trabajo',
        'sched.roleOptional': 'Rol (opcional)',
        'sched.rolePlaceholder': 'Server, Cook, Hostess, AM Help...',
        'sched.notesOptional': 'Notas (opcional)',
        'sched.notesPlaceholder': 'Nota sobre este turno...',
        'sched.assign': 'Asignar',
        'sched.noEmployeesFound': 'No se encontraron empleados.',
        'sched.conflictPrefix': 'Conflicto de horario',
        'sched.noTwoPlaces': 'No puede estar en dos lugares al mismo tiempo.',
        'sched.assignedOk': 'Asignación guardada',
        'sched.assignError': 'No se pudo guardar la asignación',
        'sched.removed': 'Asignación eliminada',
        'sched.removeError': 'No se pudo eliminar la asignación',
        'sched.noNotes': 'Sin notas para esta fecha',
        'sched.addNote': 'Añadir nota',
        'sched.notePlaceholder': 'Escribe una nota para este día...',
        'sched.noteAdded': 'Nota guardada',
        'sched.noteError': 'No se pudo guardar la nota',
        'employees.opsGroupLabel': 'Grupo OPS / Supervisor',
        'employees.opsGroupNone': 'Not OPS',
        'employees.trainedLocationsLabel': 'Trained at',
        'employees.trainedLocationsNone': 'Not recorded',
        'employees.extraGroupsLabel': 'Additional groups',
        'employees.extraGroupsHint': 'Checked by hand and stored apart from the main group.',
        'employees.groupDRoleError': 'Group D (Bistro) only accepts Bartender, Cashier or Cook roles.',
        'employees.adminOnlyNote': 'Administrative role: only Dunkin Certified, Food Safety/Food Handling, Cash Register/POS Training and NH Alcohol Certification are enabled. No operational, cleaning or safety skills.',
        'nav.reports': 'Reports',
        'reports.title': 'Training Reports',
        'reports.search': 'Search employee...',
        'reports.allGroups': 'All groups',
        'reports.noGroup': 'No group',
        'reports.employee': 'Employee',
        'reports.group': 'Group',
        'reports.trainedIn': 'Trained at',
        'reports.certifications': 'Certifications',
        'reports.derivedFromLocations': 'Derived from their locations',
        'reports.notRegistered': 'Not recorded',
        'reports.noResults': 'No employee matches.',
        'reports.error': 'Could not load the report.',
        'reports.export': 'Export CSV',
    },

    en: {
        'insp.whoChanged': "Changed by",
        'insp.changeComment': "Comment",
        'insp.previousStatus': "Previous",
        'insp.inspectionId': "Inspection ID",
        'insp.autoGenerated': "Generated on save",
        'insp.inspectionDate': "Inspection date",
        'insp.inspectionTime': "Inspection time",
        'insp.inspector': "Inspector",
        'insp.inspectorHint': "Type the name of whoever performed the inspection. They do not need to be registered as an employee.",
        'insp.inspectorRegistered': "Inspector {{nombre}} registered with their own ID.",
        'insp.inspectorUses': "{{n}} inspection(s)",
        'insp.inspectorNeverUsed': "no inspections yet",
        'insp.inspectorIdShort': "inspector ID",
        'insp.inspectorNone': "no inspector recorded",
        'insp.searchInspector': "Type the inspector name…",
        'insp.inspectionType': "Inspection type",
        'insp.searchType': "Search type…",
        'insp.newType': "New type",
        'insp.newTypePrompt': "Name of the new inspection type:",
        'insp.typeInvalid': "That name cannot be used as a type key.",
        'insp.typeCreated': "Inspection type created.",
        'insp.location': "Location",
        'insp.searchLocation': "Search location…",
        'insp.generalNotes': "General notes",
        'insp.saveInspection': "Save inspection",
        'insp.editInspection': "Edit inspection",
        'insp.saveChanges': "Save changes",
        'insp.inspectionUpdated': "Inspection updated.",
        'insp.dateRequired': "Enter the inspection date.",
        'insp.typeRequired': "Choose the inspection type.",
        'insp.locationRequired': "Choose the inspected location.",
        'insp.inspectorRequired': "Type the name of whoever performed the inspection.",
        'insp.findingId': "Finding ID",
        'insp.relatedInspection': "Related inspection",
        'insp.searchInspection': "Search inspection…",
        'insp.findingTitle': "Finding title",
        'insp.description': "Description",
        'insp.category': "Category",
        'insp.searchCategory': "Search or type a category…",
        'insp.categoryHint': "Categories depend on the inspection type. You can type your own.",
        'insp.priority': "Priority",
        'insp.status': "Status",
        'insp.recommendedAction': "Recommended action",
        'insp.assignedTo': "Assigned to",
        'insp.searchAssignee': "Search person…",
        'insp.dueDate': "Due date",
        'insp.saveFinding': "Save finding",
        'insp.editFinding': "Edit finding",
        'insp.findingUpdated': "Finding updated.",
        'insp.editingFinding': "You are editing an existing finding. The ID and the inspection stay the same.",
        'insp.inspectionRequired': "Choose the inspection this finding belongs to.",
        'insp.titleRequired': "Enter the finding title.",
        'insp.categoryRequired': "Choose or type a category.",
        'insp.noInspections': "Create an inspection first.",
        'insp.noFindings': "Create a finding first.",
        'insp.findingNotFound': "That finding is no longer in the view.",
        'insp.findingDetail': "Finding detail",
        'insp.confirmDeleteFinding': "Remove this finding from the view? Its history and corrections are kept. Nothing is erased.",
        'insp.findingRemoved': "Finding removed from the view. The record is kept.",
        'insp.errorDeleteFinding': "The finding could not be removed.",
        'insp.relatedFinding': "Related finding",
        'insp.searchFinding': "Search finding…",
        'insp.correctiveAction': "Corrective action",
        'insp.date': "Date",
        'insp.completionNotes': "Completion notes",
        'insp.saveCorrection': "Save correction",
        'insp.editCorrection': "Edit correction",
        'insp.correctionUpdated': "Correction updated.",
        'insp.editingCorrection': "You are editing an existing correction.",
        'insp.findingRequired': "Choose the finding being corrected.",
        'insp.actionRequired': "Describe the corrective action.",
        'insp.correctionNotFound': "That correction is no longer in the view.",
        'insp.correctionDetail': "Correction detail",
        'insp.confirmDeleteCorrection': "Remove this correction from the view? The record is kept.",
        'insp.correctionRemoved': "Correction removed from the view. The record is kept.",
        'insp.errorDeleteCorrection': "The correction could not be removed.",
        'insp.inspected': "Inspected",
        'insp.neverInspected': "Never inspected",
        'insp.inspectionsCount': "inspections",
        'insp.findingsCount': "findings",
        'insp.openShort': "open",
        'insp.noLocations': "No locations to show.",
        'insp.noHistory': "No recorded changes.",
        'insp.auditHistory': "Audit history",
        'insp.exportPdf': "Export history to PDF",
        'insp.generatingPdf': "Generating…",
        'insp.pdfStarted': "The PDF download has started.",
        'insp.pdfScope': "The PDF will include:",
        'insp.pdfScopeAll': "The PDF will include the WHOLE audit history, with no filters.",
        'insp.from': "From",
        'insp.to': "To",
        'insp.since': "Since",
        'insp.until': "Until",
        'insp.viewDetail': "View detail",
        'insp.edit': "Edit",
        'insp.delete': "Delete",
        'insp.inspectionDetail': "Inspection detail",
        'insp.inspectionNotFound': "That inspection does not exist.",
        'insp.correctionShort': "correction(s)",

        // ---------- comun ----------
        'common.actions': 'Actions',
        'common.add': 'Add',
        'common.all': 'All',
        'common.apply': 'Apply',
        'common.assignedTo': 'Assigned To',
        'common.back': 'Back',
        'common.cancel': 'Cancel',
        'common.category': 'Category',
        'common.chooseLocation': 'Choose location...',
        'common.close': 'Close',
        'common.closedBy': 'Closed By',
        'common.comingSoon': 'Coming soon',
        'common.confirm': 'Confirm',
        'common.date': 'Date',
        'common.delete': 'Delete',
        'common.description': 'Description',
        'common.deselectAll': 'Deselect All',
        'common.dueDate': 'Due Date',
        'common.edit': 'Edit',
        'common.employee': 'Employee',
        'common.employees': 'Employees',
        'common.group': 'Group',
        'common.loading': 'Loading...',
        'common.loadingShort': 'Loading',
        'common.location': 'Location',
        'common.locations': 'Locations',
        'common.na': 'N/A',
        'common.name': 'Name',
        'common.new': 'New',
        'common.next': 'Next',
        'common.noRecords': 'No records match the filters.',
        'common.none': 'None',
        'common.notes': 'Notes',
        'common.previous': 'Previous',
        'common.priority': 'Priority',
        'common.reason': 'Reason',
        'common.requiredField': 'This field is required',
        'common.reset': 'Reset',
        'common.role': 'Role',
        'common.save': 'Save',
        'common.search': 'Search',
        'common.searchUser': 'Search by user...',
        'common.select': 'Select',
        'common.selectAll': 'Select All',
        'common.selectDay': 'Select Day:',
        'common.selectEllipsis': 'Select...',
        'common.selectEmployee': 'Select employee',
        'common.selectLocation': 'Select Location',
        'common.status': 'Status',
        'common.submit': 'Submit',
        'common.task': 'Task',
        'common.time': 'Time',
        'common.title': 'Title',
        'common.today': 'Today',
        'common.tomorrow': 'Tomorrow',
        'common.view': 'View',
        'common.yesterday': 'Yesterday',

        // ---------- navegacion ----------
        'nav.admin': 'Admin',
        'nav.panel': 'Tools',
        'panel.title': 'Operations panel',
        'panel.subtitle': 'Employees, schedules, tasks and inspections for the park',
        'panel.schedule': 'Schedule',
        'panel.employees': 'Employees',
        'panel.locations': 'Locations',
        'panel.tasks': 'Tasks',
        'panel.queries': 'Smart Queries',
        'panel.inspections': 'Inspections & Corrections',
        'panel.reports': 'Reports',
        'nav.changeTheme': 'Change theme',
        'nav.foods': 'Foods',
        'nav.home': 'Home',
        'nav.inspections': 'Inspections',
        'nav.language': 'Language',
        'nav.management': 'Management',
        'nav.retail': 'Retail',
        'nav.tasks': 'Tasks',
        'nav.toggleMenu': 'Toggle navigation menu',
        'nav.wastelog': 'Wastelog',

        // ---------- portada ----------
        'hero.demo': 'Go to Demo',
        'hero.statEmployees': 'Employees',
        'hero.statInspections': 'Inspections',
        'hero.statLocations': 'Locations',
        'hero.statReports': 'Reports',
        'hero.statTasks': 'Active Tasks',
        'hero.statWastelog': 'Wastelog',
        'hero.subtitle': 'Efficiently manage staff across all food and retail locations throughout the park.',
        'hero.titleA': 'Staff Management for',
        'hero.viewLocations': 'View Locations',

        // ---------- locaciones ----------
        'locations.active': 'Active',
        'locations.alcohol': 'Alcohol',
        'locations.allLocations': 'All locations',
        'locations.closedToday': 'Closed today',
        'locations.disabledToday': 'CLOSED FOR TODAY',
        'locations.employeesAssignedToday': 'Employees assigned today',
        'locations.food': 'Food',
        'locations.lastInspection': 'Last inspection',
        'locations.minimumStaff': 'Minimum Staff',
        'locations.nextSlide': 'Next location',
        'locations.noInspections': 'No inspections',
        'locations.prevSlide': 'Previous location',
        'locations.sectionSubtitle': 'StoryLand offers multiple dining and souvenir shopping options throughout the park',
        'locations.sectionTitle': 'Food & Retail Locations',
        'locations.selectLocationEllipsis': 'Select location...',
        'locations.status': 'Status',
        'locations.store': 'Store',
        'locations.typeCategory': '{{type}} • {{category}}',
        'locations.viewRecords': 'View records',

        // ---------- panel de gestion ----------
        'management.allCategories': 'All Categories',
        'management.allDepartments': 'All departments',
        'management.allGroups': 'All Groups',
        'management.allRoles': 'All roles',
        'management.allStatuses': 'All statuses',
        'management.clearData': 'Clear Data',
        'management.exportExcel': 'Export to Excel',
        'management.quickFood': 'Coffee',
        'management.quickStore': 'Store',
        'management.search': 'Search',
        'management.smartQueries': 'Smart Queries',
        'queries.trainedTab': 'By Trained Location',
        'queries.trainedHint': 'Shows who has that location in their "Trained locations" section, wherever they are working now.',
        'queries.trainedPlaceholder': 'Type a location: Pixie, Food Fair, Farmstand…',
        'queries.trainedFor': 'People trained at {{loc}}',
        'queries.trainedSource': 'From each profile\'s "Trained locations" section.',
        'queries.trainedSince': 'Trained since',
        'queries.totalFound': '{{n}} person/people found',
        'queries.noneTrained': 'No employee is registered as trained at {{loc}}.',
        'queries.noneTrainedHint': 'That location has no training registered on any profile yet. People from elsewhere and from the shift history are not shown: only what is on the record.',
        'queries.noneMatchFilters': 'Nobody trained at {{loc}} matches the filter.',
        'queries.noneMatchFiltersHint': 'There are people registered as trained at this location, but none match the role, group or certification filter. Clear it to see them all.',
        'queries.noLocationMatch': 'No location looks like "{{q}}".',
        'queries.didYouMean': 'Locations that do exist:',
        'queries.whyNoData': 'Locations with nobody registered',
        'queries.whyNoDataHint': 'These locations have no training registered on any profile. That does not mean nobody can work there, only that nobody has written it down yet.',
        'queries.multiMatch': 'The search matches several locations; all of them are shown.',
        'queries.filters': 'Filters',
        'queries.filterRole': 'Role',
        'queries.filterGroup': 'Group',
        'queries.filterCert': 'Certification',
        'queries.filterDept': 'Department',
        'queries.anyRole': 'Any role',
        'queries.anyGroup': 'Any group',
        'queries.anyCert': 'Any certification',
        'queries.applyFilters': 'Apply',
        'queries.clearFilters': 'Clear filters',
        'queries.colName': 'Name',
        'queries.colRole': 'Role',
        'queries.colGroup': 'Group',
        'queries.colDept': 'Department',
        'queries.colStatus': 'Status',
        'queries.colSince': 'Trained since',
        'queries.colCerts': 'Certifications',
        'queries.noCerts': 'No certifications',
        'queries.certCount': '{{n}} certification(s)',
        'queries.moreCerts': 'and {{n}} more',
        'queries.searchByName': 'Filter by name…',
        'queries.departmentFoods': 'Foods',
        'queries.departmentRetail': 'Retail',
        'queries.departmentNote': 'Current split: {{foods}} in Foods, {{retail}} in Retail.',
        'queries.certMeaning': 'Being trained at a location is not the same as being able to take a post: a certification the post requires may still be missing.',
        'management.smartQueriesHint': 'Search by skill, area, or name...',
        'management.specificDate': 'Specific date',
        'management.subtitle': 'Manage employees, assign staff to locations, and manage tasks',
        'management.title': 'Management Panel',

        // ---------- empleados ----------
        'employees.assignedToday': 'Assigned today',
        'employees.base': 'Base',
        'employees.breadcrumbAll': 'Employee Management / All Employees',
        'employees.confirmDelete': 'Are you sure you want to delete this employee?',
        'employees.count': '{{count}} employees',
        'employees.detailTitle': 'Employee Details',
        'employees.editTitle': 'Edit Employee',
        'employees.fieldAge': 'Age',
        'employees.fieldGroup': 'Group',
        'employees.fieldHireDate': 'Hire Date',
        'employees.fieldName': 'Name',
        'employees.fieldNationality': 'Nationality',
        'employees.fieldRole': 'Role',
        'employees.fieldTrainings': 'Skills / Training',
        'employees.filterDepartment': 'All departments',
        'employees.filterRole': 'All roles',
        'employees.filterStatus': 'All statuses',
        'employees.new': 'New Employee',
        'employees.noAssignment': 'Unassigned',
        'employees.noEmployees': 'No employees. Click "New Employee".',
        'employees.refresh': 'Refresh',
        'employees.searchPlaceholder': 'Search employees...',
        'employees.sectionAll': 'All Employees',
        'employees.sectionAvailability': 'Availability',
        'employees.sectionCertifications': 'Certifications',
        'employees.sectionHistory': 'History',
        'employees.sectionRetail': 'Retail',
        'employees.sectionService': 'Service & Sales',
        'employees.sectionSkills': 'Skills',
        'employees.selectAllTrainings': 'Select All',
        'employees.sidebarTitle': 'Employee Management',
        'employees.thActions': 'Actions',
        'employees.noGroup': 'No group',
        'employees.noSkills': 'No skills',
        'employees.versatile': 'Versatile',
        'employees.base': 'Basic',
        'common.view': 'View details',
        'common.edit': 'Edit',
        'common.status': 'Change status',
        'common.delete': 'Delete',
        'notify.employeeNotFound': 'That employee no longer exists. Refresh the list.',
        'employees.thEmployee': 'Employee',
        'employees.thGroup': 'Group',
        'employees.thRole': 'Role',
        'employees.thSkills': 'Skills',
        'employees.thStatus': 'Status',
        'employees.thVersatile': 'Versatile',
        'employees.trainingsCleaning': 'Cleaning & Safety (Food & Beverage)',
        'employees.trainingsFnb': '🍔 Food & Beverage Training',
        'employees.trainingsOps': '🛠️ Operational Skills',
        'employees.trainingsService': 'Service & Sales',
        'employees.versatile': 'Versatile',

        // ---------- roles ----------
        'role.assistant-supervisor': 'Assistant Supervisor',
        'role.bartender': 'Bartender',
        'role.cashier': 'Cashier',
        'role.cook': 'Cook',
        'role.dishwasher': 'Dishwasher',
        'role.op': 'OP',
        'role.server': 'Server',
        'role.supervisor': 'Supervisor',

        // ---------- grupos ----------
        'group.A': 'Group A - Front of park (Pixie Kitchen, Food Fair, Oasis, Slush Factory)',
        'group.B': 'Group B - Middle of park (Guard House, Dutch Village, Poblano Cantina, World Pavilion, Teddy\\\'s Oasis)',
        'group.C': 'Group C - Back of park (Barnyard Pizza, Dippin\\\' Dots, Farm Stand)',

        // ---------- asignaciones ----------
        'assignments.assign': 'Assign',
        'assignments.assignSupervisor': 'Assign Supervisor',
        'assignments.assignSupervisors': 'Assign Supervisors',
        'assignments.auto': 'Auto Assign',
        'assignments.break': 'Break',
        'assignments.byEmployee': 'By Employee',
        'assignments.byLocation': 'By Location',
        'assignments.clearAll': 'Clear All Assignments',
        'assignments.clearDay': 'Clear Day Assignments',
        'assignments.confirmClearDay': 'Are you sure you want to clear all assignments for this day?',
        'assignments.descriptionLabel': 'Description',
        'assignments.end': 'End Time',
        'assignments.errorRules': 'Error loading staffing rules',
        'assignments.noAssignments': 'No assignments. Use "Auto Assign" or assign manually.',
        'assignments.noRules': 'No staffing rules configured',
        'assignments.notAssignedDate': 'Not assigned for this date.',
        'assignments.optimizedMsg': 'Assignment optimized: {{assigned}}/{{total}} locations',
        'assignments.parkLocations': 'Park Locations (Operational Assignment)',
        'assignments.remove': 'Remove',
        'assignments.requiredRoles': 'Required roles: {{roles}}',
        'assignments.results': 'Assignment Results',
        'assignments.rule': 'An employee cannot be assigned operationally to multiple locations at the same time in the same schedule.',
        'assignments.schedule': 'Schedule',
        'assignments.score': '{{assigned}}/{{total}} locations',
        'assignments.searchEmployee': 'Search employee by name...',
        'assignments.selectSupervisor': 'Select Supervisor:',
        'assignments.selected': 'Selected',
        'assignments.start': 'Start Time',
        'assignments.title': 'Location Assignment',
        'assignments.titleLabel': 'Title',
        'assignments.unassigned': 'Unassigned',

        // ---------- historial ----------
        'history.assignedLocation': 'Assigned Location',
        'history.byEmployee': 'Assignment history by employee',
        'history.employee': 'Employee',
        'history.print': 'Print',
        'history.printFirst': 'Load a history first in order to print',
        'history.scheduleRange': 'Schedule',
        'history.selectHint': 'Select a date to view assignment history',
        'history.title': 'Assignment History',
        'history.view': 'View History',

        // ---------- consultas ----------
        'queries.noEmployeesDate': 'No employees assigned on the selected date.',
        'queries.noResults': 'No results found.',
        'queries.resultsByEmployee': 'Results by employee:',
        'queries.resultsByRole': 'Results by role:',
        'queries.searchPlaceholder': 'Search by skill, area, or name...',
        'queries.typeHint': 'Type a location, name, or role.',

        // ---------- tareas ----------
        'tasks.catEquipment': '⚙️ Equipment',
        'tasks.catSafety': '⚠️ Safety',
        'tasks.catSupplies': '📦 Supplies',
        'tasks.editTitle': 'Edit Task',
        'tasks.fieldAssignTo': 'Assign To',
        'tasks.fieldCategory': 'Category',
        'tasks.fieldDescription': 'Description',
        'tasks.fieldDueDate': 'Due Date',
        'tasks.fieldPriority': 'Priority',
        'tasks.fieldStatus': 'Status',
        'tasks.fieldTitle': 'Title',
        'tasks.new': 'New Task',
        'tasks.noTasks': 'No tasks.',
        'tasks.priority.high': 'High',
        'tasks.priority.low': 'Low',
        'tasks.priority.medium': 'Medium',
        'tasks.priority.urgent': 'Urgent',
        'tasks.saved': 'Task saved',
        'tasks.status.completed': 'Completed',
        'tasks.status.in-progress': 'In Progress',
        'tasks.status.pending': 'Pending',
        'tasks.title': 'Task Management',

        // ---------- categorias ----------
        'category.cleaning': '🧹 Cleaning',
        'category.customer-service': '👥 Customer Service',
        'category.maintenance': '🔧 Maintenance',
        'category.other': '📋 Other',
        'category.training': '📚 Training',

        // ---------- breaks ----------
        'breaks.config': 'Break Configuration',
        'breaks.coveredBy': 'Covered by',
        'breaks.coveringEmployee': 'Employee Covering Break',
        'breaks.endTime': 'End Time',
        'breaks.noBreak': 'No break',
        'breaks.noResults': 'No employees found.',
        'breaks.schedule': 'Break Schedule',
        'breaks.searchEmployee': 'Search employee...',
        'breaks.selfBreak': 'Self Break',
        'breaks.startTime': 'Start Time',
        'breaks.type': 'Break Type',

        // ---------- estados ----------
        'status.available': 'Available',
        'status.break': 'On Break',
        'status.dayoff': 'Day Off',
        'status.holiday': 'Holiday',
        'status.training': 'On Training',

        // ---------- administracion ----------
        'admin.active': 'Active',
        'admin.closureLog': 'Closed Locations Log',
        'admin.confirmDisable': 'Are you sure you want to disable {{name}}?',
        'admin.confirmEnable': 'Are you sure you want to enable {{name}}?',
        'admin.date': 'Date:',
        'admin.disable': 'Disable',
        'admin.disabled': 'Disabled',
        'admin.enable': 'Enable',
        'admin.loadError': 'Error loading the record',
        'admin.loadingRecord': 'Loading record...',
        'admin.locationsTitle': 'Location Management',
        'admin.noDisables': 'No closed location records',
        'admin.reactivation': 'Reactivation: {{date}}',
        'admin.reactivationDate': 'Reactivation Date',
        'admin.reactivationNote': 'If not specified, reactivation will be manual',
        'admin.wastelogOpened': 'Wastelog opened',

        // ---------- inspecciones ----------
        'inspections.activeInspections': 'Active Inspections',
        'inspections.addCorrection': 'Add Correction',
        'inspections.addFinding': 'Add Finding',
        'inspections.assetNote': 'Asset-specific findings can be linked using the finding\\\'s description/notes or extra metadata. Extended table fields are pending.',
        'inspections.assignedTo': 'Assigned To',
        'inspections.auditHistory': 'Audit History',
        'inspections.categoryField': 'Category',
        'inspections.completionNotes': 'Completion Notes',
        'inspections.confirmMark': 'Mark finding #{{id}} as {{status}}?',
        'inspections.dashboard': 'Inspection Dashboard',
        'inspections.dateField': 'Date',
        'inspections.descriptionField': 'Description',
        'inspections.dueDate': 'Due Date',
        'inspections.findingId': 'Finding ID',
        'inspections.findingsByCategory': 'Findings by Category',
        'inspections.findingsByLocation': 'Findings by Location',
        'inspections.findingsByStatus': 'Findings by Status',
        'inspections.findingsCorrections': 'Findings & Corrections',
        'inspections.generalNotes': 'General Notes',
        'inspections.inspectionDate': 'Inspection Date',
        'inspections.inspectionId': 'Inspection ID',
        'inspections.inspectionTime': 'Inspection Time',
        'inspections.inspectionType': 'Inspection Type',
        'inspections.inspectorId': 'Inspector ID',
        'inspections.loadingAudit': 'Loading audit history...',
        'inspections.loadingFindings': 'Loading findings...',
        'inspections.locationId': 'Location ID',
        'inspections.locations': 'Locations',
        'inspections.markCorrected': 'Mark Corrected',
        'inspections.markSupervised': 'Mark Supervised',
        'inspections.newInspection': 'New Inspection',
        'inspections.newStatus': 'New Status',
        'inspections.noAuditHistory': 'No audit history.',
        'inspections.noFindings': 'No findings yet.',
        'inspections.noFindingsFilter': 'No findings match the selected filters.',
        'inspections.noInspectionHistory': 'No inspection history recorded for this location.',
        'inspections.noInspections': 'No inspections yet.',
        'inspections.noPendingActions': 'No pending actions.',
        'inspections.noRecordsFound': 'No findings recorded.',
        'inspections.openFindings': 'Open Findings',
        'inspections.opened': 'Inspections & Compliance opened',
        'inspections.pendingActions': 'Pending Actions',
        'inspections.pendingCorrections': 'Pending Corrections',
        'inspections.priorityField': 'Priority',
        'inspections.recommendedAction': 'Recommended Action',
        'inspections.reports': 'Reports',
        'inspections.reportsPlaceholder': 'Reports module ready for future integration.',
        'inspections.searchFindings': 'Search by location, title, category, priority, status...',
        'inspections.searchMap': 'Search location, status, finding, or employee...',
        'inspections.statusField': 'Status',
        'inspections.subtitle': 'Inspections, findings, corrections, evidence and audit trail',
        'inspections.title': 'Inspections & Compliance',
        'inspections.titleField': 'Title',
        'inspections.totalInspections': 'Total Inspections',

        // ---------- inspecciones (detalle) ----------
        'ins.categoryLabel': 'Category:',
        'ins.comment': 'Comment',
        'ins.finding': 'Finding',
        'ins.findingId': 'Finding ID',
        'ins.history': 'Inspection History',
        'ins.historyPrintTitle': 'Assignment History - StoryLand',
        'ins.inspection': 'Inspection',
        'ins.inspectionId': 'Inspection ID',
        'ins.inspections': 'Inspections',
        'ins.lastInspection': 'Last Inspection:',
        'ins.newStatus': 'New Status:',
        'ins.noLocationsFound': 'No locations found.',
        'ins.openFindingsLabel': 'Open Findings:',
        'ins.pendingCorrections': 'Pending Corrections:',
        'ins.report': 'Inspection Report',
        'ins.scheduleLabel': 'Schedule:',
        'ins.statusLabel': 'Status:',
        'ins.type': 'Type',
        'ins.typeLabel': 'Type:',
        'ins.viewTemperatures': 'View Temperatures',

        // ---------- wastelog ----------
        'wastelog.comingSoon': 'This feature will become available once the WasteLog integration is completed.',
        'wastelog.open': 'Open',
        'wastelog.noData': 'Temperature data is not available yet.',
        'wastelog.subtitle': 'Food waste log',
        'wastelog.title': 'Wastelog',

        // ---------- pie de pagina ----------
        'footer.company': 'Company',
        'footer.copyright': '© 2025 StoryManager. All rights reserved.',
        'footer.demo': 'Demo',
        'footer.description': 'Staff management for StoryLand NH.',
        'footer.restaurants': 'Restaurants',
        'footer.stores': 'Stores',

        // ---------- notificaciones ----------
        'notify.apiLoaded': 'Data loaded from the API',
        'notify.assignmentCreated': 'Assignment created',
        'notify.assignmentDeleted': 'Assignment deleted',
        'notify.assignmentsUpdated': 'Assignments updated',
        'notify.breakConfigured': 'Break configured',
        'notify.breakDeleted': 'Break deleted',
        'notify.breakSaved': 'Break configuration saved',
        'notify.breakSavedInspection': 'Inspection saved',
        'notify.clearing': 'Clearing data...',
        'notify.closureLogUpdated': 'Closed locations log updated',
        'notify.correctionSaved': 'Correction saved',
        'notify.dataUpdated': 'Data updated',
        'notify.dayDeleted': 'Day assignments deleted',
        'notify.employeeDeleted': 'Employee deleted',
        'notify.employeeSaved': 'Employee added',
        'notify.employeeUpdated': 'Employee updated',
        'notify.employeesUpdated': 'Employees updated',
        'notify.errorAssignSupervisor': 'Error assigning supervisor',
        'notify.errorChangeType': 'Error changing type',
        'notify.errorCreateAssignment': 'Error creating the assignment. Please try again.',
        'notify.errorDeleteAssignment': 'Error deleting assignment',
        'notify.errorDeleteBreak': 'Error deleting break configuration',
        'notify.errorDeleteDayAssignments': 'Error deleting day assignments',
        'notify.errorDeleteEmployee': 'Error deleting employee',
        'notify.errorDeleteTask': 'Error deleting task',
        'notify.errorDisableLocation': 'Error disabling location: {{msg}}',
        'notify.errorDisableRule': 'Error disabling staffing rule',
        'notify.errorEnableLocation': 'Error enabling location: {{msg}}',
        'notify.errorExport': 'Error exporting',
        'notify.errorExportFindings': 'Error exporting findings',
        'notify.errorLoadApi': 'Error loading data from the API',
        'notify.errorLoadHistory': 'Error loading assignment history',
        'notify.errorLoadInspections': 'Error loading inspections',
        'notify.errorQueryLocationHistory': 'Error querying location history',
        'notify.errorSaveCorrection': 'Error saving correction',
        'notify.errorSaveEmployee': 'Error saving employee',
        'notify.errorSaveFinding': 'Error saving finding',
        'notify.errorSaveInspection': 'Error saving inspection',
        'notify.errorSaveTask': 'Error saving task',
        'notify.errorUpdateAssignments': 'Error updating assignments',
        'notify.errorUpdateClosureLog': 'Error updating the closed locations log',
        'notify.errorUpdateEmployees': 'Error updating employees',
        'notify.errorUpdateFinding': 'Error updating finding',
        'notify.errorUpdateHistory': 'Error updating history',
        'notify.errorUpdateLocations': 'Error updating location management',
        'notify.errorUpdateRule': 'Error updating staffing rule',
        'notify.errorUpdateRules': 'Error updating staffing rules',
        'notify.errorUpdateTask': 'Error updating task',
        'notify.errorUpdateTasks': 'Error updating tasks',
        'notify.exportEmpty': 'No data to export',
        'notify.exportReady': 'File generated',
        'notify.findingSaved': 'Finding saved',
        'notify.foodsLoaded': 'Foods data loaded',
        'notify.historyUpdated': 'History updated',
        'notify.localStorageCleared': 'Local data cleared',
        'notify.locationsUpdated': 'Location management updated',
        'notify.noAssignmentsDate': 'No assignments for that date',
        'notify.noDisableRecord': 'No disable record found',
        'notify.noEmployeesAvailable': 'No employees available',
        'notify.noFindingsToExport': 'No findings to export',
        'notify.notImplemented': 'Function not implemented with the API',
        'notify.panelOpened': 'Administration panel opened',
        'notify.permissionDenied': 'Permission denied',
        'notify.retailLoaded': 'Retail data loaded',
        'notify.scheduleOrder': 'The end time must be after the start time',
        'notify.selectBreakEmployee': 'Select the employee who will cover the break',
        'notify.selectBreakType': 'Select the break type',
        'notify.selectBuilding': 'Select at least one building',
        'notify.selectDate': 'Select a date first',
        'notify.selectDateFirst': 'Please select a date',
        'notify.selectEmployee': 'Select an employee',
        'notify.selectLocation': 'Select a location',
        'notify.selectSchedule': 'Select the work schedule',
        'notify.selectSupervisor': 'Select a supervisor',
        'notify.staffingRuleDisabled': 'Staffing rule disabled',
        'notify.staffingRuleUpdated': 'Staffing rule updated',
        'notify.staffingRulesUpdated': 'Staffing rules updated',
        'notify.supervisorLimit': 'A supervisor can oversee a maximum of 5 buildings',
        'notify.taskCreated': 'Task created',
        'notify.taskDeleted': 'Task deleted',
        'notify.taskUpdated': 'Task updated',
        'notify.tasksUpdated': 'Tasks updated',
        'notify.wastelogDev': 'Wastelog: Feature under development. URL pending configuration.',

        // ---------- capacitaciones ----------
        'skill.change-cooking-oil': 'Filter/change cooking oil',
        'skill.change-flavors': 'Change Flavors',
        'skill.clean-beverage-machine': 'Clean Beverage Machine',
        'skill.clean-cooking-equipment': 'Clean Cooking Equipment',
        'skill.clean-freezer': 'Freezer Cleaning',
        'skill.clean-fryer': 'Clean Fryer',
        'skill.clean-fryers': 'Fryer Cleaning',
        'skill.clean-griddle': 'Clean Griddle',
        'skill.clean-grill': 'Clean Grill',
        'skill.clean-ice-cream-machine': 'Clean the Ice Cream Machine',
        'skill.clean-oven': 'Clean Oven',
        'skill.clean-prep-area': 'Clean Prep Area',
        'skill.clean-slush-machines': 'Clean Machines',
        'skill.clean-work-surfaces': 'Clean Work Surfaces',
        'skill.closing-cleanup': 'Closing Location Cleanup',
        'skill.control-flavors': 'Control Flavors',
        'skill.control-ice': 'Control Ice/Beverages',
        'skill.cooking-times': 'Control Cooking Times',
        'skill.customer-service': 'Customer Service',
        'skill.cut-pizza': 'Cut Pizza',
        'skill.deep-cleaning': 'Deep Cleaning',
        'skill.disassemble-ice-cream': 'Disassemble/Clean Components',
        'skill.dishwashing': 'Dishwashing',
        'skill.dough-training': 'Dough / Food Preparation',
        'skill.filter-oil': 'Filter/Change Oil',
        'skill.food-safety': 'Food Safety / Food Handling',
        'skill.food-warmer-training': 'Food Warmer Training',
        'skill.freezer-training': 'Freezer Handling',
        'skill.fryer-training': 'Fryer Training',
        'skill.griddle-training': 'Griddle Training',
        'skill.grill-training': 'Grill Training',
        'skill.handle-cones-cups': 'Handle Cones and Cups',
        'skill.handle-dough': 'Handle Dough',
        'skill.handle-freezer': 'Handle Freezer',
        'skill.handle-ice-cream-machine': 'Handle Ice Cream Machine',
        'skill.handle-popcorn': 'Handle Popcorn/Snack Equipment',
        'skill.handle-refills': 'Handle Refills',
        'skill.handle-toppings': 'Handle Toppings',
        'skill.ice-cream-training': 'Ice Cream Machine Training',
        'skill.icee-training': 'ICEE / Slush Machine',
        'skill.lemonade-training': 'Lemonade Station Training',
        'skill.maintain-food-warmer': 'Maintain Food Warmer',
        'skill.mop-floors': 'Mop Floors',
        'skill.nh-alcohol-certification': '🍺 NH Alcohol Certification',
        'skill.operate-fryer': 'Operate Fryer',
        'skill.operate-oven': 'Operate Oven',
        'skill.operate-slush-machines': 'Operate Slush Machines',
        'skill.oven-training': 'Oven Training',
        'skill.pizza-prep-training': 'Pizza Preparation',
        'skill.pos-training': 'Cash Register / POS Training',
        'skill.prep-beverages': 'Prepare Beverages',
        'skill.prep-burgers': 'Prepare Burgers',
        'skill.prep-cheese-curds': 'Prepare Cheese Curds',
        'skill.prep-fries': 'Prepare Fries',
        'skill.prep-grilled-cheese': 'Prepare Grilled Cheese',
        'skill.prep-icee': 'Prepare/Refill ICEE',
        'skill.prep-lemonade': 'Prepare Fresh-Squeezed Lemonade',
        'skill.prep-onion-rings': 'Prepare Onion Rings',
        'skill.prep-pizzas': 'Prepare Pizzas',
        'skill.prep-sandwiches': 'Prepare Sandwiches',
        'skill.prep-snacks': 'Snack Preparation',
        'skill.prep-souvenir-cups': 'Prepare Souvenir Cups',
        'skill.prep-sundaes': 'Prepare Sundaes',
        'skill.prep-tater-kegs': 'Prepare Tater Kegs',
        'skill.prep-tenders': 'Prepare Tenders',
        'skill.prep-toppings': 'Prepare Toppings',
        'skill.prep-tornado-potatoes': 'Prepare Tornado Potatoes',
        'skill.restock-supplies': 'Restock Supplies',
        'skill.restocking': 'Restocking',
        'skill.retail': 'Sales / Retail',
        'skill.sandwich-training': 'Sandwich Prep',
        'skill.sanitize-ice-cream-area': 'Sanitize Ice Cream Area',
        'skill.sanitize-nozzles': 'Sanitize Nozzles',
        'skill.sanitize-surfaces': 'Sanitize Surfaces',
        'skill.serve-soft-serve': 'Serve Soft-Serve',
        'skill.soda-fountain-training': 'Soda Fountain Training',
        'skill.souvenirs': 'Souvenirs / Merchandising',
        'skill.sundae-training': 'Sundae Preparation',
        'skill.wash-utensils': 'Wash Utensils',

        // ---------- empleados (detalle) ----------
        'emp.available': 'Available:',
        'emp.currentRole': 'Current role:',
        'emp.currentStatus': 'Current Status:',
        'emp.dayOff': 'Day Off:',
        'emp.fieldAge': 'Age:',
        'emp.fieldAssistant': 'Assistant:',
        'emp.fieldGroup': 'Group:',
        'emp.fieldHireDate': 'Hire Date:',
        'emp.fieldName': 'Name:',
        'emp.fieldNationality': 'Nationality:',
        'emp.fieldRole': 'Role:',
        'emp.fieldVersatile': 'Versatile:',
        'emp.holiday': 'Holiday:',
        'emp.noCertifications': 'No certifications',
        'emp.noInfo': 'No information',
        'emp.noSkills': 'No skills',
        'emp.onBreak': 'On Break:',
        'emp.onTraining': 'On Training:',
        'emp.permissions': 'Permissions',
        'emp.requiredRoles': 'Required Roles',
        'emp.saveRole': 'Save Role',
        'emp.sectionInfo': 'Employee Information',
        'emp.sectionRoles': 'Roles & Skills',

        // ---------- supervisores ----------
        'sup.add': 'Add employee:',
        'sup.assigned': 'Assigned Supervisors',
        'sup.buildings': 'Buildings to oversee (max 5):',
        'sup.employeeAssignments': 'Employee Assignments',
        'sup.none': 'No supervisors assigned for this date',
        'sup.role': 'Supervision role:',
        'sup.search': 'Search for an employee...',
        'sup.title': 'Assign Supervisors to Buildings',

        // ---------- asignacion (detalle) ----------
        'asg.active': 'Active',
        'asg.actual': 'Current:',
        'asg.asset': 'Asset / Equipment',
        'asg.assignedEmployees': 'Assigned Employees',
        'asg.assignments': 'assignments',
        'asg.coveredByOther': 'Covered by another employee',
        'asg.end': 'End:',
        'asg.inactive': 'Inactive',
        'asg.minimum': 'Minimum:',
        'asg.noEmployeesToday': 'No employees assigned today.',
        'asg.noForDate': 'No assignments for this date',
        'asg.noForLocation': 'No assignments registered for this location',
        'asg.requiredRoles': 'Requirements:',
        'asg.scheduleLabel': 'Work schedule:',
        'asg.servesAlcohol': 'Serves alcohol:',
        'asg.start': 'Start:',

        // ---------- locaciones (detalle) ----------
        'loc.autoReactivation': 'Automatic reactivation date (optional)',
        'loc.closeReason': 'Closure reason',
        'loc.closeTitle': 'Closed Locations',
        'loc.closedByLabel': 'Closed by',
        'loc.deactivate': 'Deactivate',
        'loc.disableDate': 'Disable date',
        'loc.noClosed': 'No closed locations for this date',
        'loc.reopenByLabel': 'Responsible for reopening',
        'loc.reopenReason': 'Reopening reason',
        'loc.reopenedBy': 'Reopened by',

        // ---------- filtros ----------
        'filter.allCategories': 'All Categories',
        'filter.allLocations': 'All Locations',
        'filter.allPriorities': 'All Priorities',
        'filter.allStatuses': 'All Statuses',
        'filter.chooseLocation': 'Select location...',
        'filter.select': 'Select...',

        // ---------- confirmaciones ----------
        'confirm.deleteEmployee': 'Delete this employee?',
        'confirm.deleteTask': 'Delete this task?',
        'confirm.disableRule': 'Disable this staffing rule?',
        'confirm.permissionOp': 'Permission denied: need OP or higher',

        // ---------- importador de excel ----------
        'imp.analyzeBtn': 'Analyze',
        'imp.analyzing': 'Analyzing the file...',
        'imp.applyMapping': 'Apply mapping and preview',
        'imp.applyDate': 'Apply date and preview',
        'imp.scheduleDateTitle': 'Schedule date',
        'imp.scheduleDateLabel': 'What date does this schedule apply to?',
        'imp.scheduleDateHint': 'The schedule file does not include a date. The date you choose will be applied to every assignment in this file.',
        'imp.scheduleDateRequired': 'Select the schedule date to continue.',
        'imp.scheduleDateApplied': 'The date {{date}} will be applied to every assignment.',
        'imp.typeQuinyxSchedule': 'Quinyx / Story Land schedule',
        'imp.quinyxHint': 'Real schedule format recognised: two blocks, locations per section, several employees and several time ranges per row.',
        'imp.recordsFound': 'Assignments',
        'imp.locationsFound': 'Locations',
        'imp.sectionsFound': 'Sections',
        'imp.needsReviewRows': 'Needs review',
        'imp.sectionsTitle': 'Detected location sections',
        'imp.unknownLocationsTitle': 'Unrecognised locations',
        'imp.unknownLocationsHint': 'These locations from the file do not exist in StoryManager. They will not be created: pick an existing location in the preview.',
        'imp.stepDate': 'Date',
        'imp.colRole': 'Role',
        'imp.shift.Day': 'Day',
        'imp.shift.Night': 'Night',
        'imp.issueMissingTime': 'Row has no time',
        'imp.issueBadTime': 'Time could not be interpreted',
        'imp.issueUntil': '"until" with no previous shift',
        'imp.issueMergedRanges': 'Several time ranges for one employee: check the length',
        'imp.issueRangeMismatch': 'More employees than time ranges in the same row',
        'imp.issueChanged': 'That employee\'s shift changed on this date',
        'imp.statusChanged': 'Changed',
        'imp.statusSkipped': 'Not imported',
        'imp.issueSectionHidden': 'Section removed from the interface. Not imported; history is preserved.',
        'imp.existingLabel': 'Current:',
        'imp.importedLabel': 'Imported:',
        'imp.actionKeep': 'Keep current',
        'imp.actionUpdate': 'Update',
        'imp.actionSkip': 'Skip',
        'imp.browse': 'Browse file',
        'imp.button': 'Import Excel',
        'imp.colAction': 'Action',
        'imp.colClockIn': 'Clock In',
        'imp.colClockOut': 'Clock Out',
        'imp.colDate': 'Date',
        'imp.colEmployee': 'Employee',
        'imp.colEnd': 'End',
        'imp.colHours': 'Hours',
        'imp.colLocation': 'Location',
        'imp.colStart': 'Start',
        'imp.colStatus': 'Status',
        'imp.commitBtn': 'Confirm import',
        'imp.completed': 'Import completed',
        'imp.confirmNote': 'Only valid records will be saved. Records under review or with conflicts will be skipped.',
        'imp.confirmTitle': 'Confirm the import?',
        'imp.conflictCount': 'Conflicts',
        'imp.dateAmbiguous': 'Ambiguous date format (assumed month/day). Please verify.',
        'imp.detectedHint': 'Columns were detected automatically. Review the mapping before continuing.',
        'imp.detectedType': 'Detected type',
        'imp.dupShort': 'Dup.',
        'imp.duplicateCount': 'Duplicates',
        'imp.emptyHeader': '(no header)',
        'imp.errBadFile': 'The file must be .xlsx or .xls',
        'imp.errCommit': 'Error saving the import',
        'imp.errParse': 'The file could not be read',
        'imp.errValidate': 'Error validating records',
        'imp.errorsTitle': 'Errors',
        'imp.excelColumn': 'Excel column',
        'imp.excludeRow': 'Exclude this row from the import',
        'imp.f.badge': 'Badge',
        'imp.f.break': 'Break (min)',
        'imp.f.date': 'Date',
        'imp.f.department': 'Department',
        'imp.f.employee': 'Employee',
        'imp.f.employee_id': 'Employee ID',
        'imp.f.end_time': 'End Time',
        'imp.f.first_name': 'First Name',
        'imp.f.hours': 'Worked Hours',
        'imp.f.last_name': 'Last Name',
        'imp.f.location': 'Location',
        'imp.f.overtime': 'Overtime',
        'imp.f.regular_hours': 'Regular Hours',
        'imp.f.start_time': 'Start Time',
        'imp.historyTitle': 'Previous imports',
        'imp.importedCount': 'Imported',
        'imp.issueClosed': 'Location is closed on that date',
        'imp.issueConflict': 'Schedule conflict with another assignment',
        'imp.issueDate': 'Date invalid',
        'imp.issueDuplicate': 'Record already imported',
        'imp.issueEmployee': 'Employee not found',
        'imp.issueEnd': 'End time invalid',
        'imp.issueEndBefore': 'End time is not after start time',
        'imp.issueLocation': 'Location not found',
        'imp.issueOther': 'Review this record',
        'imp.issueStart': 'Start time invalid',
        'imp.issuesTitle': 'Issues detected',
        'imp.mappingSummary': 'Mapping summary',
        'imp.mappingTitle': 'Column mapping',
        'imp.noIssues': 'No issues detected in these records.',
        'imp.notUsed': '- Not used -',
        'imp.noteNothingSaved': 'Nothing is saved until you confirm the import.',
        'imp.ok': 'OK',
        'imp.readyCount': 'Ready',
        'imp.records': 'records',
        'imp.rejectedCount': 'Rejected',
        'imp.rejectedShort': 'Rej.',
        'imp.reviewCount': 'Need review',
        'imp.sample': 'Sample',
        'imp.schedule': 'Schedule',
        'imp.selectEmployeeShort': 'Select employee...',
        'imp.selectFile': 'Select an Excel file',
        'imp.selectFileHint': 'Accepted formats: .xlsx and .xls. It will be analyzed before anything is saved.',
        'imp.selectLocationShort': 'Select location...',
        'imp.sheetLabel': 'Sheet',
        'imp.statusConflict': 'Conflict',
        'imp.statusDuplicate': 'Already imported',
        'imp.statusReady': 'Ready',
        'imp.statusReview': 'Need review',
        'imp.stepAnalyze': 'Analyze',
        'imp.stepConfirm': 'Confirm',
        'imp.stepFile': 'File',
        'imp.stepMapping': 'Mapping',
        'imp.stepPreview': 'Preview',
        'imp.stepResult': 'Result',
        'imp.stepType': 'Type',
        'imp.stepValidate': 'Validation',
        'imp.storyField': 'StoryManager field',
        'imp.targetFoods': 'Food',
        'imp.targetLabel': 'Import into',
        'imp.targetRetail': 'Retail',
        'imp.timesheet': 'Timesheet',
        'imp.title': 'Import Excel',
        'imp.totalRecords': 'Records found',
        'imp.typeSchedule': 'Schedule',
        'imp.typeTimesheet': 'Timesheet',
        'imp.typeUnknown': 'Unrecognized format',
        'imp.unknown': 'Unknown',
        'imp.unknownHint': 'The format was not recognized. Map the columns manually; it will be treated as a schedule.',
        'imp.updatedCount': 'Updated',
        'imp.validateBtn': 'Validate records',
        'imp.validationNote': 'The same StoryManager rules apply: location active on that date, start before end, and no schedule overlap. Two shifts that touch (10:00-14:00 and 14:00-18:00) are valid.',

        // ---------- secciones del horario (OPS / Extra Hours / Support / Extra Tasks / Notas) ----------
        'sched.sectionOps': 'OPS',
        'sched.sectionExtraHours': 'Extra Hours',
        'sched.sectionSupport': 'Support',
        'sched.sectionExtraTasks': 'Extra Tasks',
        'sched.sectionNostalgiaNight': 'Nostalgia Night',
        'sched.overnightHint': 'Night shift: if the end time is earlier than the start time, the shift ends the next day.',
        'autoAssign.titulo': 'Automatic assignment proposal',
        'autoAssign.calculando': 'Working out...',
        'autoAssign.guardando': 'Saving...',
        'autoAssign.error': 'Could not work out the proposal',
        'autoAssign.errorGuardar': 'Could not save',
        'autoAssign.sinFecha': 'Pick a day before assigning.',
        'autoAssign.puestosCubiertos': 'positions covered',
        'autoAssign.compromisosRespetados': 'commitments respected',
        'autoAssign.puestosSinCubrir': 'positions left open',
        'autoAssign.todoCubierto': 'Every minimum is covered',
        'autoAssign.falta': 'Not every minimum could be covered',
        'autoAssign.cobertura': 'Coverage by location',
        'autoAssign.colLocalizacion': 'Location',
        'autoAssign.colMinimo': 'Minimum',
        'autoAssign.colEstado': 'Status',
        'autoAssign.colFalta': 'What is missing',
        'autoAssign.colEmpleado': 'Employee',
        'autoAssign.colPuesto': 'Position',
        'autoAssign.colHorario': 'Hours',
        'autoAssign.colMotivo': 'Reason',
        'autoAssign.colPorQue': 'Why it could not be covered',
        'autoAssign.cumpleMinimo': 'Met',
        'autoAssign.faltaMinimo': 'Below',
        'autoAssign.cerrada': 'Closed',
        'autoAssign.propuestas': 'Proposed assignments ({{n}})',
        'autoAssign.sinCubrir': 'Positions left open ({{n}})',
        'autoAssign.descartados': 'People set aside, and why ({{n}})',
        'autoAssign.avisosTitulo': 'What the system does not know',
        'autoAssign.duplicados': '{{n}} activities show up in more than one section. They are counted once: it is the same commitment.',
        'autoAssign.noToca': 'Nothing already assigned is touched. If something does not add up, it is explained rather than forced.',
        'autoAssign.guardar': 'Save ({{n}} assignments)',
        'autoAssign.rechazada': 'Not saved: {{n}} at {{l}} — {{m}}',
        'sched.exportSchedule': 'Export Schedule',
        'sched.exportScheduleHint': 'Downloads the selected day\'s schedule as an Excel file that can be imported again.',
        'sched.exporting': 'Generating Excel...',
        'sched.exportStarted': 'Download started. If it did not start, check your browser downloads.',
        'sched.exportEmpty': 'That day has no assignments: the file will contain only the sheets and the headers.',
        'sched.exportEmptyConfirm': 'That day has no assignments. Download the file anyway?',
        'sched.exportErrors': 'Could not export the schedule',
        'sched.exportBadDate': 'Pick a valid day before exporting.',
        'sched.exportSupervisionMissing': 'Supervision with no known location',
        'sched.exportNoArea': 'It was not possible to tell which OPS area each location belongs to, because the "OPS Group" field is empty. The export uses neutral names instead of inventing an area.',
        'sched.exportGood': 'Shifts exported',
        'sched.sectionNotes': 'Notes',
        'sched.sectionTag': 'Section',
        'sched.notAssigned': 'Not assigned',
        'sched.unknownEmployee': 'Unknown',
        'sched.assignTo': 'Assign to',
        'sched.assignedTo': 'Assigned',
        'sched.addEmployee': 'Add employee',
        'sched.searchEmployee': 'Search employee by name...',
        'sched.workSchedule': 'Work schedule',
        'sched.roleOptional': 'Role (optional)',
        'sched.rolePlaceholder': 'Server, Cook, Hostess, AM Help...',
        'sched.notesOptional': 'Notes (optional)',
        'sched.notesPlaceholder': 'Note about this shift...',
        'sched.assign': 'Assign',
        'sched.noEmployeesFound': 'No employees found.',
        'sched.conflictPrefix': 'Schedule conflict',
        'sched.noTwoPlaces': 'Cannot be in two places at the same time.',
        'sched.assignedOk': 'Assignment saved',
        'sched.assignError': 'Could not save the assignment',
        'sched.removed': 'Assignment removed',
        'sched.removeError': 'Could not remove the assignment',
        'sched.noNotes': 'No notes for this date',
        'sched.addNote': 'Add note',
        'sched.notePlaceholder': 'Write a note for this day...',
        'sched.noteAdded': 'Note saved',
        'sched.noteError': 'Could not save the note',
        'employees.opsGroupLabel': 'OPS Group / Supervisor',
        'employees.opsGroupNone': 'No es OPS',
        'employees.trainedLocationsLabel': 'Entrenado en',
        'employees.trainedLocationsNone': 'Sin registrar',
        'employees.extraGroupsLabel': 'Grupos adicionales',
        'employees.extraGroupsHint': 'Se marcan a mano y quedan registrados aparte del grupo principal.',
        'employees.groupDRoleError': 'El Grupo D (Bistro) solo admite roles Bartender, Cashier o Cook.',
        'employees.adminOnlyNote': 'Rol administrativo: solo están habilitadas Dunkin Certified, Food Safety/Food Handling, Cash Register/POS Training y NH Alcohol Certification. No hay habilidades operativas, de limpieza ni de seguridad.',
        'nav.reports': 'Reportes',
        'reports.title': 'Reportes de Capacitaciones',
        'reports.search': 'Buscar empleado...',
        'reports.allGroups': 'Todos los grupos',
        'reports.noGroup': 'Sin grupo',
        'reports.employee': 'Empleado',
        'reports.group': 'Grupo',
        'reports.trainedIn': 'Entrenado en',
        'reports.certifications': 'Certificaciones',
        'reports.derivedFromLocations': 'Deducido de sus locations',
        'reports.notRegistered': 'Sin registrar',
        'reports.noResults': 'Ningún empleado coincide.',
        'reports.error': 'No se pudo cargar el reporte.',
        'reports.export': 'Exportar CSV',
    }
};

// Índices de búsqueda: texto en cualquier idioma -> clave
// ------------------------------------------------------------------
const I18N_BY_TEXT = new Map();   // texto normalizado -> clave
const I18N_PATTERNS = [];         // claves con interpolación {{x}}

const normalize = (s) => String(s).replace(/\s+/g, ' ').trim();

function buildIndexes() {
    I18N_BY_TEXT.clear();
    I18N_PATTERNS.length = 0;
    const esKeys = Object.keys(I18N.es);
    const enKeys = Object.keys(I18N.en);

    esKeys.forEach((k) => {
        I18N.es[k] && I18N_BY_TEXT.set(normalize(I18N.es[k]).toLowerCase(), k);
        I18N.en[k] && I18N_BY_TEXT.set(normalize(I18N.en[k]).toLowerCase(), k);
        // Patrones con interpolación
        if (/\{\{\w+\}\}/.test(String(I18N.es[k]))) {
            I18N_PATTERNS.push({ key: k, re: patternToRegExp(String(I18N.es[k])) });
        }
    });
    // Claves presentes solo en un idioma (se reportan en la validación)
    enKeys.forEach((k) => {
        if (!esKeys.includes(k)) {
            I18N.en[k] && I18N_BY_TEXT.set(normalize(I18N.en[k]).toLowerCase(), k);
        }
    });
}

// ============================================
// LOCATIONS ENTRENADAS · GRUPOS MULTIPLES · ROL ADMIN
// ============================================

// Solo el rol administrativo habilita estas certificaciones. Nada de
// habilidades operativas, nada de limpieza y seguridad.
const ADMIN_ONLY_TRAININGS = [
    'dunkin-trained',            // Dunkin Certified
    'food-safety',               // Food Safety / Food Handling
    'pos-training',              // Cash Register / POS Training
    'nh-alcohol-certification'   // NH Alcohol Certification
];

let trainingLocationGroups = [];   // location_id -> group_id
let empEditExtraGroups = [];       // grupos adicionales marcados en el formulario

// Cuando el rol es 'admin', el panel de cualidades se reduce a las 4
// certificaciones permitidas y el resto queda deshabilitado.
function applyAdminTrainingFilter() {
    const form = document.getElementById('employeeForm');
    const roleSel = document.getElementById('empRole');
    if (!form || !roleSel) return;
    const isAdmin = roleSel.value === 'admin';
    form.classList.toggle('trainings-locked', isAdmin);

    const note = form.querySelector('.admin-only-note');
    if (isAdmin && !note) {
        const box = form.querySelector('.trainings-container');
        const div = document.createElement('div');
        div.className = 'admin-only-note';
        div.innerHTML = `<i class="fas fa-user-shield"></i> ${esc(t('employees.adminOnlyNote'))}`;
        box.parentNode.insertBefore(div, box);
    } else if (!isAdmin && note) {
        note.remove();
    }

    // Solo las casillas de capacitaciones se habilitan o deshabilitan: las de
    // grupos adicionales no son certificaciones y se dejan como estan.
    employeeTrainingCheckboxes().forEach((cb) => {
        const allowed = ADMIN_ONLY_TRAININGS.includes(cb.value);
        cb.disabled = isAdmin && !allowed;
        const label = cb.closest('label');
        if (label) label.style.opacity = (isAdmin && !allowed) ? '0.4' : '';
    });

    // Si el rol administrativo cambia, cualquier certificacion no permitida
    // que estuviera marcada se desmarca (no se borra de la base: el usuario
    // puede volver al rol anterior y recuperarla).
    if (isAdmin) {
        employeeTrainingCheckboxes()
            .filter(cb => cb.checked && !ADMIN_ONLY_TRAININGS.includes(cb.value))
            .forEach(cb => { cb.checked = false; });
    }
}

// Locations donde el empleado ha sido entrenado + grupos adicionales.
//
// CUIDADO con el orden de las llamadas: esto lee del servidor. Si se abre el
// empleado A y enseguida el B, la respuesta de A puede llegar DESPUES de la de
// B y dejar las locations de A en el formulario de B (al guardar, se
// escribirian los datos de A sobre B). Para evitarlo cada llamada recibe un
// token y, si al volver ya no es el ultimo, no pinta nada.
let empTrainingFieldsToken = 0;

async function renderEmployeeTrainingFields(employeeId) {
    const box = document.getElementById('empTrainedLocations');
    const gbox = document.getElementById('empExtraGroups');
    if (!box) return;

    const token = ++empTrainingFieldsToken;

    let data = { locations: [], groups: [] };
    if (employeeId) {
        try { data = await fetchEmployeeTrainingLocations(employeeId); }
        catch (e) { console.error('Error cargando locations del empleado:', e); }
    }

    // Mientras esperabamos se ha abierto otro empleado (o se ha cerrado el
    // formulario): lo que ha llegado ya no vale.
    if (token !== empTrainingFieldsToken) return;

    const marcadas = new Set((data.locations || []).map((l) => l.location_id));

    if (!locations.length) {
        box.innerHTML = `<span class="no-assignments">${esc(t('employees.trainedLocationsNone'))}</span>`;
    } else {
        box.innerHTML = locations.map((loc) => {
            const g = trainingLocationGroups.find((x) => x.location_id === loc.id);
            const on = marcadas.has(loc.id);
            return `<span class="loc-chip${on ? ' checked' : ''}" data-loc="${esc(loc.id)}"
                          onclick="this.classList.toggle('checked')">
                        ${g ? `<span class="grp">${esc(g.group_id)}</span>` : ''}
                        ${esc(loc.name)}
                    </span>`;
        }).join('');
    }

    empEditExtraGroups = (data.groups || []).slice();
    if (gbox) {
        gbox.innerHTML = ['A', 'B', 'C', 'D'].map((g) => `
            <label>
                <input type="checkbox" value="${g}" ${empEditExtraGroups.includes(g) ? 'checked' : ''}>
                ${esc(groupLabel(g))}
            </label>`).join('');
    }
}

// Etiqueta corta del grupo. El texto largo vive en el formulario.
function groupLabel(g) {
    const map = {
        A: 'A · Frente', B: 'B · Medio', C: 'C · Fondo', D: 'D · Bistro'
    };
    return map[g] || g;
}

// Guardar locations entrenadas + grupos adicionales.
async function saveEmployeeTrainingFields(employeeId) {
    const box = document.getElementById('empTrainedLocations');
    if (!box || !employeeId) return;
    const locs = [...box.querySelectorAll('.loc-chip.checked')].map((c) => c.dataset.loc);
    const gbox = document.getElementById('empExtraGroups');
    const groups = gbox
        ? [...gbox.querySelectorAll('input[type="checkbox"]:checked')].map((c) => c.value)
        : [];
    try {
        await saveEmployeeTrainingLocations(employeeId, { locations: locs, groups: groups });
    } catch (e) {
        console.error('Error guardando locations del empleado:', e);
    }
}

async function loadTrainingLocationGroups() {
    try {
        trainingLocationGroups = await fetchLocationGroups() || [];
    } catch (e) {
        console.error('Error cargando grupos por location:', e);
        trainingLocationGroups = [];
    }
}

// ============================================
// MODULO DE REPORTES  (capacitaciones por empleado)
// ============================================
// Vive fuera del gestor de empleados: aqui solo se consulta. Es el sitio
// donde se ve en que locations ha estado entrenado cada persona y de que
// grupos dispone, sin ensuciar la lista de empleados.

function openTrainingReports() {
    let modal = document.getElementById('trainingReportsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'trainingReportsModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:1100px;">
            <div class="modal-header">
                <h3><i class="fas fa-chart-bar"></i> ${esc(t('reports.title'))}</h3>
                <span class="close" onclick="closeTrainingReports()">&times;</span>
            </div>
            <div class="form-content">
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1rem;">
                    <input type="search" id="reportEmpSearch" placeholder="${esc(t('reports.search'))}"
                           oninput="renderTrainingReports()" style="flex:1;min-width:200px;" />
                    <select id="reportGroupFilter" onchange="renderTrainingReports()">
                        <option value="">${esc(t('reports.allGroups'))}</option>
                        <option value=" ">${esc(t('reports.noGroup'))}</option>
                        <option value="A">Grupo A</option>
                        <option value="B">Grupo B</option>
                        <option value="C">Grupo C</option>
                        <option value="D">Grupo D</option>
                    </select>
                    <button class="btn btn-secondary" onclick="exportTrainingReportCSV()">
                        <i class="fas fa-file-csv"></i> ${esc(t('reports.export'))}
                    </button>
                </div>
                <div id="trainingReportBody"><p class="no-assignments">${esc(t('common.loading'))}</p></div>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="closeTrainingReports()">${esc(t('common.close'))}</button>
            </div>
        </div>`;
    loadTrainingReportData();
}

function closeTrainingReports() {
    const m = document.getElementById('trainingReportsModal');
    if (m) m.style.display = 'none';
}

let trainingReportRows = [];

async function loadTrainingReportData() {
    try {
        trainingReportRows = await fetchEmployeesTrainingReport() || [];
        renderTrainingReports();
    } catch (e) {
        console.error('Error cargando el reporte:', e);
        const b = document.getElementById('trainingReportBody');
        if (b) b.innerHTML = `<p class="no-assignments">${esc(t('reports.error'))}</p>`;
    }
}

function renderTrainingReports() {
    const body = document.getElementById('trainingReportBody');
    if (!body) return;
    const q = (document.getElementById('reportEmpSearch')?.value || '').toLowerCase();
    const g = document.getElementById('reportGroupFilter')?.value ?? '';

    const rows = trainingReportRows.filter((r) => {
        if (q && !String(r.name).toLowerCase().includes(q)) return false;
        if (g !== '') {
            const principal = (r.primary_group || ' ').trim();
            const todos = [principal].concat(r.extra_groups || []);
            if (!todos.includes(g)) return false;
        }
        return true;
    });

    if (!rows.length) {
        body.innerHTML = `<p class="no-assignments">${esc(t('reports.noResults'))}</p>`;
        return;
    }

    body.innerHTML = `
      <div class="table-scroll" style="max-height:60vh;overflow-y:auto;">
        <table class="emp-table">
          <thead><tr>
            <th>${esc(t('reports.employee'))}</th>
            <th>${esc(t('common.role'))}</th>
            <th>${esc(t('reports.group'))}</th>
            <th>${esc(t('reports.trainedIn'))}</th>
            <th>${esc(t('reports.certifications'))}</th>
          </tr></thead>
          <tbody>
            ${rows.map((r) => {
                const principal = (r.primary_group || ' ').trim();
                const extras = (r.extra_groups || []).filter((x) => x !== principal);
                const locs = r.trained_locations || [];
                const derivadas = (r.derived_groups || []).filter((x) => x !== principal);
                return `<tr>
                  <td><strong>${esc(r.name)}</strong></td>
                  <td>${esc(getRoleName(r.role))}</td>
                  <td>
                    ${principal
                      ? `<span class="imp-tag">${esc(principal)}</span>`
                      : `<span class="no-assignments">${esc(t('reports.noGroup'))}</span>`}
                    ${extras.map((x) => `<span class="imp-tag imp-tag-shift">${esc(x)}</span>`).join('')}
                    ${derivadas.length
                      ? `<div style="margin-top:.25rem;font-size:.72rem;color:var(--text-secondary)">
                           ${esc(t('reports.derivedFromLocations'))}: ${derivadas.map((x) => esc(x)).join(', ')}
                         </div>`
                      : ''}
                  </td>
                  <td>
                    ${locs.length
                      ? locs.map((l) => {
                          const loc = locations.find((x) => x.id === l);
                          return `<span class="imp-tag imp-tag-role">${esc(loc ? loc.name : l)}</span>`;
                        }).join(' ')
                      : `<span class="no-assignments">${esc(t('reports.notRegistered'))}</span>`}
                  </td>
                  <td>${r.trainings_count}</td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
}

function exportTrainingReportCSV() {
    if (!trainingReportRows.length) return;
    const cab = ['Empleado', 'Rol', 'Grupo', 'Grupos adicionales', 'Entrenado en', 'Capacitaciones'];
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [cab.map(q).join(',')];
    trainingReportRows.forEach((r) => {
        const principal = (r.primary_group || ' ').trim();
        lines.push([
            r.name, getRoleName(r.role),
            principal || 'sin grupo',
            (r.extra_groups || []).join(' '),
            (r.trained_locations || []).map((l) => {
                const loc = locations.find((x) => x.id === l);
                return loc ? loc.name : l;
            }).join(' | '),
            r.trainings_count
        ].map(q).join(','));
    });
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'capacitaciones-empleados.csv';
    a.click();
    URL.revokeObjectURL(a.href);
}

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function patternToRegExp(pattern) {
    const parts = pattern.split(/(\{\{\w+\}\})/);
    let re = '^';
    parts.forEach((p) => {
        if (/^\{\{\w+\}\}$/.test(p)) re += '(.+?)';
        else re += escapeRegExp(p).replace(/\\ /g, ' ');
    });
    re += '$';
    try {
        return new RegExp(re, 'i');
    } catch (e) {
        return null;
    }
}

// ------------------------------------------------------------------
// t(): API única de traducción
// ------------------------------------------------------------------
const I18N_MISSING = new Set();

function t(key, params) {
    const primary = I18N[currentLang] && I18N[currentLang][key];
    if (primary !== undefined) return interpolate(primary, params);

    // Fallback controlado: inglés + aviso. Nunca devuelve español en modo EN.
    const fallback = I18N.en[key];
    if (fallback !== undefined) {
        if (!I18N_MISSING.has(key)) {
            I18N_MISSING.add(key);
            console.warn(`[i18n] Falta la clave "${key}" en "${currentLang}". Se usa el valor en inglés.`);
        }
        return interpolate(fallback, params);
    }

    if (!I18N_MISSING.has(key)) {
        I18N_MISSING.add(key);
        console.warn(`[i18n] Clave inexistente: "${key}"`);
    }
    return key;
}

function interpolate(str, params) {
    if (!params) return str;
    return String(str).replace(/\{\{(\w+)\}\}/g, (m, name) =>
        (params[name] !== undefined ? String(params[name]) : m)
    );
}

// ------------------------------------------------------------------
// Traducción de texto dinámico del DOM
// ------------------------------------------------------------------
// Convierte un texto visible al idioma activo. Devuelve null si no hay
// traducción disponible (para no marcar nodos que no son traducibles).
function translateString(raw) {
    const trimmed = normalize(raw);
    if (!trimmed) return null;

    // 1) coincidencia exacta (ambos idiomas indexados)
    const direct = I18N_BY_TEXT.get(trimmed.toLowerCase());
    if (direct) return t(direct);

    // 2) coincidencia con interpolación
    for (const p of I18N_PATTERNS) {
        const re = p.re;
        if (!re) continue;
        const m = trimmed.match(re);
        if (m) {
            const raw2 = String(I18N.es[p.key]);
            const parts = raw2.split(/(\{\{\w+\}\})/);
            const params = {};
            let idx = 1;
            parts.forEach((part) => {
                if (/^\{\{(\w+)\}\}$/.test(part)) params[part.match(/\{\{(\w+)\}\}/)[1]] = m[idx++];
            });
            return t(p.key, params);
        }
    }
    return null;
}

// Atributos que se traducen directamente.
// NOTA: data-i18n NO va aqui; controla el contenido de texto del elemento
// y se aplica mas abajo sobre los nodos de texto.
const I18N_ATTRS = [
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-title', 'title'],
    ['data-i18n-aria-label', 'aria-label']
];

// Marca un elemento (y todo su subárbol) como NO traducible. Se usa para los
// textos que vienen de datos —nombres de empleados, roles o ubicaciones
// leídos de un Excel— donde traducir mostraría algo distinto de lo que se va
// a guardar.
const I18N_SKIP_ATTR = 'data-i18n-ignore';
const I18N_SKIP_SELECTOR = '[' + I18N_SKIP_ATTR + ']';

function isI18nSkipped(el) {
    if (!el || el.nodeType !== 1 || !el.closest) return false;
    return el.closest(I18N_SKIP_SELECTOR) !== null;
}

let i18nApplying = false;

function translateElement(el) {
    if (isI18nSkipped(el)) return;
    // Atributos traducibles.
    // Prioridad: data-i18n-X (clave explicita) > busqueda en el diccionario.
    I18N_ATTRS.forEach(([attr, kind]) => {
        const declaredKey = el.getAttribute(attr);
        let value = null;
        if (declaredKey) {
            value = t(declaredKey);
        } else {
            const raw = el.getAttribute(kind);
            if (raw) {
                const found = translateString(raw);
                if (found !== null) value = found;
            }
        }
        if (value !== null && el.getAttribute(kind) !== value) el.setAttribute(kind, value);
    });

    // Texto propio: se traducen TODOS los nodos de texto directos,
    // incluso en elementos que tienen hijos (p.ej. <i class=..></i> Employees).
    // Si el elemento declara data-i18n, esa clave manda sobre el texto actual.
  const textNodes = Array.prototype.filter.call(el.childNodes, (n) => n.nodeType === 3);
    if (!textNodes.length) return;

    const declared = el.getAttribute('data-i18n');
  textNodes.forEach((textNode) => {
        const current = normalize(textNode.nodeValue);
        if (!current) return;

     let desiredText = null;
        if (declared) {
            desiredText = t(declared);
        } else {
    const translated = translateString(current);
     if (translated !== null) desiredText = translated;
        }
        if (desiredText === null) return;

        const lead = textNode.nodeValue.match(/^\s*/)[0];
        const trail = textNode.nodeValue.match(/\s*$/)[0];
        const desired = lead + desiredText + trail;
        // Escribir solo si cambia: evita disparar el observer en bucle.
        if (textNode.nodeValue !== desired) textNode.nodeValue = desired;
    });
}

function applyI18n(root) {
    const scope = root || document.body;
    if (!scope) return;
    i18nApplying = true;
    try {
        if (scope.nodeType === 1) translateElement(scope);
        const all = scope.querySelectorAll('*');
        for (let i = 0; i < all.length; i++) translateElement(all[i]);
    } finally {
        i18nApplying = false;
    }
}

// ------------------------------------------------------------------
// Observador: el contenido inyectado por JS se traduce solo
// ------------------------------------------------------------------
let i18nObserver = null;
let i18nPending = [];
let i18nFlushTimer = null;

function flushI18n() {
    i18nFlushTimer = null;
    if (!i18nPending.length) return;
    const roots = i18nPending;
    i18nPending = [];
    i18nApplying = true;
    try {
        roots.forEach((el) => translateElement(el));
    } finally {
        i18nApplying = false;
    }
}

function queueI18n(el) {
    if (!el || i18nApplying) return;
    if (i18nPending.indexOf(el) === -1) i18nPending.push(el);
    if (i18nFlushTimer === null) {
        i18nFlushTimer = setTimeout(flushI18n, 0);
    }
}

function observeI18n() {
    if (i18nObserver) i18nObserver.disconnect();
    i18nObserver = new MutationObserver((mutations) => {
        if (i18nApplying) return;   // ignora los cambios que hacemos nosotros
        mutations.forEach((m) => {
            if (m.type === 'characterData') {
                const el = m.target.parentElement;
           if (el) queueI18n(el);
  return;
            }
  m.addedNodes.forEach((node) => {
 if (node.nodeType === 1) {
           i18nApplying = true;
      try { applyI18n(node); } finally { i18nApplying = false; }
   }
            });
        });
    });
    i18nObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// ------------------------------------------------------------------
// Validación: claves imbalanceadas entre idiomas
// ------------------------------------------------------------------
function validateI18n() {
    const esKeys = Object.keys(I18N.es).sort();
    const enKeys = Object.keys(I18N.en).sort();
    const onlyEs = esKeys.filter((k) => !enKeys.includes(k));
    const onlyEn = enKeys.filter((k) => !esKeys.includes(k));
    if (onlyEs.length) console.warn('[i18n] Claves solo en es:', onlyEs);
    if (onlyEn.length) console.warn('[i18n] Claves solo en en:', onlyEn);
    return { total: esKeys.length, onlyEs, onlyEn };
}

// ------------------------------------------------------------------
// Cambio de idioma
// ------------------------------------------------------------------
function getLocale() {
    return currentLang === 'en' ? 'en-US' : 'es-ES';
}

function translatePage() {
    applyI18n(document.body);
}

function handleLanguageChange(lang) {
    document.querySelectorAll('.lang-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector(`.lang-btn[data-lang="${lang}"]`)?.classList.add('active');
    localStorage.setItem('appLanguage', lang);
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang);
    translatePage();
    setTimeout(() => {
        if (typeof loadInitialData === 'function') loadInitialData();
        if (typeof renderManagementGrid === 'function') renderManagementGrid();
        if (typeof refreshClosureHistoryPanel === 'function') refreshClosureHistoryPanel();
        if (typeof renderLocationCards === 'function') renderLocationCards();
        if (typeof updateStats === 'function') updateStats();
    }, 120);
}

// Init
buildIndexes();
setTimeout(() => {
    document.documentElement.setAttribute('lang', currentLang);
    const activeBtn = document.querySelector(`.lang-btn[data-lang="${currentLang}"]`);
    if (activeBtn) {
        document.querySelectorAll('.lang-btn').forEach((b) => b.classList.remove('active'));
        activeBtn.classList.add('active');
    }
    translatePage();
    observeI18n();
    validateI18n();
}, 60);

// ============================================
// THEME TOGGLE
// ============================================
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);

function updateThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeToggle();
});

updateThemeToggle();

// ============================================
// START
// ============================================
document.addEventListener('DOMContentLoaded', initialize);

// No se exportan a window: openTrainingReports, closeTrainingReports,
// renderTrainingReports y exportTrainingReportCSV son declaraciones de funcion
// de nivel superior, asi que ya existen como window.*. Si se asignaran aqui
// ("window.openTrainingReports = () => openTrainingReports()") el nombre
// resolveria a si mismo y se produciria recursion infinita.
