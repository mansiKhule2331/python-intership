import django_filters

from books.models import Book


class BookFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')
    genre = django_filters.CharFilter(field_name='genre', lookup_expr='iexact')
    author = django_filters.CharFilter(field_name='author', lookup_expr='icontains')
    is_available = django_filters.BooleanFilter(field_name='is_available')

    class Meta:
        model = Book
        fields = ['genre', 'author', 'is_available', 'min_price', 'max_price']
