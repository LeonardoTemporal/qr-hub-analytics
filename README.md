[Leer en Español](README-es.md)

# QR-Hub Analytics

A self-hosted platform for managing dynamic QR codes, instant HTTP redirects, and scan analytics collection. Designed for deployment on private infrastructure using Dokploy or any Docker-compatible environment.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Environment Variables](#environment-variables)
5. [Installation and Setup](#installation-and-setup)
   - [Local Development](#local-development)
   - [Production Deployment on a VPS with Dokploy](#production-deployment-on-a-vps-with-dokploy)
6. [GeoIP Database Setup](#geoip-database-setup)
7. [Usage](#usage)
8. [Project Structure](#project-structure)
9. [Design Decisions](#design-decisions)

---

## System Architecture

The system is composed of four containerized services orchestrated via Docker Compose and connected over a private internal network (`qrhub_net`).

```
Physical QR Code
      |
      | HTTP GET /r/{campaign_id}
      v
  [ backend ]  <-- FastAPI (port 8000)
      |         1. Returns 302 Redirect immediately (zero latency for end user)
      |         2. BackgroundTask: GeoIP lookup + User-Agent parse + INSERT into db
      v
  [  db  ]  <-- PostgreSQL 15 (internal only)
      |         Stores scan records in the "scans" table
      v
  [ metabase ]  <-- Metabase BI (port 3001)
                    Connects directly to db for dashboards and reports

  [ frontend ]  <-- Next.js 16 (port 3000)
                    User lands here after the 302 redirect
                    Renders a Linktree-style link menu
                    Fires a GA4 page_view event on load
```

### Service Responsibilities

| Service    | Image / Build         | Role                                              |
|------------|-----------------------|---------------------------------------------------|
| `db`       | `postgres:15-alpine`  | Persistent storage for scan analytics             |
| `backend`  | `./backend`           | QR redirect handler and analytics ingestion       |
| `frontend` | `./frontend`          | Campaign landing page (Linktree-style UI)         |
| `metabase` | `metabase/metabase`   | BI dashboard connected to the PostgreSQL database |

---

## Tech Stack

| Layer        | Technology                                     |
|--------------|------------------------------------------------|
| Backend      | Python 3.12, FastAPI, SQLAlchemy 2 (async)     |
| Database     | PostgreSQL 15, asyncpg driver                  |
| Frontend     | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Analytics    | Metabase (self-hosted), Google Analytics 4     |
| GeoIP        | MaxMind GeoLite2-City                          |
| Containers   | Docker, Docker Compose                         |
| Deployment   | Dokploy (or any Docker host)                   |

---

## Prerequisites

- Docker >= 24.0
- Docker Compose >= 2.20 (bundled with Docker Desktop)
- A free MaxMind account to download the GeoLite2-City database
  - Registration: https://www.maxmind.com/en/geolite2/signup
- (Optional) A Google Analytics 4 property for frontend tracking

---

## Environment Variables

All variables are declared in the root `.env` file (copied from `.env.example`).

### PostgreSQL

| Variable            | Description                     | Example                    |
|---------------------|---------------------------------|----------------------------|
| `POSTGRES_USER`     | Database superuser name         | `qrhub`                    |
| `POSTGRES_PASSWORD` | Database superuser password     | `change_me_in_production`  |
| `POSTGRES_DB`       | Database name                   | `qrhub`                    |

### Backend (FastAPI)

| Variable       | Description                                                 | Example                  |
|----------------|-------------------------------------------------------------|--------------------------|
| `FRONTEND_URL` | Base URL of the frontend service (used to build redirects)  | `https://yourdomain.com` |

> The `DATABASE_URL` variable is assembled automatically inside `docker-compose.yml` from the PostgreSQL variables. Manual configuration is not required.

### Frontend (Next.js)

| Variable               | Description                                             | Example                      |
|------------------------|---------------------------------------------------------|------------------------------|
| `NEXT_PUBLIC_API_URL`  | Publicly reachable URL of the backend API               | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_GA4_ID`   | Google Analytics 4 Measurement ID. Leave empty to skip  | `G-XXXXXXXXXX`               |

> `NEXT_PUBLIC_*` variables are embedded at build time by Next.js. They must be set before running `docker compose up --build`.

---

## Installation and Setup

This section covers two deployment paths: **local development** and **production on a VPS using Dokploy**.

---

### Local Development

#### 1. Clone the repository

```bash
git clone https://github.com/your-org/qr-hub-analytics.git
cd qr-hub-analytics
```

#### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and replace all placeholder values with production credentials.
Pay special attention to `POSTGRES_PASSWORD` — use a strong, randomly generated value.

#### 3. Set up the GeoIP database

See the [GeoIP Database Setup](#geoip-database-setup) section below.

#### 4. Build and start all services

```bash
docker compose up -d --build
```

This command will:

- Build the FastAPI backend image from `./backend/Dockerfile`
- Build the Next.js frontend image from `./frontend/Dockerfile` (multi-stage standalone build)
- Pull `postgres:15-alpine` and `metabase/metabase:latest` from Docker Hub
- Start all four containers connected to the `qrhub_net` internal network
- Run database schema creation automatically on backend startup (via SQLAlchemy `create_all`)

#### 5. Verify all services are healthy

```bash
docker compose ps
```

All services should show status `running` or `healthy` within 30 seconds.

```bash
# Check backend logs
docker compose logs backend

# Check database connectivity
docker compose exec db psql -U qrhub -d qrhub -c "\dt"
```

---

### Production Deployment on a VPS with Dokploy

Dokploy is a self-hosted PaaS that manages Docker Compose stacks on a Ubuntu/Debian VPS. The steps below assume a fresh VPS with Dokploy already installed.

Dokploy installation reference: https://dokploy.com/docs/get-started

#### Step 1 — Push the repository to GitHub

Ensure `.env`, `backend/data/`, and all entries in `.gitignore` are excluded before committing.

```bash
git add .
git commit -m "Initial production release"
git push origin main
```

#### Step 2 — Create a new Compose service in Dokploy

1. Log in to the Dokploy dashboard (default: `http://<server-ip>:3000`).
2. Navigate to **Projects > New Project**, then **Add Service > Docker Compose**.
3. Connect your GitHub account and select the `qr-hub-analytics` repository.
4. Set the **branch** to `main` and the **Compose file path** to `docker-compose.yml`.

#### Step 3 — Configure environment variables

In the Dokploy service panel, go to the **Environment** tab and add each variable individually, or paste the contents of your `.env` file using the bulk editor:

```
POSTGRES_USER=qrhub
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=qrhub
FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
```

> Variables marked `NEXT_PUBLIC_*` are embedded at build time. After changing them, a full rebuild (`Deploy > Rebuild`) is required.

#### Step 4 — Upload the GeoIP database to the server

The `GeoLite2-City.mmdb` file must be placed on the VPS host before the backend container starts. It is injected via a bind mount and never baked into the image.

```bash
# On your local machine: copy the file to the server
scp GeoLite2-City.mmdb user@<server-ip>:/opt/qr-hub-analytics/backend/data/GeoLite2-City.mmdb
```

Alternatively, use any SFTP client (FileZilla, Cyberduck, etc.) to transfer the file.

Verify the path on the server matches the bind mount in `docker-compose.yml`:

```yaml
volumes:
  - ./backend/data:/app/data:ro
```

Dokploy clones the repository to a directory under `/etc/dokploy/` by default. The exact path is visible in the **General** tab of the service panel under **Source path**. Place the `.mmdb` file in the `backend/data/` subdirectory of that path.

#### Step 5 — Deploy

Click **Deploy** in the Dokploy service panel. Dokploy will:

1. Pull the latest code from GitHub.
2. Build both Docker images (`backend` and `frontend`).
3. Pull `postgres:15-alpine` and `metabase/metabase:latest`.
4. Start all containers in dependency order (`db` -> `backend` -> `frontend`, `metabase`).

Monitor progress in the **Logs** tab of the Dokploy panel.

#### Step 6 — Configure domains and HTTPS

In the Dokploy panel, go to the **Domains** tab for each service and assign your custom domains:

| Service    | Suggested domain             |
|------------|------------------------------|
| `frontend` | `yourdomain.com`             |
| `backend`  | `api.yourdomain.com`         |
| `metabase` | `analytics.yourdomain.com`   |

Dokploy integrates with Traefik and provisions Let's Encrypt TLS certificates automatically.

After assigning domains, update `FRONTEND_URL` and `NEXT_PUBLIC_API_URL` in the environment panel to use `https://` URLs and trigger a rebuild.

---

## GeoIP Database Setup

Country and city resolution is powered by the MaxMind GeoLite2-City database.
The database file must be placed at `./backend/data/GeoLite2-City.mmdb` before starting the backend container.

### Steps

1. Create a free MaxMind account at https://www.maxmind.com/en/geolite2/signup

2. Log in and navigate to:
   **Account > Download Files > GeoLite2 City > Download GZIP**

3. Extract the `.mmdb` file and move it to the correct path:

```bash
mkdir -p backend/data
mv GeoLite2-City_YYYYMMDD/GeoLite2-City.mmdb backend/data/GeoLite2-City.mmdb
```

4. Verify the file is in place:

```bash
ls -lh backend/data/GeoLite2-City.mmdb
```

The file is mounted as a read-only volume inside the backend container at `/app/data/GeoLite2-City.mmdb`.

> If the file is not present, the backend will start normally and log a warning. Country and city fields will be stored as `NULL`. The redirect endpoint will continue to function without interruption.

---

## Usage

### Frontend — Campaign Landing Pages

After startup, each campaign is accessible at:

```
http://localhost:3000/{campaign_id}
```

Example:

```
http://localhost:3000/mi-negocio
```

To add or modify campaigns, edit `frontend/lib/campaigns.ts`.
This file currently acts as a static data repository and can be replaced with a `fetch()` call to the backend API without modifying any page or component.

### Backend API — QR Redirect Endpoint

The redirect endpoint is the destination URL encoded in every physical QR code:

```
GET http://localhost:8000/r/{campaign_id}
```

**Response:** `302 Found` with `Location` header pointing to the frontend campaign page.

The scan record (IP, country, city, device type, OS, browser, timestamp) is written to PostgreSQL asynchronously after the response is sent.

**Additional endpoints:**

| Method | Path      | Description                  |
|--------|-----------|------------------------------|
| GET    | /health   | Service health check         |
| GET    | /docs     | Swagger UI (OpenAPI 3.1)     |
| GET    | /redoc    | ReDoc documentation          |

### Metabase — BI Dashboard

Metabase is available at:

```
http://localhost:3001
```

On first access, the Metabase setup wizard will guide you through creating an admin account.

To connect Metabase to the PostgreSQL database, use the following connection parameters in the wizard:

| Field    | Value                                    |
|----------|------------------------------------------|
| Type     | PostgreSQL                               |
| Host     | `db`                                     |
| Port     | `5432`                                   |
| Database | value of `POSTGRES_DB` in your `.env`    |
| Username | value of `POSTGRES_USER` in your `.env`  |
| Password | value of `POSTGRES_PASSWORD` in `.env`   |

Once connected, you can query the `scans` table and build dashboards for:

- Scans per campaign over time
- Geographic distribution (country, city)
- Device type breakdown (mobile, tablet, desktop)
- Browser and OS analytics

---

## Project Structure

```
qr-hub-analytics/
|-- docker-compose.yml          # Service orchestration
|-- .env.example                # Environment variable template
|-- README.md
|
|-- backend/
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- .env.example
|   |-- data/                   # Mount point for GeoLite2-City.mmdb
|   `-- app/
|       |-- main.py             # FastAPI application entry point
|       |-- config.py           # Settings via pydantic-settings
|       |-- database.py         # Async engine, session factory, get_db()
|       |-- models.py           # SQLAlchemy ORM: Scan table
|       |-- routers/
|       |   `-- redirect.py     # GET /r/{campaign_id} with BackgroundTask
|       `-- services/
|           |-- geo_service.py  # GeoLite2 IP resolution (IGeoService protocol)
|           `-- ua_service.py   # User-Agent parsing (device, OS, browser)
|
`-- frontend/
    |-- Dockerfile              # Multi-stage standalone build
    |-- .env.example
    |-- next.config.ts          # output: "standalone"
    |-- app/
    |   |-- layout.tsx          # Root layout with GA4 script tags
    |   |-- page.tsx            # Root redirect to demo campaign
    |   `-- [campaign_id]/
    |       `-- page.tsx        # Dynamic campaign page (RSC + generateMetadata)
    |-- components/
    |   |-- GA4PageView.tsx     # Client component: fires gtag page_view event
    |   |-- LinkCard.tsx        # Accessible link button (WCAG 2.5.5 tap target)
    |   `-- ProfileHeader.tsx   # Avatar, display name, and bio
    |-- lib/
    |   `-- campaigns.ts        # Campaign data repository
    `-- types/
        `-- campaign.ts         # CampaignData and SocialLink type definitions
```

---

## Design Decisions

### Zero-latency redirects

The `GET /r/{campaign_id}` endpoint returns the `302` response before any I/O occurs.
GeoIP resolution, User-Agent parsing, and the PostgreSQL `INSERT` are executed inside a FastAPI `BackgroundTask` that runs after the HTTP response has been dispatched to the client.
The background task opens its own database session (`AsyncSessionLocal`) to avoid using the already-closed request-scoped session.

### Silent failure in analytics

The entire analytics pipeline inside the background task is wrapped in a `try/except` block.
A failure in GeoIP lookup, User-Agent parsing, or database persistence will be logged at `ERROR` level but will never propagate an exception to the user or interrupt the redirect flow.

### SOLID principles in the backend

| Principle | Implementation |
|-----------|----------------|
| Single Responsibility | `geo_service.py`, `ua_service.py`, `database.py`, and `redirect.py` each have one reason to change |
| Open/Closed | `GeoLite2Service` implements the `IGeoService` `Protocol`. A new provider can be substituted without modifying the router |
| Dependency Inversion | The router depends on the `IGeoService` abstraction, not on the concrete `GeoLite2Service` implementation |

### Standalone Next.js output

`output: "standalone"` in `next.config.ts` enables Next.js to emit a self-contained `server.js` entry point with only the production dependencies required at runtime.
Combined with a multi-stage Docker build (deps / builder / runner stages on `node:20-alpine`), the final image is significantly smaller than a standard Node.js build.

### GA4 integration architecture

The GA4 `<Script>` tags are rendered in the root `layout.tsx` as Server Components using `strategy="afterInteractive"`, which defers script loading until after page hydration and avoids blocking Largest Contentful Paint.
The `GA4PageView` component is a minimal Client Component that fires a `gtag("event", "page_view")` call on mount, allowing each campaign page to report its own `campaign_id` as a custom dimension without requiring a full page navigation.
