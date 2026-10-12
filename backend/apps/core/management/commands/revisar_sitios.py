"""
Revisa la asignación de sitios antes de desplegar el filtro multi-sitio (SGDE-90).

Uso:  python manage.py revisar_sitios

Es de SOLO LECTURA: no cambia nada. Muestra:
- administradores activos sin sitios: no verán ningún dato (salvo que sean
  superusuarios, que ven todo);
- sitios que ningún administrador activo tiene asignados.
Los sitios se asignan desde /admin/ → Usuarios → "Información SGDE".
"""
from django.core.management.base import BaseCommand

from apps.sitios.models import Sitio
from apps.usuarios.models import Usuario


class Command(BaseCommand):
    help = "Lista administradores sin sitios y sitios sin administrador. Solo lectura."

    def handle(self, *args, **options):
        admins = Usuario.objects.filter(rol__codigo="administrador", is_active=True)

        sin_sitios = admins.filter(sitios__isnull=True).order_by("username")
        afectados = [u for u in sin_sitios if not u.is_superuser]
        self.stdout.write("Administradores activos sin sitios:")
        if not sin_sitios:
            self.stdout.write("  (ninguno)")
        for usuario in sin_sitios:
            nota = "superusuario: ve todo igual" if usuario.is_superuser else "NO VERÁ NINGÚN DATO"
            self.stdout.write(f"  - {usuario.username} ({nota})")

        huerfanos = Sitio.objects.exclude(administradores__in=admins).order_by("nombre").distinct()
        self.stdout.write("Sitios sin ningún administrador activo:")
        if not huerfanos:
            self.stdout.write("  (ninguno)")
        for sitio in huerfanos:
            self.stdout.write(f"  - {sitio.nombre} (id {sitio.pk})")

        if afectados:
            self.stdout.write(self.style.WARNING(
                f"{len(afectados)} administrador(es) quedarían sin datos. "
                "Asígnales sus sitios en /admin/ antes de desplegar."
            ))
        else:
            self.stdout.write(self.style.SUCCESS("Todos los administradores activos tienen acceso a datos."))
