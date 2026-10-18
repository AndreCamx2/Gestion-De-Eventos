import { useCallback, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { obtenerCalendario } from "../../api/disponibilidad";
import { Aviso, Boton, Cargando, EtiquetaEstado, Tarjeta, estilos } from "../../componentes/ui";
import RequiereRol from "../../sesion/RequiereRol";
import { colores } from "../../tema";
import { agruparPorDia } from "../../utils/dias";
import { diaLegible, hoyISO, momentoLegible, sumarDias } from "../../utils/fechas";
import { estadoVisible } from "../../utils/estados";
import { mensajeDeError } from "../../utils/errores";

const DIAS_POR_TANDA = 30;

function DiasDelSalon() {
  const { salon, nombre } = useLocalSearchParams();
  const [dias, setDias] = useState(DIAS_POR_TANDA);
  const [cotizaciones, setCotizaciones] = useState(null);
  const [error, setError] = useState(null);
  const [recargando, setRecargando] = useState(false);
  const desde = hoyISO();

  const cargar = useCallback(async () => {
    try {
      const lista = await obtenerCalendario({ salon, desde, hasta: sumarDias(desde, dias - 1) });
      setCotizaciones(lista);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e).general);
    }
  }, [salon, desde, dias]);

  // Al volver del detalle (después de bloquear o liberar) se recarga.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const filas = useMemo(() => agruparPorDia(cotizaciones ?? [], desde, dias), [cotizaciones, desde, dias]);

  async function recargar() {
    setRecargando(true);
    await cargar();
    setRecargando(false);
  }

  if (cotizaciones === null && !error) return <Cargando texto="Cargando disponibilidad…" />;

  return (
    <>
      <Stack.Screen options={{ title: nombre ? String(nombre) : "Salón" }} />
      <FlatList
        style={estilos.pantalla}
        contentContainerStyle={estilos.contenido}
        data={filas}
        keyExtractor={(d) => d.fecha}
        refreshing={recargando}
        onRefresh={recargar}
        ListHeaderComponent={
          <View style={{ gap: 6 }}>
            <Text style={estilos.subtitulo}>Próximos {dias} días. Toca una cotización para bloquear o liberar.</Text>
            <Aviso texto={error} />
          </View>
        }
        renderItem={({ item }) => <Dia dia={item} />}
        ListFooterComponent={
          <Boton titulo={`Ver ${DIAS_POR_TANDA} días más`} variante="secundario" onPress={() => setDias((d) => d + DIAS_POR_TANDA)} />
        }
      />
    </>
  );
}

function Dia({ dia }) {
  const libre = dia.cotizaciones.length === 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[estilos.textoFuerte, { textTransform: "capitalize" }]}>{diaLegible(dia.fecha)}</Text>
        {libre ? <Text style={{ color: colores.exito, fontWeight: "700" }}>Libre</Text> : null}
      </View>
      {dia.cotizaciones.map((c) => (
        <Tarjeta
          key={c.id}
          accessibilityLabel={`Cotización de ${c.cliente_nombre}`}
          onPress={() => router.push({ pathname: "/cotizacion/[id]", params: { id: c.id } })}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={[estilos.textoFuerte, { flex: 1 }]} numberOfLines={1}>
              {c.cliente_nombre}
            </Text>
            <EtiquetaEstado estado={estadoVisible(c)} />
          </View>
          <Text style={estilos.textoSuave}>
            {c.montaje_nombre} · {c.cantidad_personas} personas
          </Text>
          {c.estado === "bloqueado" && c.bloqueo_hasta ? (
            <Text style={estilos.textoSuave}>Bloqueado hasta el {momentoLegible(c.bloqueo_hasta)}</Text>
          ) : null}
        </Tarjeta>
      ))}
    </View>
  );
}

export default function PantallaDiasDelSalon() {
  return (
    <RequiereRol rol="administrador">
      <DiasDelSalon />
    </RequiereRol>
  );
}
