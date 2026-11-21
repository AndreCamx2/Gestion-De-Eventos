# SGDE móvil

App para Android y iOS hecha con **React Native + Expo** (SDK 58), en JavaScript como el frontend web. Usa el mismo API de Django y los mismos usuarios.

Tiene las mismas funciones de la página web, organizadas por rol. Al entrar, cada rol ve su **Inicio** (cifras del día) y un menú con sus módulos.

| Rol | Qué hace en la app |
|---|---|
| Administrador | **Cotizaciones completas:** lista con filtros y cifras, nueva y editar (cliente, salón, montaje, aforo, conceptos y totales), detalle con bloquear y liberar, registrar garantía (confirmar), cambiar vigencia, aplazar, anular, cancelar con penalización y los movimientos. **Calendario** del mes, **rack** de 14 días, **disponibilidad** por salón. **Catálogos:** clientes (y empresas), venues, salones (montajes y aforos), conceptos (historial de precios), proveedores (stock, usuario de acceso, comparador de precios) y usuarios. **Reportes:** histórico e ingresos por tipo de evento. |
| Cliente | Crea su cuenta, ve **sus cotizaciones** (próximas y pasadas) con su detalle, y edita **su perfil** (teléfono, correo y contraseña). |
| Proveedor | **Mi stock:** ve su inventario, actualiza cantidad y valor (con historial de cambios) y agrega elementos. Edita **su perfil**. |

## Probarla en tu celular (lo más rápido)

1. Instala **Expo Go** en el celular (Play Store o App Store).
2. En PowerShell, desde la raíz del repositorio:

   ```powershell
   cd mobile
   npm install
   npx expo start
   ```

   > **Una sola vez** (quien agregue el calendario): `npx expo install @react-native-community/datetimepicker`. Instala la versión que corresponde al SDK de Expo y la anota en `package.json` y `package-lock.json`; sube esos dos archivos para que los demás solo necesiten `npm install`.

3. Escanea el código QR que aparece en la terminal: en Android, desde Expo Go; en iPhone, con la cámara.
   - El celular y el computador deben estar en la **misma red Wi-Fi**.
   - Si la red no lo permite (la de la universidad, por ejemplo), usa `npx expo start --tunnel`.
4. Entra con tu usuario de producción (administrador, cliente o proveedor).

Por defecto la app usa el API de **producción** (`https://sgde-backend.onrender.com/api`). Si el servidor estaba dormido, el primer ingreso puede tardar ~1 minuto.

## Usar el backend local

Copia `mobile/.env.example` a `mobile/.env.local` y cambia `EXPO_PUBLIC_API_URL`:

- **Desde el navegador del computador** (`npx expo start --web --port 5173`): `http://localhost:8000/api`. Usa el puerto **5173**, que el CORS del backend ya permite.
- **Desde el celular:** el celular no llega al `localhost` del computador. Usa la IP del PC en la red (`ipconfig` → "Dirección IPv4"), por ejemplo `http://192.168.1.50:8000/api`, y quita el `127.0.0.1:` del puerto 8000 en `docker-compose.yml` mientras pruebas. **No subas ese cambio.**

Después de cambiar `.env.local`, reinicia `npx expo start`.

## Comandos

```powershell
npm test          # pruebas (Jest + jest-expo + React Native Testing Library), incluidas las de src/compartido
npx eslint .      # lint
npx expo-doctor   # revisa que las dependencias sean compatibles con la SDK
```

Para instalar una librería usa `npx expo install <paquete>`, no `npm install`: elige la versión compatible con la SDK.

## Generar el APK (para instalar sin Expo Go)

El proyecto ya tiene `eas.json` con el perfil `preview`, que genera un `.apk`:

