from decimal import ROUND_HALF_UP, Decimal
from django.db.models import Count, Sum, Q
from django.utils import timezone
from .models import Cotizacion, TipoEvento

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


# Asegúrate de que las importaciones de arriba no choquen con lo que ya está en services.py

def calcular_ingresos_por_tipo(usuario, desde=None, hasta=None):
    """
    Calcula los ingresos de los eventos confirmados agrupados por tipo de evento.
    """
    # 1. Filtramos las cotizaciones confirmadas y de los sitios del usuario
    from apps.sitios.acceso import filtrar_por_sitio
    
    queryset = Cotizacion.objects.filter(estado="confirmado")
    queryset = filtrar_por_sitio(queryset, usuario)

    # 2. Aplicamos los filtros de fecha si los hay
    if desde:
        queryset = queryset.filter(fecha_evento__gte=desde)
    if hasta:
        queryset = queryset.filter(fecha_evento__lte=hasta)

    # 3. Traemos los tipos de evento (incluso los inactivos, para no perder historia)
    tipos = TipoEvento.objects.all().select_related("grupo")

    resultados = []
    for tipo in tipos:
        # Filtramos las cotizaciones de este tipo en específico
        cotizaciones_tipo = queryset.filter(tipo_evento=tipo)
        
        if cotizaciones_tipo.exists():
            # Calculamos la suma total
            total_ingreso = sum(
                totales_cotizacion(c.items.all())["total"] 
                for c in cotizaciones_tipo.prefetch_related("items")
            )
            resultados.append({
                "tipo_evento": tipo.nombre,
                "grupo_evento": tipo.grupo.nombre,
                "cantidad_eventos": cotizaciones_tipo.count(),
                "ingreso_total": total_ingreso
            })

    # 4. Calculamos el total global para los porcentajes
    gran_total = sum(r["ingreso_total"] for r in resultados)

    # 5. Armamos la respuesta final con el porcentaje
    for r in resultados:
        r["porcentaje_ingreso"] = (r["ingreso_total"] / gran_total * 100) if gran_total > 0 else 0

    # Ordenamos de mayor a menor ingreso
    resultados.sort(key=lambda x: x["ingreso_total"], reverse=True)

    return {
        "gran_total": gran_total,
        "detalle": resultados
    }
