# StoryManager — Documentación del Proyecto

## 1. ¿De qué trata el proyecto?

**StoryManager** (también conocido como *Storyland RF*) es un sistema de gestión de personal para el grupo **StoryLand NH**, orientado principalmente a los departamentos de **Food & Beverage** y **Retail**.

El sistema permite:

- Gestionar el **capital humano** de las operaciones: empleados, roles, grupos, entrenamientos/certificaciones, disponibilidad y días libres.
- Gestionar **locaciones** (locales/ establecimientos) y sus **reglas de personal** (mínimos de cobertura por rol).
- Generar y **aprobar automáticamente** las **asignaciones de personal** a las localizaciones (Auto Assign).
- Controlar **turnos, descansos, horas extra, supervisores y notas** del calendario laboral.
- Exportar el **calendario / schedule** y **respaldar** la información.
- **Importar** datos masivos desde Excel (parser Quinyx) con validación y commit por lotes.
- Realizar **auditorías e inspecciones** (hallazgos, correcciones, inspectores) y su respaldo.

En el estado actual del repositorio existe además una **hoja de ruta** para integrar el motor con el sistema **"Cocina Control"** (y el proyecto asociado *Wastelog*) con el objetivo de unificar ambas plataformas en un único sistema.

---

## 2. Funcionalidades principales

### 2.1 Gestión de empleados

- CRUD completo de empleados (`GET/POST/PUT/DELETE /api/:type/employees`).
- Estados y campos de operación: rol, grupo operativo (`ops_group`), disponibilidad.
- Grupos de localización (`location_groups`) y grupos de empleados (`employee_groups`).
- Entrenamientos por empleado (`employee_trainings`) y por empleado + localización (`employee_location_training`, endpoint `.../employees/:id/training-locations`).
- Reporte de entrenamientos (`.../employees-training-report`).
- Días libres: recurrentes (`employee_availability.days_off`) y excepciones por empleado (`employee_day_off_exceptions`).

### 2.2 Localizaciones y asignaciones

- Entidades de `locations` (con `is_active`) y `location_disables` (deshabilitaciones con fecha, útil para cierres temporales y desbloqueo automático).
- Asignaciones de personal (`assignments`) con tipos (`LOCATION`, `NOSTALGIA_NIGHT`, etc.), intervalos de inicio/fin, categorías.
- Reglas de cobertura (`staffing_rules`): mínimos por localización y rol; validación (`/staffing-rules/validate/:locationId`).
- Supervisores (`supervisor_assignments`).
- Historial de asignaciones (`assignment-history`) y horas de trabajo (`work_hours`).
- Notas de schedule (`schedule_notes`) y tareas (`tasks`).

### 2.3 Auto Assign (asignación automática)

Módulos: `backend/auto-assign.js` (motor puro) y `backend/auto-assign-routes.js` (endpoints).

- Endpoints:
  - `POST /api/:type/auto-assign/preview` → genera una **propuesta** (no escribe nada).
  - `POST /api/:type/auto-assign/apply` → **guarda** la propuesta, revalidando conflictos.
- Flujo: **proponer → resumir → guardar (con revalidación)**.

Comportamiento del motor:

- Calcula la **carga real del día** a partir de los compromisos existentes (`unicos`) y pondera la experiencia por localización (`historiales`, +12 pts por local visitado).
- Respeta **días libres**, **certificaciones** (NH Alcohol, Food Safety, etc.), **entrenamiento** (`config.entrenamientoObligatoria` con modo estricto), **conflictos** de turnos, **turnos nocturnos**, **descansos** (`self`/`covered`), **horas extra**, **intercambios**, **locales cerrados** y **deshabilitaciones**.
- Estrategia: asigna por **escasez**, con pasada de reparación y optimización para evitar locales vacíos cuando haya personal disponible.
- Informa de **posiciones sin cubrir** y el **motivo** (`sinCubrir`, `sinCubrirPorque`, candidatos que podrían ocupar el hueco).
- Devuelve un resumen con: `asignaciones`, `intercambios`, `totalPuestos`, `totalCubiertos`, `sinCubrir`, `porLocalizacion`, `incompletas`, `sinRegla`, `minimosCubiertos`, `todoCubierto`, `descartes`, `compromisos`, `compromisosDuplicados`, `sinVentana`.

Estados de una localización en la propuesta:

