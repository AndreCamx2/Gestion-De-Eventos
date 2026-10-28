import { useEffect, useRef, useState } from "react";
import { getUsuarioActual } from "../api/auth";
import { crearMiStock, editarMiStock, listarMiStock } from "../api/proveedores";
import SesionVencida from "../components/SesionVencida";
import { AvisoError, Boton, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import AvisoGuardado from "./proveedores/AvisoGuardado";
import DialogoEditarStock from "./proveedores/DialogoEditarStock";
import DialogoNuevoElemento from "./proveedores/DialogoNuevoElemento";
import StockTabla from "./proveedores/StockTabla";
import { stockDe } from "./proveedores/proveedores";
import "../styles/proveedores.css";

// "Mi stock" del proveedor (SGDE-72): ve, agrega y edita (cantidad y valor) solo su
// stock, con /api/mi-stock/ (SGDE-30). Reutiliza la tabla y las ventanas de Proveedores.
// El nombre del proveedor sale de /usuarios/me/ (campo `proveedor`).

const VACIO = {
  titulo: "Aún no tienes elementos en tu stock",
  texto: "Agrega lo que ofreces, cuántos tienes y cuánto vale cada uno.",
};

// Error al cargar: "sinVincular" (403 con ese código), "permiso" (otro 403),
// "sesion" (401) o "servidor" (500 o sin red). La pantalla decide por el código del
// 403, no por su texto.
function tipoDeError(err) {
  if (err?.status === 401) return "sesion";
  if (err?.status === 403) return err.body?.codigo === "proveedor_sin_vincular" ? "sinVincular" : "permiso";
  return "servidor";
}

export default function MiStock() {
  const [elementos, setElementos] = useState(null);
  const [proveedor, setProveedor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);
  // Ventana abierta: null | "elemento" | "editar".
  const [dialogo, setDialogo] = useState(null);
  const [editando, setEditando] = useState(null);
  const [guardado, setGuardado] = useState(false);
  const disparadorRef = useRef(null);
  const agregarRef = useRef(null);
  const sesionRef = useRef(null);

  useEffect(() => {
    cargar();
  }, []);

  // Al cerrar una ventana, el foco vuelve al botón que la abrió (o a "Agregar elemento").
  useEffect(() => {
    if (dialogo !== null || !disparadorRef.current) return;
    const disparador = disparadorRef.current;
    disparadorRef.current = null;
    (disparador.isConnected ? disparador : agregarRef.current)?.focus();
  }, [dialogo]);

  async function cargar() {
    setCargando(true);
    setErrorCarga(null);
    const [rStock, rYo] = await Promise.allSettled([listarMiStock(), getUsuarioActual()]);
    if (rYo.status === "fulfilled" && rYo.value.proveedor) setProveedor(rYo.value.proveedor);
    if (rStock.status === "fulfilled") {
      setElementos(rStock.value);
    } else {
      const tipo = tipoDeError(rStock.reason);
      setErrorCarga(tipo);
      if (tipo === "sesion") setSesionVencida(true);
    }
    setCargando(false);
  }

  function abrir(tipo, boton) {
    disparadorRef.current = boton;
    setGuardado(false);
    setDialogo(tipo);
  }

  function abrirEditar(elemento, boton) {
    setEditando(elemento);
    abrir("editar", boton);
  }

  function alCrear(elemento) {
    setElementos((prev) => [...prev, elemento]);
    setGuardado(true);
    setDialogo(null);
  }

  function alEditar(actualizado) {
    setElementos((prev) => prev.map((e) => (e.id === actualizado.id ? actualizado : e)));
    setGuardado(true);
    setDialogo(null);
  }

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorCarga === "sesion") cargar();
  }

  const listo = elementos !== null && proveedor !== null && !errorCarga;
  // El proveedor que esperan StockTabla y las ventanas: { id, nombre }.
  const ordenados = listo ? stockDe(elementos, proveedor.id) : null;
  const propsVentana = {
    proveedor,
    onCerrar: () => setDialogo(null),
    onSesionVencida: () => setSesionVencida(true),
    sesionVencida,
    onEntrarDeNuevo: (boton) => sesionRef.current?.abrir({ focoAlVolver: boton }),
  };

  let cuerpo = null;
  if (cargando && !listo) {
    cuerpo = <Esqueleto filas={3} columnas={2} etiqueta="Cargando tu stock…" />;
  } else if (errorCarga === "sinVincular") {
    cuerpo = (
      <EstadoVacio
        titulo="Tu usuario todavía no está vinculado a un proveedor"
        texto="Pídele al administrador que lo vincule."
      />
    );
  } else if (errorCarga === "sesion") {
    cuerpo = <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver tu stock." />;
  } else if (errorCarga === "permiso") {
    cuerpo = <AvisoError tipo="permiso" titulo="Esta sección es para proveedores" />;
  } else if (errorCarga || !listo) {
    cuerpo = <AvisoError tipo="servidor" onReintentar={cargar} />;
  }

  return (
    <div className="proveedores-pv">
      <CabeceraPagina
        antetitulo="Proveedor"
        titulo="Mi stock"
        subtitulo={proveedor?.nombre}
        acciones={
          listo && (
            <Boton ref={agregarRef} onClick={(e) => abrir("elemento", e.currentTarget)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Agregar elemento
            </Boton>
          )
        }
      />

      <AvisoGuardado visible={guardado} />

      {cuerpo ? (
        <Tarjeta>{cuerpo}</Tarjeta>
      ) : (
        <StockTabla
          proveedor={proveedor}
          elementos={ordenados}
          onReintentar={cargar}
          onAgregar={(boton) => abrir("elemento", boton)}
          onEditar={abrirEditar}
          vacio={VACIO}
        />
      )}

      {dialogo === "elemento" && listo && <DialogoNuevoElemento {...propsVentana} crear={crearMiStock} onCreado={alCrear} />}
      {dialogo === "editar" && listo && editando && (
        <DialogoEditarStock {...propsVentana} elemento={editando} editar={editarMiStock} onGuardado={alEditar} />
      )}

      <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
