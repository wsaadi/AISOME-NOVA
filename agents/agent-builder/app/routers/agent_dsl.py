"""
Agent DSL API Router - REST endpoints for Agent Descriptor Language operations.

Provides endpoints for:
- DSL parsing and validation
- Import/Export in YAML and JSON formats
- Schema documentation
- Template management
- Legacy format conversion
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Body, UploadFile, File
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel

from ..models import (
    AgentDSL,
    ADL_VERSION,
    ADL_SCHEMA_URL,
)
from ..services.agent_dsl_service import get_agent_dsl_service
from ..services import get_agent_builder_service

router = APIRouter(prefix="/api/v1/dsl", tags=["Agent DSL"])


# ============== REQUEST/RESPONSE MODELS ==============

class DSLParseRequest(BaseModel):
    """Request to parse DSL content."""
    content: str
    format: str = "yaml"  # "yaml" or "json"


class DSLValidationResponse(BaseModel):
    """Response from DSL validation."""
    valid: bool
    errors: List[Dict[str, str]]
    warnings: List[Dict[str, str]]


class DSLExportResponse(BaseModel):
    """Response containing exported DSL."""
    format: str
    content: str
    agent_id: str
    agent_name: str


class DSLTemplateInfo(BaseModel):
    """Information about a DSL template."""
    id: str
    name: str
    description: str


class DSLSchemaResponse(BaseModel):
    """Response containing DSL schema."""
    version: str
    schema_url: str
    json_schema: Dict[str, Any]


# ============== PARSING & VALIDATION ==============

@router.post("/parse", response_model=Dict[str, Any])
async def parse_dsl(request: DSLParseRequest):
    """
    Parse DSL content (YAML or JSON) and return the validated agent definition.

    Returns the parsed AgentDSL and validation results.
    """
    service = get_agent_dsl_service()

    if request.format.lower() == "yaml":
        agent, validation = service.parse_yaml(request.content)
    elif request.format.lower() == "json":
        agent, validation = service.parse_json(request.content)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {request.format}. Use 'yaml' or 'json'."
        )

    return {
        "success": validation.is_valid,
        "agent": agent.model_dump(mode='json') if agent else None,
        "validation": validation.to_dict()
    }


@router.post("/validate")
async def validate_dsl(request: DSLParseRequest) -> DSLValidationResponse:
    """
    Validate DSL content without importing.

    Returns validation results including errors and warnings.
    """
    service = get_agent_dsl_service()

    if request.format.lower() == "yaml":
        _, validation = service.parse_yaml(request.content)
    elif request.format.lower() == "json":
        _, validation = service.parse_json(request.content)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: {request.format}"
        )

    return DSLValidationResponse(
        valid=validation.is_valid,
        errors=[e.to_dict() for e in validation.errors],
        warnings=[w.to_dict() for w in validation.warnings]
    )


# ============== IMPORT ==============

@router.post("/import/yaml")
async def import_from_yaml(content: str = Body(..., media_type="text/yaml")):
    """
    Import an agent from YAML DSL format.

    Creates a new agent from the YAML definition.
    """
    import logging
    import traceback
    logger = logging.getLogger(__name__)

    try:
        service = get_agent_dsl_service()
        builder_service = get_agent_builder_service()

        logger.info(f"Parsing YAML content ({len(content)} chars)")
        agent_dsl, validation = service.parse_yaml(content)

        if not validation.is_valid:
            logger.warning(f"YAML validation failed: {[e.to_dict() for e in validation.errors]}")
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Invalid DSL",
                    "errors": [e.to_dict() for e in validation.errors]
                }
            )

        logger.info(f"Converting to legacy format: {agent_dsl.identity.name}")
        # Convert to legacy format and save
        legacy_agent = service.to_legacy_definition(agent_dsl)

        logger.info(f"Saving agent: {legacy_agent.name}")
        saved_agent = await builder_service.storage.save(legacy_agent)

        logger.info(f"Agent saved successfully: {saved_agent.id}")
        return {
            "success": True,
            "agent_id": saved_agent.id,
            "agent_name": saved_agent.name,
            "message": "Agent imported successfully",
            "warnings": [w.to_dict() for w in validation.warnings]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import YAML error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to import agent",
                "error": str(e),
                "type": type(e).__name__
            }
        )


@router.post("/import/json")
async def import_from_json(data: Dict[str, Any] = Body(...)):
    """
    Import an agent from JSON DSL format.

    Creates a new agent from the JSON definition.
    """
    import json

    service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    agent_dsl, validation = service.parse_json(json.dumps(data))

    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid DSL",
                "errors": [e.to_dict() for e in validation.errors]
            }
        )

    # Convert to legacy format and save
    legacy_agent = service.to_legacy_definition(agent_dsl)
    saved_agent = await builder_service.storage.save(legacy_agent)

    return {
        "success": True,
        "agent_id": saved_agent.id,
        "agent_name": saved_agent.name,
        "message": "Agent imported successfully",
        "warnings": [w.to_dict() for w in validation.warnings]
    }


@router.post("/import/file")
async def import_from_file(file: UploadFile = File(...)):
    """
    Import an agent from an uploaded file (YAML or JSON).

    Automatically detects format from file extension.
    """
    service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    content = await file.read()
    content_str = content.decode('utf-8')

    # Detect format from filename
    filename = file.filename or ""
    if filename.endswith('.yaml') or filename.endswith('.yml'):
        agent_dsl, validation = service.parse_yaml(content_str)
    elif filename.endswith('.json'):
        agent_dsl, validation = service.parse_json(content_str)
    else:
        # Try YAML first, then JSON
        agent_dsl, validation = service.parse_yaml(content_str)
        if not validation.is_valid:
            agent_dsl, validation = service.parse_json(content_str)

    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid DSL file",
                "errors": [e.to_dict() for e in validation.errors]
            }
        )

    # Convert to legacy format and save
    legacy_agent = service.to_legacy_definition(agent_dsl)
    saved_agent = await builder_service.storage.save(legacy_agent)

    return {
        "success": True,
        "agent_id": saved_agent.id,
        "agent_name": saved_agent.name,
        "message": "Agent imported successfully",
        "warnings": [w.to_dict() for w in validation.warnings]
    }


# ============== EXPORT ==============

@router.get("/export/{agent_id}/yaml")
async def export_to_yaml(agent_id: str):
    """
    Export an agent to YAML DSL format.

    Returns the complete agent definition in YAML.
    """
    service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    # Get the agent
    agent = await builder_service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Convert to DSL
    agent_dsl = service.from_legacy_definition(agent)

    # Export to YAML
    yaml_content = service.export_to_yaml(agent_dsl)

    return Response(
        content=yaml_content,
        media_type="text/yaml",
        headers={
            "Content-Disposition": f'attachment; filename="{agent.name.lower().replace(" ", "-")}.agent.yaml"'
        }
    )


@router.get("/export/{agent_id}/json")
async def export_to_json(
    agent_id: str,
    pretty: bool = Query(True, description="Pretty print JSON")
):
    """
    Export an agent to JSON DSL format.

    Returns the complete agent definition in JSON.
    """
    service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    # Get the agent
    agent = await builder_service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Convert to DSL
    agent_dsl = service.from_legacy_definition(agent)

    # Export to JSON
    json_content = service.export_to_json(agent_dsl, indent=2 if pretty else None)

    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{agent.name.lower().replace(" ", "-")}.agent.json"'
        }
    )


@router.get("/export/{agent_id}")
async def export_agent_dsl(
    agent_id: str,
    format: str = Query("yaml", description="Export format: yaml or json")
) -> DSLExportResponse:
    """
    Export an agent in the specified DSL format.

    Returns the content as a string in the response body.
    """
    service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    # Get the agent
    agent = await builder_service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Convert to DSL
    agent_dsl = service.from_legacy_definition(agent)

    # Export
    if format.lower() == "yaml":
        content = service.export_to_yaml(agent_dsl)
    elif format.lower() == "json":
        content = service.export_to_json(agent_dsl)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    return DSLExportResponse(
        format=format,
        content=content,
        agent_id=agent_id,
        agent_name=agent.name
    )


# ============== TEMPLATES ==============

@router.get("/templates")
async def list_templates() -> List[DSLTemplateInfo]:
    """
    List available agent templates.

    Templates provide pre-configured agent definitions for common use cases.
    """
    service = get_agent_dsl_service()
    templates = service.list_templates()
    return [DSLTemplateInfo(**t) for t in templates]


@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    format: str = Query("yaml", description="Output format: yaml or json")
):
    """
    Get a specific agent template.

    Returns the template in the requested format.
    """
    service = get_agent_dsl_service()
    template = service.get_template(template_id)

    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")

    if format.lower() == "yaml":
        content = service.export_to_yaml(template)
        media_type = "text/yaml"
    elif format.lower() == "json":
        content = service.export_to_json(template)
        media_type = "application/json"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

    return Response(content=content, media_type=media_type)


@router.post("/templates/{template_id}/create")
async def create_from_template(
    template_id: str,
    name: str = Body(..., embed=True),
    description: Optional[str] = Body(None, embed=True)
):
    """
    Create a new agent from a template.

    Customizes the template with the provided name and description.
    """
    service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    template = service.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found: {template_id}")

    # Customize the template
    template.identity.name = name
    if description:
        template.identity.description = description
    template.ui.header_title = name

    # Convert and save
    legacy_agent = service.to_legacy_definition(template)
    saved_agent = await builder_service.storage.save(legacy_agent)

    return {
        "success": True,
        "agent_id": saved_agent.id,
        "agent_name": saved_agent.name,
        "message": f"Agent created from template '{template_id}'"
    }


# ============== SCHEMA ==============

@router.get("/schema")
async def get_dsl_schema() -> DSLSchemaResponse:
    """
    Get the complete JSON Schema for the Agent DSL.

    Useful for IDE integration and validation.
    """
    service = get_agent_dsl_service()
    return DSLSchemaResponse(
        version=ADL_VERSION,
        schema_url=ADL_SCHEMA_URL,
        json_schema=service.get_json_schema()
    )


@router.get("/schema/documentation")
async def get_schema_documentation():
    """
    Get human-readable documentation for the DSL schema.

    Returns markdown-formatted documentation.
    """
    service = get_agent_dsl_service()
    doc = service.get_schema_documentation()

    return Response(content=doc, media_type="text/markdown")


# ============== CONVERSION ==============

@router.post("/convert/legacy-to-dsl/{agent_id}")
async def convert_legacy_to_dsl(
    agent_id: str,
    format: str = Query("yaml", description="Output format")
):
    """
    Convert an existing agent to DSL format.

    Does not modify the original agent, just returns the DSL representation.
    """
    service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    agent = await builder_service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Convert to DSL
    agent_dsl = service.from_legacy_definition(agent)

    if format.lower() == "yaml":
        content = service.export_to_yaml(agent_dsl)
    else:
        content = service.export_to_json(agent_dsl)

    return {
        "agent_id": agent_id,
        "format": format,
        "content": content
    }


@router.post("/convert/dsl-to-legacy")
async def convert_dsl_to_legacy(request: DSLParseRequest):
    """
    Convert DSL content to legacy AgentDefinition format.

    Useful for debugging and compatibility checks.
    """
    service = get_agent_dsl_service()

    if request.format.lower() == "yaml":
        agent_dsl, validation = service.parse_yaml(request.content)
    else:
        agent_dsl, validation = service.parse_json(request.content)

    if not validation.is_valid:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Invalid DSL",
                "errors": [e.to_dict() for e in validation.errors]
            }
        )

    legacy = service.to_legacy_definition(agent_dsl)
    return legacy.model_dump(mode='json')


# ============== BULK OPERATIONS ==============

@router.post("/export/bulk")
async def export_bulk(
    agent_ids: List[str] = Body(...),
    format: str = Query("yaml", description="Export format")
):
    """
    Export multiple agents at once.

    Returns a list of exported agents in the specified format.
    """
    service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    results = []
    for agent_id in agent_ids:
        agent = await builder_service.get_agent(agent_id)
        if agent:
            agent_dsl = service.from_legacy_definition(agent)
            content = service.export_to_yaml(agent_dsl) if format == "yaml" else service.export_to_json(agent_dsl)
            results.append({
                "agent_id": agent_id,
                "agent_name": agent.name,
                "content": content,
                "success": True
            })
        else:
            results.append({
                "agent_id": agent_id,
                "success": False,
                "error": "Agent not found"
            })

    return {"results": results, "format": format}


@router.post("/import/bulk")
async def import_bulk(
    agents: List[Dict[str, Any]] = Body(...),
    format: str = Query("json", description="Import format")
):
    """
    Import multiple agents at once.

    Expects a list of agent definitions in the specified format.
    """
    import json as json_lib

    service = get_agent_dsl_service()
    builder_service = get_agent_builder_service()

    results = []
    for i, agent_data in enumerate(agents):
        try:
            if format == "yaml":
                content = agent_data.get("content", "")
                agent_dsl, validation = service.parse_yaml(content)
            else:
                agent_dsl, validation = service.parse_json(json_lib.dumps(agent_data))

            if not validation.is_valid:
                results.append({
                    "index": i,
                    "success": False,
                    "errors": [e.to_dict() for e in validation.errors]
                })
                continue

            legacy_agent = service.to_legacy_definition(agent_dsl)
            saved_agent = await builder_service.storage.save(legacy_agent)

            results.append({
                "index": i,
                "success": True,
                "agent_id": saved_agent.id,
                "agent_name": saved_agent.name,
                "warnings": [w.to_dict() for w in validation.warnings]
            })
        except Exception as e:
            results.append({
                "index": i,
                "success": False,
                "error": str(e)
            })

    return {
        "results": results,
        "total": len(agents),
        "successful": sum(1 for r in results if r.get("success"))
    }


# ============== VERSION INFO ==============

@router.get("/version")
async def get_dsl_version():
    """
    Get the current DSL version information.
    """
    return {
        "version": ADL_VERSION,
        "schema_url": ADL_SCHEMA_URL,
        "features": [
            "yaml_import",
            "json_import",
            "yaml_export",
            "json_export",
            "templates",
            "legacy_conversion",
            "bulk_operations",
            "schema_validation"
        ]
    }
