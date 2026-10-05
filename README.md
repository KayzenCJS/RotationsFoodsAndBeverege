# Storyland RF

Sistema de gestión de personal para StoryLand NH, con soporte para Foods y Retail.

## Estructura

- `index.html`, `style.css`, `script.js`, `api.js`: frontend
- `backend/`: API Node.js/Express + conexión PostgreSQL
- `database/`: scripts SQL para crear y poblar las bases

## Puerto por defecto

- Backend/API: `http://localhost:3002`
- API key: `/api`
- Health check: `/health`

## Correr localmente

```bash
cd backend
npm install
node server.js
```

Luego abre:

```text
http://localhost:3002
```

## Variables de entorno

Crea `backend/.env` con:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
FOODS_DB_NAME=storyland_foods
RETAIL_DB_NAME=storyland_retail
PORT=3002
```

## Docker

```bash
docker compose up --build
```

Luego:

```text
http://localhost:8080
```

## Despliegue en la nube

### Opción simple: Railway / Render

1. Sube el proyecto a GitHub.
2. Crea dos bases PostgreSQL en Railway/Render:
   - `storyland_foods`
   - `storyland_retail`
3. Crea un servicio backend apuntando a `backend/Dockerfile` o a `backend/server.js`.
4. Configura variables de entorno como arriba.
5. Inicializa las bases con los scripts de `database/`.
6. Abre la URL pública del servicio backend.

### Frontend separado

Si el frontend se hospeda aparte, define en `index.html`:

```js
window.API_BASE_URL = 'https://tu-backend-url.com/api';
```

## Notas

- No subir `.env` ni credenciales al repositorio.
- El Docker original trae una configuración para correr todo junto, pero en la nube puede usarse la opción simple con backend público y PostgreSQL gestionado.
