// Cierra el <dialog> que contiene al elemento (para los botones "Cancelar").
// Vive fuera de Dialogo.jsx porque un .jsx solo exporta componentes (react-refresh,
// SGDE-55). La usan Dialogo y también SalonDialogo y ConceptosDialogo.
export function cerrarDialogoDe(elemento) {
  elemento?.closest("dialog")?.close();
}
