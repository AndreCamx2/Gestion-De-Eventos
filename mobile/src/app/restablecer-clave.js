import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import useRestablecerClave from "../compartido/pages/recuperacion/useRestablecerClave";
import { Aviso, Boton, Campo, estilos } from "../componentes/ui";

// Se abre con el enlace del correo: sgde://restablecer-clave?uid=…&token=…
export default function RestablecerClave() {
  const { uid, token } = useLocalSearchParams();
  const [clave, setClave] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const { errores, errorGeneral, enlaceInvalido, enviando, listo, enviar } = useRestablecerClave(
    typeof uid === "string" ? uid : "",
    typeof token === "string" ? token : "",
  );

  if (listo || enlaceInvalido) {
    return (
      <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido}>
        <Aviso
          tipo={listo ? "exito" : "error"}
          texto={listo ? "Listo: ya puedes entrar con tu contraseña nueva." : "El enlace ya no sirve o está incompleto. Pide uno nuevo."}
        />
        <Boton titulo="Ir a iniciar sesión" onPress={() => router.replace("/login")} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <Text style={estilos.subtitulo}>Escribe tu contraseña nueva (mínimo 8 caracteres).</Text>
      <Aviso texto={errorGeneral} />
      <Campo etiqueta="Contraseña nueva" value={clave} onChangeText={setClave} secureTextEntry error={errores.password} />
      <Campo
        etiqueta="Confirma la contraseña"
        value={confirmacion}
        onChangeText={setConfirmacion}
        secureTextEntry
        error={errores.confirmacion}
      />
      <Boton titulo="Guardar contraseña" cargando={enviando} onPress={() => enviar(clave, confirmacion)} />
    </ScrollView>
  );
}
