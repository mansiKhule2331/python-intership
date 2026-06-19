"""
CRM API Serializers
Complete serialization layer for all models
"""

from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Customer, Lead, Interaction, ActivityLog, Notification


# ─────────────────────────────────────────────────────────────
# AUTH SERIALIZERS
# ─────────────────────────────────────────────────────────────

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password', 'first_name', 'last_name', 'role']
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False},
            'role': {'required': False},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        username = attrs.get('username')
        password = attrs.get('password')

        if not email and not username:
            raise serializers.ValidationError("Email or username is required.")

        # Try to find user
        try:
            if email:
                user = User.objects.get(email=email)
            else:
                user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials.")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials.")

        if not user.is_active:
            raise serializers.ValidationError("Account is deactivated.")

        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'avatar', 'avatar_url',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'role', 'created_at', 'updated_at']

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class UserListSerializer(serializers.ModelSerializer):
    """Compact user representation for lists/assignments"""
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'is_active']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs


# ─────────────────────────────────────────────────────────────
# CUSTOMER SERIALIZERS
# ─────────────────────────────────────────────────────────────

class CustomerSerializer(serializers.ModelSerializer):
    leads_count = serializers.ReadOnlyField()
    active_leads_count = serializers.ReadOnlyField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'email', 'phone', 'company', 'website',
            'address', 'city', 'country', 'notes', 'tags',
            'leads_count', 'active_leads_count',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None

    def validate_email(self, value):
        instance = self.instance
        if Customer.objects.filter(email=value).exclude(pk=instance.pk if instance else None).exists():
            raise serializers.ValidationError("Customer with this email already exists.")
        return value


class CustomerListSerializer(serializers.ModelSerializer):
    """Compact customer representation"""
    leads_count = serializers.ReadOnlyField()

    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'phone', 'company', 'leads_count', 'created_at']


# ─────────────────────────────────────────────────────────────
# LEAD SERIALIZERS
# ─────────────────────────────────────────────────────────────

class InteractionInlineSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Interaction
        fields = [
            'id', 'interaction_type', 'description', 'outcome',
            'interaction_date', 'duration_minutes', 'created_by_name', 'created_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None


class LeadSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    customer_company = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    interactions_count = serializers.ReadOnlyField()
    recent_interaction = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id', 'customer', 'customer_name', 'customer_email', 'customer_company',
            'title', 'status', 'priority', 'estimated_value', 'expected_close_date',
            'source', 'notes', 'tags',
            'assigned_to', 'assigned_to_name',
            'interactions_count', 'recent_interaction',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_customer_name(self, obj):
        return obj.customer.name

    def get_customer_email(self, obj):
        return obj.customer.email

    def get_customer_company(self, obj):
        return obj.customer.company

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.full_name
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None

    def get_recent_interaction(self, obj):
        interaction = obj.interactions.first()
        if interaction:
            return {
                'type': interaction.interaction_type,
                'date': interaction.interaction_date,
                'description': interaction.description[:100]
            }
        return None


class LeadListSerializer(serializers.ModelSerializer):
    """Compact lead representation for lists"""
    customer_name = serializers.SerializerMethodField()
    customer_company = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id', 'title', 'status', 'priority', 'estimated_value',
            'customer', 'customer_name', 'customer_company',
            'assigned_to', 'assigned_to_name',
            'expected_close_date', 'created_at', 'updated_at'
        ]

    def get_customer_name(self, obj):
        return obj.customer.name

    def get_customer_company(self, obj):
        return obj.customer.company

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.full_name
        return None


# ─────────────────────────────────────────────────────────────
# INTERACTION SERIALIZERS
# ─────────────────────────────────────────────────────────────

class InteractionSerializer(serializers.ModelSerializer):
    lead_title = serializers.SerializerMethodField()
    lead_customer = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Interaction
        fields = [
            'id', 'lead', 'lead_title', 'lead_customer',
            'interaction_type', 'description', 'outcome',
            'interaction_date', 'duration_minutes',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_lead_title(self, obj):
        return obj.lead.title

    def get_lead_customer(self, obj):
        return obj.lead.customer.name

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None


# ─────────────────────────────────────────────────────────────
# ACTIVITY LOG & NOTIFICATION SERIALIZERS
# ─────────────────────────────────────────────────────────────

class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'action', 'model_name',
            'object_id', 'object_repr', 'changes', 'ip_address', 'created_at'
        ]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.full_name
        return 'System'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'is_read', 'related_lead', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


# ─────────────────────────────────────────────────────────────
# DASHBOARD SERIALIZER
# ─────────────────────────────────────────────────────────────

class DashboardStatsSerializer(serializers.Serializer):
    total_customers = serializers.IntegerField()
    total_leads = serializers.IntegerField()
    total_interactions = serializers.IntegerField()
    leads_by_status = serializers.DictField()
    leads_by_priority = serializers.DictField()
    recent_interactions = InteractionSerializer(many=True)
    recent_leads = LeadListSerializer(many=True)
    monthly_leads = serializers.ListField()
    monthly_interactions = serializers.ListField()
    conversion_rate = serializers.FloatField()
    total_pipeline_value = serializers.DecimalField(max_digits=15, decimal_places=2, allow_null=True)
    active_reps = UserListSerializer(many=True)
    top_performers = serializers.ListField()
