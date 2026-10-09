from rest_framework import generics, permissions
from .serializers import CotizacionCalendarioSerializer
from .models import Cotizacion


class CotizacionCalendarioView(generics.ListAPIView):
    serializer_class = CotizacionCalendarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Cotizacion.objects.exclude(estado="cancelado")

        salon = self.request.query_params.get("salon")
        if salon:
            queryset = queryset.filter(salon=salon)

        desde = self.request.query_params.get("desde")
        if desde:
            queryset = queryset.filter(fecha_evento__gte=desde)

        hasta = self.request.query_params.get("hasta")
        if hasta:
            queryset = queryset.filter(fecha_evento__lte=hasta)

        return queryset