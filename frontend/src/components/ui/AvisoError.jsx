import { Link } from "react-router-dom";
import Boton from "./Boton";
import "./AvisoError.css";

// Aviso de error al cargar una pantalla (maqueta CasosLimite):
// - tipo="permiso"  → 403: candado y botón "Volver al inicio".
// - tipo="servidor" → 500 o sin red: wifi tachado y botón "Reintentar", que
//   llama a onReintentar (normalmente la función que vuelve a cargar los datos).
//   Si no pasas onReintentar, no se muestra el botón.
// titulo y texto son opcionales: cada tipo trae los de la maqueta.
// No trae caja propia: envuélvelo en Tarjeta.
const TIPOS = {
  permiso: {
    titulo: "Esta sección es para administradores",
    texto: "Si necesitas acceso, pídeselo a un administrador.",
    icono: <path d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z" />,
  },
  servidor: {
    titulo: "No pudimos hablar con el servidor",
    texto: "Revisa tu conexión. Si sigue fallando, avisa al equipo técnico.",
    icono: <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18" />,
  },
};

export default function AvisoError({ tipo = "servidor", titulo, texto, onReintentar, nivel: Titulo = "h2", className = "", ...resto }) {
  const base = TIPOS[tipo] ?? TIPOS.servidor;

  return (
    <div {...resto} role="alert" className={["aviso-error", `aviso-error--${tipo}`, className].filter(Boolean).join(" ")}>
      <div className="aviso-error__cuerpo">
        <span className="aviso-error__icono" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {base.icono}
          </svg>
        </span>
        <div className="aviso-error__textos">
          <Titulo className="aviso-error__titulo">{titulo ?? base.titulo}</Titulo>
          <p className="aviso-error__texto">{texto ?? base.texto}</p>
        </div>
      </div>

      {tipo === "permiso" ? (
        <Boton as={Link} to="/inicio" variante="secundario" className="aviso-error__accion">
          Volver al inicio
        </Boton>
      ) : (
        onReintentar && (
          <Boton variante="secundario" className="aviso-error__accion aviso-error__reintentar" onClick={onReintentar}>
            Reintentar
          </Boton>
        )
      )}
    </div>
  );
}
