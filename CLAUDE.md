# CLAUDE.md — SGDE (Sistema de Gestión de Eventos)

Contexto del proyecto para Claude Code. Responde siempre en español.

## 1. Qué es el proyecto

Software de gestión de eventos y salones para el sector de congresos y convenciones de **Cartagena** (hoteles, centros de convenciones, fincas, casas de eventos). Proyecto académico de **Unicolombo** con un cliente real del sector. La beta opera **solo en Cartagena**.

- **Meta**: beta funcional hacia finales de diciembre de 2026, con checkpoints cada 15 días con el profesor.
- **Flujo de negocio que resuelve**: solicitud de sitio/salón → bloqueo temporal → cotización (montaje + conceptos) → aprobación/rechazo del administrador → confirmación con garantía → ejecución y cierre con documento descargable.
- **Fuera de alcance**: facturación, inscripción/acreditación de asistentes, pasarela de pago.
- **Requerimientos oficiales**: RF-01 a RF-13 y RNF-01 a RNF-08 (`Requerimientos_Proyecto_Gestion_De_Eventos.docx`).
- **3 roles en la beta**: `cliente`, `administrador`, `proveedor`.

## 2. Cómo trabajar con este equipo

- El equipo es **junior** y usa estas tecnologías por primera vez. Explica cada cambio: qué haces, por qué y cómo verificarlo. Da comandos exactos para **Windows / PowerShell**.
- Es un proyecto real: **no mockear datos en código** si deberían ser catálogos administrables.
- Antes de cambios grandes (modelos, migraciones, settings, Dockerfile, CI), explica el plan y espera confirmación.
- **Nunca trabajar ni hacer commit directo en `main`.** Cada push a `main` despliega a producción automáticamente.
- Ramas: `feature/SGDE-XX-nombre-corto` (XX = número de issue en Jira). Andrés también usa `backend/andresflorez`.
- Mensajes de commit en español, con el issue: `SGDE-XX: descripción breve`.
- Nunca subir `.env`, contraseñas, `SECRET_KEY` ni tokens al repo.

### Equipo

| Persona | Rol |
|---|---|
| Andrés Camilo Flores Bustamante | Backend + coordinación general (dueño del repo) |
| Lewis De La Rosa Castro | Backend |
| Felipe Bernal | Backend (se reincorporó; tiene SGDE-38, 39, 40) |
| Jaber Vargas Echeverria | Frontend |
| Bryan Pedroza | Frontend |

## 3. Stack

- **Backend**: Django 6.1 + Django REST Framework + `djangorestframework-simplejwt`. Solo Django: se descartó FastAPI a propósito.
- **Base de datos**: PostgreSQL 18, codificación **UTF8** (la BD local se crea con `template0` + UTF8; si no, da `UnicodeDecodeError`).
- **Otras dependencias**: `psycopg2-binary`, `python-dotenv`, `dj-database-url`, `django-cors-headers`, `gunicorn`.
- **Frontend**: React + Vite + JavaScript. `react-router-dom` para rutas. **Sin Axios**: se usa `fetch` nativo a través de `frontend/src/api/client.js`. Sin Tailwind ni otras librerías salvo necesidad justificada.
- **Infraestructura**: Docker (`docker-compose.yml` con `db`, `backend`, `frontend`).
- **Backlog**: Jira, sitio `unicolombo-team-pepy5oek.atlassian.net`, proyecto `SGDE`.

## 4. Estructura del repo

```
Gestion-De-Eventos/
├── backend/
│   ├── config/          → settings.py, urls.py
│   ├── apps/
│   │   ├── sitios/          → Ciudad, Sitio
│   │   ├── usuarios/        → Rol, Usuario (extiende AbstractUser)
│   │   ├── clientes/        → Empresa, Cliente
│   │   ├── salones/         → Montaje, Salon, SalonMontaje
│   │   ├── catalogo/        → Concepto
│   │   ├── proveedores/     → Proveedor, StockElemento
│   │   ├── cotizaciones/    → Cotizacion, CotizacionItem
│   │   ├── disponibilidad/  → vacía (aquí va Bloqueo, RF-08)
│   │   ├── eventos/         → sin uso
│   │   └── core/            → sin uso
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/api/         → client.js (wrapper de fetch), auth.js
│   ├── src/pages/       → pantallas
│   ├── src/App.jsx      → rutas
│   ├── Dockerfile, nginx.conf, vercel.json
├── database/            → solo referencia (SQL, diagramas). Las migraciones reales viven en cada app.
├── docs/
├── .github/workflows/deploy.yml
└── docker-compose.yml
```

## 5. Modelo de datos (14 entidades, todas migradas)

