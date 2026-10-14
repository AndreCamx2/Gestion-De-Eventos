// Componentes base de Piedra viva. Uso:
// import { Boton, Tarjeta, CabeceraPagina } from "../components/ui";
export { default as Boton } from "./Boton";
export { default as EstadoBadge } from "./EstadoBadge";
export { default as LeyendaEstados } from "./LeyendaEstados";
export { default as Tarjeta } from "./Tarjeta";
export { default as CabeceraPagina } from "./CabeceraPagina";
export { default as TablaContenedor } from "./TablaContenedor";
export { default as Campo } from "./Campo";
// Estados de carga, vacío y error (maqueta CasosLimite)
export { default as Esqueleto } from "./Esqueleto";
export { default as EstadoVacio } from "./EstadoVacio";
export { default as AvisoError } from "./AvisoError";
export { default as AvisoSesion } from "./AvisoSesion";
// Ventana modal con <dialog> nativo (SGDE-81). Todas las ventanas la usan desde
// SGDE-106. cerrarDialogoDe cierra la ventana desde un botón "Cancelar" (SGDE-55).
export { default as Dialogo } from "./Dialogo";
export { cerrarDialogoDe } from "./cerrarDialogo";
