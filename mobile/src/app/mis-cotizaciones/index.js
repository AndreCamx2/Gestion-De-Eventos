import { useMemo } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Text } from "../../componentes/Texto";
import { router } from "expo-router";
import { listarMisCotizaciones } from "../../compartido/api/misCotizaciones";
import { pesos } from "../../compartido/pages/cotizaciones/cotizaciones";
import { estadoCliente, etiquetaCliente, fechaNumerica, separarPorFecha, tipoDeError } from "../../compartido/pages/misCotizaciones/misCotizaciones";
import { hoyLocal } from "../../compartido/utils/inicioCifras";
import { Seccion } from "../../componentes/formulario";
import { Cabecera, Aviso, Cargando, EtiquetaEstado, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import { useCarga } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";

async function cargar() {
  try {
    return { lista: await listarMisCotizaciones() };
  } catch (e) {
    // Un usuario cliente sin ficha de cliente: el API lo dice con un 403 propio.
    if (tipoDeError(e) === "sinVincular") return { lista: [], sinVincular: true };
    throw e;
  }
}

function MisCotizaciones() {
  const { datos, error, cargando, recargando, recargar } = useCarga(cargar);
  const grupos = useMemo(() => {
    const { proximos, realizados } = separarPorFecha(datos?.lista ?? [], hoyLocal());
    return [
      { titulo: "Próximos eventos", lista: proximos },
      { titulo: "Eventos pasados", lista: realizados },
    ];
  }, [datos]);

  if (cargando) return <Cargando texto="Cargando tus cotizaciones…" />;

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} />}
    >
      <Cabecera antetitulo="Cliente" titulo="Mis cotizaciones" subtitulo="Las propuestas que te ha enviado tu asesor y el estado de cada evento." />
      <Aviso texto={error} />
      {datos?.sinVincular ? <Aviso texto="Tu usuario todavía no está vinculado a una ficha de cliente. Comunícate con tu asesor." /> : null}
      {datos && !datos.lista.length && !datos.sinVincular ? (
        <Vacio titulo="Sin cotizaciones" texto="Todavía no tienes cotizaciones. Tu asesor te las enviará por aquí." />
      ) : null}
      {grupos.map((g) =>
        g.lista.length ? (
          <Seccion key={g.titulo} titulo={g.titulo}>
            {g.lista.map((c) => (
              <Tarjeta
                key={c.id}
                accessibilityLabel={`Evento en ${c.salon_nombre}`}
                onPress={() => router.push({ pathname: "/mis-cotizaciones/[id]", params: { id: c.id } })}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Text style={[estilos.textoFuerte, { flex: 1 }]}>
                    {c.salon_nombre} · {c.sitio_nombre}
                  </Text>
                  <EtiquetaEstado estado={estadoCliente(c)} etiqueta={etiquetaCliente(c)} />
                </View>
                <Text style={estilos.textoSuave}>
                  {fechaNumerica(c.fecha_evento)} · {c.cantidad_personas} personas
                </Text>
                <Text style={estilos.textoFuerte}>{pesos(Number(c.total))}</Text>
              </Tarjeta>
            ))}
          </Seccion>
        ) : null,
      )}
    </ScrollView>
  );
}

export default function PantallaMisCotizaciones() {
  return (
    <RequiereRol rol="cliente">
      <MisCotizaciones />
    </RequiereRol>
  );
}
