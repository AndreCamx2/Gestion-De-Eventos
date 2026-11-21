import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import useRecuperarClave from "../compartido/pages/recuperacion/useRecuperarClave";
import { Aviso, Boton, Campo, estilos } from "../componentes/ui";

export default function RecuperarClave() {
  const [correo, setCorreo] = useState("");
  const { error, errorGeneral, enviando, enviado, enviar } = useRecuperarClave();

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      {enviado ? (
        <>
          <Aviso tipo="exito" texto="Si el correo está registrado, te llegará un enlace para crear una contraseña nueva." />
          <Boton titulo="Volver a iniciar sesión" onPress={() => router.replace("/login")} />
        </>
      ) : (
        <>
          <Text style={estilos.subtitulo}>Escribe el correo con el que entras y te enviaremos un enlace.</Text>
          <Aviso texto={errorGeneral} />
          <Campo
            etiqueta="Correo electrónico"
            value={correo}
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            error={error}
          />
          <Boton titulo="Enviar enlace" cargando={enviando} onPress={() => enviar(correo.trim().toLowerCase())} />
        </>
      )}
    </ScrollView>
  );
}
