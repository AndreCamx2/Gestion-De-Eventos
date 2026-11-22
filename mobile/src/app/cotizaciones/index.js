import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { Text, TextInput } from "../../componentes/Texto";
import { router } from "expo-router";
import { getCotizaciones } from "../../compartido/api/cotizaciones";
import {
  FILTROS,
  conteosPorEstado,
  estadoVisible,
  fechaCorta,
  millones,
  normalizar,
  numeroCotizacion,
  pesos,
  resumen,
  vigencia,
} from "../../compartido/pages/cotizaciones/cotizaciones";
import { hoyLocal } from "../../compartido/utils/inicioCifras";
import { Cifras, Segmento } from "../../componentes/formulario";
import { Cabecera, Aviso, Boton, Cargando, EtiquetaEstado, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import { useCarga } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";

function Cotizaciones() {
  const hoy = useMemo(hoyLocal, []);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const { datos, error, cargando, recargando, recargar } = useCarga(() => getCotizaciones());

  const todas = useMemo(() => [...(datos ?? [])].sort((a, b) => b.id - a.id), [datos]);
  const conteos = useMemo(() => conteosPorEstado(todas), [todas]);
  const cifras = useMemo(() => (datos ? resumen(todas, hoy) : null), [datos, todas, hoy]);

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return todas.filter((c) => {
      if (filtro !== "todas" && estadoVisible(c) !== filtro) return false;
      if (!texto) return true;
      return [c.cliente_nombre, c.salon_nombre, numeroCotizacion(c.id), String(c.id)].some((v) => normalizar(v).includes(texto));
    });
  }, [todas, filtro, busqueda]);

  if (cargando) return <Cargando texto="Cargando cotizaciones…" />;

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      data={visibles}
      keyExtractor={(c) => String(c.id)}
      refreshing={recargando}
      onRefresh={recargar}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <Cabecera
            antetitulo="Operación"
            titulo="Cotizaciones"
            subtitulo="Todo lo que se ha ofrecido, en qué estado está y cuánto vale."
            acciones={
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Boton titulo="Histórico" variante="secundario" onPress={() => router.push("/historico")} />
                </View>
                <View style={{ flex: 1.6 }}>
                  <Boton titulo="+ Nueva cotización" onPress={() => router.push("/cotizaciones/nueva")} />
                </View>
              </View>
            }
          />
          {cifras ? (
            <Cifras
              items={[
                { etiqueta: "Valor vigente", valor: millones(cifras.valorVigente) },
                { etiqueta: "Cierre del mes", valor: cifras.tasa.porcentaje == null ? "—" : `${cifras.tasa.porcentaje} %` },
                { etiqueta: "Vencen en 7 días", valor: String(cifras.vencenPronto) },
                { etiqueta: "Ticket promedio", valor: millones(cifras.ticketPromedio) },
              ]}
            />
          ) : null}
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por cliente, salón o número"
            style={estilos.input}
            autoCorrect={false}
            accessibilityLabel="Buscar cotizaciones"
          />
          <Segmento
            opciones={FILTROS.map((f) => ({ valor: f.clave, etiqueta: `${f.texto} (${conteos[f.clave] ?? 0})` }))}
            valor={filtro}
            onCambiar={setFiltro}
          />
          <Aviso texto={error} />
        </View>
      }
      ListEmptyComponent={error ? null : <Vacio titulo="Sin resultados" texto="No hay cotizaciones con estos filtros." />}
      renderItem={({ item: c }) => {
        const nota = vigencia(c, hoy).nota;
        return (
          <Tarjeta
            accessibilityLabel={`Cotización ${numeroCotizacion(c.id)} de ${c.cliente_nombre}`}
            onPress={() => router.push({ pathname: "/cotizacion/[id]", params: { id: c.id } })}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={[estilos.textoFuerte, { flex: 1 }]} numberOfLines={1}>
                {numeroCotizacion(c.id)} · {c.cliente_nombre}
              </Text>
              <EtiquetaEstado estado={estadoVisible(c)} />
            </View>
            <Text style={estilos.textoSuave}>
              {c.salon_nombre} · {fechaCorta(c.fecha_evento)} · {c.cantidad_personas} pers.
            </Text>
            <Text style={estilos.textoSuave}>
              <Text style={{ fontWeight: "700" }}>{pesos(Number(c.total))}</Text>
              {nota ? ` · ${nota}` : ""}
            </Text>
          </Tarjeta>
        );
      }}
    />
  );
}

export default function PantallaCotizaciones() {
  return (
    <RequiereRol rol="administrador">
      <Cotizaciones />
    </RequiereRol>
  );
}
