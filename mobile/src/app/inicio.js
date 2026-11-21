import { RefreshControl, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { obtenerCalendario } from "../compartido/api/calendario";
import { getCotizaciones } from "../compartido/api/cotizaciones";
import { listarMisCotizaciones } from "../compartido/api/misCotizaciones";
import { listarMiStock } from "../compartido/api/proveedores";
import { listarSalones } from "../compartido/api/salones";
import { momento } from "../compartido/pages/cotizaciones/historico";
import { DIAS_VENTANA, MAX_AGENDA, plural, resumenInventario } from "../compartido/pages/inicio/inicio";
import { etiquetaCliente, fechaNumerica, separarPorFecha } from "../compartido/pages/misCotizaciones/misCotizaciones";
import {
  armarAgenda,
  confirmadosDelMes,
  dineroAbreviado,
  fechaISO,
  fechaLarga,
  hoyLocal,
  ocupacionPorSalon,
  resumenPorConfirmar,
  saludoPorHora,
  sumarDias,
  tasaDeCierre,
} from "../compartido/utils/inicioCifras";
import { Cifras, Seccion } from "../componentes/formulario";
import { Aviso, Boton, Cargando, EtiquetaEstado, Tarjeta, Vacio, estilos } from "../componentes/ui";
import { useCarga } from "../componentes/useCarga";
import RequiereRol from "../sesion/RequiereRol";
import { rolDe, useSesion } from "../sesion/Sesion";
import { colores, espacio } from "../tema";

// Menú de cada rol: lo que en la web está en la barra lateral.
const MENU = {
  administrador: [
    { ruta: "/cotizaciones", titulo: "Cotizaciones", detalle: "Lista, filtros y detalle" },
    { ruta: "/cotizaciones/nueva", titulo: "Nueva cotización", detalle: "Cliente, evento y conceptos" },
    { ruta: "/calendario", titulo: "Calendario", detalle: "El mes por salón" },
    { ruta: "/disponibilidad", titulo: "Disponibilidad y bloqueos", detalle: "Próximos días de un salón" },
    { ruta: "/rack", titulo: "Rack de salones", detalle: "Dos semanas, todos los salones" },
    { ruta: "/historico", titulo: "Histórico", detalle: "Eventos pasados y movimientos" },
    { ruta: "/ingresos", titulo: "Ingresos", detalle: "Por tipo de evento" },
    { ruta: "/clientes", titulo: "Clientes", detalle: "Personas y empresas" },
    { ruta: "/sitios", titulo: "Sitios", detalle: "Venues y sus salones" },
    { ruta: "/salones", titulo: "Salones", detalle: "Medidas, montajes y aforos" },
    { ruta: "/conceptos", titulo: "Conceptos", detalle: "Precios e historial" },
    { ruta: "/proveedores", titulo: "Proveedores", detalle: "Stock y comparador de precios" },
    { ruta: "/usuarios", titulo: "Usuarios", detalle: "Accesos del equipo" },
  ],
  cliente: [
    { ruta: "/mis-cotizaciones", titulo: "Mis cotizaciones", detalle: "Tus eventos y su estado" },
    { ruta: "/perfil", titulo: "Mi perfil", detalle: "Datos, correo y contraseña" },
  ],
  proveedor: [
    { ruta: "/mi-stock", titulo: "Mi stock", detalle: "Tu inventario y precios" },
    { ruta: "/perfil", titulo: "Mi perfil", detalle: "Datos, correo y contraseña" },
  ],
};

async function cargarInicio(rol) {
  const hoy = hoyLocal();
  if (rol === "administrador") {
    const [cotizaciones, eventos, salones] = await Promise.all([
      getCotizaciones(),
      obtenerCalendario({ desde: fechaISO(hoy), hasta: fechaISO(sumarDias(hoy, DIAS_VENTANA - 1)) }),
      listarSalones(),
    ]);
    const ocupan = eventos.filter((e) => e.estado !== "cancelado" && !(e.estado === "cotizado" && e.vencida));
    return {
      porConfirmar: resumenPorConfirmar(cotizaciones, hoy),
      confirmadosMes: confirmadosDelMes(cotizaciones, hoy),
      tasa: tasaDeCierre(cotizaciones, hoy),
      agenda: armarAgenda(ocupan, hoy).slice(0, MAX_AGENDA),
      ocupacion: ocupacionPorSalon(eventos, salones, DIAS_VENTANA),
    };
  }
  if (rol === "proveedor") {
    try {
      return { inventario: resumenInventario(await listarMiStock()) };
    } catch (e) {
      if (e?.body?.codigo === "proveedor_sin_vincular") return { sinVincular: true };
      throw e;
    }
  }
  const { proximos } = separarPorFecha(await listarMisCotizaciones(), hoy);
  return { proximo: proximos.find((c) => c.estado !== "cancelado") ?? null };
}

function Inicio() {
  const { usuario } = useSesion();
  const rol = rolDe(usuario);
  const { datos, error, cargando, recargando, recargar } = useCarga(() => cargarInicio(rol), [rol]);
  const hoy = hoyLocal();

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} />}
    >
      <View style={{ gap: 4 }}>
        <Text style={estilos.antetitulo}>{fechaLarga(hoy)}</Text>
        <Text style={estilos.titulo} accessibilityRole="header">
          {saludoPorHora(new Date().getHours())}
          {usuario?.first_name ? `, ${usuario.first_name}` : ""}
        </Text>
      </View>

      <Aviso texto={error} />
      {cargando ? <Cargando texto="Cargando tu resumen…" /> : null}
      {error ? <Boton titulo="Reintentar" variante="secundario" onPress={recargar} cargando={recargando} /> : null}

      {datos && rol === "administrador" ? <ResumenAdmin datos={datos} /> : null}
      {datos && rol === "proveedor" ? <ResumenProveedor datos={datos} /> : null}
      {datos && rol === "cliente" ? <ResumenCliente datos={datos} /> : null}

      <Seccion titulo="Menú">
        {(MENU[rol] ?? []).map((m) => (
          <Tarjeta key={m.ruta} accessibilityLabel={m.titulo} onPress={() => router.push(m.ruta)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={estilos.textoFuerte}>{m.titulo}</Text>
                <Text style={estilos.textoSuave}>{m.detalle}</Text>
              </View>
              <Text style={{ color: colores.textoSuave, fontSize: 20 }}>›</Text>
            </View>
          </Tarjeta>
        ))}
      </Seccion>
    </ScrollView>
  );
}

