import { nombreImpuesto } from "./nuevaCotizacion";

export function adaptarCotizacion(cotizacion) {
  return {
    numero: cotizacion.id,
    emitidaEn: cotizacion.creado_en,
    validaHasta: cotizacion.validez_oferta,
    fechaEvento: cotizacion.fecha_evento,
    personas: cotizacion.cantidad_personas,
    sitio: cotizacion.sitio ? { nombre: cotizacion.sitio.nombre } : null,
    cliente: cotizacion.cliente
      ? {
        nombre: cotizacion.cliente.nombre,
        documento: cotizacion.cliente.identificacion,
        email: cotizacion.cliente.correo,
      }
      : null,
    salon: cotizacion.salon
      ? { nombre: cotizacion.salon.nombre, aforo: cotizacion.aforo }
      : null,
    montaje: cotizacion.montaje ? { nombre: cotizacion.montaje.nombre } : null,
    items: cotizacion.items.map((item) => ({
      id: item.id,
      concepto: item.concepto_nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precio_unitario,
      total: item.total,
      // Mismo nombre que en el detalle: "IVA 19%", "Impoconsumo 8%" (nombreImpuesto).
      impuesto: {
        nombre: nombreImpuesto(item.impuesto_pct),
        porcentaje: item.impuesto_pct,
        valor: item.impuesto,
      },
    })),
    subtotal: cotizacion.subtotal,
    total: cotizacion.total,
  };
}

// La cotización que se está armando, para la vista previa antes de guardar.
// Una nueva va sin número; al editar lleva el de la guardada. Los totales de useNuevaCotizacion
// vienen en centavos; la hoja recibe pesos.
export function adaptarBorrador({ form, salon, montaje, lineas, totales, vigencia, original }) {
  const enPesos = (centavos) => centavos / 100;
  return {
    // Al editar, la hoja lleva el número de la cotización que se está cambiando.
    numero: original?.id ?? null,
    emitidaEn: new Date(),
    validaHasta: vigencia,
    fechaEvento: form.fecha_evento || null,
    personas: Number(form.cantidad_personas) || 0,
    sitio: salon?.sitio_nombre ? { nombre: salon.sitio_nombre } : null,
    cliente: form.cliente
      ? {
        nombre: form.cliente.nombre,
        documento: form.cliente.identificacion,
        email: form.cliente.correo,
      }
      : null,
    salon: salon ? { nombre: salon.nombre, aforo: montaje?.aforo ?? null } : null,
    montaje: montaje ? { nombre: montaje.nombre } : null,
    items: lineas.map((linea) => ({
      id: linea.concepto.id,
      concepto: linea.concepto.nombre,
      cantidad: linea.cantidad,
      precioUnitario: linea.concepto.precio,
      total: enPesos(linea.total),
      impuesto: {
        nombre: nombreImpuesto(linea.concepto.impuesto_pct),
        porcentaje: linea.concepto.impuesto_pct,
        valor: enPesos(linea.impuesto),
      },
    })),
    subtotal: enPesos(totales.subtotal),
    total: enPesos(totales.total),
  };
}
