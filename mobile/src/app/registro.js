import { useEffect, useState } from "react";
import { View } from "react-native";
import { Text } from "../componentes/Texto";
import { router } from "expo-router";
import { registrarCliente } from "../compartido/api/auth";
import { ACCOUNT_TYPES, INITIAL_FORM, validarCampo } from "../compartido/pages/registro/camposRegistro";
import { MAX_PASSWORD, limpiarDocumento, limpiarTelefono, quitarEspacios } from "../compartido/utils/validacionesRegistro";
import { AvisoAcceso, PantallaAcceso, PieAcceso } from "../componentes/Acceso";
import { Casilla, OpcionesSegmentadas } from "../componentes/formulario";
import { Boton, Campo } from "../componentes/ui";
import { colores } from "../tema";

// Registrar.jsx de la web en el teléfono: logo y frase arriba, y el formulario completo.
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
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  // Como la web: avisa y a los 1,2 s lleva al inicio de sesión.
  useEffect(() => {
    if (!listo) return undefined;
    const espera = setTimeout(() => router.replace("/login"), 1200);
    return () => clearTimeout(espera);
  }, [listo]);

  const campos = ACCOUNT_TYPES[tipo].fields;

  function escribir(nombre, valor, filtro) {
    const limpio = filtro ? filtro(valor) : valor;
    const siguiente = { ...form, [nombre]: limpio };
    setForm(siguiente);
    setErrores((previos) => {
      const nuevos = { ...previos, general: null };
      if (previos[nombre]) nuevos[nombre] = validarCampo(nombre, siguiente, tipo);
      if (nombre === "password" && previos.confirmPassword) nuevos.confirmPassword = validarCampo("confirmPassword", siguiente, tipo);
      return nuevos;
    });
  }

  function alSalir(nombre) {
    if (!form[nombre]) return;
    setErrores((previos) => ({ ...previos, [nombre]: validarCampo(nombre, form, tipo) }));
  }

  async function registrar() {
    if (enviando) return;
    const nombres = [...campos.map((c) => c.name), "password", "confirmPassword"];
    const locales = {};
    for (const n of nombres) {
      const error = validarCampo(n, form, tipo);
      if (error) locales[n] = error;
    }
    if (!acepta) locales.acepta = "Debes autorizar el tratamiento de tus datos para crear la cuenta.";
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
      if (!err.status) {
        setErrores({ general: "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo." });
        return;
      }
      if (err.status === 429) {
        setErrores({ general: err.body?.detail || "Hiciste muchos intentos seguidos. Espera un momento." });
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

  return (
    <PantallaAcceso>
      <Text style={{ fontSize: 28, fontWeight: "800", lineHeight: 30, letterSpacing: -1.1, color: colores.texto, marginTop: -16 }}>
        Tu próximo evento empieza aquí.
      </Text>

      <View style={{ gap: 24 }}>
        <View>
          <Text style={{ fontSize: 30, fontWeight: "800", lineHeight: 33, letterSpacing: -1, color: colores.texto }} accessibilityRole="header">
            Crea tu cuenta
          </Text>
          <Text style={{ marginTop: 8, fontSize: 15, color: colores.textoSuave }}>
            Regístrate para solicitar cotizaciones y gestionar tus eventos.
          </Text>
        </View>

        <OpcionesSegmentadas
          etiqueta="Tipo de cuenta"
          opciones={Object.entries(ACCOUNT_TYPES).map(([valor, t]) => ({ valor, etiqueta: t.label }))}
          valor={tipo}
          onCambiar={(t) => {
            setTipo(t);
            setErrores({});
          }}
        />

        {listo ? <AvisoAcceso tipo="exito">Cuenta creada correctamente. Te llevamos al inicio de sesión…</AvisoAcceso> : null}
        <AvisoAcceso>{errores.general}</AvisoAcceso>

        <View style={{ gap: 16 }}>
          {campos.map((c) => (
            <Campo
              key={c.name}
              etiqueta={c.label}
              obligatorio
              value={form[c.name]}
              onChangeText={(v) => escribir(c.name, v, c.filtro)}
              onBlur={() => alSalir(c.name)}
              placeholder={c.placeholder}
              maxLength={c.maxLength}
              keyboardType={c.inputMode === "numeric" ? "number-pad" : TECLADO[c.type] ?? "default"}
              autoCapitalize={c.type === "email" ? "none" : "words"}
              autoCorrect={false}
              editable={!enviando}
              error={errores[c.name]}
            />
          ))}
          <Campo
            etiqueta="Contraseña"
            obligatorio
            clave
            value={form.password}
            onChangeText={(v) => escribir("password", v)}
            onBlur={() => alSalir("password")}
            placeholder="Mínimo 8, con letras y números"
            maxLength={MAX_PASSWORD}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!enviando}
            error={errores.password}
          />
          <Campo
            etiqueta="Confirmar contraseña"
            obligatorio
            clave
            value={form.confirmPassword}
            onChangeText={(v) => escribir("confirmPassword", v)}
            onBlur={() => alSalir("confirmPassword")}
            placeholder="Repite tu contraseña"
            maxLength={MAX_PASSWORD}
            autoComplete="new-password"
            editable={!enviando}
            error={errores.confirmPassword}
          />
        </View>

        <Casilla
          valor={acepta}
          onCambiar={(v) => {
            setAcepta(v);
            if (v) setErrores((e) => ({ ...e, acepta: null }));
          }}
          error={errores.acepta}
        >
          Autorizo el tratamiento de mis datos personales según la Ley 1581 de 2012.{" "}
          <Text style={{ color: colores.mandarinaTexto }}>*</Text>
        </Casilla>

        <Boton titulo="Crear mi cuenta" textoCargando="Creando cuenta…" alto={50} cargando={enviando} deshabilitado={listo} onPress={registrar} />
        <PieAcceso texto="¿Ya tienes cuenta?" enlace="Inicia sesión" onPress={() => router.replace("/login")} />
      </View>
    </PantallaAcceso>
  );
}
