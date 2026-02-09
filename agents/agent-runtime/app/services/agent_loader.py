"""
Agent Loader Service - Loads and manages agent definitions from YAML/JSON files.
"""

from typing import Any, Dict, List, Optional
from pathlib import Path
import yaml
import json
import os
from datetime import datetime

from ..config import settings
from ..models import AgentInfo


class AgentDefinition:
    """Wrapper for a loaded agent definition."""

    def __init__(self, data: Dict[str, Any], source_path: Optional[str] = None):
        self.data = data
        self.source_path = source_path
        self.loaded_at = datetime.utcnow()

    @property
    def id(self) -> str:
        return self.data.get("identity", {}).get("id", "unknown")

    @property
    def name(self) -> str:
        return self.data.get("identity", {}).get("name", "Unknown Agent")

    @property
    def slug(self) -> str:
        return self.data.get("identity", {}).get("slug", self.name.lower().replace(" ", "-"))

    @property
    def description(self) -> str:
        return self.data.get("identity", {}).get("description", "")

    @property
    def category(self) -> str:
        return self.data.get("identity", {}).get("category", "custom")

    @property
    def status(self) -> str:
        return self.data.get("identity", {}).get("status", "active")

    @property
    def icon(self) -> str:
        return self.data.get("identity", {}).get("icon", "fa fa-robot")

    @property
    def metadata(self) -> Dict[str, Any]:
        return self.data.get("metadata", {})

    @property
    def business_logic(self) -> Dict[str, Any]:
        return self.data.get("business_logic", {})

    @property
    def tools(self) -> Dict[str, Any]:
        return self.data.get("tools", {})

    @property
    def tools_list(self) -> List[Dict[str, Any]]:
        return self.tools.get("tools", [])

    @property
    def ui(self) -> Dict[str, Any]:
        return self.data.get("ui", {})

    @property
    def connectors(self) -> Dict[str, Any]:
        return self.data.get("connectors", {})

    @property
    def workflows(self) -> Dict[str, Any]:
        return self.data.get("workflows", {})

    @property
    def workflows_list(self) -> List[Dict[str, Any]]:
        return self.workflows.get("workflows", [])

    @property
    def security(self) -> Dict[str, Any]:
        return self.data.get("security", {})

    @property
    def deployment(self) -> Dict[str, Any]:
        return self.data.get("deployment", {})

    @property
    def system_prompt(self) -> str:
        return self.business_logic.get("system_prompt", "You are a helpful AI assistant.")

    @property
    def llm_provider(self) -> str:
        return self.business_logic.get("llm_provider", "mistral")

    @property
    def llm_model(self) -> Optional[str]:
        return self.business_logic.get("llm_model")

    @property
    def temperature(self) -> float:
        return self.business_logic.get("temperature", 0.7)

    @property
    def max_tokens(self) -> int:
        return self.business_logic.get("max_tokens", 2048)

    @property
    def route(self) -> str:
        route = self.deployment.get("route")
        if route:
            return route
        return f"/agent/{self.slug}"

    def has_chat_interface(self) -> bool:
        """Check if agent has a chat interface component."""
        for section in self.ui.get("sections", []):
            for component in section.get("components", []):
                if component.get("type") == "chat_interface":
                    return True
        return False

    def has_file_upload(self) -> bool:
        """Check if agent has file upload components."""
        file_types = {"file_upload", "document_upload", "image_upload"}
        for section in self.ui.get("sections", []):
            for component in section.get("components", []):
                if component.get("type") in file_types:
                    return True
        return False

    def get_workflow(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific workflow by ID or name."""
        for workflow in self.workflows_list:
            if workflow.get("id") == workflow_id or workflow.get("name") == workflow_id:
                return workflow
        return None

    def get_default_workflow(self) -> Optional[Dict[str, Any]]:
        """Get the default workflow."""
        default_id = self.workflows.get("default_workflow")
        if default_id:
            return self.get_workflow(default_id)
        # Return first enabled workflow
        for workflow in self.workflows_list:
            if workflow.get("enabled", True):
                return workflow
        return None

    def get_workflow_by_trigger(self, trigger: str, trigger_config: Dict[str, Any] = None) -> Optional[Dict[str, Any]]:
        """Get workflow by trigger type and optional config."""
        for workflow in self.workflows_list:
            if workflow.get("trigger") == trigger and workflow.get("enabled", True):
                # Check trigger config if provided
                if trigger_config:
                    wf_config = workflow.get("trigger_config", {})
                    if trigger == "button_click":
                        if wf_config.get("button") == trigger_config.get("button"):
                            return workflow
                else:
                    return workflow
        return None

    def get_tool_config(self, tool_config_id: str) -> Optional[Dict[str, Any]]:
        """Get a tool configuration by ID."""
        for tool in self.tools_list:
            if tool.get("id") == tool_config_id or tool.get("tool_id") == tool_config_id:
                return tool
        return None

    def to_info(self) -> AgentInfo:
        """Convert to AgentInfo."""
        return AgentInfo(
            id=self.id,
            name=self.name,
            slug=self.slug,
            description=self.description,
            category=self.category,
            status=self.status,
            icon=self.icon,
            has_chat=self.has_chat_interface(),
            has_file_upload=self.has_file_upload(),
            has_workflows=len(self.workflows_list) > 0,
            tools=[t.get("tool_id", "") for t in self.tools_list if t.get("enabled", True)],
            llm_provider=self.llm_provider,
            route=self.route,
        )


class AgentLoader:
    """
    Service for loading and managing agent definitions.

    Loads agents from:
    1. YAML files in the storage directory
    2. JSON files in the storage directory
    3. Programmatically registered agents
    """

    def __init__(self, storage_path: str = None):
        self.storage_path = Path(storage_path or settings.agents_storage_path)
        self._agents: Dict[str, AgentDefinition] = {}
        self._agents_by_slug: Dict[str, str] = {}  # slug -> id mapping

    def load_all(self) -> int:
        """Load all agents from storage. Returns count of loaded agents."""
        loaded = 0

        if not self.storage_path.exists():
            print(f"Creating storage directory: {self.storage_path}")
            self.storage_path.mkdir(parents=True, exist_ok=True)
            return 0

        # Load YAML files
        for file_path in self.storage_path.glob("*.yaml"):
            try:
                if self._load_file(file_path):
                    loaded += 1
            except Exception as e:
                print(f"Error loading {file_path}: {e}")

        for file_path in self.storage_path.glob("*.yml"):
            try:
                if self._load_file(file_path):
                    loaded += 1
            except Exception as e:
                print(f"Error loading {file_path}: {e}")

        # Load JSON files
        for file_path in self.storage_path.glob("*.json"):
            try:
                if self._load_file(file_path):
                    loaded += 1
            except Exception as e:
                print(f"Error loading {file_path}: {e}")

        print(f"Loaded {loaded} agents from {self.storage_path}")
        return loaded

    def _load_file(self, file_path: Path) -> bool:
        """Load a single agent file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            if file_path.suffix in ['.yaml', '.yml']:
                data = yaml.safe_load(f)
            else:
                data = json.load(f)

        if not data:
            return False

        agent = AgentDefinition(data, str(file_path))

        # Skip if inactive
        if agent.status in ["disabled", "archived"]:
            print(f"Skipping inactive agent: {agent.name} (status={agent.status})")
            return False

        self._agents[agent.id] = agent
        self._agents_by_slug[agent.slug] = agent.id

        print(f"Loaded agent: {agent.name} (id={agent.id}, slug={agent.slug})")
        return True

    def reload(self) -> int:
        """Reload all agents."""
        self._agents.clear()
        self._agents_by_slug.clear()
        return self.load_all()

    def get(self, agent_id: str) -> Optional[AgentDefinition]:
        """Get an agent by ID."""
        return self._agents.get(agent_id)

    def get_by_slug(self, slug: str) -> Optional[AgentDefinition]:
        """Get an agent by slug."""
        agent_id = self._agents_by_slug.get(slug)
        if agent_id:
            return self._agents.get(agent_id)
        return None

    def list_all(self) -> List[AgentDefinition]:
        """List all loaded agents."""
        return list(self._agents.values())

    def list_active(self) -> List[AgentDefinition]:
        """List only active agents."""
        return [a for a in self._agents.values() if a.status == "active"]

    def list_by_category(self, category: str) -> List[AgentDefinition]:
        """List agents by category."""
        return [a for a in self._agents.values() if a.category == category]

    def count(self) -> int:
        """Count loaded agents."""
        return len(self._agents)

    def register(self, data: Dict[str, Any], source: str = "api") -> AgentDefinition:
        """Register an agent from data."""
        agent = AgentDefinition(data, source)
        self._agents[agent.id] = agent
        self._agents_by_slug[agent.slug] = agent.id
        return agent

    def save(self, agent: AgentDefinition, filename: Optional[str] = None) -> str:
        """Save an agent to a YAML file."""
        if not filename:
            filename = f"{agent.slug}.yaml"

        file_path = self.storage_path / filename

        with open(file_path, 'w', encoding='utf-8') as f:
            yaml.dump(agent.data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

        return str(file_path)

    def delete(self, agent_id: str) -> bool:
        """Delete an agent."""
        agent = self._agents.get(agent_id)
        if not agent:
            return False

        # Remove from memory
        del self._agents[agent_id]
        if agent.slug in self._agents_by_slug:
            del self._agents_by_slug[agent.slug]

        # Delete file if exists
        if agent.source_path and os.path.exists(agent.source_path):
            os.remove(agent.source_path)

        return True


# Singleton instance
_loader: Optional[AgentLoader] = None


def get_agent_loader() -> AgentLoader:
    """Get the agent loader singleton."""
    global _loader
    if _loader is None:
        _loader = AgentLoader()
        _loader.load_all()
    return _loader
