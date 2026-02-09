"""
Agent Storage - Persistent storage for agent definitions.

Uses JSON file storage for simplicity. Can be extended to use a database.
"""

import json
import os
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path
import asyncio
from contextlib import asynccontextmanager

from ..models import AgentDefinition, AgentStatus


class AgentStorage:
    """
    Storage manager for agent definitions.

    Stores agents as JSON files in a data directory.
    Thread-safe with file locking.
    """

    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.environ.get(
                "AGENT_STORAGE_DIR",
                os.path.join(os.path.dirname(__file__), "..", "..", "data", "agents")
            )
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    def _get_agent_path(self, agent_id: str) -> Path:
        """Get the file path for an agent."""
        return self.data_dir / f"{agent_id}.json"

    def _get_index_path(self) -> Path:
        """Get the path to the agent index file."""
        return self.data_dir / "_index.json"

    async def _load_index(self) -> Dict[str, dict]:
        """Load the agent index."""
        index_path = self._get_index_path()
        if not index_path.exists():
            return {}

        try:
            with open(index_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}

    async def _save_index(self, index: Dict[str, dict]) -> None:
        """Save the agent index."""
        index_path = self._get_index_path()
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=2, default=str)

    async def _update_index(self, agent: AgentDefinition) -> None:
        """Update the index with agent metadata."""
        index = await self._load_index()
        index[agent.id] = {
            "id": agent.id,
            "name": agent.name,
            "description": agent.description,
            "icon": agent.icon,
            "category": agent.category,
            "status": agent.status.value,
            "created_at": agent.metadata.created_at.isoformat(),
            "updated_at": agent.metadata.updated_at.isoformat(),
            "version": agent.metadata.version,
            "tags": agent.metadata.tags,
        }
        await self._save_index(index)

    async def _remove_from_index(self, agent_id: str) -> None:
        """Remove an agent from the index."""
        index = await self._load_index()
        if agent_id in index:
            del index[agent_id]
            await self._save_index(index)

    async def save(self, agent: AgentDefinition) -> AgentDefinition:
        """
        Save an agent definition.

        Args:
            agent: The agent definition to save.

        Returns:
            The saved agent definition with updated metadata.
        """
        async with self._lock:
            # Update metadata
            agent.metadata.updated_at = datetime.utcnow()

            # Generate route if not set
            if not agent.route:
                agent.route = agent.generate_route()

            # Save agent file
            agent_path = self._get_agent_path(agent.id)
            with open(agent_path, "w", encoding="utf-8") as f:
                json.dump(agent.model_dump(), f, indent=2, default=str)

            # Update index
            await self._update_index(agent)

            return agent

    async def get(self, agent_id: str) -> Optional[AgentDefinition]:
        """
        Get an agent by ID.

        Args:
            agent_id: The agent ID.

        Returns:
            The agent definition or None if not found.
        """
        agent_path = self._get_agent_path(agent_id)
        if not agent_path.exists():
            return None

        try:
            with open(agent_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return AgentDefinition.model_validate(data)
        except (json.JSONDecodeError, IOError, ValueError):
            return None

    async def delete(self, agent_id: str) -> bool:
        """
        Delete an agent.

        Args:
            agent_id: The agent ID.

        Returns:
            True if deleted, False if not found.
        """
        async with self._lock:
            agent_path = self._get_agent_path(agent_id)
            if not agent_path.exists():
                return False

            agent_path.unlink()
            await self._remove_from_index(agent_id)
            return True

    async def list(
        self,
        category: Optional[str] = None,
        status: Optional[AgentStatus] = None,
        search: Optional[str] = None,
        tags: Optional[List[str]] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[List[AgentDefinition], int]:
        """
        List agents with optional filtering.

        Args:
            category: Filter by category.
            status: Filter by status.
            search: Search in name and description.
            tags: Filter by tags (any match).
            page: Page number (1-indexed).
            page_size: Number of items per page.

        Returns:
            Tuple of (agents list, total count).
        """
        index = await self._load_index()

        # Filter index
        filtered_ids = []
        for agent_id, meta in index.items():
            # Category filter
            if category and meta.get("category") != category:
                continue

            # Status filter
            if status and meta.get("status") != status.value:
                continue

            # Search filter
            if search:
                search_lower = search.lower()
                name_match = search_lower in meta.get("name", "").lower()
                desc_match = search_lower in meta.get("description", "").lower()
                if not (name_match or desc_match):
                    continue

            # Tags filter
            if tags:
                agent_tags = set(meta.get("tags", []))
                if not agent_tags.intersection(set(tags)):
                    continue

            filtered_ids.append(agent_id)

        # Sort by updated_at descending
        filtered_ids.sort(
            key=lambda x: index[x].get("updated_at", ""),
            reverse=True
        )

        total = len(filtered_ids)

        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        page_ids = filtered_ids[start:end]

        # Load full agents
        agents = []
        for agent_id in page_ids:
            agent = await self.get(agent_id)
            if agent:
                agents.append(agent)

        return agents, total

    async def exists(self, agent_id: str) -> bool:
        """Check if an agent exists."""
        return self._get_agent_path(agent_id).exists()

    async def get_by_route(self, route: str) -> Optional[AgentDefinition]:
        """Get an agent by its route."""
        index = await self._load_index()

        for agent_id in index.keys():
            agent = await self.get(agent_id)
            if agent and agent.route == route:
                return agent

        return None

    async def duplicate(self, agent_id: str, new_name: str) -> Optional[AgentDefinition]:
        """
        Duplicate an existing agent.

        Args:
            agent_id: The ID of the agent to duplicate.
            new_name: The name for the new agent.

        Returns:
            The new agent definition or None if original not found.
        """
        original = await self.get(agent_id)
        if not original:
            return None

        # Create a copy with new ID and name
        import uuid
        new_agent = original.model_copy(deep=True)
        new_agent.id = str(uuid.uuid4())
        new_agent.name = new_name
        new_agent.status = AgentStatus.DRAFT
        new_agent.route = None  # Will be regenerated
        new_agent.metadata.created_at = datetime.utcnow()
        new_agent.metadata.updated_at = datetime.utcnow()
        new_agent.metadata.version = "1.0.0"

        return await self.save(new_agent)


# Singleton instance
_storage: Optional[AgentStorage] = None


def get_storage() -> AgentStorage:
    """Get the agent storage singleton."""
    global _storage
    if _storage is None:
        _storage = AgentStorage()
    return _storage
