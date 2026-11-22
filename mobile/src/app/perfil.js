import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "../componentes/Texto";
import { actualizarPerfil, cambiarContrasena, cambiarCorreo, obtenerPerfil } from "../compartido/api/perfil";
import {
  MAX_CONTACTO,
  campoEditable,
  textoTipo,
  tipoDeError,
  validarCambioContrasena,
  validarCambioCorreo,
  validarDato,
} from "../compartido/pages/perfil/perfil";
import { useEnvio } from "../compartido/pages/perfil/useEnvio";
import { MAX_PASSWORD, filtrarTelefono, limpiarTelefono } from "../compartido/utils/validacionesRegistro";
import { Dato, Seccion } from "../componentes/formulario";
import { Cabecera, Aviso, Boton, Campo, Cargando, Tarjeta, estilos } from "../componentes/ui";
import { useCarga } from "../componentes/useCarga";
import RequiereRol from "../sesion/RequiereRol";
import { useSesion } from "../sesion/Sesion";

async function cargarPerfil() {
  try {
    return await obtenerPerfil();
  } catch (e) {
    if (tipoDeError(e) === "sinVincular") return { sinVincular: true };
    throw e;
  }
}

function TarjetaDato({ perfil, alGuardar, alVencer }) {
  const campo = campoEditable(perfil.rol);
  const [valor, setValor] = useState(perfil[campo] ?? "");
  const envio = useEnvio({ campos: [campo], onSesionVencida: alVencer });
  useEffect(() => setValor(perfil[campo] ?? ""), [perfil, campo]);

  function guardar() {
    const error = validarDato(perfil.rol, valor);
    const limpio = campo === "telefono" && valor.trim() ? limpiarTelefono(valor) : valor.trim();
    envio.enviar(error ? { [campo]: error } : {}, () => actualizarPerfil({ [campo]: limpio }), alGuardar);
  }

  return (
    <Seccion titulo={campo === "telefono" ? "Teléfono" : "Contacto"}>
      <Tarjeta>
        <Aviso texto={envio.error} />
        {envio.exito ? <Aviso tipo="exito" texto="Guardado." /> : null}
        <Campo
          etiqueta={campo === "telefono" ? "Teléfono" : "Teléfono o correo de contacto"}
          value={valor}
          onChangeText={(v) => {
            setValor(campo === "telefono" ? filtrarTelefono(v) : v);
            envio.limpiarError(campo);
          }}
          keyboardType={campo === "telefono" ? "phone-pad" : "default"}
          maxLength={campo === "telefono" ? 16 : MAX_CONTACTO}
          error={envio.errores[campo]}
        />
        <Boton titulo="Guardar" variante="secundario" cargando={envio.guardando} onPress={guardar} />
      </Tarjeta>
    </Seccion>
  );
}

