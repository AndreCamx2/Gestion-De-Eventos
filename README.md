HEAD
# Gestion-De-Eventos
Sistema de Gestión de Eventos (SGDE)

# Sistema de Gestión de Eventos (SGDE)
d3e7d5907ada7dda08aab38f0b4217093d69f281

Software de gestión de eventos y salones para el sector de congresos y convenciones de Cartagena (hoteles, centros de convenciones y casas de eventos). Cubre todo el ciclo comercial de un evento — desde la cotización hasta la confirmación, ejecución y cierre — de forma ágil, trazable y estandarizada.

Proyecto académico desarrollado para el programa de Administración de Empresas Turísticas y Hoteleras, en conjunto con un cliente real del sector.

 HEAD
Este README describe la versión beta: cubre únicamente los requerimientos funcionales RF-01 a RF-12 definidos en docs/. Facturación e inscripción de asistentes a eventos quedan fuera de alcance (se gestionan con herramientas externas).

Funcionalidades
Gestión de clientes (personas naturales y jurídicas) y empresas
Gestión de salones y tipos de montaje, con aforo por combinación salón/montaje
Calendario de disponibilidad con bloqueo temporal de espacios
Catálogo de conceptos (productos/servicios) con precios e impuestos
Generación de cotizaciones con vigencia
Registro de garantías y confirmación de eventos
Cancelaciones con política de penalización
Histórico de eventos
Stack
Capa	Tecnología
Frontend	React + JavaScript (Vite)
Backend	Python — Django + Django REST Framework
Base de datos	PostgreSQL
Autenticación	JWT (djangorestframework-simplejwt)
Gestión del proyecto	Jira (SGDE)

 Este README describe la **versión beta**: cubre únicamente los requerimientos funcionales RF-01 a RF-12 definidos en `docs/`. Facturación e inscripción de asistentes a eventos quedan fuera de alcance (se gestionan con herramientas externas).

## Funcionalidades

- Gestión de clientes (personas naturales y jurídicas) y empresas
- Gestión de salones y tipos de montaje, con aforo por combinación salón/montaje
- Calendario de disponibilidad con bloqueo temporal de espacios
- Catálogo de conceptos (productos/servicios) con precios e impuestos
- Generación de cotizaciones con vigencia
- Registro de garantías y confirmación de eventos
- Cancelaciones con política de penalización
- Histórico de eventos

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + JavaScript (Vite) |
| Backend | Python — Django + Django REST Framework |
| Base de datos | PostgreSQL |
| Autenticación | JWT (`djangorestframework-simplejwt`) |
| Gestión del proyecto | Jira (`SGDE`) |

## Estructura del repositorio

```
sgde/
├── backend/     # API en Django + DRF
├── frontend/    # Aplicación en React
├── database/    # Scripts de referencia, diagrama ER, datos semilla
└── docs/        # Requerimientos, backlog y guías del proyecto
```

## Puesta en marcha

### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash)
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Requiere un archivo `.env` (no versionado) con las variables de conexión a PostgreSQL y `SECRET_KEY`. Ver `docs/` para el detalle.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Equipo

| Integrante | Rol |
|---|---|
| Clara Isabel| Apoyo en base de datos |
| Felipe Bernal | Base de datos |
| Andrés Florez Bustamante | Backend + Coordinación |
| Lewis De La Rosa Castro | Backend |
| Jaber Vargas | Frontend |
| Bryan Pedroza | Frontend |

## Flujo de trabajo

- Ramas: `main` (estable) ← `develop` ← `feature/SGDE-XX-nombre-corto`, donde `SGDE-XX` corresponde al issue de Jira.
- Toda historia se considera terminada cuando: código + migración (si aplica) + endpoint probado + pantalla conectada + issue movido a "Done" en Jira.

## Estado del proyecto

🚧 En desarrollo 
d3e7d5907ada7dda08aab38f0b4217093d69f281
