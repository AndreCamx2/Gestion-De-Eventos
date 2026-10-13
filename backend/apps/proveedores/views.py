import unicodedata

from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.usuarios.permissions import EsAdministrador
from .models import Proveedor, StockElemento
from .serializers import ProveedorSerializer, StockElementoSerializer


def _dinero(valor):
    """Mismo formato que el resto de la API: texto con 2 decimales (o None)."""
    return None if valor is None else f"{valor:.2f}"


# La virgulilla de la ñ: NFKD separa "ñ" en "n" + U+0303 y se conserva.
_VIRGULILLA = "\u0303"


def _normalizar(texto):
    """Clave para agrupar y buscar elementos: sin tildes ni diéresis, sin espacios
    de más y en minúsculas. "Sílla  Tiffany" → "silla tiffany". La ñ se conserva:
    "Paño" y "Pano" son elementos distintos."""
    separado = unicodedata.normalize("NFKD", texto)
    sin_tildes = "".join(
        c for c in separado if not unicodedata.combining(c) or c == _VIRGULILLA
    )
    return " ".join(unicodedata.normalize("NFC", sin_tildes).split()).lower()


class ProveedorListCreateView(generics.ListCreateAPIView):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class StockElementoListCreateView(generics.ListCreateAPIView):
    queryset = StockElemento.objects.all()
    serializer_class = StockElementoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class StockElementoDetailView(generics.RetrieveUpdateAPIView):
    """Ver y editar la cantidad y el valor de un elemento de stock (SGDE-98).

    Sin DELETE: para darlo por agotado se deja la cantidad en 0. Sin PUT.
    """

    queryset = StockElemento.objects.all()
    serializer_class = StockElementoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    http_method_names = ["get", "patch", "head", "options"]


class StockCompararView(APIView):
    """Compara precios entre proveedores para un mismo elemento (SGDE-31).

    GET /api/stock/comparar/?elemento=silla
    Agrupa el stock por nombre de elemento sin distinguir mayúsculas, tildes ni
    espacios de más (_normalizar), y marca el mejor precio entre los proveedores
    que tienen unidades disponibles. La búsqueda usa la misma normalización.
    """

    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get(self, request):
        texto = _normalizar(request.query_params.get("elemento", ""))
        # Por id: el nombre que se muestra es el del primer registro creado del grupo.
        stock = StockElemento.objects.select_related("proveedor").order_by("id")

        grupos = {}
        for item in stock:
            clave = _normalizar(item.nombre_elemento)
            # Se filtra en Python: icontains de Postgres sí distingue tildes
            # ("silla" no encuentra "Sílla"). El stock es pequeño.
            if texto not in clave:
                continue
            grupo = grupos.setdefault(
                clave, {"elemento": item.nombre_elemento.strip(), "items": []}
            )
            grupo["items"].append(item)

        resultado = []
        for clave in sorted(grupos):
            items = grupos[clave]["items"]
            mejor = min((i.valor for i in items if i.cantidad > 0), default=None)
            # Primero los disponibles, del más barato al más caro; los agotados al final.
            items.sort(key=lambda i: (i.cantidad == 0, i.valor, i.proveedor.nombre))
            resultado.append(
                {
                    "elemento": grupos[clave]["elemento"],
                    "mejor_precio": _dinero(mejor),
                    "ofertas": [
                        {
                            "stock_id": i.id,
                            "proveedor_id": i.proveedor_id,
                            "proveedor": i.proveedor.nombre,
                            "contacto": i.proveedor.contacto,
                            "cantidad": i.cantidad,
                            "valor": _dinero(i.valor),
                            "actualizado_en": i.actualizado_en,
                            "es_mejor_precio": i.cantidad > 0 and i.valor == mejor,
                        }
                        for i in items
                    ],
                }
            )
        return Response(resultado)
