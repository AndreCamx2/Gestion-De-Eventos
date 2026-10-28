import { Boton } from "../../components/ui";

// Activo / Inactivo con texto y punto, como EstadoBadge (que es solo para cotizaciones).
export default function EstadoCliente({ activo }) {
  return (
    <span className={`directorio-estado ${activo ? "directorio-estado--activo" : "directorio-estado--inactivo"}`}>
      <span className="directorio-estado__punto" aria-hidden="true" />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

// Botón del panel según el estado: "Dar de baja" si está activo y "Reactivar" si
// no (SGDE-95). Cada uno recibe el evento, para devolver el foco al cerrar.
export function BotonEstadoCliente({ activo, disabled, onBaja, onReactivar }) {
  return activo ? (
    <Boton variante="peligro" onClick={onBaja} disabled={disabled}>
      Dar de baja
    </Boton>
  ) : (
    <Boton variante="secundario" onClick={onReactivar} disabled={disabled}>
      Reactivar
    </Boton>
  );
}
