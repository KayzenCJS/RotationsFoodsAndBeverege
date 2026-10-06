# Desplegando Storyland RF

## Opción recomendada: Railway / Render

### 1. Subir el código a GitHub
Asegúrate de subir estos archivos:
- `index.html`
- `style.css`
- `script.js`
- `api.js`
- `backend/`
- `database/`
- `docker-compose.yml`
- `backend/Dockerfile`

### 2. Crear dos bases de datos PostgreSQL en la nube
Crea dos DSN:
- `storyland_foods`
- `storyland_retail`

Ejemplo con Render/Railway: crea dos bases PostgreSQL.

### 3. Configurar variables de entorno del backend
En el servicio de backend:
```env
DB_HOST=tu_host_postgres
DB_PORT=5432
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_password_postgres
FOODS_DB_NAME=storyland_foods
RETAIL_DB_NAME=storyland_retail
PORT=3001
```

### 4. Importar/inicializar la base de datos
Usa el script `database/create_databases.sql` o importa los SQL de `database/`.

### 5. Desplegar backend
Apunta el servicio al Dockerfile del directorio `backend/`.

### 6. Desplegar frontend
El backend ya sirve el frontend desde `server.js`, por lo que normalmente no necesitas un servicio estático separado.

Abre la URL pública de tu servicio de backend.

---

## Opción rápida: ngrok / Cloudflare Tunnel
Si solo quieres una prueba temporal:
1. Corre el backend local: `node backend/server.js`
2. Expón el puerto 3002 con ngrok o Cloudflare.
3. Comparte el enlace público.

Solo funcionará mientras tu máquina esté encendida.
