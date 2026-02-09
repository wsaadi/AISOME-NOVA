"""
Simple Builder Service - Service simplifié pour la création d'agents textuels.

Ce service gère la conversation interactive avec l'utilisateur pour créer
des agents textuels. Il utilise un LLM pour comprendre les besoins et
générer des agents avec prompt système et prompt utilisateur personnalisés.
"""

import json
import logging
import os
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx

from ..models.simple_agent import (
    BuilderConversation,
    BuilderMessage,
    BuilderResponse,
    CreateSimpleAgentRequest,
    ExportFormat,
    SimpleAgentDefinition,
    SimpleAgentMetadata,
    AgentStatus,
)
from ..prompts.builder_system_prompt import (
    BUILDER_SYSTEM_PROMPT,
    BUILDER_USER_PROMPT_TEMPLATE,
    get_builder_context,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# LLM connector configuration
LLM_CONFIG = {
    "mistral": {
        "url": os.environ.get("LLM_MISTRAL_URL", "http://mistral-connector:8000"),
        "endpoint": "/api/v1/mistral/chat"
    },
    "openai": {
        "url": os.environ.get("LLM_OPENAI_URL", "http://openai-connector:8000"),
        "endpoint": "/api/v1/openai/chat"
    },
    "anthropic": {
        "url": os.environ.get("LLM_ANTHROPIC_URL", "http://anthropic-connector:8000"),
        "endpoint": "/api/v1/anthropic/chat"
    },
}

# Default LLM settings for the builder
DEFAULT_PROVIDER = os.environ.get("BUILDER_LLM_PROVIDER", "mistral")
DEFAULT_MODEL = os.environ.get("BUILDER_LLM_MODEL", "mistral-large-latest")


class SimpleBuilderService:
    """
    Service pour la création interactive d'agents textuels.

    Ce service:
    1. Gère une conversation avec l'utilisateur
    2. Pose des questions de clarification
    3. Détecte si la demande est hors périmètre
    4. Génère un agent simple (prompt système + prompt utilisateur)
    """

    # In-memory storage for conversations (in production, use Redis/DB)
    _conversations: Dict[str, BuilderConversation] = {}

    def __init__(self):
        self.provider = DEFAULT_PROVIDER
        self.model = DEFAULT_MODEL

    def _get_llm_config(self, provider: str) -> dict:
        """Get LLM connector configuration."""
        return LLM_CONFIG.get(provider, LLM_CONFIG["mistral"])

    async def _call_llm(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
    ) -> Optional[str]:
        """Call the LLM with the conversation messages."""
        try:
            config = self._get_llm_config(self.provider)
            full_url = f"{config['url']}{config['endpoint']}"

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    full_url,
                    json={
                        "messages": messages,
                        "model": self.model,
                        "temperature": temperature,
                        "max_tokens": 4096,
                        "stream": False
                    }
                )

                if response.status_code >= 400:
                    logger.error(f"LLM error: {response.status_code} - {response.text}")
                    return None

                result = response.json()

                # Extract content
                if "message" in result and isinstance(result["message"], dict):
                    return result["message"].get("content", "")
                elif "content" in result:
                    return result["content"]
                elif "choices" in result and result["choices"]:
                    choice = result["choices"][0]
                    if "message" in choice:
                        return choice["message"].get("content", "")
                    elif "text" in choice:
                        return choice["text"]

                return str(result)

        except Exception as e:
            logger.error(f"Error calling LLM: {e}", exc_info=True)
            return None

    def create_conversation(self, user_id: str) -> BuilderConversation:
        """Create a new conversation for agent building."""
        conversation = BuilderConversation(
            id=str(uuid.uuid4()),
            messages=[],
            created_at=datetime.utcnow(),
            status="in_progress"
        )
        self._conversations[conversation.id] = conversation
        logger.info(f"Created new conversation: {conversation.id} for user: {user_id}")
        return conversation

    def get_conversation(self, conversation_id: str) -> Optional[BuilderConversation]:
        """Get an existing conversation."""
        return self._conversations.get(conversation_id)

    def _extract_agent_from_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Extract agent definition from LLM response if present."""
        logger.info(f"Attempting to extract agent from response (length: {len(response_text)})")

        def normalize_keys(data: Dict[str, Any]) -> Dict[str, Any]:
            """Normalize JSON keys by handling variations (with/without underscores)."""
            # Check for ready_to_create variations
            ready = data.get("ready_to_create") or data.get("readytocreate") or data.get("ready_to_create")
            if ready and "agent" in data:
                agent = data["agent"]
                # Normalize agent keys
                normalized = {}
                key_mapping = {
                    "name": ["name"],
                    "description": ["description"],
                    "long_description": ["long_description", "longdescription"],
                    "icon": ["icon"],
                    "category": ["category"],
                    "system_prompt": ["system_prompt", "systemprompt"],
                    "user_prompt_template": ["user_prompt_template", "userprompttemplate"],
                    "export_formats": ["export_formats", "exportformats"],
                    "tags": ["tags"],
                }
                for target_key, source_keys in key_mapping.items():
                    for src_key in source_keys:
                        if src_key in agent:
                            normalized[target_key] = agent[src_key]
                            break
                return normalized
            return None

        # Method 1: Look for JSON block in markdown code block
        json_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
        matches = re.findall(json_pattern, response_text, re.IGNORECASE)

        for match in matches:
            try:
                data = json.loads(match.strip())
                # Check for both "ready_to_create" and "readytocreate" variations
                if (data.get("ready_to_create") or data.get("readytocreate")) and "agent" in data:
                    logger.info("Found agent in markdown code block")
                    return normalize_keys(data) or data["agent"]
            except json.JSONDecodeError as e:
                logger.debug(f"JSON decode error in code block: {e}")
                continue

        # Method 2: Try to find JSON object containing ready_to_create (various patterns)
        # Include patterns with and without underscores since LLMs sometimes omit them
        json_patterns_to_try = [
            r'\{\s*"ready_to_create"\s*:\s*true',
            r'\{\s*"readytocreate"\s*:\s*true',
            r'\{\s*"ready_to_create"\s*:\s*"true"',
            r'\{\s*"readytocreate"\s*:\s*"true"',
            r'\{"ready_to_create"',
            r'\{"readytocreate"',
            r'\{ "ready_to_create"',
            r'\{ "readytocreate"',
        ]

        for pattern in json_patterns_to_try:
            match = re.search(pattern, response_text, re.IGNORECASE)
            if match:
                json_start = match.start()
                try:
                    # Find matching closing brace
                    brace_count = 0
                    json_end = json_start
                    in_string = False
                    escape_next = False

                    for i, char in enumerate(response_text[json_start:]):
                        if escape_next:
                            escape_next = False
                            continue
                        if char == '\\':
                            escape_next = True
                            continue
                        if char == '"' and not escape_next:
                            in_string = not in_string
                            continue
                        if in_string:
                            continue
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_end = json_start + i + 1
                                break

                    json_str = response_text[json_start:json_end]
                    data = json.loads(json_str)
                    if (data.get("ready_to_create") or data.get("readytocreate")) and "agent" in data:
                        logger.info(f"Found agent using pattern: {pattern}")
                        return normalize_keys(data) or data["agent"]
                except (json.JSONDecodeError, ValueError) as e:
                    logger.debug(f"JSON decode error with pattern {pattern}: {e}")
                    continue

        # Method 3: Try to find any JSON object with "agent" key
        try:
            # Look for { followed by "agent"
            agent_pattern = r'\{[^{}]*"agent"\s*:\s*\{'
            match = re.search(agent_pattern, response_text)
            if match:
                json_start = match.start()
                # Find matching closing brace
                brace_count = 0
                json_end = json_start
                in_string = False
                escape_next = False

                for i, char in enumerate(response_text[json_start:]):
                    if escape_next:
                        escape_next = False
                        continue
                    if char == '\\':
                        escape_next = True
                        continue
                    if char == '"' and not escape_next:
                        in_string = not in_string
                        continue
                    if in_string:
                        continue
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_end = json_start + i + 1
                            break

                json_str = response_text[json_start:json_end]
                data = json.loads(json_str)
                if "agent" in data:
                    logger.info("Found agent using agent key pattern")
                    # Also normalize keys for Method 3
                    normalized = normalize_keys(data)
                    return normalized if normalized else data["agent"]
        except (json.JSONDecodeError, ValueError) as e:
            logger.debug(f"JSON decode error in agent pattern: {e}")

        logger.info("No agent definition found in response")
        return None

    def _extract_out_of_scope_summary(self, response_text: str) -> Optional[str]:
        """Extract out of scope summary from LLM response."""
        # Look for the out of scope pattern
        pattern = r'📋 DEMANDE HORS PÉRIMÈTRE.*?(?=\n\n[^-\*]|$)'
        match = re.search(pattern, response_text, re.DOTALL)
        if match:
            return match.group(0).strip()
        return None

    def _determine_conversation_status(
        self,
        response_text: str,
        has_agent: bool,
        has_out_of_scope: bool
    ) -> str:
        """Determine the conversation status based on the response."""
        if has_agent:
            return "ready_to_create"
        if has_out_of_scope:
            return "out_of_scope"

        # Check for question patterns
        question_patterns = [
            r'\?$',  # Ends with question mark
            r'\d+\.',  # Numbered list (questions)
            r'pouvez-vous',
            r'pourriez-vous',
            r'quel\w*',
            r'comment\s',
            r'précis\w*',
        ]
        for pattern in question_patterns:
            if re.search(pattern, response_text.lower()):
                return "needs_more_info"

        return "in_progress"

    async def process_message(
        self,
        conversation_id: str,
        user_message: str,
        attachments: List[Dict[str, Any]] = None,
        user_id: str = None
    ) -> BuilderResponse:
        """
        Process a user message in the conversation.

        Returns the builder's response with status and potentially a generated agent.
        """
        conversation = self.get_conversation(conversation_id)
        if not conversation:
            raise ValueError(f"Conversation not found: {conversation_id}")

        # Add user message to history
        conversation.messages.append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.utcnow().isoformat(),
            "attachments": attachments or []
        })

        # Build messages for LLM
        messages = [
            {"role": "system", "content": BUILDER_SYSTEM_PROMPT}
        ]

        # Add conversation history
        for msg in conversation.messages:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

        # Call LLM
        response_text = await self._call_llm(messages)

        if not response_text:
            return BuilderResponse(
                message="Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
                conversation_status="error"
            )

        # Add assistant response to history
        conversation.messages.append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Extract agent if ready
        agent_data = self._extract_agent_from_response(response_text)
        out_of_scope = self._extract_out_of_scope_summary(response_text)

        # Determine status
        status = self._determine_conversation_status(
            response_text,
            agent_data is not None,
            out_of_scope is not None
        )

        # Update conversation status
        conversation.status = status

        # Create agent definition if ready
        generated_agent = None
        if agent_data:
            try:
                logger.info(f"Creating agent from extracted data: {json.dumps(agent_data, indent=2, default=str)[:500]}")

                # Map export formats
                export_formats = []
                for fmt in agent_data.get("export_formats", []):
                    if fmt in ["excel", "word", "powerpoint", "pdf"]:
                        export_formats.append(ExportFormat(fmt))

                # Ensure required fields have minimum values
                name = agent_data.get("name", "Nouvel Agent") or "Nouvel Agent"
                description = agent_data.get("description", "Agent créé automatiquement") or "Agent créé automatiquement"
                system_prompt = agent_data.get("system_prompt", "") or "Tu es un assistant IA serviable."

                # Ensure system_prompt meets minimum length requirement
                if len(system_prompt) < 10:
                    system_prompt = system_prompt + " " * (10 - len(system_prompt)) if system_prompt else "Tu es un assistant IA serviable et professionnel."

                generated_agent = SimpleAgentDefinition(
                    name=name,
                    description=description,
                    long_description=agent_data.get("long_description"),
                    icon=agent_data.get("icon", "fa fa-robot") or "fa fa-robot",
                    category=agent_data.get("category", "custom") or "custom",
                    system_prompt=system_prompt,
                    user_prompt_template=agent_data.get("user_prompt_template"),
                    export_formats=export_formats,
                    metadata=SimpleAgentMetadata(
                        created_by=user_id,
                        tags=agent_data.get("tags", [])
                    )
                )
                conversation.generated_agent = generated_agent
                logger.info(f"Successfully created agent definition: {generated_agent.name}")
            except Exception as e:
                logger.error(f"Error creating agent definition: {e}", exc_info=True)

        # Store out of scope summary
        if out_of_scope:
            conversation.out_of_scope_summary = out_of_scope

        # Clean response for user (remove JSON block if agent was extracted)
        clean_response = response_text
        if agent_data:
            # Remove the JSON block from display
            clean_response = re.sub(r'```(?:json)?\s*[\s\S]*?```', '', response_text, flags=re.IGNORECASE).strip()
            if not clean_response:
                clean_response = "✅ J'ai préparé votre agent ! Cliquez sur le bouton **Créer cet agent** qui apparaît ci-dessous."

        # Safety check: if the AI says it prepared the agent but we didn't extract it, log warning
        ready_phrases = ["j'ai préparé votre agent", "votre agent est prêt", "créer cet agent"]
        if not generated_agent and any(phrase in response_text.lower() for phrase in ready_phrases):
            logger.warning(f"AI claims agent is ready but extraction failed. Response excerpt: {response_text[:500]}...")

        logger.info(f"Returning response with status={status}, has_agent={generated_agent is not None}")

        return BuilderResponse(
            message=clean_response,
            conversation_status=status,
            generated_agent=generated_agent,
            out_of_scope_summary=out_of_scope
        )

    async def get_welcome_message(self) -> str:
        """Get the welcome message for a new conversation."""
        return """Bonjour ! 👋

