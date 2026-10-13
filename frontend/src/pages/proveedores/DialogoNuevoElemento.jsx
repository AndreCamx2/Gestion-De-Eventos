import { useRef, useState } from "react";
import { crearElementoStock } from "../../api/proveedores";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Campo, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { ELEMENTO_VACIO, erroresElemento, payloadElemento, validarElemento } from "./proveedores";

// Ventana "Agregar elemento" al stock del proveedor seleccionado: elemento,
// cantidad y valor unitario.
// - proveedor: a quién se le agrega.
// - onCreado(elemento): se creó; Proveedores.jsx la cierra y lo suma a la tabla.
// - onSesionVencida(), sesionVencida, onEntrarDeNuevo(boton): igual que en
//   DialogoNuevoProveedor (aviso dentro de la ventana, SGDE-94).
export default function DialogoNuevoElemento({ proveedor, onCreado, onCerrar, onSesionVencida, sesionVencida, onEntrarDeNuevo }) {
  const [form, setForm] = useState(ELEMENTO_VACIO);
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
    const locales = validarElemento(form);
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setGuardando(true);
    try {
      const creado = await crearElementoStock(payloadElemento(form, proveedor.id));
      setGuardando(false);
      onCreado(creado);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        const { campos, general } = erroresElemento(err.body);
        setErrores(campos);
        setError(general);
      } else if (err.status === 401) {
        onSesionVencida();
      } else if (err.status === 403) {
        setError("No tienes permiso para agregar elementos.");
      } else {
        setError("No pudimos hablar con el servidor. Inténtalo de nuevo.");
      }
    }
  }

  return (
    <Dialogo idTitulo="proveedores-elemento-titulo" titulo="Agregar elemento" bloqueado={guardando} onCerrar={onCerrar}>
      <form className="dialogo__form" onSubmit={guardar} noValidate>
        <p className="proveedores-dialogo__para">
          Al stock de <strong>{proveedor.nombre}</strong>
        </p>
        <Campo
          id="elemento-nombre"
          etiqueta="Elemento"
          name="nombre_elemento"
          autoComplete="off"
          placeholder="Ej. Cabina activa 15 pulgadas"
          value={form.nombre_elemento}
          onChange={cambiar}
          error={errores.nombre_elemento}
        />
        <div className="proveedores-dialogo__par">
          <Campo
            id="elemento-cantidad"
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
            id="elemento-valor"
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
