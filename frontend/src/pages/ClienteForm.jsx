// Formulario compartido por "Nuevo cliente" y "Editar cliente": mismos campos,
// misma regla de NIT y misma lectura de errores del API.
import { erroresDesdeApi as erroresDesdeApiComun } from "../utils/erroresApi";

export const FORM_VACIO = {
  tipo: "natural",
  nombre: "",
  identificacion: "",
  telefono: "",
  correo: "",
  empresa: "",
  forma_pago: "",
  observaciones_internas: "",
};

export function formDesdeCliente(c) {
  return {
    tipo: c.tipo,
    nombre: c.nombre ?? "",
    identificacion: c.identificacion ?? "",
    telefono: c.telefono ?? "",
    correo: c.correo ?? "",
    empresa: c.empresa ? String(c.empresa) : "",
    forma_pago: c.forma_pago ?? "",
    observaciones_internas: c.observaciones_internas ?? "",
  };
}

// El NIT de una persona jurídica vive en Empresa.identificacion (igual que en el
// registro público). Aquí solo se lee de la lista de empresas que ya tiene la pantalla.
export function nitDeEmpresa(empresas, empresaId) {
  if (!empresaId) return "";
  const emp = empresas.find((e) => e.id === Number(empresaId));
  return emp?.identificacion ?? "";
}

const CAMPOS = [
  "tipo", "nombre", "identificacion", "telefono", "correo",
  "empresa", "forma_pago", "observaciones_internas",
];

// Separa los errores 400 del API usando el clasificador compartido de utils/,
// con la lista de campos de este formulario.
export function erroresDesdeApi(body) {
  return erroresDesdeApiComun(body, CAMPOS);
}

// Cuerpo del PATCH. En jurídica NO se envía identificacion: así no se borra la que
// ya tenga el cliente (p. ej. el jurídico del seed) y el NIT sigue siendo el de la empresa.
export function payloadEdicion(form) {
  const body = {
    tipo: form.tipo,
    nombre: form.nombre,
    telefono: form.telefono,
    correo: form.correo,
    empresa: form.empresa ? Number(form.empresa) : null,
    forma_pago: form.forma_pago,
    observaciones_internas: form.observaciones_internas,
  };
  if (form.tipo !== "juridica") {
    // identificacion es única en la BD: un "" chocaría con otros vacíos, se envía null.
    body.identificacion = form.identificacion.trim() || null;
  }
  return body;
}

export default function ClienteForm({ idPrefix, form, errores, empresas, onChange }) {
  const esJuridica = form.tipo === "juridica";
  const id = (campo) => `${idPrefix}-${campo}`;
  const error = (campo) => errores[campo] && <p className="field__error">{errores[campo]}</p>;

  return (
    <>
      <div className="form-field">
        <label htmlFor={id("tipo")}>Tipo</label>
        <select id={id("tipo")} name="tipo" value={form.tipo} onChange={onChange}>
          <option value="natural">Natural</option>
          <option value="juridica">Jurídica</option>
        </select>
        {error("tipo")}
      </div>

      <div className="form-field">
        <label htmlFor={id("nombre")}>Nombre</label>
        <input id={id("nombre")} name="nombre" type="text" value={form.nombre} onChange={onChange} />
        {error("nombre")}
      </div>

      <div className="form-field">
        <label htmlFor={id("empresa")}>Empresa{esJuridica ? " (obligatoria)" : ""}</label>
        <select id={id("empresa")} name="empresa" value={form.empresa} onChange={onChange}>
          <option value="">{esJuridica ? "Selecciona una empresa..." : "Sin empresa"}</option>
          {empresas.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
          ))}
        </select>
        {error("empresa")}
      </div>

      {esJuridica ? (
        <div className="form-field">
          <label htmlFor={id("nit")}>NIT</label>
          <input
            id={id("nit")}
            type="text"
            readOnly
            value={nitDeEmpresa(empresas, form.empresa)}
            placeholder="Se toma de la empresa seleccionada"
          />
        </div>
      ) : (
        <div className="form-field">
          <label htmlFor={id("identificacion")}>Identificación</label>
          <input
            id={id("identificacion")}
            name="identificacion"
            type="text"
            value={form.identificacion}
            onChange={onChange}
          />
          {error("identificacion")}
        </div>
      )}

      <div className="form-field">
        <label htmlFor={id("telefono")}>Teléfono</label>
        <input id={id("telefono")} name="telefono" type="text" value={form.telefono} onChange={onChange} />
        {error("telefono")}
      </div>

      <div className="form-field">
        <label htmlFor={id("correo")}>Correo</label>
        <input id={id("correo")} name="correo" type="email" value={form.correo} onChange={onChange} />
        {error("correo")}
      </div>

      <div className="form-field">
        <label htmlFor={id("forma_pago")}>Forma de pago</label>
        <input id={id("forma_pago")} name="forma_pago" type="text" value={form.forma_pago} onChange={onChange} />
        {error("forma_pago")}
      </div>

      <div className="form-field">
        <label htmlFor={id("observaciones_internas")}>Observaciones internas</label>
        <textarea
          id={id("observaciones_internas")}
          name="observaciones_internas"
          rows="3"
          value={form.observaciones_internas}
          onChange={onChange}
        />
        {error("observaciones_internas")}
      </div>
    </>
  );
}
