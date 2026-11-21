import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
  descripcionCliente,
  medidasSalon,
  nombreImpuesto,
  pesos,
  pesosDeCentavos,
} from "../../compartido/pages/cotizaciones/nuevaCotizacion";
import { useNuevaCotizacion } from "../../compartido/pages/cotizaciones/useNuevaCotizacion";
import { CampoFecha, Fila, Seccion, Selector } from "../../componentes/formulario";
import { Aviso, Boton, Campo, Cargando, Tarjeta, estilos } from "../../componentes/ui";
import RequiereRol from "../../sesion/RequiereRol";
import { colores, espacio } from "../../tema";

const MENSAJES_CARGA = {
  noEditable: "Esta cotización ya no se puede editar: solo se editan las cotizadas. Si está bloqueada, libérala primero.",
  noExiste: "Esta cotización no existe.",
  permiso: "Solo un administrador puede crear cotizaciones.",
  sesion: "Tu sesión venció. Vuelve a entrar.",
};

const ERRORES_GUARDADO = {
  servidor: "No pudimos hablar con el servidor. Inténtalo de nuevo.",
  permiso: "Solo un administrador puede guardar cotizaciones.",
  sesion: "Tu sesión venció. Vuelve a entrar.",
};

const sinEvento = { preventDefault() {} };

// Igual que la web, pero el evento de los inputs se arma a mano: { target: { name, value } }.
function campo(c, name) {
  return (value) => c.cambiarCampo({ target: { name, value } });
}

function BotonMasMenos({ texto, onPress, etiqueta }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colores.lineaFuerte,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? colores.superficie2 : colores.superficie,
      })}
    >
      <Text style={{ fontSize: 20, fontWeight: "700", color: colores.texto }}>{texto}</Text>
    </Pressable>
  );
}

const TONO_AVISO = { error: "error", alerta: "error", info: "exito", libre: "exito" };

