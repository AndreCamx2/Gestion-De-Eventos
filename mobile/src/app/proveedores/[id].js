import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Text, TextInput } from "../../componentes/Texto";
import { useLocalSearchParams } from "expo-router";
import { historialStock } from "../../api/extras";
import { crearElementoStock, editarStock, listarProveedores, listarStock, vincularUsuarioProveedor } from "../../compartido/api/proveedores";
import { listarUsuarios } from "../../compartido/api/usuarios";
import {
  ELEMENTO_VACIO,
  MAX_NOMBRE_ELEMENTO,
  cambiosStock,
  erroresEdicionStock,
  erroresElemento,
  estaAgotado,
  fechaActualizado,
  filtrarStock,
  formDesdeElemento,
  payloadElemento,
  pesos,
  quedaAgotado,
  stockDe,
  usuariosLibres,
  validarEdicionStock,
  validarElemento,
  valorTotal,
} from "../../compartido/pages/proveedores/proveedores";
import { textoError } from "../../compartido/utils/erroresApi";
import HistorialStock from "../../componentes/HistorialStock";
import { Cifras, Dialogo, Seccion, Selector } from "../../componentes/formulario";
import { Cabecera, Aviso, Boton, Campo, Cargando, Tarjeta, Vacio, estilos } from "../../componentes/ui";
import { textoDeError } from "../../componentes/useCarga";
import RequiereRol from "../../sesion/RequiereRol";
import { colores } from "../../tema";

