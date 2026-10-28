from django.db import migrations

# Lista inicial de SGDE-142: clasificación MICE (Meetings, Incentives, Conferences,
# Exhibitions) más los grupos Académico y Social. El cliente la puede cambiar desde /admin/.
GRUPOS = [
    ("Reuniones", ["Reunión corporativa o junta directiva", "Seminario, taller o capacitación"]),
    ("Congresos y convenciones", ["Congreso o simposio", "Convención corporativa"]),
    ("Exposiciones y lanzamientos", ["Feria o exposición", "Lanzamiento de producto"]),
    ("Incentivos", ["Evento de incentivo o reconocimiento"]),
    ("Académico", ["Ceremonia de grado", "Curso o diplomado"]),
    ("Social", ["Boda", "Quince años o cumpleaños", "Cena o cóctel de gala", "Otro evento social"]),
    ("Otro", ["Otro"]),
]


def cargar(apps, schema_editor):
    Grupo = apps.get_model("cotizaciones", "GrupoEvento")
    Tipo = apps.get_model("cotizaciones", "TipoEvento")
    for orden, (nombre, tipos) in enumerate(GRUPOS, start=1):
        grupo, _ = Grupo.objects.get_or_create(nombre=nombre, defaults={"orden": orden})
        for tipo in tipos:
            Tipo.objects.get_or_create(grupo=grupo, nombre=tipo)


class Migration(migrations.Migration):

    dependencies = [("cotizaciones", "0007_tipos_de_evento")]

    # Sin marcha atrás: al revertir 0007 las tablas se borran con sus datos.
    operations = [migrations.RunPython(cargar, migrations.RunPython.noop)]