from django.db import migrations, models


class Migration(migrations.Migration):
    """Nuevo tipo de movimiento: "aplazada" (mover la fecha de una bloqueada o confirmada)."""

    dependencies = [
        ('cotizaciones', '0010_alter_movimientocotizacion_tipo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='movimientocotizacion',
            name='tipo',
            field=models.CharField(choices=[('creada', 'Creada'), ('vigencia', 'Vigencia cambiada'), ('tipo_evento', 'Tipo de evento cambiado'), ('bloqueada', 'Bloqueada'), ('liberada', 'Liberada'), ('confirmada', 'Confirmada'), ('cancelada', 'Cancelada'), ('editada', 'Editada'), ('anulada', 'Anulada'), ('aplazada', 'Fecha aplazada')], max_length=20),
        ),
    ]
