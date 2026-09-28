from django.db import migrations


def crear_roles(apps, schema_editor):
    Rol = apps.get_model("usuarios", "Rol")
    Rol.objects.create(codigo="cliente", nombre="Cliente")
    Rol.objects.create(codigo="administrador", nombre="Administrador")
    Rol.objects.create(codigo="proveedor", nombre="Proveedor")


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(crear_roles),
    ]