// Selector de vista de Proveedores (SGDE-71): "Stock por proveedor" o "Comparar
// precios". Botones con aria-pressed, como el filtro de tipo de Clientes.
const VISTAS = [
  { valor: "stock", etiqueta: "Stock por proveedor" },
  { valor: "comparar", etiqueta: "Comparar precios" },
];

export default function SelectorVista({ vista, onCambiar }) {
  return (
    <div className="proveedores-vistas" role="group" aria-label="Vista">
      {VISTAS.map((v) => (
        <button
          key={v.valor}
          type="button"
          className="proveedores-vistas__opcion"
          aria-pressed={vista === v.valor}
          onClick={() => onCambiar(v.valor)}
        >
          {v.etiqueta}
        </button>
      ))}
    </div>
  );
}
