from decimal import ROUND_HALF_UP, Decimal

CENTAVOS = Decimal("0.01")


def redondear(valor):
    """Redondea a 2 decimales con la regla comercial (0.005 sube a 0.01)."""
    return Decimal(valor).quantize(CENTAVOS, rounding=ROUND_HALF_UP)


def totales_linea(cantidad, precio_unitario, impuesto_pct):
    """Subtotal, impuesto y total de una línea, cada uno redondeado a 2 decimales."""
    subtotal = redondear(cantidad * precio_unitario)
    impuesto = redondear(subtotal * impuesto_pct / 100)
    return {"subtotal": subtotal, "impuesto": impuesto, "total": subtotal + impuesto}


def totales_cotizacion(items):
    """Suma las líneas ya redondeadas, para que el total cuadre con lo que ve el cliente."""
    lineas = [totales_linea(i.cantidad, i.precio_unitario, i.impuesto_pct) for i in items]
    subtotal = sum((l["subtotal"] for l in lineas), Decimal("0.00"))
    impuestos = sum((l["impuesto"] for l in lineas), Decimal("0.00"))
    return {"subtotal": subtotal, "impuestos": impuestos, "total": subtotal + impuestos}
