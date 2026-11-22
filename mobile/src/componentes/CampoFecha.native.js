import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Text } from "./Texto";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { colores } from "../tema";
import { diaLegibleConAnio, esFechaISO, fechaLocalDeISO, isoDeFechaLocal } from "../utils/fechas";
import { Dialogo, Enlace } from "./formulario";
import { Boton, estilos } from "./ui";

// Campo de fecha con el calendario del teléfono (@react-native-community/datetimepicker).
// Recibe y entrega "AAAA-MM-DD", como el API. En Android abre el diálogo del sistema;
// en iOS, un calendario dentro de una ventana con "Listo".
//   minimo / maximo: "AAAA-MM-DD" (los días fuera del rango no se pueden tocar)
//   opcional: muestra "Quitar" para dejar la fecha vacía
export function CampoFecha({ etiqueta, value, onChangeText, error, placeholder, minimo, maximo, opcional = false, deshabilitado = false }) {
  const [abierto, setAbierto] = useState(false);
  const [temporal, setTemporal] = useState(null);
  const valida = esFechaISO(value);
  const limites = {
    minimumDate: esFechaISO(minimo) ? fechaLocalDeISO(minimo) : undefined,
    maximumDate: esFechaISO(maximo) ? fechaLocalDeISO(maximo) : undefined,
  };
  const textoVacio = esFechaISO(placeholder) ? diaLegibleConAnio(placeholder) : placeholder ?? "Elige la fecha";
  const texto = valida ? diaLegibleConAnio(value) : textoVacio;

  function inicial() {
    if (valida) return fechaLocalDeISO(value);
    const hoy = new Date();
    if (limites.minimumDate && limites.minimumDate > hoy) return limites.minimumDate;
    if (limites.maximumDate && limites.maximumDate < hoy) return limites.maximumDate;
    return hoy;
  }

  function abrir() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: inicial(),
        mode: "date",
        ...limites,
        onChange: (evento, fecha) => {
          if (evento.type === "set" && fecha) onChangeText(isoDeFechaLocal(fecha));
        },
      });
      return;
    }
    setTemporal(inicial());
    setAbierto(true);
  }

  return (
    <View style={estilos.campo}>
      {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${etiqueta ?? "Fecha"}: ${valida ? texto : "sin elegir"}`}
          accessibilityHint="Abre el calendario"
          disabled={deshabilitado}
          onPress={abrir}
          style={[
            estilos.input,
            { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
            error && estilos.inputError,
            deshabilitado && { opacity: 0.5 },
          ]}
        >
          <Text style={{ flex: 1, fontSize: 16, color: valida ? colores.texto : colores.textoTenue }}>{texto}</Text>
          <Text style={{ color: colores.textoSuave, fontSize: 16 }}>📅</Text>
        </Pressable>
        {opcional && value ? <Enlace titulo="Quitar" onPress={() => onChangeText("")} /> : null}
      </View>
      {error ? <Text style={estilos.errorCampo}>{error}</Text> : null}

      {Platform.OS === "ios" ? (
        <Dialogo visible={abierto} titulo={etiqueta ?? "Fecha"} onCerrar={() => setAbierto(false)}>
          {temporal ? (
            <DateTimePicker
              value={temporal}
              mode="date"
              display="inline"
              locale="es-CO"
              themeVariant="light"
              accentColor={colores.tinta}
              {...limites}
              onChange={(_evento, fecha) => fecha && setTemporal(fecha)}
            />
          ) : null}
          <Boton
            titulo="Listo"
            onPress={() => {
              setAbierto(false);
              if (temporal) onChangeText(isoDeFechaLocal(temporal));
            }}
          />
        </Dialogo>
      ) : null}
    </View>
  );
}
