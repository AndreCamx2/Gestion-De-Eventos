"""
Datos semilla de demostración para desarrollo local.

Uso:  python manage.py seed_demo

Es idempotente: se puede correr varias veces sin duplicar nada.
Las contraseñas salen de variables de entorno (SEED_*_PASSWORD); los valores por
defecto existen solo para desarrollo local. Por seguridad, el comando se niega a
correr con DEBUG=False (producción) salvo que se use --force.
"""
import os
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalogo.models import Concepto
from apps.clientes.models import Cliente, Empresa
from apps.salones.models import Montaje, Salon, SalonMontaje
from apps.sitios.models import Ciudad, Sitio
from apps.usuarios.models import Rol, Usuario

NOMBRE_SITIO = "Hotel Demo Cartagena"

# (nombre, altura, ancho, {codigo_montaje: aforo})
SALONES = [
    ("Salón Bolívar", Decimal("4.50"), Decimal("20.00"),
     {"auditorio": 300, "escuela": 180, "coctel": 400}),
    ("Salón Heredia", Decimal("3.80"), Decimal("12.00"),
     {"auditorio": 120, "imperial": 40, "espina_pescado": 80}),
    ("Salón Getsemaní", Decimal("3.20"), Decimal("8.00"),
     {"escuela": 50, "imperial": 24}),
]

# (nombre, precio, impuesto_pct)
CONCEPTOS = [
    ("Alquiler de salón (día)", Decimal("3500000.00"), Decimal("19.00")),
    ("Servicio de audio y video", Decimal("800000.00"), Decimal("19.00")),
    ("Coffee break por persona", Decimal("25000.00"), Decimal("8.00")),
    ("Almuerzo ejecutivo por persona", Decimal("65000.00"), Decimal("8.00")),
    ("Decoración floral", Decimal("450000.00"), Decimal("19.00")),
]


class Command(BaseCommand):
    help = "Crea datos de demostración (usuarios, sitio, salones, conceptos, clientes). Idempotente."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Permite correr con DEBUG=False. No usar contra producción.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "seed_demo solo corre con DEBUG=True (desarrollo local). "
                "Si de verdad lo necesitas con DEBUG=False, usa --force."
            )

        with transaction.atomic():
            ciudad, _ = Ciudad.objects.get_or_create(codigo="CTG", defaults={"nombre": "Cartagena"})
            roles = {
                codigo: Rol.objects.get_or_create(codigo=codigo, defaults={"nombre": nombre})[0]
                for codigo, nombre in [
                    ("cliente", "Cliente"),
                    ("administrador", "Administrador"),
                    ("proveedor", "Proveedor"),
                ]
            }

            sitio, _ = Sitio.objects.get_or_create(nombre=NOMBRE_SITIO, ciudad=ciudad)

            admin = self._usuario(
                "admin", "admin@sgde.com", roles["administrador"],
                "SEED_ADMIN_PASSWORD", "admin-dev-123", superusuario=True,
            )
            admin.sitios.add(sitio)
            cliente_user = self._usuario(
                "cliente_demo", "cliente@sgde.com", roles["cliente"],
                "SEED_CLIENTE_PASSWORD", "cliente-dev-123",
            )
            self._usuario(
                "proveedor_demo", "proveedor@sgde.com", roles["proveedor"],
                "SEED_PROVEEDOR_PASSWORD", "proveedor-dev-123",
            )

            self._salones(sitio)
            self._conceptos(sitio)
            self._clientes(ciudad, cliente_user)

        self.stdout.write(self.style.SUCCESS("Datos de demostración listos."))
        self.stdout.write(
            "Usuarios: admin (administrador), cliente_demo (cliente), proveedor_demo (proveedor). "
            "Contraseñas: variables SEED_*_PASSWORD de tu .env."
        )

    def _usuario(self, username, email, rol, env_var, default, superusuario=False):
        usuario, creado = Usuario.objects.get_or_create(
            username=username,
            defaults={"email": email, "rol": rol},
        )
        if creado:
            usuario.set_password(os.getenv(env_var) or default)
        # Se reafirman rol y banderas por si alguien los cambió a mano.
        usuario.rol = rol
        usuario.is_staff = usuario.is_superuser = superusuario
        usuario.save()
        self.stdout.write(f"  usuario {username}: {'creado' if creado else 'ya existía'}")
        return usuario

    def _salones(self, sitio):
        montajes = {m.codigo: m for m in Montaje.objects.all()}
        for nombre, altura, ancho, aforos in SALONES:
            salon, _ = Salon.objects.get_or_create(
                sitio=sitio, nombre=nombre, defaults={"altura": altura, "ancho": ancho}
            )
            for codigo, aforo in aforos.items():
                montaje = montajes.get(codigo)
                if montaje is None:
                    raise CommandError(f"Falta el montaje '{codigo}'. ¿Corriste migrate?")
                SalonMontaje.objects.get_or_create(
                    salon=salon, montaje=montaje, defaults={"aforo": aforo}
                )

    def _conceptos(self, sitio):
        for nombre, precio, impuesto in CONCEPTOS:
            Concepto.objects.get_or_create(
                sitio=sitio, nombre=nombre,
                defaults={"precio": precio, "impuesto_pct": impuesto},
            )

    def _clientes(self, ciudad, cliente_user):
        Cliente.objects.get_or_create(
            identificacion="1000000001",
            defaults={
                "tipo": Cliente.NATURAL,
                "nombre": "María Pérez (demo)",
                "correo": "maria.perez@example.com",
                "telefono": "3001234567",
                "usuario": cliente_user,
            },
        )
        empresa, _ = Empresa.objects.get_or_create(
            identificacion="900000001-1",
            defaults={
                "razon_social": "Eventos del Caribe S.A.S. (demo)",
                "contacto": "Carlos Gómez",
                "correo": "contacto@eventoscaribe.example.com",
                "ciudad": ciudad,
            },
        )
        Cliente.objects.get_or_create(
            identificacion="900000001-1",
            defaults={
                "tipo": Cliente.JURIDICA,
                "nombre": "Eventos del Caribe S.A.S. (demo)",
                "correo": "contacto@eventoscaribe.example.com",
                "telefono": "6055550101",
                "empresa": empresa,
            },
        )
