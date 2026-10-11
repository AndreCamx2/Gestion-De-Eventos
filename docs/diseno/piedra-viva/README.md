# Rediseño SGDE · Piedra viva

Guía visual del rediseño del frontend. Es la fuente de verdad para todos los PRs de la épica de rediseño: si algo no está aquí, se mira la maqueta de la pantalla; si tampoco está allí, se pregunta antes de inventar.

- `maquetas/`: el código fuente de las 17 pantallas (`.dc.html`). Es una maqueta, no código para copiar: sirve para leer colores, espacios, textos y estructura exactos. Los `{{ ... }}` y `<sc-for>` son plantillas del lienzo de diseño; en React se vuelven props y `.map()`.
- `capturas/`: imagen de cada pantalla, para ver el resultado esperado sin abrir el lienzo. Se generaron sin la tipografía final, así que la letra se ve ligeramente distinta.
- El lienzo interactivo (con botón Play) está en claude.ai y lo comparte Andrés.

## 1. Colores (variables CSS)

Todos los colores salen de variables. Ningún componente escribe un hex directamente.

| Variable | Valor | Uso |
| --- | --- | --- |
| `--color-fondo` | `#F3F2F0` | Fondo de todas las pantallas (piedra) |
| `--color-superficie` | `#FFFFFF` | Tarjetas, tablas, barra superior |
| `--color-superficie-2` | `#F7F6F3` | Hover de filas, zonas internas |
| `--color-campo` | `#F1EFEB` | Fondo de campos y chips neutros |
| `--color-linea` | `#E4E2DE` | Bordes de tarjetas y divisores |
| `--color-linea-fuerte` | `#D6D3CD` | Bordes de campos y botones secundarios |
| `--color-texto` | `#1D232B` | Texto principal, botón oscuro |
| `--color-texto-suave` | `#5D6673` | Texto secundario |
| `--color-texto-tenue` | `#646B77` | Etiquetas, ayudas, encabezados de tabla |
| `--color-tinta` | `#2F4A6D` | Acción principal (un solo botón tinta por pantalla) |
| `--color-tinta-hover` | `#243B58` | Hover del botón principal |
| `--color-tinta-suave` | `#E6ECF4` | Fondos suaves azules |
| `--color-mandarina` | `#EE8A63` | Acento: pestaña activa, puntos, barras |
| `--color-mandarina-texto` | `#A64E2B` | Mandarina para texto (cumple contraste) |
| `--color-durazno` | `#FCE5D9` | Fondos suaves cálidos, fila seleccionada, avatar |
| `--color-mantequilla` | `#F0B429` | Acento amarillo (barras, puntos) |
| `--color-mantequilla-texto` | `#875A00` | Amarillo para texto |
| `--color-peligro` | `#B42318` | Errores y "Dar de baja" |

Regla de oro: la tinta marca la acción principal y la mandarina solo acompaña. Si todo resalta, nada resalta.

## 2. Estados de cotización

Siempre etiqueta con texto + punto de color, nunca solo color.

| Estado | Fondo | Texto | Punto |
| --- | --- | --- | --- |
| Cotizado | `rgba(240,180,41,0.16)` | `#875A00` | `#F0B429` |
| Bloqueado | `rgba(111,131,217,0.18)` | `#3A4C99` | `#6F83D9` |
| Confirmado | `rgba(52,168,106,0.14)` | `#1F6E44` | `#34A86A` |
| Vencida | `rgba(238,138,99,0.16)` | `#9C4826` | `#EE8A63` |
| Cancelado | `rgba(93,102,115,0.18)` | `#525A66` | `#6E7581` |

Etiqueta: alto 26 px, padding 0 10 px, radio 999 px, letra 12 px peso 700, punto de 6 px.

## 3. Tipografía

Una sola familia: **Plus Jakarta Sans** (400, 500, 600, 700, 800), servida localmente igual que hoy se hace con Jost (sin depender de Google Fonts en producción).

| Rol | Tamaño | Peso | Extra |
| --- | --- | --- | --- |
| Título de pantalla | 48 px | 800 | `letter-spacing: -0.035em; line-height: 1` |
| Sección / tarjeta | 22 px | 800 | `letter-spacing: -0.02em` |
| Subtítulo de pantalla | 16 px | 400 | color `--color-texto-suave` |
| Cuerpo y campos | 15–16 px | 400–500 | `line-height: 1.5` |
| Etiqueta de campo | 13 px | 600 | color `--color-texto-suave` |
| Antetítulo ("CATÁLOGO") | 13 px | 800 | mayúsculas, `letter-spacing: 0.12em`, color `--color-mandarina-texto` |
| Encabezado de tabla | 12 px | 800 | mayúsculas, `letter-spacing: 0.06em`, color `--color-texto-tenue` |

Cifras de dinero y cantidades: `font-variant-numeric: tabular-nums`. Formato colombiano: `$ 10.733.000`.

