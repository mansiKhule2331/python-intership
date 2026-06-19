"""
CRM Backend - Root URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns_static = []
if settings.DEBUG:
    urlpatterns_static += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns_static += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('crm_api.urls')),
] + urlpatterns_static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
