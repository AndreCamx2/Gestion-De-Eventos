# Documentación de SGDE

Índice de la documentación y los diagramas del proyecto. Todos los diagramas describen el **sistema construido** (revisados contra el código el 2026-10-17). La excepción es la carpeta de actividades fuera de alcance, que es análisis inicial.

## Documentos

| Documento | Para qué sirve |
|---|---|
| [`Requerimientos Proyecto Gestion De Eventos.docx`](.) | Requerimientos oficiales RF-01 a RF-13 y RNF-01 a RNF-08 |
| [`Casos de Prueba - Sistema de Gestión de Eventos.docx`](.) | Los 22 casos de prueba (CP-01 a CP-22) que citan los diagramas de secuencia |
| [`documentacion-proyecto.md`](documentacion-proyecto.md) | Levantamiento de requerimientos con el cliente (agosto de 2026) |
| [`entorno-local.md`](entorno-local.md) | Cómo levantar el proyecto con Docker en Windows |
| `diseno/piedra-viva/` | Guía visual del rediseño del frontend (en la rama `rediseno`) |

## Diagramas

Cada diagrama tiene su fuente en PlantUML (`.pu` o `.puml`) y su imagen (`.png`) al lado.

| Carpeta o archivo | Contenido |
|---|---|
| [`arquitectura/`](arquitectura/) | **Diseño del sistema construido:** estados de la cotización, despliegue (Vercel, Render, GitHub Actions y Docker), componentes, paquetes, objetos, comunicación, sesión JWT y la secuencia de bloquear y confirmar sin sobreventa |
| [`Diagrama_Clases_SGDE.pu`](Diagrama_Clases_SGDE.pu) | Las 16 clases del modelo y sus relaciones |
| [`../database/diagramas/Modelo Relacional/`](../database/diagramas/Modelo%20Relacional/) | Las 16 tablas con columnas, llaves y restricciones |
| [`casos_uso_sgde/`](casos_uso_sgde/) | `SGDE-00` es el diagrama general con los roles reales (administrador, proveedor, cliente, visitante y el sistema). Los demás tienen un diagrama por tarea de Jira |
| [`Diagrama_Actividades_SGDE.pu`](Diagrama_Actividades_SGDE.pu) | Proceso comercial completo, con carriles Administrador y Sistema |
| [`Diagrama de actividades/`](Diagrama%20de%20actividades/) | Un flujo por caso de uso (CU-01 a CU-15 y CU-21 a CU-23) |
| [`Diagrama de actividades/fuera_de_alcance/`](Diagrama%20de%20actividades/fuera_de_alcance/) | CU-16 a CU-20 (BEO, ejecución, liquidación, cierre y reportes). Análisis inicial que **no** hace parte de la beta |
| [`diagramas_secuencia_sgde_v3/`](diagramas_secuencia_sgde_v3/) | Secuencias de nivel sistema (Interfaz – API – Base de datos) con la ruta del API y las respuestas reales (400, 404, 409) |

### Cómo se leen

- **El bloqueo es un estado de la cotización**, no del salón: cotizado → bloqueado → confirmado → cancelado. "Vencida" no es un estado: se calcula con la fecha de validez de la oferta.
- **Confirmar no es un paso aparte:** registrar la garantía confirma el evento.
- **"Sitio"** es la entidad raíz: hotel, centro de convenciones, finca o casa de eventos. No existen las entidades Hotel, Bloqueo ni Evento.
- **El administrador** es quien cotiza, bloquea y confirma. En la beta no hay un rol "ejecutivo comercial".

## Cómo regenerar las imágenes

Con la extensión **PlantUML** de VS Code (`jebbs.plantuml`): abre el archivo y usa *Export Current Diagram* (formato PNG). Desde la terminal, con Java instalado:

```powershell
java -jar "$env:USERPROFILE\.vscode\extensions\jebbs.plantuml-2.18.1\plantuml.jar" -tpng -charset UTF-8 "docs\arquitectura\*.pu"
```

Los diagramas usan `!pragma layout smetana`, el motor de dibujo interno de PlantUML, así que no necesitan Graphviz. Ese motor falla con los paquetes (`package`) en el diagrama de clases. Por eso ese diagrama no los usa, y la app de Django de cada clase está anotada en su comentario inicial.

## Regla para que no se quede atrás

Todo PR que cambie un modelo, un estado o un endpoint actualiza en el mismo PR el diagrama que corresponde: clases y modelo relacional para un modelo, estados para el flujo de la cotización, secuencia para un endpoint. Si no coincide con el código, **el código manda**.
