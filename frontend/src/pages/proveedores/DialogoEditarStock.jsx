import { useRef, useState } from "react";
import { editarStock } from "../../api/proveedores";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Campo, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { cambiosStock, erroresEdicionStock, formDesdeElemento, validarEdicionStock } from "./proveedores";

// Ventana "Editar elemento" del stock (SGDE-98): cantidad y valor unitario. El
// proveedor y el nombre del elemento se muestran, pero no se editan.
// - proveedor, elemento: lo que se edita.
// - onGuardado(elemento): el API respondió; Proveedores.jsx reemplaza la fila y la cierra.
// - onSesionVencida(), sesionVencida, onEntrarDeNuevo(boton): igual que en
//   DialogoNuevoElemento (aviso dentro de la ventana, SGDE-94).
export default function DialogoEditarStock({ proveedor, elemento, onGuardado, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo }) {
  const [form, setForm] = useState(() => formDesdeElemento(elemento));
  const [errores, setErrores] = useState({});
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const guardarRef = useRef(null);

  function cambiar(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  }

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    const locales = validarEdicionStock(form);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    // Sin cambios no se llama al API: se cierra como "Cancelar".
    const cambios = cambiosStock(form, elemento);
    if (Object.keys(cambios).length === 0) {
      cerrarDialogoDe(e.currentTarget);
      return;
    }

    setGuardando(true);
    try {
      const actualizado = await editarStock(elemento.id, cambios);
      setGuardando(false);
      onGuardado(actualizado);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        const { campos, general } = erroresEdicionStock(err.body);
        setErrores(campos);
        setError(general);
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 403) {
        setError("No tienes permiso para editar el stock.");
      } else if (err.status === 404) {
        setError("Este elemento ya no existe. Cierra y vuelve a cargar la pantalla.");
      } else {
        setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    }
  }

  return (
    <Dialogo idTitulo="proveedores-editar-titulo" titulo="Editar elemento" bloqueado={guardando} onCerrar={onCerrar}>
      <form className="dialogo__form" onSubmit={guardar} noValidate>
        <p className="proveedores-dialogo__para">
          <strong>{elemento.nombre_elemento}</strong>, de {proveedor.nombre}
        </p>
        <div className="proveedores-dialogo__par">
          <Campo
            id="editar-stock-cantidad"
            etiqueta="Cantidad"
            name="cantidad"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.cantidad}
            onChange={cambiar}
            error={errores.cantidad}
          />
          <Campo
            id="editar-stock-valor"
            etiqueta="Valor unitario"
            name="valor"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="En pesos"
            value={form.valor}
            onChange={cambiar}
            error={errores.valor}
          />
        </div>
        {sesionVencida && <AvisoSesionEnVentana onEntrar={() => onEntrarDeNuevo(guardarRef.current)} />}
        {error && <p className="dialogo__error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          <Boton variante="secundario" disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)}>
            Cancelar
          </Boton>
          <Boton ref={guardarRef} type="submit" variante="oscuro" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
