import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "../componentes/Texto";
import { router } from "expo-router";
import { obtenerCalendario } from "../compartido/api/calendario";
import { listarSalones } from "../compartido/api/salones";
import {
  ENCABEZADOS,
  agruparPorDia,
  claveMes,
  diaYMes,
  diasDelMes,
  estadosDelDia,
  etiquetaDia,
  notaCotizacion,
  primerDia,
  sumarMeses,
  tituloMes,
} from "../compartido/pages/calendario/calendario";
import { fechaISO, hoyLocal } from "../compartido/utils/inicioCifras";
import { Selector } from "../componentes/formulario";
import { Cabecera, Aviso, Boton, Cargando, EtiquetaEstado, Tarjeta, Vacio, estilos } from "../componentes/ui";
import { useCarga } from "../componentes/useCarga";
import RequiereRol from "../sesion/RequiereRol";
import { colores, espacio } from "../tema";
import { ESTADOS } from "../utils/estados";

function Calendario() {
  const hoy = useMemo(hoyLocal, []);
  const hoyTexto = fechaISO(hoy);
  const [mes, setMes] = useState(claveMes(hoy));
  const [elegido, setElegido] = useState(hoyTexto);
  const [salonFiltro, setSalonFiltro] = useState("");
  const dias = useMemo(() => diasDelMes(mes), [mes]);

  const { datos, error, cargando, recargando, recargar } = useCarga(async () => {
    const [salones, eventos] = await Promise.all([
      listarSalones(),
      obtenerCalendario({ desde: fechaISO(dias[0]), hasta: fechaISO(dias[dias.length - 1]) }),
    ]);
    return { salones, eventos };
  }, [dias]);

  const porDia = useMemo(() => {
    if (!datos) return {};
    const ids = new Set(datos.salones.filter((s) => !salonFiltro || s.id === Number(salonFiltro)).map((s) => s.id));
    return agruparPorDia(datos.eventos, ids);
  }, [datos, salonFiltro]);
  const delDia = porDia[elegido] ?? [];

  function mover(cantidad) {
    const nuevo = sumarMeses(mes, cantidad);
    setMes(nuevo);
    setElegido(claveMes(hoy) === nuevo ? hoyTexto : fechaISO(primerDia(nuevo)));
  }

  if (cargando) return <Cargando texto="Cargando el calendario…" />;

  const mesDe = primerDia(mes).getMonth();
  const fechaElegida = dias.find((d) => fechaISO(d) === elegido) ?? primerDia(mes);

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} />}
    >
      <Cabecera antetitulo="Disponibilidad" titulo={tituloMes(mes)} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
        <Boton titulo="‹" variante="secundario" onPress={() => mover(-1)} />
        <View style={{ flex: 1 }}>
          <Boton
            titulo="Hoy"
            variante="secundario"
            deshabilitado={mes === claveMes(hoy)}
            onPress={() => {
              setMes(claveMes(hoy));
              setElegido(hoyTexto);
            }}
          />
        </View>
        <Boton titulo="›" variante="secundario" onPress={() => mover(1)} />
      </View>
      {datos ? (
        <Selector
          etiqueta="Salón"
          valor={salonFiltro}
          conVacio="Todos los salones"
          opciones={datos.salones.map((s) => ({ valor: String(s.id), etiqueta: s.nombre, detalle: s.sitio_nombre }))}
          onCambiar={setSalonFiltro}
        />
      ) : null}
      <Aviso texto={error} />

      <View style={{ flexDirection: "row" }}>
        {ENCABEZADOS.map((e) => (
          <Text key={e} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colores.textoSuave }}>
            {e}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {dias.map((d) => {
          const clave = fechaISO(d);
          const lista = porDia[clave] ?? [];
          const estados = estadosDelDia(lista);
          const activo = clave === elegido;
          const fuera = d.getMonth() !== mesDe;
          return (
            <Pressable
              key={clave}
              accessibilityRole="button"
              accessibilityLabel={etiquetaDia(d, lista, clave === hoyTexto)}
              accessibilityState={{ selected: activo }}
              onPress={() => setElegido(clave)}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                padding: 2,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  backgroundColor: activo ? colores.tinta : colores.superficie,
                  borderWidth: clave === hoyTexto ? 2 : 1,
                  borderColor: clave === hoyTexto ? colores.mandarina : colores.linea,
                  opacity: fuera ? 0.45 : 1,
                }}
              >
                <Text style={{ fontWeight: "700", color: activo ? "#FFFFFF" : colores.texto }}>{d.getDate()}</Text>
                <View style={{ flexDirection: "row", gap: 2 }}>
                  {estados.map((e) => (
                    <View key={e} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ESTADOS[e]?.punto ?? colores.tinta }} />
                  ))}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[estilos.textoFuerte, { textTransform: "capitalize" }]}>{diaYMes(fechaElegida)}</Text>
      {delDia.length === 0 ? (
        <Vacio titulo="Día libre" texto="No hay cotizaciones para este día." />
      ) : (
        delDia.map((c) => {
          const nota = notaCotizacion(c);
          return (
            <Tarjeta
              key={c.id}
              accessibilityLabel={`Cotización de ${c.cliente_nombre}`}
              onPress={() => router.push({ pathname: "/cotizacion/[id]", params: { id: c.id } })}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={[estilos.textoFuerte, { flex: 1 }]} numberOfLines={1}>
                  {c.cliente_nombre}
                </Text>
                <EtiquetaEstado estado={nota.estado} />
              </View>
              <Text style={estilos.textoSuave}>
                {c.salon_nombre} · {c.montaje_nombre} · {c.cantidad_personas} personas
              </Text>
              {nota.texto ? <Text style={estilos.textoSuave}>{nota.texto}</Text> : null}
            </Tarjeta>
          );
        })
      )}
      <Boton titulo="Nueva cotización" variante="secundario" onPress={() => router.push("/cotizaciones/nueva")} />
    </ScrollView>
  );
}

export default function PantallaCalendario() {
  return (
    <RequiereRol rol="administrador">
      <Calendario />
    </RequiereRol>
  );
}
