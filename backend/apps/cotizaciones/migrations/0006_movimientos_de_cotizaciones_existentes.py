from django.db import migrations


def crear_movimientos(apps, schema_editor):
    """Movimientos de las cotizaciones creadas antes de SGDE-62, solo con datos que existen.

    - "creada": con el usuario y el creado_en de la cotización.
    - "confirmada": solo si sigue confirmada y la aceptación dejó garantia_registrada_por y _en.
    Las canceladas y bloqueadas viejas solo llevan "creada" (decisión de Andrés).
    No se inventan movimientos de bloqueo, liberación ni cancelación: no hay
    registro de quién ni cuándo.

    `fecha` es auto_now_add: al crear siempre se pone la hora actual, así que la
    fecha original se fija después con bulk_update (que no pasa por auto_now_add).
    """
    Cotizacion = apps.get_model("cotizaciones", "Cotizacion")
    Movimiento = apps.get_model("cotizaciones", "MovimientoCotizacion")

    pendientes = []  # (movimiento, fecha original)
    for cot in Cotizacion.objects.filter(movimientos__isnull=True).order_by("id"):
        pendientes.append((
            Movimiento(
                cotizacion_id=cot.pk, tipo="creada", usuario_id=cot.usuario_id,
                detalle="Registrada antes del historial de movimientos.",
            ),
            cot.creado_en,
        ))
        if cot.estado == "confirmado" and cot.garantia_registrada_en and cot.garantia_registrada_por_id:
            pendientes.append((
                Movimiento(
                    cotizacion_id=cot.pk, tipo="confirmada", usuario_id=cot.garantia_registrada_por_id,
                    detalle=f"Garantía: {cot.garantia_tipo}, {cot.garantia_monto}.",
                ),
                cot.garantia_registrada_en,
            ))

    if not pendientes:
        return
    movimientos = Movimiento.objects.bulk_create([m for m, _ in pendientes])
    for movimiento, (_, fecha) in zip(movimientos, pendientes):
        movimiento.fecha = fecha
    Movimiento.objects.bulk_update(movimientos, ["fecha"], batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ("cotizaciones", "0005_movimientos_de_cotizacion"),
    ]

    operations = [
        # Reversa noop: al bajar a la 0004, la 0005 borra la tabla con todo.
        migrations.RunPython(crear_movimientos, migrations.RunPython.noop),
    ]
