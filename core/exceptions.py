import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_exception_handler

logger = logging.getLogger('bookstore')


def custom_exception_handler(exc, context):
    """
    Global exception handler that returns a consistent JSON error envelope
    for every API error: 400 / 401 / 403 / 404 / 405 / 429 / 500.

    Response shape:
    {
        "success": false,
        "status_code": <int>,
        "message": "<human readable message>",
        "errors": {...} | [...] | null
    }
    """
    # Normalize Django's native exceptions into DRF exceptions first.
    if isinstance(exc, Http404):
        exc = drf_exceptions.NotFound()
    elif isinstance(exc, DjangoValidationError):
        exc = drf_exceptions.ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)

    response = drf_default_exception_handler(exc, context)

    if response is not None:
        request = context.get('request')
        logger.warning(
            "API error: %s | path=%s | status=%s",
            exc.__class__.__name__,
            getattr(request, 'path', 'unknown'),
            response.status_code,
        )

        errors = response.data
        message = 'An error occurred.'

        if isinstance(errors, dict):
            if 'detail' in errors:
                message = str(errors['detail'])
                errors = None
        elif isinstance(errors, list):
            message = str(errors[0]) if errors else message

        return Response(
            {
                'success': False,
                'status_code': response.status_code,
                'message': message,
                'errors': errors,
            },
            status=response.status_code,
        )

    # Unhandled exception -> 500 Internal Server Error
    logger.exception("Unhandled server error: %s", exc)
    return Response(
        {
            'success': False,
            'status_code': 500,
            'message': 'Internal server error. Please try again later.',
            'errors': None,
        },
        status=500,
    )
