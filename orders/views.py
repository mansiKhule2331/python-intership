import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdminRole
from orders.models import Order
from orders.serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
)

logger = logging.getLogger('bookstore')


class OrderViewSet(viewsets.ModelViewSet):
    """
    - Customers: can create orders and view/cancel their own order history.
    - Admins: can view all orders and update order/payment status.
    """
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'payment_status']
    ordering_fields = ['created_at', 'total_amount']
    throttle_scope = 'orders'
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = Order.objects.select_related('user').prefetch_related('items__book')
        if getattr(self, 'swagger_fake_view', False) or not self.request.user.is_authenticated:
            return qs.none()
        if self.request.user.role == 'ADMIN':
            return qs
        return qs.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        if self.action in ('update', 'partial_update') and getattr(self.request.user, 'role', None) == 'ADMIN':
            return OrderStatusUpdateSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        logger.info("Order #%s placed by %s", order.id, request.user.email)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response(
                {'success': False, 'message': 'Only admins can update order status.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Customers may only cancel their own pending orders; admins may delete any."""
        order = self.get_object()
        if request.user.role != 'ADMIN':
            if order.status != Order.Status.PENDING:
                return Response(
                    {'success': False, 'message': 'Only pending orders can be cancelled.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            order.status = Order.Status.CANCELLED
            order.save(update_fields=['status'])
            return Response(OrderSerializer(order).data)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """GET /api/v1/orders/history/ -- Current customer's full order history."""
        queryset = self.get_queryset().filter(user=request.user)
        page = self.paginate_queryset(queryset)
        serializer = OrderSerializer(page or queryset, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)
