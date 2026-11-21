import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { registrarCliente } from "../compartido/api/auth";
import { ACCOUNT_TYPES, INITIAL_FORM, validarCampo } from "../compartido/pages/registro/camposRegistro";
import { MAX_PASSWORD, limpiarDocumento, limpiarTelefono, quitarEspacios } from "../compartido/utils/validacionesRegistro";
import { Segmento } from "../componentes/formulario";
import { Aviso, Boton, Campo, estilos } from "../componentes/ui";

// Mismos campos y validaciones que la web (Registrar.jsx): la cuenta queda como cliente.
const CAMPO_API = {
  identificacion: { natural: "documentId", empresa: "taxId" },
  email: { natural: "emailNatural", empresa: "emailEmpresa" },
  razon_social: { natural: "companyName", empresa: "companyName" },
  nombre: { natural: "fullName", empresa: "contactName" },
  password: { natural: "password", empresa: "password" },
  telefono: { natural: "phoneNatural", empresa: "phoneEmpresa" },
};

const TECLADO = { email: "email-address", tel: "phone-pad" };

export default function Registro() {
  const [tipo, setTipo] = useState("natural");
  const [form, setForm] = useState(INITIAL_FORM);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const campos = ACCOUNT_TYPES[tipo].fields;

  function escribir(campo, valor) {
    const limpio = campo.filtro ? campo.filtro(valor) : valor;
    setForm((f) => ({ ...f, [campo.name]: limpio }));
    if (errores[campo.name]) setErrores((e) => ({ ...e, [campo.name]: undefined }));
  }

  async function registrar() {
    const nombres = [...campos.map((c) => c.name), "password", "confirmPassword"];
    const locales = {};
    for (const n of nombres) {
      const error = validarCampo(n, form, tipo);
      if (error) locales[n] = error;
    }
    setErrores(locales);
    if (Object.keys(locales).length) return;

    const natural = tipo === "natural";
    setEnviando(true);
    try {
      await registrarCliente({
        tipo: natural ? "natural" : "juridica",
        nombre: quitarEspacios(natural ? form.fullName : form.contactName),
        identificacion: limpiarDocumento(natural ? form.documentId : form.taxId),
        telefono: limpiarTelefono(natural ? form.phoneNatural : form.phoneEmpresa),
        email: (natural ? form.emailNatural : form.emailEmpresa).trim().toLowerCase(),
        password: form.password,
        razonSocial: quitarEspacios(form.companyName),
      });
      setListo(true);
    } catch (err) {
      if (err.status === 429 || err.status === 0) {
        setErrores({ general: err.body?.detail || "No pudimos hablar con el servidor. Intenta de nuevo en un momento." });
        return;
      }
      const delApi = {};
      for (const [campo, mensajes] of Object.entries(err.body ?? {})) {
        const destino = CAMPO_API[campo]?.[tipo];
        if (destino) delApi[destino] = Array.isArray(mensajes) ? mensajes.join(" ") : String(mensajes);
      }
      if (!Object.keys(delApi).length) {
        delApi.general = err.body?.detail || "No se pudo crear la cuenta. Verifica los datos e intenta de nuevo.";
      }
      setErrores(delApi);
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <View style={[estilos.pantalla, estilos.centro]}>
        <Text style={estilos.titulo}>¡Cuenta creada!</Text>
        <Text style={[estilos.subtitulo, { textAlign: "center" }]}>Ya puedes entrar con tu correo y tu contraseña.</Text>
        <Boton titulo="Ir a iniciar sesión" onPress={() => router.replace("/login")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={estilos.subtitulo}>Crea tu cuenta de cliente para ver tus cotizaciones y eventos.</Text>
        <Segmento
          opciones={Object.entries(ACCOUNT_TYPES).map(([valor, t]) => ({ valor, etiqueta: t.label }))}
          valor={tipo}
          onCambiar={(t) => {
            setTipo(t);
            setErrores({});
          }}
        />
        <Aviso texto={errores.general} />
        {campos.map((c) => (
          <Campo
            key={c.name}
            etiqueta={c.label}
            value={form[c.name]}
            onChangeText={(v) => escribir(c, v)}
            placeholder={c.placeholder}
            maxLength={c.maxLength}
            keyboardType={c.inputMode === "numeric" ? "number-pad" : TECLADO[c.type] ?? "default"}
            autoCapitalize={c.type === "email" ? "none" : "sentences"}
            autoCorrect={false}
            error={errores[c.name]}
          />
        ))}
        <Campo
          etiqueta="Contraseña"
          value={form.password}
          onChangeText={(v) => escribir({ name: "password" }, v)}
          secureTextEntry
          maxLength={MAX_PASSWORD}
          autoComplete="new-password"
          error={errores.password}
        />
        <Campo
          etiqueta="Confirma la contraseña"
          value={form.confirmPassword}
          onChangeText={(v) => escribir({ name: "confirmPassword" }, v)}
          secureTextEntry
          maxLength={MAX_PASSWORD}
          error={errores.confirmPassword}
        />
        <Boton titulo="Crear cuenta" onPress={registrar} cargando={enviando} />
        <Boton titulo="Ya tengo cuenta" variante="secundario" onPress={() => router.replace("/login")} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
