// Cierra el <dialog> que contiene al elemento (para los botones "Cancelar").
// Vive fuera de Dialogo.jsx porque un .jsx solo exporta componentes (react-refresh,
// SGDE-55). La usan los botones "Cancelar" de las ventanas hechas con Dialogo.
export function cerrarDialogoDe(elemento) {
  elemento?.closest("dialog")?.close();
}
