"""
Tool Manager Service - Handles tool execution and orchestration.
"""

from typing import Any, Dict, List, Optional, Tuple
import httpx
import asyncio
from datetime import datetime
import json
import base64

from ..config import settings, TOOL_ENDPOINTS
from ..models import ToolExecutionRequest, ToolExecutionResponse


class ToolDefinition:
    """Definition of an available tool."""

    def __init__(
        self,
        tool_id: str,
        name: str,
        description: str,
        endpoint: str,
        category: str = "general",
        input_schema: Dict[str, Any] = None,
        output_schema: Dict[str, Any] = None,
        requires_file_input: bool = False,
        produces_file_output: bool = False,
    ):
        self.tool_id = tool_id
        self.name = name
        self.description = description
        self.endpoint = endpoint
        self.category = category
        self.input_schema = input_schema or {}
        self.output_schema = output_schema or {}
        self.requires_file_input = requires_file_input
        self.produces_file_output = produces_file_output


# Tool registry with full definitions
TOOL_REGISTRY: Dict[str, ToolDefinition] = {
    "word-crud": ToolDefinition(
        tool_id="word-crud",
        name="Word Document",
        description="Create and manipulate Word documents",
        endpoint="/api/v1/word",
        category="document_processing",
        produces_file_output=True,
    ),
    "pdf-crud": ToolDefinition(
        tool_id="pdf-crud",
        name="PDF Document",
        description="Create and manipulate PDF documents",
        endpoint="/api/v1/pdf",
        category="document_processing",
        produces_file_output=True,
    ),
    "excel-crud": ToolDefinition(
        tool_id="excel-crud",
        name="Excel Spreadsheet",
        description="Create and manipulate Excel spreadsheets",
        endpoint="/api/v1/excel",
        category="document_processing",
        produces_file_output=True,
    ),
    "pptx-crud": ToolDefinition(
        tool_id="pptx-crud",
        name="PowerPoint",
        description="Create PowerPoint presentations",
        endpoint="/api/v1/pptx",
        category="document_processing",
        produces_file_output=True,
    ),
    "document-extractor": ToolDefinition(
        tool_id="document-extractor",
        name="Document Extractor",
        description="Extract text from documents (PDF, Word, etc.)",
        endpoint="/api/v1/extract",
        category="data_extraction",
        requires_file_input=True,
    ),
    "web-search": ToolDefinition(
        tool_id="web-search",
        name="Web Search",
        description="Search the web for information",
        endpoint="/api/v1/search",
        category="search",
    ),
    "file-upload": ToolDefinition(
        tool_id="file-upload",
        name="File Upload",
        description="Upload and store files",
        endpoint="/api/v1/upload",
        category="storage",
        requires_file_input=True,
    ),
    "prompt-moderation": ToolDefinition(
        tool_id="prompt-moderation",
        name="Content Moderation",
        description="Check content for policy violations",
        endpoint="/api/v1/moderate",
        category="governance",
    ),
    "content-classification": ToolDefinition(
        tool_id="content-classification",
        name="Content Classification",
        description="Classify content type and domain",
        endpoint="/api/v1/classify",
        category="governance",
    ),
    "eml-parser": ToolDefinition(
        tool_id="eml-parser",
        name="Email Parser",
        description="Parse email files (.eml)",
        endpoint="/api/v1/parse-email",
        category="data_extraction",
        requires_file_input=True,
    ),
    "dolibarr-connector": ToolDefinition(
        tool_id="dolibarr-connector",
        name="Dolibarr ERP",
        description="Connect to Dolibarr ERP system",
        endpoint="/api/v1/dolibarr",
        category="integration",
    ),
    "image-analysis": ToolDefinition(
        tool_id="image-analysis",
        name="Image Analysis",
        description="Analyze images using AI vision to extract information and describe content",
        endpoint="/api/v1/analyze",
        category="data_extraction",
        requires_file_input=True,
    ),
    "data-export": ToolDefinition(
        tool_id="data-export",
        name="Data Export",
        description="Export structured data to CSV, JSON, and ZIP formats",
        endpoint="/api/v1/export/generate-zip",
        category="data_processing",
        produces_file_output=True,
    ),
    "nvidia-multimodal": ToolDefinition(
        tool_id="nvidia-multimodal",
        name="NVIDIA Multimodal",
        description="NVIDIA multimodal AI pipeline: text generation (Llama 3.1), image generation (FLUX.1), text-to-speech (FastPitch), speech-to-text (Parakeet), image analysis (NVLM), avatar animation (Audio2Face)",
        endpoint="/api/v1/nvidia-multimodal/pipeline",
        category="ai_multimodal",
        produces_file_output=True,
    ),
}


