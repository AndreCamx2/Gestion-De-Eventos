import { Boton } from "../../components/ui";
import { descripcionCliente, iniciales } from "./nuevaCotizacion";
import TituloPaso from "./TituloPaso";

const MENSAJES_ERROR = {
  permiso: "No tienes permiso para ver los clientes.",
  servidor: "No pudimos traer los clientes. Revisa tu conexión.",
  sesion: "Tu sesión expiró. Vuelve a entrar con el aviso de abajo.",
};

function ClienteElegido({ cliente, onCambiar }) {
  return (
    <div className="nc-cliente">
      <span className="nc-cliente__avatar" aria-hidden="true">{iniciales(cliente.nombre)}</span>
      <div className="nc-cliente__textos">
        <p className="nc-cliente__nombre">{cliente.nombre}</p>
        <p className="nc-cliente__detalle">{descripcionCliente(cliente)}</p>
      </div>
      <Boton variante="secundario" className="nc-cliente__cambiar" onClick={onCambiar}>
        Cambiar cliente
      </Boton>
    </div>
  );
}

function ResultadosClientes({ c }) {
  if (c.errorClientes) {
    return <p className="nc-ayuda nc-ayuda--error">{MENSAJES_ERROR[c.errorClientes] ?? MENSAJES_ERROR.servidor}</p>;
  }
  if (c.buscandoClientes && c.clientes.length === 0) {
    return <p className="nc-ayuda" role="status">Buscando clientes…</p>;
  }
  if (c.clientes.length === 0) {
    return (
      <p className="nc-ayuda" role="status">
        {c.busqueda.trim() ? "Ningún cliente coincide con la búsqueda." : "Aún no hay clientes registrados."}
      </p>
    );
  }
  return (
    <ul className="nc-resultados" aria-label="Clientes encontrados" aria-busy={c.buscandoClientes || undefined}>
      {c.clientes.slice(0, 6).map((cliente) => (
        <li key={cliente.id}>
          <button type="button" className="nc-resultado" onClick={() => c.elegirCliente(cliente)}>
            <span className="nc-resultado__avatar" aria-hidden="true">{iniciales(cliente.nombre)}</span>
            <span className="nc-resultado__textos">
              <span className="nc-resultado__nombre">{cliente.nombre}</span>
              <span className="nc-resultado__detalle">{descripcionCliente(cliente)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function SeccionCliente({ c }) {
  const error = c.errores.campos.cliente;

  return (
    <section className="nc-paso" aria-labelledby="nc-paso-cliente">
      <TituloPaso numero={1} id="nc-paso-cliente">Cliente</TituloPaso>

      {c.form.cliente ? (
        <ClienteElegido cliente={c.form.cliente} onCambiar={c.cambiarCliente} />
      ) : (
        <div className="nc-buscador">
          <label className={["nc-buscar", error && "nc-buscar--error"].filter(Boolean).join(" ")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="visually-hidden">Buscar cliente</span>
            <input
              type="search"
              className="nc-buscar__input"
              placeholder="Nombre, identificación, correo o empresa"
              value={c.busqueda}
              onChange={(e) => c.setBusqueda(e.target.value)}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "nc-error-cliente" : undefined}
            />
          </label>
          <ResultadosClientes c={c} />
        </div>
      )}

      {error && <p id="nc-error-cliente" className="nc-error">{error}</p>}
    </section>
  );
}
