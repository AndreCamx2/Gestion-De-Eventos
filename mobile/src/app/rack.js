import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "../componentes/Texto";
import { router } from "expo-router";
import { obtenerCalendario } from "../compartido/api/calendario";
import { listarSalones } from "../compartido/api/salones";
import { fechaCorta } from "../compartido/pages/cotizaciones/cotizaciones";
import {
  ABREVIATURAS,
  DIAS_POR_PAGINA,
  armarRejilla,
  encabezadoDia,
  esFinDeSemana,
  etiquetaCelda,
  rangoDeDias,
} from "../compartido/pages/rack/rack";
import { fechaISO, hoyLocal, sumarDias } from "../compartido/utils/inicioCifras";
import { Cabecera, Aviso, Boton, Cargando, estilos } from "../componentes/ui";
import { useCarga } from "../componentes/useCarga";
import RequiereRol from "../sesion/RequiereRol";
import { colores, espacio } from "../tema";
import { ESTADOS } from "../utils/estados";

const ANCHO_SALON = 120;
const ANCHO_DIA = 52;

function Rack() {
  const [inicio, setInicio] = useState(hoyLocal);
  const dias = useMemo(() => rangoDeDias(inicio), [inicio]);

  const { datos, error, cargando, recargando, recargar } = useCarga(async () => {
    const [salones, eventos] = await Promise.all([
      listarSalones(),
      obtenerCalendario({ desde: fechaISO(dias[0]), hasta: fechaISO(dias[dias.length - 1]) }),
    ]);
    // Los días van con los datos: al cambiar de quincena se sigue pintando la anterior
    // hasta que llega la nueva, sin mezclar días nuevos con una rejilla vieja.
    return { salones, dias, rejilla: armarRejilla(salones, eventos, dias) };
  }, [dias]);

  function abrir(celda) {
    const ocupa = celda.cotizaciones.find((c) => c.estado !== "cancelado" && !(c.estado === "cotizado" && c.vencida));
    const destino = ocupa ?? celda.cotizaciones[0];
    if (destino) router.push({ pathname: "/cotizacion/[id]", params: { id: destino.id } });
  }

  if (cargando) return <Cargando texto="Cargando el rack…" />;

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} />}
    >
      <Cabecera antetitulo="Disponibilidad" titulo="Rack de salones" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
        <Boton titulo="‹" variante="secundario" onPress={() => setInicio((d) => sumarDias(d, -DIAS_POR_PAGINA))} />
        <Text style={[estilos.textoFuerte, { flex: 1, textAlign: "center" }]}>
          {fechaCorta(fechaISO(dias[0]), false)} – {fechaCorta(fechaISO(dias[dias.length - 1]), false)}
        </Text>
        <Boton titulo="›" variante="secundario" onPress={() => setInicio((d) => sumarDias(d, DIAS_POR_PAGINA))} />
      </View>
      <Aviso texto={error} />

      {datos ? (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: ANCHO_SALON, fontWeight: "700", color: colores.textoSuave }}>Salón</Text>
              {datos.dias.map((d) => {
                const e = encabezadoDia(d);
                return (
                  <View key={fechaISO(d)} style={{ width: ANCHO_DIA, alignItems: "center", opacity: esFinDeSemana(d) ? 0.7 : 1 }}>
                    <Text style={{ fontSize: 11, color: colores.textoSuave }}>{e.semana}</Text>
                    <Text style={{ fontWeight: "700", color: colores.texto }}>{e.numero}</Text>
                  </View>
                );
              })}
            </View>
            {datos.salones.map((s) => (
              <View key={s.id} style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <Text style={{ width: ANCHO_SALON, fontWeight: "600", color: colores.texto }} numberOfLines={2}>
                  {s.nombre}
                </Text>
                {datos.dias.map((d) => {
                  const celda = datos.rejilla[s.id][fechaISO(d)];
                  const color = ESTADOS[celda.estado];
                  return (
                    <Pressable
                      key={fechaISO(d)}
                      accessibilityRole="button"
                      accessibilityLabel={etiquetaCelda(s.nombre, d, celda)}
                      onPress={() => abrir(celda)}
                      style={{
                        width: ANCHO_DIA - 4,
                        height: 40,
                        marginHorizontal: 2,
                        borderRadius: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: color ? color.fondo : colores.superficie,
                        borderWidth: 1,
                        borderColor: color ? color.punto : colores.linea,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: color ? color.texto : colores.textoTenue }}>
                        {ABREVIATURAS[celda.estado] ?? ""}
                        {celda.cantidad > 1 ? ` ${celda.cantidad}` : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : null}
      <Text style={estilos.textoSuave}>Toca una celda ocupada para abrir la cotización. Desliza a los lados para ver los 14 días.</Text>
    </ScrollView>
  );
}

export default function PantallaRack() {
  return (
    <RequiereRol rol="administrador">
      <Rack />
    </RequiereRol>
  );
}
