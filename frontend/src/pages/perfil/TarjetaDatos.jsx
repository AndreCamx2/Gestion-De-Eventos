import { useState } from "react";
import { actualizarPerfil } from "../../api/perfil";
import { AvisoError, Boton, Campo, Esqueleto, EstadoVacio, Tarjeta } from "../../components/ui";
import { filtrarDigitos } from "../../utils/validacionesRegistro";
import { MAX_CONTACTO, campoEditable, textoTipo, validarDato } from "./perfil";
import { useEnvio } from "./useEnvio";

function Dato({ etiqueta, valor }) {
  return (
    <div className="perfil-dato">
      <dt>{etiqueta}</dt>
      <dd>{valor || "—"}</dd>
    </div>
  );
}

function DatosFijos({ perfil }) {
  if (perfil.rol === "cliente") {
    const juridica = perfil.tipo === "juridica";
    return (
      <dl className="perfil-datos">
        <Dato etiqueta="Nombre" valor={perfil.nombre} />
        <Dato etiqueta="Tipo" valor={textoTipo(perfil.tipo)} />
        <Dato etiqueta={juridica ? "NIT" : "Identificación"} valor={perfil.identificacion} />
        {perfil.empresa && <Dato etiqueta="Empresa" valor={perfil.empresa} />}
      </dl>
    );
  }
  return (
    <dl className="perfil-datos">
      <Dato etiqueta="Proveedor" valor={perfil.nombre} />
      <Dato etiqueta="Identificación" valor={perfil.identificacion} />
    </dl>
  );
}

function FormularioDato({ perfil, onActualizado, onSesionVencida }) {
  const campo = campoEditable(perfil.rol);
  const original = perfil[campo] ?? "";
  const [valor, setValor] = useState(original);
  const envio = useEnvio({ campos: [campo], onSesionVencida });
  const esCliente = perfil.rol === "cliente";
  const sinCambios = valor.trim() === original;

  function cambiar(e) {
    setValor(esCliente ? filtrarDigitos(e.target.value) : e.target.value);
    envio.limpiarError(campo);
  }

  function guardar(e) {
    e.preventDefault();
    if (sinCambios || envio.guardando) return;
    const error = validarDato(perfil.rol, valor);
    envio.enviar(
      error ? { [campo]: error } : {},
      () => actualizarPerfil({ [campo]: valor.trim() }),
      (actualizado) => {
        setValor(actualizado[campo] ?? "");
        onActualizado(actualizado);
      },
    );
  }

  return (
    <form className="perfil-form" onSubmit={guardar} noValidate>
      {envio.error && <p className="perfil-form__error" role="alert">{envio.error}</p>}
      {esCliente ? (
        <Campo
          id="perfil-telefono"
          etiqueta="Teléfono"
          name="telefono"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          autoComplete="tel"
          placeholder="Ej. 3001234567"
          value={valor}
          onChange={cambiar}
          error={envio.errores.telefono}
        />
      ) : (
        <Campo
          id="perfil-contacto"
          etiqueta="Contacto"
          name="contacto"
          autoComplete="off"
          placeholder="Nombre y teléfono de quien atiende"
          value={valor}
          onChange={cambiar}
          error={envio.errores.contacto}
          aria-describedby={envio.errores.contacto ? "perfil-contacto-error" : "perfil-contacto-ayuda"}
        />
      )}
      {!esCliente && !envio.errores.contacto && (
        <p id="perfil-contacto-ayuda" className="perfil-form__ayuda">Máximo {MAX_CONTACTO} caracteres.</p>
      )}
      <div className="perfil-form__acciones">
        <p className="perfil-form__exito" role="status">{envio.exito ? "Datos actualizados" : ""}</p>
        <Boton type="submit" variante="oscuro" disabled={sinCambios || envio.guardando}>
          {envio.guardando ? "Guardando…" : "Guardar"}
        </Boton>
      </div>
    </form>
  );
}

export default function TarjetaDatos({ perfil, error, onReintentar, onActualizado, onSesionVencida }) {
  let cuerpo;
  if (error === "sinVincular") {
    cuerpo = (
      <EstadoVacio
        nivel="h3"
        titulo="Tu usuario todavía no está vinculado"
        texto="Pídele al administrador que lo vincule. Mientras tanto puedes cambiar tu correo y tu contraseña."
      />
    );
  } else if (error === "sesion") {
    cuerpo = <EstadoVacio nivel="h3" titulo="Tu sesión expiró" texto="Vuelve a entrar con el aviso de abajo para ver tus datos." />;
  } else if (error) {
    cuerpo = <AvisoError nivel="h3" tipo="servidor" onReintentar={onReintentar} />;
  } else if (!perfil) {
    cuerpo = <Esqueleto filas={3} avatar={false} etiqueta="Cargando tus datos…" />;
  } else {
    cuerpo = (
      <>
        <DatosFijos perfil={perfil} />
        <FormularioDato perfil={perfil} onActualizado={onActualizado} onSesionVencida={onSesionVencida} />
      </>
    );
  }

  return (
    <Tarjeta as="section" className="perfil-tarjeta" aria-labelledby="perfil-datos-titulo">
      <h2 id="perfil-datos-titulo" className="perfil-tarjeta__titulo">Mis datos</h2>
      {cuerpo}
    </Tarjeta>
  );
}
