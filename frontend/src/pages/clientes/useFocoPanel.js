import { useEffect, useRef } from "react";

export function useFocoPanel(panel) {
  const tablaRef = useRef(null);
  const panelRef = useRef(null);
  const tituloPanelRef = useRef(null);
  const guardarRef = useRef(null);
  const focoPendienteRef = useRef(null);

  // El foco se mueve después de pintar, cuando el elemento destino ya existe.
  useEffect(() => {
    const destino = focoPendienteRef.current;
    if (!destino) return;
    focoPendienteRef.current = null;

    if (destino === "tabla") {
      tablaRef.current?.focus();
      return;
    }
    // Tras guardar: el botón estuvo deshabilitado y perdió el foco; vuelve a él
    // sin mover la página, junto al aviso "Cambios guardados".
    if (destino === "guardar") {
      guardarRef.current?.focus({ preventScroll: true });
      return;
    }
    const elemento =
      destino === "titulo"
        ? tituloPanelRef.current
        : panelRef.current?.querySelector("select, input, textarea");
    if (!elemento) return;
    elemento.focus({ preventScroll: true });

    const caja = panelRef.current.getBoundingClientRect();
    if (caja.top < 0 || caja.top > window.innerHeight - 120) {
      const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panelRef.current.scrollIntoView({ block: "start", behavior: reducir ? "auto" : "smooth" });
    }
  }, [panel]);

  return { tablaRef, panelRef, tituloPanelRef, guardarRef, focoPendienteRef };
}
