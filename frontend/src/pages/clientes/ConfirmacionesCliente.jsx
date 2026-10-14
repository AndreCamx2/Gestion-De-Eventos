import { Boton } from "../../components/ui";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";

// Ventana de confirmación con <dialog> nativo. showModal() deja inactivo el
// fondo, encierra el foco dentro y cierra con Escape (evento "cancel").
// `bloqueado` impide cerrarla mientras se procesa la acción.
function DialogoConfirmacion({ dialogoRef, idTitulo, titulo, bloqueado, onClose, children, acciones }) {
  return (
    <dialog
      ref={dialogoRef}
      className="directorio-dialogo"
      aria-labelledby={idTitulo}
      onCancel={(e) => bloqueado && e.preventDefault()}
      onClose={onClose}
      // Clic en el fondo oscuro: el destino es el propio <dialog>, no su contenido.
      onClick={(e) => e.target === e.currentTarget && !bloqueado && e.currentTarget.close()}
    >
      <div className="directorio-dialogo__contenido">
        <h2 id={idTitulo} className="directorio-dialogo__titulo">{titulo}</h2>
        {children}
        <div className="directorio-dialogo__acciones">{acciones}</div>
      </div>
    </dialog>
  );
}

// "Dar de baja" un cliente. Se abre con dialogoRef.current.showModal().
// - confirmarRef: el botón "Dar de baja", que recibe el foco al volver a entrar (SGDE-94).
// - onEntrarDeNuevo(boton): abre "Entrar de nuevo" encima de la confirmación.
export function DialogoBajaCliente({
  dialogoRef,
  confirmarRef,
  cliente,
  procesando,
  error,
  sesionVencida,
  onEntrarDeNuevo,
  onConfirmar,
  onClose,
}) {
  return (
    <DialogoConfirmacion
      dialogoRef={dialogoRef}
      idTitulo="directorio-baja-titulo"
      titulo="Dar de baja"
      bloqueado={procesando}
      onClose={onClose}
      acciones={
        <>
          {/* "Cancelar" va primero: al abrir, el foco cae en la opción segura. */}
          <Boton variante="secundario" onClick={() => dialogoRef.current?.close()} disabled={procesando}>
            Cancelar
          </Boton>
          <Boton ref={confirmarRef} variante="peligro" onClick={onConfirmar} disabled={procesando}>
            {procesando ? "Procesando..." : "Dar de baja"}
          </Boton>
        </>
      }
    >
      <p className="directorio-dialogo__texto">
        ¿Dar de baja a <strong>{cliente?.nombre}</strong>? El cliente dejará de aparecer en la lista y su
        usuario no podrá iniciar sesión. Sus datos y cotizaciones se conservan.
      </p>
      {sesionVencida && (
        <AvisoSesionEnVentana
          onEntrar={() => onEntrarDeNuevo(confirmarRef.current)}
        />
      )}
      {error && (
        <p className="directorio-aviso directorio-aviso--error" role="alert">Error: {error}</p>
      )}
    </DialogoConfirmacion>
  );
}

// "Cambios sin guardar": pregunta antes de descartar lo que se escribió en el panel.
export function DialogoDescartarCambios({ dialogoRef, onDescartar, onClose }) {
  return (
    <DialogoConfirmacion
      dialogoRef={dialogoRef}
      idTitulo="directorio-descartar-titulo"
      titulo="Cambios sin guardar"
      bloqueado={false}
      onClose={onClose}
      acciones={
        <>
          <Boton variante="secundario" onClick={() => dialogoRef.current?.close()}>
            Seguir editando
          </Boton>
          <Boton variante="peligro" onClick={onDescartar}>
            Descartar
          </Boton>
        </>
      }
    >
      <p className="directorio-dialogo__texto">Tienes cambios sin guardar. ¿Descartarlos?</p>
    </DialogoConfirmacion>
  );
}
