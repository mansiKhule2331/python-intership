"""
CRM API Views
Complete REST API implementation for all resources
"""

import logging
from datetime import datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q, Avg
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, status, viewsets, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

from .models import Customer, Lead, Interaction, ActivityLog, Notification
from .serializers import (
    UserRegisterSerializer, UserLoginSerializer, UserProfileSerializer,
    UserListSerializer, ChangePasswordSerializer,
    CustomerSerializer, CustomerListSerializer,
    LeadSerializer, LeadListSerializer,
    InteractionSerializer,
    ActivityLogSerializer, NotificationSerializer,
    DashboardStatsSerializer,
)
from .permissions import IsAdmin, CustomerPermission, LeadPermission
from .utils import (
    log_activity, create_notification, export_customers_csv,
    export_leads_csv, get_client_ip, send_lead_assignment_email,
    send_status_change_email, get_monthly_data,
)

User = get_user_model()
logger = logging.getLogger('crm_api')


# ─────────────────────────────────────────────────────────────
# AUTH VIEWS
# ─────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register"""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = UserRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        log_activity(user, 'create', 'User', user.id, str(user), request=request)

        return Response({
            'message': 'Registration successful.',
            'user': UserProfileSerializer(user, context={'request': request}).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        # Update last login IP
        user.last_login_ip = get_client_ip(request)
        user.save(update_fields=['last_login_ip'])

        refresh = RefreshToken.for_user(user)
        log_activity(user, 'login', 'User', user.id, str(user), request=request)

        return Response({
            'message': 'Login successful.',
            'user': UserProfileSerializer(user, context={'request': request}).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        })


class LogoutView(APIView):
    """POST /api/auth/logout"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            log_activity(request.user, 'logout', 'User', request.user.id, str(request.user), request=request)
            return Response({'message': 'Logged out successfully.'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/auth/profile"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_activity(request.user, 'update', 'User', instance.id, str(instance), request=request)
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """POST /api/auth/change-password"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        log_activity(request.user, 'update', 'User', user.id, 'Password changed', request=request)
        return Response({'message': 'Password changed successfully.'})


# ─────────────────────────────────────────────────────────────
# USER MANAGEMENT (Admin Only)
# ─────────────────────────────────────────────────────────────

class UserListView(generics.ListAPIView):
    """GET /api/users - Admin only"""
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'created_at', 'role']
    ordering = ['-created_at']


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/users/{id} - Admin only"""
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    lookup_field = 'id'

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response({'error': 'Cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
        self.perform_destroy(instance)
        return Response({'message': 'User deleted.'}, status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────
# CUSTOMER FILTER
# ─────────────────────────────────────────────────────────────

class CustomerFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    company = django_filters.CharFilter(lookup_expr='icontains')
    city = django_filters.CharFilter(lookup_expr='icontains')
    country = django_filters.CharFilter(lookup_expr='icontains')
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Customer
        fields = ['name', 'company', 'city', 'country']


# ─────────────────────────────────────────────────────────────
# CUSTOMER VIEWS
# ─────────────────────────────────────────────────────────────

class CustomerListCreateView(generics.ListCreateAPIView):
    """GET /api/customers  POST /api/customers"""
    permission_classes = [IsAuthenticated, CustomerPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = CustomerFilter
    search_fields = ['name', 'email', 'company', 'phone']
    ordering_fields = ['name', 'company', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return Customer.objects.select_related('created_by').prefetch_related('leads').all()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return CustomerListSerializer
        return CustomerSerializer

    def perform_create(self, serializer):
        customer = serializer.save(created_by=self.request.user)
        log_activity(self.request.user, 'create', 'Customer', customer.id, str(customer), request=self.request)


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/customers/{id}"""
    permission_classes = [IsAuthenticated, CustomerPermission]
    serializer_class = CustomerSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return Customer.objects.select_related('created_by').prefetch_related('leads').all()

    def perform_update(self, serializer):
        customer = serializer.save()
        log_activity(self.request.user, 'update', 'Customer', customer.id, str(customer), request=self.request)

    def perform_destroy(self, instance):
        log_activity(self.request.user, 'delete', 'Customer', instance.id, str(instance), request=self.request)
        instance.delete()


class CustomerLeadsView(generics.ListAPIView):
    """GET /api/customers/{id}/leads"""
    permission_classes = [IsAuthenticated]
    serializer_class = LeadListSerializer

    def get_queryset(self):
        customer_id = self.kwargs['id']
        return Lead.objects.filter(customer_id=customer_id).select_related('customer', 'assigned_to')


# ─────────────────────────────────────────────────────────────
# LEAD FILTER
# ─────────────────────────────────────────────────────────────

class LeadFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=Lead.Status.choices)
    priority = django_filters.MultipleChoiceFilter(choices=Lead.Priority.choices)
    assigned_to = django_filters.UUIDFilter()
    customer = django_filters.UUIDFilter()
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    expected_close_after = django_filters.DateFilter(field_name='expected_close_date', lookup_expr='gte')
    expected_close_before = django_filters.DateFilter(field_name='expected_close_date', lookup_expr='lte')
    min_value = django_filters.NumberFilter(field_name='estimated_value', lookup_expr='gte')
    max_value = django_filters.NumberFilter(field_name='estimated_value', lookup_expr='lte')

    class Meta:
        model = Lead
        fields = ['status', 'priority', 'assigned_to', 'customer']