```powershell
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Al terminar, EAS da un enlace para descargar el APK e instalarlo en el celular (hay que permitir "instalar apps de origen desconocido").

## Cómo está organizada

```
mobile/src/
├── app/            Pantallas (Expo Router: cada archivo es una ruta)
│   ├── _layout.js  Navegación, títulos y botón "Salir"
│   ├── index.js    Entrada: manda a cada rol a su inicio
│   ├── login.js, registro.js, recuperar-clave.js, restablecer-clave.js
│   ├── inicio.js   Cifras y menú de cada rol
│   ├── cotizaciones/   index.js (lista) y nueva.js (nueva y ?editar=ID)
│   ├── cotizacion/[id].js  Detalle con todas las acciones y los movimientos
│   ├── calendario.js, rack.js, disponibilidad/, historico.js, ingresos.js
│   ├── clientes/, sitios.js, salones/, conceptos/, proveedores/, usuarios.js
│   ├── mis-cotizaciones/   (cliente)
│   ├── mi-stock/   (proveedor)
│   └── perfil.js   (cliente y proveedor)
├── compartido/     Copia de la lógica de la web (ver abajo)
├── api/            cliente.js (fetch + JWT con renovación), auth, disponibilidad, miStock, listas, extras
├── sesion/         Sesion.js (contexto de la sesión) y RequiereRol.js (guardia por uno o varios roles)
├── componentes/    ui.js (botones, campos, tarjetas), formulario.js (selector, diálogos, fechas,
│                   interruptores, cifras), useCarga.js, FormStock.js, HistorialStock.js
└── utils/          fechas (hora de Colombia), formato (pesos), estados, errores, validaciones
```

- **Tokens:** se guardan en `expo-secure-store` (cifrado del teléfono). En el navegador, en `sessionStorage`.
- **Sesión:** si el access vence, se renueva solo con el refresh, que rota (SGDE-92). Si el refresh venció, la app vuelve al login.
- **Seguridad:** la app solo oculta pantallas por rol. Quien decide de verdad es el backend (401/403).
- **Estilo:** los colores son los de Piedra viva (`src/tema.js`).
- **Fechas con calendario:** `componentes/CampoFecha.native.js` usa `@react-native-community/datetimepicker` (funciona en Expo Go). En Android abre el calendario del sistema; en iOS, uno dentro de una ventana con "Listo". Los días fuera del rango permitido (antes de hoy, después del evento) no se pueden tocar. En la versión web (`CampoFecha.js`) la fecha se escribe como `AAAA-MM-DD`, porque ese calendario no existe en el navegador.
- Listas desplegables y diálogos están hechos con React Native puro.

### `src/compartido`: la misma lógica que la web

Como la web también es React, la app usa **copias** de sus archivos de lógica: validaciones, cálculos de totales e impuestos, estados, mensajes de error, hooks como `useNuevaCotizacion` y `useDetalleCotizacion`, y los módulos de `frontend/src/api`. Así las reglas son idénticas en las dos (las pruebas de la web se copiaron también).

- Están en la misma estructura que en `frontend/src` (`api/`, `pages/`, `utils/`, `routes/`). Si cambias una regla en la web, copia el archivo aquí.
- `api/client.js` es el puente: la web llama `apiFetch(ruta, { skipAuth })` y aquí se traduce a `api(ruta, { publica })` del celular (SecureStore y renovación del token).
- `api/auth.js`, `api/perfil.js` y `utils/recuperarClave.js` son versiones del celular (entrar y salir lo maneja `sesion/Sesion.js`; la variable es `EXPO_PUBLIC_RECUPERAR_CLAVE`).
- Cambios a propósito frente a la web, marcados con un comentario "Cambio frente a la web":
  - `pages/salones/salones.js`: el enlace de la foto se revisa con una expresión, porque en React Native `new URL(...).protocol` no existe.
  - `pages/proveedores/proveedores.js` y `pages/cotizaciones/cancelacion.js`: sin `\p{L}` ni `\p{Diacritic}` en las expresiones.
  - `api/usuarios.js`: `URLSearchParams` sin `set()` ni `size`, que React Native no tiene.
  - `pages/cotizaciones/useCancelacion.js` y `useAnulacion.js`: el foco con `document` solo si existe.
- Lo que la web todavía no tiene en su `api/` (detalle de un cliente, historial de stock) está en `src/api/extras.js`.
