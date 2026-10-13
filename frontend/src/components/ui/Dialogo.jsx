import { useEffect, useRef } from "react";
import "./Dialogo.css";

// Ventana modal de Piedra viva, con <dialog> nativo: showModal() deja inactivo
// el fondo, encierra el foco dentro y cierra con Escape (evento "cancel").
//
// Se pinta ya abierta: la pantalla la monta solo mientras está activa y la quita
// cuando avisa con onCerrar (Escape, la X o "Cancelar"). Al quitarla, la pantalla
// devuelve el foco al botón que la abrió.
// - idTitulo / titulo: el <h2> que nombra la ventana para lectores de pantalla.
// - bloqueado: mientras se guarda, ni Escape ni la X la cierran.
// - El foco inicial va al elemento marcado con data-foco-inicial, o al primer campo.
// Clases para el contenido: dialogo__form (columna de campos), dialogo__error
// (error general) y dialogo__acciones (botones abajo a la derecha).
//
// Con la sesión vencida, la ventana muestra <AvisoSesionEnVentana> de
// components/SesionVencida.jsx: la barra de abajo queda inerte detrás del modal (SGDE-94).
export default function Dialogo({ idTitulo, titulo, bloqueado = false, onCerrar, className = "", children }) {
  const dialogoRef = useRef(null);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    // En desarrollo StrictMode corre el efecto dos veces: solo se abre una.
    if (dialogo.open) return;
    dialogo.showModal();
    const inicial =
      dialogo.querySelector("[data-foco-inicial]:not(:disabled)") ??
      dialogo.querySelector("input, select, textarea");
    inicial?.focus();
  }, []);

  return (
    <dialog
      ref={dialogoRef}
      className={["dialogo", className].filter(Boolean).join(" ")}
      aria-labelledby={idTitulo}
      onCancel={(e) => bloqueado && e.preventDefault()}
      onClose={onCerrar}
    >
      <div className="dialogo__cabecera">
        <h2 id={idTitulo} className="dialogo__titulo">
          {titulo}
        </h2>
        <button
          type="button"
          className="dialogo__cerrar"
          aria-label="Cerrar"
          disabled={bloqueado}
          onClick={() => dialogoRef.current?.close()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {children}
    </dialog>
  );
}

// Cierra el <dialog> que contiene al elemento (para los botones "Cancelar").
export function cerrarDialogoDe(elemento) {
  elemento?.closest("dialog")?.close();
}
