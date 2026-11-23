import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Text } from "../../componentes/Texto";
import { router, useLocalSearchParams } from "expo-router";
import { obtenerCliente } from "../../api/extras";
import { actualizarCliente, crearCliente, darDeBajaCliente, listarEmpresas, reactivarCliente } from "../../compartido/api/clientes";
import {
  FORM_VACIO,
  MAX_FORMA_PAGO,
  MAX_OBSERVACIONES,
  erroresDesdeApi,
  formDesdeCliente,
  nitDeEmpresa,
  payloadEdicion,
  validarCliente,
} from "../../compartido/pages/clientes/formularioCliente";
import { useNuevaEmpresa } from "../../compartido/pages/clientes/useNuevaEmpresa";
import { fechaCorta, numeroCotizacion } from "../../compartido/pages/cotizaciones/cotizaciones";
import { MAX_NOMBRE, filtrarDigitos, filtrarNit, filtrarTelefono, limpiarTelefono, quitarEspacios } from "../../compartido/utils/validacionesRegistro";
import { AreaTexto, Confirmar, Dialogo, Seccion, Segmento, Selector } from "../../componentes/formulario";
import { Cabecera, Aviso, Boton, Campo, Cargando, EtiquetaEstado, Tarjeta, estilos } from "../../componentes/ui";
import { textoDeError } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { estadoVisible } from "../../utils/estados";

const sinEvento = { preventDefault() {} };

const ordenar = (lista) => [...lista].sort((a, b) => a.razon_social.localeCompare(b.razon_social, "es"));

// Se monta al abrir: así el formulario arranca vacío cada vez.
function NuevaEmpresa({ alCrear, alCerrar }) {
  const e = useNuevaEmpresa({ onCreada: alCrear, onSesionVencida: alCerrar });
  const cambiar = (name) => (value) => e.cambiar({ target: { name, value: name === "identificacion" ? filtrarNit(value) : value } });
  return (
    <Dialogo visible titulo="Nueva empresa" onCerrar={alCerrar}>
      <Aviso texto={e.error} />
      <Campo etiqueta="Razón social" value={e.form.razon_social} onChangeText={cambiar("razon_social")} maxLength={MAX_NOMBRE} error={e.errores.razon_social} />
      <Campo
        etiqueta="NIT"
        value={e.form.identificacion}
        onChangeText={cambiar("identificacion")}
        keyboardType="number-pad"
        maxLength={12}
        placeholder="900123456-8"
        error={e.errores.identificacion}
      />
      <Campo etiqueta="Contacto (opcional)" value={e.form.contacto} onChangeText={cambiar("contacto")} error={e.errores.contacto} />
      <Campo
        etiqueta="Correo (opcional)"
        value={e.form.correo}
        onChangeText={cambiar("correo")}
        keyboardType="email-address"
        autoCapitalize="none"
        error={e.errores.correo}
      />
      <Selector
        etiqueta="Ciudad (opcional)"
        valor={e.form.ciudad}
        conVacio="Sin ciudad"
        opciones={e.ciudades.map((c) => ({ valor: String(c.id), etiqueta: c.nombre }))}
        onCambiar={cambiar("ciudad")}
        error={e.errores.ciudad}
      />
      <Boton titulo="Crear empresa" cargando={e.guardando} onPress={() => e.guardar(sinEvento)} />
    </Dialogo>
  );
}

