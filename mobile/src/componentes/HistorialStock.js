import { Text } from "./Texto";
import { pesos } from "../utils/formato";
import { momentoLegible } from "../utils/fechas";
import { Seccion } from "./formulario";
import { Tarjeta, estilos } from "./ui";

// Cambios de cantidad y valor de un elemento de stock (lo usan el proveedor y el administrador).
export default function HistorialStock({ historial }) {
  if (!historial?.length) return null;
  return (
    <Seccion titulo="Historial de cambios">
      {historial.map((h) => (
        <Tarjeta key={h.id}>
          <Text style={estilos.textoFuerte}>
            {h.cantidad_anterior} → {h.cantidad_nueva} und. · {pesos(h.valor_anterior)} → {pesos(h.valor_nuevo)}
          </Text>
          <Text style={estilos.textoSuave}>
            {momentoLegible(h.fecha_modificacion)}
            {h.modificado_por ? ` · ${h.modificado_por}` : ""}
          </Text>
        </Tarjeta>
      ))}
    </Seccion>
  );
}
