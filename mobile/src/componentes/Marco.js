import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Texto";
import { rolDe, useSesion } from "../sesion/Sesion";
import { colores, espacio, radio, sombraFlotante, texto } from "../tema";
import { nombreVisible } from "../compartido/utils/nombreUsuario";
import logoVenue from "../../assets/marca/venue-logo.png";
import iconoInicio from "../../assets/iconos/inicio.png";
import iconoCotizar from "../../assets/iconos/cotizar.png";
import iconoAgenda from "../../assets/iconos/agenda.png";
import iconoMas from "../../assets/iconos/mas.png";
import iconoNueva from "../../assets/iconos/nueva.png";
import iconoAtras from "../../assets/iconos/atras.png";

// El marco de la web en el teléfono (DashboardLayout.jsx + BarraInferior.jsx):
// arriba el logo y el avatar; abajo la barra con Inicio, Cotizar, "+", Agenda y Más.

// Las pestañas de la web, en su orden, con la ruta de la app.
const PESTANAS = [
  { ruta: "/inicio", texto: "Inicio", roles: ["administrador", "cliente", "proveedor"] },
  { ruta: "/cotizaciones", texto: "Cotizaciones", roles: ["administrador"] },
  { ruta: "/calendario", texto: "Calendario", roles: ["administrador"] },
  { ruta: "/rack", texto: "Rack", roles: ["administrador"] },
  { ruta: "/ingresos", texto: "Ingresos", roles: ["administrador"] },
  { ruta: "/salones", texto: "Salones", roles: ["administrador"] },
  { ruta: "/conceptos", texto: "Conceptos", roles: ["administrador"] },
  { ruta: "/proveedores", texto: "Proveedores", roles: ["administrador"] },
  { ruta: "/clientes", texto: "Clientes", roles: ["administrador"] },
  { ruta: "/sitios", texto: "Venues", roles: ["administrador"] },
  { ruta: "/usuarios", texto: "Usuarios", roles: ["administrador"] },
  // Solo en la app: la disponibilidad por salón que ya tenía (SGDE-15).
  { ruta: "/disponibilidad", texto: "Disponibilidad", roles: ["administrador"] },
  { ruta: "/mis-cotizaciones", texto: "Mis cotizaciones", roles: ["cliente"] },
  { ruta: "/mi-stock", texto: "Mi stock", roles: ["proveedor"] },
  { ruta: "/perfil", texto: "Mi perfil", roles: ["cliente", "proveedor"] },
];

const FIJAS = [
  { ruta: "/inicio", texto: "Inicio", icono: iconoInicio },
  { ruta: "/cotizaciones", texto: "Cotizar", icono: iconoCotizar },
  { ruta: "/calendario", texto: "Agenda", icono: iconoAgenda },
];

const RUTA_NUEVA = "/cotizaciones/nueva";

// Pantallas sin marco: las de antes de entrar.
const PUBLICAS = ["/", "/login", "/registro", "/recuperar-clave", "/restablecer-clave"];

