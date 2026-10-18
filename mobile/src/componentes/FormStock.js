import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { Aviso, Boton, Campo, estilos } from "./ui";
import { mensajeDeError } from "../utils/errores";
import { validarStock } from "../utils/formularioStock";

// Formulario de un elemento de "Mi stock". Con `conNombre` se pide el nombre
// (elemento nuevo); al editar, el nombre no cambia (SGDE-98) y solo se muestra.
// `guardar(datos)` llama al API; si responde 400, los errores salen bajo cada campo.
export default function FormStock({ inicial = {}, conNombre = false, nombreFijo, tituloBoton, guardar, alGuardar }) {
  const [nombre, setNombre] = useState(inicial.nombre ?? "");
  const [cantidad, setCantidad] = useState(inicial.cantidad != null ? String(inicial.cantidad) : "");
  // "45000.00" → "45000" y "45000.50" → "45000.5": sin ceros de más y sin perder centavos.
  const [valor, setValor] = useState(inicial.valor != null ? String(Number(inicial.valor)) : "");
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const { datos, errores: locales } = validarStock({ nombreElemento: nombre, cantidad, valor }, { conNombre });
    setErrores(locales);
    setGeneral(null);
    if (Object.keys(locales).length) return;

    setEnviando(true);
    try {
      await guardar(datos);
      alGuardar();
    } catch (e) {
      const { general: texto, campos } = mensajeDeError(e);
      setErrores(campos);
      setGeneral(texto);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Aviso texto={general} />
        {conNombre ? (
          <Campo
            etiqueta="Nombre del elemento"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej.: Silla Tiffany"
            error={errores.nombre_elemento}
          />
        ) : (
          <Text style={estilos.titulo}>{nombreFijo}</Text>
        )}
        <Campo
          etiqueta="Cantidad disponible"
          value={cantidad}
          onChangeText={setCantidad}
          keyboardType="number-pad"
          placeholder="0"
          error={errores.cantidad}
        />
        <Campo
          etiqueta="Valor por unidad (pesos)"
          value={valor}
          onChangeText={setValor}
          keyboardType="decimal-pad"
          placeholder="0"
          error={errores.valor}
        />
        <Boton titulo={tituloBoton} onPress={enviar} cargando={enviando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