function TarjetaCorreo({ perfil, alGuardar, alVencer }) {
  const [form, setForm] = useState({ correo_nuevo: "", password_actual: "" });
  const envio = useEnvio({ campos: ["correo_nuevo", "password_actual"], onSesionVencida: alVencer });

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    envio.limpiarError(campo);
  }

  function guardar() {
    const correoNuevo = form.correo_nuevo.trim().toLowerCase();
    envio.enviar(
      validarCambioCorreo({ ...form, correo_nuevo: correoNuevo }, perfil.correo),
      () => cambiarCorreo({ correoNuevo, passwordActual: form.password_actual }),
      () => {
        setForm({ correo_nuevo: "", password_actual: "" });
        alGuardar();
      },
    );
  }

  return (
    <Seccion titulo="Correo de acceso">
      <Tarjeta>
        <Aviso texto={envio.error} />
        {envio.exito ? <Aviso tipo="exito" texto="Correo actualizado." /> : null}
        <Dato etiqueta="Correo actual" valor={perfil.correo || "Sin correo"} />
        <Campo
          etiqueta="Correo nuevo"
          value={form.correo_nuevo}
          onChangeText={(v) => cambiar("correo_nuevo", v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={envio.errores.correo_nuevo}
        />
        <Campo
          etiqueta="Tu contraseña actual"
          value={form.password_actual}
          onChangeText={(v) => cambiar("password_actual", v)}
          clave
          error={envio.errores.password_actual}
        />
        <Boton titulo="Cambiar correo" variante="secundario" cargando={envio.guardando} onPress={guardar} />
      </Tarjeta>
    </Seccion>
  );
}

function TarjetaContrasena({ perfil, alVencer }) {
  const vacio = { password_actual: "", password_nueva: "", confirmacion: "" };
  const [form, setForm] = useState(vacio);
  const envio = useEnvio({ campos: ["password_actual", "password_nueva"], onSesionVencida: alVencer });

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    envio.limpiarError(campo);
  }

  function guardar() {
    const personales = [perfil.nombre, perfil.correo, perfil.identificacion, perfil.usuario].filter(Boolean);
    envio.enviar(
      validarCambioContrasena(form, personales),
      () => cambiarContrasena({ passwordActual: form.password_actual, passwordNueva: form.password_nueva }),
      () => setForm(vacio),
    );
  }

  return (
    <Seccion titulo="Contraseña">
      <Tarjeta>
        <Aviso texto={envio.error} />
        {envio.exito ? <Aviso tipo="exito" texto="Contraseña cambiada. Tu sesión sigue abierta en este celular." /> : null}
        <Campo etiqueta="Contraseña actual" value={form.password_actual} onChangeText={(v) => cambiar("password_actual", v)} clave error={envio.errores.password_actual} />
        <Campo
          etiqueta="Contraseña nueva"
          value={form.password_nueva}
          onChangeText={(v) => cambiar("password_nueva", v)}
          clave
          maxLength={MAX_PASSWORD}
          error={envio.errores.password_nueva}
        />
        <Campo etiqueta="Confírmala" value={form.confirmacion} onChangeText={(v) => cambiar("confirmacion", v)} clave error={envio.errores.confirmacion} />
        <Boton titulo="Cambiar contraseña" variante="secundario" cargando={envio.guardando} onPress={guardar} />
      </Tarjeta>
    </Seccion>
  );
}

function Perfil() {
  const { salir } = useSesion();
  const { datos: perfil, error, cargando, recargando, recargar } = useCarga(cargarPerfil);

  if (cargando) return <Cargando texto="Cargando tu perfil…" />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={estilos.pantalla}
        contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} />}
      >
        <Cabecera antetitulo="Cuenta" titulo="Mi perfil" subtitulo={perfil?.nombre} />
        <Aviso texto={error} />
        {perfil?.sinVincular ? (
          <Aviso texto="Tu usuario todavía no está vinculado a una ficha. Pídele al administrador que lo vincule." />
        ) : null}
        {perfil && !perfil.sinVincular ? (
          <>
            <View style={{ gap: 4 }}>
              <Text style={estilos.textoSuave}>
                {perfil.rol === "cliente" ? `Cliente · ${textoTipo(perfil.tipo)}` : "Proveedor"} · {perfil.identificacion || "sin identificación"}
              </Text>
              {perfil.empresa ? <Text style={estilos.textoSuave}>{perfil.empresa}</Text> : null}
              {perfil.usuario ? <Text style={estilos.textoSuave}>Usuario: {perfil.usuario}</Text> : null}
            </View>
            <TarjetaDato perfil={perfil} alGuardar={recargar} alVencer={salir} />
            <TarjetaCorreo perfil={perfil} alGuardar={recargar} alVencer={salir} />
            <TarjetaContrasena perfil={perfil} alVencer={salir} />
          </>
        ) : null}
        <Boton titulo="Cerrar sesión" variante="peligro" onPress={salir} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function PantallaPerfil() {
  return (
    <RequiereRol rol={["cliente", "proveedor"]}>
      <Perfil />
    </RequiereRol>
  );
}
