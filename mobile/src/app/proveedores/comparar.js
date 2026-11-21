import { useEffect, useRef, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { compararStock } from "../../compartido/api/proveedores";
import { pesos } from "../../compartido/pages/proveedores/proveedores";
import { Aviso, Boton, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import { textoDeError } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { colores } from "../../tema";

const ESPERA_MS = 300;

// Mismo comparador de la web: por cada elemento, las ofertas de todos los proveedores.
function Comparar() {
  const [texto, setTexto] = useState("");
  const [grupos, setGrupos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const pedido = useRef(0);

  async function buscar(valor) {
    const numero = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const datos = await compararStock(valor);
      if (numero === pedido.current) setGrupos(datos);
    } catch (e) {
      if (numero === pedido.current) setError(textoDeError(e, "Solo un administrador puede comparar precios."));
    } finally {
      if (numero === pedido.current) setCargando(false);
    }
  }

  useEffect(() => {
    const espera = setTimeout(() => buscar(texto), ESPERA_MS);
    return () => clearTimeout(espera);
  }, [texto]);

  return (
    <FlatList
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      data={grupos ?? []}
      keyExtractor={(g) => g.elemento}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Ej. silla, cabina, mantel"
            style={estilos.input}
            autoCorrect={false}
            accessibilityLabel="Buscar elemento"
          />
          <Text style={estilos.textoSuave}>
            {cargando ? "Buscando…" : grupos ? `${grupos.length} ${grupos.length === 1 ? "elemento" : "elementos"}` : ""}
          </Text>
          <Aviso texto={error} />
          {error ? <Boton titulo="Reintentar" variante="secundario" onPress={() => buscar(texto)} /> : null}
        </View>
      }
      ListEmptyComponent={
        !cargando && !error && grupos ? <Vacio titulo="Sin resultados" texto="Ningún proveedor tiene un elemento con ese nombre." /> : null
      }
      renderItem={({ item: g }) => (
        <Tarjeta>
          <Text style={[estilos.textoFuerte, { fontSize: 17 }]}>{g.elemento}</Text>
          <Text style={estilos.textoSuave}>
            {g.mejor_precio === null ? "Todos los proveedores lo tienen agotado." : `Mejor precio ${pesos(g.mejor_precio)}`}
          </Text>
          {g.ofertas.map((o) => {
            const agotado = o.cantidad === 0;
            return (
              <View
                key={o.stock_id}
                style={{
                  gap: 2,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: o.es_mejor_precio ? "rgba(52,168,106,0.10)" : colores.superficie2,
                  opacity: agotado ? 0.6 : 1,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Text style={[estilos.textoFuerte, { flex: 1 }]}>
                    {o.proveedor}
                    {o.es_mejor_precio ? " · mejor precio" : ""}
                  </Text>
                  <Text style={estilos.textoFuerte}>{pesos(o.valor)}</Text>
                </View>
                <Text style={estilos.textoSuave}>
                  {agotado ? "Agotado" : `${o.cantidad} disponibles`} · {o.contacto || "Sin contacto"}
                </Text>
              </View>
            );
          })}
        </Tarjeta>
      )}
    />
  );
}

export default function PantallaComparar() {
  return (
    <RequiereRol rol="administrador">
      <Comparar />
    </RequiereRol>
  );
}
