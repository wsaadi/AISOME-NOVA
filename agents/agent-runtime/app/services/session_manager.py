"""
Session Manager Service - Manages conversation sessions.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
import asyncio

from ..models import AgentSession, SessionMessage, MessageRole


class SessionManager:
    """
    Manager for agent conversation sessions.

    Handles:
    - Session creation and retrieval
    - Message history management
    - Session variables
    - Session expiration and cleanup
    """

    def __init__(self, session_ttl_minutes: int = 60):
        self._sessions: Dict[str, AgentSession] = {}
        self._session_ttl = timedelta(minutes=session_ttl_minutes)
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start_cleanup_task(self):
        """Start the background cleanup task."""
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())

    async def stop_cleanup_task(self):
        """Stop the background cleanup task."""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
            self._cleanup_task = None

    async def _cleanup_loop(self):
        """Background task to clean up expired sessions."""
        while True:
            await asyncio.sleep(300)  # Run every 5 minutes
            self._cleanup_expired()

    def _cleanup_expired(self):
        """Remove expired sessions."""
        now = datetime.utcnow()
        expired = []

        for session_id, session in self._sessions.items():
            if now - session.last_activity > self._session_ttl:
                expired.append(session_id)

        for session_id in expired:
            del self._sessions[session_id]

        if expired:
            print(f"Cleaned up {len(expired)} expired sessions")

    def create(self, agent_id: str, agent_name: str, user_id: Optional[str] = None) -> AgentSession:
        """Create a new session."""
        session = AgentSession(
            agent_id=agent_id,
            agent_name=agent_name,
            user_id=user_id,
        )
        self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> Optional[AgentSession]:
        """Get a session by ID."""
        session = self._sessions.get(session_id)
        if session:
            session.last_activity = datetime.utcnow()
        return session

    def get_or_create(
        self,
        session_id: Optional[str],
        agent_id: str,
        agent_name: str,
        user_id: Optional[str] = None,
    ) -> AgentSession:
        """Get an existing session or create a new one."""
        if session_id:
            session = self.get(session_id)
            if session and session.agent_id == agent_id:
                return session

        return self.create(agent_id, agent_name, user_id)

    def delete(self, session_id: str) -> bool:
        """Delete a session."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def add_message(
        self,
        session_id: str,
        role: MessageRole,
        content: str,
        **kwargs,
    ) -> Optional[SessionMessage]:
        """Add a message to a session."""
        session = self.get(session_id)
        if not session:
            return None
        return session.add_message(role, content, **kwargs)

    def get_messages(
        self,
        session_id: str,
        limit: Optional[int] = None,
    ) -> List[SessionMessage]:
        """Get messages from a session."""
        session = self.get(session_id)
        if not session:
            return []

        if limit:
            return session.get_context_messages(limit)
        return session.messages

    def set_variable(
        self,
        session_id: str,
        key: str,
        value,
    ) -> bool:
        """Set a session variable."""
        session = self.get(session_id)
        if not session:
            return False
        session.variables[key] = value
        return True

    def get_variable(
        self,
        session_id: str,
        key: str,
        default=None,
    ):
        """Get a session variable."""
        session = self.get(session_id)
        if not session:
            return default
        return session.variables.get(key, default)

    def get_variables(self, session_id: str) -> Dict:
        """Get all session variables."""
        session = self.get(session_id)
        if not session:
            return {}
        return session.variables.copy()

    def clear_messages(self, session_id: str) -> bool:
        """Clear all messages in a session."""
        session = self.get(session_id)
        if not session:
            return False
        session.messages.clear()
        return True

    def list_sessions(self, agent_id: Optional[str] = None) -> List[AgentSession]:
        """List all sessions, optionally filtered by agent."""
        if agent_id:
            return [s for s in self._sessions.values() if s.agent_id == agent_id]
        return list(self._sessions.values())

    def count(self) -> int:
        """Count active sessions."""
        return len(self._sessions)


# Singleton instance
_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get the session manager singleton."""
    global _manager
    if _manager is None:
        _manager = SessionManager()
    return _manager
