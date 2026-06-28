from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from books.models import Book, Review


class BookManagementTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@example.com', full_name='Admin', password='AdminPass123', role='ADMIN'
        )
        self.customer = User.objects.create_user(
            email='customer@example.com', full_name='Customer', password='CustomerPass123', role='CUSTOMER'
        )
        self.book = Book.objects.create(
            title='Clean Code', author='Robert Martin', genre='Programming',
            isbn='9780132350884', price=Decimal('45.00'), stock_quantity=10,
        )
        self.list_url = reverse('book-list')

    def test_anyone_authenticated_can_list_books(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_request_rejected(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_cannot_create_book(self):
        self.client.force_authenticate(user=self.customer)
        payload = {
            'title': 'New Book', 'author': 'Some Author', 'genre': 'Fiction',
            'isbn': '9780132350891', 'price': '20.00', 'stock_quantity': 5,
        }
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_book(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'title': 'New Book', 'author': 'Some Author', 'genre': 'Fiction',
            'isbn': '9780132350892', 'price': '20.00', 'stock_quantity': 5,
        }
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_isbn_rejected(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'title': 'Another Title', 'author': 'Another Author', 'genre': 'Fiction',
            'isbn': '9780132350884', 'price': '20.00', 'stock_quantity': 5,
        }
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_price_rejected(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'title': 'Cheap Book', 'author': 'X', 'genre': 'Fiction',
            'isbn': '9780132350893', 'price': '-5.00', 'stock_quantity': 5,
        }
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_search_by_title(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get(self.list_url, {'search': 'Clean'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)

    def test_book_becomes_unavailable_at_zero_stock(self):
        self.book.stock_quantity = 0
        self.book.save()
        self.book.refresh_from_db()
        self.assertFalse(self.book.is_available)

    def test_admin_can_delete_book(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse('book-detail', args=[self.book.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class ReviewTests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            email='reviewer@example.com', full_name='Reviewer', password='ReviewPass123', role='CUSTOMER'
        )
        self.book = Book.objects.create(
            title='The Pragmatic Programmer', author='Hunt & Thomas', genre='Programming',
            isbn='9780135957059', price=Decimal('40.00'), stock_quantity=5,
        )

    def test_create_review(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('review-list')
        response = self.client.post(url, {'book': self.book.id, 'rating': 5, 'comment': 'Excellent!'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.count(), 1)

    def test_duplicate_review_rejected(self):
        Review.objects.create(book=self.book, user=self.customer, rating=4)
        self.client.force_authenticate(user=self.customer)
        url = reverse('review-list')
        response = self.client.post(url, {'book': self.book.id, 'rating': 3})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
