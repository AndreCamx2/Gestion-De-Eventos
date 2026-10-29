import { Link } from "react-router-dom";
import { AvisoError, Boton, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import { millones } from "./cotizaciones/cotizaciones";
import { ESTADOS_HISTORICO } from "./cotizaciones/historico";
import HistoricoTabla from "./cotizaciones/HistoricoTabla";
import { useHistorico } from "./cotizaciones/useHistorico";
import "../styles/cotizaciones.css";
import "../styles/historico.css";

function Cifras({ resumen, visibles }) {
  const valor = (n) => (visibles ? n : "—");
  return (
    <section className="cotizaciones-cifras" aria-label="Resumen del histórico">
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Realizados</p>
        <p className="cotizaciones-cifra__valor cotizaciones-cifra__valor--verde">{valor(resumen.realizados)}</p>
        <p className="cotizaciones-cifra__nota">Confirmados con la fecha ya pasada</p>
      </div>
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Próximos</p>
        <p className="cotizaciones-cifra__valor">{valor(resumen.proximos)}</p>
        <p className="cotizaciones-cifra__nota">Confirmados de hoy en adelante</p>
      </div>
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Cancelados</p>
        <p className="cotizaciones-cifra__valor">{valor(resumen.cancelados)}</p>
        <p className="cotizaciones-cifra__nota">Con su penalización registrada</p>
      </div>
      <div className="cotizaciones-cifra">
        <p className="cotizaciones-cifra__etiqueta">Valor confirmado</p>
        <p className="cotizaciones-cifra__valor">{visibles ? millones(resumen.valorConfirmado) : "—"}</p>
        <p className="cotizaciones-cifra__nota">Suma de los confirmados</p>
      </div>
    </section>
  );
}

function SelectFiltro({ etiqueta, valor, onCambiar, opciones, todos }) {
  return (
    <label className="cotizaciones-fecha historico-select">
      <span className="cotizaciones-fecha__etiqueta">{etiqueta}</span>
      <select className="historico-select__control" value={valor} onChange={(e) => onCambiar(e.target.value)}>
        <option value="">{todos}</option>
        {opciones.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {o.nombre}
            {o.activo === false ? " (inactivo)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function Filtros({ h }) {
  const { filtros, cambiarFiltro } = h;
  return (
    <div className="cotizaciones-filtros">
      <div className="cotizaciones-estados" role="group" aria-label="Filtrar por estado">
        {ESTADOS_HISTORICO.map(({ clave, texto }) => (
          <button
            key={clave}
            type="button"
            className="cotizaciones-estado"
            aria-pressed={filtros.estado === clave}
            onClick={() => cambiarFiltro("estado", clave)}
          >
            {texto}
          </button>
        ))}
      </div>

      <div className="cotizaciones-campos">
        <SelectFiltro
          etiqueta="Cliente"
          valor={filtros.cliente}
          onCambiar={(v) => cambiarFiltro("cliente", v)}
          opciones={h.clientes}
          todos="Todos"
        />
        <SelectFiltro
          etiqueta="Salón"
          valor={filtros.salon}
          onCambiar={(v) => cambiarFiltro("salon", v)}
          opciones={h.salones}
          todos="Todos"
        />
        <label className="cotizaciones-fecha">
          <span className="cotizaciones-fecha__etiqueta">Evento desde</span>
          <input
            type="date"
            className="cotizaciones-fecha__input"
            value={filtros.desde}
            max={filtros.hasta || undefined}
            onChange={(e) => cambiarFiltro("desde", e.target.value)}
          />
        </label>
        <label className="cotizaciones-fecha">
          <span className="cotizaciones-fecha__etiqueta">hasta</span>
          <input
            type="date"
            className="cotizaciones-fecha__input"
            value={filtros.hasta}
            min={filtros.desde || undefined}
            onChange={(e) => cambiarFiltro("hasta", e.target.value)}
          />
        </label>
        {h.hayFiltros && (
          <Boton variante="secundario" className="historico-limpiar" onClick={h.quitarFiltros}>
            Quitar filtros
          </Boton>
        )}
      </div>
    </div>
  );
}

function Resultado({ h }) {
  if (h.error === "sesion") {
    return (
      <Tarjeta>
        <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver el histórico." />
      </Tarjeta>
    );
  }
  if (h.error === "filtros") {
    return (
      <Tarjeta>
        <EstadoVacio
          titulo="Revisa los filtros"
          texto={h.textoError}
          accion={<Boton variante="secundario" onClick={h.quitarFiltros}>Quitar filtros</Boton>}
        />
      </Tarjeta>
    );
  }
  if (h.error) {
    return (
      <Tarjeta>
        <AvisoError tipo={h.error} onReintentar={h.cargar} />
      </Tarjeta>
    );
  }
  if (h.cargando) {
    return (
      <Tarjeta>
        <Esqueleto filas={5} avatar={false} columnas={3} etiqueta="Cargando el histórico…" />
      </Tarjeta>
    );
  }
  if (h.eventos.length === 0) {
    return (
      <Tarjeta>
        {h.hayFiltros ? (
          <EstadoVacio
            titulo="Ningún evento coincide"
            texto="Prueba con otro cliente, otro salón o un rango de fechas más amplio."
            accion={<Boton variante="secundario" onClick={h.quitarFiltros}>Quitar filtros</Boton>}
          />
        ) : (
          <EstadoVacio
            titulo="Aún no hay eventos en el histórico"
            texto="Aquí aparecerán las cotizaciones confirmadas y canceladas."
          />
        )}
      </Tarjeta>
    );
  }
  return <HistoricoTabla eventos={h.eventos} hoy={h.hoy} />;
}

export default function Historico() {
  const h = useHistorico();
  const cifrasVisibles = !h.cargando && !h.error;

  return (
    <div className="cotizaciones-pv">
      <div>
        <nav aria-label="Ruta" className="historico-ruta">
          <Link to="/cotizaciones">Cotizaciones</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Histórico</span>
        </nav>
        <CabeceraPagina
          titulo="Histórico de eventos"
          subtitulo="Eventos confirmados y cancelados. Abre uno para ver quién hizo cada cambio."
        />
      </div>

      <Cifras resumen={h.resumen} visibles={cifrasVisibles} />
      <Filtros h={h} />
      <Resultado h={h} />

      <SesionVencida visible={h.sesionVencida} onReingreso={h.alVolverAEntrar} />
    </div>
  );
}
