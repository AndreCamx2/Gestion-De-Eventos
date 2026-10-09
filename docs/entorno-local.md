# Entorno local de SGDE (Windows / PowerShell)

Guía para levantar el proyecto en tu computador, pensada para alguien que **nunca ha usado Docker**.

## 0. Lo más importante (léelo primero)

- **Correr en local no toca GitHub, Render ni Vercel.** Tu base de datos local, tus usuarios de prueba y tus cambios sin subir viven solo en tu máquina.
- **Empujar (`git push`) a una rama NO despliega nada.** Solo un push o merge a `main` dispara el despliegue a producción.
- **El flujo de trabajo es siempre:** rama → push libre → Pull Request → revisión → merge.
- Nunca trabajes ni hagas commit directo en `main`. Ramas: `feature/SGDE-XX-nombre-corto`. Commits: `SGDE-XX: descripción breve`.
- Nunca subas `.env`, contraseñas ni `SECRET_KEY` (el `.gitignore` ya los protege, pero revisa tu `git status` antes de hacer commit).

## 1. Qué necesitas instalar

| Programa | Para qué | Cómo verificarlo |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Corre la base de datos, el backend y el frontend en "contenedores" (cajas aisladas) | `docker --version` |
| Git | Bajar y subir código | `git --version` |
| Node.js 20+ | Solo para el **Modo frontend** (sección 4) | `node --version` |

Después de instalar Docker Desktop, **ábrelo y espera a que diga "Engine running"**. Si está apagado, todos los comandos `docker` fallan.

## 2. Primera vez: preparar las variables

Desde la raíz del repo, en PowerShell:

```powershell
Copy-Item .env.example .env
```

Abre `.env` y rellena **al menos** estas dos (sin ellas, `docker compose` se niega a arrancar):

- `DB_PASSWORD`: cualquier texto, para tu base local.
- `SECRET_KEY`: genera una con
  ```powershell
  python -c "import secrets; print(secrets.token_urlsafe(50))"
  ```
  (si no tienes Python, escribe cualquier texto largo y aleatorio; es solo para local).

Opcional: `SEED_ADMIN_PASSWORD`, `SEED_CLIENTE_PASSWORD` y `SEED_PROVEEDOR_PASSWORD` fijan las contraseñas de los usuarios demo. Si las dejas vacías se usan valores por defecto de desarrollo (están en `backend/apps/core/management/commands/seed_demo.py`).

Cada variable está explicada con comentarios dentro de `.env.example`.

## 3. Modo completo: todo el stack con Docker

Sirve para trabajar en el **backend** y para ver el sistema entero como en producción.

```powershell
docker compose up --build
```

La primera vez tarda varios minutos (descarga imágenes y compila el frontend). Al arrancar, el backend **solo** hace tres cosas: aplica las migraciones, corre `seed_demo` y levanta el servidor.

| Qué | Dónde |
|---|---|
| Frontend | http://localhost:8080 |
| API del backend | http://localhost:8000/api/ |
| Admin de Django | http://localhost:8000/admin/ |
| Base de datos (pgAdmin, DBeaver) | host `localhost`, puerto **5433**, usuario y contraseña de tu `.env` |

> La base se publica en el **5433** (y no en el 5432) para no chocar con un PostgreSQL instalado en Windows. Dentro de Docker el backend sigue usando el 5432 por la red interna, así que no tienes que cambiar nada en el `.env`.

**Usuarios demo** (los crea `seed_demo`):

| Usuario | Rol | Para qué |
|---|---|---|
| `admin` | administrador (superusuario) | Probar todo |
| `cliente_demo` | cliente | Probar que recibe `403` donde no debe |
| `proveedor_demo` | proveedor | Probar que recibe `403` donde no debe |

Además crea un sitio en Cartagena, 3 salones con montajes y aforos, 5 conceptos y 2 clientes (uno natural y uno jurídico con empresa). Correrlo muchas veces **no duplica** nada. También puedes ejecutarlo a mano:

```powershell
docker compose exec backend python manage.py seed_demo
```

> `seed_demo` se niega a correr si `DEBUG` no es `True`, para que nunca siembres datos demo en producción por accidente.

### Cambios de código en este modo

- **Backend:** la carpeta `backend/` está montada dentro del contenedor y Django recarga solo al guardar. No necesitas reconstruir.
- **Frontend:** en este modo es una versión *compilada*. Para ver un cambio hay que reconstruir: `docker compose up --build`. Si vas a trabajar en el frontend usa el **Modo frontend** (sección 4).
- Si cambias `VITE_API_URL` o dependencias (`requirements.txt`, `package.json`), también hay que usar `--build`.

### Comandos del día a día

```powershell
docker compose up                  # levantar (sin reconstruir)
docker compose up -d               # levantar en segundo plano
docker compose down                # apagar (conserva la base de datos)
docker compose ps                  # ver qué está corriendo
docker compose logs -f backend     # ver logs del backend en vivo (Ctrl+C para salir)
docker compose logs -f db          # logs de la base de datos
docker compose logs --tail 100     # últimas 100 líneas de todo
docker compose exec backend python manage.py test   # correr las pruebas
docker compose exec backend python manage.py shell  # consola de Django
```

### Resetear la base de datos

Borra **todos** los datos locales y vuelve a empezar de cero (migra y siembra otra vez):

```powershell
docker compose down -v
docker compose up --build
```

La `-v` es la que borra el volumen de la base de datos. Solo afecta tu máquina.