export function iniciales(nombre) {
  return String(nombre ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// Igual que piezasBarraInferior.js de la web.
export function piezasDeLaBarra(rol) {
  const visibles = PESTANAS.filter((p) => p.roles.includes(rol));
  const rutas = new Set(visibles.map((p) => p.ruta));
  const fijas = FIJAS.filter((p) => rutas.has(p.ruta));
  const enMas = visibles.filter((p) => !FIJAS.some((f) => f.ruta === p.ruta));
  return { fijas, enMas, nueva: rol === "administrador", hayBarra: fijas.length + enMas.length > 1, raices: visibles.map((p) => p.ruta) };
}

const activa = (pathname, ruta) => pathname === ruta || (ruta !== "/inicio" && pathname.startsWith(`${ruta}/`));

function BarraSuperior({ usuario, rol, conAtras }) {
  const arriba = useSafeAreaInsets().top;
  const [menu, setMenu] = useState(false);
  const { salir } = useSesion();
  const nombre = nombreVisible(usuario);
  return (
    <View style={[propios.barraSuperior, { paddingTop: arriba }]}>
      <View style={propios.barraSuperiorInterior}>
        {conAtras ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={8}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/inicio"))}
            style={propios.botonAtras}
          >
            <Image source={iconoAtras} style={{ width: 22, height: 22, tintColor: colores.texto }} />
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="link" accessibilityLabel="Venue, ir al inicio" onPress={() => router.navigate("/inicio")} style={{ flex: 1 }}>
          <Image source={logoVenue} style={{ height: 30, width: 148, resizeMode: "contain", alignSelf: "flex-start" }} accessibilityIgnoresInvertColors />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Menú de usuario de ${nombre}`}
          accessibilityState={{ expanded: menu }}
          onPress={() => setMenu(true)}
          style={propios.botonPerfil}
        >
          <View style={propios.avatar}>
            <Text style={propios.avatarTexto}>{iniciales(nombre)}</Text>
          </View>
        </Pressable>
      </View>

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMenu(false)} accessibilityLabel="Cerrar menú">
          <View style={[propios.menu, { top: arriba + 56, right: espacio.l }]}>
            <View style={{ paddingHorizontal: espacio.m, paddingTop: espacio.s, paddingBottom: espacio.m }}>
              <Text style={{ fontSize: texto.cuerpo, fontWeight: "700", color: colores.texto }}>Hola, {nombre}</Text>
              <Text style={{ marginTop: 2, fontSize: texto.etiqueta, color: colores.textoSuave, textTransform: "capitalize" }}>{rol}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: colores.linea, marginBottom: espacio.xs }} />
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                setMenu(false);
                await salir();
                router.replace("/login");
              }}
              style={({ pressed }) => [propios.opcion, pressed && { backgroundColor: colores.superficie2 }]}
            >
              <Text style={{ color: colores.peligro, fontSize: texto.navegacion, fontWeight: "600" }}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Pieza({ texto: etiqueta, icono, activa: esActiva, onPress, accessibilityState }) {
  const color = esActiva ? colores.texto : colores.textoSuave;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: esActiva, ...accessibilityState }}
      onPress={onPress}
      style={propios.pieza}
    >
      <Image source={icono} style={{ width: 20, height: 20, tintColor: color }} />
      <Text numberOfLines={1} style={{ fontSize: texto.pequeno, fontWeight: esActiva ? "800" : "700", color, lineHeight: 15 }}>
        {etiqueta}
      </Text>
    </Pressable>
  );
}

function BarraInferior({ piezas, pathname }) {
  const abajo = useSafeAreaInsets().bottom;
  const [mas, setMas] = useState(false);
  const antes = piezas.fijas.filter((p) => p.ruta !== "/calendario");
  const despues = piezas.fijas.filter((p) => p.ruta === "/calendario");
  const masActivo = piezas.enMas.some((p) => activa(pathname, p.ruta));
  const ir = (ruta) => router.navigate(ruta);
  const margenAbajo = Math.max(espacio.l, abajo);

  return (
    <View style={[propios.barraInferior, { marginBottom: margenAbajo }]} accessibilityRole="tablist">
      {antes.map((p) => (
        <Pieza key={p.ruta} {...p} activa={activa(pathname, p.ruta) && pathname !== RUTA_NUEVA} onPress={() => ir(p.ruta)} />
      ))}
      {piezas.nueva ? (
        <View style={propios.pieza}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nueva cotización"
            onPress={() => ir(RUTA_NUEVA)}
            style={({ pressed }) => [propios.nueva, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <Image source={iconoNueva} style={{ width: 24, height: 24, tintColor: colores.sobreOscuro }} />
          </Pressable>
        </View>
      ) : null}
      {despues.map((p) => (
        <Pieza key={p.ruta} {...p} activa={activa(pathname, p.ruta)} onPress={() => ir(p.ruta)} />
      ))}
      {piezas.enMas.length > 0 ? (
        <Pieza texto="Más" icono={iconoMas} activa={masActivo} accessibilityState={{ expanded: mas }} onPress={() => setMas(true)} />
      ) : null}

      <Modal visible={mas} transparent animationType="fade" onRequestClose={() => setMas(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setMas(false)} accessibilityLabel="Cerrar menú">
          <View style={[propios.menu, propios.menuMas, { bottom: margenAbajo + 70 + espacio.l }]}>
            <ScrollView>
              {piezas.enMas.map((p) => {
                const actual = activa(pathname, p.ruta);
                return (
                  <Pressable
                    key={p.ruta}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: actual }}
                    onPress={() => {
                      setMas(false);
                      ir(p.ruta);
                    }}
                    style={({ pressed }) => [
                      propios.opcion,
                      actual && { borderLeftWidth: 3, borderLeftColor: colores.mandarina },
                      pressed && { backgroundColor: colores.superficie2 },
                    ]}
                  >
                    <Text style={{ color: colores.texto, fontSize: texto.navegacion, fontWeight: actual ? "800" : "600" }}>{p.texto}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// Envuelve las pantallas: con sesión y fuera de las pantallas públicas, pinta las dos barras.
export default function Marco({ children }) {
  const pathname = usePathname();
  const { estado, usuario } = useSesion();
  const rol = rolDe(usuario);
  const conMarco = estado === "con-sesion" && rol && !PUBLICAS.includes(pathname);
  if (!conMarco) return children;
  const piezas = piezasDeLaBarra(rol);
  const conAtras = !piezas.raices.includes(pathname);
  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <BarraSuperior usuario={usuario} rol={rol} conAtras={conAtras} />
      <View style={{ flex: 1 }}>{children}</View>
      {piezas.hayBarra ? <BarraInferior piezas={piezas} pathname={pathname} /> : null}
    </View>
  );
}

const propios = StyleSheet.create({
  barraSuperior: { backgroundColor: colores.superficie, borderBottomWidth: 1, borderBottomColor: colores.linea },
  barraSuperiorInterior: { height: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: espacio.l, gap: espacio.s },
  botonAtras: { width: 36, height: 44, alignItems: "flex-start", justifyContent: "center" },
  botonPerfil: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colores.durazno, alignItems: "center", justifyContent: "center" },
  avatarTexto: { color: colores.mandarinaTexto, fontSize: texto.etiqueta, fontWeight: "700" },
  menu: {
    position: "absolute",
    width: 240,
    padding: espacio.s,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: radio.control,
    ...sombraFlotante,
  },
  menuMas: { right: espacio.m, width: 220, maxHeight: "60%" },
  opcion: { minHeight: 44, justifyContent: "center", paddingHorizontal: espacio.m, borderRadius: espacio.s },
  barraInferior: {
    marginHorizontal: espacio.m,
    flexDirection: "row",
    alignItems: "center",
    padding: espacio.s,
    borderWidth: 1,
    borderColor: colores.linea,
    borderRadius: 24,
    backgroundColor: colores.superficie,
    ...sombraFlotante,
  },
  pieza: { flex: 1, height: 52, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 16 },
  nueva: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colores.tinta,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colores.mandarina,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
});
