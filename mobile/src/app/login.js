import { useState } from "react";
import { View } from "react-native";
import { Text } from "../componentes/Texto";
import { Redirect, router } from "expo-router";
import { recuperarClaveActiva } from "../compartido/utils/recuperarClave";
import { Divisor, EnlaceAcceso, PantallaAcceso, Pildora, PieAcceso, TarjetaAcceso } from "../componentes/Acceso";
import { Boton, Campo, estilos } from "../componentes/ui";
import { useSesion } from "../sesion/Sesion";
import { colores } from "../tema";
import { mensajeDeError } from "../utils/errores";

// Igual que Login.jsx de la web en el teléfono: logo, frase y la tarjeta para entrar.
const MSG_MUCHOS_INTENTOS = "Hiciste muchos intentos seguidos. Espera un minuto y vuelve a intentarlo.";

export default function Login() {
  const { estado, entrar } = useSesion();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  if (estado === "con-sesion") return <Redirect href="/" />;

  async function enviar() {
    const faltan = {};
    if (!usuario.trim()) faltan.usuario = "Ingresa tu usuario o correo.";
    if (!clave) faltan.clave = "Ingresa tu contraseña.";
    setErrores(faltan);
    if (Object.keys(faltan).length) return;

    setEnviando(true);
    try {
      await entrar(usuario, clave);
      router.replace("/");
    } catch (error) {
      if (error?.status === 429) setErrores({ clave: MSG_MUCHOS_INTENTOS });
      else if (error?.status === 400 || error?.status === 401) setErrores({ clave: "Usuario o contraseña incorrectos." });
      // Sin conexión o servidor caído: no es culpa de la contraseña.
      else setErrores({ clave: mensajeDeError(error).general || "No pudimos hablar con el servidor. Intenta de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PantallaAcceso>
      <View style={{ gap: 16 }}>
        <Pildora>Gestión de eventos y salones · Cartagena</Pildora>
        <Text style={{ fontSize: 36, fontWeight: "800", lineHeight: 38, letterSpacing: -1.4, color: colores.texto }} accessibilityRole="header">
          Todo el evento, en <Text style={{ backgroundColor: colores.durazno }}> una sola vista </Text>.
        </Text>
      </View>

      <TarjetaAcceso titulo="Inicia sesión" subtitulo="Accede a tu panel de gestión de eventos y salones.">
        <Campo
          etiqueta="Usuario o correo electrónico"
          obligatorio
          value={usuario}
          onChangeText={setUsuario}
          placeholder="nombre@empresa.com"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          keyboardType="email-address"
          returnKeyType="next"
          error={errores.usuario}
        />
        <Campo
          etiqueta="Contraseña"
          obligatorio
          clave
          extra={recuperarClaveActiva() ? <EnlaceAcceso pequeno titulo="¿La olvidaste?" onPress={() => router.push("/recuperar-clave")} /> : null}
          value={clave}
          onChangeText={setClave}
          placeholder="••••••••"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={enviar}
          error={errores.clave}
        />
        <Boton titulo="Iniciar sesión" textoCargando="Ingresando…" alto={50} onPress={enviar} cargando={enviando} />
        {enviando ? (
          <Text style={[estilos.textoSuave, { textAlign: "center", fontSize: 13 }]}>
            Si el servidor estaba inactivo, la primera vez puede tardar hasta un minuto.
          </Text>
        ) : null}
        <Divisor />
        <PieAcceso texto="¿Aún no tienes cuenta?" enlace="Regístrate aquí" onPress={() => router.push("/registro")} />
      </TarjetaAcceso>
    </PantallaAcceso>
  );
}