## 4. Forma y espacio

- Radios: tarjetas 18–22 px, campos y botones 10–12 px, etiquetas y chips 999 px.
- Bordes: 1 px `--color-linea`. Sombras solo en paneles flotantes: `0 1px 2px rgba(29,35,43,.06), 0 24px 48px -24px rgba(29,35,43,.18)`.
- Espaciado en múltiplos de 4: 8, 12, 16, 20, 24, 28, 32, 40.
- Toda zona tocable mide mínimo 44 px de alto.

## 5. Estructura de página

- **Barra superior** blanca de 68 px con borde inferior: logo (cuadro oscuro con "S" y un punto mandarina), pestañas y avatar con menú (cerrar sesión).
- **Pestañas:** 14 px peso 600 color texto suave; la activa en texto principal, peso 700, con borde inferior de 3 px mandarina. Se filtran por rol, como hoy hace `NAV_ITEMS`.
- **Contenido:** ancho máximo 1320 px centrado, padding 32 px arriba y 40 px a los lados.
- **Cabecera de pantalla:** antetítulo, título, subtítulo a la izquierda; la acción principal a la derecha (alineada abajo).
- **En teléfono:** las pestañas se desplazan en horizontal, las tablas van dentro de una caja con `overflow-x: auto`, los paneles laterales se apilan debajo.

## 6. Botones

| Variante | Fondo | Texto | Borde |
| --- | --- | --- | --- |
| Principal | `--color-tinta` | `#FFFFFF` | — |
| Oscuro (confirmar dentro de un panel) | `--color-texto` | `#FFFFFF` | — |
| Secundario | `--color-superficie` | `--color-texto` | `--color-linea-fuerte` |
| Peligro | transparente | `--color-mandarina-texto` | `#F3C9B5` |
| Éxito (confirmar evento) | `#34A86A` | `#0E3B24` | — |

Alto 44–48 px, peso 700–800, radio 12 px. Deshabilitado: opacidad 0.5 y `cursor: not-allowed`.

## 7. Movimiento

- Solo se animan `transform` y `opacity`.
- Botón al presionar: `transform: scale(0.97)` en 160 ms con `cubic-bezier(0.23, 1, 0.32, 1)`.
- Hover solo con mouse: `@media (hover: hover) and (pointer: fine)`.
- Con `prefers-reduced-motion: reduce` no hay desplazamientos ni escalas.
- Nada se anima con atajos de teclado.

## 8. Accesibilidad

- Contraste mínimo 4.5:1 en texto normal. Por eso existen `--color-mandarina-texto` y `--color-mantequilla-texto`: los acentos puros no se usan como texto.
- Foco visible en todo control: `outline: 2px solid var(--color-tinta); outline-offset: 2px`.
- Botones de solo ícono con `aria-label`. Íconos decorativos con `aria-hidden="true"`.

## 9. Pantallas

| Maqueta | Ruta | Archivo actual | Estado |
| --- | --- | --- | --- |
| `Main.dc.html` (Login) | `/login` | `pages/Login.jsx` | Existe, se reestiliza |
| `Registro.dc.html` | `/registro` | `pages/Registrar.jsx` | Existe, se reestiliza |
| `Inicio.dc.html` | `/inicio` | `pages/Home.jsx` | Existe, se reestiliza |
| `Cotizaciones.dc.html` | `/cotizaciones` | `pages/Cotizaciones.jsx` | Existe, se reestiliza |
| `NuevaCotizacion.dc.html` | `/cotizaciones/nueva` | — | Nueva |
| `DetalleCotizacion.dc.html` | `/cotizaciones/:id` | — | Nueva |
| `CotizacionPDF.dc.html` | `/cotizaciones/:id/imprimir` | — | Nueva |
| `Calendario.dc.html` | `/calendario` | — | Nueva (depende de disponibilidad) |
| `Salones.dc.html` | `/salones` | `pages/Salones.jsx` | Existe, se reestiliza |
| `Conceptos.dc.html` | `/conceptos` | `pages/Conceptos.jsx` | Existe, se reestiliza |
| `Proveedores.dc.html` | `/proveedores` | `pages/Proveedores.jsx` | Existe, se reestiliza |
| `Clientes.dc.html` | `/clientes` | `pages/Clientes.jsx` | Existe, se reestiliza |
| `Sitios.dc.html` | `/sitios` | `pages/hoteles/Sitios.jsx` | Existe, se reestiliza |
| `Usuarios.dc.html` | `/usuarios` | — | Nueva |
| `Sistema.dc.html` | — | — | Referencia de esta guía |
| `CasosLimite.dc.html` | — | — | Cómo se ven carga, vacío, 401, 403, 409, 400 y 500 |
| `Movil.dc.html` | — | — | Referencia de cómo se ve el Inicio en teléfono |

Los datos de las maquetas son de ejemplo. En código, todo sale de la API.