| Entidad | Campos clave | Relaciones / notas |
|---|---|---|
| `Ciudad` | codigo (único), nombre | Tabla catálogo. Semilla: CTG |
| `Sitio` | nombre, ciudad, creado_en | FK → Ciudad. Entidad raíz multi-tenant |
| `Rol` | codigo (único), nombre, descripcion | Tabla catálogo. Semilla: cliente, administrador, proveedor |
| `Usuario` | AbstractUser + rol, sitios | FK → Rol (obligatoria); M2M → Sitio |
| `Empresa` | razon_social, identificacion (único), contacto, ciudad | FK → Ciudad |
| `Cliente` | tipo (natural/juridica), nombre, identificacion, correo, telefono, empresa, forma_pago, observaciones_internas, usuario | FK → Empresa (obligatoria si `tipo == "juridica"`, validado en serializer); OneToOne → Usuario opcional (cliente auto-registrado vs. creado por admin) |
| `Montaje` | codigo (único), nombre, descripcion | Tabla catálogo (RF-04). Semilla: auditorio, escuela, imperial, cóctel, espina de pescado |
| `Salon` | sitio, nombre, altura, ancho, foto_url | FK → Sitio |
| `SalonMontaje` | salon, montaje, aforo | Único (salon, montaje). El aforo depende de la combinación |
| `Concepto` | sitio, nombre, precio, impuesto_pct, activo | FK → Sitio (catálogo propio por sitio) |
| `Proveedor` | nombre, identificacion, contacto | Sin FK a Sitio ni a Empresa (decisión explícita) |
| `StockElemento` | proveedor, nombre_elemento, cantidad, valor, actualizado_en | FK → Proveedor. No conectado a CotizacionItem (comparación manual en la beta) |
| `Cotizacion` | sitio, cliente, usuario, salon, montaje, estado, fecha_evento, validez_oferta, cantidad_personas, bloqueo_hasta, garantia_tipo, garantia_monto, penalizacion_pct, motivo_cancelacion | `related_name="cotizaciones"` en cliente. Constraint anti-sobreventa: único (salon, fecha_evento) cuando `estado="confirmado"` |
| `CotizacionItem` | cotizacion, concepto, cantidad, precio_unitario | `precio_unitario` se copia del Concepto al cotizar |

Si este resumen no coincide con `models.py`, **el código manda**. Avísale a Andrés para actualizar este archivo.

### Decisiones de diseño (no revertir sin consultar)

- **Hotel → Sitio**: la entidad raíz se llama `Sitio` porque incluye fincas, casas de eventos y centros de convenciones. No usar "hotel" en código nuevo.
- **¿Tabla catálogo o `choices`?** Si un admin necesita agregar valores desde pantalla sin desplegar código → tabla con FK (`Ciudad`, `Rol`, `Montaje`). Si el valor está atado a lógica de flujo → `choices` (`Cliente.tipo`, `Cotizacion.estado`: cotizado/bloqueado/confirmado/cancelado).
- **Empresa separada de Cliente**, y **Proveedor separado de Empresa** (roles de negocio distintos).
- **Imágenes**: nunca se guardan binarios en la BD, solo URLs (`URLField`). Indicación del profesor.
- **Auditoría**: no hay tabla propia en la beta; se usa el `LogEntry` del admin de Django (RNF-03).
- **Superusuario**: `createsuperuser` no funciona porque `rol` es FK obligatoria. Se crea así:
  ```python
  # python manage.py shell
  from apps.usuarios.models import Usuario, Rol
  rol_admin = Rol.objects.get(codigo="administrador")
  Usuario.objects.create_superuser(username="admin", email="admin@sgde.com", password="...", rol=rol_admin)
  ```
- **Migraciones de datos** (semillas) usan `apps.get_model(...)`, no imports directos.

## 6. Endpoints existentes

| Método y ruta | Qué hace | Permiso | Issue |
|---|---|---|---|
| `POST /api/token/`, `POST /api/token/refresh/` | Login JWT | público | SGDE-27 ✅ |
| `POST /api/registro/` | Registro público: Usuario + Empresa + Cliente en transacción atómica | AllowAny | — |
| `GET /api/usuarios/me/` | Usuario actual con rol anidado | IsAuthenticated | — |
| `POST /api/usuarios/registro/` | Admin crea usuario interno con rol y sitios | (verificar) | SGDE-28 |
| `GET/POST /api/clientes/` | Admin lista/crea clientes. `?search=` por nombre, identificación, correo, razón social. Incluye `cotizaciones` anidadas | (verificar) | SGDE-9, SGDE-10 |
| `GET/POST /api/empresas/` | Lista/crea empresas. `?search=` por razón social o identificación | (verificar) | SGDE-11 |

