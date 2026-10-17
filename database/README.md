# database/

Esta carpeta **no** contiene las migraciones reales. Esas viven dentro de cada app de Django, en `backend/apps/<app>/migrations/`, y se generan con `python manage.py makemigrations`.

Aquí va solo material de referencia:

- `diagramas/Modelo Relacional/`: las 16 tablas del negocio con sus columnas, llaves y restricciones, generadas desde los `models.py`.
  - `modelo_relacional.md`: diagrama en Mermaid, que GitHub dibuja al abrir el archivo, y la lista de restricciones que no se ven en el dibujo.
  - `Modelo_Relacional_SGDE.pu` y su imagen `Modelo_Relacional_SGDE.png`.
- `scripts/sgde_schema_export.sql`: el esquema real de la base (solo estructura, sin datos), exportado con `pg_dump` después de aplicar todas las migraciones. Sirve para consultarlo, no para crear la base: eso lo hacen las migraciones. Al inicio del archivo está el comando para volver a generarlo.
- `seeds/`: vacía a propósito. Los datos de prueba (sitio, salones, conceptos, clientes y usuarios demo) los crea el comando `python manage.py seed_demo`, que corre solo al levantar Docker. Ver [`docs/entorno-local.md`](../docs/entorno-local.md).

Si cambias un modelo, actualiza en el mismo PR el diagrama de clases (`docs/Diagrama_Clases_SGDE.pu`) y este modelo relacional.
