# Singr Platform — Production Deployment Guide

This guide provides a comprehensive, step-by-step walkthrough to deploy the **Singr Platform** on your live production server using **Docker Compose** and **Nginx Proxy Manager**.

---

## 1. Prerequisites

Ensure your production server has the following components installed:
*   **Docker** (v20.10.0 or later)
*   **Docker Compose** (V2 compose plugin)
*   **Nginx Proxy Manager** (running in its own container or installed on the host)

---

## 2. Nginx Proxy Manager Domain Configuration

Nginx Proxy Manager terminates SSL (Let's Encrypt certificates) and routes external DNS traffic into the custom exposed ports on your host machine.

> [!IMPORTANT]
> When proxying the API domain (`api.singrkaraoke.com`), you **MUST toggle ON "Websockets Support"** in your Nginx Proxy Manager Proxy Host settings. Real-time request queues and synchronization depend on persistent WebSockets!

### Domain Routing Maps

Set up Nginx Proxy Manager Hosts pointing to the following local host ports:

| External Subdomain | Internal Host Port | Notes / NPM Settings |
| :--- | :--- | :--- |
| **`singrkaraoke.com`** *(Marketing Site)* | **`53010`** | Serves static Astro landing pages |
| **`api.singrkaraoke.com`** *(API Server)* | **`53001`** | **Websockets Support: ON** |
| **`host.singrkaraoke.com`** *(Host Console)* | **`53011`** | Server-side rendered Next.js App |
| **`app.singrkaraoke.com`** *(Singer Web App)* | **`53012`** | Serves Framework7 React client SPA |
| **`admin.singrkaraoke.com`** *(Admin Console)* | **`53013`** | Server-side rendered Next.js App |

---

## 3. Environment Variables Setup (`.env`)

Create a `.env` file in the project root of your server. This file defines all system secret tokens, external API keys, and internal docker bridge connection links.



## 4. Step-by-Step Deployment Commands

Run these terminal commands on your production server from the project root folder:

### Step 1: Build & Start Services
Build all Dockerfiles and spin up backend API, databases, Redis, and all frontend web portals in detached background mode.

If your version of Docker Compose is older and throws `unknown flag: --profile`, use the **highly compatible direct service list** instead:
```bash
docker compose up -d --build api-node web-marketing web-host web-admin mobile-singer
```

Alternatively, you can run it using the `COMPOSE_PROFILES` environment variable:
```bash
COMPOSE_PROFILES=frontend docker compose up -d --build
```

### Step 2: Confirm Container Health
List all container statuses to ensure they are healthy:
```bash
docker compose ps
```

### Step 3: Run Database Migrations
Execute Prisma database migrations inside the active `api-node` container to instantiate the Postgres schema, trigger tsvectors, and load spatial indexers:
```bash
docker compose exec api-node pnpm --filter @singr/db migrate:deploy
```

### Step 4: Seed the Database
Seed the database with standard billing subscription tiers, configuration templates, and testing catalogs:
```bash
docker compose exec api-node pnpm --filter @singr/db seed
```

---

## 5. Operations & Troubleshooting

Here are the most useful commands to manage your production cluster:

*   **View Real-Time Logs:**
    To inspect what the Express API is doing or debug auth exchanges:
    ```bash
    docker compose logs -f api-node
    ```
*   **Database Host Direct Tunnel:**
    If you want to connect a graphical database interface (like DBeaver or TablePlus) directly to the Postgres instance from your host, connect to `localhost` on exposed port **`55432`** using the user `singr` and your configured password.
*   **Restart a Specific Service:**
    ```bash
    docker compose restart api-node
    ```
*   **Shut Down the Stack:**
    To gracefully stop all services without losing any persistent volume data:
    ```bash
    docker compose down
    ```
