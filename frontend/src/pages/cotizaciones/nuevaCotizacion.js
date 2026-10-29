import { erroresDesdeApi, textoError } from "../../utils/erroresApi";
import { dineroCompleto, fechaISO, hoyLocal, sumarDias } from "../../utils/inicioCifras";

export const DIAS_VIGENCIA = 15;
export const PASO_PERSONAS = 10;

export const CAMPOS_COTIZACION = [
  "cliente",
  "salon",
  "montaje",
  "tipo_evento",
  "fecha_evento",
  "cantidad_personas",
  "validez_oferta",
];

export const FORM_VACIO = {
  cliente: null,
  salon: null,
  montaje: null,
  tipo_evento: "",
  fecha_evento: "",
  cantidad_personas: "",
  validez_oferta: "",
};

export const ERRORES_VACIOS = { campos: {}, lineas: [], general: null, tipo: null };

export function comoLista(data) {
  return Array.isArray(data) ? data : data?.results ?? [];
}

export function hoyISO() {
  return fechaISO(hoyLocal());
}

export function iniciales(nombre) {
  const letras = String(nombre ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
  return letras || "?";
}

export function descripcionCliente(cliente) {
  // Al editar, el cliente viene del detalle de la cotización, que no trae el tipo.
  const tipo = cliente.tipo && (cliente.tipo === "juridica" ? "Jurídica" : "Natural");
  return [tipo, cliente.identificacion, cliente.correo].filter(Boolean).join(" · ");
}

const decimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

export function medidasSalon(salon) {
  if (!salon.ancho || !salon.altura) return null;
  return `${decimal.format(Number(salon.ancho))} × ${decimal.format(Number(salon.altura))} m`;
}

export function salonesConMontajes(salones, montajes, salonMontajes) {
  const nombres = new Map(montajes.map((m) => [m.id, m.nombre]));
  return salones.map((salon) => {
    const habilitados = salonMontajes
      .filter((sm) => sm.salon === salon.id)
      .map((sm) => ({
        id: sm.montaje,
        nombre: nombres.get(sm.montaje) ?? `Montaje ${sm.montaje}`,
        aforo: sm.aforo,
      }))
      .sort((a, b) => b.aforo - a.aforo);
    return {
      ...salon,
      montajes: habilitados,
      aforoMaximo: habilitados.length ? habilitados[0].aforo : null,
    };
  });
}

export function estadoAforo(personas, aforo) {
  const cantidad = Number(personas) || 0;
  if (aforo == null) {
    return { porcentaje: 0, excede: false, texto: "Elige un montaje para ver el aforo." };
  }
  if (cantidad > aforo) {
    return {
      porcentaje: 100,
      excede: true,
      texto: `Supera el aforo por ${cantidad - aforo} ${cantidad - aforo === 1 ? "persona" : "personas"}`,
    };
  }
  const cupos = aforo - cantidad;
  return {
    porcentaje: Math.round((cantidad / aforo) * 100),
    excede: false,
    texto: `${cantidad} de ${aforo} personas · quedan ${cupos} ${cupos === 1 ? "cupo" : "cupos"}`,
  };
}

export function ajustarPersonas(actual, delta) {
  const base = Number(actual) || 0;
  return String(Math.max(1, base + delta));
}

export function cantidadValida(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero >= 1 ? numero : 0;
}

export function ajustarCantidad(actual, delta) {
  return String(Math.max(1, cantidadValida(actual) + delta));
}

const aCentavos = (valor) => Math.round(Number(valor || 0) * 100);
const aCentesimas = (pct) => Math.round(Number(pct || 0) * 100);

function dividirRedondeando(numerador, divisor) {
  const cociente = Math.floor(numerador / divisor);
  const resto = numerador - cociente * divisor;
  return resto * 2 >= divisor ? cociente + 1 : cociente;
}

export function totalesLinea(cantidad, precio, impuestoPct) {
  const subtotal = cantidadValida(cantidad) * aCentavos(precio);
  const impuesto = dividirRedondeando(subtotal * aCentesimas(impuestoPct), 10000);
  return { subtotal, impuesto, total: subtotal + impuesto };
}

export function nombreImpuesto(pct) {
  const tasa = Number(pct);
  if (tasa === 19) return "IVA 19%";
  if (tasa === 8) return "Impoconsumo 8%";
  return `Impuesto ${decimal.format(tasa)}%`;
}

export function totalesCotizacion(lineas) {
  const porTasa = new Map();
  let subtotal = 0;
  let impuestos = 0;
  lineas.forEach((linea) => {
    const t = totalesLinea(linea.cantidad, linea.concepto.precio, linea.concepto.impuesto_pct);
    subtotal += t.subtotal;
    impuestos += t.impuesto;
    const tasa = Number(linea.concepto.impuesto_pct);
    if (tasa > 0) porTasa.set(tasa, (porTasa.get(tasa) ?? 0) + t.impuesto);
  });
  const desglose = [...porTasa.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([tasa, valor]) => ({ tasa, nombre: nombreImpuesto(tasa), valor }));
  return { subtotal, impuestos, total: subtotal + impuestos, desglose };
}

export const pesosDeCentavos = (centavos) => dineroCompleto(centavos / 100);
export const pesos = (valor) => dineroCompleto(Number(valor || 0));

export function vigenciaPorDefecto(fechaEvento) {
  const porDefecto = fechaISO(sumarDias(hoyLocal(), DIAS_VIGENCIA));
  if (!fechaEvento) return porDefecto;
  return fechaEvento < porDefecto ? fechaEvento : porDefecto;
}

export function validarCotizacion(form, lineas, aforo) {
  const campos = {};
  const hoy = hoyISO();
  const personas = Number(form.cantidad_personas);

  if (!form.cliente) campos.cliente = "Elige el cliente de la cotización.";
  if (!form.salon) campos.salon = "Elige el salón.";
  else if (!form.montaje) campos.montaje = "Elige el montaje.";
  if (!form.tipo_evento) campos.tipo_evento = "Elige el tipo de evento.";

  if (!form.fecha_evento) campos.fecha_evento = "La fecha del evento es obligatoria.";
  else if (form.fecha_evento < hoy) campos.fecha_evento = "La fecha del evento no puede ser pasada.";

  if (form.cantidad_personas === "") {
    campos.cantidad_personas = "Indica cuántas personas asistirán.";
  } else if (!Number.isInteger(personas) || personas < 1) {
    campos.cantidad_personas = "Debe ser un número entero mayor que 0.";
  } else if (aforo != null && personas > aforo) {
    campos.cantidad_personas = `Supera el aforo del montaje (${aforo} personas).`;
  }

  if (form.validez_oferta) {
    if (form.validez_oferta < hoy) campos.validez_oferta = "No puede ser anterior a hoy.";
    else if (form.fecha_evento && form.validez_oferta > form.fecha_evento) {
      campos.validez_oferta = "No puede pasar de la fecha del evento.";
    }
  }

  const erroresLineas = lineas.map((linea) =>
    cantidadValida(linea.cantidad) ? null : "La cantidad debe ser un entero mayor que 0.",
  );
  const general = lineas.length === 0 ? "Agrega al menos un concepto a la cotización." : null;

  const hayErrores = Object.keys(campos).length > 0 || erroresLineas.some(Boolean) || Boolean(general);
  return hayErrores ? { campos, lineas: erroresLineas, general, tipo: "datos" } : null;
}

export function payloadCotizacion(form, lineas) {
  const payload = {
    cliente: form.cliente.id,
    salon: form.salon,
    montaje: form.montaje,
    tipo_evento: Number(form.tipo_evento),
    fecha_evento: form.fecha_evento,
    cantidad_personas: Number(form.cantidad_personas),
    items: lineas.map((linea) => ({ concepto: linea.concepto.id, cantidad: Number(linea.cantidad) })),
  };
  if (form.validez_oferta) payload.validez_oferta = form.validez_oferta;
  return payload;
}

export function tipoDeError(error) {
  if (error?.status === 401) return "sesion";
  if (error?.status === 403) return "permiso";
  if (error?.status === 409) return "conflicto";
  if (error?.status === 400) return "datos";
  return "servidor";
}

function erroresDeLineas(items, cantidadLineas) {
  if (!Array.isArray(items)) return { lineas: [], general: null };
  if (items.every((item) => typeof item === "string")) return { lineas: [], general: textoError(items) };
  const lineas = Array.from({ length: cantidadLineas }, (_, i) => {
    const item = items[i];
    if (!item || typeof item !== "object" || Object.keys(item).length === 0) return null;
    return Object.values(item).map(textoError).join(" ");
  });
  return { lineas, general: null };
}

export function erroresDeGuardado(error, cantidadLineas) {
  const tipo = tipoDeError(error);
  if (tipo === "conflicto") {
    return {
      ...ERRORES_VACIOS,
      tipo,
      general: error.body?.detail || "Los datos cambiaron mientras armabas la cotización. Revisa y vuelve a intentar.",
    };
  }
  if (tipo !== "datos") return { ...ERRORES_VACIOS, tipo };

  const { items, ...resto } = error.body ?? {};
  const { campos, general } = erroresDesdeApi(resto, CAMPOS_COTIZACION);
  const deLineas = erroresDeLineas(items, cantidadLineas);
  const generales = [general, deLineas.general].filter(Boolean).join(" | ");
  return {
    campos,
    lineas: deLineas.lineas,
    general: generales || "Hay datos que el servidor no aceptó. Revisa lo marcado en rojo.",
    tipo,
  };
}

// Conceptos que se cobran por asistente ("Coffee break por persona"): al agregarlos,
// la cantidad arranca en el número de personas y lo sigue mientras no se cambie a mano.
export function esPorPersona(concepto) {
  return /por persona/i.test(concepto?.nombre ?? "");
}

export function cantidadInicial(concepto, personas) {
  const n = Number(personas);
  return esPorPersona(concepto) && Number.isInteger(n) && n > 0 ? String(n) : "1";
}

// Las líneas que siguen a las personas toman la cantidad nueva (si es válida).
export function seguirPersonas(lineas, personas) {
  const n = Number(personas);
  if (!Number.isInteger(n) || n < 1) return lineas;
  return lineas.map((l) => (l.sigue ? { ...l, cantidad: String(n) } : l));
}

// --- Editar una cotización guardada ---

// El formulario a partir del detalle (GET /cotizaciones/<id>/). Una vigencia ya pasada
// queda vacía: el API toma la de por defecto (hoy + 15 días), así se reactiva la oferta.
export function formDesdeCotizacion(cotizacion, hoy = hoyISO()) {
  return {
    cliente: cotizacion.cliente,
    salon: cotizacion.salon?.id ?? null,
    montaje: cotizacion.montaje?.id ?? null,
    tipo_evento: cotizacion.tipo_evento?.id != null ? String(cotizacion.tipo_evento.id) : "",
    fecha_evento: cotizacion.fecha_evento,
    cantidad_personas: String(cotizacion.cantidad_personas),
    validez_oferta: cotizacion.validez_oferta && cotizacion.validez_oferta >= hoy ? cotizacion.validez_oferta : "",
  };
}

// Las líneas con el precio e impuesto con que se cotizaron (los que conserva el API),
// no los de hoy. Si el concepto ya no está en el catálogo, se arma con lo del item.
export function lineasDesdeCotizacion(cotizacion, conceptos) {
  const porId = new Map(conceptos.map((c) => [c.id, c]));
  return cotizacion.items.map((item) => {
    const base = porId.get(item.concepto) ?? { id: item.concepto, nombre: item.concepto_nombre, activo: true };
    return {
      concepto: { ...base, precio: item.precio_unitario, impuesto_pct: item.impuesto_pct },
      cantidad: String(item.cantidad),
      sigue: false,
    };
  });
}

// --- Disponibilidad del salón ese día ---

// Del calendario de ese salón y día: las otras cotizaciones que ocupan la fecha
// (confirmadas, bloqueadas o cotizadas vigentes). idPropio: la que se está editando.
export function ocupacionDelDia(eventos, idPropio = null) {
  const visibles = eventos.filter((e) => e.id !== idPropio && !(e.estado === "cotizado" && e.vencida));
  return {
    confirmada: visibles.find((e) => e.estado === "confirmado") ?? null,
    bloqueada: visibles.find((e) => e.estado === "bloqueado") ?? null,
    cotizadas: visibles.filter((e) => e.estado === "cotizado").length,
  };
}

export function avisoOcupacion(ocupacion) {
  if (!ocupacion) return null;
  if (ocupacion.confirmada) {
    return {
      tono: "error",
      texto: `El salón ya está confirmado ese día para ${ocupacion.confirmada.cliente_nombre}. `
        + "Puedes guardar la cotización, pero no se podrá bloquear ni confirmar en esa fecha.",
    };
  }
  if (ocupacion.bloqueada) {
    return {
      tono: "alerta",
      texto: `El salón está bloqueado ese día para ${ocupacion.bloqueada.cliente_nombre}. `
        + "Si ese bloqueo se confirma, esta cotización no podrá confirmarse.",
    };
  }
  if (ocupacion.cotizadas > 0) {
    const n = ocupacion.cotizadas;
    return {
      tono: "info",
      texto: `Hay ${n} ${n === 1 ? "otra cotización abierta" : "otras cotizaciones abiertas"} para ese salón y día. `
        + "La primera que se confirme se queda con la fecha.",
    };
  }
  return { tono: "libre", texto: "El salón está libre ese día." };
}
