import { useState } from "react";
import { habilitarMontaje } from "../api/salones";
import { erroresDesdeApi } from "../utils/erroresApi";
import { Boton, Campo } from "../components/ui";
import SalonDialogo, { cerrarDialogoDe } from "./SalonDialogo";

const CAMPOS = ["salon", "montaje", "aforo"];

// "Habilitar montaje": POST /api/salon-montajes/ con salón, montaje y aforo.
// - salones, montajes: listas ya cargadas por Salones.jsx.
// - habilitados(salonId): Set con los ids de montaje que ese salón ya tiene;
//   esos salen deshabilitados en el select (el API no deja repetirlos).
// - etiquetaSalon(salon): texto de cada opción del select de salones.
// - salonInicial: id del salón si se abrió desde su tarjeta.
// - onHabilitado(salonMontaje): recibe lo que devolvió el API.
export default function HabilitarMontajeModal({
  salones,
  montajes,
  habilitados,
  etiquetaSalon,
  salonInicial,
  onHabilitado,
  onCerrar,
  onSesionVencida,
}) {
  const [form, setForm] = useState({
    salon: salonInicial ? String(salonInicial) : "",
    montaje: "",
    aforo: "",
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const yaHabilitados = form.salon ? habilitados(Number(form.salon)) : new Set();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const siguiente = { ...prev, [name]: value };
      // Si el montaje elegido ya existe en el salón nuevo, se desmarca.
      if (name === "salon" && value && habilitados(Number(value)).has(Number(prev.montaje))) {
        siguiente.montaje = "";
      }
      return siguiente;
    });
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorGeneral(null);

    const locales = {};
    if (!form.salon) locales.salon = "Elige el salón.";
    if (!form.montaje) locales.montaje = "Elige el montaje.";
    if (!/^\d+$/.test(form.aforo.trim()) || Number(form.aforo) <= 0) {
      locales.aforo = "Escribe cuántas personas caben: un número entero mayor que 0.";
    }
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setGuardando(true);
    try {
      const creado = await habilitarMontaje({
        salon: Number(form.salon),
        montaje: Number(form.montaje),
        aforo: Number(form.aforo),
      });
      onHabilitado(creado);
    } catch (err) {
      if (err.status === 400 && err.body && typeof err.body === "object") {
        // La regla "un montaje no se repite en el salón" llega como non_field_errors.
        const { non_field_errors, ...porCampo } = err.body;
        const { campos, general } = erroresDesdeApi(porCampo, CAMPOS);
        if (non_field_errors) campos.montaje = "Ese montaje ya está habilitado en este salón.";
        setErrores(campos);
        setErrorGeneral(general);
      } else if (err.status === 401) {
        onSesionVencida();
        setErrorGeneral("Tu sesión expiró. Cierra esta ventana y vuelve a entrar con el aviso de abajo.");
      } else if (err.status === 403) {
        setErrorGeneral("No tienes permisos suficientes para habilitar montajes.");
      } else {
        setErrorGeneral("Error inesperado en el servidor al habilitar el montaje.");
      }
      setGuardando(false);
    }
  }

  // Mismos atributos que pone Campo, para el select hecho a mano.
  const claseCampo = (campo) => ["campo", errores[campo] && "campo--error"].filter(Boolean).join(" ");
  const accesible = (campo) => ({
    "aria-invalid": errores[campo] ? true : undefined,
    "aria-describedby": errores[campo] ? `habilitar-${campo}-error` : undefined,
  });
  const error = (campo) =>
    errores[campo] && (
      <p id={`habilitar-${campo}-error`} className="campo__error">{errores[campo]}</p>
    );

  return (
    <SalonDialogo idTitulo="habilitar-titulo" titulo="Habilitar montaje" bloqueado={guardando} onCerrar={onCerrar}>
      <form className="salones-dialogo__form" onSubmit={handleSubmit} noValidate>
        <div className={claseCampo("salon")}>
          <label className="campo__etiqueta" htmlFor="habilitar-salon">Salón</label>
          <select
            id="habilitar-salon"
            name="salon"
            className="campo__input"
            value={form.salon}
            onChange={handleChange}
            {...accesible("salon")}
          >
            <option value="">Elige un salón...</option>
            {salones.map((s) => (
              <option key={s.id} value={s.id}>{etiquetaSalon(s)}</option>
            ))}
          </select>
          {error("salon")}
        </div>

        <div className={claseCampo("montaje")}>
          <label className="campo__etiqueta" htmlFor="habilitar-montaje">Montaje</label>
          <select
            id="habilitar-montaje"
            name="montaje"
            className="campo__input"
            value={form.montaje}
            onChange={handleChange}
            // Si el salón ya viene elegido, se empieza por aquí.
            data-foco-inicial={salonInicial ? "" : undefined}
            {...accesible("montaje")}
          >
            <option value="">Elige un montaje...</option>
            {montajes.map((m) => {
              const repetido = yaHabilitados.has(m.id);
              return (
                <option key={m.id} value={m.id} disabled={repetido}>
                  {repetido ? `${m.nombre} (ya habilitado)` : m.nombre}
                </option>
              );
            })}
          </select>
          {error("montaje")}
        </div>

        <Campo
          id="habilitar-aforo"
          etiqueta="Aforo (personas)"
          name="aforo"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={form.aforo}
          onChange={handleChange}
          error={errores.aforo}
        />

        {errorGeneral && (
          <p className="salones-dialogo__error" role="alert">Error: {errorGeneral}</p>
        )}

        <div className="salones-dialogo__acciones">
          <Boton variante="secundario" disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="oscuro" disabled={guardando}>
            {guardando ? "Guardando..." : "Habilitar"}
          </Boton>
        </div>
      </form>
    </SalonDialogo>
  );
}
