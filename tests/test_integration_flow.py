"""
End-to-end integration tests that exercise the full customer journey:
register -> login -> browse books -> place order -> view order history,
plus an admin journey: login -> create book -> update order status.
"""
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from books.models import Book


class FullPurchaseJourneyTests(APITestCase):
    def test_customer_registration_through_order_placement(self):
        # 1. Register
        register_response = self.client.post(reverse('auth-register'), {
            'full_name': 'Integration Tester',
            'email': 'integration@example.com',
            'password': 'IntegrationPass123',
            'password2': 'IntegrationPass123',
        })
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)

        # 2. Login
        login_response = self.client.post(reverse('auth-login'), {
            'email': 'integration@example.com',
            'password': 'IntegrationPass123',
        })
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        access_token = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        # 3. Seed a book directly (as if an admin had added it)
        admin = User.objects.create_user(
            email='seedadmin@example.com', full_name='Seed Admin', password='SeedPass123', role='ADMIN'
        )
        book = Book.objects.create(
            title='Design Patterns', author='Gang of Four', genre='Programming',
            isbn='9780201633610', price=Decimal('60.00'), stock_quantity=4,
        )

        # 4. Browse books
        list_response = self.client.get(reverse('book-list'))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data['count'], 1)

        # 5. Place an order
        order_response = self.client.post(reverse('order-list'), {
            'shipping_address': '42 Wallaby Way',
            'items': [{'book': book.id, 'quantity': 2}],
        }, format='json')
        self.assertEqual(order_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(order_response.data['total_amount']), Decimal('120.00'))

        # 6. Verify stock decreased
        book.refresh_from_db()
        self.assertEqual(book.stock_quantity, 2)

        # 7. View own order history
        history_response = self.client.get(reverse('order-history'))
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(history_response.data['count'], 1)

        # 8. Admin updates the order status
        self.client.credentials()  # clear customer auth
        admin_login = self.client.post(reverse('auth-login'), {
            'email': 'seedadmin@example.com', 'password': 'SeedPass123',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_login.data['access']}")

        order_id = order_response.data['id']
        update_response = self.client.patch(
            reverse('order-detail', args=[order_id]), {'status': 'PROCESSING'}, format='json'
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['status'], 'PROCESSING')
