import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import useRestablecerClave from "../compartido/pages/recuperacion/useRestablecerClave";
import { AvisoAcceso, EnlaceAcceso, PantallaAcceso, TarjetaAcceso } from "../componentes/Acceso";
import { Text } from "../componentes/Texto";
import { Boton, Campo } from "../componentes/ui";

// RestablecerClave.jsx de la web. Se abre con el enlace del correo: sgde://restablecer-clave?uid=…&token=…
export default function RestablecerClave() {
  const { uid, token } = useLocalSearchParams();
  const [clave, setClave] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const { errores, errorGeneral, enlaceInvalido, enviando, listo, enviar } = useRestablecerClave(
    typeof uid === "string" ? uid : "",
    typeof token === "string" ? token : "",
  );

  if (listo) {
    return (
      <PantallaAcceso>
        <TarjetaAcceso titulo="Contraseña actualizada">
          <AvisoAcceso tipo="exito">Tu contraseña quedó cambiada. Por seguridad, cerramos las sesiones que tenías abiertas.</AvisoAcceso>
          <Boton titulo="Iniciar sesión" alto={50} onPress={() => router.replace("/login")} />
        </TarjetaAcceso>
      </PantallaAcceso>
    );
  }

  if (enlaceInvalido) {
    return (
      <PantallaAcceso>
        <TarjetaAcceso titulo="El enlace no sirve">
          <AvisoAcceso>Este enlace no es válido, ya se usó o venció. Pide uno nuevo para cambiar tu contraseña.</AvisoAcceso>
          <Boton titulo="Pedir un enlace nuevo" alto={50} onPress={() => router.replace("/recuperar-clave")} />
          <Text style={{ textAlign: "center" }}>
            <EnlaceAcceso titulo="Volver a iniciar sesión" onPress={() => router.replace("/login")} />
          </Text>
        </TarjetaAcceso>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso>
      <TarjetaAcceso
        titulo="Crea tu nueva contraseña"
        subtitulo="Usa mínimo 8 caracteres y evita datos fáciles de adivinar, como tu nombre o tu correo."
      >
        <Campo etiqueta="Nueva contraseña" obligatorio clave value={clave} onChangeText={setClave} autoComplete="new-password" error={errores.password} />
        <Campo etiqueta="Confirmar contraseña" obligatorio clave value={confirmacion} onChangeText={setConfirmacion} error={errores.confirmacion} />
        <AvisoAcceso>{errorGeneral}</AvisoAcceso>
        <Boton titulo="Guardar contraseña" textoCargando="Guardando…" alto={50} cargando={enviando} onPress={() => enviar(clave, confirmacion)} />
      </TarjetaAcceso>
    </PantallaAcceso>
  );
}
