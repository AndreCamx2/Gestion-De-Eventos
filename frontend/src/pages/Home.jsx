import { useMemo } from "react";
import { AvisoError, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import SesionVencida from "../components/SesionVencida";
import { armarAgenda } from "../utils/inicioCifras";
import Agenda from "./inicio/Agenda";
import { Confirmados, TasaCierre } from "./inicio/Cifras";
import InicioSinPanel from "./inicio/InicioSinPanel";
import Ocupacion from "./inicio/Ocupacion";
import Saludo from "./inicio/Saludo";
import { useInicio } from "./inicio/useInicio";
import "../styles/home.css";

// Inicio (SGDE-77). Las piezas viven en pages/inicio/ (SGDE-103): la carga de
// datos en useInicio.js y cada bloque en su archivo.
export default function Home() {
  const {
    hoy,
    usuario,
    cotizaciones,
    calendario,
    salones,
    sesionVencida,
    rol,
    nombre,
    esAdmin,
    cargarUsuario,
    cargarCotizaciones,
    cargarCalendario,
    cargarSalones,
    alVolverAEntrar,
  } = useInicio();

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

// Inicio del administrador: saludo con el resumen, agenda y cifras del lateral.
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
