from django.db import migrations


def crear_ciudad(apps, schema_editor):
    Ciudad = apps.get_model("sitios", "Ciudad")
    Ciudad.objects.create(codigo="CTG", nombre="Cartagena")


class Migration(migrations.Migration):

    dependencies = [
        ("sitios", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(crear_ciudad),
    ]