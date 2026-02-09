"""
Shared Authentication Utilities.

Provides enterprise-grade authentication primitives for backend services,
including password hashing, session management, CSRF protection, input
sanitization, and login rate limiting.

All utilities rely exclusively on the Python standard library -- no external
dependencies are required.

Typical usage:

    from shared.auth import (
        hash_password,
        verify_password,
        create_session,
        validate_session_token,
    )

    stored = hash_password("s3cret!")
    assert verify_password("s3cret!", stored)

    sessions: dict = {}
    session = create_session("u-1", "alice", ["admin"], sessions)
    data = validate_session_token(session["token"], sessions)
"""

import hashlib
import secrets
import time
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

_HASH_ALGORITHM = "sha256"
_SALT_BYTES = 32


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with a cryptographically random salt.

    The returned string has the format ``sha256$<salt_hex>$<hash_hex>`` which
    encodes the algorithm, salt, and resulting digest so that
    :func:`verify_password` can validate it without any external state.

    Args:
        password: The plaintext password to hash.

    Returns:
        A string in the format ``sha256$salt$hash``.

    Raises:
        ValueError: If *password* is empty or ``None``.
    """
    if not password:
        raise ValueError("Password must not be empty")

    salt = secrets.token_hex(_SALT_BYTES)
    digest = hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()
    return f"{_HASH_ALGORITHM}${salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a plaintext password against a previously stored hash.

    If *stored_hash* was produced by :func:`hash_password` (contains ``$``
    separators) the salt is extracted and the password is re-hashed for
    comparison.

    For **migration purposes only**, if *stored_hash* does *not* contain a
    ``$`` character it is assumed to be a legacy plaintext value and a direct
    equality check is performed.  A warning is emitted in that case so
    operators can track passwords that still need to be migrated.

    Args:
        password:    The plaintext password supplied by the user.
        stored_hash: The hash string previously persisted (or a legacy
                     plaintext value).

    Returns:
        ``True`` if the password matches, ``False`` otherwise.
    """
    if not password or not stored_hash:
        return False

    # Legacy plaintext fallback ------------------------------------------------
    if "$" not in stored_hash:
        logger.warning(
            "Password verification fell back to plaintext comparison. "
            "The stored value should be migrated to a salted hash."
        )
        return secrets.compare_digest(password, stored_hash)

    # Salted hash path ---------------------------------------------------------
    parts = stored_hash.split("$")
    if len(parts) != 3:
        logger.error("Malformed stored hash — expected 3 parts, got %d", len(parts))
        return False

    algorithm, salt, expected_digest = parts

    if algorithm != _HASH_ALGORITHM:
        logger.error("Unsupported hash algorithm: %s", algorithm)
        return False

    actual_digest = hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()
    return secrets.compare_digest(actual_digest, expected_digest)


# ---------------------------------------------------------------------------
# Token generation
# ---------------------------------------------------------------------------

def generate_session_token() -> str:
    """Generate a cryptographically secure, URL-safe session token.

    The token is 48 random bytes encoded in URL-safe base-64, yielding a
    64-character string suitable for use as a session identifier in cookies
    or ``Authorization`` headers.

    Returns:
        A URL-safe base-64 encoded token string.
    """
    return secrets.token_urlsafe(48)


def generate_csrf_token() -> str:
    """Generate a CSRF protection token.

    The token is 32 random bytes rendered as a 64-character hexadecimal
    string.  It should be embedded in HTML forms and validated on the server
    side for every state-changing request.

    Returns:
        A hex-encoded CSRF token string.
    """
    return secrets.token_hex(32)


# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------

def validate_session_token(token: str, session_store: dict) -> Optional[dict]:
    """Validate a session token and return the associated session data.

    The function checks that *token* exists in *session_store* and that the
    session has not expired.  Expired sessions are automatically evicted from
    the store.

    Args:
        token:         The session token to validate.
        session_store: A ``dict`` mapping tokens to session data dicts.  Each
                       session dict must contain an ``"expires_at"`` key with
                       a Unix timestamp (as returned by :func:`time.time`).

    Returns:
        The session data ``dict`` if the token is valid and not expired, or
        ``None`` otherwise.
    """
    if not token or token not in session_store:
        return None

    session = session_store[token]
    now = time.time()

    if now >= session.get("expires_at", 0):
        logger.info(
            "Session for user '%s' has expired — removing from store",
            session.get("username", "<unknown>"),
        )
        session_store.pop(token, None)
        return None

    return session


