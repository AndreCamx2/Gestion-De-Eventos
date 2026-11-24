import { useState } from "react";
import { FlatList, View } from "react-native";
import { Text, TextInput } from "../componentes/Texto";
import { actualizarUsuario, darDeBajaUsuario } from "../compartido/api/usuarios";
import { useUsuarios } from "../compartido/pages/usuarios/useUsuarios";
import {
  bloqueoDeBaja,
  erroresUsuario,
  formEdicion,
  fortaleza,
  mensajeError,
  nombreCompleto,
  nombreRol,
  payloadEdicion,
  ultimoAcceso,
  validarEdicion,
} from "../compartido/pages/usuarios/usuarios";
import { Confirmar, Dialogo, Interruptor, Segmento, Selector } from "../componentes/formulario";
import { Cabecera, Aviso, Boton, Campo, Cargando, Tarjeta, Vacio, estilos } from "../componentes/ui";
import RequiereRol from "../sesion/RequiereRol";
import { colores } from "../tema";

const sinEvento = { preventDefault() {} };

// Casillas de venues: el usuario solo ve los datos de los venues que tenga.
function SitiosElegibles({ sitios, elegidos, onAlternar, error }) {
  if (!sitios.length) return <Text style={estilos.textoSuave}>No hay venues para asignar.</Text>;
  return (
    <View style={{ gap: 4 }}>
      <Text style={estilos.etiqueta}>Venues</Text>
      {sitios.map((s) => (
        <Interruptor key={s.id} etiqueta={s.nombre} valor={elegidos.includes(String(s.id))} onCambiar={() => onAlternar(s.id)} />
      ))}
      {error ? <Text style={estilos.errorCampo}>{error}</Text> : null}
    </View>
  );
}

function CamposNombre({ form, errores, cambiar }) {
  return (
    <>
      <Campo etiqueta="Nombre" value={form.first_name} onChangeText={(v) => cambiar("first_name", v)} error={errores.first_name} />
      <Campo etiqueta="Apellido" value={form.last_name} onChangeText={(v) => cambiar("last_name", v)} error={errores.last_name} />
    </>
  );
}

