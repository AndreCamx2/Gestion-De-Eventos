import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { millones, pesos } from "../compartido/pages/cotizaciones/cotizaciones";
import { AGRUPACIONES, PERIODOS, porcentaje, textoEventos } from "../compartido/pages/ingresos/ingresos";
import { useIngresos } from "../compartido/pages/ingresos/useIngresos";
import { CampoFecha } from "../componentes/CampoFecha";
import { Cifras, Segmento } from "../componentes/formulario";
import { Aviso, Boton, Cargando, Tarjeta, Vacio, estilos } from "../componentes/ui";
import RequiereRol from "../sesion/RequiereRol";
import { colores, espacio } from "../tema";

const FECHA_COMPLETA = /^\d{4}-\d{2}-\d{2}$/;

const MENSAJES = {
  permiso: "Solo un administrador puede ver los ingresos.",
  servidor: "No pudimos hablar con el servidor. Inténtalo de nuevo.",
  sesion: "Tu sesión venció. Vuelve a entrar.",
};

// "¿Qué eventos generan más ingresos?" (SGDE-145): confirmados por tipo o grupo de evento.
function Ingresos() {
  const g = useIngresos();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  function fecha(campo, valor, guardar) {
    guardar(valor);
    if (!valor || FECHA_COMPLETA.test(valor)) g.cambiarRango(campo, valor);
  }

  const d = g.datos;

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={g.cargando && d.filas.length > 0} onRefresh={g.cargar} />}
    >
      <Text style={estilos.etiqueta}>Periodo</Text>
      <Segmento opciones={PERIODOS.map((p) => ({ valor: p.clave, etiqueta: p.texto }))} valor={g.periodo} onCambiar={g.setPeriodo} />
      {g.periodo === "rango" ? (
        <View style={{ flexDirection: "row", gap: espacio.m }}>
          <View style={{ flex: 1 }}>
            <CampoFecha etiqueta="Desde" value={desde} maximo={hasta} opcional onChangeText={(v) => fecha("desde", v, setDesde)} />
          </View>
          <View style={{ flex: 1 }}>
            <CampoFecha etiqueta="Hasta" value={hasta} minimo={desde} opcional onChangeText={(v) => fecha("hasta", v, setHasta)} />
          </View>
        </View>
      ) : null}
      <Text style={estilos.etiqueta}>Ver por</Text>
      <Segmento opciones={AGRUPACIONES.map((a) => ({ valor: a.clave, etiqueta: a.texto }))} valor={g.agrupar} onCambiar={g.setAgrupar} />

      <Aviso texto={g.error ? g.textoError || MENSAJES[g.error] : null} />
      {g.error && g.error !== "filtros" ? <Boton titulo="Reintentar" variante="secundario" onPress={g.cargar} /> : null}

      {!g.error ? (
        <Cifras
          items={[
            { etiqueta: "Ingresos confirmados", valor: millones(d.totalIngresos), detalle: pesos(d.totalIngresos) },
            { etiqueta: "Eventos", valor: String(d.totalEventos) },
            { etiqueta: "Ticket promedio", valor: millones(d.ticketPromedio) },
          ]}
        />
      ) : null}

      {g.cargando && !d.filas.length ? <Cargando texto="Calculando ingresos…" /> : null}
      {!g.cargando && !g.error && !d.filas.length ? (
        <Vacio titulo="Sin eventos confirmados" texto="No hay ingresos confirmados en este periodo." />
      ) : null}
      {d.filas.map((f) => (
        <Tarjeta key={f.clave}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={[estilos.textoFuerte, { flex: 1 }]}>{f.nombre}</Text>
            <Text style={estilos.textoFuerte}>{pesos(f.ingresos)}</Text>
          </View>
          {f.grupo ? <Text style={estilos.textoSuave}>{f.grupo}</Text> : null}
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colores.campo }}>
            <View style={{ width: `${f.ancho}%`, height: 8, borderRadius: 4, backgroundColor: colores.tinta }} />
          </View>
          <Text style={estilos.textoSuave}>
            {porcentaje(f.porcentaje)} del total · {textoEventos(f.eventos)} · ticket {millones(f.ticketPromedio)}
          </Text>
        </Tarjeta>
      ))}
    </ScrollView>
  );
}

export default function PantallaIngresos() {
  return (
    <RequiereRol rol="administrador">
      <Ingresos />
    </RequiereRol>
  );
}
