import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { bloquear, liberar } from "../../api/disponibilidad";
import { pesos as pesosEnteros, numeroCotizacion } from "../../compartido/pages/cotizaciones/cotizaciones";
import { MAX_MOTIVO, montoRetenido, parsearPorcentaje, puedeCancelar } from "../../compartido/pages/cotizaciones/cancelacion";
import { fechaMinimaAplazamiento, puedeAplazar } from "../../compartido/pages/cotizaciones/aplazamiento";
import {
  TIPOS_GARANTIA,
  datosCliente,
  fechaDelEvento,
  idDeRuta,
  limitesVigencia,
  nombreGarantia,
  parsearMonto,
  porcentajeDelTotal,
  progreso,
  puedeAceptar,
  puedeAnular,
  puedeEditar,
  puedeExtender,
  resumenCancelacion,
  textoAforo,
  textoCreacion,
  textoGarantiaMinima,
} from "../../compartido/pages/cotizaciones/detalleCotizacion";
import { etiquetaMovimiento, momento, quien } from "../../compartido/pages/cotizaciones/historico";
import { nombreImpuesto, pesosDeCentavos, totalesLinea } from "../../compartido/pages/cotizaciones/nuevaCotizacion";
import { useDetalleCotizacion } from "../../compartido/pages/cotizaciones/useDetalleCotizacion";
import { AreaTexto, CampoFecha, Dato, Dialogo, Fila, Seccion, Selector } from "../../componentes/formulario";
import { Aviso, Boton, Campo, Cargando, EtiquetaEstado, Tarjeta, estilos } from "../../componentes/ui";
import { textoDeError } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { colores, espacio } from "../../tema";
import { diaLegible, momentoLegible, opcionesBloqueo } from "../../utils/fechas";
import { estadoVisible, puedeBloquear, puedeLiberar } from "../../utils/estados";

const sinEvento = { preventDefault() {} };

const ERRORES_CARGA = {
  noExiste: "Esta cotización no existe.",
  permiso: "Solo un administrador puede ver esta cotización.",
  sesion: "Tu sesión venció. Vuelve a entrar.",
};

// Bloquear y liberar: el panel que ya tenía la app (SGDE-15), ahora dentro del detalle completo.
function PanelBloqueo({ c, alCambiar }) {
  const [enviando, setEnviando] = useState(null);
  const [error, setError] = useState(null);
  const [confirmarLiberar, setConfirmarLiberar] = useState(false);

  async function ejecutar(clave, accion, mensaje) {
    setEnviando(clave);
    setError(null);
    try {
      alCambiar(await accion(), mensaje);
      setConfirmarLiberar(false);
    } catch (e) {
      setError(textoDeError(e));
    } finally {
      setEnviando(null);
    }
  }

  if (puedeBloquear(c)) {
    const opciones = opcionesBloqueo(c.fecha_evento);
    return (
      <Tarjeta>
        <Text style={estilos.textoFuerte}>Bloquear el salón</Text>
        <Text style={estilos.textoSuave}>Aparta el salón ese día mientras el cliente confirma. Si vence, vuelve a quedar cotizado.</Text>
        <Aviso texto={error} />
        {opciones.map((o) => (
          <Boton
            key={o.clave}
            titulo={`${o.etiqueta} (${o.detalle})`}
            variante="secundario"
            cargando={enviando === o.clave}
            deshabilitado={Boolean(enviando)}
            onPress={() => ejecutar(o.clave, () => bloquear(c.id, o.valor), `Salón bloqueado ${o.detalle}.`)}
          />
        ))}
      </Tarjeta>
    );
  }
  if (puedeLiberar(c)) {
    return (
      <Tarjeta>
        <Text style={estilos.textoFuerte}>Liberar el bloqueo</Text>
        <Text style={estilos.textoSuave}>La fecha queda libre y la cotización vuelve a “cotizado”.</Text>
        <Aviso texto={error} />
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
    );
  }
  return null;
}

