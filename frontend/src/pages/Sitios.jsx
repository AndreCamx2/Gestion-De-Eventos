import { useEffect, useMemo, useRef, useState } from "react";
import { listarCiudades, listarSitios } from "../api/sitios";
import { listarSalones } from "../api/salones";
import { listarConceptos } from "../api/conceptos";
import { listarUsuarios } from "../api/usuarios";
import SesionVencida from "../components/SesionVencida";
import { AvisoError, Boton, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import { contarPorSitio } from "./sitios/conteos";
import TarjetaSitio from "./sitios/TarjetaSitio";
import FormNuevoSitio from "./sitios/FormNuevoSitio";
import "../styles/sitios.css";

function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

function listaO(resultado) {
  return resultado.status === "fulfilled" ? comoLista(resultado.value) : null;
}

function tipoDeError(err) {
  if (err?.status === 401) return "sesion";
  if (err?.status === 403) return "permiso";
  return "servidor";
}

function IconoMas() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function Sitios() {
  const [sitios, setSitios] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [ciudadesFallaron, setCiudadesFallaron] = useState(false);
  const [listas, setListas] = useState({ salones: null, conceptos: null, usuarios: null });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);

  const recargarAlEntrarRef = useRef(false);
  const nombreRef = useRef(null);
  const sesionRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga(null);
    const resultados = await Promise.allSettled([
      listarSitios(),
      listarCiudades(),
      listarSalones(),
      listarConceptos(),
      listarUsuarios(),
    ]);
    const [rSitios, rCiudades, rSalones, rConceptos, rUsuarios] = resultados;

    if (rSitios.status === "fulfilled") setSitios(listaO(rSitios));
    else setErrorCarga(tipoDeError(rSitios.reason));

    setCiudades(listaO(rCiudades) ?? []);
    setCiudadesFallaron(rCiudades.status !== "fulfilled");
    setListas({ salones: listaO(rSalones), conceptos: listaO(rConceptos), usuarios: listaO(rUsuarios) });

    if (resultados.some((r) => r.status === "rejected" && r.reason?.status === 401)) {
      recargarAlEntrarRef.current = true;
      setSesionVencida(true);
    }
    setCargando(false);
  }

  async function cargarCiudades() {
    try {
      setCiudades(comoLista(await listarCiudades()));
      setCiudadesFallaron(false);
    } catch (err) {
      if (err.status === 401) setSesionVencida(true);
    }
  }

  const conteos = useMemo(() => contarPorSitio(sitios, listas), [sitios, listas]);
  // /api/sitios/ no garantiza un orden: se ordena por nombre para que la tarjeta
  // recién creada quede donde estará al recargar.
  const sitiosOrdenados = useMemo(
    () => [...sitios].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [sitios],
  );
  const ciudadPorId = useMemo(() => new Map(ciudades.map((c) => [c.id, c])), [ciudades]);

  // Los usuarios se piden otra vez: el backend le asigna el sitio a quien lo crea.
  async function alCrear(sitio) {
    let usuarios = null;
    try {
      usuarios = await listarUsuarios();
    } catch (err) {
      if (err.status === 401) {
        recargarAlEntrarRef.current = true;
        setSesionVencida(true);
      }
    }
    setSitios((prev) => [...prev, sitio]);
    if (usuarios) setListas((prev) => ({ ...prev, usuarios }));
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (recargarAlEntrarRef.current) {
      recargarAlEntrarRef.current = false;
      cargarDatos();
    }
  }

  const irAlFormulario = () => nombreRef.current?.focus();

  let vista = "lista";
  if (errorCarga === "permiso" || errorCarga === "servidor") vista = "error";
  else if (sitios.length === 0 && errorCarga === "sesion") vista = "sesion";
  else if (sitios.length === 0 && cargando) vista = "carga";
  else if (sitios.length === 0) vista = "vacio";

  return (
    <div className="sitios-pv">
      <CabeceraPagina
        antetitulo="Administración"
        titulo="Venues"
        subtitulo="Cada hotel o sede tiene sus propios salones, conceptos y precios."
      />

      {errorCarga === "permiso" ? (
        <Tarjeta>
          <AvisoError tipo="permiso" />
        </Tarjeta>
      ) : (
        <div className="sitios-cuerpo">
          <section className="sitios-lista" aria-label="Venues registrados">
            {vista === "error" && (
              <Tarjeta>
                <AvisoError tipo="servidor" onReintentar={cargarDatos} />
              </Tarjeta>
            )}

            {vista === "sesion" && (
              <Tarjeta>
                <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver los venues." />
              </Tarjeta>
            )}

            {vista === "carga" && (
              <div className="sitios-grilla" role="status" aria-busy="true">
                <span className="visually-hidden">Cargando venues…</span>
                {[0, 1].map((i) => (
                  <div key={i} className="sitio-tarjeta sitio-tarjeta--cargando" aria-hidden="true">
                    <div className="sitio-tarjeta__cabecera" />
                    <Esqueleto filas={2} avatar={false} />
                  </div>
                ))}
              </div>
            )}

            {vista === "vacio" && (
              <Tarjeta>
                <EstadoVacio
                  titulo="Aún no tienes venues"
                  texto="Crea el primero con el formulario. Si el venue ya existe, pide a quien lo administra que te lo asigne."
                  accion={<Boton variante="secundario" onClick={irAlFormulario}>Crear el primero</Boton>}
                />
              </Tarjeta>
            )}

            {vista === "lista" && (
              <div className="sitios-grilla">
                {sitiosOrdenados.map((sitio) => (
                  <TarjetaSitio key={sitio.id} sitio={sitio} ciudad={ciudadPorId.get(sitio.ciudad)} conteos={conteos[sitio.id]} />
                ))}
                <button type="button" className="sitios-agregar" onClick={irAlFormulario}>
                  <span className="sitios-agregar__icono"><IconoMas /></span>
                  <span className="sitios-agregar__titulo">Agregar otro venue</span>
                  <span className="sitios-agregar__nota">Una sede nueva arranca sin salones ni precios</span>
                </button>
              </div>
            )}
          </section>

          <FormNuevoSitio
            ciudades={ciudades}
            ciudadesFallaron={ciudadesFallaron}
            onReintentarCiudades={cargarCiudades}
            onCreado={alCrear}
            onSesionVencida={() => setSesionVencida(true)}
            nombreRef={nombreRef}
          />
        </div>
      )}

      <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
