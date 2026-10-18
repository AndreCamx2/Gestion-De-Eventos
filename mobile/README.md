# SGDE móvil

App para Android y iOS hecha con **React Native + Expo** (SDK 58), en JavaScript como el frontend web. Usa el mismo API de Django y los mismos usuarios.

| Rol | Qué hace en la app |
|---|---|
| Administrador | **Disponibilidad y bloqueos:** elige un salón, ve sus próximos días (libres o con cotizaciones) y bloquea o libera una cotización. |
| Proveedor | **Mi stock:** ve su inventario, actualiza cantidad y valor, y agrega elementos. |
| Cliente | Entra, pero ve un aviso: en la beta su módulo está en la web. |

## Probarla en tu celular (lo más rápido)

1. Instala **Expo Go** en el celular (Play Store o App Store).
2. En PowerShell, desde la raíz del repositorio:

   ```powershell
   cd mobile
   npm install
   npx expo start
   ```

3. Escanea el código QR que aparece en la terminal: en Android, desde Expo Go; en iPhone, con la cámara.
   - El celular y el computador deben estar en la **misma red Wi-Fi**.
   - Si la red no lo permite (la de la universidad, por ejemplo), usa `npx expo start --tunnel`.
4. Entra con tu usuario de producción (administrador o proveedor).

Por defecto la app usa el API de **producción** (`https://sgde-backend.onrender.com/api`). Si el servidor estaba dormido, el primer ingreso puede tardar ~1 minuto.

## Usar el backend local

Copia `mobile/.env.example` a `mobile/.env.local` y cambia `EXPO_PUBLIC_API_URL`:

- **Desde el navegador del computador** (`npx expo start --web --port 5173`): `http://localhost:8000/api`. Usa el puerto **5173**, que el CORS del backend ya permite.
- **Desde el celular:** el celular no llega al `localhost` del computador. Usa la IP del PC en la red (`ipconfig` → "Dirección IPv4"), por ejemplo `http://192.168.1.50:8000/api`, y quita el `127.0.0.1:` del puerto 8000 en `docker-compose.yml` mientras pruebas. **No subas ese cambio.**

Después de cambiar `.env.local`, reinicia `npx expo start`.

## Comandos

```powershell
npm test          # pruebas (Jest + jest-expo + React Native Testing Library)
npx eslint .      # lint
npx expo-doctor   # revisa que las dependencias sean compatibles con la SDK
```

Para instalar una librería usa `npx expo install <paquete>`, no `npm install`: elige la versión compatible con la SDK.

## Cómo está organizada

```
mobile/src/
├── app/            Pantallas (Expo Router: cada archivo es una ruta)
│   ├── _layout.js  Navegación, barra superior y botón "Salir"
│   ├── index.js    Entrada: manda a cada rol a su módulo
│   ├── login.js
│   ├── disponibilidad/   index.js (salones) y [salon].js (próximos días)
│   ├── cotizacion/[id].js  Detalle con Bloquear y Liberar
│   └── mi-stock/   index.js, nuevo.js y [id].js (editar)
├── api/            cliente.js (fetch + JWT con renovación), auth, disponibilidad, miStock, listas
├── sesion/         Sesion.js (contexto de la sesión) y RequiereRol.js (guardia por rol)
├── componentes/    ui.js (botones, campos, tarjetas, estados) y FormStock.js
└── utils/          fechas (hora de Colombia), formato (pesos), estados, errores, validaciones
```

- **Tokens:** se guardan en `expo-secure-store` (cifrado del teléfono). En el navegador, en `sessionStorage`.
- **Sesión:** si el access vence, se renueva solo con el refresh, que rota (SGDE-92). Si el refresh venció, la app vuelve al login.
- **Seguridad:** la app solo oculta pantallas por rol. Quien decide de verdad es el backend (401/403).
- **Estilo:** los colores son los de Piedra viva (`src/tema.js`).
