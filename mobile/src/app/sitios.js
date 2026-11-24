import { useState } from "react";
import { FlatList, View } from "react-native";
import { Text } from "../componentes/Texto";
import { listarConceptos } from "../compartido/api/conceptos";
import { listarSalones } from "../compartido/api/salones";
import { crearSitio, listarCiudades, listarSitios } from "../compartido/api/sitios";
import { plural } from "../compartido/pages/inicio/inicio";
import { contarPorSitio } from "../compartido/pages/sitios/conteos";
import { erroresDesdeApi } from "../compartido/utils/erroresApi";
import { quitarEspacios, validarNombreCosa } from "../compartido/utils/validacionesRegistro";
import { Dialogo, Selector } from "../componentes/formulario";
import { Cabecera, Aviso, Boton, Campo, Cargando, Tarjeta, Vacio, estilos } from "../componentes/ui";
import { textoDeError, useCarga } from "../componentes/useCarga";
import RequiereRol from "../sesion/RequiereRol";

function Sitios() {
  const { datos, error, cargando, recargando, recargar } = useCarga(async () => {
    const [sitios, ciudades, salones, conceptos] = await Promise.all([listarSitios(), listarCiudades(), listarSalones(), listarConceptos()]);
    return {
      sitios: [...sitios].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      ciudades,
      conteos: contarPorSitio(sitios, { salones, conceptos, usuarios: null }),
    };
  });
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", ciudad: "" });
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState(null);
  const [exito, setExito] = useState(null);
  const [guardando, setGuardando] = useState(false);

  async function crear() {
    setGeneral(null);
    const locales = {
      nombre: nuevo.nombre.trim() ? validarNombreCosa(nuevo.nombre) : "Escribe el nombre del venue.",
      ciudad: nuevo.ciudad ? null : "Elige la ciudad.",
    };
    setErrores(locales);
    if (locales.nombre || locales.ciudad) return;
    setGuardando(true);
    try {
      await crearSitio({ nombre: quitarEspacios(nuevo.nombre), ciudad: Number(nuevo.ciudad) });
      setNuevo({ nombre: "", ciudad: "" });
      setAbierto(false);
      setExito("Venue creado.");
      await recargar();
    } catch (e) {
      if (e.status === 400) {
        const r = erroresDesdeApi(e.body, ["nombre", "ciudad"]);
        setErrores(r.campos);
        setGeneral(r.general);
      } else {
        setGeneral(textoDeError(e, "Solo un administrador puede crear venues."));
      }
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <Cargando texto="Cargando venues…" />;

  return (
    <>
      <FlatList
        style={estilos.pantalla}
        contentContainerStyle={estilos.contenido}
        data={datos?.sitios ?? []}
        keyExtractor={(s) => String(s.id)}
        refreshing={recargando}
        onRefresh={recargar}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <Cabecera antetitulo="Administración" titulo="Venues" subtitulo="Cada hotel o sede tiene sus propios salones, conceptos y precios." />
            <Boton titulo="Nuevo venue" onPress={() => setAbierto(true)} />
            <Aviso texto={error} />
            <Aviso tipo="exito" texto={exito} />
          </View>
        }
        ListEmptyComponent={error ? null : <Vacio titulo="Sin venues" texto="Todavía no tienes venues." />}
        renderItem={({ item: s }) => {
          const c = datos.conteos[s.id];
          return (
            <Tarjeta>
              <Text style={estilos.textoFuerte}>{s.nombre}</Text>
              <Text style={estilos.textoSuave}>{s.ciudad_nombre}</Text>
              <Text style={estilos.textoSuave}>
                {plural(c.salones, "salón", "salones")} · {plural(c.conceptos, "concepto activo", "conceptos activos")}
              </Text>
            </Tarjeta>
          );
        }}
      />
      <Dialogo visible={abierto} titulo="Nuevo venue" onCerrar={() => setAbierto(false)}>
        <Aviso texto={general} />
        <Campo
          etiqueta="Nombre"
          value={nuevo.nombre}
          onChangeText={(v) => setNuevo((n) => ({ ...n, nombre: v }))}
          placeholder="Hotel Caribe"
          error={errores.nombre}
        />
        <Selector
          etiqueta="Ciudad"
          valor={nuevo.ciudad}
          opciones={(datos?.ciudades ?? []).map((c) => ({ valor: String(c.id), etiqueta: c.nombre }))}
          onCambiar={(v) => setNuevo((n) => ({ ...n, ciudad: v }))}
          error={errores.ciudad}
        />
        <Boton titulo="Crear venue" cargando={guardando} onPress={crear} />
      </Dialogo>
    </>
  );
}

export default function PantallaSitios() {
  return (
    <RequiereRol rol="administrador">
      <Sitios />
    </RequiereRol>
  );
}
