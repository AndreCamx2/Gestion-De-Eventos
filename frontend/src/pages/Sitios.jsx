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

// Pantalla de Sitios (SGDE-83, maqueta Sitios.dc.html): una tarjeta por sitio con
// sus conteos, la tarjeta "Agregar otro sitio" y el formulario "Nuevo sitio".

// DRF puede devolver una lista o { results }.
function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// Resultado de Promise.allSettled → la lista, o null si esa petición falló.
function listaO(resultado) {
  return resultado.status === "fulfilled" ? comoLista(resultado.value) : null;
}

// Tipo de error al cargar: "sesion" (401), "permiso" (403) o "servidor" (500 o sin red).
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
  // Listas para contar; null = esa petición falló y su número muestra "—".
  const [listas, setListas] = useState({ salones: null, conceptos: null, usuarios: null });
  const [cargando, setCargando] = useState(true);
  // Error al cargar /sitios/: null | "sesion" | "permiso" | "servidor".
  const [errorCarga, setErrorCarga] = useState(null);
  // 401: se avisa abajo sin salir de la pantalla (components/SesionVencida.jsx).
  const [sesionVencida, setSesionVencida] = useState(false);

  // Si la sesión venció mientras se cargaba, al volver a entrar se carga otra vez.
  const recargarAlEntrarRef = useRef(false);
  const nombreRef = useRef(null);
  const sesionRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Las cinco peticiones van en paralelo. Solo /sitios/ es indispensable: si
  // falla una de las de conteo, ese número queda en "—"; si fallan las ciudades,
  // la tarjeta no muestra el código y el formulario ofrece reintentar.
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

  // El sitio nuevo aparece sin recargar, con salones y conceptos en 0. Los
  // usuarios se piden otra vez porque el backend le asigna el sitio a quien lo
  // crea (SGDE-90): así el conteo sale del API (1, o 0 si lo creó un superusuario,
  // que no aparece en /usuarios/). La tarjeta se agrega cuando llega esa
  // respuesta, para que el número no cambie solo. Si falla, se queda la lista
  // anterior; con un 401, todo se vuelve a cargar al entrar de nuevo.
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

  // "Agregar otro sitio" lleva al formulario: en teléfono, enfocar el campo lo trae a la vista.
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

      {/* Un 403 no deja ver ni crear: solo el aviso. */}
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