class ToolManager:
    """
    Manager for tool execution.

    Handles:
    - Tool discovery and registration
    - Parameter mapping and validation
    - Tool execution with proper error handling
    - File handling for tools that require/produce files
    """

    def __init__(self):
        self._http_client: Optional[httpx.AsyncClient] = None
        self._tools = TOOL_REGISTRY.copy()

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=settings.tool_timeout_seconds)
        return self._http_client

    async def close(self):
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    def get_tool(self, tool_id: str) -> Optional[ToolDefinition]:
        """Get a tool definition by ID."""
        return self._tools.get(tool_id)

    def list_tools(self) -> List[ToolDefinition]:
        """List all available tools."""
        return list(self._tools.values())

    def list_tools_by_category(self, category: str) -> List[ToolDefinition]:
        """List tools by category."""
        return [t for t in self._tools.values() if t.category == category]

    async def execute(
        self,
        tool_id: str,
        parameters: Dict[str, Any],
        files: Dict[str, Any] = None,
        context: Dict[str, Any] = None,
    ) -> ToolExecutionResponse:
        """
        Execute a tool with the given parameters.

        Args:
            tool_id: ID of the tool to execute
            parameters: Tool parameters
            files: File data (bytes or base64)
            context: Execution context with variables

        Returns:
            ToolExecutionResponse with results
        """
        start_time = datetime.utcnow()

        tool = self.get_tool(tool_id)
        if not tool:
            return ToolExecutionResponse(
                success=False,
                tool_id=tool_id,
                error=f"Unknown tool: {tool_id}",
                duration_ms=0,
            )

        # Get base URL for the tool
        base_url = TOOL_ENDPOINTS.get(tool_id)
        if not base_url:
            return ToolExecutionResponse(
                success=False,
                tool_id=tool_id,
                error=f"No endpoint configured for tool: {tool_id}",
                duration_ms=0,
            )

        url = f"{base_url}{tool.endpoint}"

        try:
            client = await self._get_client()

            # Prepare request based on tool type
            if tool.requires_file_input and files:
                # Multipart file upload
                response = await self._execute_with_files(client, url, parameters, files)
            else:
                # JSON request
                response = await client.post(url, json=parameters)

            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            if response.status_code >= 400:
                return ToolExecutionResponse(
                    success=False,
                    tool_id=tool_id,
                    error=f"Tool returned error {response.status_code}: {response.text}",
                    duration_ms=duration_ms,
                )

            # Parse response
            try:
                output = response.json()
            except:
                output = response.text

            return ToolExecutionResponse(
                success=True,
                tool_id=tool_id,
                output=output,
                duration_ms=duration_ms,
            )

        except httpx.TimeoutException:
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            return ToolExecutionResponse(
                success=False,
                tool_id=tool_id,
                error=f"Tool execution timed out after {settings.tool_timeout_seconds}s",
                duration_ms=duration_ms,
            )
        except Exception as e:
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            return ToolExecutionResponse(
                success=False,
                tool_id=tool_id,
                error=f"Tool execution failed: {str(e)}",
                duration_ms=duration_ms,
            )

    async def _execute_with_files(
        self,
        client: httpx.AsyncClient,
        url: str,
        parameters: Dict[str, Any],
        files: Dict[str, Any],
    ) -> httpx.Response:
        """Execute a tool with file uploads."""
        # Prepare multipart data
        form_files = {}
        form_data = {}

        for key, value in files.items():
            if isinstance(value, bytes):
                form_files[key] = (f"{key}.bin", value)
            elif isinstance(value, str):
                # Assume base64 encoded
                try:
                    decoded = base64.b64decode(value)
                    form_files[key] = (f"{key}.bin", decoded)
                except:
                    form_data[key] = value
            elif isinstance(value, dict) and "content" in value:
                # File object with metadata
                content = value["content"]
                filename = value.get("filename", f"{key}.bin")
                if isinstance(content, str):
                    content = base64.b64decode(content)
                form_files[key] = (filename, content)

        # Add parameters as form data
        for key, value in parameters.items():
            if isinstance(value, (dict, list)):
                form_data[key] = json.dumps(value)
            else:
                form_data[key] = str(value)

        return await client.post(url, files=form_files, data=form_data)

    async def check_health(self, tool_id: str) -> Tuple[bool, str]:
        """Check if a tool is healthy."""
        base_url = TOOL_ENDPOINTS.get(tool_id)
        if not base_url:
            return False, "No endpoint configured"

        try:
            client = await self._get_client()
            response = await client.get(f"{base_url}/health", timeout=5.0)
            if response.status_code == 200:
                return True, "healthy"
            return False, f"status {response.status_code}"
        except Exception as e:
            return False, str(e)

    async def check_all_health(self) -> Dict[str, str]:
        """Check health of all tools."""
        results = {}
        for tool_id in TOOL_ENDPOINTS:
            healthy, status = await self.check_health(tool_id)
            results[tool_id] = "healthy" if healthy else f"unhealthy: {status}"
        return results

    def resolve_parameters(
        self,
        tool_config: Dict[str, Any],
        inputs: Dict[str, Any],
        variables: Dict[str, Any],
        previous_outputs: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Resolve tool parameters from various sources.

        Args:
            tool_config: Tool configuration from agent definition
            inputs: Input values from UI
            variables: Workflow variables
            previous_outputs: Outputs from previous steps

        Returns:
            Resolved parameters dict
        """
        resolved = {}

        for param in tool_config.get("parameters", []):
            name = param.get("name")
            source = param.get("source", "constant")
            value = param.get("value")

            if source == "constant":
                resolved[name] = value
            elif source == "input":
                input_component = param.get("input_component", name)
                resolved[name] = inputs.get(input_component, value)
            elif source == "variable":
                var_name = value or name
                resolved[name] = self._get_nested_value(variables, var_name)
            elif source == "previous_output":
                output_name = value or name
                resolved[name] = self._get_nested_value(previous_outputs, output_name)
            elif source == "context":
                resolved[name] = self._get_nested_value(variables, value or name)

            # Apply transform if specified
            transform = param.get("transform")
            if transform and name in resolved:
                resolved[name] = self._apply_transform(resolved[name], transform)

        return resolved

    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Get a nested value using dot notation."""
        if not data or not path:
            return None

        parts = path.split(".")
        current = data

        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            elif isinstance(current, list) and part.isdigit():
                idx = int(part)
                current = current[idx] if idx < len(current) else None
            else:
                return None

            if current is None:
                return None

        return current

    def _apply_transform(self, value: Any, transform: str) -> Any:
        """Apply a simple transform to a value."""
        if not transform or value is None:
            return value

        try:
            if transform == "upper()":
                return str(value).upper()
            elif transform == "lower()":
                return str(value).lower()
            elif transform == "strip()":
                return str(value).strip()
            elif transform == "json.loads()":
                return json.loads(value)
            elif transform == "json.dumps()":
                return json.dumps(value)
            elif transform == "str()":
                return str(value)
            elif transform == "int()":
                return int(value)
            elif transform == "float()":
                return float(value)
            elif transform == "bool()":
                return bool(value)
            elif transform.startswith("split("):
                # split(',')
                sep = transform[6:-1].strip("'\"")
                return str(value).split(sep)
            elif transform.startswith("join("):
                # join(',')
                sep = transform[5:-1].strip("'\"")
                return sep.join(value)
            else:
                return value
        except:
            return value


# Singleton instance
_manager: Optional[ToolManager] = None


def get_tool_manager() -> ToolManager:
    """Get the tool manager singleton."""
    global _manager
    if _manager is None:
        _manager = ToolManager()
    return _manager