def create_session(
    user_id: str,
    username: str,
    roles: list,
    session_store: dict,
    ttl_hours: int = 24,
) -> dict:
    """Create a new authenticated session and persist it in *session_store*.

    A fresh session token is generated via :func:`generate_session_token` and
    the resulting session record is stored so that subsequent calls to
    :func:`validate_session_token` can look it up.

    Args:
        user_id:       A unique identifier for the user (e.g. a UUID).
        username:      The human-readable username.
        roles:         A list of role strings (e.g. ``["admin", "editor"]``).
        session_store: The mutable ``dict`` that acts as the in-memory session
                       store.
        ttl_hours:     Session time-to-live in hours.  Defaults to ``24``.

    Returns:
        A ``dict`` containing the session data, including the generated
        ``"token"`` key.
    """
    token = generate_session_token()
    now = time.time()

    session = {
        "token": token,
        "user_id": user_id,
        "username": username,
        "roles": list(roles),
        "created_at": now,
        "expires_at": now + (ttl_hours * 3600),
    }

    session_store[token] = session
    logger.debug("Session created for user '%s' (ttl=%dh)", username, ttl_hours)
    return session


def invalidate_session(token: str, session_store: dict) -> bool:
    """Remove a session from the store, effectively logging the user out.

    Args:
        token:         The session token to invalidate.
        session_store: The mutable ``dict`` that acts as the in-memory session
                       store.

    Returns:
        ``True`` if the session existed and was removed, ``False`` if the
        token was not found in the store.
    """
    if token and token in session_store:
        removed = session_store.pop(token)
        logger.debug(
            "Session invalidated for user '%s'",
            removed.get("username", "<unknown>"),
        )
        return True

    logger.debug("Attempted to invalidate non-existent session token")
    return False


# ---------------------------------------------------------------------------
# Input sanitization
# ---------------------------------------------------------------------------

_USERNAME_PATTERN = re.compile(r"^[a-z0-9_]+$")


def sanitize_username(username: str) -> str:
    """Sanitize and validate a username string.

    The input is stripped of leading/trailing whitespace and lowercased.  It
    is then validated to contain only alphanumeric characters and underscores.

    Args:
        username: The raw username input.

    Returns:
        The sanitized username.

    Raises:
        ValueError: If *username* is empty after stripping or contains
                    characters other than ``[a-z0-9_]``.
    """
    if not username or not isinstance(username, str):
        raise ValueError("Username must be a non-empty string")

    cleaned = username.strip().lower()

    if not cleaned:
        raise ValueError("Username must not be blank")

    if not _USERNAME_PATTERN.match(cleaned):
        raise ValueError(
            f"Username '{cleaned}' is invalid — only lowercase alphanumeric "
            "characters and underscores are allowed"
        )

    return cleaned


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

def check_login_rate_limit(
    username: str,
    rate_limits: dict,
    max_attempts: int = 5,
    window_seconds: int = 300,
) -> bool:
    """Check whether a login attempt is allowed under the rate limit policy.

    Failed login attempts are tracked per username.  If the number of attempts
    within the rolling *window_seconds* exceeds *max_attempts*, subsequent
    attempts are blocked until the window expires.

    Callers should invoke this function **before** verifying credentials.  The
    attempt is always recorded (i.e. the counter increments) so that brute-
    force attacks are counted even when the function returns ``True``.

    Args:
        username:       The username attempting to log in.
        rate_limits:    A mutable ``dict`` used to persist rate-limit state
                        across calls.  Keyed by username, each value is a
                        ``list`` of Unix timestamps representing past
                        attempts.
        max_attempts:   Maximum number of attempts allowed within the window.
                        Defaults to ``5``.
        window_seconds: The length of the sliding window in seconds.  Defaults
                        to ``300`` (5 minutes).

    Returns:
        ``True`` if the login attempt is permitted, ``False`` if the user has
        been rate-limited.
    """
    now = time.time()
    cutoff = now - window_seconds

    # Retrieve or initialise the attempt history for this user.
    attempts = rate_limits.get(username, [])

    # Prune attempts that fall outside the current window.
    attempts = [ts for ts in attempts if ts > cutoff]

    # Determine whether the user is rate-limited *before* recording the new
    # attempt so the current request counts against the limit.
    if len(attempts) >= max_attempts:
        logger.warning(
            "Login rate limit exceeded for user '%s' — %d attempts in the "
            "last %d seconds",
            username,
            len(attempts),
            window_seconds,
        )
        # Still record the attempt so persistent attackers don't get a free
        # pass once the window slides.
        attempts.append(now)
        rate_limits[username] = attempts
        return False

    attempts.append(now)
    rate_limits[username] = attempts
    return True
