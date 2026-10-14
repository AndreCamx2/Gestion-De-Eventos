import { useRef, useState } from "react";
import { actualizarUsuario, darDeBajaUsuario } from "../../api/usuarios";
import { AvisoSesionEnVentana } from "../../components/SesionVencida";
import { Boton, Dialogo, cerrarDialogoDe } from "../../components/ui";
import { erroresUsuario, mensajeError, nombreCompleto } from "./usuarios";

const TEXTOS = {
  baja: {
    titulo: "Dar de baja",
    texto: "No podrá volver a entrar al sistema. Su historial se conserva y puedes reactivarlo cuando quieras.",
    boton: "Dar de baja",
    guardando: "Dando de baja…",
    variante: "peligro",
    accion: "dar de baja usuarios",
  },
  reactivar: {
    titulo: "Reactivar",
    texto: "Podrá volver a entrar al sistema con su usuario y su contraseña de siempre.",
    boton: "Reactivar",
    guardando: "Reactivando…",
    variante: "oscuro",
    accion: "reactivar usuarios",
  },
};

export default function DialogoEstadoUsuario({ tipo, usuario, onGuardado, onCerrar, sesion }) {
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const confirmarRef = useRef(null);
  const t = TEXTOS[tipo];
  const nombre = nombreCompleto(usuario);

  async function confirmar() {
    if (guardando) return;
    setError(null);
    setGuardando(true);
    try {
      const actualizado =
        tipo === "baja"
          ? (await darDeBajaUsuario(usuario.id), { ...usuario, is_active: false })
          : await actualizarUsuario(usuario.id, { is_active: true });
      setGuardando(false);
      onGuardado(actualizado, tipo === "baja" ? `"${usuario.username}" quedó dado de baja.` : `"${usuario.username}" está activo de nuevo.`);
    } catch (err) {
      setGuardando(false);
      if (err.status === 400) {
        const { campos, general } = erroresUsuario(err.body);
        setError([general, ...Object.values(campos)].filter(Boolean).join(" ") || "El servidor no permitió el cambio.");
      } else if (err.status === 401) {
        sesion.onSesionVencida();
      } else {
        setError(mensajeError(err.status, t.accion));
      }
    }
  }

  return (
    <Dialogo idTitulo="usuario-estado-titulo" titulo={`${t.titulo} a ${nombre}`} bloqueado={guardando} onCerrar={onCerrar}>
      <div className="dialogo__form">
        <p className="usuarios-dialogo-texto">{t.texto}</p>
        {sesion.sesionVencida && <AvisoSesionEnVentana onEntrar={() => sesion.onEntrarDeNuevo(confirmarRef.current)} />}
        {error && <p className="dialogo__error" role="alert">{error}</p>}
        <div className="dialogo__acciones">
          <Boton variante="secundario" disabled={guardando} onClick={(e) => cerrarDialogoDe(e.currentTarget)} data-foco-inicial>
            Cancelar
          </Boton>
          <Boton ref={confirmarRef} variante={t.variante} disabled={guardando} onClick={confirmar}>
            {guardando ? t.guardando : t.boton}
          </Boton>
        </div>
      </div>
    </Dialogo>
  );
}