- **Open** — abierta y disponible.
- **Closed** — deshabilitada expresamente para la fecha.
- **No staffing rule** — activa pero sin mínimo de personal configurado (estado distinto; no se trata como cerrada ni como cubierta).
- **Met** — cumple los mínimos configurados.
- **Understaffed** — abierta con posiciones requeridas sin cubrir.

Regla clave: `todoCubierto` solo es verdadero si los mínimos configurados están cubiertos **y** no existen localizaciones activas sin regla.

### 2.4 Descansos y horas

- Gestión de breaks (`/api/:type/breaks`, upsert por `assignment_id`, tipos `self` / `covered`).
- Horas extra y sincronización (`extra-hours-sync`).

### 2.5 Schedule / exportación / backups / inspecciones / imports

- `schedule-categories`, `schedule-notes`, `tasks`.
- Exportación de schedule (`schedule-export*`).
- Backups (`backup`, `backup_table`, `backup_inspections`, `make_backup`).
- Inspecciones (`inspections*`, `inspection_findings`, `corrections`, `inspectors`).
- Imports (`import/validate`, `import/commit`, `import/history`) con parser Quinyx (`quinyx-parser.js`) e import service.

---

## 3. Estructura del repositorio

```
Storyland RF/
├── index.html            # Frontend (shell)
├── style.css             # Estilos
├── script.js             # Lógica frontend principal + i18n (ES/EN)
├── api.js                # Cliente API frontend
├── auto-assign-module.js   # Módulo UI de Auto Assign
├── breaks-ui.js          # UI de descansos
├── dias-libres-ui.js     # UI de días libres
├── excel-import.js / excel-import-ui.js
├── inspections-module.js / inspections-combo.js / inspections-pdf.js
├── quinyx-parser.js      # Parser de Excel de Quinyx
├── queries.js
├── backend/              # API Node.js/Express + PostgreSQL
├── database/              # Scripts SQL
├── vendor/, docker-compose.yml, Dockerfile.frontend, nginx.conf, DEPLOY.md, DOCKER.md
└── mapstoryland.pdf
```

---

## 4. Arquitectura

- **Frontend**: estático (HTML/CSS/JS vanilla), servido por Express desde la raíz del repo (`express.static`).
- **Backend**: Node.js + Express (`backend/server.js`), conexión a PostgreSQL mediante `backend/db.js` (pools por base: `storyland_foods`, `storyland_retail`).
- **Base de datos**: PostgreSQL. Scripts en `database/*.sql` (schema, tablas por dominio, inserts de localizaciones, tablas adicionales).
- **API**: REST bajo `/api/:type/...` (`foods` | `retail`) + health check `/health`.

---

## 5. Puesta en marcha

- Backend: `cd backend && node server.js` → `http://localhost:3002`
- Frontend: se sirve en `http://localhost:3002`
- API base: `http://localhost:3002/api/foods` y `http://localhost:3002/api/retail`
- Variables de entorno (`backend/.env`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `FOODS_DB_NAME`, `RETAIL_DB_NAME`, `PORT`.
- Docker: `docker compose up --build` → `http://localhost:8080`

---

## 6. Estado actual (resumen)

- Backend operativo: `GET /health` → `200 {"status":"ok","databases":["storyland_foods","storyland_retail"]}`.
- Frontend servido por el mismo backend.
- Backup `/api/foods/backup` y `/api/retail/backup` → 200.
- Integridad de BD: sin problemas (`backend/verify_db_integrity.js`).
- Auto Assign: tests `backend/test-auto-assign.js` (95/95) y `backend/test-auto-assign-routes.js` (60/60) en verde.

---

## 7. Documentación derivada

Este documento describe el alcance funcional. Los detalles operativos viven en:

- `README.md` — arranque rápido y variables de entorno.
- `DEPLOY.md`, `DOCKER.md` — despliegue.
- Comentarios en código — especialmente `backend/auto-assign.js`, `backend/auto-assign-routes.js` y `auto-assign-module.js`.

---

## 8. Pendientes conocidos

- Integración futura con **Cocina Control** / **Wastelog** (fusión de sistemas).
- Algunas pruebas de schedule (`test-schedule-roundtrip.js`, `test-schedule-sections.js`) presentan fallos preexistentes.
- Decisión pendiente sobre estrategia de integración con el otro proyecto.
