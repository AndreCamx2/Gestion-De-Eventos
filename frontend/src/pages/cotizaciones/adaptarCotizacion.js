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
      impuesto: {
        codigo: "Impuesto",
        porcentaje: item.impuesto_pct,
        valor: item.impuesto,
      },
    })),
    subtotal: cotizacion.subtotal,
    total: cotizacion.total,
  };
}
