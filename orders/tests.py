from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from books.models import Book
from orders.models import Order


class OrderPlacementTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email='buyer@example.com', full_name='Buyer', password='BuyerPass123', role='CUSTOMER'
        )
        self.other_customer = User.objects.create_user(
            email='other@example.com', full_name='Other', password='OtherPass123', role='CUSTOMER'
        )
        self.admin = User.objects.create_user(
            email='orderadmin@example.com', full_name='Order Admin', password='AdminPass123', role='ADMIN'
        )
        self.book = Book.objects.create(
            title='Domain-Driven Design', author='Eric Evans', genre='Programming',
            isbn='9780321125217', price=Decimal('50.00'), stock_quantity=3,
        )
        self.list_url = reverse('order-list')

    def test_customer_can_place_order_and_stock_decreases(self):
        self.client.force_authenticate(user=self.customer)
        payload = {'shipping_address': '123 Main St', 'items': [{'book': self.book.id, 'quantity': 2}]}
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.book.refresh_from_db()
        self.assertEqual(self.book.stock_quantity, 1)
        self.assertEqual(Decimal(response.data['total_amount']), Decimal('100.00'))

    def test_order_rejected_when_stock_insufficient(self):
        self.client.force_authenticate(user=self.customer)
        payload = {'shipping_address': 'Addr', 'items': [{'book': self.book.id, 'quantity': 99}]}
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_book_unavailable_when_stock_hits_zero(self):
        self.client.force_authenticate(user=self.customer)
        payload = {'shipping_address': 'Addr', 'items': [{'book': self.book.id, 'quantity': 3}]}
        self.client.post(self.list_url, payload, format='json')
        self.book.refresh_from_db()
        self.assertEqual(self.book.stock_quantity, 0)
        self.assertFalse(self.book.is_available)

    def test_customer_only_sees_own_orders(self):
        self.client.force_authenticate(user=self.customer)
        self.client.post(self.list_url, {'shipping_address': 'A', 'items': [{'book': self.book.id, 'quantity': 1}]}, format='json')

        self.client.force_authenticate(user=self.other_customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 0)

    def test_admin_sees_all_orders(self):
        self.client.force_authenticate(user=self.customer)
        self.client.post(self.list_url, {'shipping_address': 'A', 'items': [{'book': self.book.id, 'quantity': 1}]}, format='json')

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data['count'], 1)

    def test_admin_can_update_order_status(self):
        self.client.force_authenticate(user=self.customer)
        create_response = self.client.post(
            self.list_url, {'shipping_address': 'A', 'items': [{'book': self.book.id, 'quantity': 1}]}, format='json'
        )
        order_id = create_response.data['id']

        self.client.force_authenticate(user=self.admin)
        url = reverse('order-detail', args=[order_id])
        response = self.client.patch(url, {'status': 'SHIPPED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Order.objects.get(pk=order_id).status, 'SHIPPED')

    def test_customer_cannot_update_order_status(self):
        self.client.force_authenticate(user=self.customer)
        create_response = self.client.post(
            self.list_url, {'shipping_address': 'A', 'items': [{'book': self.book.id, 'quantity': 1}]}, format='json'
        )
        order_id = create_response.data['id']
        url = reverse('order-detail', args=[order_id])
        response = self.client.patch(url, {'status': 'SHIPPED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_can_cancel_own_pending_order(self):
        self.client.force_authenticate(user=self.customer)
        create_response = self.client.post(
            self.list_url, {'shipping_address': 'A', 'items': [{'book': self.book.id, 'quantity': 1}]}, format='json'
        )
        order_id = create_response.data['id']
        url = reverse('order-detail', args=[order_id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Order.objects.get(pk=order_id).status, 'CANCELLED')
