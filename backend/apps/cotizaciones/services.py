from decimal import ROUND_HALF_UP, Decimal

CENTAVOS = Decimal("0.01")

# Garantía mínima para confirmar (decisión del cliente, 2026-10-27): con 5 días o más
# de anticipación basta el 30% del total; si el evento es antes, se paga el 100%.
# No hay excepciones.
GARANTIA_PCT = Decimal("30")
GARANTIA_DIAS_ANTICIPACION = 5


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


def garantia_minima(total, fecha_evento, hoy):
    """Porcentaje y monto mínimos de la garantía para confirmar en la fecha `hoy`.

    Se cuenta desde el día de la aceptación, no desde el de la cotización: una
    cotización hecha con un mes de anticipación pero aceptada 3 días antes del
    evento paga el 100%.
    """
    dias = (fecha_evento - hoy).days
    porcentaje = GARANTIA_PCT if dias >= GARANTIA_DIAS_ANTICIPACION else Decimal("100")
    return {"porcentaje": porcentaje, "monto": redondear(total * porcentaje / 100)}
