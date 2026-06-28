from django.urls import include, path
from rest_framework.routers import DefaultRouter

from books.views import BookViewSet, ReviewViewSet, WishlistViewSet

router = DefaultRouter()
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'', BookViewSet, basename='book')

urlpatterns = [
    path('', include(router.urls)),
]