function FormCliente() {
  const { id } = useLocalSearchParams();
  const esNuevo = id === "nuevo";
  const [cliente, setCliente] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [exito, setExito] = useState(null);
  const [inactivo, setInactivo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [empresaAbierta, setEmpresaAbierta] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [lista, datos] = await Promise.all([listarEmpresas(), esNuevo ? null : obtenerCliente(id)]);
      setEmpresas(ordenar(lista));
      if (datos) {
        setCliente(datos);
        setForm(formDesdeCliente(datos));
      }
    } catch (e) {
      setErrorCarga(textoDeError(e));
    } finally {
      setCargando(false);
    }
  }, [esNuevo, id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  async function guardar() {
    setGeneral(null);
    setExito(null);
    setInactivo(null);
    const locales = validarCliente(form, { esCrear: esNuevo });
    setErrores(locales);
    if (Object.keys(locales).length) return;

    const limpio = {
      ...form,
      nombre: quitarEspacios(form.nombre),
      telefono: form.telefono.trim() ? limpiarTelefono(form.telefono) : "",
      correo: form.correo.trim().toLowerCase(),
    };
    setGuardando(true);
    try {
      if (esNuevo) {
        const creado = await crearCliente({ ...limpio, empresa: limpio.empresa ? Number(limpio.empresa) : undefined });
        router.replace({ pathname: "/clientes/[id]", params: { id: creado.id } });
      } else {
        await actualizarCliente(id, payloadEdicion(limpio));
        setExito("Cambios guardados.");
        await cargar();
      }
    } catch (e) {
      if (e.status === 400) {
        const r = erroresDesdeApi(e.body);
        const { cliente_inactivo: idInactivo, ...campos } = r.campos;
        setErrores(campos);
        setGeneral(r.general);
        if (idInactivo != null) setInactivo(Number(idInactivo));
      } else {
        setGeneral(textoDeError(e, "Solo un administrador puede editar clientes."));
      }
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarActivo(activar) {
    setProcesando(true);
    setGeneral(null);
    try {
      await (activar ? reactivarCliente(id) : darDeBajaCliente(id));
      setConfirmarBaja(false);
      setExito(activar ? "Cliente reactivado." : "Cliente dado de baja.");
      await cargar();
    } catch (e) {
      setGeneral(textoDeError(e));
    } finally {
      setProcesando(false);
    }
  }

  if (cargando && !cliente && !empresas.length) return <Cargando />;
  if (errorCarga && !cliente && !esNuevo) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Aviso texto={errorCarga} />
        <Boton titulo="Reintentar" variante="secundario" onPress={cargar} />
      </View>
    );
  }

  const juridica = form.tipo === "juridica";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={estilos.pantalla} contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <Cabecera antetitulo="Clientes" titulo={esNuevo ? "Nuevo cliente" : cliente?.nombre ?? "Cliente"} />
        <Aviso texto={general} />
        <Aviso tipo="exito" texto={exito} />
        {inactivo ? (
          <Tarjeta>
            <Text style={estilos.textoFuerte}>Ya existe un cliente dado de baja con esa identificación.</Text>
            <Boton titulo="Ver y reactivar" variante="secundario" onPress={() => router.replace({ pathname: "/clientes/[id]", params: { id: inactivo } })} />
          </Tarjeta>
        ) : null}
        {cliente && cliente.activo === false ? (
          <Tarjeta>
            <Text style={estilos.textoFuerte}>Este cliente está dado de baja.</Text>
            <Boton titulo="Reactivar" cargando={procesando} onPress={() => cambiarActivo(true)} />
          </Tarjeta>
        ) : null}

        <Segmento
          opciones={[
            { valor: "natural", etiqueta: "Persona natural" },
            { valor: "juridica", etiqueta: "Persona jurídica" },
          ]}
          valor={form.tipo}
          onCambiar={(v) => cambiar("tipo", v)}
        />
        <Campo
          etiqueta={juridica ? "Nombre del contacto" : "Nombre completo"}
          value={form.nombre}
          onChangeText={(v) => cambiar("nombre", v)}
          maxLength={MAX_NOMBRE}
          error={errores.nombre}
        />
        {!juridica ? (
          <Campo
            etiqueta="Cédula"
            value={form.identificacion}
            onChangeText={(v) => cambiar("identificacion", filtrarDigitos(v))}
            keyboardType="number-pad"
            maxLength={10}
            error={errores.identificacion}
          />
        ) : null}
        <Selector
          etiqueta={juridica ? "Empresa" : "Empresa (opcional)"}
          valor={form.empresa}
          conVacio={juridica ? undefined : "Sin empresa"}
          opciones={empresas.map((e) => ({ valor: String(e.id), etiqueta: e.razon_social, detalle: `NIT ${e.identificacion}` }))}
          onCambiar={(v) => cambiar("empresa", v)}
          placeholder="Elige la empresa"
          error={errores.empresa}
        />
        {juridica && form.empresa ? <Text style={estilos.textoSuave}>NIT {nitDeEmpresa(empresas, form.empresa)}</Text> : null}
        <Boton titulo="Crear una empresa nueva" variante="secundario" onPress={() => setEmpresaAbierta(true)} />
        <Campo
          etiqueta="Teléfono (opcional)"
          value={form.telefono}
          onChangeText={(v) => cambiar("telefono", filtrarTelefono(v))}
          keyboardType="phone-pad"
          maxLength={16}
          error={errores.telefono}
        />
        <Campo
          etiqueta="Correo (opcional)"
          value={form.correo}
          onChangeText={(v) => cambiar("correo", v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errores.correo}
        />
        <Campo
          etiqueta="Forma de pago (opcional)"
          value={form.forma_pago}
          onChangeText={(v) => cambiar("forma_pago", v)}
          maxLength={MAX_FORMA_PAGO}
          error={errores.forma_pago}
        />
        <AreaTexto
          etiqueta="Observaciones internas (opcional)"
          value={form.observaciones_internas}
          onChangeText={(v) => cambiar("observaciones_internas", v)}
          maxLength={MAX_OBSERVACIONES}
          error={errores.observaciones_internas}
        />
        <Boton titulo={esNuevo ? "Crear cliente" : "Guardar cambios"} cargando={guardando} onPress={guardar} />
        {cliente && cliente.activo !== false ? (
          <Boton titulo="Dar de baja" variante="peligro" onPress={() => setConfirmarBaja(true)} />
        ) : null}

        {cliente?.cotizaciones?.length ? (
          <Seccion titulo="Cotizaciones del cliente">
            {cliente.cotizaciones.map((q) => (
              <Tarjeta
                key={q.id}
                accessibilityLabel={`Cotización ${numeroCotizacion(q.id)}`}
                onPress={() => router.push({ pathname: "/cotizacion/[id]", params: { id: q.id } })}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Text style={estilos.textoFuerte}>
                    {numeroCotizacion(q.id)} · {fechaCorta(q.fecha_evento)}
                  </Text>
                  <EtiquetaEstado estado={estadoVisible(q)} />
                </View>
                <Text style={estilos.textoSuave}>
                  {[q.salon_nombre, q.cantidad_personas ? `${q.cantidad_personas} personas` : null].filter(Boolean).join(" · ")}
                </Text>
              </Tarjeta>
            ))}
          </Seccion>
        ) : null}
      </ScrollView>

      {empresaAbierta ? (
        <NuevaEmpresa
          alCerrar={() => setEmpresaAbierta(false)}
          alCrear={(nueva) => {
            setEmpresas((lista) => ordenar([...lista, nueva]));
            cambiar("empresa", String(nueva.id));
            setEmpresaAbierta(false);
            setExito("Empresa creada.");
          }}
        />
      ) : null}
      <Confirmar
        visible={confirmarBaja}
        titulo="Dar de baja"
        texto="El cliente deja de aparecer al cotizar. Su historial se conserva y puedes reactivarlo."
        textoAccion="Dar de baja"
        peligro
        cargando={procesando}
        onAceptar={() => cambiarActivo(false)}
        onCerrar={() => setConfirmarBaja(false)}
      />
    </KeyboardAvoidingView>
  );
}

export default function PantallaCliente() {
  return (
    <RequiereRol rol="administrador">
      <FormCliente />
    </RequiereRol>
  );
}
