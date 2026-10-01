from rest_framework import generics, permissions
from .models import Concepto
from .serializers import ConceptoSerializer


class ConceptoListCreateView(generics.ListCreateAPIView):
    queryset = Concepto.objects.all()
    serializer_class = ConceptoSerializer
    permission_classes = [permissions.IsAuthenticated]