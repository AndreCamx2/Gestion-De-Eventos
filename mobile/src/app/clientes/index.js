import { useMemo, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { listarClientes } from "../../compartido/api/clientes";
import { FILTROS_TIPO, normalizar } from "../../compartido/pages/clientes/clientes";
import { Interruptor, Segmento } from "../../componentes/formulario";
import { Aviso, Boton, Cargando, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import { useCarga } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { colores } from "../../tema";

function Clientes() {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [conInactivos, setConInactivos] = useState(false);
  const { datos, error, cargando, recargando, recargar } = useCarga(
    () => listarClientes({ incluirInactivos: conInactivos }),
    [conInactivos],
  );

  const visibles = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    return [...(datos ?? [])]
      .filter((c) => tipo === "todos" || c.tipo === tipo)
      .filter((c) => !texto || [c.nombre, c.identificacion, c.correo, c.telefono].some((v) => normalizar(v).includes(texto)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [datos, tipo, busqueda]);

  if (cargando) return <Cargando texto="Cargando clientes…" />;

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      data={visibles}
      keyExtractor={(c) => String(c.id)}
      refreshing={recargando}
      onRefresh={recargar}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 10 }}>
          <Boton titulo="Nuevo cliente" onPress={() => router.push({ pathname: "/clientes/[id]", params: { id: "nuevo" } })} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre, documento, correo o teléfono"
            style={estilos.input}
            autoCorrect={false}
            accessibilityLabel="Buscar clientes"
          />
          <Segmento opciones={FILTROS_TIPO.map((f) => ({ valor: f.value, etiqueta: f.label }))} valor={tipo} onCambiar={setTipo} />
          <Interruptor etiqueta="Ver también los dados de baja" valor={conInactivos} onCambiar={setConInactivos} />
          <Aviso texto={error} />
        </View>
      }
      ListEmptyComponent={error ? null : <Vacio titulo="Sin clientes" texto="No hay clientes con estos filtros." />}
      renderItem={({ item: c }) => (
        <Tarjeta accessibilityLabel={`Cliente ${c.nombre}`} onPress={() => router.push({ pathname: "/clientes/[id]", params: { id: c.id } })}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={[estilos.textoFuerte, { flex: 1 }]}>{c.nombre}</Text>
            <Text style={{ fontSize: 12, fontWeight: "700", color: c.activo === false ? colores.mandarinaTexto : colores.textoSuave }}>
              {c.activo === false ? "De baja" : c.tipo === "juridica" ? "Jurídica" : "Natural"}
            </Text>
          </View>
          <Text style={estilos.textoSuave}>
            {[c.empresa_nombre, c.identificacion, c.correo, c.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"}
          </Text>
        </Tarjeta>
      )}
    />
  );
}

export default function PantallaClientes() {
  return (
    <RequiereRol rol="administrador">
      <Clientes />
    </RequiereRol>
  );
}
