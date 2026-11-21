import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  actualizarConcepto,
  cambiarEstadoConcepto,
  crearConcepto,
  historialConcepto,
  listarConceptos,
  listarSitios,
} from "../../compartido/api/conceptos";
import {
  FORM_VACIO,
  MAX_NOMBRE_CONCEPTO,
  OPCIONES_IMPUESTO,
  erroresDesdeApi,
  fechaHistorial,
  formDesdeConcepto,
  formatCOP,
  impuestoFueraDeLista,
  payloadCreacion,
  payloadEdicion,
  precioConImpuesto,
  precioValido,
  validarForm,
  variacion,
} from "../../compartido/pages/conceptos/conceptos";
import { Seccion, Selector } from "../../componentes/formulario";
import { Aviso, Boton, Campo, Cargando, Tarjeta, estilos } from "../../componentes/ui";
import { textoDeError } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { colores } from "../../tema";

function FormConcepto() {
  const { id: param } = useLocalSearchParams();
  const esNuevo = param === "nuevo";
  const id = Number(param);
  const [datos, setDatos] = useState(null);
  const [errorCarga, setErrorCarga] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [exito, setExito] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [sitios, conceptos, historial] = await Promise.all([
        listarSitios(),
        esNuevo ? [] : listarConceptos(),
        esNuevo ? [] : historialConcepto(id),
      ]);
      const concepto = esNuevo ? null : conceptos.find((c) => c.id === id);
      if (!esNuevo && !concepto) throw Object.assign(new Error("No existe"), { status: 404 });
      setDatos({ sitios, concepto, historial: [...historial].reverse() });
      setErrorCarga(null);
      if (concepto) setForm(formDesdeConcepto(concepto));
      else if (sitios.length === 1) setForm((f) => ({ ...f, sitio: String(sitios[0].id) }));
    } catch (e) {
      setErrorCarga(textoDeError(e));
    }
  }, [esNuevo, id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  async function guardar() {
    setGeneral(null);
    setExito(null);
    const locales = validarForm(form);
    setErrores(locales);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try {
      if (esNuevo) {
        const creado = await crearConcepto(payloadCreacion(form));
        router.replace({ pathname: "/conceptos/[id]", params: { id: creado.id } });
      } else {
        await actualizarConcepto(id, payloadEdicion(form));
        setExito("Cambios guardados.");
        await cargar();
      }
    } catch (e) {
      if (e.status === 400) {
        const r = erroresDesdeApi(e.body);
        setErrores(r.campos);
        setGeneral(r.general);
      } else {
        setGeneral(textoDeError(e, "Solo un administrador puede editar conceptos."));
      }
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarActivo() {
    const activo = datos.concepto.activo;
    setGuardando(true);
    try {
      await cambiarEstadoConcepto(id, !activo);
      setExito(activo ? "Concepto desactivado: ya no aparece al cotizar." : "Concepto activado.");
      await cargar();
    } catch (e) {
      setGeneral(textoDeError(e));
    } finally {
      setGuardando(false);
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

  const concepto = datos.concepto;
  // Un impuesto viejo que no está en la lista se muestra igual, para no cambiarlo sin querer.
  const opcionesImpuesto = impuestoFueraDeLista(form.impuesto_pct)
    ? [...OPCIONES_IMPUESTO, { value: form.impuesto_pct, label: `${form.impuesto_pct}%` }]
    : OPCIONES_IMPUESTO;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: esNuevo ? "Nuevo concepto" : concepto?.nombre ?? "Concepto" }} />
      <ScrollView style={estilos.pantalla} contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <Aviso texto={general} />
        <Aviso tipo="exito" texto={exito} />
        {concepto && !concepto.activo ? <Aviso texto="Este concepto está inactivo: no aparece al cotizar." /> : null}

        <Selector
          etiqueta="Venue"
          valor={form.sitio}
          opciones={datos.sitios.map((s) => ({ valor: String(s.id), etiqueta: s.nombre }))}
          onCambiar={(v) => cambiar("sitio", v)}
          deshabilitado={!esNuevo}
          error={errores.sitio}
        />
        <Campo etiqueta="Nombre" value={form.nombre} onChangeText={(v) => cambiar("nombre", v)} maxLength={MAX_NOMBRE_CONCEPTO} error={errores.nombre} />
        <Campo
          etiqueta="Precio sin impuesto (pesos)"
          value={form.precio}
          onChangeText={(v) => cambiar("precio", v.replace(",", "."))}
          keyboardType="decimal-pad"
          error={errores.precio}
        />
        <Selector
          etiqueta="Impuesto"
          valor={form.impuesto_pct}
          opciones={opcionesImpuesto.map((o) => ({ valor: o.value, etiqueta: o.label }))}
          onCambiar={(v) => cambiar("impuesto_pct", v)}
          error={errores.impuesto_pct}
        />
        {precioValido(form.precio) ? (
          <Text style={estilos.textoSuave}>Con impuesto: {formatCOP(precioConImpuesto(form.precio, form.impuesto_pct))}</Text>
        ) : null}
        <Boton titulo={esNuevo ? "Crear concepto" : "Guardar cambios"} cargando={guardando} onPress={guardar} />
        {concepto ? (
          <Boton
            titulo={concepto.activo ? "Desactivar concepto" : "Activar concepto"}
            variante={concepto.activo ? "peligro" : "secundario"}
            deshabilitado={guardando}
            onPress={cambiarActivo}
          />
        ) : null}

        {datos.historial.length ? (
          <Seccion titulo="Historial de precios">
            {datos.historial.map((h) => {
              const v = variacion(h.precio_anterior, h.precio_nuevo);
              return (
                <Tarjeta key={h.id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Text style={[estilos.textoFuerte, { flex: 1 }]}>
                      {formatCOP(h.precio_anterior)} → {formatCOP(h.precio_nuevo)}
                    </Text>
                    {v ? <Text style={{ fontWeight: "700", color: v.sube ? colores.peligro : colores.exito }}>{v.texto}</Text> : null}
                  </View>
                  <Text style={estilos.textoSuave}>
                    {fechaHistorial(h.fecha_modificacion)}
                    {h.modificado_por ? ` · ${h.modificado_por}` : ""}
                  </Text>
                </Tarjeta>
              );
            })}
          </Seccion>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function PantallaConcepto() {
  return (
    <RequiereRol rol="administrador">
      <FormConcepto />
    </RequiereRol>
  );
}
