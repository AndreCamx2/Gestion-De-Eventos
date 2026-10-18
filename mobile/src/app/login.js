import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { ErrorApi } from "../api/cliente";
import { Aviso, Boton, Campo, estilos } from "../componentes/ui";
import { useSesion } from "../sesion/Sesion";
import { mensajeDeError } from "../utils/errores";

export default function Login() {
  const { estado, entrar } = useSesion();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  if (estado === "con-sesion") return <Redirect href="/" />;

  async function enviar() {
    const faltan = {};
    if (!usuario.trim()) faltan.usuario = "Escribe tu usuario o correo.";
    if (!clave) faltan.clave = "Escribe tu contraseña.";
    setErrores(faltan);
    if (Object.keys(faltan).length) return;

    setEnviando(true);
    try {
      await entrar(usuario, clave);
      router.replace("/");
    } catch (error) {
      // 401 en el login = credenciales malas (el mensaje de simplejwt viene en inglés).
      const general =
        error instanceof ErrorApi && error.status === 401
          ? "Usuario o contraseña incorrectos."
          : mensajeDeError(error).general;
      setErrores({ general });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={[estilos.contenido, { flexGrow: 1, justifyContent: "center" }]} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6, marginBottom: 8 }}>
            <Text style={estilos.antetitulo}>SGDE</Text>
            <Text style={estilos.titulo} accessibilityRole="header">
              Inicia sesión
            </Text>
            <Text style={estilos.subtitulo}>Disponibilidad de salones y tu stock, desde el celular.</Text>
          </View>

          <Aviso texto={errores.general} />

          <Campo
            etiqueta="Usuario o correo"
            value={usuario}
            onChangeText={setUsuario}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            error={errores.usuario}
          />
          <Campo
            etiqueta="Contraseña"
            value={clave}
            onChangeText={setClave}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={enviar}
            error={errores.clave}
          />
          <Boton titulo="Entrar" onPress={enviar} cargando={enviando} />
          <Text style={[estilos.textoSuave, { textAlign: "center" }]}>
            Si el servidor estaba inactivo, la primera vez puede tardar hasta un minuto.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
