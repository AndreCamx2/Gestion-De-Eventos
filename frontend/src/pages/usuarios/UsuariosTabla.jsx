import { TablaContenedor } from "../../components/ui";
import { bloqueoDeBaja, iniciales, nombreCompleto, nombreRol, ultimoAcceso } from "./usuarios";

function IconoEditar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
    </svg>
  );
}

function IconoBaja() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.6 5.6l12.8 12.8" />
    </svg>
  );
}

function IconoReactivar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5" />
    </svg>
  );
}

function Fila({ usuario, u }) {
  const nombre = nombreCompleto(usuario);
  const esYo = usuario.id === u.yoId;
  const bloqueo = bloqueoDeBaja(usuario, u.yoId);

  return (
    <tr className="usuarios-fila" data-inactivo={!usuario.is_active || undefined}>
      <td>
        <div className="usuarios-persona">
          <span className={`usuarios-avatar usuarios-avatar--${usuario.rol_codigo ?? "otro"}`} aria-hidden="true">{iniciales(usuario)}</span>
          <div className="usuarios-persona__textos">
            <p className="usuarios-persona__nombre">
              {nombre}
              {esYo && <span className="usuarios-marca">Tú</span>}
            </p>
            <p className="usuarios-persona__detalle">{[usuario.username, usuario.email].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      </td>
      <td><span className={`usuarios-chip usuarios-chip--${usuario.rol_codigo ?? "otro"}`}>{nombreRol(usuario, u.roles)}</span></td>
      <td className="usuarios-tabla__suave">{ultimoAcceso(usuario.last_login)}</td>
      <td>
        <span className={`usuarios-estado usuarios-estado--${usuario.is_active ? "activo" : "inactivo"}`}>
          {usuario.is_active ? "Activo" : "Inactivo"}
        </span>
      </td>
      <td className="usuarios-tabla__acciones">
        <button type="button" className="usuarios-accion" aria-label={`Editar a ${nombre}`} title="Editar" onClick={(e) => u.abrirDialogo("editar", usuario, e)}>
          <IconoEditar />
        </button>
        {usuario.is_active ? (
          <button
            type="button"
            className="usuarios-accion usuarios-accion--peligro"
            aria-label={bloqueo ?? `Dar de baja a ${nombre}`}
            title={bloqueo ?? "Dar de baja"}
            disabled={Boolean(bloqueo)}
            onClick={(e) => u.abrirDialogo("baja", usuario, e)}
          >
            <IconoBaja />
          </button>
        ) : (
          <button type="button" className="usuarios-accion" aria-label={`Reactivar a ${nombre}`} title="Reactivar" onClick={(e) => u.abrirDialogo("reactivar", usuario, e)}>
            <IconoReactivar />
          </button>
        )}
      </td>
    </tr>
  );
}

export default function UsuariosTabla({ u }) {
  return (
    <TablaContenedor etiqueta="Usuarios internos" className="usuarios-tabla-caja">
      <table className="usuarios-tabla">
        <thead>
          <tr>
            <th scope="col">Usuario</th>
            <th scope="col">Rol</th>
            <th scope="col">Último acceso</th>
            <th scope="col">Estado</th>
            <th scope="col"><span className="visually-hidden">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {u.visibles.map((usuario) => (
            <Fila key={usuario.id} usuario={usuario} u={u} />
          ))}
        </tbody>
      </table>
    </TablaContenedor>
  );
}
