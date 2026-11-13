import { Boton } from "../../components/ui";

export default function EstadoCliente({ activo }) {
  return (
    <span className={`directorio-estado ${activo ? "directorio-estado--activo" : "directorio-estado--inactivo"}`}>
      <span className="directorio-estado__punto" aria-hidden="true" />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

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
