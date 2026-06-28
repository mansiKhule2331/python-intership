"""
CRM API URL Configuration
Complete URL routing for all API endpoints
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # ─── Auth ─────────────────────────────────────────────
    path('auth/register', views.RegisterView.as_view(), name='auth-register'),
    path('auth/login', views.LoginView.as_view(), name='auth-login'),
    path('auth/logout', views.LogoutView.as_view(), name='auth-logout'),
    path('auth/profile', views.ProfileView.as_view(), name='auth-profile'),
    path('auth/change-password', views.ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/token/refresh', TokenRefreshView.as_view(), name='token-refresh'),

    # ─── Users (Admin) ────────────────────────────────────
    path('users', views.UserListView.as_view(), name='user-list'),
    path('users/<uuid:id>', views.UserDetailView.as_view(), name='user-detail'),

    # ─── Customers ────────────────────────────────────────
    path('customers', views.CustomerListCreateView.as_view(), name='customer-list-create'),
    path('customers/<uuid:id>', views.CustomerDetailView.as_view(), name='customer-detail'),
    path('customers/<uuid:id>/leads', views.CustomerLeadsView.as_view(), name='customer-leads'),

    # ─── Leads ────────────────────────────────────────────
    path('leads', views.LeadListCreateView.as_view(), name='lead-list-create'),
    path('leads/<uuid:id>', views.LeadDetailView.as_view(), name='lead-detail'),
    path('leads/<uuid:id>/interactions', views.LeadInteractionsView.as_view(), name='lead-interactions'),

    # ─── Interactions ─────────────────────────────────────
    path('interactions', views.InteractionListCreateView.as_view(), name='interaction-list-create'),
    path('interactions/<uuid:id>', views.InteractionDetailView.as_view(), name='interaction-detail'),

    # ─── Dashboard ────────────────────────────────────────
    path('dashboard/stats', views.DashboardStatsView.as_view(), name='dashboard-stats'),

    # ─── Pipeline (Kanban) ────────────────────────────────
    path('pipeline', views.PipelineView.as_view(), name='pipeline'),

    # ─── Exports ──────────────────────────────────────────
    path('export/customers', views.ExportCustomersCSVView.as_view(), name='export-customers'),
    path('export/leads', views.ExportLeadsCSVView.as_view(), name='export-leads'),

    # ─── Activity Logs ────────────────────────────────────
    path('activity-logs', views.ActivityLogListView.as_view(), name='activity-logs'),

    # ─── Notifications ────────────────────────────────────
    path('notifications', views.NotificationListView.as_view(), name='notifications'),
    path('notifications/mark-read', views.MarkNotificationsReadView.as_view(), name='notifications-mark-read'),
    path('notifications/unread-count', views.NotificationUnreadCountView.as_view(), name='notifications-unread-count'),
]
