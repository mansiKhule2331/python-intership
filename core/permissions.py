from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminRole(BasePermission):
    """Allows access only to users with the ADMIN role."""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'ADMIN'
        )


class IsCustomerRole(BasePermission):
    """Allows access only to users with the CUSTOMER role."""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'CUSTOMER'
        )


class IsAdminOrReadOnly(BasePermission):
    """Admins can perform any action; everyone authenticated can read."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == 'ADMIN'


class IsOwnerOrAdmin(BasePermission):
    """Object-level permission: owners of an object or admins may access it."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        owner = getattr(obj, 'user', None) or getattr(obj, 'customer', None)
        return owner == request.user
