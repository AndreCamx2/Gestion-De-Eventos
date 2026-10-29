import { Boton, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { adaptarBorrador } from "./adaptarCotizacion";
import CotizacionImprimible from "./CotizacionImprimible";
import "../../styles/cotizacion-imprimible.css";

// Vista previa para el cliente: la misma hoja de "Imprimir o PDF" (SGDE-70) con lo
// que se lleva armado. Para imprimirla de verdad hay que guardarla primero.
export default function VistaPreviaCotizacion({ c, onCerrar }) {
  return (
    <Dialogo
      idTitulo="nc-vista-previa-titulo"
      titulo="Vista previa para el cliente"
      className="dialogo--hoja"
      onCerrar={onCerrar}
    >
      <CotizacionImprimible cotizacion={adaptarBorrador(c)} nivelTitulo="h3" />
      <p className="nc-vista-previa__nota">
        Así la verá el cliente. Guárdala para imprimirla o descargarla en PDF.
      </p>
      <div className="dialogo__acciones">
        <Boton variante="secundario" onClick={(e) => cerrarDialogoDe(e.currentTarget)} data-foco-inicial>
          Seguir editando
        </Boton>
      </div>
    </Dialogo>
  );
}
