import { useEffect, useRef, useState } from "react";
import { compararStock } from "../../api/proveedores";
import { AvisoError, Campo, Esqueleto, EstadoVacio, Tarjeta } from "../../components/ui";
import OfertasElemento from "./OfertasElemento";
import { useFuncionEstable } from "../../hooks/useFuncionEstable";

const ESPERA_MS = 300;

export default function ComparadorPrecios({ sesionVencida, onSesionVencida }) {
  const [texto, setTexto] = useState("");
  const [grupos, setGrupos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [buscado, setBuscado] = useState("");
  const pedidoRef = useRef(0); 
  const pendienteRef = useRef(false); 

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
  const buscarEstable = useFuncionEstable(buscar);
  const repetirBusqueda = useFuncionEstable(() => buscar(texto));

  useEffect(() => {
    const espera = setTimeout(() => buscarEstable(texto), ESPERA_MS);
    return () => clearTimeout(espera);
  }, [texto, buscarEstable]);

  useEffect(() => {
    if (sesionVencida || !pendienteRef.current) return;
    pendienteRef.current = false;
    repetirBusqueda();
  }, [sesionVencida, repetirBusqueda]);

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
