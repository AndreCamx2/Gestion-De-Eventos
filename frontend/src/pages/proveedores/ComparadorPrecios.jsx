import { useEffect, useRef, useState } from "react";
import { compararStock } from "../../api/proveedores";
import { AvisoError, Campo, Esqueleto, EstadoVacio, Tarjeta } from "../../components/ui";
import OfertasElemento from "./OfertasElemento";

// Espera después de la última tecla antes de pedir al API.
const ESPERA_MS = 300;

// "Comparar precios" en Proveedores (SGDE-71): busca un elemento y muestra, por
// cada uno, qué proveedor lo tiene más barato. Sin texto, lista todos. El API
// agrupa sin distinguir mayúsculas, tildes ni espacios de más.
// - sesionVencida, onSesionVencida(): 401 → aviso de abajo (SesionVencida de
//   Proveedores.jsx); al volver a entrar se repite la búsqueda.
export default function ComparadorPrecios({ sesionVencida, onSesionVencida }) {
  const [texto, setTexto] = useState("");
  // null = aún no llegó la primera respuesta.
  const [grupos, setGrupos] = useState(null);
  const [cargando, setCargando] = useState(true);
  // null | "permiso" | "servidor"
  const [error, setError] = useState(null);
  // Texto de la última búsqueda pedida: decide el mensaje del vacío.
  const [buscado, setBuscado] = useState("");
  const pedidoRef = useRef(0); // una respuesta vieja no pisa a la nueva (como en Calendario)
  const pendienteRef = useRef(false); // la sesión venció: repetir al volver a entrar

  async function buscar(valor) {
    const pedido = ++pedidoRef.current;
    setCargando(true);
    setError(null);
    try {
      const datos = await compararStock(valor);
      if (pedido !== pedidoRef.current) return;
      setGrupos(datos);
      setBuscado(valor.trim());
    } catch (err) {
      if (pedido !== pedidoRef.current) return;
      if (err.status === 401) {
        pendienteRef.current = true;
        onSesionVencida();
      } else {
        setError(err.status === 403 ? "permiso" : "servidor");
      }
    } finally {
      if (pedido === pedidoRef.current) setCargando(false);
    }
  }

  // Cada cambio del texto espera ESPERA_MS; si llega otra tecla, se cancela.
  useEffect(() => {
    const espera = setTimeout(() => buscar(texto), ESPERA_MS);
    return () => clearTimeout(espera);
  }, [texto]);

  // Al volver a entrar después de un 401, se repite la última búsqueda.
  useEffect(() => {
    if (sesionVencida || !pendienteRef.current) return;
    pendienteRef.current = false;
    buscar(texto);
  }, [sesionVencida]);

  let vista = "lista";
  if (error) vista = "error";
  else if (grupos === null && sesionVencida) vista = "sesion";
  else if (grupos === null) vista = "carga";
  else if (grupos.length === 0) vista = "vacio";

  return (
    <section className="comparar" aria-label="Comparar precios">
      <div className="comparar__buscar">
        <Campo
          id="comparar-elemento"
          etiqueta="Buscar elemento"
          type="search"
          autoComplete="off"
          placeholder="Ej. silla, cabina, mantel"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        {/* Siempre presente para que el lector de pantalla anuncie el resultado. */}
        <p className="comparar__estado" role="status">
          {cargando ? "Buscando…" : vista === "lista" ? `${grupos.length} ${grupos.length === 1 ? "elemento" : "elementos"}` : ""}
        </p>
      </div>

      {vista === "error" && (
        <Tarjeta>
          <AvisoError tipo={error} onReintentar={() => buscar(texto)} />
        </Tarjeta>
      )}

      {vista === "sesion" && (
        <Tarjeta>
          <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para comparar precios." />
        </Tarjeta>
      )}

      {vista === "carga" && (
        <Tarjeta>
          <Esqueleto filas={3} avatar={false} columnas={3} etiqueta="Cargando precios…" />
        </Tarjeta>
      )}

      {vista === "vacio" && (
        <Tarjeta>
          <EstadoVacio
            titulo={buscado ? "No hay proveedores con ese elemento" : "Aún no hay stock para comparar"}
            texto={
              buscado
                ? `Ningún proveedor tiene un elemento que coincida con «${buscado}». Prueba con otra palabra.`
                : "Agrega elementos al stock de tus proveedores y aquí verás quién los tiene más baratos."
            }
          />
        </Tarjeta>
      )}

      {vista === "lista" && (
        <div className={`comparar__lista ${cargando ? "comparar__lista--cargando" : ""}`} aria-busy={cargando}>
          {grupos.map((grupo, i) => (
            <OfertasElemento key={grupo.elemento} grupo={grupo} indice={i} />
          ))}
        </div>
      )}
    </section>
  );
}
