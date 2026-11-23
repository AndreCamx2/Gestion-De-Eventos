import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../componentes/Texto";
import { router } from "expo-router";
import { obtenerCalendario } from "../compartido/api/calendario";
import { getCotizaciones } from "../compartido/api/cotizaciones";
import { listarMiStock } from "../compartido/api/proveedores";
import { listarSalones } from "../compartido/api/salones";
import { DIAS_VENTANA, MAX_AGENDA, plural, resumenInventario } from "../compartido/pages/inicio/inicio";
import { fechaActualizado } from "../compartido/pages/proveedores/proveedores";
import {
  armarAgenda,
  confirmadosDelMes,
  dineroAbreviado,
  fechaISO,
  fechaLarga,
  hoyLocal,
  mesCorto,
  nombreMes,
  numero,
  ocupacionPorSalon,
  resumenPorConfirmar,
  saludoPorHora,
  sumarDias,
  tasaDeCierre,
} from "../compartido/utils/inicioCifras";
import { nombreVisible } from "../compartido/utils/nombreUsuario";
import { Aviso, Boton, EtiquetaEstado, Tarjeta, Vacio, estilos } from "../componentes/ui";
import { useCarga } from "../componentes/useCarga";
import RequiereRol from "../sesion/RequiereRol";
import { rolDe, useSesion } from "../sesion/Sesion";
import { colores, espacio, radio, texto } from "../tema";
import { ESTADOS } from "../utils/estados";
import iconoNueva from "../../assets/iconos/nueva.png";
import iconoCheck from "../../assets/iconos/check.png";
import iconoTendencia from "../../assets/iconos/tendencia.png";

// Home.jsx de la web en el teléfono (maqueta Movil.dc.html).

// Cada bloque se carga por su lado: si uno falla, los demás se ven igual (como la web).
async function bloque(promesa) {
  try {
    return { datos: await promesa };
  } catch (e) {
    return { error: e?.body?.codigo === "proveedor_sin_vincular" ? "sinVincular" : e?.status === 403 ? "permiso" : "servidor" };
  }
}

async function cargarInicio(rol) {
  const hoy = hoyLocal();
  if (rol === "administrador") {
    const [cotizaciones, calendario, salones] = await Promise.all([
      bloque(getCotizaciones()),
      bloque(obtenerCalendario({ desde: fechaISO(hoy), hasta: fechaISO(sumarDias(hoy, DIAS_VENTANA - 1)) })),
      bloque(listarSalones()),
    ]);
    return { hoy, cotizaciones, calendario, salones };
  }
  if (rol === "proveedor") return { hoy, stock: await bloque(listarMiStock()) };
  return { hoy };
}

function Saludo({ hoy, titulo }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={propios.fecha}>{fechaLarga(hoy)}</Text>
      <Text style={propios.saludo} accessibilityRole="header">
        {titulo}
      </Text>
    </View>
  );
}

function textoVencen(cantidad) {
  if (cantidad === 0) return "Ninguna vence esta semana";
  return cantidad === 1 ? "1 vence esta semana" : `${numero(cantidad)} vencen esta semana`;
}

function textoVence(dias) {
  if (dias === 0) return "la oferta vence hoy";
  if (dias === 1) return "la oferta vence mañana";
  return `la oferta vence en ${dias} días`;
}

const ETIQUETAS_CONTEO = {
  confirmado: ["confirmado", "confirmados"],
  bloqueado: ["bloqueado", "bloqueados"],
  cotizado: ["cotizado", "cotizados"],
  vencida: ["vencida", "vencidas"],
};

function SinDatos({ children }) {
  return <Text style={[estilos.textoSuave, { fontSize: texto.etiqueta }]}>{children}</Text>;
}

