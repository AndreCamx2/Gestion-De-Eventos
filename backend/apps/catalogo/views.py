from django.db import transaction
from rest_framework import generics, permissions
from apps.usuarios.permissions import EsAdministrador
from .models import Concepto, HistorialPrecioConcepto
from .serializers import ConceptoSerializer, HistorialPrecioConceptoSerializer


class ConceptoListCreateView(generics.ListCreateAPIView):
    queryset = Concepto.objects.all()
    serializer_class = ConceptoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]


class ConceptoRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """Ver y editar un concepto. Si cambia el precio, guarda quién y cuándo."""

    queryset = Concepto.objects.all()
    serializer_class = ConceptoSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

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
        return HistorialPrecioConcepto.objects.filter(
            concepto_id=self.kwargs["pk"]
        ).select_related("modificado_por")