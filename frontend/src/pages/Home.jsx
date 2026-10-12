import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getUsuarioActual } from "../api/auth";
import { listarCotizaciones, listarCalendario } from "../api/inicio";
import { listarSalones } from "../api/salones";
import { rolesDeRuta } from "../rutasPorRol";
import { AvisoError, Boton, Esqueleto, EstadoBadge, EstadoVacio, Tarjeta } from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import {
  armarAgenda,
  confirmadosDelMes,
  dineroAbreviado,
  dineroCompleto,
  fechaISO,
  fechaLarga,
  hoyLocal,
  mesCorto,
  nombreMes,
  numero,
  ocupacionPorSalon,
  resumenPorConfirmar,
  saludoPorHora,
  sumarDias,
  tasaDeCierre,
} from "./inicioCifras";
import { nombreVisible } from "../utils/nombreUsuario";
import "../styles/home.css";

// Ventana de la agenda y de la ocupación: hoy y los 29 días siguientes.
const DIAS_VENTANA = 30;
// Eventos que se listan en la agenda; el resto se resume en "y N más".
const MAX_AGENDA = 6;

const BLOQUE_INICIAL = { fase: "cargando", datos: [], error: null };

// Tipo de error para AvisoError: "sesion" (401), "permiso" (403) o "servidor".
function tipoDeError(err) {
  if (err?.status === 401) return "sesion";
  if (err?.status === 403) return "permiso";
  return "servidor";
}

function plural(cantidad, singular, varios) {
  return `${numero(cantidad)} ${cantidad === 1 ? singular : varios}`;
}

// Cada ruta del Inicio se muestra solo si el rol puede entrar (la misma regla del menú).
function puedeEntrar(ruta, rol) {
  return rolesDeRuta(ruta).includes(rol);
}

// Error de un bloque del Inicio. Usa siempre el aspecto "servidor" de AvisoError:
// el tipo "permiso" trae "Volver al inicio", que no tiene sentido estando aquí.
// Solo los errores del servidor ofrecen "Reintentar".
function AvisoBloque({ error, texto, onReintentar, nivel = "h3" }) {
  if (error === "sesion") {
    return (
      <AvisoError
        nivel={nivel}
        titulo="Tu sesión expiró"
        texto="Vuelve a entrar con el aviso de abajo para ver estos datos."
      />
    );
  }
  if (error === "permiso") {
    return (
      <AvisoError
        nivel={nivel}
        titulo="No tienes permiso para ver esto"
        texto="Si crees que es un error, pídele acceso a un administrador."
      />
    );
  }
  return <AvisoError nivel={nivel} texto={texto} onReintentar={onReintentar} />;
}

