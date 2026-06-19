"""
Management command to seed sample data for development/demo.
Usage: python manage.py seed_data
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random
from crm_api.models import User, Customer, Lead, Interaction


COMPANIES = [
    'Acme Corp', 'TechNova', 'BlueStar Ltd', 'GlobalNet', 'Pinnacle Solutions',
    'NextGen Systems', 'CloudBase Inc', 'DataFlow Analytics', 'SwiftTech',
    'Meridian Group', 'Apex Digital', 'Synergy Partners',
]

FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack']
LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor']

INTERACTION_DESCRIPTIONS = [
    "Discussed product features and pricing options.",
    "Follow-up call regarding the proposal sent last week.",
    "Technical demo of the platform. Client was impressed.",
    "Meeting with decision-makers to discuss integration requirements.",
    "Clarified contract terms and negotiated discount.",
    "Left voicemail, awaiting callback.",
    "Email thread about implementation timeline.",
    "Introductory meeting — good rapport established.",
]


class Command(BaseCommand):
    help = 'Seed the database with sample CRM data'

    def add_arguments(self, parser):
        parser.add_argument('--customers', type=int, default=20)
        parser.add_argument('--leads', type=int, default=40)

    def handle(self, *args, **options):
        self.stdout.write('🌱 Seeding database...')

        # Create admin
        admin, created = User.objects.get_or_create(
            email='admin@crm.com',
            defaults={
                'username': 'admin',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': User.Role.ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )
        if created:
            admin.set_password('Admin@123')
            admin.save()
            self.stdout.write(self.style.SUCCESS(f'  ✓ Admin: admin@crm.com / Admin@123'))

        # Create sales reps
        reps = []
        for i in range(1, 4):
            rep, created = User.objects.get_or_create(
                email=f'rep{i}@crm.com',
                defaults={
                    'username': f'salesrep{i}',
                    'first_name': FIRST_NAMES[i],
                    'last_name': LAST_NAMES[i],
                    'role': User.Role.SALES_REP,
                    'is_active': True,
                }
            )
            if created:
                rep.set_password('Rep@123')
                rep.save()
                self.stdout.write(self.style.SUCCESS(f'  ✓ Sales Rep: rep{i}@crm.com / Rep@123'))
            reps.append(rep)

        # Create customers
        customers = []
        for i in range(options['customers']):
            fn = random.choice(FIRST_NAMES)
            ln = random.choice(LAST_NAMES)
            company = random.choice(COMPANIES)
            cust, _ = Customer.objects.get_or_create(
                email=f'{fn.lower()}.{ln.lower()}{i}@{company.lower().replace(" ", "")}.com',
                defaults={
                    'name': f'{fn} {ln}',
                    'phone': f'+1-555-{random.randint(1000, 9999)}',
                    'company': company,
                    'city': random.choice(['New York', 'San Francisco', 'Chicago', 'Austin', 'Seattle']),
                    'country': 'USA',
                    'notes': f'Key contact at {company}.',
                    'created_by': admin,
                }
            )
            customers.append(cust)

        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(customers)} customers created'))

        # Create leads
        statuses = [s[0] for s in Lead.Status.choices]
        priorities = [p[0] for p in Lead.Priority.choices]
        sources = ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Conference', 'Email Campaign']
        leads = []

        for i in range(options['leads']):
            customer = random.choice(customers)
            rep = random.choice(reps + [None])
            lead = Lead.objects.create(
                customer=customer,
                title=f'{random.choice(["Enterprise", "Startup", "SMB", "Growth"])} Deal - {customer.company}',
                status=random.choice(statuses),
                priority=random.choice(priorities),
                assigned_to=rep,
                estimated_value=random.choice([5000, 10000, 25000, 50000, 100000, None]),
                expected_close_date=timezone.now().date() + timedelta(days=random.randint(7, 90)),
                source=random.choice(sources),
                notes=f'Potential deal with {customer.company}.',
                created_by=admin,
                created_at=timezone.now() - timedelta(days=random.randint(0, 180)),
            )
            leads.append(lead)

        self.stdout.write(self.style.SUCCESS(f'  ✓ {len(leads)} leads created'))

        # Create interactions
        int_types = [t[0] for t in Interaction.InteractionType.choices]
        interaction_count = 0
        for lead in leads:
            num_interactions = random.randint(0, 5)
            for _ in range(num_interactions):
                Interaction.objects.create(
                    lead=lead,
                    interaction_type=random.choice(int_types),
                    description=random.choice(INTERACTION_DESCRIPTIONS),
                    outcome=random.choice(['Positive', 'Neutral', 'Follow-up required', 'No answer']),
                    interaction_date=timezone.now() - timedelta(days=random.randint(0, 60)),
                    duration_minutes=random.choice([15, 30, 45, 60, None]),
                    created_by=lead.assigned_to or admin,
                )
                interaction_count += 1

        self.stdout.write(self.style.SUCCESS(f'  ✓ {interaction_count} interactions created'))
        self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!\n'))
        self.stdout.write('📋 Login credentials:')
        self.stdout.write('   Admin:     admin@crm.com   / Admin@123')
        self.stdout.write('   Sales Rep: rep1@crm.com    / Rep@123')
        self.stdout.write('   Sales Rep: rep2@crm.com    / Rep@123')
