# SGDE · Sistema de Gestión de Eventos

Software de gestión de eventos y salones para el sector de congresos y convenciones de **Cartagena**: hoteles, centros de convenciones, fincas y casas de eventos. Organiza el ciclo comercial de un evento en un solo lugar, para que sea ágil, trazable y estándar:

**solicitud de salón → bloqueo temporal → cotización → confirmación con garantía → cancelación o realización**

Es un proyecto académico de **Unicolombo** desarrollado con un cliente real del sector. La **beta** opera solo en Cartagena y apunta a estar lista a finales de diciembre de 2026.

| | |
|---|---|
| Aplicación (producción) | https://gestion-de-eventos-wine.vercel.app |
| API (producción) | https://sgde-backend.onrender.com/api/ |
| Backlog | Jira, proyecto `SGDE` |

> El rediseño del frontend ("Piedra viva") vive en la rama `rediseno` y llega a producción cuando se fusione con `main` (SGDE-85).

## Qué hace la beta

Requerimientos oficiales: RF-01 a RF-13 y RNF-01 a RNF-08 ([`docs/Requerimientos Proyecto Gestion De Eventos.docx`](docs/)).

**Administrador** (solo ve los datos de sus sitios):
- Sitios, salones y montajes, con el aforo de cada combinación salón–montaje.
- Catálogo de conceptos por sitio, con precio, impuesto (IVA 19 %, impoconsumo 8 %) e historial de precios.
- Clientes (personas naturales y jurídicas) y empresas.
- Cotizaciones con vigencia, bloqueo temporal del salón, garantía que confirma el evento y cancelación con penalización.
- Calendario y rack de disponibilidad con colores por estado; histórico y movimientos de cada cotización (quién hizo qué y cuándo).
- Cotización imprimible o en PDF.
- Proveedores, su stock de elementos y comparación de precios.
- Usuarios internos con su rol y sus sitios.

**Proveedor:** actualiza su propio stock ("Mi stock").

**Cliente:** se registra, inicia sesión y ve su inicio.

**Para todos:** inicio y cierre de sesión con JWT, y recuperación de contraseña por correo (en `rediseno`).

**Fuera de alcance:** facturación, inscripción o acreditación de asistentes y pasarela de pago.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + JavaScript, `react-router-dom`, `fetch` nativo (sin Axios) |
| Backend | Django 5.2 + Django REST Framework + `djangorestframework-simplejwt` |
| Base de datos | PostgreSQL 18 (UTF8) |
| Entorno local | Docker Compose: `db`, `backend` y `frontend` |
| Producción | Frontend en Vercel; backend (Docker) y base de datos en Render |
| Integración continua | GitHub Actions: pruebas del backend y despliegue a Render al fusionar en `main` |

## Estructura del repositorio

```
Gestion-De-Eventos/
├── backend/            API en Django + DRF
│   ├── config/         settings.py y urls.py
│   └── apps/           sitios, usuarios, clientes, salones, catalogo,
│                       proveedores, cotizaciones y core
├── frontend/           Aplicación en React (src/api, src/pages, ...)
├── database/           Modelo relacional y esquema SQL de referencia
├── docs/               Requerimientos, diagramas, guía visual y guías del equipo
├── .github/workflows/  Pruebas y despliegue
└── docker-compose.yml
```

## Cómo correrlo en tu computador

La forma recomendada es con Docker. La guía completa, pensada para quien nunca ha usado Docker, está en [`docs/entorno-local.md`](docs/entorno-local.md).

En PowerShell, desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env      # la primera vez; rellena DB_PASSWORD y SECRET_KEY
docker compose up --build        # la primera vez o si cambian las dependencias
docker compose up -d             # el día a día, en segundo plano
docker compose down              # apagar (conserva la base; con -v la borra)
```

| Servicio | Dirección |
|---|---|
| Frontend | http://localhost:8080 |
| API y admin de Django | http://localhost:8000/api/ y http://localhost:8000/admin/ |
| PostgreSQL (pgAdmin) | `localhost`, puerto **5433** |

Al arrancar, el backend aplica las migraciones y crea los datos de prueba (`seed_demo`) con los usuarios `admin`, `cliente_demo` y `proveedor_demo`. Sus contraseñas salen de `SEED_*_PASSWORD` en tu `.env`.

## Pruebas

```powershell
docker compose exec backend python manage.py test   # backend
cd frontend; npm test; npm run lint; npm run build   # frontend (scripts de la rama rediseno)
```

El despliegue a producción corre primero las pruebas del backend: si fallan, no se despliega.

## Cómo trabajamos

- **Ramas permanentes por persona** (por ejemplo `backend/andresflorez`). No se borran después de fusionar; antes de empezar una tarea se actualizan con la rama base.
- **Backend → Pull Request a `main`.** Cada fusión en `main` despliega a producción. Nunca se hace commit directo en `main`.
- **Frontend → Pull Request a `rediseno`**, mientras dure el rediseño.
- **Commits** con Conventional Commits en español y la tarea de Jira en el pie:

  ```
  feat(salones): agregar endpoint de montajes por salón

  Refs: SGDE-13
  ```

- Nunca se suben `.env`, contraseñas, `SECRET_KEY` ni tokens.

## Documentación

El índice de toda la documentación y los diagramas está en [`docs/README.md`](docs/README.md). Lo más consultado:

- [Estados de una cotización](docs/arquitectura/Diagrama_Estados_Cotizacion.png) y [despliegue](docs/arquitectura/Diagrama_Despliegue_SGDE.png).
- [Diagrama de clases](docs/Diagrama_Clases_SGDE.png) y [modelo relacional](database/diagramas/Modelo%20Relacional/modelo_relacional.md).
- [Casos de uso generales](docs/casos_uso_sgde/SGDE-00_Casos_de_uso_general.png).
- [Guía visual Piedra viva](docs/diseno/piedra-viva/README.md) (en `rediseno`).

## Equipo

| Integrante | Rol |
|---|---|
| Andrés Camilo Florez Bustamante | Backend y coordinación general |
| Lewis David De La Rosa Castro | Backend |
| Felipe Bernal | Backend y base de datos |
| Clara Isabel Imitola Teran | Frontend y backend |
| Jaber Vargas Echeverria | Frontend |
| Bryan Pedroza | Frontend |
