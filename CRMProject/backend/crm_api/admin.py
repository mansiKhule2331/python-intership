from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Customer, Lead, Interaction, ActivityLog, Notification


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'full_name', 'role', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone', 'avatar')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Dates', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role'),
        }),
    )


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'company', 'city', 'country', 'created_at']
    list_filter = ['country', 'city']
    search_fields = ['name', 'email', 'company', 'phone']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['title', 'customer', 'status', 'priority', 'assigned_to', 'estimated_value', 'created_at']
    list_filter = ['status', 'priority']
    search_fields = ['title', 'customer__name', 'notes']
    ordering = ['-created_at']
    raw_id_fields = ['customer', 'assigned_to']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Interaction)
class InteractionAdmin(admin.ModelAdmin):
    list_display = ['lead', 'interaction_type', 'interaction_date', 'created_by', 'created_at']
    list_filter = ['interaction_type']
    search_fields = ['description', 'lead__title']
    ordering = ['-interaction_date']
    readonly_fields = ['id', 'created_at']


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'model_name', 'object_repr', 'ip_address', 'created_at']
    list_filter = ['action', 'model_name']
    search_fields = ['user__username', 'object_repr']
    readonly_fields = ['id', 'created_at']
    ordering = ['-created_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['user__username', 'title']
    ordering = ['-created_at']
