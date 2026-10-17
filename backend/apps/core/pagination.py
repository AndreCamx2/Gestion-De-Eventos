from rest_framework.pagination import PageNumberPagination


class PaginaEstandar(PageNumberPagination):
    """Paginación de los listados grandes (SGDE-116).

    Responde {count, next, previous, results}. Tamaño por defecto 50; el cliente
    puede pedir otro con ?page_size=, hasta 200.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200
