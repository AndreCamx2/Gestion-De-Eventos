import { Boton, CabeceraPagina } from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import { DialogoBajaCliente, DialogoDescartarCambios } from "./clientes/ConfirmacionesCliente";
import DialogoNuevaEmpresa from "./clientes/DialogoNuevaEmpresa";
import DialogoReactivarCliente from "./clientes/DialogoReactivarCliente";
import FiltrosClientes from "./clientes/FiltrosClientes";
import ListaClientes from "./clientes/ListaClientes";
import PanelCliente from "./clientes/PanelCliente";
import { useClientes } from "./clientes/useClientes";
import "../styles/directorio-clientes.css";

// Directorio de clientes. El estado y las acciones están en
// pages/clientes/useClientes.js y cada parte de la pantalla en pages/clientes/ (SGDE-97).
export default function Clientes() {
  const c = useClientes();
  // "Entrar de nuevo" desde una ventana: al volver, el foco va al botón que se le pasa (SGDE-94).
  const entrarDeNuevo = (boton) => c.sesionRef.current?.abrir({ focoAlVolver: boton });
  const crear = () => c.siNoHayCambios(c.abrirCrear);

  return (
    <div className="directorio">
      <CabeceraPagina
        antetitulo="Administración"
        titulo="Clientes"
        subtitulo="Personas y empresas. Dar de baja no borra su historia."
        acciones={
          <Boton variante="principal" onClick={crear}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo cliente
          </Boton>
        }
      />

      <FiltrosClientes
        filtroTipo={c.filtroTipo}
        onFiltroTipo={c.setFiltroTipo}
        busqueda={c.busqueda}
        onBusqueda={c.setBusqueda}
        buscarRef={c.buscarRef}
        mostrarInactivos={c.mostrarInactivos}
        onAlternarInactivos={() => c.setMostrarInactivos((valor) => !valor)}
      />

      <div className="directorio__cuerpo">
        <ListaClientes
          vista={c.vistaLista}
          errorCarga={c.errorCarga}
          onReintentar={c.cargarDatos}
          mostrarInactivos={c.mostrarInactivos}
          onCrear={crear}
          onQuitarFiltros={c.quitarFiltros}
          tablaRef={c.tablaRef}
          cargando={c.cargando}
          clientes={c.clientesFiltrados}
          clienteSeleccionado={c.clienteSeleccionado}
          onSeleccionar={c.seleccionar}
          obtenerIdentificacion={c.obtenerIdentificacion}
        />

        <PanelCliente
          panelRef={c.panelRef}
          panel={c.panel}
          clienteSeleccionado={c.clienteSeleccionado}
          tituloPanelRef={c.tituloPanelRef}
          onCerrar={() => c.siNoHayCambios(c.cerrarPanel)}
          onSubmit={c.handleSubmitForm}
          form={c.form}
          errores={c.erroresCampo}
          empresas={c.empresas}
          onChange={c.handleChange}
          onNuevaEmpresa={c.abrirNuevaEmpresa}
          onVerInactivo={c.verClienteInactivo}
          errorAccion={c.errorAccion}
          aviso={c.aviso}
          guardarRef={c.guardarRef}
          procesando={c.procesando}
          onBaja={c.abrirBaja}
          onReactivar={(e) => { c.disparadorRef.current = e.currentTarget; c.setReactivando(true); }}
        />
      </div>

      <DialogoBajaCliente
        dialogoRef={c.dialogoBajaRef}
        confirmarRef={c.confirmarBajaRef}
        cliente={c.clienteSeleccionado}
        procesando={c.procesando}
        error={c.errorBaja}
        sesionVencida={c.sesionVencida}
        onEntrarDeNuevo={entrarDeNuevo}
        onConfirmar={c.handleConfirmarBaja}
        onClose={c.alCerrarDialogo}
      />

      <DialogoDescartarCambios
        dialogoRef={c.dialogoDescartarRef}
        onDescartar={c.descartarCambios}
        onClose={c.alCerrarDialogo}
      />

      {c.reactivando && c.clienteSeleccionado && (
        <DialogoReactivarCliente
          cliente={c.clienteSeleccionado}
          onReactivado={c.alReactivarCliente}
          onCerrar={() => { c.setReactivando(false); c.alCerrarDialogo(); }}
          onSesionVencida={() => c.setSesionVencida(true)}
          sesionVencida={c.sesionVencida}
          onEntrarDeNuevo={entrarDeNuevo}
        />
      )}

      {c.creandoEmpresa && (
        <DialogoNuevaEmpresa
          onCreada={c.alCrearEmpresa}
          onCerrar={c.cerrarNuevaEmpresa}
          onSesionVencida={() => c.setSesionVencida(true)}
          sesionVencida={c.sesionVencida}
          onEntrarDeNuevo={entrarDeNuevo}
        />
      )}

      <SesionVencida ref={c.sesionRef} visible={c.sesionVencida} onReingreso={c.alVolverAEntrar} />
    </div>
  );
}