function ResumenAdmin({ datos }) {
  const tasa = datos.tasa.porcentaje == null ? "—" : `${datos.tasa.porcentaje} %`;
  return (
    <>
      <Cifras
        items={[
          {
            etiqueta: "Por confirmar",
            valor: String(datos.porConfirmar.cantidad),
            detalle: `${dineroAbreviado(datos.porConfirmar.total)}${
              datos.porConfirmar.vencenSemana ? ` · ${plural(datos.porConfirmar.vencenSemana, "vence", "vencen")} esta semana` : ""
            }`,
          },
          { etiqueta: "Confirmados este mes", valor: String(datos.confirmadosMes), detalle: `Tasa de cierre ${tasa}` },
        ]}
      />
      <Seccion titulo={`Agenda · próximos ${DIAS_VENTANA} días`}>
        {datos.agenda.length === 0 ? (
          <Vacio titulo="Sin eventos" texto={`No hay eventos en los próximos ${DIAS_VENTANA} días.`} />
        ) : (
          datos.agenda.map((e) => (
            <Tarjeta
              key={e.id}
              accessibilityLabel={`Evento de ${e.cliente_nombre}`}
              onPress={() => router.push({ pathname: "/cotizacion/[id]", params: { id: e.id } })}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={[estilos.textoFuerte, { flex: 1 }]}>{fechaLarga(e.fecha)}</Text>
                <EtiquetaEstado estado={e.estadoVisible} />
              </View>
              <Text style={estilos.textoSuave}>
                {e.salon_nombre} · {e.cliente_nombre} · {e.cantidad_personas} personas
              </Text>
              {e.venceEn != null ? (
                <Text style={{ color: colores.mandarinaTexto, fontSize: 13 }}>
                  La oferta vence {e.venceEn === 0 ? "hoy" : `en ${plural(e.venceEn, "día", "días")}`}
                </Text>
              ) : null}
            </Tarjeta>
          ))
        )}
      </Seccion>
      <Seccion titulo={`Ocupación por salón · ${DIAS_VENTANA} días`}>
        <Tarjeta>
          {datos.ocupacion.map((s) => (
            <View key={s.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={estilos.textoFuerte}>{s.nombre}</Text>
                <Text style={estilos.textoSuave}>{s.porcentaje} %</Text>
              </View>
              <View style={{ height: 8, borderRadius: 4, backgroundColor: colores.campo }}>
                <View style={{ width: `${Math.min(100, s.porcentaje)}%`, height: 8, borderRadius: 4, backgroundColor: colores.tinta }} />
              </View>
            </View>
          ))}
        </Tarjeta>
      </Seccion>
    </>
  );
}

function ResumenProveedor({ datos }) {
  if (datos.sinVincular) {
    return <Aviso texto="Tu usuario todavía no está vinculado a un proveedor. Pídele al administrador que lo vincule." />;
  }
  const { inventario } = datos;
  return (
    <Cifras
      items={[
        {
          etiqueta: "Elementos en tu stock",
          valor: String(inventario.total),
          detalle: inventario.agotados ? plural(inventario.agotados, "agotado", "agotados") : "Ninguno agotado",
        },
        { etiqueta: "Última actualización", valor: inventario.ultima ? momento(inventario.ultima) : "—" },
      ]}
    />
  );
}

function ResumenCliente({ datos }) {
  const c = datos.proximo;
  return (
    <Seccion titulo="Tu próximo evento">
      {c ? (
        <Tarjeta
          accessibilityLabel="Ver tu próximo evento"
          onPress={() => router.push({ pathname: "/mis-cotizaciones/[id]", params: { id: c.id } })}
        >
          <Text style={estilos.textoFuerte}>
            {c.salon_nombre} · {c.sitio_nombre}
          </Text>
          <Text style={estilos.textoSuave}>
            {fechaNumerica(c.fecha_evento)} · {c.cantidad_personas} personas · {etiquetaCliente(c)}
          </Text>
        </Tarjeta>
      ) : (
        <Vacio titulo="Sin eventos próximos" texto="Tu asesor te enviará las cotizaciones por aquí." />
      )}
    </Seccion>
  );
}

export default function PantallaInicio() {
  return (
    <RequiereRol rol={["administrador", "cliente", "proveedor"]}>
      <Inicio />
    </RequiereRol>
  );
}
