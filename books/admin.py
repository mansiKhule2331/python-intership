from django.contrib import admin

from books.models import Book, Review, Wishlist


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'genre', 'price', 'stock_quantity', 'is_available', 'created_at')
    list_filter = ('genre', 'is_available')
    search_fields = ('title', 'author', 'isbn')
    readonly_fields = ('is_available', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    list_per_page = 25


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('book', 'user', 'rating', 'created_at')
    list_filter = ('rating',)
    search_fields = ('book__title', 'user__email')


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'book', 'added_at')
    search_fields = ('user__email', 'book__title')
