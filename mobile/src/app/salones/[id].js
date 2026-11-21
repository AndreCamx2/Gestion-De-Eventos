import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  cambiarActivoSalon,
  crearSalon,
  editarAforo,
  editarSalon,
  habilitarMontaje,
  listarMontajes,
  listarSalonMontajes,
  listarSalones,
  quitarMontaje,
} from "../../compartido/api/salones";
import { listarSitios } from "../../compartido/api/sitios";
import { MAX_NOMBRE_SALON, cambiosSalon, formDesdeSalon, validarAforo, validarSalon } from "../../compartido/pages/salones/salones";
import { erroresDesdeApi, textoError } from "../../compartido/utils/erroresApi";
import { Confirmar, Dialogo, Fila, Seccion, Selector } from "../../componentes/formulario";
import { Aviso, Boton, Campo, Cargando, Tarjeta, estilos } from "../../componentes/ui";
import { textoDeError } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { espacio } from "../../tema";

const FORM_VACIO = { nombre: "", ancho: "", altura: "", foto_url: "" };

function FormSalon() {
  const { id: param } = useLocalSearchParams();
  const esNuevo = param === "nuevo";
  const id = Number(param);
  const [datos, setDatos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [sitio, setSitio] = useState("");
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [exito, setExito] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [quitando, setQuitando] = useState(null);
  const [aforoEditando, setAforoEditando] = useState(null); // { sm, valor, error }
  const [nuevoMontaje, setNuevoMontaje] = useState("");
  const [nuevoAforo, setNuevoAforo] = useState("");
  const [errorMontaje, setErrorMontaje] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [sitios, salones, montajes, salonMontajes] = await Promise.all([
        listarSitios(),
        esNuevo ? [] : listarSalones({ incluirInactivos: true }),
        listarMontajes(),
        listarSalonMontajes(),
      ]);
      const salon = esNuevo ? null : salones.find((s) => s.id === id);
      if (!esNuevo && !salon) throw Object.assign(new Error("No existe"), { status: 404 });
      setDatos({ sitios, salon, montajes, salonMontajes });
      setErrorCarga(null);
      return salon;
    } catch (e) {
      setErrorCarga(textoDeError(e));
      return null;
    }
  }, [esNuevo, id]);

  useEffect(() => {
    cargar().then((salon) => {
      if (salon) setForm(formDesdeSalon(salon));
    });
  }, [cargar]);

  useEffect(() => {
    if (esNuevo && datos?.sitios.length === 1) setSitio(String(datos.sitios[0].id));
  }, [esNuevo, datos]);

  const salon = datos?.salon ?? null;
  const montajesDelSalon = useMemo(() => (datos?.salonMontajes ?? []).filter((sm) => sm.salon === id), [datos, id]);
  const montajesLibres = useMemo(() => {
    const usados = new Set(montajesDelSalon.map((sm) => sm.montaje));
    return (datos?.montajes ?? []).filter((m) => !usados.has(m.id));
  }, [datos, montajesDelSalon]);
  const nombreMontaje = (idMontaje) => datos?.montajes.find((m) => m.id === idMontaje)?.nombre ?? `Montaje ${idMontaje}`;

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  function mostrarErrores(e) {
    if (e.status === 400) {
      const r = erroresDesdeApi(e.body, ["sitio", "nombre", "ancho", "altura", "foto_url"]);
      setErrores(r.campos);
      setGeneral(r.general);
    } else if (e.status === 409) {
      setGeneral(textoError(e.body?.detail ?? "No se puede: hay cotizaciones activas."));
    } else {
      setGeneral(textoDeError(e));
    }
  }

  async function guardar() {
    setGeneral(null);
    setExito(null);
    const locales = validarSalon(form);
    if (esNuevo && !sitio) locales.sitio = "Elige el venue del salón.";
    setErrores(locales);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try {
      if (esNuevo) {
        const creado = await crearSalon({ sitio: Number(sitio), ...form });
        router.replace({ pathname: "/salones/[id]", params: { id: creado.id } });
      } else {
        const cambios = cambiosSalon(form, salon);
        if (!Object.keys(cambios).length) {
          setGeneral("No cambiaste nada.");
          return;
        }
        await editarSalon(id, cambios);
        setExito("Cambios guardados.");
        await cargar();
      }
    } catch (e) {
      mostrarErrores(e);
    } finally {
      setGuardando(false);
    }
  }

  async function ejecutar(accion, mensaje) {
    setProcesando(true);
    setGeneral(null);
    setExito(null);
    try {
      await accion();
      setExito(mensaje);
      await cargar();
      return true;
    } catch (e) {
      mostrarErrores(e);
      return false;
    } finally {
      setProcesando(false);
    }
  }

  async function habilitar() {
    const problema = !nuevoMontaje ? "Elige el montaje." : validarAforo(nuevoAforo);
    setErrorMontaje(problema);
    if (problema) return;
    setProcesando(true);
    try {
      await habilitarMontaje({ salon: id, montaje: Number(nuevoMontaje), aforo: Number(nuevoAforo) });
      setNuevoMontaje("");
      setNuevoAforo("");
      setExito("Montaje agregado.");
      await cargar();
    } catch (e) {
      setErrorMontaje(e.status === 400 ? textoError(Object.values(e.body ?? {})[0] ?? "No se pudo agregar.") : textoDeError(e));
    } finally {
      setProcesando(false);
    }
  }

  async function guardarAforo() {
    const problema = validarAforo(aforoEditando.valor);
    if (problema) {
      setAforoEditando((a) => ({ ...a, error: problema }));
      return;
    }
    if (await ejecutar(() => editarAforo(aforoEditando.sm.id, Number(aforoEditando.valor)), "Aforo actualizado.")) {
      setAforoEditando(null);
    }
  }

  if (!datos && !errorCarga) return <Cargando />;
  if (!datos) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Aviso texto={errorCarga} />
        <Boton titulo="Reintentar" variante="secundario" onPress={cargar} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: esNuevo ? "Nuevo salón" : salon?.nombre ?? "Salón" }} />
      <ScrollView style={estilos.pantalla} contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <Aviso texto={general} />
        <Aviso tipo="exito" texto={exito} />
        {salon && salon.activo === false ? (
          <Tarjeta>
            <Text style={estilos.textoFuerte}>Este salón está dado de baja.</Text>
            <Boton titulo="Reactivar" cargando={procesando} onPress={() => ejecutar(() => cambiarActivoSalon(id, true), "Salón reactivado.")} />
          </Tarjeta>
        ) : null}

        {esNuevo ? (
          <Selector
            etiqueta="Venue"
            valor={sitio}
            opciones={datos.sitios.map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))}
            onCambiar={setSitio}
            error={errores.sitio}
          />
        ) : (
          <Text style={estilos.textoSuave}>{salon?.sitio_nombre}</Text>
        )}
        <Campo etiqueta="Nombre" value={form.nombre} onChangeText={(v) => cambiar("nombre", v)} maxLength={MAX_NOMBRE_SALON} error={errores.nombre} />
        <View style={{ flexDirection: "row", gap: espacio.m }}>
          <View style={{ flex: 1 }}>
            <Campo etiqueta="Ancho (m)" value={form.ancho} onChangeText={(v) => cambiar("ancho", v)} keyboardType="decimal-pad" error={errores.ancho} />
          </View>
          <View style={{ flex: 1 }}>
            <Campo etiqueta="Altura (m)" value={form.altura} onChangeText={(v) => cambiar("altura", v)} keyboardType="decimal-pad" error={errores.altura} />
          </View>
        </View>
        <Campo
          etiqueta="Foto (enlace, opcional)"
          value={form.foto_url}
          onChangeText={(v) => cambiar("foto_url", v)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://…"
          error={errores.foto_url}
        />
        <Boton titulo={esNuevo ? "Crear salón" : "Guardar cambios"} cargando={guardando} onPress={guardar} />
        {esNuevo ? <Text style={estilos.textoSuave}>Después de crearlo podrás agregarle sus montajes y aforos.</Text> : null}

        {!esNuevo ? (
          <Seccion titulo="Montajes y aforo">
            {montajesDelSalon.length === 0 ? <Text style={estilos.textoSuave}>Este salón todavía no tiene montajes: no se puede cotizar.</Text> : null}
            {montajesDelSalon.map((sm) => (
              <Tarjeta key={sm.id}>
                <Fila izquierda={nombreMontaje(sm.montaje)} derecha={`${sm.aforo} personas`} fuerte />
                <View style={{ flexDirection: "row", gap: espacio.s }}>
                  <View style={{ flex: 1 }}>
                    <Boton titulo="Cambiar aforo" variante="secundario" onPress={() => setAforoEditando({ sm, valor: String(sm.aforo), error: null })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Boton titulo="Quitar" variante="peligro" onPress={() => setQuitando(sm)} />
                  </View>
                </View>
              </Tarjeta>
            ))}
            {montajesLibres.length ? (
              <Tarjeta>
                <Text style={estilos.textoFuerte}>Agregar montaje</Text>
                <Selector
                  etiqueta="Montaje"
                  valor={nuevoMontaje}
                  opciones={montajesLibres.map((m) => ({ valor: String(m.id), etiqueta: m.nombre }))}
                  onCambiar={setNuevoMontaje}
                />
                <Campo etiqueta="Aforo (personas)" value={nuevoAforo} onChangeText={setNuevoAforo} keyboardType="number-pad" error={errorMontaje} />
                <Boton titulo="Agregar montaje" cargando={procesando} onPress={habilitar} />
              </Tarjeta>
            ) : null}
          </Seccion>
        ) : null}

        {salon && salon.activo !== false ? <Boton titulo="Dar de baja el salón" variante="peligro" onPress={() => setConfirmarBaja(true)} /> : null}
      </ScrollView>

      <Confirmar
        visible={confirmarBaja}
        titulo="Dar de baja"
        texto="El salón deja de aparecer al cotizar. No se puede si tiene cotizaciones activas."
        textoAccion="Dar de baja"
        peligro
        cargando={procesando}
        onAceptar={async () => {
          await ejecutar(() => cambiarActivoSalon(id, false), "Salón dado de baja.");
          setConfirmarBaja(false);
        }}
        onCerrar={() => setConfirmarBaja(false)}
      />
      <Confirmar
        visible={Boolean(quitando)}
        titulo="Quitar montaje"
        texto={quitando ? `El salón ya no se podrá cotizar en ${nombreMontaje(quitando.montaje)}.` : ""}
        textoAccion="Quitar"
        peligro
        cargando={procesando}
        onAceptar={async () => {
          await ejecutar(() => quitarMontaje(quitando.id), "Montaje quitado.");
          setQuitando(null);
        }}
        onCerrar={() => setQuitando(null)}
      />
      <Dialogo visible={Boolean(aforoEditando)} titulo={aforoEditando ? `Aforo de ${nombreMontaje(aforoEditando.sm.montaje)}` : ""} onCerrar={() => setAforoEditando(null)}>
        <Campo
          etiqueta="Personas"
          value={aforoEditando?.valor ?? ""}
          onChangeText={(v) => setAforoEditando((a) => ({ ...a, valor: v, error: null }))}
          keyboardType="number-pad"
          error={aforoEditando?.error}
        />
        <Boton titulo="Guardar aforo" cargando={procesando} onPress={guardarAforo} />
      </Dialogo>
    </KeyboardAvoidingView>
  );
}

export default function PantallaSalon() {
  return (
    <RequiereRol rol="administrador">
      <FormSalon />
    </RequiereRol>
  );
}
