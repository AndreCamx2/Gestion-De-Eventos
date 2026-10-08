from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cotizaciones.models import Cotizacion
from .serializers import BloquearSalonSerializer, BloqueoSerializer
from .services import bloquear_salon, liberar_bloqueos_vencidos


class BloqueoListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Lista los bloqueos vigentes (opcional: ?salon_id=)."""
        liberar_bloqueos_vencidos()
        qs = Cotizacion.objects.filter(
            estado="bloqueado", bloqueo_hasta__gt=timezone.now()
        ).select_related("salon")
        salon_id = request.query_params.get("salon_id")
        if salon_id:
            qs = qs.filter(salon_id=salon_id)
        return Response(BloqueoSerializer(qs.order_by("bloqueo_hasta"), many=True).data)

    def post(self, request):
        """Bloquea el salón de una cotización hasta una fecha/hora límite."""
        entrada = BloquearSalonSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        cot = bloquear_salon(
            entrada.validated_data["cotizacion"].pk,
            entrada.validated_data["bloqueo_hasta"],
        )
        return Response(BloqueoSerializer(cot).data, status=status.HTTP_201_CREATED)