import { useMemo, useState } from "react";
import { ScrollView, RefreshControl, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { listarSalonMontajes, listarSalones } from "../../compartido/api/salones";
import { aforoMaximo, metros, normalizar } from "../../compartido/pages/salones/salones";
import { Interruptor, Seccion } from "../../componentes/formulario";
import { Aviso, Boton, Cargando, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import { useCarga } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { colores } from "../../tema";

function Salones() {
  const [busqueda, setBusqueda] = useState("");
  const [conBajas, setConBajas] = useState(false);
  const { datos, error, cargando, recargando, recargar } = useCarga(async () => {
    const [salones, salonMontajes] = await Promise.all([listarSalones({ incluirInactivos: conBajas }), listarSalonMontajes()]);
    return { salones, salonMontajes };
  }, [conBajas]);

  const grupos = useMemo(() => {
    const texto = normalizar(busqueda.trim());
    const porSitio = new Map();
    for (const s of datos?.salones ?? []) {
      if (texto && ![s.nombre, s.sitio_nombre].some((v) => normalizar(v).includes(texto))) continue;
      const lista = porSitio.get(s.sitio_nombre) ?? [];
      lista.push(s);
      porSitio.set(s.sitio_nombre, lista);
    }
    return [...porSitio.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([sitio, salones]) => ({ sitio, salones: salones.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")) }));
  }, [datos, busqueda]);

  if (cargando) return <Cargando texto="Cargando salones…" />;

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} />}
    >
      <Boton titulo="Nuevo salón" onPress={() => router.push({ pathname: "/salones/[id]", params: { id: "nuevo" } })} />
      <TextInput
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por salón o venue"
        style={estilos.input}
        autoCorrect={false}
        accessibilityLabel="Buscar salones"
      />
      <Interruptor etiqueta="Ver también los dados de baja" valor={conBajas} onCambiar={setConBajas} />
      <Aviso texto={error} />
      {!error && grupos.length === 0 ? <Vacio titulo="Sin salones" texto="No hay salones con esta búsqueda." /> : null}
      {grupos.map((g) => (
        <Seccion key={g.sitio} titulo={g.sitio}>
          {g.salones.map((s) => {
            const habilitados = (datos?.salonMontajes ?? []).filter((sm) => sm.salon === s.id);
            const maximo = aforoMaximo(habilitados);
            const medidas = s.ancho && s.altura ? `${metros(s.ancho)} × ${metros(s.altura)}` : null;
            return (
              <Tarjeta key={s.id} accessibilityLabel={`Salón ${s.nombre}`} onPress={() => router.push({ pathname: "/salones/[id]", params: { id: s.id } })}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Text style={[estilos.textoFuerte, { flex: 1 }]}>{s.nombre}</Text>
                  {s.activo === false ? <Text style={{ color: colores.mandarinaTexto, fontWeight: "700", fontSize: 12 }}>De baja</Text> : null}
                </View>
                <Text style={estilos.textoSuave}>
                  {[medidas, `${habilitados.length} ${habilitados.length === 1 ? "montaje" : "montajes"}`, maximo ? `hasta ${maximo} personas` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Tarjeta>
            );
          })}
        </Seccion>
      ))}
    </ScrollView>
  );
}

export default function PantallaSalones() {
  return (
    <RequiereRol rol="administrador">
      <Salones />
    </RequiereRol>
  );
}