Je suis l'assistant de création d'agents IA. Je vais vous aider à créer un agent personnalisé pour vos besoins.

**Ce que je peux créer :**
- Des agents qui répondent en texte (Markdown formaté)
- Qui peuvent recevoir du texte, des images ou des documents
- Avec des options d'export (Excel, Word, PowerPoint, PDF)

**Pour commencer, décrivez-moi l'agent que vous souhaitez créer :**
- Quel est son objectif ?
- À qui s'adresse-t-il ?
- Quel type de tâche doit-il accomplir ?

Je vous poserai des questions pour bien comprendre votre besoin."""

    async def confirm_and_create_agent(
        self,
        conversation_id: str,
        user_id: str
    ) -> Optional[SimpleAgentDefinition]:
        """
        Confirm and create the agent from the conversation.

        This is called when the user confirms they want to create the generated agent.
        """
        conversation = self.get_conversation(conversation_id)
        if not conversation or not conversation.generated_agent:
            return None

        # Update metadata
        agent = conversation.generated_agent
        agent.metadata.created_by = user_id
        agent.metadata.created_at = datetime.utcnow()
        agent.status = AgentStatus.ACTIVE  # Active by default so it appears in catalog
        agent.is_public = True  # Public by default so all users can see it

        # Mark conversation as completed
        conversation.status = "completed"

        return agent


# Singleton instance
_service: Optional[SimpleBuilderService] = None


def get_simple_builder_service() -> SimpleBuilderService:
    """Get the simple builder service singleton."""
    global _service
    if _service is None:
        _service = SimpleBuilderService()
    return _service
