import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { bloquear, liberar, obtenerCotizacion } from "../../api/disponibilidad";
import { Aviso, Boton, Cargando, EtiquetaEstado, Tarjeta, estilos } from "../../componentes/ui";
import RequiereRol from "../../sesion/RequiereRol";
import { diaLegible, momentoLegible, opcionesBloqueo } from "../../utils/fechas";
import { estadoVisible, puedeBloquear, puedeLiberar } from "../../utils/estados";
import { mensajeDeError } from "../../utils/errores";
import { pesos } from "../../utils/formato";

function Dato({ etiqueta, valor }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text style={estilos.textoFuerte}>{valor}</Text>
    </View>
  );
}

function DetalleCotizacion() {
  const { id } = useLocalSearchParams();
  const [cotizacion, setCotizacion] = useState(null);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [enviando, setEnviando] = useState(null); // clave de la acción en curso
  const [confirmarLiberar, setConfirmarLiberar] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCotizacion(await obtenerCotizacion(id));
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e).general);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // Ejecuta bloquear o liberar. El 409 (fecha ocupada, ya no está cotizada...) y
  // el 400 (hora inválida) llegan con su mensaje y se muestran tal cual.
  async function ejecutar(clave, accion, mensajeExito) {
    setEnviando(clave);
    setError(null);
    setExito(null);
    try {
      setCotizacion(await accion());
      setExito(mensajeExito);
      setConfirmarLiberar(false);
    } catch (e) {
      const { general, campos } = mensajeDeError(e);
      setError(general || Object.values(campos).join(" "));
      await cargar(); // por si el estado cambió en el servidor
    } finally {
      setEnviando(null);
    }
  }

  if (cotizacion === null && !error) return <Cargando texto="Cargando cotización…" />;
  if (cotizacion === null) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Aviso texto={error} />
        <Boton titulo="Reintentar" variante="secundario" onPress={cargar} />
      </View>
    );
  }

  const c = cotizacion;
  const opciones = puedeBloquear(c) ? opcionesBloqueo(c.fecha_evento) : [];

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
      <View style={{ gap: 6 }}>
        <Text style={estilos.antetitulo}>Cotización #{c.id}</Text>
        <Text style={estilos.titulo}>{c.cliente?.nombre}</Text>
        <EtiquetaEstado estado={estadoVisible(c)} />
      </View>

      <Aviso texto={error} />
      <Aviso texto={exito} tipo="exito" />

      <Tarjeta>
        <Dato etiqueta="Salón y montaje" valor={`${c.salon?.nombre} · ${c.montaje?.nombre}`} />
        <Dato etiqueta="Fecha del evento" valor={diaLegible(c.fecha_evento)} />
        <Dato etiqueta="Personas" valor={`${c.cantidad_personas}${c.aforo ? ` de ${c.aforo} de aforo` : ""}`} />
        <Dato etiqueta="Total" valor={pesos(c.total)} />
        {c.validez_oferta ? <Dato etiqueta="Oferta válida hasta" valor={diaLegible(c.validez_oferta)} /> : null}
        {c.estado === "bloqueado" && c.bloqueo_hasta ? (
          <Dato etiqueta="Bloqueado hasta" valor={momentoLegible(c.bloqueo_hasta)} />
        ) : null}
      </Tarjeta>

      {puedeBloquear(c) ? (
        <Tarjeta>
          <Text style={estilos.textoFuerte}>Bloquear el salón</Text>
          <Text style={estilos.textoSuave}>
            Aparta el salón ese día mientras el cliente confirma. Si vence, vuelve a quedar cotizado.
          </Text>
          {opciones.map((o) => (
            <Boton
              key={o.clave}
              titulo={`${o.etiqueta} (${o.detalle})`}
              variante="secundario"
              cargando={enviando === o.clave}
              deshabilitado={Boolean(enviando)}
              onPress={() => ejecutar(o.clave, () => bloquear(c.id, o.valor), `Salón bloqueado ${o.detalle}`)}
            />
          ))}
        </Tarjeta>
      ) : null}

      {puedeLiberar(c) ? (
        <Tarjeta>
          <Text style={estilos.textoFuerte}>Liberar el bloqueo</Text>
          <Text style={estilos.textoSuave}>La fecha queda libre y la cotización vuelve a “cotizado”.</Text>
          {confirmarLiberar ? (
            <View style={{ gap: 8 }}>
              <Text style={estilos.textoFuerte}>¿Seguro que quieres liberar el salón?</Text>
              <Boton
                titulo="Sí, liberar"
                variante="peligro"
                cargando={enviando === "liberar"}
                onPress={() => ejecutar("liberar", () => liberar(c.id), "Bloqueo liberado.")}
              />
              <Boton titulo="Cancelar" variante="secundario" onPress={() => setConfirmarLiberar(false)} />
            </View>
          ) : (
            <Boton titulo="Liberar bloqueo" variante="peligro" onPress={() => setConfirmarLiberar(true)} />
          )}
        </Tarjeta>
      ) : null}

      {c.estado === "cotizado" && c.vencida ? (
        <Text style={estilos.textoSuave}>La oferta venció: extiende su vigencia desde la web para poder bloquear.</Text>
      ) : null}
      {c.estado === "confirmado" ? (
        <Text style={estilos.textoSuave}>Evento confirmado: el salón ya está reservado ese día.</Text>
      ) : null}
    </ScrollView>
  );
}

export default function PantallaCotizacion() {
  return (
    <RequiereRol rol="administrador">
      <DetalleCotizacion />
    </RequiereRol>
  );
}