Patrón establecido para endpoints nuevos: `generics.ListCreateAPIView` + `ModelSerializer`, con `SearchFilter` cuando aplique.

## 7. Frontend

- `src/api/client.js`: wrapper de `fetch`. Agrega `Authorization: Bearer <token>` desde `localStorage`, salvo con `options.skipAuth: true` (necesario en endpoints públicos). Lee la URL de `import.meta.env.VITE_API_URL`.
- `src/api/auth.js`: `login()`, `logout()`, `getUsuarioActual()`, `registrarCliente()`.
- Pantallas conectadas: `Login.jsx`, `Registrar.jsx`, `DashboardLayout.jsx` (logout).
- En `Registrar.jsx`, el tipo se envía como `"juridica"` o `"natural"` (no `"empresa"`). La ciudad se manda fija como `"CTG"`.
- `/salones` en `App.jsx` es un **placeholder**: `Salones.jsx` aún no existe (SGDE-35).
- Tokens en `localStorage`: riesgo de XSS aceptado conscientemente para la beta.

## 8. Comandos

### Backend local (PowerShell, desde `backend/`)
```powershell
.\venv\Scripts\Activate.ps1        # ajustar si el venv está en otra ruta
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
python manage.py test               # pruebas automáticas
```

### Frontend local (desde `frontend/`)
```powershell
npm install
npm run dev
```

### Stack completo con Docker (desde la raíz)
```powershell
docker compose up --build           # frontend en http://localhost, backend en :8000
```

## 9. Producción

- **Backend**: `https://sgde-backend.onrender.com` (Render, Docker, plan Free, región Ohio). Base de datos `sgde-db-staging` (Postgres Free).
- **Frontend**: `https://gestion-de-eventos-wine.vercel.app` (Vercel, root directory `frontend`, `VITE_API_URL=https://sgde-backend.onrender.com/api`). Cambiar esa variable requiere redeploy.
- **Auto-deploy**: `.github/workflows/deploy.yml` llama al Deploy Hook de Render (secret `RENDER_DEPLOY_HOOK`) en cada push a `main`.
- El `CMD` del Dockerfile corre `python manage.py migrate --noinput && gunicorn ...`: las migraciones se aplican solas en cada deploy (el plan Free no tiene Shell).
- `DEBUG` vale `False` por defecto. `LOGGING` imprime `django.request` a consola para ver los 500 en los logs de Render.
- Spin down por inactividad: la primera petición puede tardar ~50 s.
- ⚠️ La base de datos Free de Render **expira a los 30 días** de creada (más 14 de gracia) y no tiene backups.

## 10. Trabajo pendiente

### Issues abiertos
- **SGDE-38** (Felipe): endpoint de Conceptos.
- **SGDE-39** (Felipe): endpoints de Proveedores y StockElemento.
- **SGDE-40** (Felipe): entidad `Bloqueo` (RF-08) en `apps/disponibilidad/`.
- **SGDE-29, 12, 13** (Lewis): Sitios, Salones, Montajes. Estado sin confirmar. SGDE-12 pide "una o más fotos" y el modelo soporta una: decisión pendiente.
- **SGDE-34 a 37** (frontend): pantallas de Sitios, Salones, Clientes y Usuarios internos.
- Pruebas pendientes de SGDE-9, 10, 11 y 28. Preferir pruebas automáticas (`APITestCase`) sobre Postman manual.
- Núcleo del negocio sin empezar: disponibilidad (SGDE-14), cotizaciones (SGDE-18, 19), confirmación y garantía (SGDE-20, 21), cancelación (SGDE-22), histórico (SGDE-23), proveedores (SGDE-30, 31).

### Puntos a revisar antes de seguir construyendo
- **Bloqueo vs. Cotizacion**: `Cotizacion` ya tiene `estado="bloqueado"` y `bloqueo_hasta`. Antes de crear `Bloqueo`, decidir si es un estado de la cotización o una entidad aparte, para no tener dos fuentes de verdad. El constraint anti-sobreventa hoy solo cubre `confirmado`; debería cubrir también `bloqueado`.
- **Permisos por rol y filtro por sitio**: verificar que cada endpoint restrinja por rol y filtre por `request.user.sitios` (multi-tenant).
- **Registro público**: verificar que `/api/registro/` no permita enviar un `rol` en el payload.
- **CORS**: `CORS_ALLOWED_ORIGIN_REGEXES` acepta cualquier `*.vercel.app`; restringir al patrón del proyecto.
- **Repo público**: verificar que no haya secretos en el historial de git.
- **Archivos estáticos**: confirmar que el admin tenga CSS en producción (whitenoise + collectstatic).
- Agregar `.gitattributes` con `* text=auto` para evitar el ruido de CRLF/LF en Windows.
