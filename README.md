# 7Fitment — Plataforma de Analíticas QR y Portal Digital de Cliente

Plataforma autoalojada de gestión de campañas QR, redirección HTTP de latencia cero, recolección de analíticas geoespaciales y portal privado de cliente por vehículo. Diseñada y operada para **7Fitment**, taller de personalización automotriz premium (PPF, Wraps vinílicos y Detailing de ultralujo) con sede en Satélite, Estado de México.

---

## Tabla de Contenidos

1. [Vision General del Sistema](#1-vision-general-del-sistema)
2. [Arquitectura](#2-arquitectura)
3. [Stack Tecnologico](#3-stack-tecnologico)
4. [Modulos Funcionales](#4-modulos-funcionales)
   - 4.1 [Motor de Redireccion QR](#41-motor-de-redireccion-qr)
   - 4.2 [Geolocalización Dual](#42-geolocalizacion-dual)
   - 4.3 [Dashboard de Analíticas](#43-dashboard-de-analiticas)
   - 4.4 [7F Digital Garage](#44-7f-digital-garage)
5. [Modelo de Datos](#5-modelo-de-datos)
6. [Referencia de la API](#6-referencia-de-la-api)
7. [Variables de Entorno](#7-variables-de-entorno)
8. [Instalacion y Desarrollo Local](#8-instalacion-y-desarrollo-local)
9. [Despliegue en Produccion con Dokploy](#9-despliegue-en-produccion-con-dokploy)
10. [Base de Datos GeoIP](#10-base-de-datos-geoip)
11. [Estructura del Proyecto](#11-estructura-del-proyecto)
12. [Decisiones de Diseño](#12-decisiones-de-diseno)

---

## 1. Vision General del Sistema

**7Fitment QR Hub** es una solución de software integral que permite al taller imprimir códigos QR físicos en vehículos, tarjetas de presentación y materiales de marketing. Cuando un cliente escanea un QR, el sistema:

1. Emite una redirección HTTP `302` en tiempo mínimo (sin bloquear la experiencia del usuario).
2. Registra en segundo plano el evento de escaneo con datos geográficos, de dispositivo y campaña.
3. Ofrece al cliente una página de destino con los canales de contacto del taller.
4. Presenta, de forma optativa, una galería pública del trabajo realizado en el vehículo (Showcase).
5. Permite al cliente autenticarse con un PIN para acceder a su expediente privado (garantías, instrucciones de cuidado, registros de servicio).

El dashboard administrativo consolida todos los eventos de escaneo en KPIs, distribuciones geográficas, líneas de tiempo y tablas detalladas, accesibles solo con credenciales de administrador.

---

## 2. Arquitectura

```
Código QR físico
      |
      | GET /r/{campaign_id}
      v
┌─────────────────────────────┐
│   backend  (FastAPI :8000)  │
│                             │
│  1. → 302 REDIRECT (inmediato, sin I/O)
│  2. BackgroundTask (async): │
│       • GeoIP lookup        │
│       • UA parse            │
│       • INSERT → PostgreSQL │
└────────────┬────────────────┘
             │
      ┌──────┴──────┐
      │     db      │  PostgreSQL 15
      │ (interno)   │  Tablas: scans, clients, vehicles,
      └──────┬──────┘  vehicle_qr_codes, service_records, service_media
             │
      ┌──────┴──────────────────────────┐
      │  frontend  (Vite/React :3000)   │
      │                                 │
      │  /             Landing page     │
      │  /enlaces      QR landing + soft│
      │                prompt geo       │
      │  /auto/{slug}  Showcase público │
      │  /portal       Auth por PIN     │
      │  /portal/garage  Expediente     │
      │  /dashboard    Admin analytics  │
      └─────────────────────────────────┘

      ┌──────────────┐
      │   metabase   │  BI Dashboards (:3001)
      │  (opcional)  │  Conectado directamente a db
      └──────────────┘

      Traefik (Dokploy) ── TLS Let's Encrypt
        7fitment.com
        admin.7fitment.com
        api.7fitment.com
```

### Responsabilidades por Servicio

| Servicio          | Imagen / Build         | Rol                                                   |
|-------------------|------------------------|-------------------------------------------------------|
| `db`              | `postgres:15-alpine`   | Almacenamiento persistente de analíticas y expedientes |
| `qrhub_backend`   | `./backend`            | API FastAPI: redirects, analíticas, garage, auth      |
| `qrhub_frontend`  | `./frontend`           | SPA React: landing, enlaces, showcase, portal, admin  |
| `metabase`        | `metabase/metabase`    | BI complementario sobre PostgreSQL (opcional)         |

---

## 3. Stack Tecnologico

| Capa               | Tecnologia                                                                  |
|--------------------|-----------------------------------------------------------------------------|
| **Backend**        | Python 3.12, FastAPI 0.110+, SQLAlchemy 2 (async), Uvicorn                 |
| **Base de datos**  | PostgreSQL 15, asyncpg, Alembic (migraciones versionadas)                  |
| **GeoIP**          | ip-api.com (HTTP, fallback silencioso), MaxMind GeoLite2-City (mmdb)       |
| **User-Agent**     | `python-user-agents` 2.2+                                                  |
| **Seguridad**      | PBKDF2-SHA256 + salt por PIN, Basic Auth HMAC para admin                   |
| **Frontend**       | React 19.2, Vite 7.2, TypeScript 5.9 (strict)                             |
| **Estilos**        | Tailwind CSS v4 (`@tailwindcss/vite`), DM Sans, JetBrains Mono             |
| **Animacion**      | GSAP 3.15 (SplitText, ScrollTrigger, Flip), Lenis 1.3.23                  |
| **Graficas**       | Recharts 3.8, Leaflet 1.9 (mapa de calor geo)                             |
| **Iconos**         | lucide-react 0.577                                                          |
| **Contenedores**   | Docker, Docker Compose                                                      |
| **Proxy / TLS**    | Traefik (integrado en Dokploy), Let's Encrypt                              |
| **Despliegue**     | Dokploy (self-hosted PaaS sobre VPS Ubuntu/Debian)                         |
| **Servidor web**   | Nginx (sirve el bundle Vite en produccion)                                  |

---

## 4. Modulos Funcionales

### 4.1 Motor de Redireccion QR

El endpoint `GET /r/{campaign_id}` es el URL que se codifica en los QR físicos. Su comportamiento es:

1. **Respuesta inmediata:** emite `302 Found` con `Location` apuntando al frontend (`/enlaces?scan={token}`). El `scan_token` es un UUID v4 generado en el momento y embebido en la URL de destino, lo que permite correlacionar el escaneo con la posterior lectura de geolocalización del navegador.

2. **BackgroundTask (post-response):** abre su propia sesión de base de datos y ejecuta:
   - Resolución GeoIP de la IP del cliente (con soporte para `X-Forwarded-For` de Traefik/Cloudflare).
   - Parsing del `User-Agent` para extraer tipo de dispositivo, sistema operativo y navegador.
   - `INSERT` en la tabla `scans`.

3. **Fallo silencioso:** cualquier excepción dentro del background task es capturada y registrada en el log sin propagar al usuario.

Campañas configuradas via variable de entorno `TRACKING_ANALYTICS_CAMPAIGNS` (slugs separados por coma). Las campañas no listadas son redirigidas a la URL de destino sin registrar analíticas.

### 4.2 Geolocalizacion Dual

La precisión geográfica se obtiene mediante dos fuentes complementarias:

| Fuente    | Metodo                         | Precision tipica | Momento                |
|-----------|--------------------------------|------------------|------------------------|
| `ip`      | ip-api.com (HTTP GET)          | Ciudad / Estado  | Background (post-302)  |
| `browser` | `navigator.geolocation` (HTML5)| 10–100 m (GPS)   | Opt-in, async          |
| `gps`     | Reservado para integracion futura | —             | —                      |

**Flujo de geolocalización del navegador:**

1. Al aterrizar en `/enlaces?scan={token}`, el componente `LocationSoftPrompt` muestra un panel no intrusivo solicitando permiso de ubicacion.
2. Si el usuario acepta, se invoca `navigator.geolocation.getCurrentPosition()`.
3. Las coordenadas se envian via `POST /api/analytics/browser-location` con el `scan_token`.
4. El backend actualiza el registro existente en `scans`, calcula geohashes de precision 5 y 7, e invoca Nominatim para reverse-geocoding (país/estado/ciudad).
5. Si el usuario rechaza, se almacena la preferencia en `localStorage` (`location_permission_granted=false`) y no se vuelve a solicitar.

Las coordenadas se indexan con un índice parcial `(latitude, longitude) WHERE latitude IS NOT NULL` y con índices `geo_hash_5` y `geo_hash_7` para agrupamiento de densidad geoespacial.

### 4.3 Dashboard de Analiticas

Accesible en `/dashboard` con autenticacion Basic Auth (PBKDF2 del lado del cliente, token almacenado en `localStorage`). Provee:

- **KPIs generales:** total de escaneos, sesiones únicas, distribución de fuente geo.
- **Distribución:** breakdown por tipo de dispositivo, sistema operativo, navegador y campaña.
- **Timeline:** serie temporal de escaneos con selector de rango.
- **Tabla de scans:** paginada, sorteable, con filtros por campaña.
- **Mapa geo:** visualizacion de coordenadas de alta precision (browser/gps) via Leaflet.

Todos los endpoints de analíticas requieren encabezado `Authorization: Basic {token}`.

### 4.4 7F Digital Garage

Portal privado por vehículo, accesible en `/portal`. Permite al propietario del vehículo:

- Autenticarse con un PIN numérico vinculado a su vehículo (hasheado con PBKDF2-SHA256 + salt en la base de datos).
- Consultar su expediente completo: datos del vehículo, registros de servicio (tipo, fecha, garantía), instrucciones de cuidado y galería de fotos del trabajo.

**Flujo de autenticacion:**

```
POST /api/portal/auth { pin }
    → backend: deriva hash PBKDF2 del PIN recibido
    → compara contra vehicle.access_pin_hash en BD
    → si válido: genera token de sesion firmado
    → frontend: almacena token en localStorage (clave: 7fitment_garage_portal_token)

GET /api/portal/data (Authorization: Bearer {token})
    → retorna PortalVehicle + PortalClient + PortalServiceRecord[] + PortalMedia[]
```

La galeria pública del vehículo (sin autenticacion) es accesible en `/auto/{slug}` y sirve unicamente los campos marcados como `is_public = true` en `service_records` y `service_media`.

---

## 5. Modelo de Datos

```
┌──────────────┐        ┌──────────────────┐       ┌────────────────────┐
│   clients    │1      N│    vehicles      │1     N│  vehicle_qr_codes  │
│──────────────│────────│──────────────────│───────│────────────────────│
│ id (PK)      │        │ id (PK)          │       │ id (PK)            │
│ full_name    │        │ client_id (FK)   │       │ vehicle_id (FK)    │
│ phone        │        │ brand            │       │ qr_id (UNIQUE)     │
│ email        │        │ model            │       │ public_slug        │
│ preferred_   │        │ year             │       │ is_active          │
│  contact_    │        │ vin (UNIQUE)     │       │ activated_at       │
│  channel     │        │ plate            │       │ last_scanned_at    │
│ notes        │        │ color            │       └────────────────────┘
│ created_at   │        │ access_pin_hash  │
│ updated_at   │        │ is_active        │
└──────────────┘        └────────┬─────────┘
                                 │ 1
                                 │ N
                        ┌────────┴─────────────────┐
                        │      service_records      │
                        │───────────────────────────│
                        │ id (PK)                   │
                        │ vehicle_id (FK)            │
                        │ service_type              │  PPF | Wrap | Ceramic |
                        │   CHECK(...)              │  Detailing | Maintenance
                        │ title                     │
                        │ installed_at              │
                        │ warranty_expires_at       │
                        │ washing_recommendations   │
                        │ care_instructions         │
                        │ internal_notes            │
                        │ is_public                 │
                        └────────┬──────────────────┘
                                 │ 1
                                 │ N
                        ┌────────┴──────────────────┐
                        │      service_media        │
                        │───────────────────────────│
                        │ id (PK)                   │
                        │ service_record_id (FK)    │
                        │ media_url                 │
                        │ media_type                │  image | video | document
                        │   CHECK(...)              │
                        │ caption                   │
                        │ sort_order                │
                        │ is_public                 │
                        └───────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                             scans                                     │
│───────────────────────────────────────────────────────────────────────│
│ id           PK, autoincrement                                        │
│ campaign_id  VARCHAR(100)  INDEX                                      │
│ scan_token   VARCHAR(120)  UNIQUE INDEX  ← UUID por escaneo           │
│ country      VARCHAR(100)                                             │
│ state        VARCHAR(100)                                             │
│ city         VARCHAR(100)                                             │
│ geo_source   VARCHAR(40)   CHECK IN ('ip','browser','gps')            │
│ latitude     DOUBLE        │                                          │
│ longitude    DOUBLE        │ INDEX parcial (WHERE NOT NULL)           │
│ accuracy_m.  INTEGER       │ CHECK > 0                                │
│ geo_hash_5   VARCHAR(5)    INDEX  ← agrupamiento de densidad ~5km     │
│ geo_hash_7   VARCHAR(7)    INDEX  ← agrupamiento de densidad ~150m    │
│ device_type  VARCHAR(50)                                              │
│ os           VARCHAR(100)                                             │
│ browser      VARCHAR(100)                                             │
│ scanned_at   TIMESTAMPTZ   BRIN INDEX  ← eficiente para series        │
└───────────────────────────────────────────────────────────────────────┘
```

**Indices notables:**

| Indice                    | Tipo   | Proposito                                         |
|---------------------------|--------|---------------------------------------------------|
| `ix_scans_scan_token`     | UNIQUE | Lookup O(log n) y prevención de duplicados        |
| `ix_scans_lat_lng`        | BTREE  | Consultas de cercania/bounding box (parcial)      |
| `ix_scans_geo_hash_5/7`   | BTREE  | Agrupamiento geoespacial de densidad              |
| `ix_scans_scanned_at_brin`| BRIN   | Eficiencia en series temporales sobre tabla grande |

---

## 6. Referencia de la API

### Redirección

| Método | Ruta                  | Auth | Descripcion                              |
|--------|-----------------------|------|------------------------------------------|
| GET    | `/r/{campaign_id}`    | —    | Redirige (302) + registra escaneo async  |
| GET    | `/health`             | —    | Health check para Docker / Dokploy       |

### Analíticas (prefijo `/api`)

| Método | Ruta                                     | Auth  | Descripcion                     |
|--------|------------------------------------------|-------|---------------------------------|
| GET    | `/api/analytics/kpis`                    | Basic | KPIs agregados globales         |
| GET    | `/api/analytics/distribution`            | Basic | Breakdown por dispositivo/OS    |
| GET    | `/api/analytics/geo`                     | Basic | Distribución geográfica         |
| GET    | `/api/analytics/scans`                   | Basic | Tabla de scans paginada         |
| GET    | `/api/analytics/timeline`                | Basic | Serie temporal global           |
| GET    | `/api/analytics/{campaign_id}`           | Basic | KPIs por campaña                |
| GET    | `/api/analytics/summary/{campaign_id}`   | Basic | Resumen por campaña             |
| GET    | `/api/analytics/distribution/{campaign_id}` | Basic | Distribución por campaña     |
| GET    | `/api/analytics/location/{campaign_id}`  | Basic | Geo por campaña                 |
| GET    | `/api/analytics/timeline/{campaign_id}`  | Basic | Timeline por campaña            |
| POST   | `/api/analytics/browser-location`        | —    | Actualiza geo con coords del navegador |

### Autenticacion Administrativa

| Método | Ruta               | Auth  | Descripcion                          |
|--------|--------------------|-------|--------------------------------------|
| POST   | `/api/auth/login`  | Basic | Valida credenciales admin            |
| GET    | `/api/auth/session`| Basic | Verifica token de sesion activo      |

### Garage Portal

| Método | Ruta                 | Auth        | Descripcion                             |
|--------|----------------------|-------------|-----------------------------------------|
| POST   | `/api/portal/auth`   | —           | Autentica por PIN de vehiculo           |
| GET    | `/api/portal/data`   | Bearer token| Retorna expediente privado del cliente  |
| GET    | `/showcase/{slug}`   | —           | Galeria pública del vehiculo            |

**Documentacion interactiva** (solo desarrollo):

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## 7. Variables de Entorno

Todas las variables se declaran en el archivo `.env` raiz (copiar desde `.env.example`).

### PostgreSQL

| Variable            | Descripcion                       | Ejemplo                     |
|---------------------|-----------------------------------|-----------------------------|
| `POSTGRES_USER`     | Usuario de la base de datos       | `qrhub`                     |
| `POSTGRES_PASSWORD` | Contrasena del usuario            | `clave_segura_produccion`   |
| `POSTGRES_DB`       | Nombre de la base de datos        | `qrhub`                     |

> `DATABASE_URL` se construye automaticamente en `docker-compose.yml` a partir de las variables anteriores. No se configura manualmente.

### Backend

| Variable                     | Descripcion                                               | Ejemplo                      |
|------------------------------|-----------------------------------------------------------|------------------------------|
| `FRONTEND_URL`               | URL base del frontend para construir redirects            | `https://7fitment.com`       |
| `GEOIP_API_URL`              | Endpoint de resolución GeoIP                              | `http://ip-api.com/json`     |
| `GEOIP_TIMEOUT_SECONDS`      | Timeout de la consulta GeoIP                              | `2.5`                        |
| `TRACKING_ANALYTICS_CAMPAIGNS`| Slugs de campaña que registran analíticas (CSV)          | `qr_general,qr_instagram`    |
| `TRACKING_WHATSAPP_URL`      | URL de destino para campañas de WhatsApp                  | `https://wa.me/521...`       |
| `TRACKING_INSTAGRAM_URL`     | URL de destino para campañas de Instagram                 | `https://instagram.com/...`  |
| `ADMIN_USERNAME`             | Usuario del dashboard administrativo                      | `admin`                      |
| `ADMIN_PASSWORD`             | Contrasena del dashboard administrativo                   | `clave_segura_produccion`    |
| `CORS_ORIGINS`               | Origenes permitidos por CORS (CSV)                        | `https://7fitment.com,...`   |

### Frontend (embebidas en tiempo de build por Vite)

| Variable                   | Descripcion                                | Ejemplo                     |
|----------------------------|--------------------------------------------|-----------------------------|
| `VITE_API_URL`             | URL publica del backend                    | `https://api.7fitment.com`  |
| `VITE_API_PROXY_TARGET`    | Target del proxy Vite en desarrollo        | `http://localhost:8000`     |
| `VITE_DEFAULT_CAMPAIGN_ID` | Campaña por defecto para el landing        | `qr_general`                |
| `VITE_PUBLIC_SITE_URL`     | URL publica del sitio                      | `https://7fitment.com`      |

> Las variables `VITE_*` se incrustan en el bundle en tiempo de compilacion. Cualquier cambio requiere reconstruir la imagen del frontend.

---

## 8. Instalacion y Desarrollo Local

### Requisitos previos

- Docker >= 24.0 y Docker Compose >= 2.20
- Node.js >= 20 (solo para desarrollo frontend sin Docker)
- Python 3.12+ (solo para desarrollo backend sin Docker)

### Inicio rapido con Docker Compose

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/qr-hub-analytics.git
cd qr-hub-analytics

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con valores reales (especialmente POSTGRES_PASSWORD)

# 3. Construir e iniciar el stack con puertos locales
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# 4. Verificar estado de los servicios
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps

# 5. Consultar logs del backend
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs qrhub_backend -f
```

Los servicios quedan disponibles en:

| Servicio    | URL local                   |
|-------------|-----------------------------|
| Frontend    | http://localhost:3000       |
| Backend API | http://localhost:8000       |
| API Docs    | http://localhost:8000/docs  |
| Metabase    | http://localhost:3001       |

### Desarrollo Frontend (hot reload)

```bash
cd frontend
npm install
npm run dev
# Servidor disponible en http://localhost:5173 por defecto.
```

Para que el frontend en desarrollo apunte al backend local, levantar el backend con
`docker-compose.dev.yml` y asegurar en el `.env` raiz:

```
VITE_API_URL=http://localhost:8000
VITE_API_PROXY_TARGET=http://localhost:8000
```

El archivo `frontend/vite.config.ts` configura un proxy `/api → VITE_API_PROXY_TARGET` para evitar problemas de CORS en desarrollo.

### Verificacion de tipos y build del frontend

```bash
cd frontend
npm run typecheck   # tsc --noEmit
npm run build       # tsc --noEmit && vite build
```

### Desarrollo Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Iniciar base de datos (PostgreSQL debe estar corriendo)
export DATABASE_URL="postgresql+asyncpg://qrhub:password@localhost:5432/qrhub"
uvicorn app.main:app --reload --port 8000
```

### Pruebas del Backend

```bash
cd backend
pytest tests/ -v
```

Los tests en `tests/test_api_contract.py` cubren: contrato de redirects, hashing de PINs, variantes de URL de destino, y parsing de parámetros de analíticas.

### Fixture de aceptacion de release

El recorrido de aceptacion usa identidades reservadas `UAT-*` y multimedia
publica del portafolio. El PIN temporal se recibe exclusivamente mediante una
variable de entorno y nunca se persiste en el codigo fuente.

```powershell
$env:UAT_PORTAL_PIN = "<pin-temporal>"
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T `
  -e UAT_PORTAL_PIN qrhub_backend `
  python -m app.cli seed-uat --pin-env UAT_PORTAL_PIN
backend/.venv/Scripts/python.exe backend/scripts/run_uat_smoke.py `
  --pin-env UAT_PORTAL_PIN --base-url http://127.0.0.1:8000
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T `
  qrhub_backend python -m app.cli cleanup-uat
Remove-Item Env:UAT_PORTAL_PIN
```

`seed-uat` es idempotente y sustituye unicamente el fixture identificado por
su email, VIN y QR reservados. `cleanup-uat` no selecciona datos comerciales.

---

## 9. Despliegue en Produccion con Dokploy

Antes de construir en el servidor, ejecutar el preflight desde la raiz del stack:

```bash
sh ops/preflight.sh
```

El script valida las URLs publicas, cookies seguras, una clave de portal no trivial y
la configuracion de Docker Compose sin imprimir secretos.

Dokploy es un PaaS autoalojado que gestiona stacks Docker Compose sobre un VPS. Los siguientes pasos asumen un VPS con Dokploy ya instalado.

Referencia de instalacion de Dokploy: https://dokploy.com/docs/get-started

### Paso 1 — Subir el repositorio a GitHub

Asegurarse de que `.env` esta en `.gitignore` antes de hacer push.

```bash
git add .
git commit -m "feat: initial production release"
git push origin main
```

### Paso 2 — Crear el servicio en Dokploy

1. Acceder al panel de Dokploy (`http://<ip-del-servidor>:3000`).
2. Ir a **Projects > New Project**, luego **Add Service > Docker Compose**.
3. Conectar la cuenta de GitHub y seleccionar el repositorio `qr-hub-analytics`.
4. Configurar **branch** como `main` y **Compose file path** como `docker-compose.yml`.

### Paso 3 — Configurar variables de entorno

En la pestaña **Environment** del servicio, agregar todas las variables listadas en la [sección anterior](#7-variables-de-entorno).

> Las variables `VITE_*` son argumentos de build (`build.args` en `docker-compose.yml`). Después de modificarlas, se requiere un rebuild completo desde el panel de Dokploy.

### Paso 4 — Configurar dominios y HTTPS

En la pestaña **Domains** de cada servicio, asignar:

| Servicio           | Dominio sugerido             |
|--------------------|------------------------------|
| `qrhub_frontend`   | `7fitment.com`               |
| `qrhub_backend`    | `api.7fitment.com`           |
| `qrhub_frontend`   | `admin.7fitment.com`         |

Dokploy integra Traefik y gestiona los certificados TLS de Let's Encrypt de forma automatica.

El `docker-compose.yml` ya incluye las etiquetas Traefik preconfiguradas para los tres dominios mencionados.

### Paso 5 — Desplegar

Hacer clic en **Deploy** en el panel de Dokploy. El proceso:

1. Clona el repositorio desde GitHub.
2. Construye las imagenes `qrhub_backend` y `qrhub_frontend`.
3. Descarga `postgres:15-alpine` y `metabase/metabase:latest`.
4. Inicia los contenedores en orden de dependencia (`db → backend → frontend, metabase`).
5. El backend ejecuta `create_all` y las migraciones idempotentes al arrancar.

Monitorear el progreso en la pestaña **Logs** del panel.

---

## 10. Base de Datos GeoIP

La resolución de país, estado y ciudad se realiza via `ip-api.com` (HTTP, sin llave de API en el plan gratuito, con timeout configurable de 2.5s). Como alternativa local, el proyecto soporta MaxMind GeoLite2-City.

Para activar MaxMind en lugar de ip-api:

1. Crear una cuenta gratuita en https://www.maxmind.com/en/geolite2/signup

2. Descargar el archivo `GeoLite2-City.mmdb` desde la consola de MaxMind.

3. Colocarlo en `./backend/data/GeoLite2-City.mmdb`:

```bash
mkdir -p backend/data
mv GeoLite2-City_YYYYMMDD/GeoLite2-City.mmdb backend/data/GeoLite2-City.mmdb
```

4. En produccion con Dokploy, transferir el archivo al servidor:

```bash
scp GeoLite2-City.mmdb usuario@<ip-del-servidor>:/ruta/al/repositorio/backend/data/
```

El archivo se monta como volumen de solo lectura dentro del contenedor en `/app/data/GeoLite2-City.mmdb`. Si el archivo no está presente, el backend inicia normalmente y registra campos de ubicacion como `NULL` sin interrumpir el flujo de redireccion.

---

## 11. Estructura del Proyecto

```
qr-hub-analytics/
├── docker-compose.yml              # Orquestacion de los 4 servicios
├── .env.example                    # Plantilla de variables de entorno
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/               # Migraciones versionadas (Alembic)
│   └── app/
│       ├── main.py                 # Punto de entrada FastAPI + lifespan
│       ├── config.py               # Settings via pydantic-settings
│       ├── database.py             # Motor asyncpg, session factory
│       ├── models.py               # ORM: Scan, Client, Vehicle, ServiceRecord…
│       ├── auth.py                 # Basic Auth admin + PBKDF2 PIN
│       ├── security.py             # Hashing y verificacion de PINs
│       ├── routers/
│       │   ├── redirect.py         # GET /r/{campaign_id} + BackgroundTask
│       │   ├── analytics.py        # GET /api/analytics/* (KPIs, geo, timeline)
│       │   ├── auth.py             # POST /api/auth/login, GET /api/auth/session
│       │   └── garage.py           # POST /api/portal/auth, GET /api/portal/data
│       │                           # GET /showcase/{slug}
│       ├── services/
│       │   ├── geo_service.py      # IGeoService Protocol + IPApiGeoService
│       │   ├── geohash_service.py  # Calculo de geohash a precision 5 y 7
│       │   └── ua_service.py       # User-Agent parsing (DeviceInfo)
│       └── tests/
│           ├── conftest.py
│           └── test_api_contract.py
│
└── frontend/
    ├── Dockerfile                  # Build Vite + Nginx
    ├── nginx.conf                  # Configuracion Nginx SPA
    ├── vite.config.ts
    ├── index.html
    ├── public/
    │   ├── landing.html            # Landing estatico (GSAP/Lenis autocontenido)
    │   └── vendor/                 # GSAP + Lenis vendored (gsap.min.js, etc.)
    └── src/
        ├── App.tsx                 # Router SPA personalizado (sin React Router)
        ├── main.tsx
        ├── styles.css              # Tokens de diseno, utilidades GSAP/Lenis
        ├── components/
        │   ├── LocationSoftPrompt.tsx  # Prompt geo no intrusivo
        │   ├── MediaLightbox.tsx       # Lightbox GSAP Flip
        │   ├── Navbar.tsx
        │   └── SectionReveal.tsx
        ├── data/
        │   └── links.ts            # Datos estaticos de enlaces de campana
        ├── hooks/
        │   └── useLenis.ts         # Hook per-page para Lenis smooth scroll
        ├── lib/
        │   ├── api.ts              # Capa de comunicacion con el backend
        │   └── motion.ts           # Tokens GSAP, helpers SplitText/batchReveal
        └── pages/
            ├── LandingPage.tsx     # Iframe sobre landing.html
            ├── EnlacesPage.tsx     # Destino QR + soft prompt
            ├── ShowcasePage.tsx    # Galeria publica del vehiculo
            ├── PortalAuth.tsx      # Autenticacion por PIN
            ├── GarageDashboard.tsx # Expediente privado del cliente
            └── DashboardPage.tsx   # Dashboard admin de analiticas
```

---

## 12. Decisiones de Diseño

### Redirecciones de latencia cero

El endpoint `GET /r/{campaign_id}` retorna el `302` antes de realizar cualquier operacion de I/O. La resolución GeoIP, el parsing de User-Agent y el `INSERT` en PostgreSQL se ejecutan dentro de un `BackgroundTask` de FastAPI, que corre después de que la respuesta HTTP ha sido enviada al cliente. El background task abre su propia sesion de base de datos para evitar usar la sesion ya cerrada del request.

### Fallo silencioso en el pipeline de analíticas

Todo el pipeline de analíticas dentro del background task está envuelto en un bloque `try/except`. Un fallo en la resolución GeoIP, el parsing del User-Agent o la persistencia en PostgreSQL queda registrado en el log con nivel `ERROR` pero nunca interrumpe el flujo de redirección al usuario.

### Protocolo IGeoService (principio de inversión de dependencias)

El router de redirección depende de la abstracción `IGeoService` (un `Protocol` de Python), no de la implementación concreta `IPApiGeoService`. Esto permite sustituir el proveedor de GeoIP (por ejemplo, migrando a MaxMind GeoLite2 local) sin modificar el router.

### Dual geolocation para maxima precision

La geolocalizacion IP provee cobertura inmediata para el 100% de los escaneos (resolución a nivel ciudad). La geolocalizacion del navegador, activada por opt-in, enriquece el registro existente con coordenadas GPS de alta precision, habilitando análisis de densidad via geohash.

### Scan token por evento

Cada redirección genera un `scan_token` UUID único, embebido en la URL de destino (`/enlaces?scan={token}`). Esto permite correlacionar el registro inicial (creado por la IP del backend) con la actualización posterior de geolocalización del navegador, garantizando que el update del `POST /api/analytics/browser-location` modifique exactamente el registro correcto.

### GeoHash para agrupamiento geoespacial

Las columnas `geo_hash_5` (precision ~5km) y `geo_hash_7` (precision ~150m) permiten realizar `GROUP BY geo_hash_5` o `geo_hash_7` en SQL para obtener mapas de densidad de escaneos sin joins geoespaciales costosos. Ambas columnas tienen índices BTREE.

### BRIN index en scanned_at

El índice BRIN sobre `scanned_at` es significativamente más compacto que un BTREE para una columna que crece de forma monotónica. Para consultas de rango temporal (la mayoría de las consultas del dashboard), BRIN ofrece excelente rendimiento con mínimo overhead de almacenamiento.

### Router SPA personalizado en el frontend

El frontend usa un router condicional implementado en `App.tsx` (sin React Router) para mantener compatibilidad con el patrón de redirección del backend. Las rutas `/r/*`, `/t/*`, `/qr/*` y `/api/*` son excluidas del router del cliente mediante la flag `shouldBypassClientRouter`, dejando que Nginx/Traefik las resuelva directamente hacia el backend.

### Lenis + GSAP sin conflicto con iframe

El landing principal (`/`) se sirve como un archivo HTML estático autocontenido dentro de un `<iframe>`. Lenis y GSAP corren exclusivamente dentro del iframe, sin interferir con el scroll nativo de las paginas SPA. El hook `useLenis` de React solo se instancia en páginas que lo necesitan y se destruye en el `useEffect` cleanup, garantizando cero conflicto entre sesiones de scroll.

### PBKDF2-SHA256 para PINs de garage

Los PINs de acceso al portal privado se almacenan como hashes PBKDF2-SHA256 con salt aleatorio por vehiculo. El proceso de verificacion no es reversible y es resistente a ataques de diccionario y rainbow tables. No se almacenan PINs en texto plano ni se transmiten fuera del payload de autenticación inicial.

---

*Plataforma desarrollada exclusivamente para 7Fitment — Satelite, Estado de Mexico.*
