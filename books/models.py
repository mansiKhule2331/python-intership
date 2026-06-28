from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Book(models.Model):
    title = models.CharField(max_length=255, db_index=True)
    author = models.CharField(max_length=255, db_index=True)
    genre = models.CharField(max_length=100, db_index=True)
    isbn = models.CharField(max_length=13, unique=True, help_text='13-digit ISBN.')
    price = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField(blank=True)
    stock_quantity = models.PositiveIntegerField(default=0)
    cover_image_url = models.URLField(blank=True, null=True)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'books'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['title', 'author', 'genre'])]

    def __str__(self):
        return f'{self.title} by {self.author}'

    def save(self, *args, **kwargs):
        # Inventory rule: a book with zero stock is automatically unavailable.
        self.is_available = self.stock_quantity > 0
        super().save(*args, **kwargs)

    @property
    def average_rating(self) -> float:
        agg = self.reviews.aggregate(models.Avg('rating'))
        return round(agg['rating__avg'] or 0, 2)

    @property
    def review_count(self) -> int:
        return self.reviews.count()


class Review(models.Model):
    """Bonus feature: customers can rate and review books."""
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'book_reviews'
        ordering = ['-created_at']
        unique_together = ('book', 'user')  # one review per user per book

    def __str__(self):
        return f'{self.user.email} rated {self.book.title} ({self.rating}/5)'


class Wishlist(models.Model):
    """Bonus feature: customers can save books to a personal wishlist."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist_items')
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='wishlisted_by')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'wishlists'
        ordering = ['-added_at']
        unique_together = ('user', 'book')

    def __str__(self):
        return f'{self.user.email} -> {self.book.title}'
