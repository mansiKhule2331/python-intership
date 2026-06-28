"""
CRM API - Comprehensive Test Suite
Covers: Authentication, Customers, Leads, Interactions, Dashboard, RBAC
"""

import uuid
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from crm_api.models import User, Customer, Lead, Interaction


# ─── Fixtures ─────────────────────────────────────────────────

def make_admin(suffix=''):
    return User.objects.create_user(
        email=f'admin{suffix}@test.com',
        username=f'admin{suffix}',
        password='Admin@1234',
        role=User.Role.ADMIN,
        is_active=True,
    )

def make_rep(suffix=''):
    return User.objects.create_user(
        email=f'rep{suffix}@test.com',
        username=f'rep{suffix}',
        password='Rep@12345',
        role=User.Role.SALES_REP,
        is_active=True,
    )

def make_customer(created_by, suffix=''):
    return Customer.objects.create(
        name=f'Test Customer {suffix}',
        email=f'customer{suffix}@test.com',
        company=f'TestCo {suffix}',
        created_by=created_by,
    )

def make_lead(customer, assigned_to, created_by, status='new'):
    return Lead.objects.create(
        customer=customer,
        title='Test Lead',
        status=status,
        priority='medium',
        assigned_to=assigned_to,
        created_by=created_by,
        estimated_value=10000,
    )

def make_interaction(lead, created_by):
    return Interaction.objects.create(
        lead=lead,
        interaction_type='call',
        description='Test call interaction',
        created_by=created_by,
    )


# ─── Auth Tests ───────────────────────────────────────────────

class AuthRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/register'

    def test_register_success(self):
        """User can register with valid data"""
        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'StrongPass1',
            'confirm_password': 'StrongPass1',
            'role': 'sales_rep',
        }
        res = self.client.post(self.url, data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', res.data)
        self.assertIn('access', res.data['tokens'])
        self.assertIn('refresh', res.data['tokens'])
        self.assertEqual(res.data['user']['username'], 'newuser')

    def test_register_duplicate_email(self):
        """Registration fails with duplicate email"""
        make_admin()
        data = {
            'username': 'other',
            'email': 'admin@test.com',
            'password': 'StrongPass1',
            'confirm_password': 'StrongPass1',
        }
        res = self.client.post(self.url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        """Registration fails if passwords don't match"""
        data = {
            'username': 'user2',
            'email': 'user2@test.com',
            'password': 'StrongPass1',
            'confirm_password': 'DifferentPass1',
        }
        res = self.client.post(self.url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_weak_password(self):
        """Registration fails with weak password"""
        data = {
            'username': 'user3',
            'email': 'user3@test.com',
            'password': 'weak',
            'confirm_password': 'weak',
        }
        res = self.client.post(self.url, data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_fields(self):
        """Registration fails with missing required fields"""
        res = self.client.post(self.url, {'username': 'incomplete'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class AuthLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/auth/login'
        self.admin = make_admin()

    def test_login_with_email_success(self):
        """Login with email and correct password succeeds"""
        res = self.client.post(self.url, {'email': 'admin@test.com', 'password': 'Admin@1234'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', res.data)
        self.assertIn('user', res.data)

    def test_login_with_username_success(self):
        """Login with username succeeds"""
        res = self.client.post(self.url, {'username': 'admin', 'password': 'Admin@1234'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_login_wrong_password(self):
        """Login fails with wrong password"""
        res = self.client.post(self.url, {'email': 'admin@test.com', 'password': 'WrongPass'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_nonexistent_user(self):
        """Login fails for nonexistent user"""
        res = self.client.post(self.url, {'email': 'ghost@test.com', 'password': 'Admin@1234'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_inactive_user(self):
        """Login fails for deactivated user"""
        self.admin.is_active = False
        self.admin.save()
        res = self.client.post(self.url, {'email': 'admin@test.com', 'password': 'Admin@1234'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_no_credentials(self):
        """Login fails with no credentials"""
        res = self.client.post(self.url, {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class AuthProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.client.force_authenticate(user=self.admin)

    def test_get_profile(self):
        """Authenticated user can get profile"""
        res = self.client.get('/api/auth/profile')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], 'admin@test.com')

    def test_update_profile(self):
        """Authenticated user can update profile"""
        res = self.client.put('/api/auth/profile', {
            'first_name': 'Updated',
            'last_name': 'Name',
            'username': self.admin.username,
            'email': self.admin.email,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['first_name'], 'Updated')

    def test_profile_requires_auth(self):
        """Profile endpoint requires authentication"""
        self.client.logout()
        res = self.client.get('/api/auth/profile')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── Customer Tests ───────────────────────────────────────────

class CustomerTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.rep = make_rep()
        self.client.force_authenticate(user=self.admin)
        self.customer = make_customer(self.admin, suffix='1')

    def test_list_customers(self):
        """Authenticated user can list customers"""
        res = self.client.get('/api/customers')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_customer_admin(self):
        """Admin can create a customer"""
        data = {'name': 'New Corp', 'email': 'new@corp.com', 'company': 'NewCo'}
        res = self.client.post('/api/customers', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], 'New Corp')

    def test_create_customer_sales_rep(self):
        """Sales rep can create a customer"""
        self.client.force_authenticate(user=self.rep)
        data = {'name': 'Rep Customer', 'email': 'rep_cust@test.com'}
        res = self.client.post('/api/customers', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_get_customer_detail(self):
        """Can retrieve customer detail"""
        res = self.client.get(f'/api/customers/{self.customer.id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], self.customer.name)

    def test_update_customer(self):
        """Can update a customer"""
        res = self.client.put(f'/api/customers/{self.customer.id}', {
            'name': 'Updated Name',
            'email': self.customer.email,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Updated Name')

    def test_delete_customer_admin(self):
        """Admin can delete customer"""
        cust = make_customer(self.admin, suffix='del')
        res = self.client.delete(f'/api/customers/{cust.id}')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Customer.objects.filter(id=cust.id).exists())

    def test_delete_customer_sales_rep_forbidden(self):
        """Sales rep cannot delete customer"""
        self.client.force_authenticate(user=self.rep)
        res = self.client.delete(f'/api/customers/{self.customer.id}')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_search_customers(self):
        """Can search customers by name"""
        make_customer(self.admin, suffix='searchtest')
        res = self.client.get('/api/customers', {'search': 'searchtest'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertTrue(any('searchtest' in str(c['name']).lower() for c in results))

    def test_duplicate_email_rejected(self):
        """Customer with duplicate email is rejected"""
        data = {'name': 'Dup', 'email': self.customer.email}
        res = self.client.post('/api/customers', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_not_found(self):
        """Returns 404 for nonexistent customer"""
        res = self.client.get(f'/api/customers/{uuid.uuid4()}')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# ─── Lead Tests ───────────────────────────────────────────────

class LeadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.rep = make_rep()
        self.customer = make_customer(self.admin, suffix='lead')
        self.lead = make_lead(self.customer, self.rep, self.admin)
        self.client.force_authenticate(user=self.admin)

    def test_list_leads_admin(self):
        """Admin can see all leads"""
        res = self.client.get('/api/leads')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_list_leads_rep_only_assigned(self):
        """Sales rep sees only assigned leads"""
        self.client.force_authenticate(user=self.rep)
        other_lead = make_lead(self.customer, None, self.admin)  # not assigned to rep
        res = self.client.get('/api/leads')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        ids = [str(l['id']) for l in results]
        self.assertIn(str(self.lead.id), ids)
        self.assertNotIn(str(other_lead.id), ids)

    def test_create_lead(self):
        """Can create a lead"""
        data = {
            'customer': str(self.customer.id),
            'title': 'New Lead',
            'status': 'new',
            'priority': 'high',
            'assigned_to': str(self.rep.id),
        }
        res = self.client.post('/api/leads', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['title'], 'New Lead')

    def test_update_lead_status(self):
        """Can update lead status"""
        res = self.client.patch(f'/api/leads/{self.lead.id}', {'status': 'contacted'})
        # PATCH via put with full data
        res = self.client.put(f'/api/leads/{self.lead.id}', {
            'customer': str(self.customer.id),
            'title': self.lead.title,
            'status': 'contacted',
            'priority': self.lead.priority,
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'contacted')

    def test_filter_leads_by_status(self):
        """Can filter leads by status"""
        make_lead(self.customer, self.rep, self.admin, status='won')
        res = self.client.get('/api/leads', {'status': 'won'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertTrue(all(l['status'] == 'won' for l in results))

    def test_delete_lead(self):
        """Admin can delete a lead"""
        lead = make_lead(self.customer, self.rep, self.admin)
        res = self.client.delete(f'/api/leads/{lead.id}')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_lead_invalid_status(self):
        """Invalid status is rejected"""
        res = self.client.put(f'/api/leads/{self.lead.id}', {
            'customer': str(self.customer.id),
            'title': 'Test',
            'status': 'invalid_status',
            'priority': 'medium',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rep_cannot_access_unassigned_lead(self):
        """Rep cannot access a lead not assigned to them"""
        other_rep = make_rep('2')
        unassigned_lead = make_lead(self.customer, other_rep, self.admin)
        self.client.force_authenticate(user=self.rep)
        res = self.client.get(f'/api/leads/{unassigned_lead.id}')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# ─── Interaction Tests ────────────────────────────────────────

class InteractionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.rep = make_rep()
        self.customer = make_customer(self.admin)
        self.lead = make_lead(self.customer, self.rep, self.admin)
        self.interaction = make_interaction(self.lead, self.rep)
        self.client.force_authenticate(user=self.admin)

    def test_list_interactions(self):
        """Can list interactions"""
        res = self.client.get('/api/interactions')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_create_interaction(self):
        """Can create an interaction"""
        data = {
            'lead': str(self.lead.id),
            'interaction_type': 'email',
            'description': 'Sent a follow-up email.',
            'interaction_date': '2024-01-15T10:00:00Z',
        }
        res = self.client.post('/api/interactions', data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['interaction_type'], 'email')

    def test_get_interaction_detail(self):
        """Can get interaction detail"""
        res = self.client.get(f'/api/interactions/{self.interaction.id}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_update_interaction(self):
        """Can update an interaction"""
        res = self.client.put(f'/api/interactions/{self.interaction.id}', {
            'lead': str(self.lead.id),
            'interaction_type': 'meeting',
            'description': 'Updated description.',
            'interaction_date': '2024-01-16T14:00:00Z',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['interaction_type'], 'meeting')

    def test_delete_interaction(self):
        """Can delete interaction"""
        interaction = make_interaction(self.lead, self.admin)
        res = self.client.delete(f'/api/interactions/{interaction.id}')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_filter_by_type(self):
        """Can filter interactions by type"""
        Interaction.objects.create(
            lead=self.lead, interaction_type='meeting',
            description='Meeting test', created_by=self.admin
        )
        res = self.client.get('/api/interactions', {'interaction_type': 'meeting'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertTrue(all(i['interaction_type'] == 'meeting' for i in results))

    def test_missing_description_rejected(self):
        """Interaction without description is rejected"""
        data = {'lead': str(self.lead.id), 'interaction_type': 'call', 'interaction_date': '2024-01-15T10:00:00Z'}
        res = self.client.post('/api/interactions', data)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ─── Dashboard Tests ──────────────────────────────────────────

class DashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.rep = make_rep()
        self.customer = make_customer(self.admin)
        self.lead = make_lead(self.customer, self.rep, self.admin)
        make_interaction(self.lead, self.rep)

    def test_dashboard_admin(self):
        """Admin can access dashboard"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/dashboard/stats')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('total_customers', res.data)
        self.assertIn('total_leads', res.data)
        self.assertIn('total_interactions', res.data)
        self.assertIn('leads_by_status', res.data)
        self.assertIn('conversion_rate', res.data)

    def test_dashboard_sales_rep(self):
        """Sales rep can access dashboard (filtered to their data)"""
        self.client.force_authenticate(user=self.rep)
        res = self.client.get('/api/dashboard/stats')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_dashboard_requires_auth(self):
        """Dashboard requires authentication"""
        res = self.client.get('/api/dashboard/stats')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── Pipeline Tests ───────────────────────────────────────────

class PipelineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.rep = make_rep()
        self.customer = make_customer(self.admin)
        self.lead = make_lead(self.customer, self.rep, self.admin)
        self.client.force_authenticate(user=self.admin)

    def test_get_pipeline(self):
        """Can get pipeline data"""
        res = self.client.get('/api/pipeline')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('new', res.data)
        self.assertIn('won', res.data)

    def test_update_lead_status_via_pipeline(self):
        """Can update lead status via pipeline PATCH"""
        res = self.client.patch('/api/pipeline', {
            'lead_id': str(self.lead.id),
            'status': 'contacted',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.status, 'contacted')

    def test_pipeline_invalid_status(self):
        """Pipeline rejects invalid status"""
        res = self.client.patch('/api/pipeline', {
            'lead_id': str(self.lead.id),
            'status': 'invalid',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ─── RBAC Tests ───────────────────────────────────────────────

class RBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.rep = make_rep()
        self.customer = make_customer(self.admin)
        self.lead = make_lead(self.customer, self.rep, self.admin)

    def test_activity_logs_admin_only(self):
        """Activity logs accessible to admin only"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/activity-logs')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_activity_logs_rep_forbidden(self):
        """Activity logs forbidden to sales rep"""
        self.client.force_authenticate(user=self.rep)
        res = self.client.get('/api/activity-logs')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_users_list_admin_only(self):
        """User list accessible to admin only"""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/users')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_users_list_rep_forbidden(self):
        """User list forbidden to sales rep"""
        self.client.force_authenticate(user=self.rep)
        res = self.client.get('/api/users')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_access_forbidden(self):
        """All protected endpoints require authentication"""
        endpoints = [
            '/api/customers',
            '/api/leads',
            '/api/interactions',
            '/api/dashboard/stats',
            '/api/pipeline',
        ]
        for endpoint in endpoints:
            res = self.client.get(endpoint)
            self.assertIn(res.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
                          msg=f"Expected 401/403 for {endpoint}, got {res.status_code}")


# ─── Notification Tests ───────────────────────────────────────

class NotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = make_admin()
        self.rep = make_rep()
        self.client.force_authenticate(user=self.rep)

    def test_list_notifications(self):
        """User can list their notifications"""
        res = self.client.get('/api/notifications')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unread_count(self):
        """Can get unread notification count"""
        res = self.client.get('/api/notifications/unread-count')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('unread_count', res.data)

    def test_mark_all_read(self):
        """Can mark all notifications as read"""
        res = self.client.post('/api/notifications/mark-read')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
