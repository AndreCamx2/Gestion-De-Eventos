import { useState } from "react";
import { router } from "expo-router";
import useRecuperarClave from "../compartido/pages/recuperacion/useRecuperarClave";
import { AvisoAcceso, Divisor, EnlaceAcceso, PantallaAcceso, PieAcceso, TarjetaAcceso } from "../componentes/Acceso";
import { Text } from "../componentes/Texto";
import { Boton, Campo } from "../componentes/ui";

// RecuperarClave.jsx de la web.
export default function RecuperarClave() {
  const [correo, setCorreo] = useState("");
  const { error, errorGeneral, enviando, enviado, enviar } = useRecuperarClave();

  if (enviado) {
    return (
      <PantallaAcceso>
        <TarjetaAcceso titulo="Revisa tu correo">
          <AvisoAcceso tipo="exito">
            Si ese correo está registrado, te llegará un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.
          </AvisoAcceso>
          <Text style={{ textAlign: "center" }}>
            <EnlaceAcceso titulo="Volver a iniciar sesión" onPress={() => router.replace("/login")} />
          </Text>
        </TarjetaAcceso>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso>
      <TarjetaAcceso titulo="¿Olvidaste tu contraseña?" subtitulo="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.">
        <Campo
          etiqueta="Correo electrónico"
          obligatorio
          value={correo}
          onChangeText={setCorreo}
          placeholder="nombre@empresa.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          error={error}
        />
        <AvisoAcceso>{errorGeneral}</AvisoAcceso>
        <Boton titulo="Enviar enlace" textoCargando="Enviando…" alto={50} cargando={enviando} onPress={() => enviar(correo.trim().toLowerCase())} />
        <Divisor />
        <PieAcceso texto="¿Ya la recordaste?" enlace="Inicia sesión" onPress={() => router.replace("/login")} />
      </TarjetaAcceso>
    </PantallaAcceso>
  );
}
