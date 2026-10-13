// Interruptor "Mostrar dados de baja" (SGDE-99), igual al "Mostrar inactivos" de
// Clientes: un botón con role="switch" y aria-checked.
export default function InterruptorBajas({ activo, onCambiar }) {
  return (
    <button
      id="salones-mostrar-bajas"
      type="button"
      role="switch"
      className="salones-interruptor"
      aria-checked={activo}
      onClick={() => onCambiar(!activo)}
    >
      <span className="salones-interruptor__pista" aria-hidden="true">
        <span className="salones-interruptor__perilla" />
      </span>
      Mostrar dados de baja
    </button>
  );
}
