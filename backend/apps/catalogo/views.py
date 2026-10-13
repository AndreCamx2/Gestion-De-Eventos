from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from apps.sitios.acceso import filtrar_por_sitio
from apps.usuarios.permissions import EsAdministrador
from .models import Concepto, HistorialPrecioConcepto
from .serializers import ConceptoSerializer, HistorialPrecioConceptoSerializer


def conceptos_del_usuario(usuario):
    return filtrar_por_sitio(Concepto.objects.all(), usuario)


class ConceptoListCreateView(generics.ListCreateAPIView):
    serializer_class = ConceptoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return conceptos_del_usuario(self.request.user)


class ConceptoRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """Ver y editar un concepto. Si cambia el precio, guarda quién y cuándo.

    Un concepto de otro sitio da 404: no revela que existe.
    """

    serializer_class = ConceptoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        return conceptos_del_usuario(self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        precio_anterior = (
            Concepto.objects.select_for_update()
            .values_list("precio", flat=True)
            .get(pk=serializer.instance.pk)
        )
        concepto = serializer.save()
        if concepto.precio != precio_anterior:
            HistorialPrecioConcepto.objects.create(
                concepto=concepto,
                precio_anterior=precio_anterior,
                precio_nuevo=concepto.precio,
                modificado_por=self.request.user,
            )


class ConceptoHistorialListView(generics.ListAPIView):
    serializer_class = HistorialPrecioConceptoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        # 404 si el concepto no existe o es de otro sitio (antes devolvía una lista vacía).
        concepto = get_object_or_404(conceptos_del_usuario(self.request.user), pk=self.kwargs["pk"])
        return HistorialPrecioConcepto.objects.filter(concepto=concepto).select_related("modificado_por")