function DetalleCotizacion() {
  const { id } = useLocalSearchParams();
  const d = useDetalleCotizacion(idDeRuta(id));
  const [dialogo, setDialogo] = useState(null); // "aceptar" | "vigencia"
  const [exito, setExito] = useState(null);
  const [recargando, setRecargando] = useState(false);
  const primeraVez = useRef(true);
  const c = d.cotizacion;

  // Al volver de "Editar", se recarga lo que haya cambiado.
  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        return;
      }
      d.cargar();
      d.cargarMovimientos();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [d.cargar, d.cargarMovimientos]),
  );

  useEffect(() => {
    if (d.recienConfirmada) {
      setDialogo(null);
      setExito("Evento confirmado: la garantía quedó registrada.");
    }
  }, [d.recienConfirmada]);
  useEffect(() => {
    if (d.vigenciaExtendida) {
      setDialogo(null);
      setExito("Vigencia actualizada.");
    }
  }, [d.vigenciaExtendida]);
  useEffect(() => {
    if (d.cancelacion.recienCancelada) setExito("El evento quedó cancelado.");
  }, [d.cancelacion.recienCancelada]);
  useEffect(() => {
    if (d.anulacion.recienAnulada) setExito("La cotización quedó anulada.");
  }, [d.anulacion.recienAnulada]);
  useEffect(() => {
    if (d.aplazamiento.recienAplazada && c) {
      setExito(`El evento pasó del ${diaLegible(d.aplazamiento.recienAplazada)} al ${diaLegible(c.fecha_evento)}.`);
    }
  }, [d.aplazamiento.recienAplazada, c]);

  async function refrescar() {
    setRecargando(true);
    await Promise.all([d.cargar(), d.cargarMovimientos()]);
    setRecargando(false);
  }

  if (d.cargando && !c) return <Cargando texto="Cargando cotización…" />;
  if (!c) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Aviso texto={ERRORES_CARGA[d.errorCarga] ?? "No pudimos cargar la cotización. Revisa tu conexión."} />
        <Boton titulo="Reintentar" variante="secundario" onPress={d.cargar} />
      </View>
    );
  }

  const cliente = datosCliente(c.cliente);
  const cancelada = resumenCancelacion(c);
  const minima = textoGarantiaMinima(c.garantia_minima);
  const montoAceptacion = parsearMonto(d.aceptacion.monto);
  const porcentaje = porcentajeDelTotal(montoAceptacion, c.total);
  const pct = parsearPorcentaje(d.cancelacion.form.penalizacion);
  const retenido = montoRetenido(c.total, pct);

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]}
      refreshControl={<RefreshControl refreshing={recargando} onRefresh={refrescar} />}
    >
      <Stack.Screen options={{ title: `Cotización ${numeroCotizacion(c.id)}` }} />

      <View style={{ gap: 6 }}>
        <EtiquetaEstado estado={estadoVisible(c)} />
        <Text style={estilos.titulo}>{c.cliente?.nombre}</Text>
        <Text style={estilos.textoSuave}>
          {cliente.principal} · {cliente.secundario}
        </Text>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colores.texto }}>{pesosEnteros(Number(c.total))}</Text>
        <Text style={estilos.textoSuave}>{textoCreacion(c)}</Text>
      </View>

      <Aviso tipo="exito" texto={exito} />

      <Tarjeta>
        {progreso(c).map((p) => (
          <Text key={p.clave} style={[estilos.textoSuave, p.hecho && { color: colores.exito, fontWeight: "700" }]}>
            {p.hecho ? "✓" : "○"} {p.texto}
          </Text>
        ))}
      </Tarjeta>

      <Seccion titulo="Evento">
        <Tarjeta>
          <Dato etiqueta="Fecha" valor={fechaDelEvento(c.fecha_evento)} />
          <Dato etiqueta="Salón y montaje" valor={`${c.salon?.nombre} · ${c.montaje?.nombre}`} />
          {c.sitio?.nombre ? <Text style={estilos.textoSuave}>{c.sitio.nombre}</Text> : null}
          <Dato etiqueta="Personas" valor={textoAforo(c)} />
          {c.tipo_evento ? (
            <Dato etiqueta="Tipo de evento" valor={[c.grupo_evento?.nombre, c.tipo_evento.nombre].filter(Boolean).join(" · ")} />
          ) : null}
          {(c.estado === "cotizado" || c.estado === "bloqueado") && c.validez_oferta ? (
            <Dato etiqueta="Oferta válida hasta" valor={`${diaLegible(c.validez_oferta)}${c.vencida ? " (vencida)" : ""}`} />
          ) : null}
          {c.estado === "bloqueado" && c.bloqueo_hasta ? (
            <Dato etiqueta="Bloqueado hasta" valor={momentoLegible(c.bloqueo_hasta)} />
          ) : null}
          {c.garantia ? (
            <Dato
              etiqueta="Garantía"
              valor={`${pesosEnteros(Number(c.garantia.monto))} por ${nombreGarantia(c.garantia.tipo)}${
                c.garantia.registrada_por ? ` · registró ${c.garantia.registrada_por}` : ""
              }`}
            />
          ) : null}
        </Tarjeta>
      </Seccion>

      {cancelada ? (
        <Seccion titulo={cancelada.anulada ? "Anulación" : "Cancelación"}>
          <Tarjeta>
            <Text style={estilos.textoFuerte}>
              {cancelada.anulada ? "Anulada" : "Cancelada"}
              {cancelada.dia ? ` el ${cancelada.dia}` : ""}
              {cancelada.por ? ` por ${cancelada.por}` : ""}
            </Text>
            {cancelada.penalizacion != null ? (
              <Text style={estilos.textoSuave}>
                Penalización {cancelada.penalizacion} % · retenido {pesosEnteros(Number(cancelada.retenido ?? 0))}
              </Text>
            ) : null}
            {cancelada.motivo ? <Text style={estilos.textoSuave}>Motivo: {cancelada.motivo}</Text> : null}
          </Tarjeta>
        </Seccion>
      ) : null}

      <Seccion titulo="Conceptos">
        <Tarjeta>
          {(c.items ?? []).map((it, i) => (
            <View key={it.id ?? i} style={{ gap: 2, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colores.linea }}>
              <Fila
                izquierda={it.concepto_nombre}
                derecha={pesosDeCentavos(totalesLinea(it.cantidad, it.precio_unitario, it.impuesto_pct).total)}
                fuerte
              />
              <Text style={estilos.textoSuave}>
                {it.cantidad} × {pesosEnteros(Number(it.precio_unitario))} · {nombreImpuesto(it.impuesto_pct)}
              </Text>
            </View>
          ))}
          <Fila izquierda="Subtotal" derecha={pesosEnteros(Number(c.subtotal))} />
          <Fila izquierda="Impuestos" derecha={pesosEnteros(Number(c.impuestos))} />
          <Fila izquierda="Total" derecha={pesosEnteros(Number(c.total))} fuerte />
          {minima && puedeAceptar(c) ? <Text style={estilos.textoSuave}>{minima}</Text> : null}
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Acciones">
        <PanelBloqueo
          c={c}
          alCambiar={(actualizada, mensaje) => {
            d.reemplazar(actualizada);
            setExito(mensaje);
          }}
        />
        {puedeAceptar(c) ? <Boton titulo="Registrar garantía y confirmar" onPress={() => setDialogo("aceptar")} /> : null}
        {puedeExtender(c) ? <Boton titulo="Cambiar vigencia" variante="secundario" onPress={() => setDialogo("vigencia")} /> : null}
        {puedeEditar(c) ? (
          <Boton
            titulo="Editar cotización"
            variante="secundario"
            onPress={() => router.push({ pathname: "/cotizaciones/nueva", params: { editar: c.id } })}
          />
        ) : null}
        {puedeAplazar(c) ? <Boton titulo="Aplazar fecha" variante="secundario" onPress={d.aplazamiento.abrir} /> : null}
        {puedeAnular(c) ? <Boton titulo="Anular cotización" variante="peligro" onPress={d.anulacion.abrir} /> : null}
        {puedeCancelar(c) ? <Boton titulo="Cancelar evento" variante="peligro" onPress={d.cancelacion.abrir} /> : null}
        {c.estado === "cotizado" && c.vencida ? (
          <Text style={estilos.textoSuave}>La oferta venció: cambia la vigencia para poder bloquear o confirmar.</Text>
        ) : null}
      </Seccion>

      <Seccion titulo="Movimientos">
        {d.cargandoMovimientos && d.movimientos.length === 0 ? (
          <Text style={estilos.textoSuave}>Cargando movimientos…</Text>
        ) : d.errorMovimientos ? (
          <>
            <Aviso texto="No pudimos cargar los movimientos." />
            <Boton titulo="Reintentar" variante="secundario" onPress={d.cargarMovimientos} />
          </>
        ) : d.movimientos.length === 0 ? (
          <Text style={estilos.textoSuave}>Esta cotización todavía no tiene movimientos.</Text>
        ) : (
          <Tarjeta>
            {d.movimientos.map((m) => (
              <View key={m.id} style={{ gap: 2, borderLeftWidth: 3, borderLeftColor: colores.tinta, paddingLeft: espacio.m }}>
                <Text style={estilos.textoFuerte}>{etiquetaMovimiento(m.tipo)}</Text>
                {m.detalle ? <Text style={estilos.textoSuave}>{m.detalle}</Text> : null}
                <Text style={[estilos.textoSuave, { fontSize: 12 }]}>
                  {quien(m.usuario)} · {momento(m.fecha)}
                </Text>
              </View>
            ))}
          </Tarjeta>
        )}
      </Seccion>

      {/* Registrar garantía (aceptación) */}
      <Dialogo visible={dialogo === "aceptar"} titulo="Registrar garantía" onCerrar={() => setDialogo(null)}>
        {minima ? <Text style={estilos.subtitulo}>{minima}</Text> : null}
        <Aviso texto={d.errorAceptacion?.texto} />
        <Selector
          etiqueta="Cómo dejó la garantía"
          valor={d.aceptacion.tipo}
          opciones={TIPOS_GARANTIA.map((t) => ({ valor: t.valor, etiqueta: t.texto }))}
          onCambiar={(v) => d.cambiarAceptacion("tipo", v)}
          error={d.errorAceptacion?.campos?.tipo}
        />
        <Campo
          etiqueta="Monto recibido"
          value={d.aceptacion.monto}
          onChangeText={(v) => d.cambiarAceptacion("monto", v)}
          keyboardType="decimal-pad"
          placeholder="3.220.000"
          error={d.errorAceptacion?.campos?.monto}
        />
        {porcentaje != null ? <Text style={estilos.textoSuave}>Es el {porcentaje} % del total.</Text> : null}
        <Boton titulo="Confirmar el evento" cargando={d.aceptando} onPress={() => d.aceptar(sinEvento)} />
      </Dialogo>

      {/* Vigencia */}
      <Dialogo visible={dialogo === "vigencia"} titulo="Cambiar vigencia" onCerrar={() => setDialogo(null)}>
        <Text style={estilos.subtitulo}>
          Entre {limitesVigencia(c).min} y {limitesVigencia(c).max} (el día del evento).
        </Text>
        <CampoFecha
          etiqueta="Nueva vigencia"
          value={d.nuevaVigencia}
          onChangeText={d.cambiarVigencia}
          error={d.errorVigencia?.texto}
        />
        <Boton titulo="Guardar vigencia" cargando={d.extendiendo} onPress={() => d.extender(sinEvento)} />
      </Dialogo>

      {/* Aplazar */}
      <Dialogo visible={d.aplazamiento.abierta} titulo="Aplazar fecha" onCerrar={d.aplazamiento.cerrar}>
        <Text style={estilos.subtitulo}>El evento pasa a otra fecha en la que el salón esté libre. Queda en el historial.</Text>
        <Aviso texto={d.aplazamiento.conflicto || d.aplazamiento.error} />
        <CampoFecha
          etiqueta={`Fecha nueva (desde ${fechaMinimaAplazamiento(c)})`}
          value={d.aplazamiento.form.fecha}
          onChangeText={(v) => d.aplazamiento.cambiar("fecha", v)}
          error={d.aplazamiento.errores.fecha_evento}
        />
        <AreaTexto
          etiqueta="Motivo"
          value={d.aplazamiento.form.motivo}
          onChangeText={(v) => d.aplazamiento.cambiar("motivo", v)}
          maxLength={MAX_MOTIVO}
          error={d.aplazamiento.errores.motivo}
        />
        {d.aplazamiento.conflicto ? (
          <Boton titulo="Cerrar y recargar" variante="secundario" onPress={d.aplazamiento.cerrar} />
        ) : (
          <Boton titulo="Aplazar" cargando={d.aplazamiento.guardando} onPress={() => d.aplazamiento.enviar(sinEvento)} />
        )}
      </Dialogo>

      {/* Anular */}
      <Dialogo visible={d.anulacion.abierta} titulo="Anular cotización" onCerrar={d.anulacion.cerrar}>
        <Text style={estilos.subtitulo}>La cotización queda cancelada sin penalización y suelta la fecha.</Text>
        <Aviso texto={d.anulacion.conflicto || d.anulacion.error} />
        <AreaTexto
          etiqueta="Motivo"
          value={d.anulacion.motivo}
          onChangeText={d.anulacion.cambiar}
          maxLength={MAX_MOTIVO}
          error={d.anulacion.errorMotivo}
        />
        {d.anulacion.conflicto ? (
          <Boton titulo="Cerrar y recargar" variante="secundario" onPress={d.anulacion.cerrar} />
        ) : (
          <Boton
            titulo="Anular cotización"
            variante="peligro"
            cargando={d.anulacion.guardando}
            onPress={() => d.anulacion.enviar(sinEvento)}
          />
        )}
      </Dialogo>

      {/* Cancelar evento confirmado */}
      <Dialogo visible={d.cancelacion.abierta} titulo="Cancelar evento" onCerrar={d.cancelacion.cerrar}>
        <Text style={estilos.subtitulo}>El evento queda cancelado. La penalización es el porcentaje del total que se retiene.</Text>
        <Aviso texto={d.cancelacion.conflicto || d.cancelacion.error} />
        <Campo
          etiqueta="Penalización (%)"
          value={d.cancelacion.form.penalizacion}
          onChangeText={(v) => d.cancelacion.cambiar("penalizacion", v)}
          keyboardType="decimal-pad"
          placeholder="0"
          error={d.cancelacion.errores.penalizacion_pct}
        />
        <AreaTexto
          etiqueta="Motivo"
          value={d.cancelacion.form.motivo}
          onChangeText={(v) => d.cancelacion.cambiar("motivo", v)}
          maxLength={MAX_MOTIVO}
          error={d.cancelacion.errores.motivo}
        />
        {retenido != null ? (
          <Text style={estilos.textoSuave}>
            Se retienen {pesosEnteros(retenido)} de {pesosEnteros(Number(c.total))}.
          </Text>
        ) : null}
        {d.cancelacion.conflicto ? (
          <Boton titulo="Cerrar y recargar" variante="secundario" onPress={d.cancelacion.cerrar} />
        ) : (
          <Boton
            titulo="Cancelar evento"
            variante="peligro"
            cargando={d.cancelacion.guardando}
            onPress={() => d.cancelacion.enviar(sinEvento)}
          />
        )}
      </Dialogo>
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
