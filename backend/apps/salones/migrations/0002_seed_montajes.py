from django.db import migrations


def crear_montajes(apps, schema_editor):
    Montaje = apps.get_model("salones", "Montaje")
    Montaje.objects.create(codigo="auditorio", nombre="Auditorio")
    Montaje.objects.create(codigo="escuela", nombre="Escuela")
    Montaje.objects.create(codigo="imperial", nombre="Imperial")
    Montaje.objects.create(codigo="coctel", nombre="Cóctel")
    Montaje.objects.create(codigo="espina_pescado", nombre="Espina de pescado")


class Migration(migrations.Migration):

    dependencies = [
        ("salones", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(crear_montajes),
    ]