import unicodedata

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.usuarios.permissions import EsAdministrador, EsProveedor
from apps.core.pagination import PaginaEstandar
from .models import Proveedor, StockElemento
from .serializers import MiStockSerializer, ProveedorSerializer, StockElementoSerializer
from .models import HistorialStockElemento, Proveedor, StockElemento
from .serializers import (
    HistorialStockElementoSerializer, MiStockSerializer, ProveedorSerializer, StockElementoSerializer,
)


def _dinero(valor):
    return None if valor is None else f"{valor:.2f}"


# La virgulilla de la ñ: NFKD separa "ñ" en "n" + U+0303 y se conserva.
_VIRGULILLA = "\u0303"


def _normalizar(texto):
    """Sin tildes, espacios de más ni mayúsculas. La ñ se conserva: "Paño" no es "Pano"."""
    separado = unicodedata.normalize("NFKD", texto)
    sin_tildes = "".join(
        c for c in separado if not unicodedata.combining(c) or c == _VIRGULILLA
    )
    return " ".join(unicodedata.normalize("NFC", sin_tildes).split()).lower()


class ProveedorListCreateView(generics.ListCreateAPIView):
    queryset = Proveedor.objects.select_related("usuario")
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class ProveedorDetailView(generics.RetrieveUpdateAPIView):
    queryset = Proveedor.objects.select_related("usuario")
    serializer_class = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    http_method_names = ["get", "patch", "head", "options"]


class StockElementoListCreateView(generics.ListCreateAPIView):
    queryset = StockElemento.objects.order_by("id")
    pagination_class = PaginaEstandar
    serializer_class = StockElementoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class RegistraHistorialStockMixin:
    """Si un PATCH cambia la cantidad o el valor, guarda quién y cuándo."""

    @transaction.atomic
    def perform_update(self, serializer):
        anterior = (
            StockElemento.objects.select_for_update()
            .values("cantidad", "valor")
            .get(pk=serializer.instance.pk)
        )
        elemento = serializer.save()
        if (elemento.cantidad, elemento.valor) != (anterior["cantidad"], anterior["valor"]):
            HistorialStockElemento.objects.create(
                elemento=elemento,
                cantidad_anterior=anterior["cantidad"],
                cantidad_nueva=elemento.cantidad,
                valor_anterior=anterior["valor"],
                valor_nuevo=elemento.valor,
                modificado_por=self.request.user,
            )


def _historial_de(elementos, pk):
    elemento = get_object_or_404(elementos, pk=pk)
    return elemento.historial.select_related("modificado_por")


class StockElementoDetailView(RegistraHistorialStockMixin, generics.RetrieveUpdateAPIView):
    queryset = StockElemento.objects.all()
    serializer_class = StockElementoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    http_method_names = ["get", "patch", "head", "options"]


class StockHistorialListView(generics.ListAPIView):
    serializer_class = HistorialStockElementoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return _historial_de(StockElemento.objects.all(), self.kwargs["pk"])


class MiStockMixin:
    serializer_class = MiStockSerializer
    permission_classes = [permissions.IsAuthenticated, EsProveedor]

    def get_queryset(self):
        return self.request.user.proveedor.stock.order_by("nombre_elemento")

    def get_serializer_context(self):
        contexto = super().get_serializer_context()
        if self.request.user.is_authenticated:
            contexto["proveedor"] = getattr(self.request.user, "proveedor", None)
        return contexto


class MiStockListCreateView(MiStockMixin, generics.ListCreateAPIView):
    def perform_create(self, serializer):
        serializer.save(proveedor=self.request.user.proveedor)


class MiStockDetailView(MiStockMixin, RegistraHistorialStockMixin, generics.RetrieveUpdateAPIView):
    http_method_names = ["get", "patch", "head", "options"]


class MiStockHistorialView(MiStockMixin, generics.ListAPIView):
    serializer_class = HistorialStockElementoSerializer

    def get_queryset(self):
        return _historial_de(super().get_queryset(), self.kwargs["pk"])


class StockCompararView(APIView):
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get(self, request):
        texto = _normalizar(request.query_params.get("elemento", ""))
        # Por id: el nombre que se muestra es el del primer registro creado del grupo.
        stock = StockElemento.objects.select_related("proveedor").order_by("id")

        grupos = {}
        for item in stock:
            clave = _normalizar(item.nombre_elemento)
            # En Python: icontains distingue tildes y el stock es pequeño.
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