# ─────────────────────────────────────────────────────────────
# LEAD VIEWS
# ─────────────────────────────────────────────────────────────

class LeadListCreateView(generics.ListCreateAPIView):
    """GET /api/leads  POST /api/leads"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = LeadFilter
    search_fields = ['title', 'notes', 'customer__name', 'customer__company']
    ordering_fields = ['title', 'status', 'priority', 'created_at', 'estimated_value']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Lead.objects.select_related('customer', 'assigned_to', 'created_by').all()
        # Sales reps see only their assigned leads
        if self.request.user.role == 'sales_rep':
            qs = qs.filter(assigned_to=self.request.user)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return LeadListSerializer
        return LeadSerializer

    def perform_create(self, serializer):
        lead = serializer.save(created_by=self.request.user)
        log_activity(self.request.user, 'create', 'Lead', lead.id, str(lead), request=self.request)

        # Notify assigned user
        if lead.assigned_to and lead.assigned_to != self.request.user:
            create_notification(
                lead.assigned_to,
                'lead_assigned',
                f'New Lead Assigned: {lead.title}',
                f'Customer: {lead.customer.name} | Priority: {lead.priority}',
                related_lead=lead,
            )
            send_lead_assignment_email(lead, lead.assigned_to)


class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/leads/{id}"""
    permission_classes = [IsAuthenticated, LeadPermission]
    serializer_class = LeadSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = Lead.objects.select_related('customer', 'assigned_to', 'created_by').all()
        if self.request.user.role == 'sales_rep':
            qs = qs.filter(assigned_to=self.request.user)
        return qs

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        old_assigned = serializer.instance.assigned_to
        lead = serializer.save()

        changes = {}
        if old_status != lead.status:
            changes['status'] = {'from': old_status, 'to': lead.status}
            send_status_change_email(lead, old_status, lead.status, self.request.user)
            if lead.assigned_to:
                create_notification(
                    lead.assigned_to,
                    'lead_status_changed',
                    f'Lead Status Changed: {lead.title}',
                    f'Status changed from {old_status} to {lead.status}',
                    related_lead=lead,
                )

        if old_assigned != lead.assigned_to and lead.assigned_to:
            changes['assigned_to'] = {'to': str(lead.assigned_to)}
            if lead.assigned_to != self.request.user:
                create_notification(
                    lead.assigned_to,
                    'lead_assigned',
                    f'Lead Assigned: {lead.title}',
                    f'You have been assigned lead: {lead.title}',
                    related_lead=lead,
                )
                send_lead_assignment_email(lead, lead.assigned_to)

        log_activity(self.request.user, 'update', 'Lead', lead.id, str(lead), changes=changes, request=self.request)

    def perform_destroy(self, instance):
        log_activity(self.request.user, 'delete', 'Lead', instance.id, str(instance), request=self.request)
        instance.delete()


class LeadInteractionsView(generics.ListAPIView):
    """GET /api/leads/{id}/interactions"""
    permission_classes = [IsAuthenticated]
    serializer_class = InteractionSerializer

    def get_queryset(self):
        return Interaction.objects.filter(lead_id=self.kwargs['id']).select_related('created_by')


# ─────────────────────────────────────────────────────────────
# INTERACTION VIEWS
# ─────────────────────────────────────────────────────────────

class InteractionFilter(django_filters.FilterSet):
    interaction_type = django_filters.MultipleChoiceFilter(choices=Interaction.InteractionType.choices)
    lead = django_filters.UUIDFilter()
    date_after = django_filters.DateTimeFilter(field_name='interaction_date', lookup_expr='gte')
    date_before = django_filters.DateTimeFilter(field_name='interaction_date', lookup_expr='lte')

    class Meta:
        model = Interaction
        fields = ['interaction_type', 'lead']


