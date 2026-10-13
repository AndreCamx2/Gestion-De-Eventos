import { Link } from "react-router-dom";

// Tarjeta de un sitio (maqueta Sitios.dc.html): cabecera en tinta con la ciudad
// y el nombre, los tres conteos y la fecha de creación.
// - sitio: { id, nombre, ciudad, ciudad_nombre, creado_en } de /api/sitios/.
// - ciudad: la ciudad del catálogo (/api/ciudades/) con ese id, o undefined si
//   el catálogo no cargó; entonces solo se muestra ciudad_nombre, sin código.
// - conteos: { salones, conceptos, usuarios } de contarPorSitio(); un null es
//   una lista que no se pudo cargar y se muestra "—".

// "21 de septiembre de 2026"
const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" });

function fechaLarga(valor) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : FORMATO_FECHA.format(fecha);
}

function IconoUbicacion() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
    </svg>
  );
}

// Un conteo: el número grande y su nombre. Con `a`, es un enlace a esa pantalla.
function Conteo({ valor, nombre, a }) {
  const contenido = (
    <>
      <span className="sitio-tarjeta__numero">
        {valor === null ? (
          <>
            <span aria-hidden="true">—</span>
            <span className="visually-hidden">sin dato</span>
          </>
        ) : (
          valor
        )}
      </span>
      <span className="sitio-tarjeta__nombre-conteo">{nombre}</span>
    </>
  );

  return (
    <li className="sitio-tarjeta__conteo">
      {a ? (
        <Link to={a} className="sitio-tarjeta__enlace">
          {contenido}
        </Link>
      ) : (
        <span className="sitio-tarjeta__enlace">{contenido}</span>
      )}
    </li>
  );
}

export default function TarjetaSitio({ sitio, ciudad, conteos }) {
  const nombreCiudad = ciudad?.nombre ?? sitio.ciudad_nombre;
  const etiquetaCiudad = [nombreCiudad, ciudad?.codigo].filter(Boolean).join(" · ");
  const creado = fechaLarga(sitio.creado_en);
  const { salones = null, conceptos = null, usuarios = null } = conteos ?? {};

  return (
    <article className="sitio-tarjeta">
      <div className="sitio-tarjeta__cabecera">
        {etiquetaCiudad && (
          <span className="sitio-tarjeta__ciudad">
            <IconoUbicacion />
            {etiquetaCiudad}
          </span>
        )}
        <h2 className="sitio-tarjeta__titulo">{sitio.nombre}</h2>
      </div>

      <ul className="sitio-tarjeta__conteos">
        <Conteo valor={salones} nombre="salones" a="/salones" />
        <Conteo valor={conceptos} nombre="conceptos" a="/conceptos" />
        {/* Sin enlace: la pantalla de Usuarios todavía no existe (SGDE-37). */}
        <Conteo valor={usuarios} nombre="usuarios" />
      </ul>

      {creado && <p className="sitio-tarjeta__fecha">Creado el {creado}</p>}
    </article>
  );
}