export default function Home() {
  // La fecha de hoy queda fija mientras la pantalla está abierta.
  const [hoy] = useState(hoyLocal);
  // El usuario se pide aquí: el contexto del Outlet de DashboardLayout no llega
  // a esta pantalla porque RoleRoute (App.jsx) tiene su propio <Outlet />.
  const [usuario, setUsuario] = useState(BLOQUE_INICIAL);
  const [cotizaciones, setCotizaciones] = useState(BLOQUE_INICIAL);
  const [calendario, setCalendario] = useState(BLOQUE_INICIAL);
  const [salones, setSalones] = useState(BLOQUE_INICIAL);
  const [sesionVencida, setSesionVencida] = useState(false);

  const rol = usuario.datos?.rol?.codigo;
  const nombre = nombreVisible(usuario.datos);
  const esAdmin = rol === "administrador";

  // Pide un bloque y guarda su resultado. Si falla, solo ese bloque muestra el error.
  async function ejecutar(pedir, setBloque) {
    setBloque((prev) => ({ ...prev, fase: "cargando", error: null }));
    try {
      setBloque({ fase: "listo", datos: await pedir(), error: null });
    } catch (err) {
      const tipo = tipoDeError(err);
      if (tipo === "sesion") setSesionVencida(true);
      setBloque({ fase: "error", datos: [], error: tipo });
    }
  }

  const cargarUsuario = () => ejecutar(getUsuarioActual, setUsuario);
  const cargarCotizaciones = () => ejecutar(listarCotizaciones, setCotizaciones);
  const cargarCalendario = () =>
    ejecutar(
      () => listarCalendario({ desde: fechaISO(hoy), hasta: fechaISO(sumarDias(hoy, DIAS_VENTANA - 1)) }),
      setCalendario,
    );
  const cargarSalones = () => ejecutar(listarSalones, setSalones);

  useEffect(() => {
    cargarUsuario();
  }, []);

  // Solo el administrador pide cotizaciones y calendario: a cliente y proveedor
  // el API les responde 403.
  useEffect(() => {
    if (!esAdmin) return;
    cargarCotizaciones();
    cargarCalendario();
    cargarSalones();
  }, [esAdmin]);

  function alVolverAEntrar() {
    setSesionVencida(false);
    // Lo que falló por la sesión se pide otra vez.
    if (usuario.error === "sesion") cargarUsuario();
    if (cotizaciones.error === "sesion") cargarCotizaciones();
    if (calendario.error === "sesion") cargarCalendario();
    if (salones.error === "sesion") cargarSalones();
  }

  let contenido;
  if (usuario.fase === "cargando") {
    contenido = (
      <Tarjeta>
        <Esqueleto filas={3} avatar={false} etiqueta="Cargando el inicio…" />
      </Tarjeta>
    );
  } else if (usuario.fase === "error") {
    contenido =
      usuario.error === "sesion" ? (
        <Tarjeta>
          <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver tu inicio." />
        </Tarjeta>
      ) : (
        // /usuarios/me/ no da 403 a ningún rol: cualquier otra falla es del servidor.
        <Tarjeta>
          <AvisoError tipo="servidor" onReintentar={cargarUsuario} />
        </Tarjeta>
      );
  } else if (esAdmin) {
    contenido = (
      <InicioAdministrador
        hoy={hoy}
        nombre={nombre}
        rol={rol}
        cotizaciones={cotizaciones}
        calendario={calendario}
        salones={salones}
        onReintentarCotizaciones={cargarCotizaciones}
        onReintentarCalendario={cargarCalendario}
        onReintentarSalones={cargarSalones}
      />
    );
  } else {
    contenido = <InicioSinPanel hoy={hoy} nombre={nombre} rol={rol} />;
  }

  return (
    <div className="inicio">
      {contenido}
      <SesionVencida visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}

// ---- Cliente y proveedor ---------------------------------------------------
// Su único permiso en el panel es /inicio: aquí no hay enlaces ni llamadas al API.
const TEXTO_SIN_PANEL = {
  cliente: "Pronto verás aquí tus cotizaciones y eventos.",
  proveedor: "Pronto verás aquí los pedidos de tus eventos.",
};

function InicioSinPanel({ hoy, nombre, rol }) {
  return (
    <>
      <header className="inicio-saludo inicio-saludo--simple">
        <div className="inicio-saludo__textos">
          <p className="inicio-saludo__fecha">
            <span className="inicio-saludo__punto" aria-hidden="true" />
            {fechaLarga(hoy)}
          </p>
          <h1 className="inicio-saludo__titulo">Hola, {nombre}.</h1>
        </div>
      </header>
      <Tarjeta>
        <EstadoVacio
          titulo="Tu cuenta está activa"
          texto={TEXTO_SIN_PANEL[rol] ?? "Pronto verás aquí la información de tu cuenta."}
        />
      </Tarjeta>
    </>
  );
}

// ---- Administrador ---------------------------------------------------------
function InicioAdministrador({
  hoy,
  nombre,
  rol,
  cotizaciones,
  calendario,
  salones,
  onReintentarCotizaciones,
  onReintentarCalendario,
  onReintentarSalones,
}) {
  const agenda = useMemo(
    () => (calendario.fase === "listo" ? armarAgenda(calendario.datos, hoy) : []),
    [calendario, hoy],
  );

  return (
    <>
      <Saludo hoy={hoy} nombre={nombre} rol={rol} cotizaciones={cotizaciones} onReintentar={onReintentarCotizaciones} />

      <div className="inicio-cuerpo">
        <Agenda rol={rol} calendario={calendario} agenda={agenda} onReintentar={onReintentarCalendario} />

        <div className="inicio-lateral">
          <Confirmados hoy={hoy} cotizaciones={cotizaciones} />
          <TasaCierre hoy={hoy} cotizaciones={cotizaciones} />
          <Ocupacion
            rol={rol}
            calendario={calendario}
            salones={salones}
            onReintentarSalones={onReintentarSalones}
          />
        </div>
      </div>
    </>
  );
}

// Dinero abreviado a la vista ("$ 184,6 M"); la cifra exacta, para el lector de
// pantalla y al pasar el mouse.
function Dinero({ valor }) {
  const completo = dineroCompleto(valor);
  const corto = dineroAbreviado(valor);
  if (corto === completo) return completo;
  return (
    <span title={completo}>
      <span aria-hidden="true">{corto}</span>
      <span className="visually-hidden">{completo}</span>
    </span>
  );
}

function textoVencen(cantidad) {
  if (cantidad === 0) return "Ninguna vence esta semana";
  return cantidad === 1 ? "1 vence esta semana" : `${numero(cantidad)} vencen esta semana`;
}

// Saludo con el resumen. En escritorio es la frase de la maqueta de Inicio; en
// teléfono (Movil) el título es corto y las cifras van en la tarjeta oscura.
// Las dos variantes se alternan con CSS (display: none), así no se leen dos veces.
function Saludo({ hoy, nombre, rol, cotizaciones, onReintentar }) {
  const resumen = cotizaciones.fase === "listo" ? resumenPorConfirmar(cotizaciones.datos, hoy) : null;
  const puedeNuevaCotizacion = puedeEntrar("/cotizaciones/nueva", rol);
  const puedeVerCotizaciones = puedeEntrar("/cotizaciones", rol);

  let frase = null;
  if (resumen && resumen.cantidad === 0) {
    frase = " No tienes cotizaciones por confirmar.";
  } else if (resumen) {
    frase = (
      <>
        {" "}Tienes{" "}
        <span className="inicio-resaltado inicio-resaltado--durazno">
          {plural(resumen.cantidad, "cotización", "cotizaciones")}
        </span>{" "}
        por confirmar, que {resumen.cantidad === 1 ? "suma" : "suman"}{" "}
        <span className="inicio-resaltado inicio-resaltado--mantequilla">
          <Dinero valor={resumen.total} />
        </span>
        .
        {resumen.vencenSemana > 0 && (
          <span className="inicio-saludo__alerta"> {textoVencen(resumen.vencenSemana)}.</span>
        )}
      </>
    );
  }

  const tarjetaContenido = resumen && (
    <>
      <span className="inicio-por-confirmar__textos">
        <span className="inicio-por-confirmar__etiqueta">Por confirmar</span>
        <span className="inicio-por-confirmar__cifra">{numero(resumen.cantidad)}</span>
      </span>
      <span className="inicio-por-confirmar__detalle">
        <span className="inicio-por-confirmar__dinero"><Dinero valor={resumen.total} /></span>
        <span>{textoVencen(resumen.vencenSemana)}</span>
      </span>
    </>
  );

  return (
    <section className="inicio-saludo" aria-labelledby="inicio-saludo-titulo">
      <span className="inicio-saludo__circulo inicio-saludo__circulo--grande" aria-hidden="true" />
      <span className="inicio-saludo__circulo inicio-saludo__circulo--pequeno" aria-hidden="true" />

      <div className="inicio-saludo__textos">
        <p className="inicio-saludo__fecha">
          <span className="inicio-saludo__punto" aria-hidden="true" />
          {fechaLarga(hoy)}
        </p>
        <h1 id="inicio-saludo-titulo" className="inicio-saludo__titulo">
          <span className="inicio-solo-escritorio">Hola, {nombre}.{frase}</span>
          <span className="inicio-solo-movil">{saludoPorHora(new Date().getHours())}, {nombre}</span>
        </h1>

        {cotizaciones.fase === "cargando" && (
          <Esqueleto filas={1} avatar={false} etiqueta="Cargando el resumen…" className="inicio-saludo__esqueleto" />
        )}
        {cotizaciones.fase === "error" && (
          <Tarjeta className="inicio-saludo__error">
            <AvisoBloque
              nivel="h2"
              error={cotizaciones.error}
              texto="No se pudieron cargar las cotizaciones. El resto del inicio sigue disponible."
              onReintentar={onReintentar}
            />
          </Tarjeta>
        )}

        {/* Solo en teléfono: tarjeta oscura con las cifras (maqueta Movil). */}
        {resumen &&
          (puedeVerCotizaciones ? (
            <Link to="/cotizaciones" className="inicio-por-confirmar inicio-solo-movil">
              {tarjetaContenido}
            </Link>
          ) : (
            <div className="inicio-por-confirmar inicio-solo-movil">{tarjetaContenido}</div>
          ))}
      </div>

      {/* "Nueva cotización" queda deshabilitado hasta que exista su pantalla (SGDE-47). */}
      {puedeNuevaCotizacion && (
        <div className="inicio-saludo__accion">
          <Boton variante="principal" disabled aria-describedby="inicio-nueva-nota">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nueva cotización
          </Boton>
          <p id="inicio-nueva-nota" className="inicio-saludo__nota">Disponible pronto</p>
        </div>
      )}
    </section>
  );
}

const ETIQUETAS_CONTEO = {
  confirmado: ["confirmado", "confirmados"],
  bloqueado: ["bloqueado", "bloqueados"],
  cotizado: ["cotizado", "cotizados"],
  vencida: ["vencida", "vencidas"],
};

// Como la maqueta: en la agenda, este aviso va en lugar de las personas.
function textoVence(dias) {
  if (dias === 0) return "la oferta vence hoy";
  if (dias === 1) return "la oferta vence mañana";
  return `la oferta vence en ${dias} días`;
}

function Agenda({ rol, calendario, agenda, onReintentar }) {
  const visibles = agenda.slice(0, MAX_AGENDA);
  const restantes = agenda.length - visibles.length;
  const conteos = Object.keys(ETIQUETAS_CONTEO)
    .map((estado) => ({ estado, cantidad: agenda.filter((e) => e.estadoVisible === estado).length }))
    .filter((c) => c.cantidad > 0);
  const puedeVerCotizaciones = puedeEntrar("/cotizaciones", rol);

  return (
    <Tarjeta as="section" className="inicio-bloque inicio-agenda" aria-labelledby="inicio-agenda-titulo">
      <div className="inicio-bloque__cabecera">
        <h2 id="inicio-agenda-titulo" className="inicio-bloque__titulo">Agenda de las próximas semanas</h2>
        {conteos.length > 0 && (
          <ul className="inicio-agenda__conteos" aria-label="Eventos por estado">
            {conteos.map(({ estado, cantidad }) => (
              <li key={estado} className={`inicio-conteo inicio-conteo--${estado}`}>
                {plural(cantidad, ...ETIQUETAS_CONTEO[estado])}
              </li>
            ))}
          </ul>
        )}
        {puedeVerCotizaciones && calendario.fase === "listo" && agenda.length > 0 && (
          <Link to="/cotizaciones" className="inicio-enlace">Ver cotizaciones</Link>
        )}
      </div>

      {calendario.fase === "cargando" && <Esqueleto filas={4} columnas={1} etiqueta="Cargando la agenda…" />}

      {calendario.fase === "error" && (
        <AvisoBloque
          error={calendario.error}
          texto="No se pudo cargar la agenda. Revisa tu conexión y vuelve a intentarlo."
          onReintentar={onReintentar}
        />
      )}

      {calendario.fase === "listo" && agenda.length === 0 && (
        <EstadoVacio
          nivel="h3"
          titulo="Sin eventos en los próximos 30 días"
          texto="Cuando haya cotizaciones con fecha en este periodo, aparecerán aquí."
        />
      )}

      {visibles.length > 0 && (
        <ol className="inicio-agenda__lista">
          {visibles.map((e) => (
            <li key={e.id} className="inicio-evento">
              <time className="inicio-evento__fecha" dateTime={e.fecha_evento}>
                <span className="inicio-evento__dia">{e.fecha.getDate()}</span>
                <span className="inicio-evento__mes">{mesCorto(e.fecha)}</span>
              </time>
              <span className={`inicio-evento__punto inicio-evento__punto--${e.estadoVisible}`} aria-hidden="true" />
              <div className="inicio-evento__cuerpo">
                <div className="inicio-evento__textos">
                  <p className="inicio-evento__cliente">{e.cliente_nombre}</p>
                  <p className={`inicio-evento__detalle ${e.venceEn !== null ? "inicio-evento__detalle--alerta" : ""}`}>
                    {e.salon_nombre} · {e.montaje_nombre} ·{" "}
                    {e.venceEn !== null ? textoVence(e.venceEn) : plural(e.cantidad_personas, "persona", "personas")}
                  </p>
                </div>
                <EstadoBadge estado={e.estadoVisible} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {restantes > 0 && (
        <p className="inicio-agenda__mas">
          Y {plural(restantes, "evento más", "eventos más")} en los próximos 30 días.
        </p>
      )}
    </Tarjeta>
  );
}

// Línea corta para los bloques que dependen de una petición que ya muestra su
// AvisoError en otra parte (así no se repite el mismo aviso tres veces).
function SinDatos({ children }) {
  return <p className="inicio-cifra__sin-datos">{children}</p>;
}

function Confirmados({ hoy, cotizaciones }) {
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const listo = cotizaciones.fase === "listo";
  const actual = listo ? confirmadosDelMes(cotizaciones.datos, hoy) : 0;
  const anterior = listo ? confirmadosDelMes(cotizaciones.datos, mesAnterior) : 0;
  const diferencia = actual - anterior;
  const corto = mesCorto(mesAnterior);

  let comparacion;
  let comparacionLeida;
  if (diferencia > 0) {
    comparacion = `+${numero(diferencia)} vs. ${corto}.`;
    comparacionLeida = `${numero(diferencia)} más que en ${nombreMes(mesAnterior)}`;
  } else if (diferencia < 0) {
    comparacion = `−${numero(-diferencia)} vs. ${corto}.`;
    comparacionLeida = `${numero(-diferencia)} menos que en ${nombreMes(mesAnterior)}`;
  } else {
    comparacion = `Igual que ${corto}.`;
    comparacionLeida = `Igual que en ${nombreMes(mesAnterior)}`;
  }
  const tono = diferencia > 0 ? "sube" : diferencia < 0 ? "baja" : "igual";

  return (
    <Tarjeta as="section" className="inicio-cifra" aria-labelledby="inicio-confirmados-titulo">
      <span className="inicio-cifra__icono inicio-cifra__icono--exito" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <div className="inicio-cifra__textos">
        <h2 id="inicio-confirmados-titulo" className="inicio-cifra__titulo">
          Eventos confirmados de {nombreMes(hoy)}
        </h2>
        {cotizaciones.fase === "cargando" && <Esqueleto filas={1} avatar={false} etiqueta="Cargando…" />}
        {cotizaciones.fase === "error" && <SinDatos>Sin datos: no se pudieron cargar las cotizaciones.</SinDatos>}
        {listo && (
          <p className="inicio-cifra__valor">
            {numero(actual)}
            <span className={`inicio-cifra__comparacion inicio-cifra__comparacion--${tono}`}>
              <span aria-hidden="true">{comparacion}</span>
              <span className="visually-hidden">{comparacionLeida}</span>
            </span>
          </p>
        )}
      </div>
    </Tarjeta>
  );
}

function TasaCierre({ hoy, cotizaciones }) {
  const tasa = cotizaciones.fase === "listo" ? tasaDeCierre(cotizaciones.datos, hoy) : null;
  const mes = nombreMes(hoy);

  return (
    <Tarjeta as="section" className="inicio-cifra" aria-labelledby="inicio-tasa-titulo">
      <span className="inicio-cifra__icono inicio-cifra__icono--calido" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </span>
      <div className="inicio-cifra__textos">
        <h2 id="inicio-tasa-titulo" className="inicio-cifra__titulo">Tasa de cierre</h2>
        {cotizaciones.fase === "cargando" && <Esqueleto filas={1} avatar={false} etiqueta="Cargando…" />}
        {cotizaciones.fase === "error" && <SinDatos>Sin datos: no se pudieron cargar las cotizaciones.</SinDatos>}
        {tasa && (
          <>
            <p className="inicio-cifra__valor">{tasa.porcentaje === null ? "—" : `${tasa.porcentaje}%`}</p>
            <p className="inicio-cifra__nota">
              {tasa.porcentaje === null
                ? `Ninguna cotización se ha resuelto en ${mes}.`
                : `Confirmadas de ${plural(tasa.resueltas, "cotización resuelta", "cotizaciones resueltas")} en ${mes}.`}
            </p>
          </>
        )}
      </div>
    </Tarjeta>
  );
}

function Ocupacion({ rol, calendario, salones, onReintentarSalones }) {
  const listo = calendario.fase === "listo" && salones.fase === "listo";
  const filas = listo ? ocupacionPorSalon(calendario.datos, salones.datos, DIAS_VENTANA) : [];
  const cargando = calendario.fase === "cargando" || salones.fase === "cargando";

  let cuerpo = null;
  if (calendario.fase === "error") {
    // El aviso con "Reintentar" ya está en la agenda, que usa la misma petición.
    cuerpo = <SinDatos>Sin datos: no se pudo cargar el calendario.</SinDatos>;
  } else if (salones.fase === "error") {
    cuerpo = (
      <AvisoBloque error={salones.error} texto="No se pudieron cargar los salones." onReintentar={onReintentarSalones} />
    );
  } else if (cargando) {
    cuerpo = <Esqueleto filas={3} avatar={false} etiqueta="Cargando la ocupación…" />;
  } else if (filas.length === 0) {
    cuerpo = (
      <EstadoVacio
        nivel="h3"
        titulo="Aún no hay salones"
        texto="Cuando registres salones, verás aquí cuántos días están ocupados."
        accion={
          puedeEntrar("/salones", rol) && (
            <Boton as={Link} to="/salones" variante="secundario">Ir a Salones</Boton>
          )
        }
      />
    );
  } else {
    cuerpo = (
      <ul className="inicio-ocupacion">
        {filas.map((f, i) => (
          <li key={f.id} className="inicio-ocupacion__fila">
            <span className="inicio-ocupacion__nombre">{f.nombre}</span>
            <span className="inicio-ocupacion__barra" aria-hidden="true">
              <span
                className={`inicio-ocupacion__relleno inicio-ocupacion__relleno--tono-${i % 3}`}
                style={{ width: `${f.porcentaje}%` }}
              />
            </span>
            <span className="inicio-ocupacion__pct">
              {f.porcentaje}%
              <span className="visually-hidden">
                {" "}({numero(f.ocupados)} de {DIAS_VENTANA} días con evento confirmado o bloqueado)
              </span>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <Tarjeta as="section" className="inicio-bloque inicio-bloque--compacto" aria-labelledby="inicio-ocupacion-titulo">
      <h2 id="inicio-ocupacion-titulo" className="inicio-cifra__titulo">Ocupación · 30 días</h2>
      {cuerpo}
    </Tarjeta>
  );
}