function DialogoNuevo({ u, alCerrar }) {
  const nivel = fortaleza(u.nuevo.password, u.nuevo);
  return (
    <Dialogo visible titulo="Nuevo usuario" onCerrar={alCerrar}>
      <Aviso texto={u.errorNuevo} />
      <Aviso tipo="exito" texto={u.aviso} />
      <Selector
        etiqueta="Rol"
        valor={u.nuevo.rol}
        opciones={u.roles.map((r) => ({ valor: String(r.id), etiqueta: r.nombre }))}
        onCambiar={(v) => u.cambiarNuevo("rol", v)}
        error={u.erroresNuevo.rol}
      />
      <CamposNombre form={u.nuevo} errores={u.erroresNuevo} cambiar={u.cambiarNuevo} />
      <Campo
        etiqueta="Nombre de usuario"
        value={u.nuevo.username}
        onChangeText={(v) => u.cambiarNuevo("username", v)}
        autoCapitalize="none"
        autoCorrect={false}
        error={u.erroresNuevo.username}
      />
      <Campo
        etiqueta="Correo"
        value={u.nuevo.email}
        onChangeText={(v) => u.cambiarNuevo("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        error={u.erroresNuevo.email}
      />
      <Campo
        etiqueta="Contraseña temporal"
        value={u.nuevo.password}
        onChangeText={(v) => u.cambiarNuevo("password", v)}
        clave
        error={u.erroresNuevo.password}
      />
      {!u.erroresNuevo.password ? <Text style={[estilos.textoSuave, nivel.nivel >= 4 && { color: colores.exito }]}>{nivel.texto}</Text> : null}
      <SitiosElegibles sitios={u.sitios} elegidos={u.nuevo.sitios} onAlternar={u.alternarSitioNuevo} error={u.erroresNuevo.sitios} />
      <Boton titulo="Crear usuario" cargando={u.creando} onPress={() => u.crear(sinEvento)} />
    </Dialogo>
  );
}

function DialogoEditar({ usuario, roles, sitios, esYo, bloqueo, alGuardar, alCambiarEstado, alCerrar }) {
  const [form, setForm] = useState(formEdicion(usuario));
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function cambiar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  }

  function alternar(id) {
    const valor = String(id);
    cambiar("sitios", form.sitios.includes(valor) ? form.sitios.filter((s) => s !== valor) : [...form.sitios, valor]);
  }

  async function guardar() {
    setGeneral(null);
    const locales = validarEdicion(form);
    setErrores(locales);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try {
      const actualizado = await actualizarUsuario(usuario.id, payloadEdicion(form, usuario, { esYo }));
      alGuardar({ ...usuario, ...actualizado }, "Cambios guardados.");
    } catch (e) {
      if (e.status === 400) {
        const r = erroresUsuario(e.body);
        setErrores(r.campos);
        setGeneral(r.general);
      } else {
        setGeneral(mensajeError(e.status, "editar usuarios"));
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialogo visible titulo={`Editar ${usuario.username}`} onCerrar={alCerrar}>
      <Aviso texto={general} />
      <Selector
        etiqueta="Rol"
        valor={form.rol}
        opciones={roles.map((r) => ({ valor: String(r.id), etiqueta: r.nombre }))}
        onCambiar={(v) => cambiar("rol", v)}
        deshabilitado={esYo}
        error={errores.rol}
      />
      {esYo ? <Text style={estilos.textoSuave}>No puedes cambiar tu propio rol.</Text> : null}
      <CamposNombre form={form} errores={errores} cambiar={cambiar} />
      <Campo
        etiqueta="Correo"
        value={form.email}
        onChangeText={(v) => cambiar("email", v)}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errores.email}
      />
      <SitiosElegibles sitios={sitios} elegidos={form.sitios} onAlternar={alternar} error={errores.sitios} />
      <Boton titulo="Guardar cambios" cargando={guardando} onPress={guardar} />
      <Boton
        titulo={usuario.is_active ? "Dar de baja" : "Reactivar"}
        variante={usuario.is_active ? "peligro" : "secundario"}
        deshabilitado={Boolean(bloqueo)}
        onPress={alCambiarEstado}
      />
      {bloqueo ? <Text style={estilos.textoSuave}>{bloqueo}</Text> : null}
    </Dialogo>
  );
}

function Usuarios() {
  const u = useUsuarios();
  const [nuevoAbierto, setNuevoAbierto] = useState(false);
  const [estadoError, setEstadoError] = useState(null);
  const [procesando, setProcesando] = useState(false);

  async function cambiarEstado(usuario) {
    setProcesando(true);
    setEstadoError(null);
    try {
      const actualizado = usuario.is_active
        ? (await darDeBajaUsuario(usuario.id), { ...usuario, is_active: false })
        : await actualizarUsuario(usuario.id, { is_active: true });
      u.alActualizar({ ...usuario, ...actualizado }, usuario.is_active ? "Usuario dado de baja: ya no puede entrar." : "Usuario reactivado.");
    } catch (e) {
      setEstadoError(e.status === 400 ? erroresUsuario(e.body).general : mensajeError(e.status, "cambiar el estado de usuarios"));
    } finally {
      setProcesando(false);
    }
  }

  if (u.cargando && !u.usuarios.length) return <Cargando texto="Cargando usuarios…" />;

  const filtros = [{ valor: "todos", etiqueta: "Todos" }, ...u.roles.map((r) => ({ valor: r.codigo, etiqueta: r.nombre }))];
  const dialogo = u.dialogo;

  return (
    <>
      <FlatList
        style={estilos.pantalla}
        contentContainerStyle={estilos.contenido}
        data={u.visibles}
        keyExtractor={(x) => String(x.id)}
        refreshing={u.cargando}
        onRefresh={u.cargar}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <Cabecera
              antetitulo="Administración"
              titulo="Usuarios internos"
              subtitulo="Administradores y proveedores. Los clientes se gestionan desde Clientes."
            />
            <Boton titulo="Nuevo usuario" onPress={() => setNuevoAbierto(true)} />
            {!nuevoAbierto ? <Aviso tipo="exito" texto={u.aviso} /> : null}
            {u.errorCarga ? <Aviso texto={mensajeError(u.errorCarga === "permiso" ? 403 : 500, "ver usuarios")} /> : null}
            <TextInput
              value={u.busqueda}
              onChangeText={u.setBusqueda}
              placeholder="Buscar por nombre, usuario o correo"
              style={estilos.input}
              autoCorrect={false}
              accessibilityLabel="Buscar usuarios"
            />
            <Segmento opciones={filtros} valor={u.filtroRol} onCambiar={u.setFiltroRol} />
            <Interruptor etiqueta="Ver también los dados de baja" valor={u.mostrarInactivos} onCambiar={u.setMostrarInactivos} />
          </View>
        }
        ListEmptyComponent={u.errorCarga ? null : <Vacio titulo="Sin usuarios" texto="No hay usuarios con estos filtros." />}
        renderItem={({ item: x }) => (
          <Tarjeta accessibilityLabel={`Usuario ${x.username}`} onPress={() => u.abrirDialogo("editar", x)}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text style={[estilos.textoFuerte, { flex: 1 }]}>
                {nombreCompleto(x)}
                {x.id === u.yoId ? " (tú)" : ""}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: x.is_active ? colores.textoSuave : colores.mandarinaTexto }}>
                {x.is_active ? nombreRol(x, u.roles) : "De baja"}
              </Text>
            </View>
            <Text style={estilos.textoSuave}>
              {x.username} · {x.email || "sin correo"}
            </Text>
            <Text style={[estilos.textoSuave, { fontSize: 12 }]}>Último acceso: {ultimoAcceso(x.last_login)}</Text>
          </Tarjeta>
        )}
      />

      {nuevoAbierto ? <DialogoNuevo u={u} alCerrar={() => setNuevoAbierto(false)} /> : null}

      {dialogo?.tipo === "editar" ? (
        <DialogoEditar
          usuario={dialogo.usuario}
          roles={u.roles}
          sitios={u.sitios}
          esYo={dialogo.usuario.id === u.yoId}
          bloqueo={dialogo.usuario.is_active ? bloqueoDeBaja(dialogo.usuario, u.yoId) : null}
          alGuardar={u.alActualizar}
          alCambiarEstado={() => u.abrirDialogo("estado", dialogo.usuario)}
          alCerrar={u.cerrarDialogo}
        />
      ) : null}
      {dialogo?.tipo === "estado" ? (
        <Confirmar
          visible
          titulo={dialogo.usuario.is_active ? "Dar de baja" : "Reactivar"}
          texto={
            dialogo.usuario.is_active
              ? `${dialogo.usuario.username} ya no podrá entrar. Su historial se conserva.`
              : `${dialogo.usuario.username} podrá volver a entrar.`
          }
          textoAccion={dialogo.usuario.is_active ? "Dar de baja" : "Reactivar"}
          peligro={dialogo.usuario.is_active}
          cargando={procesando}
          error={estadoError}
          onAceptar={() => cambiarEstado(dialogo.usuario)}
          onCerrar={() => {
            setEstadoError(null);
            u.cerrarDialogo();
          }}
        />
      ) : null}
    </>
  );
}

export default function PantallaUsuarios() {
  return (
    <RequiereRol rol="administrador">
      <Usuarios />
    </RequiereRol>
  );
}
