// Formulario compartido por "Nuevo cliente" y "Editar cliente": mismos campos,
// misma regla de NIT y misma lectura de errores del API (en clientes/clienteForm.js).
import { Campo } from "../components/ui";
import VerClienteInactivo from "./clientes/VerClienteInactivo";
import { nitDeEmpresa } from "./clientes/clienteForm";

// Los <input> usan el componente Campo. Campo solo pinta <input>, así que el
// <select> y el <textarea> se arman a mano con sus mismas clases (campo,
// campo__etiqueta, campo__input) para que se vean iguales sin modificar Campo.
// onVerInactivo(id): si la identificación es de un cliente inactivo, abre ese cliente.
export default function ClienteForm({ idPrefix, form, errores, empresas, onChange, onNuevaEmpresa, onVerInactivo }) {
  const esJuridica = form.tipo === "juridica";
  const id = (campo) => `${idPrefix}-${campo}`;
  const idError = (campo) => `${id(campo)}-error`;
  const claseCampo = (campo) => ["campo", errores[campo] && "campo--error"].filter(Boolean).join(" ");
  // Mismos atributos que pone Campo: el lector de pantalla lee el error al enfocar.
  const accesible = (campo, ...otrosIds) => {
    const ids = [errores[campo] && idError(campo), ...otrosIds].filter(Boolean).join(" ");
    return {
      "aria-invalid": errores[campo] ? true : undefined,
      "aria-describedby": ids || undefined,
    };
  };
  const error = (campo) =>
    errores[campo] && (
      <p id={idError(campo)} className="campo__error">
        {errores[campo]}
      </p>
    );
  const nit = nitDeEmpresa(empresas, form.empresa);

  return (
    <div className="directorio-form">
      <div className={claseCampo("tipo")}>
        <label className="campo__etiqueta" htmlFor={id("tipo")}>Tipo</label>
        <select
          id={id("tipo")}
          name="tipo"
          className="campo__input"
          value={form.tipo}
          onChange={onChange}
          {...accesible("tipo")}
        >
          <option value="natural">Natural</option>
          <option value="juridica">Jurídica</option>
        </select>
        {error("tipo")}
      </div>

      <Campo
        id={id("nombre")}
        etiqueta="Nombre"
        name="nombre"
        type="text"
        value={form.nombre}
        onChange={onChange}
        error={errores.nombre}
      />

      <div className={claseCampo("empresa")}>
        <label className="campo__etiqueta" htmlFor={id("empresa")}>
          Empresa{esJuridica ? " (obligatoria)" : ""}
        </label>
        <select
          id={id("empresa")}
          name="empresa"
          className="campo__input"
          value={form.empresa}
          onChange={onChange}
          {...accesible("empresa", esJuridica && id("nit"))}
        >
          <option value="">{esJuridica ? "Selecciona una empresa..." : "Sin empresa"}</option>
          {empresas.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
          ))}
        </select>
        {error("empresa")}
        {/* En jurídica el NIT no se escribe: se lee de la empresa elegida. */}
        {esJuridica && onNuevaEmpresa && (
          <button type="button" className="directorio-form__enlace" onClick={onNuevaEmpresa}>
            + Crear empresa nueva
          </button>
        )}
        {esJuridica && (
          <p id={id("nit")} className="directorio-form__ayuda">
            {nit ? (
              <>NIT tomado de la empresa: <strong>{nit}</strong></>
            ) : (
              "El NIT se toma de la empresa seleccionada."
            )}
          </p>
        )}
      </div>

      {!esJuridica && (
        <Campo
          id={id("identificacion")}
          etiqueta="Identificación"
          name="identificacion"
          type="text"
          value={form.identificacion}
          onChange={onChange}
          error={errores.identificacion}
        />
      )}
      {!esJuridica && (
        <VerClienteInactivo error={errores.identificacion} id={errores.cliente_inactivo} onVer={onVerInactivo} />
      )}

      <div className="directorio-form__par">
        <Campo
          id={id("telefono")}
          etiqueta="Teléfono"
          name="telefono"
          type="tel"
          value={form.telefono}
          onChange={onChange}
          error={errores.telefono}
        />
        <Campo
          id={id("forma_pago")}
          etiqueta="Forma de pago"
          name="forma_pago"
          type="text"
          value={form.forma_pago}
          onChange={onChange}
          error={errores.forma_pago}
        />
      </div>

      <Campo
        id={id("correo")}
        etiqueta="Correo"
        name="correo"
        type="email"
        value={form.correo}
        onChange={onChange}
        error={errores.correo}
      />

      <div className={claseCampo("observaciones_internas")}>
        <label className="campo__etiqueta" htmlFor={id("observaciones_internas")}>
          Observaciones internas
        </label>
        <textarea
          id={id("observaciones_internas")}
          name="observaciones_internas"
          className="campo__input directorio-form__area"
          rows="3"
          value={form.observaciones_internas}
          onChange={onChange}
          {...accesible("observaciones_internas")}
        />
        {error("observaciones_internas")}
      </div>
    </div>
  );
}
