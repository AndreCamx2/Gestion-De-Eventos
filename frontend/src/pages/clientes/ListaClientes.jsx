import {
  AvisoError,
  Boton,
  Esqueleto,
  EstadoVacio,
  TablaContenedor,
  Tarjeta,
} from "../../components/ui";
import EstadoCliente from "./EstadoCliente";
import { iniciales } from "./clientes";

// Zona de la lista del directorio. `vista` dice qué se ve: "error" | "sesion" |
// "carga" | "vacio" | "sinCoincidencias" | "tabla" (la calcula useClientes).
// - clientes: la lista ya filtrada.
// - tablaRef: la tabla recibe el foco al cerrar el panel.
// - onCrear, onQuitarFiltros, onReintentar, onSeleccionar(cliente): acciones de los botones.
export default function ListaClientes({
  vista,
  errorCarga,
  onReintentar,
  mostrarInactivos,
  onCrear,
  onQuitarFiltros,
  tablaRef,
  cargando,
  clientes,
  clienteSeleccionado,
  onSeleccionar,
  obtenerIdentificacion,
}) {
  return (
    <div className="directorio__lista">
    <div className="directorio__lista">
      {vista === "error" && (
        <Tarjeta>
          <AvisoError tipo={errorCarga} onReintentar={onReintentar} />
        </Tarjeta>
      )}

      {vista === "sesion" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Tu sesión expiró"
            texto="Vuelve a entrar con el aviso de abajo para ver la lista de clientes."
          />
        </Tarjeta>
      )}

      {vista === "carga" && (
        <TablaContenedor>
          <Esqueleto filas={6} columnas={3} etiqueta="Cargando clientes…" />
        </TablaContenedor>
      )}

      {vista === "vacio" && (
        <Tarjeta>
          <EstadoVacio
            titulo={mostrarInactivos ? "Aún no hay clientes" : "No hay clientes activos"}
            texto={
              mostrarInactivos
                ? "Cuando registres el primero, aparecerá aquí con su tipo y sus cotizaciones."
                : "Registra el primero, o activa «Mostrar inactivos» para ver los dados de baja."
            }
            accion={
              <Boton variante="secundario" onClick={onCrear}>
                Registrar el primero
              </Boton>
            }
          />
        </Tarjeta>
      )}

      {vista === "sinCoincidencias" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Ningún cliente coincide"
            texto="Prueba con otro nombre, NIT, cédula o correo, o quita los filtros."
            accion={
              <Boton variante="secundario" onClick={onQuitarFiltros}>
                Quitar filtros
              </Boton>
            }
          />
        </Tarjeta>
      )}

      {vista === "tabla" && (
        <TablaContenedor
          ref={tablaRef}
          etiqueta="Listado de clientes"
          aria-busy={cargando || undefined}
          className={cargando ? "directorio-tabla-caja--recargando" : ""}
        >
          <table className="directorio-tabla">
            <colgroup>
              <col />
              <col className="directorio-tabla__col-tipo" />
              <col className="directorio-tabla__col-ident" />
              <col className="directorio-tabla__col-cotiz" />
              <col className="directorio-tabla__col-estado" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Tipo</th>
                <th scope="col">Identificación</th>
                <th scope="col" className="directorio-tabla__num">
                  <span aria-hidden="true">Cotiz.</span>
                  <span className="visually-hidden">Cotizaciones</span>
                </th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const seleccionado = clienteSeleccionado?.id === c.id;
                const clases = [
                  "directorio-tabla__fila",
                  seleccionado && "directorio-tabla__fila--seleccionada",
                  !c.activo && "directorio-tabla__fila--inactiva",
                ].filter(Boolean).join(" ");
                return (
                  // Con mouse se puede hacer clic en toda la fila. El teclado y el
                  // lector de pantalla usan el botón del nombre: su clic sube hasta aquí.
                  <tr key={c.id} className={clases} onClick={() => onSeleccionar(c)}>
                    <td>
                      <button
                        type="button"
                        className="directorio-tabla__cliente"
                        aria-current={seleccionado || undefined}
                      >
                        <span className="directorio-avatar" aria-hidden="true">{iniciales(c.nombre)}</span>
                        <span className="directorio-tabla__textos">
                          <span className="directorio-tabla__nombre">{c.nombre}</span>
                          <span className="directorio-tabla__correo">{c.correo || "Sin correo"}</span>
                        </span>
                      </button>
                    </td>
                    <td className="directorio-tabla__tipo">{c.tipo === "juridica" ? "Jurídica" : "Natural"}</td>
                    <td className="directorio-tabla__ident">{obtenerIdentificacion(c)}</td>
                    <td className="directorio-tabla__num directorio-tabla__cotiz">{c.cotizaciones?.length ?? 0}</td>
                    <td>
                      <EstadoCliente activo={c.activo} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TablaContenedor>
      )}
    </div>
    </div>
  );
}
