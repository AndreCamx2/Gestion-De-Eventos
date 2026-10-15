import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listarProveedores, listarStock } from "../api/proveedores";
import SesionVencida from "../components/SesionVencida";
import { AvisoError, Boton, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import { conteoPorProveedor, porNombre, stockDe } from "./proveedores/proveedores";
import TarjetasProveedores from "./proveedores/TarjetasProveedores";
import StockTabla from "./proveedores/StockTabla";
import DialogoNuevoProveedor from "./proveedores/DialogoNuevoProveedor";
import DialogoNuevoElemento from "./proveedores/DialogoNuevoElemento";
import DialogoEditarStock from "./proveedores/DialogoEditarStock";
import DialogoUsuarioAcceso from "./proveedores/DialogoUsuarioAcceso";
import SelectorVista from "./proveedores/SelectorVista";
import ComparadorPrecios from "./proveedores/ComparadorPrecios";
import "../styles/proveedores.css";
import "../styles/proveedores-acceso.css";

// Pantalla de Proveedores y stock (SGDE-81 y SGDE-42, maqueta Proveedores.dc.html):
// tarjetas de proveedor seleccionables y la tabla de stock del elegido, con su
// cantidad y valor editables (SGDE-98). Con ?vista=comparar, "Comparar precios"
// entre proveedores por elemento (SGDE-71). Cada pieza vive en pages/proveedores/.

// Tipo de error al cargar: "sesion" (401), "permiso" (403) o "servidor" (500 o sin red).
function tipoDeError(err) {
  if (err?.status === 401) return "sesion";
  if (err?.status === 403) return "permiso";
  return "servidor";
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  // Stock de todos los proveedores; null = /stock/ no cargó.
  const [stock, setStock] = useState(null);
  const [cargando, setCargando] = useState(true);
  // Error al cargar /proveedores/: null | "sesion" | "permiso" | "servidor".
  const [errorCarga, setErrorCarga] = useState(null);
  // 401: se avisa abajo sin salir de la pantalla (components/SesionVencida.jsx).
  const [sesionVencida, setSesionVencida] = useState(false);
  const [seleccionId, setSeleccionId] = useState(null);
  // Ventana abierta: null | "proveedor" | "elemento" | "editar" | "acceso".
  const [dialogo, setDialogo] = useState(null);
  // Elemento del stock que se edita (con dialogo === "editar").
  const [editando, setEditando] = useState(null);
  // ?vista=comparar muestra "Comparar precios" (SGDE-71); sin parámetro, el stock.
  const [parametros, setParametros] = useSearchParams();
  const enComparar = parametros.get("vista") === "comparar";

  // Si la sesión venció mientras se cargaba, al volver a entrar se carga otra vez.
  const recargarAlEntrarRef = useRef(false);
  // Botón que abrió la ventana: al cerrarla, el foco vuelve ahí.
  const disparadorRef = useRef(null);
  const nuevoRef = useRef(null);
  const stockRef = useRef(null);
  const sesionRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  // Al cerrarse una ventana, el foco vuelve al botón que la abrió. Va en un efecto
  // porque mientras el <dialog> modal sigue montado, lo de afuera está inerte y
  // focus() no funciona. Si ese botón ya no existe (el del estado vacío), va a
  // "Nuevo proveedor".
  useEffect(() => {
    if (dialogo !== null || !disparadorRef.current) return;
    const disparador = disparadorRef.current;
    disparadorRef.current = null;
    (disparador.isConnected ? disparador : nuevoRef.current)?.focus();
  }, [dialogo]);

  // Proveedores y stock van en paralelo. Si solo falla /stock/, las tarjetas se
  // ven igual y la sección de stock ofrece reintentar.
  async function cargarDatos() {
    setCargando(true);
    setErrorCarga(null);
    const [rProveedores, rStock] = await Promise.allSettled([listarProveedores(), listarStock()]);

    if (rProveedores.status === "fulfilled") setProveedores(rProveedores.value);
    else setErrorCarga(tipoDeError(rProveedores.reason));
    setStock(rStock.status === "fulfilled" ? rStock.value : null);

    if ([rProveedores, rStock].some((r) => r.status === "rejected" && r.reason?.status === 401)) {
      recargarAlEntrarRef.current = true;
      setSesionVencida(true);
    }
    setCargando(false);
  }

  async function cargarStock() {
    try {
      setStock(await listarStock());
    } catch (err) {
      if (err.status === 401) {
        recargarAlEntrarRef.current = true;
        setSesionVencida(true);
      }
    }
  }

  const ordenados = useMemo(() => [...proveedores].sort(porNombre), [proveedores]);
  const seleccionado = ordenados.find((p) => p.id === seleccionId) ?? ordenados[0] ?? null;
  const conteos = useMemo(() => (stock ? conteoPorProveedor(stock) : null), [stock]);
  const elementos = stock && seleccionado ? stockDe(stock, seleccionado.id) : null;

  function elegir(proveedor) {
    setSeleccionId(proveedor.id);
    // En teléfono la tabla queda lejos, debajo de todas las tarjetas: se baja hasta ella.
    if (window.matchMedia("(max-width: 600px)").matches) {
      const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() =>
        stockRef.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" }),
      );
    }
  }

  function abrir(tipo, boton) {
    disparadorRef.current = boton;
    setDialogo(tipo);
  }

  function cerrarDialogo() {
    setDialogo(null);
  }

  function abrirEditar(elemento, boton) {
    setEditando(elemento);
    abrir("editar", boton);
  }

  // La fila se reemplaza en el sitio: no se recarga la pantalla.
  function alEditarStock(actualizado) {
    setStock((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
    cerrarDialogo();
  }

  function alCrearProveedor(proveedor) {
    setProveedores((prev) => [...prev, proveedor]);
    setSeleccionId(proveedor.id);
    cerrarDialogo();
  }

  // Vincular o desvincular el usuario de acceso (SGDE-72): la tarjeta se actualiza en el sitio.
  function alVincularUsuario(actualizado) {
    setProveedores((prev) => prev.map((p) => (p.id === actualizado.id ? actualizado : p)));
    cerrarDialogo();
  }

  function alCrearElemento(elemento) {
    // Si /stock/ no había cargado, se pide completo; si no, se suma a la lista.
    if (stock) setStock((prev) => [...prev, elemento]);
    else cargarStock();
    cerrarDialogo();
  }

  // "Entrar de nuevo" desde dentro de una ventana abierta (SGDE-94): el login se
  // abre encima y, al entrar, el foco vuelve a "Guardar" de la ventana.
  function entrarDeNuevoDesdeVentana(boton) {
    sesionRef.current?.abrir({ focoAlVolver: boton });
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (recargarAlEntrarRef.current) {
      recargarAlEntrarRef.current = false;
      cargarDatos();
    }
  }

  let vista = "lista";
  if (errorCarga === "permiso" || errorCarga === "servidor") vista = "error";
  else if (proveedores.length === 0 && errorCarga === "sesion") vista = "sesion";
  else if (proveedores.length === 0 && cargando) vista = "carga";
  else if (proveedores.length === 0) vista = "vacio";

  // Estable: DialogoUsuarioAcceso la usa en un efecto.
  const marcarSesionVencida = useCallback(() => setSesionVencida(true), []);
  const propsSesion = {
    onSesionVencida: marcarSesionVencida,
    sesionVencida,
    onEntrarDeNuevo: entrarDeNuevoDesdeVentana,
  };

  return (
    <div className="proveedores-pv">
      <CabeceraPagina
        antetitulo="Catálogo"
        titulo="Proveedores y stock"
        subtitulo="Quién provee qué, cuánto hay y cuánto vale."
        acciones={
          errorCarga !== "permiso" && (
            <>
              {!enComparar && (
                <Boton variante="secundario" disabled={!seleccionado} onClick={(e) => abrir("elemento", e.currentTarget)}>
                  Agregar elemento
                </Boton>
              )}
              <Boton ref={nuevoRef} onClick={(e) => abrir("proveedor", e.currentTarget)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Nuevo proveedor
              </Boton>
            </>
          )
        }
      />

      {errorCarga !== "permiso" && (
        <SelectorVista vista={enComparar ? "comparar" : "stock"} onCambiar={(v) => setParametros(v === "comparar" ? { vista: v } : {}, { replace: true })} />
      )}

      {enComparar && errorCarga !== "permiso" && (
        <ComparadorPrecios sesionVencida={sesionVencida} onSesionVencida={() => setSesionVencida(true)} />
      )}

      {vista === "error" && (!enComparar || errorCarga === "permiso") && (
        <Tarjeta>
          <AvisoError tipo={errorCarga} onReintentar={cargarDatos} />
        </Tarjeta>
      )}

      {!enComparar && vista === "sesion" && (
        <Tarjeta>
          <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver los proveedores." />
        </Tarjeta>
      )}

      {!enComparar && vista === "carga" && (
        <Tarjeta>
          <Esqueleto filas={3} columnas={2} etiqueta="Cargando proveedores…" />
        </Tarjeta>
      )}

      {!enComparar && vista === "vacio" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Aún no hay proveedores"
            texto="Registra el primero y luego agrégale lo que provee: sonido, mobiliario, flores…"
            accion={
              <Boton variante="secundario" onClick={(e) => abrir("proveedor", e.currentTarget)}>
                Nuevo proveedor
              </Boton>
            }
          />
        </Tarjeta>
      )}

      {!enComparar && vista === "lista" && seleccionado && (
        <>
          <TarjetasProveedores
            proveedores={ordenados}
            seleccionadoId={seleccionado.id}
            conteos={conteos}
            onElegir={elegir}
            onUsuarioAcceso={(boton) => abrir("acceso", boton)}
          />
          <div ref={stockRef} className="proveedores-stock-ancla">
            <StockTabla
              proveedor={seleccionado}
              elementos={elementos}
              onReintentar={cargarStock}
              onAgregar={(boton) => abrir("elemento", boton)}
              onEditar={abrirEditar}
            />
          </div>
        </>
      )}

      {dialogo === "proveedor" && (
        <DialogoNuevoProveedor onCreado={alCrearProveedor} onCerrar={cerrarDialogo} {...propsSesion} />
      )}

      {dialogo === "elemento" && seleccionado && (
        <DialogoNuevoElemento proveedor={seleccionado} onCreado={alCrearElemento} onCerrar={cerrarDialogo} {...propsSesion} />
      )}

      {dialogo === "editar" && seleccionado && editando && (
        <DialogoEditarStock
          proveedor={seleccionado}
          elemento={editando}
          onGuardado={alEditarStock}
          onCerrar={cerrarDialogo}
          {...propsSesion}
        />
      )}

      {dialogo === "acceso" && seleccionado && (
        <DialogoUsuarioAcceso
          proveedor={seleccionado}
          proveedores={proveedores}
          onGuardado={alVincularUsuario}
          onCerrar={cerrarDialogo}
          {...propsSesion}
        />
      )}

      <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