function InicioAdministrador({ datos, nombre }) {
  const { hoy, cotizaciones, calendario, salones } = datos;
  const resumen = cotizaciones.datos ? resumenPorConfirmar(cotizaciones.datos, hoy) : null;
  const agenda = calendario.datos ? armarAgenda(calendario.datos, hoy) : [];
  const visibles = agenda.slice(0, MAX_AGENDA);
  const restantes = agenda.length - visibles.length;
  const conteos = Object.keys(ETIQUETAS_CONTEO)
    .map((estado) => ({ estado, cantidad: agenda.filter((e) => e.estadoVisible === estado).length }))
    .filter((c) => c.cantidad > 0);

  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const actual = cotizaciones.datos ? confirmadosDelMes(cotizaciones.datos, hoy) : 0;
  const anterior = cotizaciones.datos ? confirmadosDelMes(cotizaciones.datos, mesAnterior) : 0;
  const diferencia = actual - anterior;
  const comparacion =
    diferencia > 0 ? `+${numero(diferencia)} vs. ${mesCorto(mesAnterior)}.` : diferencia < 0 ? `−${numero(-diferencia)} vs. ${mesCorto(mesAnterior)}.` : `Igual que ${mesCorto(mesAnterior)}.`;
  const tonoComparacion = diferencia > 0 ? ESTADOS.confirmado : diferencia < 0 ? ESTADOS.vencida : { fondo: colores.campo, texto: colores.textoSuave };
  const tasa = cotizaciones.datos ? tasaDeCierre(cotizaciones.datos, hoy) : null;
  const filasOcupacion = calendario.datos && salones.datos ? ocupacionPorSalon(calendario.datos, salones.datos, DIAS_VENTANA) : [];

  return (
    <>
      <Saludo hoy={hoy} titulo={`${saludoPorHora(new Date().getHours())}, ${nombre}`} />

      {cotizaciones.error ? (
        <Tarjeta>
          <Aviso texto="No se pudieron cargar las cotizaciones. El resto del inicio sigue disponible." />
        </Tarjeta>
      ) : null}
      {resumen ? (
        <Pressable accessibilityRole="link" accessibilityLabel={`${resumen.cantidad} cotizaciones por confirmar`} onPress={() => router.navigate("/cotizaciones")} style={({ pressed }) => [propios.porConfirmar, pressed && { opacity: 0.92 }]}>
          <View>
            <Text style={propios.porConfirmarEtiqueta}>POR CONFIRMAR</Text>
            <Text style={propios.porConfirmarCifra}>{numero(resumen.cantidad)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[propios.porConfirmarDetalle, { fontWeight: "800" }]}>{dineroAbreviado(resumen.total)}</Text>
            <Text style={propios.porConfirmarDetalle}>{textoVencen(resumen.vencenSemana)}</Text>
          </View>
        </Pressable>
      ) : null}

      <Boton
        titulo="Nueva cotización"
        icono={<Image source={iconoNueva} style={{ width: 18, height: 18, tintColor: colores.sobreOscuro }} />}
        onPress={() => router.navigate("/cotizaciones/nueva")}
      />

      <Tarjeta style={{ gap: 0 }}>
        <View style={propios.bloqueCabecera}>
          <Text style={propios.bloqueTitulo}>Agenda de las próximas semanas</Text>
          {calendario.datos && agenda.length > 0 ? (
            <Text accessibilityRole="link" onPress={() => router.navigate("/calendario")} style={propios.enlace}>
              Ver todo
            </Text>
          ) : null}
        </View>
        {conteos.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: espacio.l }}>
            {conteos.map(({ estado, cantidad }) => (
              <View key={estado} style={[propios.conteo, { backgroundColor: ESTADOS[estado].fondo }]}>
                <Text style={{ fontSize: texto.pequeno, fontWeight: "700", color: ESTADOS[estado].texto }}>{plural(cantidad, ...ETIQUETAS_CONTEO[estado])}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {calendario.error ? <Aviso texto="No se pudo cargar la agenda. Revisa tu conexión y vuelve a intentarlo." /> : null}
        {calendario.datos && agenda.length === 0 ? (
          <Vacio titulo="Sin eventos en los próximos 30 días" texto="Cuando haya cotizaciones con fecha en este periodo, aparecerán aquí." />
        ) : null}
        {visibles.map((e) => (
          <Pressable
            key={e.id}
            accessibilityRole="link"
            accessibilityLabel={`${e.cliente_nombre}, ${e.fecha.getDate()} de ${nombreMes(e.fecha)}`}
            onPress={() => router.push({ pathname: "/cotizacion/[id]", params: { id: e.id } })}
            style={({ pressed }) => [propios.evento, pressed && { opacity: 0.7 }]}
          >
            <View style={propios.eventoFecha}>
              <Text style={propios.eventoDia}>{e.fecha.getDate()}</Text>
              <Text style={propios.eventoMes}>{mesCorto(e.fecha)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontSize: texto.cuerpo, fontWeight: "700", color: colores.texto }}>
                {e.cliente_nombre}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: texto.etiqueta, color: e.venceEn !== null ? colores.mandarinaTexto : colores.textoSuave }}>
                {e.salon_nombre} · {e.montaje_nombre} · {e.venceEn !== null ? textoVence(e.venceEn) : plural(e.cantidad_personas, "persona", "personas")}
              </Text>
            </View>
            <EtiquetaEstado estado={e.estadoVisible} />
          </Pressable>
        ))}
        {restantes > 0 ? (
          <Text style={[estilos.textoSuave, { marginTop: espacio.m, fontSize: texto.etiqueta }]}>
            Y {plural(restantes, "evento más", "eventos más")} en los próximos 30 días.
          </Text>
        ) : null}
      </Tarjeta>

      <Tarjeta style={propios.cifra}>
        <View style={[propios.cifraIcono, { backgroundColor: ESTADOS.confirmado.fondo }]}>
          <Image source={iconoCheck} style={{ width: 20, height: 20, tintColor: ESTADOS.confirmado.texto }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={propios.cifraTitulo}>Eventos confirmados de {nombreMes(hoy)}</Text>
          {cotizaciones.error ? <SinDatos>Sin datos: no se pudieron cargar las cotizaciones.</SinDatos> : null}
          {cotizaciones.datos ? (
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <Text style={propios.cifraValor}>{numero(actual)}</Text>
              <View style={[propios.comparacion, { backgroundColor: tonoComparacion.fondo }]}>
                <Text style={{ fontSize: texto.pequeno, fontWeight: "700", color: tonoComparacion.texto }}>{comparacion}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </Tarjeta>

      <Tarjeta style={propios.cifra}>
        <View style={[propios.cifraIcono, { backgroundColor: colores.durazno }]}>
          <Image source={iconoTendencia} style={{ width: 20, height: 20, tintColor: colores.mandarinaTexto }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={propios.cifraTitulo}>Tasa de cierre</Text>
          {cotizaciones.error ? <SinDatos>Sin datos: no se pudieron cargar las cotizaciones.</SinDatos> : null}
          {tasa ? (
            <>
              <Text style={propios.cifraValor}>{tasa.porcentaje === null ? "—" : `${tasa.porcentaje}%`}</Text>
              <Text style={[estilos.textoSuave, { fontSize: texto.etiqueta }]}>
                {tasa.porcentaje === null
                  ? `Ninguna cotización se ha resuelto en ${nombreMes(hoy)}.`
                  : `Confirmadas de ${plural(tasa.resueltas, "cotización resuelta", "cotizaciones resueltas")} en ${nombreMes(hoy)}.`}
              </Text>
            </>
          ) : null}
        </View>
      </Tarjeta>

      <Tarjeta>
        <Text style={propios.cifraTitulo}>Ocupación · 30 días</Text>
        {calendario.error ? <SinDatos>Sin datos: no se pudo cargar el calendario.</SinDatos> : null}
        {salones.error ? <Aviso texto="No se pudieron cargar los salones." /> : null}
        {calendario.datos && salones.datos && filasOcupacion.length === 0 ? (
          <Vacio
            titulo="Aún no hay salones"
            texto="Cuando registres salones, verás aquí cuántos días están ocupados."
            accion={<Boton titulo="Ir a Salones" variante="secundario" onPress={() => router.navigate("/salones")} />}
          />
        ) : null}
        {filasOcupacion.map((f, i) => (
          <View key={f.id} style={propios.ocupacionFila} accessibilityLabel={`${f.nombre}: ${f.porcentaje}%, ${numero(f.ocupados)} de ${DIAS_VENTANA} días con evento`}>
            <Text numberOfLines={1} style={{ width: 110, fontSize: texto.navegacion, fontWeight: "600", color: colores.texto }}>
              {f.nombre}
            </Text>
            <View style={propios.ocupacionBarra}>
              <View style={{ width: `${f.porcentaje}%`, height: 10, borderRadius: 5, backgroundColor: [colores.mandarina, colores.tinta, colores.mantequilla][i % 3] }} />
            </View>
            <Text style={{ width: 44, textAlign: "right", fontSize: texto.navegacion, color: colores.textoSuave }}>{f.porcentaje}%</Text>
          </View>
        ))}
      </Tarjeta>
    </>
  );
}

function InicioProveedor({ datos, nombre }) {
  const { hoy, stock } = datos;
  const irAMiStock = <Boton titulo="Ir a Mi stock" variante="secundario" onPress={() => router.navigate("/mi-stock")} />;
  let cuerpo;
  if (stock.error === "sinVincular") {
    cuerpo = <Vacio titulo="Tu usuario todavía no está vinculado a un proveedor" texto="Pídele al administrador que lo vincule." />;
  } else if (stock.error) {
    cuerpo = <Aviso texto="No pudimos hablar con el servidor. Inténtalo de nuevo." />;
  } else {
    const resumen = resumenInventario(stock.datos);
    cuerpo =
      resumen.total === 0 ? (
        <Vacio titulo="Aún no tienes elementos en tu stock" texto="Agrega el primero: qué ofreces, cuántos tienes y cuánto vale cada uno." accion={irAMiStock} />
      ) : (
        <>
          <Text style={propios.bloqueTitulo}>Tu inventario</Text>
          <View style={{ gap: espacio.l }}>
            {[
              ["Elementos", numero(resumen.total), null],
              ["Agotados", numero(resumen.agotados), resumen.agotados > 0 ? ESTADOS.vencida.texto : null],
              ["Última actualización", fechaActualizado(resumen.ultima), null],
            ].map(([etiqueta, valor, color]) => (
              <View key={etiqueta}>
                <Text style={estilos.etiqueta}>{etiqueta}</Text>
                <Text style={{ marginTop: 2, fontSize: 28, fontWeight: "800", letterSpacing: -0.8, color: color ?? colores.texto }}>{valor}</Text>
              </View>
            ))}
          </View>
          <View style={{ alignItems: "flex-end" }}>{irAMiStock}</View>
        </>
      );
  }
  return (
    <>
      <Saludo hoy={hoy} titulo={`Hola, ${nombre}.`} />
      <Tarjeta style={{ gap: espacio.l }}>{cuerpo}</Tarjeta>
    </>
  );
}

function InicioCliente({ datos, nombre }) {
  return (
    <>
      <Saludo hoy={datos.hoy} titulo={`Hola, ${nombre}.`} />
      <Tarjeta>
        <Vacio
          titulo="Tu cuenta está activa"
          texto="Consulta las propuestas que te ha enviado tu asesor y el estado de tus eventos."
          accion={<Boton titulo="Ver mis cotizaciones" onPress={() => router.navigate("/mis-cotizaciones")} />}
        />
      </Tarjeta>
    </>
  );
}

function Inicio() {
  const { usuario } = useSesion();
  const rol = rolDe(usuario);
  const nombre = nombreVisible(usuario);
  const { datos, error, cargando, recargando, recargar } = useCarga(() => cargarInicio(rol), [rol]);

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={[estilos.contenido, { gap: espacio.e5 }]} refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} />}>
      {cargando ? <Saludo hoy={hoyLocal()} titulo={rol === "administrador" ? `${saludoPorHora(new Date().getHours())}, ${nombre}` : `Hola, ${nombre}.`} /> : null}
      {cargando ? (
        <Tarjeta>
          <Text style={estilos.textoSuave}>Cargando el inicio…</Text>
        </Tarjeta>
      ) : null}
      {error ? (
        <Tarjeta>
          <Aviso texto={error} />
          <Boton titulo="Reintentar" variante="secundario" onPress={recargar} />
        </Tarjeta>
      ) : null}
      {datos && rol === "administrador" ? <InicioAdministrador datos={datos} nombre={nombre} /> : null}
      {datos && rol === "proveedor" ? <InicioProveedor datos={datos} nombre={nombre} /> : null}
      {datos && rol === "cliente" ? <InicioCliente datos={datos} nombre={nombre} /> : null}
    </ScrollView>
  );
}

