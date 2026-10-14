import { useRef } from "react";
import SesionVencida from "../components/SesionVencida";
import { AvisoError, CabeceraPagina, Esqueleto, EstadoVacio, TablaContenedor, Tarjeta } from "../components/ui";
import DialogoEditarUsuario from "./usuarios/DialogoEditarUsuario";
import DialogoEstadoUsuario from "./usuarios/DialogoEstadoUsuario";
import FormNuevoUsuario from "./usuarios/FormNuevoUsuario";
import UsuariosTabla from "./usuarios/UsuariosTabla";
import { useUsuarios } from "./usuarios/useUsuarios";
import "../styles/usuarios.css";

function Herramientas({ u }) {
  return (
    <div className="usuarios-herramientas">
      <label className="usuarios-buscar">
        <span className="visually-hidden">Buscar usuario</span>
        <input
          type="search"
          className="campo__input"
          placeholder="Buscar por nombre, usuario o correo"
          value={u.busqueda}
          onChange={(e) => u.setBusqueda(e.target.value)}
        />
      </label>
      <label className="usuarios-filtro">
        <span className="visually-hidden">Filtrar por rol</span>
        <select className="campo__input" value={u.filtroRol} onChange={(e) => u.setFiltroRol(e.target.value)}>
          <option value="todos">Todos los roles</option>
          {u.roles.map((r) => (
            <option key={r.id} value={r.codigo}>{r.nombre}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        role="switch"
        className="usuarios-interruptor"
        aria-checked={u.mostrarInactivos}
        onClick={() => u.setMostrarInactivos(!u.mostrarInactivos)}
      >
        <span className="usuarios-interruptor__pista" aria-hidden="true">
          <span className="usuarios-interruptor__perilla" />
        </span>
        Mostrar inactivos
      </button>
    </div>
  );
}

function Listado({ u }) {
  if (u.errorCarga === "servidor") {
    return (
      <Tarjeta>
        <AvisoError tipo="servidor" onReintentar={u.cargar} />
      </Tarjeta>
    );
  }
  if (u.cargando && u.usuarios.length === 0) {
    return (
      <TablaContenedor>
        <Esqueleto filas={4} columnas={2} etiqueta="Cargando usuarios…" />
      </TablaContenedor>
    );
  }
  if (u.errorCarga === "sesion" && u.usuarios.length === 0) {
    return (
      <Tarjeta>
        <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver los usuarios." />
      </Tarjeta>
    );
  }
  if (u.visibles.length === 0) {
    const hayFiltros = u.busqueda.trim() || u.filtroRol !== "todos";
    return (
      <Tarjeta>
        <EstadoVacio
          titulo={hayFiltros ? "Nadie coincide con la búsqueda" : "Todavía no hay usuarios internos"}
          texto={hayFiltros ? "Prueba con otro nombre o quita el filtro de rol." : "Crea el primero con el formulario."}
        />
      </Tarjeta>
    );
  }
  return <UsuariosTabla u={u} />;
}

export default function Usuarios() {
  const u = useUsuarios();
  const sesionRef = useRef(null);

  const sesion = {
    sesionVencida: u.sesionVencida,
    onSesionVencida: () => u.setSesionVencida(true),
    onEntrarDeNuevo: (boton) => sesionRef.current?.abrir({ focoAlVolver: boton }),
  };
  const { dialogo } = u;

  return (
    <div className="usuarios-pv">
      <CabeceraPagina
        antetitulo="Administración"
        titulo="Usuarios internos"
        subtitulo="Administradores y proveedores. Los clientes se gestionan desde Clientes."
      />

      {u.errorCarga === "permiso" ? (
        <Tarjeta>
          <AvisoError tipo="permiso" />
        </Tarjeta>
      ) : (
        <div className="usuarios-cuerpo">
          <section className="usuarios-lista" aria-label="Usuarios registrados">
            <Herramientas u={u} />
            {u.aviso && <p className="usuarios-aviso" role="status">{u.aviso}</p>}
            <Listado u={u} />
            <p className="usuarios-nota">
              No puedes darte de baja ni cambiar tu propio rol, el superusuario solo se edita desde el panel de Django, y
              siempre debe quedar al menos un administrador activo.
            </p>
          </section>
          <FormNuevoUsuario u={u} />
        </div>
      )}

      {dialogo?.tipo === "editar" && (
        <DialogoEditarUsuario
          usuario={dialogo.usuario}
          roles={u.roles}
          sitios={u.sitios}
          esYo={dialogo.usuario.id === u.yoId}
          onGuardado={u.alActualizar}
          onCerrar={u.cerrarDialogo}
          sesion={sesion}
        />
      )}
      {(dialogo?.tipo === "baja" || dialogo?.tipo === "reactivar") && (
        <DialogoEstadoUsuario
          tipo={dialogo.tipo}
          usuario={dialogo.usuario}
          onGuardado={u.alActualizar}
          onCerrar={u.cerrarDialogo}
          sesion={sesion}
        />
      )}

      <SesionVencida ref={sesionRef} visible={u.sesionVencida} onReingreso={u.alVolverAEntrar} />
    </div>
  );
}
