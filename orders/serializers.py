from django.db import transaction
from rest_framework import serializers

from books.models import Book
from orders.models import Order, OrderItem


class OrderItemInputSerializer(serializers.Serializer):
    """Used only for validating incoming order-item payloads on creation."""
    book = serializers.PrimaryKeyRelatedField(queryset=Book.objects.all())
    quantity = serializers.IntegerField(min_value=1)


class OrderItemSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source='book.title', read_only=True)
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = ('id', 'book', 'book_title', 'quantity', 'price', 'subtotal')
        read_only_fields = ('id', 'price', 'subtotal')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'user', 'customer_name', 'status', 'payment_status',
            'total_amount', 'shipping_address', 'items', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'user', 'total_amount', 'created_at', 'updated_at')


class OrderCreateSerializer(serializers.ModelSerializer):
    """
    POST /api/v1/orders/ payload:
    {
        "shipping_address": "...",
        "items": [{"book": 1, "quantity": 2}, ...]
    }
    """
    items = OrderItemInputSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = ('id', 'shipping_address', 'items', 'status', 'payment_status', 'total_amount', 'created_at')
        read_only_fields = ('id', 'status', 'payment_status', 'total_amount', 'created_at')

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError('An order must contain at least one item.')

        # Aggregate duplicate book entries and validate stock availability.
        book_quantities = {}
        for entry in items:
            book = entry['book']
            book_quantities[book.id] = book_quantities.get(book.id, 0) + entry['quantity']

        for book_id, qty in book_quantities.items():
            book = Book.objects.get(pk=book_id)
            if not book.is_available or book.stock_quantity <= 0:
                raise serializers.ValidationError(f'"{book.title}" is currently out of stock.')
            if qty > book.stock_quantity:
                raise serializers.ValidationError(
                    f'Only {book.stock_quantity} unit(s) of "{book.title}" available, but {qty} requested.'
                )
        return items

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        request = self.context['request']

        order = Order.objects.create(user=request.user, **validated_data)

        total = 0
        # Merge duplicate book entries before creating OrderItem rows.
        merged = {}
        for entry in items_data:
            book = entry['book']
            merged[book.id] = merged.get(book.id, 0) + entry['quantity']

        for book_id, quantity in merged.items():
            book = Book.objects.select_for_update().get(pk=book_id)
            if quantity > book.stock_quantity:
                raise serializers.ValidationError(f'"{book.title}" stock changed; not enough units available.')

            OrderItem.objects.create(order=order, book=book, quantity=quantity, price=book.price)
            total += quantity * book.price

            # Inventory management: decrease stock; book auto-becomes unavailable at zero (see Book.save()).
            book.stock_quantity -= quantity
            book.save()

        order.total_amount = total
        order.save(update_fields=['total_amount'])
        return order


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Used by admins to update order/payment status."""

    class Meta:
        model = Order
        fields = ('status', 'payment_status')

    def validate_status(self, value):
        current = self.instance.status if self.instance else None
        if current == Order.Status.CANCELLED:
            raise serializers.ValidationError('Cannot change the status of a cancelled order.')
        if current == Order.Status.DELIVERED and value != Order.Status.DELIVERED:
            raise serializers.ValidationError('Cannot change the status of a delivered order.')
        return value
