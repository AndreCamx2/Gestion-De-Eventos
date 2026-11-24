import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Text } from "../componentes/Texto";
import { router } from "expo-router";
import { fechaCorta, millones, numeroCotizacion, pesos } from "../compartido/pages/cotizaciones/cotizaciones";
import { ESTADOS_HISTORICO, realizado } from "../compartido/pages/cotizaciones/historico";
import { useHistorico } from "../compartido/pages/cotizaciones/useHistorico";
import { CampoFecha } from "../componentes/CampoFecha";
import { Cifras, Segmento, Selector } from "../componentes/formulario";
import { Cabecera, Aviso, Boton, Cargando, EtiquetaEstado, Tarjeta, Vacio, estilos } from "../componentes/ui";
import RequiereRol from "../sesion/RequiereRol";
import { colores, espacio } from "../tema";

const FECHA_COMPLETA = /^\d{4}-\d{2}-\d{2}$/;

const MENSAJES = {
  permiso: "Solo un administrador puede ver el histórico.",
  servidor: "No pudimos hablar con el servidor. Inténtalo de nuevo.",
  sesion: "Tu sesión venció. Vuelve a entrar.",
};

// Eventos confirmados y cancelados, como la página Histórico de la web.
function Historico() {
  const h = useHistorico();
  // Las fechas se aplican cuando están completas: así no se consulta con "2026-1".
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  function fecha(campo, valor, guardar) {
    guardar(valor);
    if (!valor || FECHA_COMPLETA.test(valor)) h.cambiarFiltro(campo, valor);
  }

  function quitar() {
    setDesde("");
    setHasta("");
    h.quitarFiltros();
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={h.cargando && h.eventos.length > 0} onRefresh={h.cargar} />}
    >
      <Text style={estilos.textoSuave}>
        <Text accessibilityRole="link" onPress={() => router.navigate("/cotizaciones")} style={{ color: colores.mandarinaTexto, fontWeight: "700" }}>
          Cotizaciones
        </Text>
        {"  /  "}Histórico
      </Text>
      <Cabecera titulo="Histórico de eventos" subtitulo="Eventos confirmados y cancelados. Abre uno para ver quién hizo cada cambio." />
      <Segmento
        opciones={ESTADOS_HISTORICO.map((e) => ({ valor: e.clave, etiqueta: e.texto }))}
        valor={h.filtros.estado}
        onCambiar={(v) => h.cambiarFiltro("estado", v)}
      />
      <Selector
        etiqueta="Cliente"
        valor={h.filtros.cliente}
        conVacio="Todos los clientes"
        opciones={h.clientes.map((c) => ({ valor: String(c.id), etiqueta: c.nombre }))}
        onCambiar={(v) => h.cambiarFiltro("cliente", v)}
      />
      <Selector
        etiqueta="Salón"
        valor={h.filtros.salon}
        conVacio="Todos los salones"
        opciones={h.salones.map((s) => ({ valor: String(s.id), etiqueta: s.nombre, detalle: s.sitio_nombre }))}
        onCambiar={(v) => h.cambiarFiltro("salon", v)}
      />
      <View style={{ flexDirection: "row", gap: espacio.m }}>
        <View style={{ flex: 1 }}>
          <CampoFecha etiqueta="Desde" value={desde} maximo={hasta} opcional onChangeText={(v) => fecha("desde", v, setDesde)} />
        </View>
        <View style={{ flex: 1 }}>
          <CampoFecha etiqueta="Hasta" value={hasta} minimo={desde} opcional onChangeText={(v) => fecha("hasta", v, setHasta)} />
        </View>
      </View>
      {h.hayFiltros ? <Boton titulo="Quitar filtros" variante="secundario" onPress={quitar} /> : null}

      <Aviso texto={h.error ? h.textoError || MENSAJES[h.error] : null} />
      {h.error && h.error !== "filtros" ? <Boton titulo="Reintentar" variante="secundario" onPress={h.cargar} /> : null}

      <Cifras
        items={[
          { etiqueta: "Realizados", valor: String(h.resumen.realizados) },
          { etiqueta: "Confirmados por venir", valor: String(h.resumen.proximos) },
          { etiqueta: "Cancelados", valor: String(h.resumen.cancelados) },
          { etiqueta: "Valor confirmado", valor: millones(h.resumen.valorConfirmado) },
        ]}
      />

      {h.cargando && !h.eventos.length ? <Cargando texto="Cargando el histórico…" /> : null}
      {!h.cargando && !h.error && !h.eventos.length ? <Vacio titulo="Sin eventos" texto="No hay eventos con estos filtros." /> : null}
      {h.eventos.map((e) => (
        <Tarjeta
          key={e.id}
          accessibilityLabel={`Evento ${numeroCotizacion(e.id)} de ${e.cliente_nombre}`}
          onPress={() => router.push({ pathname: "/cotizacion/[id]", params: { id: e.id } })}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={[estilos.textoFuerte, { flex: 1 }]} numberOfLines={1}>
              {numeroCotizacion(e.id)} · {e.cliente_nombre}
            </Text>
            <EtiquetaEstado estado={e.estado} etiqueta={realizado(e, h.hoy) ? "Realizado" : undefined} />
          </View>
          <Text style={estilos.textoSuave}>
            {e.salon_nombre} · {fechaCorta(e.fecha_evento)} · {e.cantidad_personas} pers.
          </Text>
          <Text style={estilos.textoFuerte}>{pesos(Number(e.total))}</Text>
        </Tarjeta>
      ))}
    </ScrollView>
  );
}

export default function PantallaHistorico() {
  return (
    <RequiereRol rol="administrador">
      <Historico />
    </RequiereRol>
  );
}
