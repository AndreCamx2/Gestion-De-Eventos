import { erroresDesdeApi } from "../../utils/erroresApi";
import { mesCorto } from "../../utils/inicioCifras";
import { MAX_PASSWORD, validarCorreo, validarNombre } from "../../utils/validacionesRegistro";

export const ROL_CLIENTE = "cliente";

export function rolesInternos(roles) {
  return roles.filter((r) => r.codigo !== ROL_CLIENTE);
}

export function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function nombreCompleto(u) {
  return [u.first_name, u.last_name].map((p) => (p ?? "").trim()).filter(Boolean).join(" ") || u.username;
}

export function iniciales(u) {
  const partes = nombreCompleto(u).split(/[\s._-]+/).filter(Boolean);
  return (partes.slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?").slice(0, 2);
}

export function nombreRol(u, roles) {
  return roles.find((r) => r.id === u.rol)?.nombre ?? u.rol_codigo ?? "Sin rol";
}

const hora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });

export function ultimoAcceso(fechaHora, ahora = new Date()) {
  if (!fechaHora) return "Nunca ha entrado";
  const fecha = new Date(fechaHora);
  if (Number.isNaN(fecha.getTime())) return "—";
  const dia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diferencia = Math.round((dia(ahora) - dia(fecha)) / 86400000);
  const texto = hora.format(fecha);
  if (diferencia === 0) return `Hoy, ${texto}`;
  if (diferencia === 1) return `Ayer, ${texto}`;
  const anio = fecha.getFullYear() !== ahora.getFullYear() ? ` ${fecha.getFullYear()}` : "";
  return `${fecha.getDate()} ${mesCorto(fecha)}${anio}, ${texto}`;
}

export function filtrarUsuarios(usuarios, { busqueda, rol }) {
  const texto = normalizar(busqueda.trim());
  return usuarios.filter((u) => {
    if (rol !== "todos" && u.rol_codigo !== rol) return false;
    if (!texto) return true;
    return [u.username, u.first_name, u.last_name, u.email].some((v) => normalizar(v).includes(texto));
  });
}

export function ordenarUsuarios(usuarios) {
  return [...usuarios].sort(
    (a, b) => Number(b.is_active) - Number(a.is_active) || nombreCompleto(a).localeCompare(nombreCompleto(b), "es"),
  );
}

export function bloqueoDeBaja(u, yoId) {
  if (u.id === yoId) return "No puedes darte de baja a ti mismo.";
  return null;
}

export const NUEVO_VACIO = { rol: "", username: "", email: "", password: "", sitios: [] };

const USUARIO_VALIDO = /^[\w.@+-]+$/;
const MAX_USUARIO = 150;

export function fortaleza(password, { username = "", email = "" } = {}) {
  const clave = password ?? "";
  if (!clave) return { nivel: 0, texto: "Mínimo 8 caracteres, que no sean solo números." };
  if (clave.length > MAX_PASSWORD) return { nivel: 1, texto: `Máximo ${MAX_PASSWORD} caracteres.` };
  const avisos = [];
  if (clave.length < 8) avisos.push("al menos 8 caracteres");
  if (/^\d+$/.test(clave)) avisos.push("no solo números");
  const minuscula = clave.toLowerCase();
  const parecida = [username, email.split("@")[0]].some((d) => d && d.length >= 3 && minuscula.includes(d.toLowerCase()));
  if (parecida) avisos.push("que no se parezca al usuario o al correo");
  if (avisos.length) return { nivel: 1, texto: `Le falta: ${avisos.join(", ")}.` };

  let puntos = 2;
  if (clave.length >= 12) puntos += 1;
  if (/[a-z]/.test(clave) && /[A-Z]/.test(clave) && /\d/.test(clave) && /[^A-Za-z0-9]/.test(clave)) puntos += 1;
  return {
    nivel: puntos,
    texto: puntos >= 4 ? "Contraseña fuerte" : "Cumple lo mínimo; más larga o con símbolos es más segura",
  };
}

export function validarNuevo(form) {
  const errores = {};
  if (!form.rol) errores.rol = "Elige el rol.";
  if (!form.username.trim()) errores.username = "Escribe el nombre de usuario.";
  else if (form.username.trim().length > MAX_USUARIO) errores.username = `Máximo ${MAX_USUARIO} caracteres.`;
  else if (!USUARIO_VALIDO.test(form.username.trim())) {
    errores.username = "Solo letras, números y los signos . @ + - _ (sin espacios).";
  }
  if (!form.email.trim()) errores.email = "Escribe el correo.";
  else if (validarCorreo(form.email)) errores.email = validarCorreo(form.email);
  if (fortaleza(form.password, form).nivel < 2) errores.password = fortaleza(form.password, form).texto;
  return errores;
}

export function payloadNuevo(form) {
  return {
    rol: Number(form.rol),
    username: form.username.trim(),
    email: form.email.trim(),
    password: form.password,
    sitios: form.sitios.map(Number),
  };
}

export function formEdicion(u) {
  return {
    first_name: u.first_name ?? "",
    last_name: u.last_name ?? "",
    email: u.email ?? "",
    rol: String(u.rol ?? ""),
    sitios: (u.sitios ?? []).map(String),
  };
}

export function validarEdicion(form) {
  const errores = {};
  if (!form.rol) errores.rol = "Elige el rol.";
  if (form.email.trim() && validarCorreo(form.email)) errores.email = validarCorreo(form.email);
  for (const campo of ["first_name", "last_name"]) {
    const error = form[campo].trim() ? validarNombre(form[campo], { conApellido: false }) : null;
    if (error) errores[campo] = error;
  }
  return errores;
}

export function payloadEdicion(form, original, { esYo }) {
  const payload = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim(),
    sitios: form.sitios.map(Number),
  };
  if (!esYo && Number(form.rol) !== original.rol) payload.rol = Number(form.rol);
  return payload;
}

export const CAMPOS_USUARIO = ["rol", "username", "email", "password", "sitios", "first_name", "last_name", "is_active"];

export function erroresUsuario(body) {
  return erroresDesdeApi(body, CAMPOS_USUARIO);
}

export function mensajeError(status, accion) {
  if (status === 403) return `No tienes permiso para ${accion}.`;
  if (status === 404) return "Este usuario ya no existe o no lo administras. Recarga la lista.";
  return "No pudimos hablar con el servidor. Inténtalo de nuevo.";
}

export function tipoDeError(error) {
  if (error?.status === 401) return "sesion";
  if (error?.status === 403) return "permiso";
  return "servidor";
}