function DialogoElemento({ proveedor, elemento, alGuardar, alCerrar }) {
  const esNuevo = !elemento;
  const [form, setForm] = useState(esNuevo ? ELEMENTO_VACIO : formDesdeElemento(elemento));
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [historial, setHistorial] = useState(null);

  useEffect(() => {
    if (esNuevo) return;
    historialStock(elemento.id)
      .then(setHistorial)
      .catch(() => setHistorial([]));
  }, [esNuevo, elemento]);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  async function guardar() {
    setGeneral(null);
    const locales = esNuevo ? validarElemento(form) : validarEdicionStock(form);
    setErrores(locales);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try {
      if (esNuevo) {
        await crearElementoStock(payloadElemento(form, proveedor.id));
        alGuardar("Elemento agregado.");
      } else {
        const cambios = cambiosStock(form, elemento);
        if (!Object.keys(cambios).length) {
          alCerrar();
          return;
        }
        await editarStock(elemento.id, cambios);
        alGuardar("Stock actualizado.");
      }
    } catch (e) {
      if (e.status === 400) {
        const r = esNuevo ? erroresElemento(e.body) : erroresEdicionStock(e.body);
        setErrores(r.campos);
        setGeneral(r.general);
      } else {
        setGeneral(textoDeError(e));
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialogo visible titulo={esNuevo ? "Nuevo elemento" : elemento.nombre_elemento} onCerrar={alCerrar}>
      <Aviso texto={general} />
      {esNuevo ? (
        <Campo
          etiqueta="Nombre del elemento"
          value={form.nombre_elemento}
          onChangeText={(v) => cambiar("nombre_elemento", v)}
          maxLength={MAX_NOMBRE_ELEMENTO}
          placeholder="Ej.: Silla Tiffany"
          error={errores.nombre_elemento}
        />
      ) : null}
      <Campo etiqueta="Cantidad disponible" value={form.cantidad} onChangeText={(v) => cambiar("cantidad", v)} keyboardType="number-pad" error={errores.cantidad} />
      <Campo
        etiqueta="Valor por unidad (pesos)"
        value={form.valor}
        onChangeText={(v) => cambiar("valor", v.replace(",", "."))}
        keyboardType="decimal-pad"
        error={errores.valor}
      />
      {quedaAgotado(form) ? <Text style={{ color: colores.mandarinaTexto }}>Con cantidad 0 el elemento queda agotado.</Text> : null}
      <Boton titulo={esNuevo ? "Agregar" : "Guardar cambios"} cargando={guardando} onPress={guardar} />
      {!esNuevo ? <HistorialStock historial={historial} /> : null}
    </Dialogo>
  );
}

function DialogoAcceso({ proveedor, proveedores, alGuardar, alCerrar }) {
  const [usuarios, setUsuarios] = useState(null);
  const [elegido, setElegido] = useState(proveedor.usuario != null ? String(proveedor.usuario) : "");
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    listarUsuarios({ rol: "proveedor" })
      .then((lista) => setUsuarios(usuariosLibres(lista, proveedores, proveedor)))
      .catch(() => setError("No pudimos cargar los usuarios proveedor. Cierra y vuelve a intentarlo."));
  }, [proveedor, proveedores]);

  async function guardar() {
    const usuario = elegido === "" ? null : Number(elegido);
    if (usuario === (proveedor.usuario ?? null)) {
      alCerrar();
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await vincularUsuarioProveedor(proveedor.id, usuario);
      alGuardar(usuario ? "Usuario de acceso vinculado." : "Se quitó el usuario de acceso.");
    } catch (e) {
      setError(e.status === 400 ? textoError(e.body?.usuario ?? e.body?.detail ?? "El servidor no aceptó el cambio.") : textoDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialogo visible titulo="Usuario de acceso" onCerrar={alCerrar}>
      <Text style={estilos.subtitulo}>Quien entre con este usuario verá y actualizará el stock de {proveedor.nombre} en “Mi stock”.</Text>
      <Aviso texto={error} />
      {usuarios === null && !error ? <Cargando texto="Cargando usuarios…" /> : null}
      {usuarios ? (
        <Selector
          etiqueta="Usuario"
          valor={elegido}
          conVacio="Sin usuario de acceso"
          opciones={usuarios.map((u) => ({ valor: String(u.id), etiqueta: u.username, detalle: u.email }))}
          onCambiar={setElegido}
        />
      ) : null}
      {usuarios && !usuarios.length ? (
        <Text style={estilos.textoSuave}>No hay usuarios con rol proveedor libres. Créalo primero en Usuarios.</Text>
      ) : null}
      <Boton titulo="Guardar" cargando={guardando} deshabilitado={!usuarios} onPress={guardar} />
    </Dialogo>
  );
}

function DetalleProveedor() {
  const { id: param } = useLocalSearchParams();
  const id = Number(param);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null); // "nuevo" | elemento
  const [acceso, setAcceso] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [proveedores, stock] = await Promise.all([listarProveedores(), listarStock()]);
      const proveedor = proveedores.find((p) => p.id === id);
      if (!proveedor) throw Object.assign(new Error("No existe"), { status: 404 });
      setDatos({ proveedores, proveedor, stock: stockDe(stock, id) });
      setError(null);
    } catch (e) {
      setError(textoDeError(e));
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => filtrarStock(datos?.stock ?? [], busqueda), [datos, busqueda]);

  function alGuardar(mensaje) {
    setEditando(null);
    setAcceso(false);
    setExito(mensaje);
    cargar();
  }

  if (!datos && !error) return <Cargando />;
  if (!datos) {
    return (
      <View style={[estilos.pantalla, estilos.contenido]}>
        <Aviso texto={error} />
        <Boton titulo="Reintentar" variante="secundario" onPress={cargar} />
      </View>
    );
  }

  const { proveedor, stock } = datos;
  const agotados = stock.filter(estaAgotado).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={estilos.pantalla} contentContainerStyle={[estilos.contenido, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <Cabecera antetitulo="Proveedores" titulo={proveedor.nombre} />
        <Aviso texto={error} />
        <Aviso tipo="exito" texto={exito} />
        <Tarjeta>
          <Text style={estilos.textoSuave}>{proveedor.identificacion || "Sin identificación"}</Text>
          <Text style={estilos.textoSuave}>{proveedor.contacto || "Sin contacto"}</Text>
          <Text style={{ color: proveedor.usuario_nombre ? colores.exito : colores.mandarinaTexto, fontWeight: "700" }}>
            {proveedor.usuario_nombre ? `Acceso: ${proveedor.usuario_nombre}` : "Sin usuario de acceso"}
          </Text>
          <Boton titulo={proveedor.usuario_nombre ? "Cambiar usuario de acceso" : "Vincular usuario de acceso"} variante="secundario" onPress={() => setAcceso(true)} />
        </Tarjeta>

        <Cifras
          items={[
            { etiqueta: "Elementos", valor: String(stock.length), detalle: agotados ? `${agotados} agotados` : "Ninguno agotado" },
            { etiqueta: "Valor del inventario", valor: pesos(valorTotal(stock)) },
          ]}
        />

        <Seccion titulo="Stock">
          <Boton titulo="Agregar elemento" onPress={() => setEditando("nuevo")} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar elemento"
            style={estilos.input}
            autoCorrect={false}
            accessibilityLabel="Buscar elemento"
          />
          {visibles.length === 0 ? <Vacio titulo="Sin elementos" texto={busqueda ? "Nada coincide con la búsqueda." : "Este proveedor aún no tiene stock."} /> : null}
          {visibles.map((e) => (
            <Tarjeta key={e.id} accessibilityLabel={`${e.nombre_elemento}: ${e.cantidad} unidades`} onPress={() => setEditando(e)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text style={[estilos.textoFuerte, { flex: 1 }]}>{e.nombre_elemento}</Text>
                <Text style={estilos.textoFuerte}>{pesos(e.valor)}</Text>
              </View>
              <Text style={[estilos.textoSuave, estaAgotado(e) && { color: colores.mandarinaTexto }]}>
                {estaAgotado(e) ? "Agotado" : `${e.cantidad} ${Number(e.cantidad) === 1 ? "unidad" : "unidades"}`} · actualizado {fechaActualizado(e.actualizado_en)}
              </Text>
            </Tarjeta>
          ))}
        </Seccion>
      </ScrollView>

      {editando ? (
        <DialogoElemento
          proveedor={proveedor}
          elemento={editando === "nuevo" ? null : editando}
          alGuardar={alGuardar}
          alCerrar={() => setEditando(null)}
        />
      ) : null}
      {acceso ? <DialogoAcceso proveedor={proveedor} proveedores={datos.proveedores} alGuardar={alGuardar} alCerrar={() => setAcceso(false)} /> : null}
    </KeyboardAvoidingView>
  );
}

export default function PantallaProveedor() {
  return (
    <RequiereRol rol="administrador">
      <DetalleProveedor />
    </RequiereRol>
  );
}
