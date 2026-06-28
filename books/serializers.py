import re

from rest_framework import serializers

from books.models import Book, Review, Wishlist


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'book', 'user', 'user_name', 'rating', 'comment', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'user_name', 'created_at', 'updated_at')

    def validate_rating(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

    def create(self, validated_data):
        request = self.context['request']
        validated_data['user'] = request.user
        if Review.objects.filter(book=validated_data['book'], user=request.user).exists():
            raise serializers.ValidationError('You have already reviewed this book.')
        return super().create(validated_data)


class BookSerializer(serializers.ModelSerializer):
    average_rating = serializers.ReadOnlyField()
    review_count = serializers.ReadOnlyField()

    class Meta:
        model = Book
        fields = (
            'id', 'title', 'author', 'genre', 'isbn', 'price', 'description',
            'stock_quantity', 'cover_image_url', 'is_available',
            'average_rating', 'review_count', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'is_available', 'created_at', 'updated_at')

    def validate_isbn(self, value):
        cleaned = value.replace('-', '').replace(' ', '')
        if not re.fullmatch(r'\d{10}(\d{3})?', cleaned):
            raise serializers.ValidationError('ISBN must be a valid 10 or 13 digit number.')

        qs = Book.objects.filter(isbn=cleaned)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A book with this ISBN already exists.')
        return cleaned

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Price must be greater than zero.')
        return value

    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError('Stock quantity cannot be negative.')
        return value

    def validate(self, attrs):
        # Detect duplicate books by (title, author) on creation.
        if self.instance is None:
            title = attrs.get('title')
            author = attrs.get('author')
            if Book.objects.filter(title__iexact=title, author__iexact=author).exists():
                raise serializers.ValidationError('This book by this author already exists in the catalog.')
        return attrs


class BookListSerializer(serializers.ModelSerializer):
    """Lightweight serializer used for list endpoints / recently added."""
    average_rating = serializers.ReadOnlyField()

    class Meta:
        model = Book
        fields = ('id', 'title', 'author', 'genre', 'price', 'cover_image_url', 'is_available', 'average_rating')


class WishlistSerializer(serializers.ModelSerializer):
    book_detail = BookListSerializer(source='book', read_only=True)

    class Meta:
        model = Wishlist
        fields = ('id', 'user', 'book', 'book_detail', 'added_at')
        read_only_fields = ('id', 'user', 'added_at')

    def create(self, validated_data):
        request = self.context['request']
        validated_data['user'] = request.user
        if Wishlist.objects.filter(user=request.user, book=validated_data['book']).exists():
            raise serializers.ValidationError('Book is already in your wishlist.')
        return super().create(validated_data)
