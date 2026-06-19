"""
CRM API Permissions
Role-Based Access Control (RBAC) implementation
"""

from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Allow access only to Admin users"""
    message = "Admin access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsSalesRep(permissions.BasePermission):
    """Allow access only to Sales Representative users"""
    message = "Sales Representative access required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'sales_rep'
        )


class IsAdminOrSalesRep(permissions.BasePermission):
    """Allow access to Admin or Sales Rep users"""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ['admin', 'sales_rep']
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Admin can write; authenticated users can read"""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.role == 'admin'


class IsOwnerOrAdmin(permissions.BasePermission):
    """Object owner or Admin can access"""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        # Check if assigned_to or created_by matches
        if hasattr(obj, 'assigned_to'):
            return obj.assigned_to == request.user
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        return False


class LeadPermission(permissions.BasePermission):
    """
    Admins: full access to all leads
    Sales Reps: access only to assigned leads
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        # Sales rep can only access assigned leads
        return obj.assigned_to == request.user


class CustomerPermission(permissions.BasePermission):
    """
    Admins: full CRUD
    Sales Reps: read + create; no delete
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method == 'DELETE':
            return request.user.role == 'admin'
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        if request.method == 'DELETE':
            return False
        return True
