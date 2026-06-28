from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User


class RegistrationTests(APITestCase):
    def setUp(self):
        self.url = reverse('auth-register')

    def test_register_customer_success(self):
        payload = {
            'full_name': 'Jane Doe',
            'email': 'jane@example.com',
            'password': 'StrongPass123',
            'password2': 'StrongPass123',
            'role': 'CUSTOMER',
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='jane@example.com').exists())

    def test_register_duplicate_email_fails(self):
        User.objects.create_user(email='dup@example.com', full_name='Dup', password='StrongPass123')
        payload = {
            'full_name': 'Another',
            'email': 'dup@example.com',
            'password': 'StrongPass123',
            'password2': 'StrongPass123',
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch_fails(self):
        payload = {
            'full_name': 'Jane Doe',
            'email': 'jane2@example.com',
            'password': 'StrongPass123',
            'password2': 'DifferentPass123',
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_self_register_as_admin(self):
        payload = {
            'full_name': 'Wannabe Admin',
            'email': 'admin2@example.com',
            'password': 'StrongPass123',
            'password2': 'StrongPass123',
            'role': 'ADMIN',
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AuthenticationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='login@example.com', full_name='Login User', password='StrongPass123'
        )
        self.login_url = reverse('auth-login')

    def test_login_success_returns_tokens(self):
        response = self.client.post(self.login_url, {'email': 'login@example.com', 'password': 'StrongPass123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_wrong_password_fails(self):
        response = self.client.post(self.login_url, {'email': 'login@example.com', 'password': 'WrongPass'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_requires_authentication(self):
        response = self.client.get(reverse('auth-profile'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_returns_authenticated_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse('auth-profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'login@example.com')

    def test_change_password(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('auth-change-password')
        response = self.client.put(url, {
            'old_password': 'StrongPass123',
            'new_password': 'NewStrongPass456',
            'new_password2': 'NewStrongPass456',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewStrongPass456'))

    def test_logout_blacklists_token(self):
        login_response = self.client.post(self.login_url, {'email': 'login@example.com', 'password': 'StrongPass123'})
        refresh = login_response.data['refresh']
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse('auth-logout'), {'refresh': refresh})
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)
