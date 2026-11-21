import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { getMiCotizacion } from "../../compartido/api/misCotizaciones";
import { numeroCotizacion, pesos } from "../../compartido/pages/cotizaciones/cotizaciones";
import { fechaDelEvento, textoGarantiaMinima } from "../../compartido/pages/cotizaciones/detalleCotizacion";
import { nombreImpuesto } from "../../compartido/pages/cotizaciones/nuevaCotizacion";
import { avisoDeEstado, estadoCliente, etiquetaCliente } from "../../compartido/pages/misCotizaciones/misCotizaciones";
import { Dato, Fila, Seccion } from "../../componentes/formulario";
import { Aviso, Boton, Cargando, EtiquetaEstado, Tarjeta, estilos } from "../../componentes/ui";
import { useCarga } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { colores } from "../../tema";

function MiCotizacion() {
  const { id } = useLocalSearchParams();
  const { datos: c, error, cargando, recargando, recargar } = useCarga(() => getMiCotizacion(id), [id]);

  if (cargando) return <Cargando texto="Cargando tu cotización…" />;
  if (!c) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Aviso texto={error} />
        <Boton titulo="Reintentar" variante="secundario" onPress={recargar} />
      </View>
    );
  }

  const aviso = avisoDeEstado(c);
  const minima = textoGarantiaMinima(c.garantia_minima);
  const porConfirmar = c.estado === "cotizado" || c.estado === "bloqueado";

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]}
      refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} />}
    >
      <Stack.Screen options={{ title: `Cotización ${numeroCotizacion(c.id)}` }} />
      <View style={{ gap: 6 }}>
        <EtiquetaEstado estado={estadoCliente(c)} etiqueta={etiquetaCliente(c)} />
        <Text style={estilos.titulo}>{c.salon?.nombre}</Text>
        <Text style={estilos.textoSuave}>
          {c.sitio?.nombre} · {c.montaje?.nombre}
        </Text>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colores.texto }}>{pesos(Number(c.total))}</Text>
      </View>
      <Aviso tipo={aviso.tono === "vencida" || aviso.tono === "cancelado" ? "error" : "exito"} texto={aviso.texto} />

      <Seccion titulo="Tu evento">
        <Tarjeta>
          <Dato etiqueta="Fecha" valor={fechaDelEvento(c.fecha_evento)} />
          <Dato etiqueta="Personas" valor={String(c.cantidad_personas)} />
          {c.tipo_evento ? <Dato etiqueta="Tipo de evento" valor={c.tipo_evento.nombre} /> : null}
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Detalle">
        <Tarjeta>
          {(c.items ?? []).map((it, i) => (
            <View key={it.id ?? i} style={{ gap: 2 }}>
              <Text style={estilos.textoFuerte}>{it.concepto_nombre}</Text>
              <Text style={estilos.textoSuave}>
                {it.cantidad} × {pesos(Number(it.precio_unitario))} · {nombreImpuesto(it.impuesto_pct)}
              </Text>
            </View>
          ))}
          <Fila izquierda="Subtotal" derecha={pesos(Number(c.subtotal))} />
          <Fila izquierda="Impuestos" derecha={pesos(Number(c.impuestos))} />
          <Fila izquierda="Total" derecha={pesos(Number(c.total))} fuerte />
        </Tarjeta>
        {minima && porConfirmar ? (
          <Text style={estilos.textoSuave}>Para confirmar el evento: {minima} Comunícate con tu asesor para pagarla.</Text>
        ) : null}
      </Seccion>
    </ScrollView>
  );
}

export default function PantallaMiCotizacion() {
  return (
    <RequiereRol rol="cliente">
      <MiCotizacion />
    </RequiereRol>
  );
}
