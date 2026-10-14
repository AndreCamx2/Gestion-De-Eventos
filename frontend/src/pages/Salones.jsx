import {
  AvisoError,
  Boton,
  CabeceraPagina,
  Esqueleto,
  EstadoVacio,
  Tarjeta,
} from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import NuevoSalonModal from "./salones/NuevoSalonModal";
import HabilitarMontajeModal from "./salones/HabilitarMontajeModal";
import TarjetaSalon from "./salones/TarjetaSalon";
import DialogoEditarSalon from "./salones/DialogoEditarSalon";
import DialogoEditarAforo from "./salones/DialogoEditarAforo";
import DialogoQuitarMontaje from "./salones/DialogoQuitarMontaje";
import DialogoBajaSalon from "./salones/DialogoBajaSalon";
import FiltrosSalones from "./salones/FiltrosSalones";
import TablaAforo from "./salones/TablaAforo";
import { useSalones } from "./salones/useSalones";
import "../styles/catalogo-salones.css";

// Salones y montajes. El estado y las acciones están en pages/salones/useSalones.js
// y cada parte de la pantalla en pages/salones/ (SGDE-108).
export default function Salones() {
  const {
    salones, montajes, sitios, errorCarga, cargarDatos, vista, datosListos,
    busqueda, setBusqueda, filtroMontaje, setFiltroMontaje, aforoMinimo, setAforoMinimo,
    mostrarBajas, cambiarMostrarBajas, salonesFiltrados, hayFiltros, quitarFiltros, buscarRef,
    habilitadosDe, nombreSitio, etiquetaSalon,
    dialogo, aviso, abrirDialogo, cerrarDialogo, nuevoSalonRef, propsVentana, entrarDeNuevoDesdeVentana,
    alCrearSalon, alHabilitarMontaje, alEditarSalon, alEditarAforo, alQuitarMontaje, alCambiarActivo,
    sesionVencida, setSesionVencida, sesionRef, alVolverAEntrar,
  } = useSalones();

  return (
    <div className="salones-pv">
      <CabeceraPagina
        antetitulo="Catálogo"
        titulo="Salones y montajes"
        subtitulo="Cuánta gente cabe, en qué formato y dónde."
        acciones={
          <Boton
            ref={nuevoSalonRef}
            variante="principal"
            disabled={!datosListos}
            onClick={(e) => abrirDialogo({ tipo: "salon" }, e)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo salón
          </Boton>
        }
      />

      {datosListos && (salones.length > 0 || mostrarBajas) && (
        <FiltrosSalones
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          buscarRef={buscarRef}
          montajes={montajes}
          filtroMontaje={filtroMontaje}
          onFiltroMontaje={setFiltroMontaje}
          aforoMinimo={aforoMinimo}
          onAforoMinimo={setAforoMinimo}
          mostrarBajas={mostrarBajas}
          onMostrarBajas={cambiarMostrarBajas}
          hayFiltros={hayFiltros}
          visibles={salonesFiltrados.length}
          total={salones.length}
        />
      )}

      {/* Siempre presente (aunque vacío) para que el lector de pantalla anuncie el aviso. */}
      <p className="salones-aviso" role="status">{aviso}</p>

      {vista === "error" && (
        <Tarjeta>
          <AvisoError tipo={errorCarga} onReintentar={cargarDatos} />
        </Tarjeta>
      )}

      {vista === "sesion" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Tu sesión expiró"
            texto="Vuelve a entrar con el aviso de abajo para ver los salones."
          />
        </Tarjeta>
      )}

      {vista === "carga" && (
        <Tarjeta>
          <Esqueleto filas={3} avatar={false} columnas={3} etiqueta="Cargando salones…" />
        </Tarjeta>
      )}

      {vista === "vacio" && (
        <Tarjeta>
          <EstadoVacio
            titulo={mostrarBajas ? "Aún no hay salones" : "No hay salones activos"}
            texto="Crea el primero con sus medidas. Después habilitas sus montajes con el aforo de cada uno."
            accion={
              <>
                <Boton variante="secundario" onClick={(e) => abrirDialogo({ tipo: "salon" }, e)}>
                  Nuevo salón
                </Boton>
                {!mostrarBajas && <Boton variante="secundario" onClick={() => cambiarMostrarBajas(true)}>Mostrar dados de baja</Boton>}
              </>
            }
          />
        </Tarjeta>
      )}

      {vista === "sinCoincidencias" && (
        <Tarjeta>
          <EstadoVacio
            titulo="Ningún salón coincide"
            texto="Prueba con otro nombre, otro montaje o un aforo menor."
            accion={
              <Boton variante="secundario" onClick={quitarFiltros}>
                Quitar filtros
              </Boton>
            }
          />
        </Tarjeta>
      )}

      {vista === "lista" && (
        <>
          <section className="salones-grilla" aria-label="Salones">
            {salonesFiltrados.map((s) => (
              <TarjetaSalon
                key={s.id}
                salon={s}
                sitio={nombreSitio.get(s.sitio)}
                habilitados={habilitadosDe(s.id)}
                puedeHabilitar={habilitadosDe(s.id).length < montajes.length}
                onEditar={(e) => abrirDialogo({ tipo: "editar", salon: s }, e)}
                onHabilitar={(e) => abrirDialogo({ tipo: "montaje", salonId: s.id }, e)}
                onEditarAforo={(h, e) => abrirDialogo({ tipo: "aforo", salon: s, habilitado: h }, e)}
                onQuitarMontaje={(h, e) => abrirDialogo({ tipo: "quitar", salon: s, habilitado: h }, e)}
                onCambiarActivo={(e) => abrirDialogo({ tipo: "baja", salon: s }, e)}
              />
            ))}
          </section>

          <TablaAforo
            salones={salonesFiltrados}
            montajes={montajes}
            habilitadosDe={habilitadosDe}
            etiquetaSalon={etiquetaSalon}
            onHabilitar={(e) => abrirDialogo({ tipo: "montaje", salonId: null }, e)}
          />
        </>
      )}

      {dialogo?.tipo === "salon" && (
        <NuevoSalonModal
          sitios={sitios}
          onCreado={alCrearSalon}
          onCerrar={cerrarDialogo}
          onSesionVencida={() => setSesionVencida(true)}
          sesionVencida={sesionVencida}
          onEntrarDeNuevo={entrarDeNuevoDesdeVentana}
        />
      )}

      {dialogo?.tipo === "montaje" && (
        <HabilitarMontajeModal
          salones={salones.filter((s) => s.activo !== false)}
          montajes={montajes}
          habilitados={(salonId) => new Set(habilitadosDe(salonId).map((h) => h.montajeId))}
          etiquetaSalon={etiquetaSalon}
          salonInicial={dialogo.salonId}
          onHabilitado={alHabilitarMontaje}
          onCerrar={cerrarDialogo}
          onSesionVencida={() => setSesionVencida(true)}
          sesionVencida={sesionVencida}
          onEntrarDeNuevo={entrarDeNuevoDesdeVentana}
        />
      )}

      {dialogo?.tipo === "editar" && (
        <DialogoEditarSalon salon={dialogo.salon} sitio={nombreSitio.get(dialogo.salon.sitio)} onGuardado={alEditarSalon} {...propsVentana} />
      )}
      {dialogo?.tipo === "aforo" && (
        <DialogoEditarAforo salon={dialogo.salon} habilitado={dialogo.habilitado} onGuardado={alEditarAforo} {...propsVentana} />
      )}
      {dialogo?.tipo === "quitar" && (
        <DialogoQuitarMontaje salon={dialogo.salon} habilitado={dialogo.habilitado} onQuitado={alQuitarMontaje} {...propsVentana} />
      )}

      {dialogo?.tipo === "baja" && <DialogoBajaSalon salon={dialogo.salon} onCambiado={alCambiarActivo} {...propsVentana} />}

      <SesionVencida ref={sesionRef} visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
