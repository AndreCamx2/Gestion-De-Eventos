import { useRef, useState } from "react";
import { crearConcepto } from "../../api/conceptos";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton } from "../../components/ui";
import ConceptoForm from "./ConceptoForm";
import ConceptosDialogo, { cerrarDialogoDe } from "./ConceptosDialogo";
import { FORM_VACIO, erroresDesdeApi, payloadCreacion, validarForm } from "./conceptos";

// Ventana "Nuevo concepto". Guarda su propio formulario y crea el concepto.
// - sitioInicial: sitio ya elegido (el del filtro, o el único que hay).
// - onCreado(concepto): se creó; Conceptos.jsx la cierra y recarga la lista.
// - onSesionVencida(): 401 aunque se intentó renovar el token.
// - sesionVencida / onEntrarDeNuevo(boton): con la sesión vencida, el aviso va
//   dentro de la ventana, que no se cierra ni pierde lo escrito (SGDE-94). Al volver
//   a entrar, el foco regresa a "Guardar".
export default function DialogoNuevoConcepto({
  sitios,
  sitioInicial,
  onCreado,
  onCerrar,
  onSesionVencida,
  sesionVencida,
  onEntrarDeNuevo,
}) {
  const [form, setForm] = useState({ ...FORM_VACIO, sitio: sitioInicial });
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [creando, setCreando] = useState(false);
  const guardarRef = useRef(null);

  function cambiar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  }

  async function crear(e) {
    e.preventDefault();
    setError(null);

    const erroresLocales = validarForm(form);
    setErrores(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) return;

    setCreando(true);
    try {
      const creado = await crearConcepto(payloadCreacion(form));
      setCreando(false);
      onCreado(creado);
    } catch (err) {
      setCreando(false);
      if (err.status === 400 && err.body && typeof err.body === "object") {
        const { campos, general } = erroresDesdeApi(err.body);
        setErrores(campos);
        setError(general);
      } else if (err.status === 401) {
        // La ventana sigue abierta con lo escrito: al volver a entrar, se guarda de nuevo.
        onSesionVencida();
      } else if (err.status === 403) {
        setError("No tienes permisos suficientes para crear conceptos.");
      } else {
        setError("Error inesperado en el servidor al crear el concepto.");
      }
    }
  }

  return (
    <ConceptosDialogo idTitulo="conceptos-nuevo-titulo" titulo="Nuevo concepto" bloqueado={creando} onCerrar={onCerrar}>
      <form className="conceptos-dialogo__form" onSubmit={crear} noValidate>
        <ConceptoForm
          idPrefix="crear"
          form={form}
          errores={errores}
          sitios={sitios}
          onChange={cambiar}
          esEdicion={false}
        />
        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(guardarRef.current)} />}
        {error && <p className="conceptos-error" role="alert">{error}</p>}
        <div className="conceptos-dialogo__acciones">
          <Boton variante="secundario" disabled={creando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            Cancelar
          </Boton>
          <Boton ref={guardarRef} type="submit" variante="oscuro" disabled={creando}>
            {creando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </ConceptosDialogo>
  );
}
