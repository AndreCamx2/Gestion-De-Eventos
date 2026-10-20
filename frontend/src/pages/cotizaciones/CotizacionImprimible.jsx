import { pesos } from "./nuevaCotizacion";

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

function etiquetaSalon(nombre) {
  return /^sal[oó]n\b/i.test(nombre) ? nombre : `Salón ${nombre}`;
}

function textoImpuesto(impuesto) {
  if (!impuesto || !Number(impuesto.porcentaje)) return "—";
  return `${impuesto.nombre} · ${pesos(impuesto.valor)}`;
}

// Un renglón por tasa, como el desglose del detalle (totalesCotizacion): sin las de 0%.
function agruparImpuestos(items) {
  const grupos = new Map();
  items.forEach(({ impuesto }) => {
    const tasa = Number(impuesto?.porcentaje);
    if (!tasa) return;
    const previo = grupos.get(tasa);
    grupos.set(tasa, { ...impuesto, valor: (previo?.valor ?? 0) + Number(impuesto.valor) });
  });
  return [...grupos.entries()].sort((a, b) => b[0] - a[0]).map(([, grupo]) => grupo);
}

// nivelTitulo: "h1" en la página para imprimir; dentro de una ventana, uno menor.
export default function CotizacionImprimible({ cotizacion, nivelTitulo: Titulo = "h1" }) {
  const {
    numero, emitidaEn, validaHasta, fechaEvento, personas,
    sitio, cliente, salon, montaje, items = [], subtotal, total,
  } = cotizacion;

  const resumenImpuestos = agruparImpuestos(items);
  // Sin número es la vista previa de una cotización que aún no se guarda.
  const titulo = numero ? `Cotización #${String(numero).padStart(3, "0")}` : "Cotización (borrador)";

  return (
    <article className="cotizacion-hoja" aria-label={numero ? `Cotización ${numero}` : titulo}>
      <header className="cotizacion-hoja__cabecera">
        <div className="cotizacion-hoja__marca">
          {sitio?.nombre && <span className="cotizacion-hoja__sitio">{sitio.nombre}</span>}
        </div>
        <div className="cotizacion-hoja__titulo-fila">
          <Titulo className="cotizacion-hoja__titulo">{titulo}</Titulo>
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
              <div key={Number(impuesto.porcentaje)}>
                <dt>{impuesto.nombre}</dt>
                <dd>{pesos(impuesto.valor)}</dd>
              </div>
            ))}
          </dl>
          <p className="cotizacion-hoja__total">
            <span>Total</span>
            <strong>{pesos(total)}</strong>
          </p>
        </section>
      </div>

      <footer className="cotizacion-hoja__pie">
        <p className="cotizacion-hoja__firma">Aceptación del cliente</p>
      </footer>
    </article>
  );
}