## 4. Modo frontend: recarga en caliente (para Jaber y Bryan)

Dejas el backend y la base en Docker, y corres el frontend directamente en tu máquina con Vite, que recarga la página al guardar.

1. Crea el archivo de variables del frontend:
   ```powershell
   cd frontend
   Copy-Item .env.example .env.local
   ```
   Su contenido debe ser:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```
2. Desde la **raíz** del repo, levanta solo la base y el backend (necesitas el `.env` de la sección 2):
   ```powershell
   docker compose up db backend
   ```
3. En **otra** terminal PowerShell:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
4. Abre http://localhost:5173 e inicia sesión con `admin` (o el usuario demo que necesites).

El backend ya permite CORS desde `http://localhost:5173`. Si cambias `.env.local`, reinicia `npm run dev`.

## 5. Flujo de trabajo con Git

```
rama → push libre → Pull Request → revisión → merge a main → despliegue
```

1. Parte siempre de `main` actualizado:
   ```powershell
   git checkout main
   git pull
   git checkout -b feature/SGDE-XX-nombre-corto
   ```
2. Trabaja, haz commits (`SGDE-XX: descripción breve`) y empuja cuando quieras:
   ```powershell
   git push -u origin feature/SGDE-XX-nombre-corto
   ```
   **Esto no despliega nada.** Puedes empujar tantas veces como quieras.
3. Abre un Pull Request hacia `main` en GitHub. GitHub Actions corre las pruebas del backend automáticamente y muestra si pasaron.
4. Alguien del equipo revisa. Con la revisión y los tests en verde, se hace merge.
5. **Solo el merge a `main`** dispara el despliegue: primero corren los tests y, **si fallan, no se despliega**.

### Paso obligatorio para Andrés antes de mergear esta rama (`feature/entorno-local`)

El workflow nuevo solo protege producción si Render **no** despliega por su cuenta. Antes de mergear:

1. Entra al servicio `sgde-backend` en el panel de Render.
2. Ve a **Settings → Build & Deploy → Auto-Deploy** y ponlo en **Off**.
3. Verifica que el secret `RENDER_DEPLOY_HOOK` sigue en GitHub (Settings → Secrets and variables → Actions).

Con Auto-Deploy activo, Render desplegaría cada push a `main` sin esperar los tests y el candado no serviría de nada.

## 6. Errores comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `failed to connect to the docker API ... dockerDesktopLinuxEngine` | Docker Desktop está apagado | Ábrelo y espera a "Engine running" |
| `required variable DB_PASSWORD is missing` o `SECRET_KEY` | Falta el `.env` de la raíz o esas variables | Sección 2 |
| `port is already allocated` / `address already in use` en **8080** (o el frontend no abre) | Es raro, pero otro programa usa el 8080. Ojo: el **80** ya no se usa; si lo ocupa **XAMPP (Apache)** no afecta a este proyecto | Cierra el programa que use el 8080 o cambia `"8080:80"` en `docker-compose.yml` (el número de la izquierda) |
| `port is already allocated` / `address already in use` en **5433** | Otro programa usa el 5433. La causa típica del problema original (5432) era el **PostgreSQL nativo de Windows**, y por eso la base se publica en el 5433 | Cambia `"5433:5432"` en `docker-compose.yml` (solo el número de la izquierda) |
| pgAdmin no conecta a la base de Docker | Estás apuntando al 5432, que es el Postgres nativo de Windows (si existe), no el de Docker | Conéctate a `localhost` puerto **5433** |
| Puerto **8000** ocupado | Otro programa lo usa | Ciérralo o cambia el puerto publicado en `docker-compose.yml` |
| `UnicodeDecodeError` al conectar a la base | La base se creó sin codificación UTF8 (suele pasar con un Postgres instalado en Windows, no con el de Docker) | Usa el Postgres de Docker, o crea la base con `template0` + UTF8 |
| El backend se reinicia en bucle | Falló `migrate` o `seed_demo` | `docker compose logs backend` y lee el error de arriba hacia abajo |
| `seed_demo solo corre con DEBUG=True` | `DEBUG` no es `True` en ese entorno | En Docker ya viene en `True`; fuera de Docker pon `DEBUG=True` en `backend/.env` |
| El frontend no ve cambios en modo completo | Es una versión compilada | `docker compose up --build`, o usa el Modo frontend |
| Login falla con "Failed to fetch" / error de CORS | Backend apagado o `VITE_API_URL` mal | Revisa `docker compose ps` y que `VITE_API_URL` sea `http://localhost:8000/api` |
| Cambié la contraseña en `.env` y el login sigue con la anterior | `seed_demo` solo pone la contraseña al **crear** el usuario | Resetea la base (`docker compose down -v`) |
| Los fines de línea (CRLF/LF) llenan el diff de cambios | Windows convierte saltos de línea | El repo trae `.gitattributes` que lo normaliza; haz `git pull` y vuelve a abrir el archivo |
| `git push` rechazado en `main` | Estás en `main` | Crea una rama (sección 5) |

## 7. Referencia rápida de variables

El detalle de cada variable está en `.env.example` (raíz), `backend/.env.example` y `frontend/.env.example`. Ninguno contiene valores reales.

| Archivo | Cuándo se usa |
|---|---|
| `.env` (raíz) | Siempre que usas `docker compose` |
| `backend/.env` | Solo si corres Django fuera de Docker (venv + `runserver`) |
| `frontend/.env.local` | Solo en el Modo frontend (`npm run dev`) |
