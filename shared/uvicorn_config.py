"""
Optimized Uvicorn configuration for production.

This module provides optimized settings for running FastAPI services
with better performance under concurrent load.

Usage in main.py:
    from shared.uvicorn_config import get_uvicorn_config

    if __name__ == "__main__":
        import uvicorn
        config = get_uvicorn_config(port=8000)
        uvicorn.run("app.main:app", **config)
"""

import os
import multiprocessing
from typing import Dict, Any


def get_worker_count() -> int:
    """
    Calculate optimal number of workers.

    For I/O-bound applications (like API services), 2-4 workers per CPU core
    is recommended. We use 2 * cores + 1 as a balanced default.

    Can be overridden with UVICORN_WORKERS environment variable.
    """
    env_workers = os.environ.get('UVICORN_WORKERS')
    if env_workers:
        return int(env_workers)

    cpu_count = multiprocessing.cpu_count()
    # For containers, typically 1-2 CPUs allocated
    # Use 2 workers minimum, max 4 for typical container workloads
    return min(max(2, cpu_count), 4)


def get_uvicorn_config(
    port: int = 8000,
    host: str = "0.0.0.0",
    workers: int = None,
    reload: bool = False,
) -> Dict[str, Any]:
    """
    Get optimized Uvicorn configuration.

    Args:
        port: Port to listen on
        host: Host to bind to
        workers: Number of workers (None = auto-detect)
        reload: Enable auto-reload (development only)

    Returns:
        Dict of uvicorn.run() parameters
    """
    worker_count = workers or get_worker_count()

    config = {
        "host": host,
        "port": port,
        "workers": worker_count if not reload else 1,
        "reload": reload,

        # Connection handling
        "backlog": 2048,  # Queue size for pending connections
        "limit_concurrency": 1000,  # Max concurrent connections
        "limit_max_requests": 10000,  # Restart workers after N requests (memory leak prevention)

        # Timeouts
        "timeout_keep_alive": 30,  # Keep-alive timeout
        "timeout_notify": 30,  # Graceful shutdown timeout

        # Logging
        "access_log": True,
        "log_level": os.environ.get("LOG_LEVEL", "info").lower(),

        # Performance optimizations (if uvloop/httptools available)
        # These are automatically used if installed
    }

    return config


# Default configuration for direct use
DEFAULT_CONFIG = {
    "host": "0.0.0.0",
    "workers": 2,
    "backlog": 2048,
    "limit_concurrency": 1000,
    "limit_max_requests": 10000,
    "timeout_keep_alive": 30,
    "access_log": True,
    "log_level": "info",
}


def print_startup_banner(service_name: str, port: int, workers: int):
    """Print service startup information."""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  {service_name:^56}  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: {port:<51}  ║
║  Workers: {workers:<48}  ║
║  Connection Limit: 1000 concurrent                           ║
║  Request Limit: 10000 per worker                             ║
╚══════════════════════════════════════════════════════════════╝
""")
