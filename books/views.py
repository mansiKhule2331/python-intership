from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from books.filters import BookFilter
from books.models import Book, Review, Wishlist
from books.serializers import BookListSerializer, BookSerializer, ReviewSerializer, WishlistSerializer
from core.permissions import IsAdminOrReadOnly


class BookViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for books.
    - Admins: create / update / delete.
    - Authenticated customers: read-only (list, retrieve, search).
    """
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = BookFilter
    search_fields = ['title', 'author', 'genre']
    ordering_fields = ['price', 'created_at', 'title', 'stock_quantity']
    throttle_scope = 'books'

    def get_serializer_class(self):
        if self.action == 'list':
            return BookListSerializer
        return BookSerializer

    @action(detail=False, methods=['get'], url_path='recently-added')
    def recently_added(self, request):
        """GET /api/v1/books/recently-added/ -- Books added in the last 30 days."""
        cutoff = timezone.now() - timedelta(days=30)
        queryset = self.filter_queryset(self.get_queryset().filter(created_at__gte=cutoff))
        page = self.paginate_queryset(queryset)
        serializer = BookListSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @extend_schema(operation_id='book_reviews_list')
    @action(detail=True, methods=['get'], url_path='reviews')
    def reviews(self, request, pk=None):
        """GET /api/v1/books/{id}/reviews/ -- List reviews for a specific book."""
        book = self.get_object()
        queryset = book.reviews.all()
        page = self.paginate_queryset(queryset)
        serializer = ReviewSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class ReviewViewSet(viewsets.ModelViewSet):
    """CRUD for book reviews/ratings (bonus feature)."""
    queryset = Review.objects.select_related('book', 'user').all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['book', 'rating']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.role != 'ADMIN':
            # Customers can edit/delete only their own reviews.
            if self.action in ('update', 'partial_update', 'destroy'):
                return qs.filter(user=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WishlistViewSet(viewsets.ModelViewSet):
    """Customer wishlist management (bonus feature)."""
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False) or not self.request.user.is_authenticated:
            return Wishlist.objects.none()
        return Wishlist.objects.filter(user=self.request.user).select_related('book')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
