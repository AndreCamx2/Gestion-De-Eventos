import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Text, TextInput } from "../../componentes/Texto";
import { router } from "expo-router";
import { listarConceptos, listarSitios } from "../../compartido/api/conceptos";
import { etiquetaImpuesto, formatCOP, precioConImpuesto } from "../../compartido/pages/conceptos/conceptos";
import { normalizar } from "../../compartido/pages/cotizaciones/cotizaciones";
import { Interruptor, Seccion } from "../../componentes/formulario";
import { Cabecera, Aviso, Boton, Cargando, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import { useCarga } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { colores } from "../../tema";

function Conceptos() {
  const [busqueda, setBusqueda] = useState("");
  const [conInactivos, setConInactivos] = useState(false);
  const { datos, error, cargando, recargando, recargar } = useCarga(async () => {
    const [conceptos, sitios] = await Promise.all([listarConceptos(), listarSitios()]);
    return { conceptos, sitios };
  });

  const grupos = useMemo(() => {
    if (!datos) return [];
    const texto = normalizar(busqueda.trim());
    const nombreSitio = new Map(datos.sitios.map((s) => [s.id, s.nombre]));
    const porSitio = new Map();
    for (const c of datos.conceptos) {
      if (!conInactivos && !c.activo) continue;
      if (texto && !normalizar(c.nombre).includes(texto)) continue;
      const sitio = nombreSitio.get(c.sitio) ?? c.sitio_nombre ?? "Sin venue";
      porSitio.set(sitio, [...(porSitio.get(sitio) ?? []), c]);
    }
    return [...porSitio.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([sitio, lista]) => ({ sitio, lista: lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")) }));
  }, [datos, busqueda, conInactivos]);

  if (cargando) return <Cargando texto="Cargando conceptos…" />;

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} />}
    >
      <Cabecera antetitulo="Catálogo" titulo="Conceptos y precios" subtitulo="Cada cambio de precio queda registrado con quién y cuándo." />
      <Boton titulo="Nuevo concepto" onPress={() => router.push({ pathname: "/conceptos/[id]", params: { id: "nuevo" } })} />
      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar concepto"
        style={estilos.input}
        autoCorrect={false}
        accessibilityLabel="Buscar conceptos"
      />
      <Interruptor etiqueta="Ver también los inactivos" valor={conInactivos} onCambiar={setConInactivos} />
      <Aviso texto={error} />
      {!error && grupos.length === 0 ? <Vacio titulo="Sin conceptos" texto="No hay conceptos con esta búsqueda." /> : null}
      {grupos.map((g) => (
        <Seccion key={g.sitio} titulo={g.sitio}>
          {g.lista.map((c) => (
            <Tarjeta key={c.id} accessibilityLabel={`Concepto ${c.nombre}`} onPress={() => router.push({ pathname: "/conceptos/[id]", params: { id: c.id } })}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={[estilos.textoFuerte, { flex: 1 }]}>{c.nombre}</Text>
                <Text style={estilos.textoFuerte}>{formatCOP(c.precio)}</Text>
              </View>
              <Text style={[estilos.textoSuave, !c.activo && { color: colores.mandarinaTexto }]}>
                {c.activo ? "" : "Inactivo · "}Impuesto {etiquetaImpuesto(c.impuesto_pct)} · con impuesto {formatCOP(precioConImpuesto(c.precio, c.impuesto_pct))}
              </Text>
            </Tarjeta>
          ))}
        </Seccion>
      ))}
    </ScrollView>
  );
}

export default function PantallaConceptos() {
  return (
    <RequiereRol rol="administrador">
      <Conceptos />
    </RequiereRol>
  );
}
