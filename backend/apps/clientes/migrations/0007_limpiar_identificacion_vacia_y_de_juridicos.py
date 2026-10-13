from django.db import migrations


def limpiar_identificaciones(apps, schema_editor):
    """Deja en null la identificación que no debe estar (SGDE-91).

    - Jurídicos: el NIT vive en su Empresa, así que cualquier identificación
      (también "") pasa a null. Es lo que exige el constraint de la 0008.
    - Naturales con "": vacía se guarda como null; dos "" chocarían con el unique.
    Los naturales con una identificación real no se tocan.
    """
    Cliente = apps.get_model("clientes", "Cliente")
    Cliente.objects.filter(tipo="juridica", identificacion__isnull=False).update(identificacion=None)
    Cliente.objects.filter(tipo="natural", identificacion="").update(identificacion=None)


class Migration(migrations.Migration):

    dependencies = [
        ("clientes", "0006_cliente_activo"),
    ]

    operations = [
        # Reversa noop: no se puede (ni se quiere) devolver un NIT duplicado al jurídico.
        migrations.RunPython(limpiar_identificaciones, migrations.RunPython.noop),
    ]
