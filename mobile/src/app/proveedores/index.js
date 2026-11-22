import { useState } from "react";
import { FlatList, View } from "react-native";
import { Text } from "../../componentes/Texto";
import { router } from "expo-router";
import { crearProveedor, listarProveedores, listarStock } from "../../compartido/api/proveedores";
import {
  MAX_CONTACTO_PROVEEDOR,
  PROVEEDOR_VACIO,
  conteoPorProveedor,
  erroresProveedor,
  payloadProveedor,
  porNombre,
  validarProveedor,
} from "../../compartido/pages/proveedores/proveedores";
import { Dialogo } from "../../componentes/formulario";
import { Cabecera, Aviso, Boton, Campo, Cargando, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import { textoDeError, useCarga } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { colores, espacio } from "../../tema";

function Proveedores() {
  const { datos, error, cargando, recargando, recargar } = useCarga(async () => {
    const [proveedores, stock] = await Promise.all([listarProveedores(), listarStock()]);
    return { proveedores: [...proveedores].sort(porNombre), conteo: conteoPorProveedor(stock) };
  });
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(PROVEEDOR_VACIO);
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [exito, setExito] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  async function crear() {
    setGeneral(null);
    const locales = validarProveedor(form);
    setErrores(locales);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try {
      const creado = await crearProveedor(payloadProveedor(form));
      setForm(PROVEEDOR_VACIO);
      setAbierto(false);
      setExito(`Proveedor ${creado.nombre} creado.`);
      await recargar();
    } catch (e) {
      if (e.status === 400) {
        const r = erroresProveedor(e.body);
        setErrores(r.campos);
        setGeneral(r.general);
      } else {
        setGeneral(textoDeError(e, "Solo un administrador puede crear proveedores."));
      }
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <Cargando texto="Cargando proveedores…" />;

  return (
    <>
      <FlatList
        style={estilos.pantalla}
        contentContainerStyle={estilos.contenido}
        data={datos?.proveedores ?? []}
        keyExtractor={(p) => String(p.id)}
        refreshing={recargando}
        onRefresh={recargar}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <Cabecera antetitulo="Catálogo" titulo="Proveedores y stock" subtitulo="Quién provee qué, cuánto hay y cuánto vale." />
            <View style={{ flexDirection: "row", gap: espacio.s }}>
              <View style={{ flex: 1 }}>
                <Boton titulo="Nuevo proveedor" onPress={() => setAbierto(true)} />
              </View>
              <View style={{ flex: 1 }}>
                <Boton titulo="Comparar precios" variante="secundario" onPress={() => router.push("/proveedores/comparar")} />
              </View>
            </View>
            <Aviso texto={error} />
            <Aviso tipo="exito" texto={exito} />
          </View>
        }
        ListEmptyComponent={error ? null : <Vacio titulo="Sin proveedores" texto="Crea el primero con el botón de arriba." />}
        renderItem={({ item: p }) => {
          const elementos = datos.conteo[p.id] ?? 0;
          return (
            <Tarjeta accessibilityLabel={`Proveedor ${p.nombre}`} onPress={() => router.push({ pathname: "/proveedores/[id]", params: { id: p.id } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={[estilos.textoFuerte, { flex: 1 }]}>{p.nombre}</Text>
                <Text style={estilos.textoSuave}>
                  {elementos} {elementos === 1 ? "elemento" : "elementos"}
                </Text>
              </View>
              <Text style={estilos.textoSuave}>
                {p.identificacion || "Sin identificación"} · {p.contacto || "Sin contacto"}
              </Text>
              <Text style={{ fontSize: 13, color: p.usuario_nombre ? colores.exito : colores.mandarinaTexto }}>
                {p.usuario_nombre ? `Acceso: ${p.usuario_nombre}` : "Sin usuario de acceso"}
              </Text>
            </Tarjeta>
          );
        }}
      />
      <Dialogo visible={abierto} titulo="Nuevo proveedor" onCerrar={() => setAbierto(false)}>
        <Aviso texto={general} />
        <Campo etiqueta="Nombre" value={form.nombre} onChangeText={(v) => cambiar("nombre", v)} error={errores.nombre} />
        <Campo
          etiqueta="Identificación (NIT o cédula, opcional)"
          value={form.identificacion}
          onChangeText={(v) => cambiar("identificacion", v)}
          error={errores.identificacion}
        />
        <Campo
          etiqueta="Contacto (opcional)"
          value={form.contacto}
          onChangeText={(v) => cambiar("contacto", v)}
          maxLength={MAX_CONTACTO_PROVEEDOR}
          error={errores.contacto}
        />
        <Boton titulo="Crear proveedor" cargando={guardando} onPress={crear} />
      </Dialogo>
    </>
  );
}

export default function PantallaProveedores() {
  return (
    <RequiereRol rol="administrador">
      <Proveedores />
    </RequiereRol>
  );
}
