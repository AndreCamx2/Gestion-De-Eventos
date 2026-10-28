import { useCallback, useEffect, useState } from "react";
import { getUsuarioActual } from "../api/auth";
import { obtenerPerfil } from "../api/perfil";
import SesionVencida from "../components/SesionVencida";
import { AvisoError, CabeceraPagina, Esqueleto, EstadoVacio, Tarjeta } from "../components/ui";
import TarjetaContrasena from "./perfil/TarjetaContrasena";
import TarjetaCorreo from "./perfil/TarjetaCorreo";
import TarjetaDatos from "./perfil/TarjetaDatos";
import { tipoDeError } from "./perfil/perfil";
import "../styles/mi-perfil.css";

function accesoDe(usuario) {
  const correo = usuario.email ?? "";
  return {
    usuario: usuario.username,
    correo,
    inicia_con_correo: Boolean(correo) && usuario.username.toLowerCase() === correo.toLowerCase(),
  };
}

export default function MiPerfil() {
  const [usuario, setUsuario] = useState(null);
  const [acceso, setAcceso] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [errorUsuario, setErrorUsuario] = useState(null);
  const [errorPerfil, setErrorPerfil] = useState(null);
  const [sesionVencida, setSesionVencida] = useState(false);

  const cargarPerfil = useCallback(async () => {
    setErrorPerfil(null);
    try {
      setPerfil(await obtenerPerfil());
    } catch (err) {
      const tipo = tipoDeError(err);
      setErrorPerfil(tipo);
      if (tipo === "sesion") setSesionVencida(true);
    }
  }, []);

  const cargar = useCallback(async () => {
    setErrorUsuario(null);
    const [rUsuario] = await Promise.allSettled([getUsuarioActual(), cargarPerfil()]);
    if (rUsuario.status === "fulfilled") {
      setUsuario(rUsuario.value);
      setAcceso(accesoDe(rUsuario.value));
    } else {
      const tipo = tipoDeError(rUsuario.reason);
      setErrorUsuario(tipo);
      if (tipo === "sesion") setSesionVencida(true);
    }
  }, [cargarPerfil]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function alVolverAEntrar() {
    setSesionVencida(false);
    if (errorUsuario === "sesion" || errorPerfil === "sesion") cargar();
  }

  const avisarSesion = () => setSesionVencida(true);

  let cuerpo;
  if (errorUsuario === "sesion") {
    cuerpo = (
      <Tarjeta>
        <EstadoVacio titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver tu perfil." />
      </Tarjeta>
    );
  } else if (errorUsuario) {
    cuerpo = (
      <Tarjeta>
        <AvisoError tipo="servidor" onReintentar={cargar} />
      </Tarjeta>
    );
  } else if (!usuario) {
    cuerpo = (
      <Tarjeta>
        <Esqueleto filas={3} avatar={false} etiqueta="Cargando tu perfil…" />
      </Tarjeta>
    );
  } else {
    cuerpo = (
      <div className="perfil-tarjetas">
        <TarjetaDatos
          perfil={perfil}
          error={errorPerfil}
          onReintentar={cargarPerfil}
          onActualizado={setPerfil}
          onSesionVencida={avisarSesion}
        />
        <TarjetaCorreo acceso={acceso} onCambiado={setAcceso} onSesionVencida={avisarSesion} />
        <TarjetaContrasena
          datosPersonales={[acceso.usuario, acceso.correo, usuario.first_name, perfil?.nombre]}
          onSesionVencida={avisarSesion}
        />
      </div>
    );
  }

  return (
    <div className="mi-perfil">
      <CabeceraPagina antetitulo="Cuenta" titulo="Mi perfil" subtitulo={perfil?.nombre} />
      {cuerpo}
      <SesionVencida visible={sesionVencida} onReingreso={alVolverAEntrar} />
    </div>
  );
}
