# Storyland Docker Setup

This project can be run with Docker Compose.

## Requirements

- Docker Desktop installed and running

## Start everything

From the project root:

```bash
docker compose up --build
```

Then open:

- Web app: http://localhost:8080
- Backend health: http://localhost:3001/health
- PostgreSQL from host: localhost:5433

The frontend uses `http://localhost:3002/api` when opened on localhost, and `/api` on the same origin when opened from another device/IP.

## Stop

```bash
docker compose down
```

To remove the database volume too:

```bash
docker compose down -v
```

## Tablets / Phones

If the PC running Docker is on the same Wi-Fi network as the tablet/phone, find the PC's local IP address and open:

```text
http://YOUR_PC_IP:8080
```

Example:

```text
http://192.168.1.50:8080
```

Docker itself is usually not practical to run directly on phones/tablets, but the web app can be accessed from their browsers.