export default function PantallaInicio() {
  return (
    <RequiereRol rol={["administrador", "cliente", "proveedor"]}>
      <Inicio />
    </RequiereRol>
  );
}

const propios = StyleSheet.create({
  fecha: { fontSize: texto.pequeno, fontWeight: "800", letterSpacing: 1.44, textTransform: "uppercase", color: colores.mandarinaTexto },
  saludo: { fontSize: 34, fontWeight: "800", lineHeight: 36, letterSpacing: -1.2, color: colores.texto },
  porConfirmar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: espacio.m,
    padding: espacio.e5,
    borderRadius: radio.tarjetaGrande,
    backgroundColor: colores.tinta,
  },
  porConfirmarEtiqueta: { fontSize: texto.pequeno, fontWeight: "800", letterSpacing: 0.72, color: colores.sobreOscuro },
  porConfirmarCifra: { marginTop: espacio.s, fontSize: 56, fontWeight: "800", lineHeight: 54, letterSpacing: -2.2, color: colores.sobreOscuro },
  porConfirmarDetalle: { fontSize: texto.etiqueta, fontWeight: "700", color: colores.sobreOscuro, textAlign: "right" },
  bloqueCabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.m, marginBottom: espacio.m },
  bloqueTitulo: { flex: 1, fontSize: 18, fontWeight: "700", color: colores.texto },
  enlace: { minHeight: 44, textAlignVertical: "center", paddingHorizontal: 4, color: colores.mandarinaTexto, fontSize: texto.etiqueta, fontWeight: "800" },
  conteo: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radio.pildora },
  evento: { flexDirection: "row", alignItems: "center", gap: espacio.m, paddingVertical: 6 },
  eventoFecha: { width: 50, height: 50, borderRadius: 14, backgroundColor: colores.campo, alignItems: "center", justifyContent: "center" },
  eventoDia: { fontSize: 20, fontWeight: "700", lineHeight: 22, color: colores.mantequillaTexto },
  eventoMes: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", color: colores.textoSuave },
  cifra: { flexDirection: "row", alignItems: "center", gap: 14 },
  cifraIcono: { width: 44, height: 44, borderRadius: radio.control, alignItems: "center", justifyContent: "center" },
  cifraTitulo: { fontSize: texto.etiqueta, fontWeight: "600", color: colores.textoSuave },
  cifraValor: { marginTop: 2, fontSize: 32, fontWeight: "800", letterSpacing: -1, color: colores.texto },
  comparacion: { paddingVertical: 2, paddingHorizontal: espacio.s, borderRadius: radio.pildora },
  ocupacionFila: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: espacio.m },
  ocupacionBarra: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colores.campo, overflow: "hidden" },
});
