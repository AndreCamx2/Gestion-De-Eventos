// 1. Variables de diseño: van antes que cualquier otro CSS, incluido el que
//    importan las pantallas a través de App.
import "./styles/tokens.css";
// 2. Plus Jakarta Sans servida desde el propio sitio (Vite la empaqueta en dist/).
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// 3. Estilos globales. Se quedan después de App, como antes, para no cambiar
//    qué reglas ganan en las pantallas que aún no se han migrado.
import "./styles/main.css";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