class InteractionListCreateView(generics.ListCreateAPIView):
    """GET /api/interactions  POST /api/interactions"""
    permission_classes = [IsAuthenticated]
    serializer_class = InteractionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = InteractionFilter
    search_fields = ['description', 'outcome', 'lead__title']
    ordering_fields = ['interaction_date', 'created_at', 'interaction_type']
    ordering = ['-interaction_date']

    def get_queryset(self):
        qs = Interaction.objects.select_related('lead', 'lead__customer', 'created_by').all()
        if self.request.user.role == 'sales_rep':
            qs = qs.filter(lead__assigned_to=self.request.user)
        return qs

    def perform_create(self, serializer):
        interaction = serializer.save(created_by=self.request.user)
        log_activity(
            self.request.user, 'create', 'Interaction',
            interaction.id, str(interaction), request=self.request
        )
        # Notify lead's assigned user (if not the creator)
        lead = interaction.lead
        if lead.assigned_to and lead.assigned_to != self.request.user:
            create_notification(
                lead.assigned_to,
                'interaction_added',
                f'New Interaction: {lead.title}',
                f'{interaction.interaction_type.capitalize()} added by {self.request.user.full_name}',
                related_lead=lead,
            )


class InteractionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/interactions/{id}"""
    permission_classes = [IsAuthenticated]
    serializer_class = InteractionSerializer
    lookup_field = 'id'

    def get_queryset(self):
        qs = Interaction.objects.select_related('lead', 'lead__customer', 'created_by').all()
        if self.request.user.role == 'sales_rep':
            qs = qs.filter(lead__assigned_to=self.request.user)
        return qs

    def perform_update(self, serializer):
        interaction = serializer.save()
        log_activity(self.request.user, 'update', 'Interaction', interaction.id, str(interaction), request=self.request)

    def perform_destroy(self, instance):
        log_activity(self.request.user, 'delete', 'Interaction', instance.id, str(instance), request=self.request)
        instance.delete()


# ─────────────────────────────────────────────────────────────
# DASHBOARD VIEWS
# ─────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    """GET /api/dashboard/stats"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()

        # Base querysets filtered by role
        if user.role == 'admin':
            leads_qs = Lead.objects.all()
            interactions_qs = Interaction.objects.all()
            customers_qs = Customer.objects.all()
        else:
            leads_qs = Lead.objects.filter(assigned_to=user)
            interactions_qs = Interaction.objects.filter(lead__assigned_to=user)
            customers_qs = Customer.objects.filter(leads__assigned_to=user).distinct()

        # Basic counts
        total_customers = customers_qs.count()
        total_leads = leads_qs.count()
        total_interactions = interactions_qs.count()

        # Leads by status
        leads_by_status = dict(
            leads_qs.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )
        # Ensure all statuses are present
        for s in Lead.Status.values:
            leads_by_status.setdefault(s, 0)

        # Leads by priority
        leads_by_priority = dict(
            leads_qs.values('priority').annotate(count=Count('id')).values_list('priority', 'count')
        )

        # Recent data
        recent_interactions = interactions_qs.select_related('lead', 'lead__customer', 'created_by').order_by('-interaction_date')[:5]
        recent_leads = leads_qs.select_related('customer', 'assigned_to').order_by('-created_at')[:5]

        # Monthly leads (last 6 months)
        six_months_ago = now - timedelta(days=180)
        monthly_leads = list(
            leads_qs.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
            .values_list('month', 'count')
        )
        monthly_leads_data = [{'month': m[0].strftime('%b %Y'), 'count': m[1]} for m in monthly_leads]

        monthly_interactions = list(
            interactions_qs.filter(created_at__gte=six_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
            .values_list('month', 'count')
        )
        monthly_interactions_data = [{'month': m[0].strftime('%b %Y'), 'count': m[1]} for m in monthly_interactions]

        # Conversion rate
        won_leads = leads_by_status.get('won', 0)
        conversion_rate = round((won_leads / total_leads * 100), 1) if total_leads > 0 else 0.0

        # Pipeline value
        pipeline_value = leads_qs.exclude(status__in=['won', 'lost']).aggregate(
            total=Sum('estimated_value')
        )['total']

        # Active reps (admin only)
        active_reps = []
        top_performers = []
        if user.role == 'admin':
            active_reps = User.objects.filter(role='sales_rep', is_active=True)[:10]
            top_performers = list(
                Lead.objects.filter(status='won')
                .values('assigned_to__username', 'assigned_to__first_name', 'assigned_to__last_name')
                .annotate(won_count=Count('id'))
                .order_by('-won_count')[:5]
            )

        return Response({
            'total_customers': total_customers,
            'total_leads': total_leads,
            'total_interactions': total_interactions,
            'leads_by_status': leads_by_status,
            'leads_by_priority': leads_by_priority,
            'recent_interactions': InteractionSerializer(
                recent_interactions, many=True, context={'request': request}
            ).data,
            'recent_leads': LeadListSerializer(
                recent_leads, many=True, context={'request': request}
            ).data,
            'monthly_leads': monthly_leads_data,
            'monthly_interactions': monthly_interactions_data,
            'conversion_rate': conversion_rate,
            'total_pipeline_value': str(pipeline_value) if pipeline_value else '0',
            'active_reps': UserListSerializer(active_reps, many=True).data,
            'top_performers': top_performers,
        })


# ─────────────────────────────────────────────────────────────
# EXPORT VIEWS
# ─────────────────────────────────────────────────────────────

class ExportCustomersCSVView(APIView):
    """GET /api/export/customers"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        customers = Customer.objects.all()
        csv_data = export_customers_csv(customers)
        log_activity(request.user, 'export', 'Customer', request=request)
        response = HttpResponse(csv_data, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="customers_{datetime.now().strftime("%Y%m%d")}.csv"'
        return response


class ExportLeadsCSVView(APIView):
    """GET /api/export/leads"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        leads = Lead.objects.select_related('customer', 'assigned_to').all()
        csv_data = export_leads_csv(leads)
        log_activity(request.user, 'export', 'Lead', request=request)
        response = HttpResponse(csv_data, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="leads_{datetime.now().strftime("%Y%m%d")}.csv"'
        return response


# ─────────────────────────────────────────────────────────────
# ACTIVITY LOG VIEWS
# ─────────────────────────────────────────────────────────────

class ActivityLogListView(generics.ListAPIView):
    """GET /api/activity-logs"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = ActivityLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering = ['-created_at']

    def get_queryset(self):
        return ActivityLog.objects.select_related('user').all()


# ─────────────────────────────────────────────────────────────
# NOTIFICATION VIEWS
# ─────────────────────────────────────────────────────────────

class NotificationListView(generics.ListAPIView):
    """GET /api/notifications"""
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')[:20]


class MarkNotificationsReadView(APIView):
    """POST /api/notifications/mark-read"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read.'})


class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


# ─────────────────────────────────────────────────────────────
# PIPELINE VIEW (Kanban-style data)
# ─────────────────────────────────────────────────────────────

class PipelineView(APIView):
    """GET /api/pipeline - Kanban board data grouped by status"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == 'admin':
            leads_qs = Lead.objects.select_related('customer', 'assigned_to').all()
        else:
            leads_qs = Lead.objects.filter(assigned_to=request.user).select_related('customer', 'assigned_to')

        pipeline = {}
        for s in Lead.Status.choices:
            status_key = s[0]
            status_leads = leads_qs.filter(status=status_key)
            pipeline[status_key] = {
                'label': s[1],
                'count': status_leads.count(),
                'total_value': str(status_leads.aggregate(v=Sum('estimated_value'))['v'] or 0),
                'leads': LeadListSerializer(status_leads, many=True, context={'request': request}).data,
            }

        return Response(pipeline)

    def patch(self, request):
        """PATCH /api/pipeline - Update lead status (drag-drop)"""
        lead_id = request.data.get('lead_id')
        new_status = request.data.get('status')

        if not lead_id or not new_status:
            return Response({'error': 'lead_id and status are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if new_status not in Lead.Status.values:
            return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if request.user.role == 'admin':
                lead = Lead.objects.get(id=lead_id)
            else:
                lead = Lead.objects.get(id=lead_id, assigned_to=request.user)
        except Lead.DoesNotExist:
            return Response({'error': 'Lead not found.'}, status=status.HTTP_404_NOT_FOUND)

        old_status = lead.status
        lead.status = new_status
        lead.save(update_fields=['status', 'updated_at'])

        log_activity(
            request.user, 'status_change', 'Lead', lead.id,
            str(lead), changes={'status': {'from': old_status, 'to': new_status}},
            request=request
        )

        return Response(LeadSerializer(lead, context={'request': request}).data)
