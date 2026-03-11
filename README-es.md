[Read in English](README.md)

# QR-Hub Analytics

Plataforma autohospedada para gestionar codigos QR dinamicos, redirecciones HTTP instantaneas y recoleccion de analiticas de escaneos. Disenada para su despliegue en infraestructura privada mediante Dokploy o cualquier entorno compatible con Docker.

---

## Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Stack Tecnologico](#stack-tecnologico)
3. [Requisitos Previos](#requisitos-previos)
4. [Variables de Entorno](#variables-de-entorno)
5. [Instalacion y Configuracion](#instalacion-y-configuracion)
   - [Desarrollo Local](#desarrollo-local)
   - [Despliegue en Produccion en un VPS con Dokploy](#despliegue-en-produccion-en-un-vps-con-dokploy)
6. [Configuracion de la Base de Datos GeoIP](#configuracion-de-la-base-de-datos-geoip)
7. [Uso](#uso)
8. [Estructura del Proyecto](#estructura-del-proyecto)
9. [Decisiones de Diseno](#decisiones-de-diseno)

---

## Arquitectura del Sistema

El sistema esta compuesto por cuatro servicios contenerizados orquestados mediante Docker Compose y conectados a traves de una red interna privada (`qrhub_net`).

```
Codigo QR fisico
      |
      | HTTP GET /r/{campaign_id}
      v
  [ backend ]  <-- FastAPI (puerto 8000)
      |         1. Devuelve 302 Redirect de forma inmediata (latencia cero para el usuario final)
      |         2. BackgroundTask: consulta GeoIP + parseo de User-Agent + INSERT en db
      v
  [  db  ]  <-- PostgreSQL 15 (solo red interna)
      |         Almacena los registros de escaneo en la tabla "scans"
      v
  [ metabase ]  <-- Metabase BI (puerto 3001)
                    Se conecta directamente a db para dashboards e informes

  [ frontend ]  <-- Next.js 16 (puerto 3000)
                    El usuario aterriza aqui tras el redirect 302
                    Renderiza un menu de enlaces estilo Linktree
                    Dispara un evento GA4 page_view al cargar
```

### Responsabilidades de Cada Servicio

| Servicio   | Imagen / Build          | Rol                                                       |
|------------|-------------------------|-----------------------------------------------------------|
| `db`       | `postgres:15-alpine`    | Almacenamiento persistente de analiticas de escaneo       |
| `backend`  | `./backend`             | Manejador de redirecciones QR e ingesta de analiticas     |
| `frontend` | `./frontend`            | Pagina de aterrizaje de campana (UI estilo Linktree)      |
| `metabase` | `metabase/metabase`     | Dashboard BI conectado a la base de datos PostgreSQL      |

---

## Stack Tecnologico

| Capa         | Tecnologia                                     |
|--------------|------------------------------------------------|
| Backend      | Python 3.12, FastAPI, SQLAlchemy 2 (async)     |
| Base de datos| PostgreSQL 15, driver asyncpg                  |
| Frontend     | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Analiticas   | Metabase (autohospedado), Google Analytics 4   |
| GeoIP        | MaxMind GeoLite2-City                          |
| Contenedores | Docker, Docker Compose                         |
| Despliegue   | Dokploy (o cualquier host Docker)              |

---

## Requisitos Previos

- Docker >= 24.0
- Docker Compose >= 2.20 (incluido en Docker Desktop)
- Una cuenta gratuita de MaxMind para descargar la base de datos GeoLite2-City
  - Registro: https://www.maxmind.com/en/geolite2/signup
- (Opcional) Una propiedad de Google Analytics 4 para el rastreo en el frontend

---

## Variables de Entorno

Todas las variables se declaran en el archivo `.env` de la raiz (copiado desde `.env.example`).

### PostgreSQL

| Variable            | Descripcion                          | Ejemplo                    |
|---------------------|--------------------------------------|----------------------------|
| `POSTGRES_USER`     | Nombre del superusuario de la BD     | `qrhub`                    |
| `POSTGRES_PASSWORD` | Contrasena del superusuario de la BD | `change_me_in_production`  |
| `POSTGRES_DB`       | Nombre de la base de datos           | `qrhub`                    |

### Backend (FastAPI)

| Variable       | Descripcion                                                              | Ejemplo                  |
|----------------|--------------------------------------------------------------------------|--------------------------|
| `FRONTEND_URL` | URL base del servicio frontend (utilizada para construir las redirects)  | `https://tudominio.com`  |

> La variable `DATABASE_URL` se ensambla automaticamente dentro de `docker-compose.yml` a partir de las variables de PostgreSQL. No se requiere configuracion manual.

### Frontend (Next.js)

| Variable               | Descripcion                                                          | Ejemplo                       |
|------------------------|----------------------------------------------------------------------|-------------------------------|
| `NEXT_PUBLIC_API_URL`  | URL del backend accesible publicamente                               | `https://api.tudominio.com`   |
| `NEXT_PUBLIC_GA4_ID`   | ID de medicion de Google Analytics 4. Dejar vacio para desactivarlo  | `G-XXXXXXXXXX`                |

> Las variables `NEXT_PUBLIC_*` se embeben en el bundle durante el proceso de build de Next.js. Deben estar definidas antes de ejecutar `docker compose up --build`.

---

## Instalacion y Configuracion

Esta seccion cubre dos rutas de despliegue: **desarrollo local** y **produccion en un VPS usando Dokploy**.

---

### Desarrollo Local

#### 1. Clonar el repositorio

```bash
git clone https://github.com/your-org/qr-hub-analytics.git
cd qr-hub-analytics
```

#### 2. Configurar las variables de entorno

```bash
cp .env.example .env
```

Abrir `.env` y reemplazar todos los valores de ejemplo con credenciales de produccion.
Prestar especial atencion a `POSTGRES_PASSWORD`: utilizar un valor aleatorio y seguro.

#### 3. Configurar la base de datos GeoIP

Ver la seccion [Configuracion de la Base de Datos GeoIP](#configuracion-de-la-base-de-datos-geoip) mas abajo.

#### 4. Construir e iniciar todos los servicios

```bash
docker compose up -d --build
```

Este comando realizara las siguientes acciones:

- Construira la imagen del backend FastAPI desde `./backend/Dockerfile`
- Construira la imagen del frontend Next.js desde `./frontend/Dockerfile` (build standalone multi-etapa)
- Descargara `postgres:15-alpine` y `metabase/metabase:latest` desde Docker Hub
- Iniciara los cuatro contenedores conectados a la red interna `qrhub_net`
- Ejecutara la creacion del esquema de base de datos automaticamente al iniciar el backend (via `create_all` de SQLAlchemy)

#### 5. Verificar que todos los servicios esten activos

```bash
docker compose ps
```

Todos los servicios deben mostrar estado `running` o `healthy` en un plazo de 30 segundos.

```bash
# Revisar los logs del backend
docker compose logs backend

# Verificar conectividad con la base de datos
docker compose exec db psql -U qrhub -d qrhub -c "\dt"
```

---

### Despliegue en Produccion en un VPS con Dokploy

Dokploy es una PaaS autohospedada que gestiona stacks de Docker Compose en un VPS Ubuntu/Debian. Los pasos a continuacion asumen un VPS con Dokploy ya instalado.

Referencia de instalacion de Dokploy: https://dokploy.com/docs/get-started

#### Paso 1 -- Subir el repositorio a GitHub

Verificar que `.env`, `backend/data/` y todas las entradas del `.gitignore` esten excluidas antes de hacer el commit.

```bash
git add .
git commit -m "Initial production release"
git push origin main
```

#### Paso 2 -- Crear un nuevo servicio Compose en Dokploy

1. Iniciar sesion en el panel de Dokploy (por defecto: `http://<ip-servidor>:3000`).
2. Navegar a **Projects > New Project**, luego **Add Service > Docker Compose**.
3. Conectar la cuenta de GitHub y seleccionar el repositorio `qr-hub-analytics`.
4. Definir el **branch** como `main` y la **ruta del Compose file** como `docker-compose.yml`.

#### Paso 3 -- Configurar las variables de entorno

En el panel del servicio en Dokploy, ir a la pestana **Environment** y agregar cada variable individualmente, o pegar el contenido del archivo `.env` usando el editor masivo:

```
POSTGRES_USER=qrhub
POSTGRES_PASSWORD=<contrasena-aleatoria-segura>
POSTGRES_DB=qrhub
FRONTEND_URL=https://tudominio.com
NEXT_PUBLIC_API_URL=https://api.tudominio.com
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX
```

> Las variables `NEXT_PUBLIC_*` se embeben en el bundle durante el build. Tras modificarlas, se requiere un rebuild completo (**Deploy > Rebuild**).

#### Paso 4 -- Subir la base de datos GeoIP al servidor

El archivo `GeoLite2-City.mmdb` debe colocarse en el host del VPS antes de que el contenedor del backend inicie. Se inyecta mediante un bind mount y nunca se incluye en la imagen.

```bash
# Desde la maquina local: copiar el archivo al servidor
scp GeoLite2-City.mmdb user@<ip-servidor>:/opt/qr-hub-analytics/backend/data/GeoLite2-City.mmdb
```

Tambien es posible usar cualquier cliente SFTP (FileZilla, Cyberduck, etc.) para transferir el archivo.

Verificar que la ruta en el servidor coincida con el bind mount definido en `docker-compose.yml`:

```yaml
volumes:
  - ./backend/data:/app/data:ro
```

Dokploy clona el repositorio en un directorio bajo `/etc/dokploy/` por defecto. La ruta exacta es visible en la pestana **General** del panel del servicio, bajo **Source path**. El archivo `.mmdb` debe colocarse en el subdirectorio `backend/data/` de esa ruta.

#### Paso 5 -- Desplegar

Hacer clic en **Deploy** en el panel del servicio de Dokploy. Dokploy realizara:

1. Pull del codigo mas reciente desde GitHub.
2. Build de ambas imagenes Docker (`backend` y `frontend`).
3. Pull de `postgres:15-alpine` y `metabase/metabase:latest`.
4. Inicio de todos los contenedores en orden de dependencias (`db` -> `backend` -> `frontend`, `metabase`).

Monitorear el progreso en la pestana **Logs** del panel de Dokploy.

#### Paso 6 -- Configurar dominios y HTTPS

En el panel de Dokploy, ir a la pestana **Domains** de cada servicio y asignar los dominios personalizados:

| Servicio   | Dominio sugerido             |
|------------|------------------------------|
| `frontend` | `tudominio.com`              |
| `backend`  | `api.tudominio.com`          |
| `metabase` | `analytics.tudominio.com`    |

Dokploy se integra con Traefik y provee certificados TLS de Let's Encrypt automaticamente.

Tras asignar los dominios, actualizar `FRONTEND_URL` y `NEXT_PUBLIC_API_URL` en el panel de variables de entorno usando URLs con `https://` y ejecutar un rebuild.

---

## Configuracion de la Base de Datos GeoIP

La resolucion de pais y ciudad esta impulsada por la base de datos MaxMind GeoLite2-City.
El archivo de base de datos debe colocarse en `./backend/data/GeoLite2-City.mmdb` antes de iniciar el contenedor del backend.

### Pasos

1. Crear una cuenta gratuita en MaxMind: https://www.maxmind.com/en/geolite2/signup

2. Iniciar sesion y navegar a:
   **Account > Download Files > GeoLite2 City > Download GZIP**

3. Extraer el archivo `.mmdb` y moverlo a la ruta correcta:

```bash
mkdir -p backend/data
mv GeoLite2-City_YYYYMMDD/GeoLite2-City.mmdb backend/data/GeoLite2-City.mmdb
```

4. Verificar que el archivo este en su lugar:

```bash
ls -lh backend/data/GeoLite2-City.mmdb
```

El archivo se monta como volumen de solo lectura dentro del contenedor del backend en `/app/data/GeoLite2-City.mmdb`.

> Si el archivo no esta presente, el backend iniciara normalmente y registrara una advertencia en el log. Los campos de pais y ciudad se almacenaran como `NULL`. El endpoint de redireccion continuara funcionando sin interrupciones.

---

## Uso

### Frontend — Paginas de Aterrizaje de Campanas

Tras el inicio, cada campana es accesible en:

```
http://localhost:3000/{campaign_id}
```

Ejemplo:

```
http://localhost:3000/mi-negocio
```

Para agregar o modificar campanas, editar `frontend/lib/campaigns.ts`.
Este archivo actua actualmente como un repositorio de datos estatico y puede reemplazarse por una llamada `fetch()` a la API del backend sin modificar ninguna pagina ni componente.

### Backend API — Endpoint de Redireccion QR

El endpoint de redireccion es la URL de destino codificada en cada codigo QR fisico:

```
GET http://localhost:8000/r/{campaign_id}
```

**Respuesta:** `302 Found` con la cabecera `Location` apuntando a la pagina de campana en el frontend.

El registro de escaneo (IP, pais, ciudad, tipo de dispositivo, SO, navegador, timestamp) se escribe en PostgreSQL de forma asincrona una vez enviada la respuesta.

**Endpoints adicionales:**

| Metodo | Ruta      | Descripcion                        |
|--------|-----------|------------------------------------|
| GET    | /health   | Verificacion de estado del servicio|
| GET    | /docs     | Swagger UI (OpenAPI 3.1)           |
| GET    | /redoc    | Documentacion ReDoc                |

### Metabase — Dashboard de BI

Metabase esta disponible en:

```
http://localhost:3001
```

En el primer acceso, el asistente de configuracion de Metabase guiara en la creacion de una cuenta de administrador.

Para conectar Metabase a la base de datos PostgreSQL, utilizar los siguientes parametros de conexion en el asistente:

| Campo      | Valor                                             |
|------------|---------------------------------------------------|
| Tipo       | PostgreSQL                                        |
| Host       | `db`                                              |
| Puerto     | `5432`                                            |
| Base datos | valor de `POSTGRES_DB` en el archivo `.env`       |
| Usuario    | valor de `POSTGRES_USER` en el archivo `.env`     |
| Contrasena | valor de `POSTGRES_PASSWORD` en el archivo `.env` |

Una vez conectado, es posible consultar la tabla `scans` y construir dashboards para:

- Escaneos por campana a lo largo del tiempo
- Distribucion geografica (pais, ciudad)
- Desglose por tipo de dispositivo (movil, tablet, escritorio)
- Analiticas de navegador y sistema operativo

---

## Estructura del Proyecto

```
qr-hub-analytics/
|-- docker-compose.yml          # Orquestacion de servicios
|-- .env.example                # Plantilla de variables de entorno
|-- README.md
|-- README-es.md
|
|-- backend/
|   |-- Dockerfile
|   |-- requirements.txt
|   |-- .env.example
|   |-- data/                   # Punto de montaje para GeoLite2-City.mmdb
|   `-- app/
|       |-- main.py             # Punto de entrada de la aplicacion FastAPI
|       |-- config.py           # Configuracion mediante pydantic-settings
|       |-- database.py         # Engine async, fabrica de sesiones, get_db()
|       |-- models.py           # ORM SQLAlchemy: tabla Scan
|       |-- routers/
|       |   `-- redirect.py     # GET /r/{campaign_id} con BackgroundTask
|       `-- services/
|           |-- geo_service.py  # Resolucion de IP con GeoLite2 (protocolo IGeoService)
|           `-- ua_service.py   # Parseo de User-Agent (dispositivo, SO, navegador)
|
`-- frontend/
    |-- Dockerfile              # Build standalone multi-etapa
    |-- .env.example
    |-- next.config.ts          # output: "standalone"
    |-- app/
    |   |-- layout.tsx          # Layout raiz con etiquetas de script GA4
    |   |-- page.tsx            # Redireccion raiz a la campana de demo
    |   `-- [campaign_id]/
    |       `-- page.tsx        # Pagina de campana dinamica (RSC + generateMetadata)
    |-- components/
    |   |-- GA4PageView.tsx     # Componente cliente: dispara el evento gtag page_view
    |   |-- LinkCard.tsx        # Boton de enlace accesible (tap target WCAG 2.5.5)
    |   `-- ProfileHeader.tsx   # Avatar, nombre de perfil y biografia
    |-- lib/
    |   `-- campaigns.ts        # Repositorio de datos de campanas
    `-- types/
        `-- campaign.ts         # Definiciones de tipos CampaignData y SocialLink
```

---

## Decisiones de Diseno

### Redirecciones sin latencia

El endpoint `GET /r/{campaign_id}` devuelve la respuesta `302` antes de que ocurra cualquier operacion de I/O.
La resolucion GeoIP, el parseo del User-Agent y el `INSERT` en PostgreSQL se ejecutan dentro de una `BackgroundTask` de FastAPI que corre despues de que la respuesta HTTP ha sido enviada al cliente.
La tarea en segundo plano abre su propia sesion de base de datos (`AsyncSessionLocal`) para evitar reutilizar la sesion del request, que ya fue cerrada.

### Fallo silencioso en analiticas

Todo el pipeline de analiticas dentro de la tarea en segundo plano esta envuelto en un bloque `try/except`.
Un fallo en la consulta GeoIP, el parseo del User-Agent o la persistencia en la base de datos se registrara en el log con nivel `ERROR`, pero nunca propagara una excepcion al usuario ni interrumpira el flujo de redireccion.

### Principios SOLID en el backend

| Principio              | Implementacion                                                                                                                    |
|------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| Responsabilidad Unica  | `geo_service.py`, `ua_service.py`, `database.py` y `redirect.py` tienen cada uno una unica razon de cambio                       |
| Abierto/Cerrado        | `GeoLite2Service` implementa el `Protocol` `IGeoService`. Un nuevo proveedor puede sustituirse sin modificar el router            |
| Inversion de Dependencias | El router depende de la abstraccion `IGeoService`, no de la implementacion concreta `GeoLite2Service`                          |

### Salida standalone de Next.js

`output: "standalone"` en `next.config.ts` permite a Next.js emitir un punto de entrada `server.js` autocontenido con solo las dependencias de produccion necesarias en tiempo de ejecucion.
Combinado con un build Docker multi-etapa (etapas deps / builder / runner sobre `node:20-alpine`), la imagen final es significativamente mas liviana que un build Node.js estandar.

### Arquitectura de integracion con GA4

Las etiquetas `<Script>` de GA4 se renderizan en el `layout.tsx` raiz como Server Components utilizando `strategy="afterInteractive"`, lo que difiere la carga del script hasta despues de la hidratacion de la pagina y evita bloquear el Largest Contentful Paint.
El componente `GA4PageView` es un Client Component minimo que dispara una llamada a `gtag("event", "page_view")` al montarse, permitiendo que cada pagina de campana reporte su propio `campaign_id` como dimension personalizada sin requerir una navegacion completa de pagina.
