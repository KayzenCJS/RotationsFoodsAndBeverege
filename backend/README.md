# StoryLand Backend - PostgreSQL Setup

Este backend organiza la base de datos en PostgreSQL con dos bases de datos separadas: una para Food & Beverage y otra para Retail. Cada locación tiene su propia tabla de asignaciones.

## 📁 Estructura de Base de Datos

### Base de Datos: `storyland_foods`
- **employees**: Empleados de Food & Beverage
- **employee_trainings**: Capacitaciones de empleados
- **employee_availability**: Disponibilidad de empleados
- **locations**: Locaciones de Food & Beverage (12 locaciones)
- **location_required_roles**: Roles requeridos por locación
- **assignments**: Asignaciones generales
- **tasks**: Tareas
- **Tablas por building**: 12 tablas específicas para cada locación

### Base de Datos: `storyland_retail`
- **employees**: Empleados de Retail
- **employee_trainings**: Capacitaciones de empleados
- **employee_availability**: Disponibilidad de empleados
- **locations**: Locaciones de Retail (5 locaciones)
- **location_required_roles**: Roles requeridos por locación
- **assignments**: Asignaciones generales
- **tasks**: Tareas
- **Tablas por building**: 5 tablas específicas para cada locación

## 🏢 Tablas por Building

### Food & Beverage (12 tablas):
1. `pixie_kitchen_assignments`
2. `barnyard_pizza_assignments`
3. `guard_house_snacks_assignments`
4. `food_fair_assignments`
5. `dutch_village_ice_cream_assignments`
6. `slush_factory_assignments`
7. `dippin_dots_assignments`
8. `sandwich_oasis_assignments`
9. `farm_stand_assignments`
10. `world_pavilion_assignments`
11. `teddys_oasis_assignments`
12. `poblano_cantina_assignments`

### Retail (5 tablas):
1. `stockyard_assignments`
2. `lets_pretend_assignments`
3. `miss_muffets_market_assignments`
4. `yum_yum_junction_assignments`
5. `whistle_stop_assignments`

## 🚀 Instalación

### 1. Instalar PostgreSQL
```bash
# Windows: Descargar desde https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql postgresql-contrib
```

### 2. Crear bases de datos
```bash
# Conectar a PostgreSQL
psql -U postgres

# Ejecutar el script de schema
\i database/schema.sql
```

### 3. Instalar dependencias del backend
```bash
cd backend
npm install
```

### 4. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

### 5. Iniciar el servidor
```bash
npm start
# o para desarrollo con auto-reload
npm run dev
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Empleados
```
GET  /api/:type/employees           # Obtener todos (type: foods|retail)
GET  /api/:type/employees/:id       # Obtener uno
POST /api/:type/employees           # Crear
PUT  /api/:type/employees/:id       # Actualizar
DELETE /api/:type/employees/:id     # Eliminar
```

### Locaciones
```
GET /api/:type/locations            # Obtener todas
GET /api/:type/locations/:id        # Obtener una
```

### Asignaciones
```
GET    /api/:type/assignments                    # Obtener todas
GET    /api/:type/locations/:locationId/assignments  # Asignaciones por locación
GET    /api/:type/buildings/:locationId/assignments   # Asignaciones específicas del building
POST   /api/:type/assignments                    # Crear asignación
POST   /api/:type/buildings/:locationId/assignments   # Crear asignación específica
DELETE /api/:type/assignments/:id                # Eliminar asignación
```

### Tareas
```
GET    /api/:type/tasks              # Obtener todas
POST   /api/:type/tasks              # Crear
PUT    /api/:type/tasks/:id          # Actualizar
DELETE /api/:type/tasks/:id          # Eliminar
```

## 🔧 Ejemplos de Uso

### Obtener empleados de Foods
```bash
curl http://localhost:3001/api/foods/employees
```

### Obtener asignaciones de un building específico
```bash
curl http://localhost:3001/api/foods/buildings/barnyard-pizza/assignments
```

### Crear asignación en tabla específica
```bash
curl -X POST http://localhost:3001/api/foods/buildings/barnyard-pizza/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "role": "cook",
    "work_date": "2026-09-25",
    "shift_start": "09:00",
    "shift_end": "18:00"
  }'
```

## 📊 Ventajas de esta Arquitectura

1. **Separación de datos**: Foods y Retail en bases de datos separadas
2. **Escalabilidad**: Cada building tiene su propia tabla para asignaciones específicas
3. **Performance**: Índices optimizados para consultas frecuentes
4. **Flexibilidad**: Fácil agregar nuevos buildings o modificar existentes
5. **Seguridad**: Roles y restricciones a nivel de base de datos
6. **Backup**: Posibilidad de hacer backup por base de datos o por building

## 🔄 Migración desde localStorage

Para migrar los datos existentes desde localStorage a PostgreSQL:

1. Exportar datos desde la aplicación web actual
2. Usar el endpoint POST correspondiente para insertar en PostgreSQL
3. Actualizar el frontend para consumir la API en lugar de localStorage
