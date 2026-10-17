from django.core.management.base import BaseCommand

from apps.cotizaciones.estados import liberar_bloqueos_vencidos


class Command(BaseCommand):
    help = (
        "Pasa a 'cotizado' las cotizaciones bloqueadas cuyo bloqueo_hasta ya pasó, en todos los sitios. "
        "Los GET no escriben (SGDE-118): corre programado y a mano."
    )

    def handle(self, *args, **options):
        liberadas = liberar_bloqueos_vencidos()
        self.stdout.write(f"Bloqueos vencidos liberados: {liberadas}")