function NuevaCotizacion() {
  const { editar } = useLocalSearchParams();
  const idEditar = editar ? Number(editar) : null;
  const c = useNuevaCotizacion(idEditar);
  const titulo = c.editando ? `Editar cotización #${idEditar}` : "Nueva cotización";

  if (c.cargando) return <Cargando texto="Cargando salones y conceptos…" />;

  if (c.errorCarga) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Stack.Screen options={{ title: titulo }} />
        <Aviso texto={MENSAJES_CARGA[c.errorCarga] ?? "No pudimos cargar los datos. Revisa tu conexión."} />
        <Boton titulo="Reintentar" variante="secundario" onPress={c.cargar} />
      </View>
    );
  }

  if (c.guardada) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Stack.Screen options={{ title: titulo }} />
        <Aviso
          tipo="exito"
          texto={`${c.editando ? "Cambios guardados" : "Cotización creada"}: #${c.guardada.id} por ${pesos(c.guardada.total)}.`}
        />
        <Boton
          titulo="Ver la cotización"
          onPress={() => router.replace({ pathname: "/cotizacion/[id]", params: { id: c.guardada.id } })}
        />
        {!c.editando ? <Boton titulo="Crear otra" variante="secundario" onPress={c.empezarOtra} /> : null}
      </View>
    );
  }

  const opcionesTipo = c.tiposEvento.flatMap((grupo) =>
    (grupo.tipos ?? []).map((t) => ({ valor: String(t.id), etiqueta: t.nombre, detalle: grupo.nombre })),
  );
  const ocupacion = c.avisoOcupacion;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: titulo }} />
      <ScrollView style={estilos.pantalla} contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <Aviso texto={c.errores.general || ERRORES_GUARDADO[c.errores.tipo]} />

        <Seccion titulo="1 · Cliente">
          {c.form.cliente ? (
            <Tarjeta>
              <Text style={estilos.textoFuerte}>{c.form.cliente.nombre}</Text>
              <Text style={estilos.textoSuave}>{descripcionCliente(c.form.cliente)}</Text>
              {!c.editando ? <Boton titulo="Cambiar cliente" variante="secundario" onPress={c.cambiarCliente} /> : null}
            </Tarjeta>
          ) : (
            <View style={{ gap: espacio.s }}>
              <TextInput
                value={c.busqueda}
                onChangeText={c.setBusqueda}
                placeholder="Buscar por nombre, documento o correo"
                style={[estilos.input, c.errores.campos.cliente && estilos.inputError]}
                autoCorrect={false}
                accessibilityLabel="Buscar cliente"
              />
              {c.errores.campos.cliente ? <Text style={estilos.errorCampo}>{c.errores.campos.cliente}</Text> : null}
              {c.errorClientes ? <Aviso texto="No pudimos buscar clientes. Revisa tu conexión." /> : null}
              {c.buscandoClientes ? <Text style={estilos.textoSuave}>Buscando…</Text> : null}
              {c.clientes.slice(0, 8).map((cl) => (
                <Tarjeta key={cl.id} accessibilityLabel={`Elegir a ${cl.nombre}`} onPress={() => c.elegirCliente(cl)}>
                  <Text style={estilos.textoFuerte}>{cl.nombre}</Text>
                  <Text style={estilos.textoSuave}>{descripcionCliente(cl)}</Text>
                </Tarjeta>
              ))}
              {!c.buscandoClientes && !c.clientes.length ? (
                <Text style={estilos.textoSuave}>No hay clientes con esa búsqueda. Créalo en Clientes.</Text>
              ) : null}
            </View>
          )}
        </Seccion>

        <Seccion titulo="2 · Evento">
          <Selector
            etiqueta="Salón"
            valor={c.form.salon ?? ""}
            opciones={c.salones
              .filter((s) => s.montajes.length > 0 && s.activo !== false)
              .map((s) => ({
                valor: s.id,
                etiqueta: s.nombre,
                detalle: [s.sitio_nombre, medidasSalon(s), s.aforoMaximo ? `hasta ${s.aforoMaximo} personas` : null]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            onCambiar={(id) => c.elegirSalon(Number(id))}
            placeholder="Elige un salón"
            error={c.errores.campos.salon}
          />
          {c.salon ? (
            <Selector
              etiqueta="Montaje"
              valor={c.form.montaje ?? ""}
              opciones={c.salon.montajes.map((m) => ({ valor: m.id, etiqueta: m.nombre, detalle: `Aforo ${m.aforo}` }))}
              onCambiar={(id) => c.elegirMontaje(Number(id))}
              placeholder="Elige un montaje"
              error={c.errores.campos.montaje}
            />
          ) : null}
          <Selector
            etiqueta="Tipo de evento"
            valor={c.form.tipo_evento}
            opciones={opcionesTipo}
            onCambiar={campo(c, "tipo_evento")}
            placeholder="Selecciona un tipo de evento"
            error={c.errores.campos.tipo_evento}
          />
          <CampoFecha
            etiqueta="Fecha del evento"
            value={c.form.fecha_evento}
            onChangeText={campo(c, "fecha_evento")}
            error={c.errores.campos.fecha_evento}
          />
          {ocupacion ? <Aviso tipo={TONO_AVISO[ocupacion.tono] ?? "exito"} texto={ocupacion.texto} /> : null}

          <View style={estilos.campo}>
            <Text style={estilos.etiqueta}>Personas</Text>
            <View style={{ flexDirection: "row", gap: espacio.s, alignItems: "center" }}>
              <BotonMasMenos texto="−" etiqueta="Menos personas" onPress={() => c.cambiarPersonas(-1)} />
              <TextInput
                value={c.form.cantidad_personas}
                onChangeText={campo(c, "cantidad_personas")}
                keyboardType="number-pad"
                style={[estilos.input, { flex: 1, textAlign: "center" }, c.errores.campos.cantidad_personas && estilos.inputError]}
                accessibilityLabel="Cantidad de personas"
                placeholder="0"
              />
              <BotonMasMenos texto="+" etiqueta="Más personas" onPress={() => c.cambiarPersonas(1)} />
            </View>
            <Text style={[estilos.textoSuave, c.aforo.excede && { color: colores.peligro }]}>{c.aforo.texto}</Text>
            {c.errores.campos.cantidad_personas ? (
              <Text style={estilos.errorCampo}>{c.errores.campos.cantidad_personas}</Text>
            ) : null}
          </View>

          <CampoFecha
            etiqueta="Oferta válida hasta"
            value={c.form.validez_oferta}
            onChangeText={campo(c, "validez_oferta")}
            placeholder={c.vigencia}
            error={c.errores.campos.validez_oferta}
          />
          {!c.form.validez_oferta ? <Text style={estilos.textoSuave}>Si la dejas vacía, vence el {c.vigencia}.</Text> : null}
        </Seccion>

        <Seccion titulo="3 · Conceptos">
          {!c.salon ? (
            <Text style={estilos.textoSuave}>Elige primero el salón: los conceptos dependen del venue.</Text>
          ) : (
            <>
              <Selector
                etiqueta="Agregar concepto"
                valor={c.conceptoElegido}
                opciones={c.conceptosDisponibles.map((k) => ({
                  valor: String(k.id),
                  etiqueta: k.nombre,
                  detalle: `${pesos(k.precio)}${k.unidad ? ` · ${k.unidad}` : ""} · ${nombreImpuesto(k.impuesto_pct)}`,
                }))}
                onCambiar={c.setConceptoElegido}
                placeholder={c.conceptosDisponibles.length ? "Elige un concepto" : "Ya agregaste todos"}
                deshabilitado={!c.conceptosDisponibles.length}
              />
              <Boton titulo="Agregar" variante="secundario" deshabilitado={!c.conceptoElegido} onPress={c.agregarConcepto} />
            </>
          )}
          {c.lineas.map((linea, i) => (
            <Tarjeta key={linea.concepto.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={[estilos.textoFuerte, { flex: 1 }]}>{linea.concepto.nombre}</Text>
                <Text style={estilos.textoFuerte}>{pesosDeCentavos(linea.total)}</Text>
              </View>
              <Text style={estilos.textoSuave}>
                {pesos(linea.concepto.precio)} c/u · {Number(linea.concepto.impuesto_pct)}%
                {linea.sigue ? " · sigue a las personas" : ""}
              </Text>
              <View style={{ flexDirection: "row", gap: espacio.s, alignItems: "center" }}>
                <BotonMasMenos texto="−" etiqueta={`Menos ${linea.concepto.nombre}`} onPress={() => c.sumarCantidad(i, -1)} />
                <TextInput
                  value={String(linea.cantidad)}
                  onChangeText={(v) => c.cambiarCantidad(i, v)}
                  keyboardType="number-pad"
                  style={[estilos.input, { flex: 1, textAlign: "center" }, c.errores.lineas[i] && estilos.inputError]}
                  accessibilityLabel={`Cantidad de ${linea.concepto.nombre}`}
                />
                <BotonMasMenos texto="+" etiqueta={`Más ${linea.concepto.nombre}`} onPress={() => c.sumarCantidad(i, 1)} />
              </View>
              {c.errores.lineas[i] ? <Text style={estilos.errorCampo}>{c.errores.lineas[i]}</Text> : null}
              <Boton titulo="Quitar" variante="peligro" onPress={() => c.quitarLinea(i)} />
            </Tarjeta>
          ))}
        </Seccion>

        <Seccion titulo="4 · Resumen">
          <Tarjeta>
            <Fila izquierda="Subtotal" derecha={pesosDeCentavos(c.totales.subtotal)} />
            {c.totales.desglose.map((d) => (
              <Fila key={d.tasa} izquierda={d.nombre} derecha={pesosDeCentavos(d.valor)} />
            ))}
            <Fila izquierda="Total" derecha={pesosDeCentavos(c.totales.total)} fuerte />
          </Tarjeta>
          <Campo editable={false} etiqueta="Vigencia de la oferta" value={c.vigencia} />
          <Boton
            titulo={c.editando ? "Guardar cambios" : "Guardar cotización"}
            cargando={c.guardando}
            onPress={() => c.guardar(sinEvento)}
          />
        </Seccion>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function PantallaNuevaCotizacion() {
  return (
    <RequiereRol rol="administrador">
      <NuevaCotizacion />
    </RequiereRol>
  );
}
