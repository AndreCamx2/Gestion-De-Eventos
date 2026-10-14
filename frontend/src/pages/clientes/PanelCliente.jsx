import { Boton } from "../../components/ui";
import ClienteForm from "./ClienteForm";
import EstadoCliente, { BotonEstadoCliente } from "./EstadoCliente";
import HistorialCliente from "./HistorialCliente";
import { iniciales } from "./clientes";

// Panel lateral del directorio para crear y editar un cliente.
// - panel: null | { modo: "crear" } | { modo: "editar", cliente }. Sin panel, muestra
//   "Ningún cliente seleccionado".
// - clienteSeleccionado: el cliente que se edita (null al crear).
// - panelRef, tituloPanelRef, guardarRef: destinos del foco (useFocoPanel).
// - onCerrar: la X y "Cancelar" (preguntan antes si hay cambios sin guardar).
// - onBaja(), onReactivar(evento): abren la confirmación de cada acción.
export default function PanelCliente({
  panelRef,
  panel,
  clienteSeleccionado,
  tituloPanelRef,
  onCerrar,
  onSubmit,
  form,
  errores,
  empresas,
  onChange,
  onNuevaEmpresa,
  onVerInactivo,
  errorAccion,
  aviso,
  guardarRef,
  procesando,
  onBaja,
  onReactivar,
}) {
  return (
    <aside
      ref={panelRef}
      className={["directorio-panel", !panel && "directorio-panel--vacio"].filter(Boolean).join(" ")}
      aria-labelledby="directorio-panel-titulo"
    >
      {!panel ? (
        <div className="directorio-panel__vacio">
          <h2 id="directorio-panel-titulo" className="directorio-panel__vacio-titulo">Ningún cliente seleccionado</h2>
          <p>Selecciona un cliente para ver y editar sus datos, o crea uno nuevo.</p>
        </div>
      ) : (
        <>
          <div className="directorio-panel__cabecera">
            {clienteSeleccionado && (
              <span className="directorio-avatar directorio-avatar--grande" aria-hidden="true">
                {iniciales(clienteSeleccionado.nombre)}
              </span>
            )}
            <div className="directorio-panel__textos">
              <p className="directorio-panel__antetitulo">
                {clienteSeleccionado ? "Editar cliente" : "Nuevo cliente"}
              </p>
              <h2
                id="directorio-panel-titulo"
                ref={tituloPanelRef}
                tabIndex={-1}
                className="directorio-panel__titulo"
              >
                {clienteSeleccionado ? clienteSeleccionado.nombre : "Datos del cliente"}
              </h2>
              {clienteSeleccionado && (
                <p className="directorio-panel__meta">
                  Cliente desde {new Date(clienteSeleccionado.creado_en).toLocaleDateString("es-CO")}
                  {!clienteSeleccionado.activo && <EstadoCliente activo={false} />}
                </p>
              )}
            </div>
            <button
              type="button"
              className="directorio-panel__cerrar"
              aria-label="Cerrar panel"
              onClick={onCerrar}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <form className="directorio-panel__form" onSubmit={onSubmit} noValidate>
            <ClienteForm
              idPrefix={panel.modo}
              form={form}
              errores={errores}
              empresas={empresas}
              onChange={onChange}
              onNuevaEmpresa={onNuevaEmpresa}
              onVerInactivo={onVerInactivo}
            />

            {errorAccion && (
              <p className="directorio-aviso directorio-aviso--error" role="alert">Error: {errorAccion}</p>
            )}
            {/* Siempre presente (aunque vacío) para que el lector de pantalla anuncie el aviso. */}
            <p className="directorio-aviso directorio-aviso--exito" role="status">
              {aviso}
            </p>

            <div className="directorio-panel__acciones">
              <Boton
                ref={guardarRef}
                type="submit"
                variante="oscuro"
                className="directorio-panel__guardar"
                disabled={procesando}
              >
                {procesando ? "Guardando..." : clienteSeleccionado ? "Guardar cambios" : "Guardar"}
              </Boton>
              {clienteSeleccionado ? (
                <BotonEstadoCliente
                  activo={clienteSeleccionado.activo}
                  disabled={procesando}
                  onBaja={onBaja}
                  onReactivar={onReactivar}
                />
              ) : (
                <Boton variante="secundario" onClick={onCerrar} disabled={procesando}>
                  Cancelar
                </Boton>
              )}
            </div>

            {clienteSeleccionado && (
              <p className="directorio-panel__nota">
                {clienteSeleccionado.activo
                  ? "Dar de baja también le quita el acceso al sistema. Sus cotizaciones se conservan."
                  : "Este cliente está dado de baja: no puede iniciar sesión. Sus cotizaciones se conservan."}
              </p>
            )}
          </form>

          {clienteSeleccionado && <HistorialCliente cotizaciones={clienteSeleccionado.cotizaciones} />}
        </>
      )}
    </aside>
  );
}
