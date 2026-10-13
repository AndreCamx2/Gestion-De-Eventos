import { useState, useEffect, useCallback, useMemo } from "react";
import { getUsuarioActual } from "../api/auth";
import { listarSitios } from "../api/sitios";
import {
  listarUsuarios,
  listarRoles,
  crearUsuario,
  actualizarUsuario,
  darDeBajaUsuario,
  reactivarUsuario,
} from "../api/usuarios";
import "../styles/usuarios.css";

// Roles que se pueden asignar a usuarios internos. "cliente" no va aquí:
// los clientes se crean desde la pantalla de Clientes.
const ROLES_INTERNOS = [
  { codigo: "administrador", nombre: "Administrador" },
  { codigo: "proveedor", nombre: "Proveedor" },
];

const ETIQUETA_ROL = {
  administrador: "Administrador",
  proveedor: "Proveedor",
  cliente: "Cliente",
};

const COLORES_AVATAR = ["#e9a93b", "#3aa76d", "#2f4a73", "#5b6fd6", "#8fb3d9", "#c76b8f"];

const FORM_INICIAL = {
  rolCodigo: "proveedor", // el de menor privilegio por defecto
  username: "",
  email: "",
  password: "",
  sitios: [],
};

/* ---------- Utilidades ---------- */

function nombreMostrar(usuario) {
  const completo = [usuario.first_name, usuario.last_name].filter(Boolean).join(" ");
  return completo || usuario.username;
}

