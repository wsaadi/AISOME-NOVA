"""
Shared utilities for agent-pf microservices.

This module provides:
- HTTP client with connection pooling
- Circuit breaker pattern for fault tolerance
- Thread-safe service registry
- Response formatting and beautification service
"""

from .http_client import HTTPClientManager, get_http_client
from .circuit_breaker import CircuitBreaker, CircuitBreakerOpen
from .service_registry import ServiceRegistry, get_service
from .format_service import (
    FormattingService,
    IconCategory,
    format_section,
    format_key_value,
    format_list,
    format_table,
    format_alert,
    clean_ai_artifacts,
    enhance_markdown,
    format_contract_analysis,
    format_call_for_tender,
    format_tech_monitoring,
)

__all__ = [
    'HTTPClientManager',
    'get_http_client',
    'CircuitBreaker',
    'CircuitBreakerOpen',
    'ServiceRegistry',
    'get_service',
    'FormattingService',
    'IconCategory',
    'format_section',
    'format_key_value',
    'format_list',
    'format_table',
    'format_alert',
    'clean_ai_artifacts',
    'enhance_markdown',
    'format_contract_analysis',
    'format_call_for_tender',
    'format_tech_monitoring',
]
