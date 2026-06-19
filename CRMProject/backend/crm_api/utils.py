"""
CRM API Utilities
Helper functions for logging, notifications, exports
"""

import csv
import io
import logging
from datetime import datetime
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Count
from django.utils import timezone

logger = logging.getLogger('crm_api')


def get_client_ip(request):
    """Extract real client IP from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_activity(user, action, model_name='', object_id='', object_repr='', changes=None, request=None):
    """Create an activity log entry"""
    from .models import ActivityLog
    try:
        log = ActivityLog(
            user=user,
            action=action,
            model_name=model_name,
            object_id=str(object_id) if object_id else '',
            object_repr=object_repr[:200] if object_repr else '',
            changes=changes or {},
            ip_address=get_client_ip(request) if request else None,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500] if request else '',
        )
        log.save()
    except Exception as e:
        logger.error(f"Failed to create activity log: {e}")


def create_notification(user, notification_type, title, message, related_lead=None):
    """Create in-app notification"""
    from .models import Notification
    try:
        Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            related_lead=related_lead,
        )
    except Exception as e:
        logger.error(f"Failed to create notification: {e}")


def send_lead_assignment_email(lead, assigned_user):
    """Send email when lead is assigned"""
    if not assigned_user.email:
        return
    try:
        send_mail(
            subject=f'[CRM] New Lead Assigned: {lead.title}',
            message=f"""
Hi {assigned_user.full_name},

A new lead has been assigned to you:

Lead: {lead.title}
Customer: {lead.customer.name}
Status: {lead.get_status_display()}
Priority: {lead.get_priority_display()}

Please log in to CRM to view the full details.

Best regards,
CRM System
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[assigned_user.email],
            fail_silently=True,
        )
    except Exception as e:
        logger.error(f"Failed to send assignment email: {e}")


def send_status_change_email(lead, old_status, new_status, changed_by):
    """Send email when lead status changes"""
    if not lead.assigned_to or not lead.assigned_to.email:
        return
    if lead.assigned_to == changed_by:
        return  # Don't email yourself
    try:
        send_mail(
            subject=f'[CRM] Lead Status Updated: {lead.title}',
            message=f"""
Hi {lead.assigned_to.full_name},

The status of your lead has been updated:

Lead: {lead.title}
Customer: {lead.customer.name}
Previous Status: {old_status}
New Status: {new_status}
Updated by: {changed_by.full_name}

Please log in to CRM for more details.

Best regards,
CRM System
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[lead.assigned_to.email],
            fail_silently=True,
        )
    except Exception as e:
        logger.error(f"Failed to send status change email: {e}")


def export_customers_csv(customers):
    """Export customers queryset to CSV"""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'ID', 'Name', 'Email', 'Phone', 'Company',
        'City', 'Country', 'Leads Count', 'Created At'
    ])
    for c in customers:
        writer.writerow([
            str(c.id), c.name, c.email, c.phone,
            c.company, c.city, c.country,
            c.leads.count(), c.created_at.strftime('%Y-%m-%d')
        ])
    return output.getvalue()


def export_leads_csv(leads):
    """Export leads queryset to CSV"""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'ID', 'Title', 'Customer', 'Status', 'Priority',
        'Assigned To', 'Estimated Value', 'Expected Close',
        'Created At', 'Updated At'
    ])
    for lead in leads:
        writer.writerow([
            str(lead.id), lead.title, lead.customer.name,
            lead.status, lead.priority,
            lead.assigned_to.full_name if lead.assigned_to else '',
            str(lead.estimated_value) if lead.estimated_value else '',
            str(lead.expected_close_date) if lead.expected_close_date else '',
            lead.created_at.strftime('%Y-%m-%d'),
            lead.updated_at.strftime('%Y-%m-%d'),
        ])
    return output.getvalue()


def get_monthly_data(model, date_field='created_at', months=6):
    """Get monthly count data for charts"""
    from django.db.models.functions import TruncMonth
    from django.db.models import Count

    now = timezone.now()
    data = (
        model.objects
        .filter(**{f'{date_field}__gte': now.replace(month=max(1, now.month - months))})
        .annotate(month=TruncMonth(date_field))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    return [{'month': d['month'].strftime('%b %Y'), 'count': d['count']} for d in data]
