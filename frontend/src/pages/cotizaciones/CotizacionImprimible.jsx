const NOMBRE_EN_RESUMEN = { IVA: "IVA", INC: "Impoconsumo" };

function aFechaLocal(valor) {
  if (!valor) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split("-").map(Number);
    return new Date(anio, mes - 1, dia);
  }
  return new Date(valor);
}

function fechaLarga(valor, { conDiaSemana = false } = {}) {
  const fecha = aFechaLocal(valor);
  if (!fecha || Number.isNaN(fecha.getTime())) return "—";
  const texto = new Intl.DateTimeFormat("es-CO", {
    weekday: conDiaSemana ? "long" : undefined,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
  if (!conDiaSemana) return texto;
  const limpio = texto.replace(",", "");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

function pesos(valor) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);
}

function etiquetaSalon(nombre) {
  return /^sal[oó]n\b/i.test(nombre) ? nombre : `Salón ${nombre}`;
}

function textoImpuesto(impuesto) {
  if (!impuesto) return "—";
  return `${impuesto.codigo} ${Number(impuesto.porcentaje)}% · ${pesos(impuesto.valor)}`;
}

function agruparImpuestos(items) {
  const grupos = new Map();
  items.forEach(({ impuesto }) => {
    if (!impuesto) return;
    const clave = `${impuesto.codigo}-${Number(impuesto.porcentaje)}`;
    const previo = grupos.get(clave);
    grupos.set(clave, { ...impuesto, valor: (previo?.valor ?? 0) + Number(impuesto.valor) });
  });
  return [...grupos.values()];
}

export default function CotizacionImprimible({ cotizacion }) {
  const {
    numero, emitidaEn, validaHasta, fechaEvento, personas,
    sitio, cliente, salon, montaje, items = [], subtotal, total, condiciones,
  } = cotizacion;

  const resumenImpuestos = agruparImpuestos(items);
  const pie = [sitio?.direccion, sitio?.telefono].filter(Boolean).join(" · ");

  return (
    <article className="cotizacion-hoja" aria-label={`Cotización ${numero}`}>
      <header className="cotizacion-hoja__cabecera">
        <div className="cotizacion-hoja__marca">
          {sitio?.nombre && <span className="cotizacion-hoja__sitio">{sitio.nombre}</span>}
        </div>
        <div className="cotizacion-hoja__titulo-fila">
          <h1 className="cotizacion-hoja__titulo">
            Cotización #{String(numero).padStart(3, "0")}
          </h1>
          <div className="cotizacion-hoja__fechas">
            <p>Emitida: {fechaLarga(emitidaEn)}</p>
            <p className="cotizacion-hoja__vigencia">Válida hasta: {fechaLarga(validaHasta)}</p>
          </div>
        </div>
      </header>

      <div className="cotizacion-hoja__cuerpo">
        <section className="cotizacion-hoja__partes">
          <div>
            <h2 className="cotizacion-hoja__etiqueta">Cliente</h2>
            {cliente?.nombre && <p className="cotizacion-hoja__destacado">{cliente.nombre}</p>}
            {cliente?.documento && <p>{cliente.documento}</p>}
            {cliente?.email && <p>{cliente.email}</p>}
          </div>
          <div>
            <h2 className="cotizacion-hoja__etiqueta">Evento</h2>
            <p className="cotizacion-hoja__destacado">
              {fechaLarga(fechaEvento, { conDiaSemana: true })}
            </p>
            <p>
              {salon?.nombre && etiquetaSalon(salon.nombre)}
              {montaje?.nombre && ` · montaje ${montaje.nombre}`}
            </p>
            <p>
              {personas} personas{salon?.aforo ? ` (aforo ${salon.aforo})` : ""}
            </p>
          </div>
        </section>

        <table className="cotizacion-hoja__tabla">
          <caption className="visually-hidden">Conceptos cotizados</caption>
          <thead>
            <tr>
              <th scope="col">Concepto</th>
              <th scope="col" className="num">Cant.</th>
              <th scope="col" className="num">Precio u.</th>
              <th scope="col" className="num">Impuesto</th>
              <th scope="col" className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, indice) => (
              <tr key={item.id ?? indice}>
                <td className="cotizacion-hoja__concepto">{item.concepto}</td>
                <td className="num">{item.cantidad}</td>
                <td className="num">{pesos(item.precioUnitario)}</td>
                <td className="num">{textoImpuesto(item.impuesto)}</td>
                <td className="num cotizacion-hoja__concepto">{pesos(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="cotizacion-hoja__totales" aria-label="Totales">
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{pesos(subtotal)}</dd>
            </div>
            {resumenImpuestos.map((impuesto) => (
              <div key={`${impuesto.codigo}-${impuesto.porcentaje}`}>
                <dt>
                  {NOMBRE_EN_RESUMEN[impuesto.codigo] ?? impuesto.codigo}{" "}
                  {Number(impuesto.porcentaje)}%
                </dt>
                <dd>{pesos(impuesto.valor)}</dd>
              </div>
            ))}
          </dl>
          <p className="cotizacion-hoja__total">
            <span>Total</span>
            <strong>{pesos(total)}</strong>
          </p>
        </section>

        {condiciones && (
          <section className="cotizacion-hoja__condiciones">
            <h2 className="cotizacion-hoja__etiqueta">Condiciones</h2>
            <p>{condiciones}</p>
          </section>
        )}
      </div>

      <footer className="cotizacion-hoja__pie">
        {pie && <p>{pie}</p>}
        <p className="cotizacion-hoja__firma">Aceptación del cliente</p>
      </footer>
    </article>
  );
}
