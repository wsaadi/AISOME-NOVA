"""
Agent Generator API Router - REST endpoints for AI-powered agent generation.

Provides endpoints for:
- Generating agent YAML from natural language prompts
- Refining existing agent definitions
- Getting available platform capabilities
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

from ..services.agent_generator_service import (
    get_agent_generator_service,
    GenerationStatus,
)
from ..services.agent_dsl_service import get_agent_dsl_service
from ..services import get_agent_builder_service

router = APIRouter(prefix="/api/v1/agent-builder/generator", tags=["Agent Generator"])


# ============== REQUEST/RESPONSE MODELS ==============

class GenerateAgentRequest(BaseModel):
    """Request to generate an agent from a prompt."""
    prompt: str = Field(..., description="Natural language description of the desired agent")
    provider: str = Field(default="mistral", description="LLM provider to use for generation")
    model: str = Field(default="mistral-large-latest", description="Specific model to use")
    temperature: float = Field(default=0.3, description="Temperature for generation", ge=0, le=2)


class RefineAgentRequest(BaseModel):
    """Request to refine an existing agent YAML."""
    current_yaml: str = Field(..., description="Current agent YAML content")
    refinement_prompt: str = Field(..., description="What changes to make")
    provider: str = Field(default="mistral", description="LLM provider to use")
    model: str = Field(default="mistral-large-latest", description="Specific model to use")


class MissingComponentInfo(BaseModel):
    """Information about a missing component."""
    type: str
    name: str
    description: str
    suggestion: Optional[str] = None


class GenerationResponse(BaseModel):
    """Response from agent generation."""
    success: bool
    status: str
    yaml_content: Optional[str] = None
    warnings: List[str] = []
    errors: List[str] = []
    missing_components: List[MissingComponentInfo] = []
    suggestions: List[str] = []
    message: str = ""


class CapabilitiesResponse(BaseModel):
    """Response with available platform capabilities."""
    tools: Dict[str, Any]
    ui_components: List[str]
    llm_providers: List[str]
    categories: List[str]
    triggers: List[str]
    workflow_steps: List[str]


class CreateFromYamlRequest(BaseModel):
    """Request to create an agent from generated YAML."""
    yaml_content: str = Field(..., description="The YAML content to create the agent from")


# ============== GENERATION ENDPOINTS ==============

@router.post("/generate", response_model=GenerationResponse)
async def generate_agent(request: GenerateAgentRequest):
    """
    Generate an agent YAML from a natural language description.

    Uses AI to understand the user's requirements and generate
    a complete agent definition in YAML format.

    Example prompts:
    - "Un agent de chat simple pour répondre aux questions des clients"
    - "Un agent qui analyse des documents PDF et génère des résumés en Word"
    - "Un assistant de recherche web qui compile les résultats en tableau Excel"
    """
    logger.info(f"Generate agent request: provider={request.provider}, model={request.model}, prompt_length={len(request.prompt)}")

    service = get_agent_generator_service()

    result = await service.generate_from_prompt(
        user_prompt=request.prompt,
        provider=request.provider,
        model=request.model,
        temperature=request.temperature
    )

    logger.info(f"Generation result: status={result.status}, errors={result.errors}, yaml_length={len(result.yaml_content) if result.yaml_content else 0}")

    # Determine success and message
    success = result.status in [GenerationStatus.SUCCESS, GenerationStatus.PARTIAL]

    if result.status == GenerationStatus.SUCCESS:
        message = "Agent généré avec succès"
    elif result.status == GenerationStatus.PARTIAL:
        message = "Agent généré avec des avertissements"
    elif result.status == GenerationStatus.MISSING_COMPONENTS:
        message = "Certains composants demandés ne sont pas disponibles dans la plateforme"
    else:
        # Include actual errors in the message
        error_details = "; ".join(result.errors) if result.errors else "Erreur inconnue"
        message = f"Échec de la génération: {error_details}"

    return GenerationResponse(
        success=success,
        status=result.status.value,
        yaml_content=result.yaml_content,
        warnings=result.warnings,
        errors=result.errors,
        missing_components=[
            MissingComponentInfo(
                type=mc.type,
                name=mc.name,
                description=mc.description,
                suggestion=mc.suggestion
            )
            for mc in result.missing_components
        ],
        suggestions=result.suggestions,
        message=message
    )


@router.post("/refine", response_model=GenerationResponse)
async def refine_agent(request: RefineAgentRequest):
    """
    Refine an existing agent YAML based on user feedback.

    Takes an existing agent definition and modifies it according
    to the user's refinement request.

    Example refinements:
    - "Ajoute un champ pour uploader des fichiers"
    - "Change le ton pour être plus formel"
    - "Ajoute une étape de validation avant l'envoi"
    """
    service = get_agent_generator_service()

    result = await service.refine_agent(
        current_yaml=request.current_yaml,
        refinement_prompt=request.refinement_prompt,
        provider=request.provider,
        model=request.model
    )

    success = result.status in [GenerationStatus.SUCCESS, GenerationStatus.PARTIAL]

    if result.status == GenerationStatus.SUCCESS:
        message = "Agent modifié avec succès"
    elif result.status == GenerationStatus.PARTIAL:
        message = "Agent modifié avec des avertissements"
    elif result.status == GenerationStatus.MISSING_COMPONENTS:
        message = "La modification nécessite des composants non disponibles"
    else:
        message = "Échec de la modification de l'agent"

    return GenerationResponse(
        success=success,
        status=result.status.value,
        yaml_content=result.yaml_content,
        warnings=result.warnings,
        errors=result.errors,
        missing_components=[
            MissingComponentInfo(
                type=mc.type,
                name=mc.name,
                description=mc.description,
                suggestion=mc.suggestion
            )
            for mc in result.missing_components
        ],
        suggestions=result.suggestions,
        message=message
    )


@router.get("/capabilities", response_model=CapabilitiesResponse)
async def get_capabilities():
    """
    Get available platform capabilities.

    Returns all available tools, UI components, LLM providers,
    and other capabilities that can be used when creating agents.
    """
    service = get_agent_generator_service()
    capabilities = service.get_available_capabilities()

    return CapabilitiesResponse(**capabilities)


@router.post("/create-from-yaml")
async def create_agent_from_yaml(request: CreateFromYamlRequest):
    """
    Create an agent in the system from generated YAML.

    Takes the YAML generated by the /generate endpoint and
    creates an actual agent in the system.
    """
    dsl_service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    # Parse and validate the YAML
    agent_dsl, validation = dsl_service.parse_yaml(request.yaml_content)

    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "YAML invalide",
                "errors": [e.to_dict() for e in validation.errors]
            }
        )

    # Convert to legacy format and save
    legacy_agent = dsl_service.to_legacy_definition(agent_dsl)
    saved_agent = await builder_service.storage.save(legacy_agent)

    return {
        "success": True,
        "agent_id": saved_agent.id,
        "agent_name": saved_agent.name,
        "message": "Agent créé avec succès",
        "warnings": [w.to_dict() for w in validation.warnings]
    }


@router.post("/validate-yaml")
async def validate_yaml(yaml_content: str = Body(..., media_type="text/plain")):
    """
    Validate a YAML agent definition without creating it.

    Useful for checking if generated YAML is valid before saving.
    """
    dsl_service = get_agent_dsl_service()
    generator_service = get_agent_generator_service()

    # Parse and validate
    agent_dsl, validation = dsl_service.parse_yaml(yaml_content)

    # Check for missing components
    result = generator_service._validate_and_check_components(yaml_content)

    return {
        "valid": validation.is_valid and result.status != GenerationStatus.MISSING_COMPONENTS,
        "errors": [e.to_dict() for e in validation.errors] + result.errors,
        "warnings": [w.to_dict() for w in validation.warnings] + result.warnings,
        "missing_components": [
            {
                "type": mc.type,
                "name": mc.name,
                "description": mc.description,
                "suggestion": mc.suggestion
            }
            for mc in result.missing_components
        ]
    }


# ============== EXAMPLES ENDPOINT ==============

@router.get("/examples")
async def get_generation_examples():
    """
    Get example prompts for agent generation.

    Returns a list of example prompts that users can use as inspiration.
    """
    return {
        "examples": [
            {
                "title": "Agent de Chat Simple",
                "prompt": "Un agent de chat simple et convivial pour répondre aux questions des utilisateurs de manière professionnelle",
                "description": "Crée un agent conversationnel basique"
            },
            {
                "title": "Analyseur de Documents",
                "prompt": "Un agent qui permet d'uploader des documents PDF ou Word, les analyse et génère un résumé structuré avec les points clés",
                "description": "Crée un agent d'analyse documentaire"
            },
            {
                "title": "Assistant de Recherche Web",
                "prompt": "Un agent qui recherche des informations sur le web à partir d'une question, compile les résultats et génère un rapport en format Word",
                "description": "Crée un agent de recherche avec génération de rapport"
            },
            {
                "title": "Générateur de Présentations",
                "prompt": "Un agent qui prend un sujet et des points clés en entrée et génère automatiquement une présentation PowerPoint professionnelle",
                "description": "Crée un agent de génération de présentations"
            },
            {
                "title": "Chatbot avec Modération",
                "prompt": "Un agent de chat avec modération de contenu intégrée qui refuse les messages inappropriés et classe les requêtes par catégorie",
                "description": "Crée un agent conversationnel avec gouvernance"
            },
            {
                "title": "Extracteur de Données Email",
                "prompt": "Un agent qui analyse des fichiers email (.eml), extrait les informations clés (expéditeur, sujet, contenu, pièces jointes) et génère un rapport structuré",
                "description": "Crée un agent d'extraction de données email"
            },
            {
                "title": "Dashboard Analytique",
                "prompt": "Un agent avec une interface dashboard qui affiche des graphiques et permet de poser des questions sur les données",
                "description": "Crée un agent analytique avec visualisation"
            },
            {
                "title": "Assistant Formulaire",
                "prompt": "Un agent avec un formulaire multi-étapes pour collecter des informations utilisateur, valider les entrées et générer un document récapitulatif",
                "description": "Crée un agent de traitement de formulaire"
            }
        ]
    }
