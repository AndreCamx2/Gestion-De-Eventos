// Los tokens van antes que cualquier otro CSS, incluido el de las pantallas.
import "./styles/tokens.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Después de App, para no cambiar qué reglas ganan en las pantallas sin migrar.
import "./styles/main.css";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
