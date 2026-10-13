import "./AvisoSesion.css";

// Aviso de sesión vencida (401), maqueta CasosLimite: barra oscura fija abajo.
// No borra nada de la pantalla: solo avisa y ofrece "Entrar de nuevo".
// - visible: si es false no se pinta.
// - onEntrar: qué hacer al pulsar "Entrar de nuevo" (por ejemplo, abrir el
//   diálogo de components/SesionVencida.jsx, que ya trae este aviso).
export default function AvisoSesion({ visible, onEntrar, texto = "Tu sesión expiró. Lo que escribiste sigue aquí." }) {
  if (!visible) return null;

  return (
    <>
      {/* Espacio al final de la página: el aviso es fijo y, sin esto, tapa lo último
          (por ejemplo, el botón Guardar en teléfono) sin poder desplazarlo encima. */}
      <div className="aviso-sesion__espacio" aria-hidden="true" />
      <div className="aviso-sesion" role="alert">
        <svg className="aviso-sesion__icono" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
        </svg>
        <p className="aviso-sesion__texto">{texto}</p>
        <button type="button" className="aviso-sesion__boton" onClick={onEntrar}>
          Entrar de nuevo
        </button>
      </div>
    </>
  );
}