function iniciales(usuario) {
  return nombreMostrar(usuario)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

function colorAvatar(texto) {
  let hash = 0;
  for (const caracter of texto) hash = (hash * 31 + caracter.charCodeAt(0)) % 997;
  return COLORES_AVATAR[hash % COLORES_AVATAR.length];
}

function mismosSitios(a, b) {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((valor, i) => valor === y[i]);
}

// "Hoy, 10:41 p. m." / "Ayer, 4:02 p. m." / "9 oct, 9:15 a. m." / "Nunca"
function formatearUltimoAcceso(iso) {
  if (!iso) return "Nunca";
  const fecha = new Date(iso);
  const hora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(fecha);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  if (fecha.toDateString() === hoy.toDateString()) return `Hoy, ${hora}`;
  if (fecha.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
  const dia = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" })
    .format(fecha)
    .replace(".", "");
  return `${dia}, ${hora}`;
}

// Indicador visual de la contraseña temporal. La validación real es la del
// backend (AUTH_PASSWORD_VALIDATORS); esto solo guía al administrador.
function evaluarPassword(password, username) {
  let nivel = 0;
  if (password.length >= 8) nivel += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) nivel += 1;
  if (/\d/.test(password)) nivel += 1;
  if (/[^A-Za-z0-9]/.test(password)) nivel += 1;

  let mensaje = "";
  let cumple = false;
  if (password) {
    if (password.length < 8) mensaje = "Mínimo 8 caracteres.";
    else if (/^\d+$/.test(password)) mensaje = "No puede ser solo números.";
    else if (username && password.toLowerCase().includes(username.toLowerCase()))
      mensaje = "No debe contener el nombre de usuario.";
    else {
      mensaje = "Cumple las reglas de seguridad";
      cumple = true;
    }
  }
  return { nivel, mensaje, cumple };
}

// Traduce el error de apiFetch (error.status, error.body) a mensajes.
// DRF responde { campo: ["mensaje"] }, { detail: "mensaje" } o ["mensaje"].
function erroresDeServidor(error) {
  const campos = {};
  let general = "";

  if (error.status === 401) {
    general = "Tu sesión expiró. Vuelve a iniciar sesión.";
  } else if (error.status === 403) {
    general = error.message || "No tienes permiso para esta acción.";
  } else if (Array.isArray(error.body)) {
    general = error.body.join(" ");
  } else if (error.body && typeof error.body === "object") {
    for (const [clave, valor] of Object.entries(error.body)) {
      const texto = Array.isArray(valor) ? valor.join(" ") : String(valor);
      if (clave === "detail" || clave === "non_field_errors") general = texto;
      else campos[clave] = texto;
    }
  }

  if (!general && Object.keys(campos).length === 0) {
    general = error.message || "No se pudo completar la acción.";
  }
  return { campos, general };
}

/* ---------- Pantalla ---------- */

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState("");

  const [yo, setYo] = useState(null); // usuario con sesión iniciada
  const [rolesApi, setRolesApi] = useState(null);
  const [errorRoles, setErrorRoles] = useState("");
  const [sitios, setSitios] = useState([]);
  const [errorSitios, setErrorSitios] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(false);

  const [editando, setEditando] = useState(null); // usuario en edición o null
  const [form, setForm] = useState(FORM_INICIAL);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [aviso, setAviso] = useState(null); // { tipo: "exito" | "error" | "info", texto }
  const [procesandoId, setProcesandoId] = useState(null);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setErrorLista("");
    try {
      setUsuarios(await listarUsuarios({ incluirInactivos }));
    } catch (error) {
      setErrorLista(error.message || "No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  }, [incluirInactivos]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const cargarRoles = useCallback(async () => {
    setErrorRoles("");
    try {
      setRolesApi(await listarRoles());
    } catch (error) {
      setRolesApi(null);
      setErrorRoles(error.message || "No se pudieron cargar los roles.");
    }
  }, []);

  useEffect(() => {
    getUsuarioActual().then(setYo).catch(() => {});
    cargarRoles();
    listarSitios()
      .then(setSitios)
      .catch(() => setErrorSitios("No se pudieron cargar los sitios."));
  }, [cargarRoles]);

  const rolPorCodigo = useMemo(() => {
    const mapa = {};
    (rolesApi ?? []).forEach((rol) => {
      mapa[rol.codigo] = rol.id;
    });
    return mapa;
  }, [rolesApi]);

  const internos = useMemo(
    () => usuarios.filter((u) => u.rol_codigo !== "cliente"),
    [usuarios]
  );

  const adminsActivos = useMemo(
    () => usuarios.filter((u) => u.rol_codigo === "administrador" && u.is_active).length,
    [usuarios]
  );

  const fuerza = evaluarPassword(form.password, form.username);

  /* ----- Reglas de la tabla (solo experiencia de usuario; el 403/400 del API manda) ----- */

  function reglasDeFila(u) {
    const esYo = yo != null && u.id === yo.id;
    const esSuper = Boolean(u.es_superusuario);
    const ultimoAdmin = u.rol_codigo === "administrador" && u.is_active && adminsActivos <= 1;

    let motivoEditar = "";
    if (!u.is_active) motivoEditar = "Usuario inactivo";
    else if (esSuper) motivoEditar = "El superusuario solo se edita desde el panel de Django";

    let motivoBaja = "";
    if (!u.is_active) motivoBaja = "Usuario inactivo";
    else if (esYo) motivoBaja = "No puedes darte de baja a ti mismo";
    else if (esSuper) motivoBaja = "El superusuario solo se edita desde el panel de Django";
    else if (ultimoAdmin) motivoBaja = "Debe quedar al menos un administrador activo";

    return { esYo, esSuper, motivoEditar, motivoBaja };
  }

  /* ----- Formulario ----- */

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  }

  function seleccionarRol(codigo) {
    setForm((prev) => ({ ...prev, rolCodigo: codigo }));
    setErrores((prev) => ({ ...prev, rol: undefined }));
  }

  function alternarSitio(id) {
    setForm((prev) => ({
      ...prev,
      sitios: prev.sitios.includes(id)
        ? prev.sitios.filter((s) => s !== id)
        : [...prev.sitios, id],
    }));
    setErrores((prev) => ({ ...prev, sitios: undefined }));
  }

  function iniciarEdicion(usuario) {
    setEditando(usuario);
    setForm({
      rolCodigo: usuario.rol_codigo,
      username: usuario.username,
      email: usuario.email ?? "",
      password: "",
      sitios: usuario.sitios ?? [],
    });
    setErrores({});
    setErrorGeneral("");
    setAviso(null);
  }

  function cancelarEdicion() {
    setEditando(null);
    setForm(FORM_INICIAL);
    setErrores({});
    setErrorGeneral("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setAviso(null);
    setErrorGeneral("");

    const rolId = rolPorCodigo[form.rolCodigo];
    const nuevos = {};
    if (!editando) {
      if (!form.username.trim()) nuevos.username = "El usuario es obligatorio.";
      if (!form.password) nuevos.password = "Ingresa una contraseña temporal.";
      else if (!fuerza.cumple) nuevos.password = fuerza.mensaje;
    }
    if (!form.email.trim()) nuevos.email = "El correo es obligatorio.";
    if (rolId == null) {
      nuevos.rol = errorRoles || "No se pudo obtener el identificador del rol. Vuelve a cargar los roles.";
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      if (editando) {
        // Solo se envía lo que cambió: así un usuario puede editar su correo
        // o sus sitios sin que el API crea que intenta cambiar su propio rol.
        const cambios = {};
        if (form.email.trim() !== (editando.email ?? "")) cambios.email = form.email.trim();
        if (rolId !== editando.rol) cambios.rol = rolId;
        if (!mismosSitios(form.sitios, editando.sitios ?? [])) cambios.sitios = form.sitios;

        if (Object.keys(cambios).length === 0) {
          setAviso({ tipo: "info", texto: "No hay cambios para guardar." });
        } else {
          await actualizarUsuario(editando.id, cambios);
          setAviso({ tipo: "exito", texto: `Usuario ${editando.username} actualizado.` });
        }
        cancelarEdicion();
      } else {
        await crearUsuario({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          rol: rolId,
          sitios: form.sitios,
        });
        setAviso({ tipo: "exito", texto: `Usuario ${form.username.trim()} creado.` });
        setForm({ ...FORM_INICIAL, rolCodigo: form.rolCodigo });
      }
      await cargarUsuarios();
    } catch (error) {
      const { campos, general } = erroresDeServidor(error);
      setErrores(campos);
      setErrorGeneral(general);
    } finally {
      setEnviando(false);
    }
  }

  async function handleBaja(usuario) {
    const confirmado = window.confirm(
      `¿Dar de baja a ${nombreMostrar(usuario)}? No podrá iniciar sesión.`
    );
    if (!confirmado) return;

    setProcesandoId(usuario.id);
    setAviso(null);
    try {
      await darDeBajaUsuario(usuario.id);
      if (editando?.id === usuario.id) cancelarEdicion();
      setAviso({ tipo: "exito", texto: `${nombreMostrar(usuario)} fue dado de baja.` });
      await cargarUsuarios();
    } catch (error) {
      const { campos, general } = erroresDeServidor(error);
      setAviso({ tipo: "error", texto: general || Object.values(campos).join(" ") });
    } finally {
      setProcesandoId(null);
    }
  }

  async function handleReactivar(usuario) {
    setProcesandoId(usuario.id);
    setAviso(null);
    try {
      await reactivarUsuario(usuario.id);
      setAviso({ tipo: "exito", texto: `${nombreMostrar(usuario)} fue reactivado.` });
      await cargarUsuarios();
    } catch (error) {
      const { campos, general } = erroresDeServidor(error);
      setAviso({ tipo: "error", texto: general || Object.values(campos).join(" ") });
    } finally {
      setProcesandoId(null);
    }
  }

  /* ----- Render ----- */

  const rolBloqueado = Boolean(editando && yo && editando.id === yo.id);

  return (
    <div className="usuarios">
      <header className="usuarios__cabecera">
        <p className="usuarios__eyebrow">Administración</p>
        <h1 className="usuarios__titulo">Usuarios internos</h1>
        <p className="usuarios__subtitulo">
          Administradores y proveedores. Los clientes se gestionan desde Clientes.
        </p>
      </header>

      {aviso && (
        <div className={`usuarios__alerta usuarios__alerta--${aviso.tipo}`} role="status">
          {aviso.texto}
        </div>
      )}

      <div className="usuarios__layout">
        <section className="usuarios__panel usuarios__panel--tabla">
          <label className="usuarios__filtro">
            <input
              type="checkbox"
              checked={incluirInactivos}
              onChange={(event) => setIncluirInactivos(event.target.checked)}
            />
            Mostrar usuarios inactivos
          </label>

          {cargando && <p className="usuarios__estado">Cargando usuarios…</p>}

          {errorLista && (
            <div className="usuarios__alerta usuarios__alerta--error" role="alert">
              <span>{errorLista}</span>
              <button type="button" className="usuarios__reintentar" onClick={cargarUsuarios}>
                Reintentar
              </button>
            </div>
          )}

          {!cargando && !errorLista && internos.length === 0 && (
            <p className="usuarios__estado">Aún no hay usuarios internos.</p>
          )}

          {!cargando && !errorLista && internos.length > 0 && (
            <div className="usuarios__tabla-wrap">
              <table className="usuarios__tabla">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Último acceso</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {internos.map((u) => {
                    const { esYo, esSuper, motivoEditar, motivoBaja } = reglasDeFila(u);
                    return (
                      <tr key={u.id} className={u.is_active ? "" : "is-inactivo"}>
                        <td>
                          <div className="usuarios__persona">
                            <span
                              className="usuarios__avatar"
                              style={{ background: colorAvatar(u.username) }}
                            >
                              {iniciales(u)}
                            </span>
                            <div>
                              <p className="usuarios__nombre">
                                {nombreMostrar(u)}
                                {esYo && <span className="usuarios__marca usuarios__marca--yo">Tú</span>}
                                {esSuper && (
                                  <span className="usuarios__marca usuarios__marca--super">
                                    Superusuario
                                  </span>
                                )}
                              </p>
                              <p className="usuarios__secundario">
                                {nombreMostrar(u) !== u.username ? u.username : u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`usuarios__badge usuarios__badge--${u.rol_codigo}`}>
                            {ETIQUETA_ROL[u.rol_codigo] ?? u.rol_codigo}
                          </span>
                        </td>
                        <td className="usuarios__acceso">{formatearUltimoAcceso(u.last_login)}</td>
                        <td>
                          <span
                            className={`usuarios__badge ${
                              u.is_active ? "usuarios__badge--activo" : "usuarios__badge--inactivo"
                            }`}
                          >
                            {u.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          <div className="usuarios__acciones">
                            {!u.is_active ? (
                              <button
                                type="button"
                                className="usuarios__icono usuarios__icono--activar"
                                onClick={() => handleReactivar(u)}
                                disabled={procesandoId === u.id}
                                title="Reactivar usuario"
                                aria-label={`Reactivar a ${nombreMostrar(u)}`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                  <path d="M20 7v5h-5M4 17v-5h5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="usuarios__icono"
                                  onClick={() => iniciarEdicion(u)}
                                  disabled={Boolean(motivoEditar)}
                                  title={motivoEditar || "Editar usuario"}
                                  aria-label={`Editar a ${nombreMostrar(u)}`}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M4 20h4L19 9l-4-4L4 16v4z" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="m13.5 6.5 4 4" strokeLinecap="round" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className="usuarios__icono usuarios__icono--peligro"
                                  onClick={() => handleBaja(u)}
                                  disabled={Boolean(motivoBaja) || procesandoId === u.id}
                                  title={motivoBaja || "Dar de baja"}
                                  aria-label={`Dar de baja a ${nombreMostrar(u)}`}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <circle cx="12" cy="12" r="8" />
                                    <path d="m6.5 17.5 11-11" strokeLinecap="round" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="usuarios__nota">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3z" strokeLinejoin="round" />
            </svg>
            No puedes darte de baja ni cambiar tu propio rol, el superusuario solo se edita desde
            el panel de Django, y siempre debe quedar al menos un administrador activo.
          </p>
        </section>

        <aside className="usuarios__panel usuarios__panel--form">
          <div className="usuarios__form-cabecera">
            <h2 className="usuarios__form-titulo">
              {editando ? "Editar usuario" : "Nuevo usuario"}
            </h2>
            {editando && (
              <button type="button" className="usuarios__enlace" onClick={cancelarEdicion}>
                Cancelar
              </button>
            )}
          </div>

          {errorGeneral && (
            <div className="usuarios__alerta usuarios__alerta--error" role="alert">
              {errorGeneral}
            </div>
          )}

          <form noValidate onSubmit={handleSubmit}>
            <div className="usuarios__campo">
              <span className="usuarios__etiqueta">Rol</span>
              {errorRoles && (
                <div className="usuarios__alerta usuarios__alerta--error" role="alert">
                  <span>{errorRoles}</span>
                  <button type="button" className="usuarios__reintentar" onClick={cargarRoles}>
                    Reintentar
                  </button>
                </div>
              )}
              <div className="usuarios__segmentado" role="group" aria-label="Rol">
                {ROLES_INTERNOS.map((rol) => (
                  <button
                    key={rol.codigo}
                    type="button"
                    className={form.rolCodigo === rol.codigo ? "is-activo" : ""}
                    aria-pressed={form.rolCodigo === rol.codigo}
                    onClick={() => seleccionarRol(rol.codigo)}
                    disabled={rolBloqueado}
                    title={rolBloqueado ? "No puedes cambiar tu propio rol" : undefined}
                  >
                    {rol.nombre}
                  </button>
                ))}
              </div>
              {errores.rol && <p className="usuarios__error">{errores.rol}</p>}
            </div>

            <div className="usuarios__campo">
              <label className="usuarios__etiqueta" htmlFor="username">Usuario</label>
              <input
                className="usuarios__input"
                type="text"
                id="username"
                name="username"
                autoComplete="off"
                placeholder="luces.bocagrande"
                value={form.username}
                onChange={handleChange}
                disabled={Boolean(editando)}
              />
              {errores.username && <p className="usuarios__error">{errores.username}</p>}
            </div>

            <div className="usuarios__campo">
              <label className="usuarios__etiqueta" htmlFor="email">Correo</label>
              <input
                className="usuarios__input"
                type="email"
                id="email"
                name="email"
                autoComplete="off"
                placeholder="contacto@empresa.co"
                value={form.email}
                onChange={handleChange}
              />
              {errores.email && <p className="usuarios__error">{errores.email}</p>}
            </div>

            <div className="usuarios__campo">
              <span className="usuarios__etiqueta">Sitios</span>
              <div className="usuarios__sitios">
                {sitios.map((sitio) => (
                  <label className="usuarios__check" key={sitio.id}>
                    <input
                      type="checkbox"
                      checked={form.sitios.includes(sitio.id)}
                      onChange={() => alternarSitio(sitio.id)}
                    />
                    {sitio.nombre}
                  </label>
                ))}
                {sitios.length === 0 && !errorSitios && (
                  <p className="usuarios__ayuda">No hay sitios registrados.</p>
                )}
              </div>
              {errorSitios && <p className="usuarios__error">{errorSitios}</p>}
              {errores.sitios && <p className="usuarios__error">{errores.sitios}</p>}
            </div>

            {!editando && (
              <div className="usuarios__campo">
                <label className="usuarios__etiqueta" htmlFor="password">
                  Contraseña temporal
                </label>
                <input
                  className="usuarios__input"
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                />
                <div className="usuarios__fuerza" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={i < fuerza.nivel ? "is-lleno" : ""} />
                  ))}
                </div>
                {fuerza.mensaje && (
                  <p className={fuerza.cumple ? "usuarios__ok" : "usuarios__error"}>
                    {fuerza.mensaje}
                  </p>
                )}
                {errores.password && <p className="usuarios__error">{errores.password}</p>}
              </div>
            )}

            <button type="submit" className="usuarios__enviar" disabled={enviando}>
              {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Crear usuario"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
