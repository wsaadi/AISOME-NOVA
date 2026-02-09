"""
Agent Generator Service - Generate agent YAML from natural language prompts.

This service uses LLM to convert user descriptions into complete Agent YAML definitions,
validating that all required components are available in the platform.
"""

from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import json
import yaml
import httpx
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from ..models.agent_dsl import (
    AgentDSL,
    ADL_VERSION,
    ComponentType,
    LLMProvider,
    TriggerType,
    WorkflowStepType,
)
from .agent_dsl_service import get_agent_dsl_service


# LLM connector configuration (URL and endpoint path)
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
    "gemini": {
        "url": os.environ.get("LLM_GEMINI_URL", "http://gemini-connector:8000"),
        "endpoint": "/api/v1/gemini/chat"
    },
    "perplexity": {
        "url": os.environ.get("LLM_PERPLEXITY_URL", "http://perplexity-connector:8000"),
        "endpoint": "/api/v1/perplexity/chat"
    },
}


class GenerationStatus(str, Enum):
    """Status of agent generation."""
    SUCCESS = "success"
    PARTIAL = "partial"  # Generated but with warnings
    FAILED = "failed"
    MISSING_COMPONENTS = "missing_components"


@dataclass
class MissingComponent:
    """Represents a component that is not available in the platform."""
    type: str  # 'tool', 'connector', 'ui_component'
    name: str
    description: str
    suggestion: Optional[str] = None


@dataclass
class GenerationResult:
    """Result of agent generation."""
    status: GenerationStatus
    yaml_content: Optional[str] = None
    agent_dsl: Optional[AgentDSL] = None
    warnings: List[str] = None
    errors: List[str] = None
    missing_components: List[MissingComponent] = None
    suggestions: List[str] = None
    usage: Optional[Dict[str, int]] = None  # Token usage tracking

    def __post_init__(self):
        self.warnings = self.warnings or []
        self.errors = self.errors or []
        self.missing_components = self.missing_components or []
        self.suggestions = self.suggestions or []

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "status": self.status.value,
            "yaml_content": self.yaml_content,
            "warnings": self.warnings,
            "errors": self.errors,
            "missing_components": [
                {
                    "type": mc.type,
                    "name": mc.name,
                    "description": mc.description,
                    "suggestion": mc.suggestion
                }
                for mc in self.missing_components
            ],
            "suggestions": self.suggestions
        }
        if self.usage:
            result["usage"] = self.usage
        return result


class AgentGeneratorService:
    """
    Service for generating agent definitions from natural language prompts.

    Uses LLM to understand user requirements and generate appropriate YAML.
    Validates that all components exist in the platform.
    """

    # Available tools in the platform
    AVAILABLE_TOOLS = {
        "word-crud": {
            "name": "Word Document Generator",
            "description": "Create and manipulate Word documents",
            "category": "document_processing"
        },
        "pdf-crud": {
            "name": "PDF Document Generator",
            "description": "Create and manipulate PDF documents",
            "category": "document_processing"
        },
        "excel-crud": {
            "name": "Excel Spreadsheet Generator",
            "description": "Create and manipulate Excel spreadsheets",
            "category": "document_processing"
        },
        "pptx-crud": {
            "name": "PowerPoint Generator",
            "description": "Create PowerPoint presentations",
            "category": "document_processing"
        },
        "document-extractor": {
            "name": "Document Extractor",
            "description": "Extract text and content from documents (PDF, Word, etc.)",
            "category": "data_extraction"
        },
        "web-search": {
            "name": "Web Search",
            "description": "Search the web for information",
            "category": "search"
        },
        "file-upload": {
            "name": "File Upload",
            "description": "Upload and store files",
            "category": "storage"
        },
        "prompt-moderation": {
            "name": "Content Moderation",
            "description": "Check content for policy violations",
            "category": "governance"
        },
        "content-classification": {
            "name": "Content Classification",
            "description": "Classify content type and domain",
            "category": "governance"
        },
        "eml-parser": {
            "name": "Email Parser",
            "description": "Parse and extract data from .eml email files",
            "category": "data_extraction"
        },
        "dolibarr-connector": {
            "name": "Dolibarr ERP Connector",
            "description": "Connect to Dolibarr ERP system",
            "category": "integration"
        }
    }

    # Available UI components
    AVAILABLE_UI_COMPONENTS = [e.value for e in ComponentType]

    # Available LLM providers
    AVAILABLE_PROVIDERS = [e.value for e in LLMProvider]

    # System prompt for agent generation
    GENERATION_SYSTEM_PROMPT = """Tu es un expert en conception d'agents IA. Ta tâche est de générer des définitions d'agents au format YAML (ADL - Agent Descriptor Language) basées sur les descriptions utilisateur.

## Outils disponibles dans la plateforme:
{tools_list}

## Composants UI disponibles:
{ui_components_list}

## Fournisseurs LLM disponibles:
{providers_list}

## ═══════════════════════════════════════════════════════════════════════════
## RÈGLE CRITIQUE: TOUJOURS UTILISER LE MODE DASHBOARD AVEC WIDGETS
## ═══════════════════════════════════════════════════════════════════════════

Tu DOIS TOUJOURS générer une interface utilisateur complète avec des widgets positionnés sur une grille.
- TOUJOURS utiliser `layout_mode: "dashboard"`
- TOUJOURS remplir le tableau `widgets` avec les composants appropriés
- TOUJOURS définir `gridPosition` pour chaque widget
- LAISSER `sections: []` vide (format obsolète)

## FORMAT DE SORTIE ATTENDU:

```yaml
metadata:
  adl_version: "1.0.0"
  version: "1.0.0"
  tags: [liste de tags pertinents]

identity:
  name: "Nom de l'agent"
  slug: "nom-agent-slug"
  description: "Description courte"
  icon: "fa fa-icon-name"
  category: "custom|document_analysis|data_processing|conversation|automation|monitoring|integration|analytics"
  status: "draft"

business_logic:
  system_prompt: |
    Instructions système pour le LLM...
  user_prompt_template: "{{{{user_message}}}}"
  tone: "professional|friendly|technical|creative|formal|casual"
  language: "fr|en|auto"
  llm_provider: "mistral|openai|anthropic|gemini|perplexity"
  llm_model: "nom-du-modele"
  temperature: 0.7
  max_tokens: 2048

tools:
  tools:
    - tool_id: "id-de-l-outil"
      name: "Nom affiché"
      enabled: true
      parameters:
        - name: "nom_param"
          source: "input"
          input_component: "nom_composant_ui"
      output_variable: "nom_variable"

ui:
  layout_mode: "dashboard"
  show_header: true
  header_title: "Titre de l'agent"
  dashboard_config:
    columns: 12
    rowHeight: 80
    gap: 12
  widgets:
    - type: "component_type"
      name: "nom_unique"
      label: "Label affiché"
      gridPosition:
        x: 0       # Colonne de départ (0-11)
        y: 0       # Ligne de départ
        w: 6       # Largeur en colonnes (1-12)
        h: 2       # Hauteur en lignes
      auto_bind_output: true  # Pour les composants d'affichage
  sections: []  # TOUJOURS VIDE - format obsolète

workflows:
  workflows:
    - name: "Nom du workflow"
      trigger: "button_click"
      trigger_config:
        button: "nom_du_bouton"
      steps:
        - id: "step_id"
          name: "Nom étape"
          type: "llm_call"
          output_variable: "result"
      entry_step: "step_id"
```

## ═══════════════════════════════════════════════════════════════════════════
## GRILLE DE WIDGETS : COMMENT POSITIONNER LES COMPOSANTS
## ═══════════════════════════════════════════════════════════════════════════

La grille fait 12 colonnes. Chaque widget a une position (x, y) et une taille (w, h).

### TAILLES RECOMMANDÉES PAR TYPE:

| Type de widget      | Largeur (w) | Hauteur (h) | Description |
|---------------------|-------------|-------------|-------------|
| text_input          | 4-6         | 1           | Champ texte simple |
| textarea            | 6-8         | 2-3         | Zone de texte multi-lignes |
| file_upload         | 4-6         | 2           | Zone d'upload |
| button              | 2-3         | 1           | Bouton d'action |
| select              | 3-4         | 1           | Liste déroulante |
| date_picker         | 3           | 1           | Sélecteur de date |
| number_input        | 2-3         | 1           | Champ numérique |
| markdown_viewer     | 6-12        | 3-5         | Affichage résultat IA |
| line_chart          | 6-8         | 3-4         | Graphique courbes |
| bar_chart           | 6-8         | 3-4         | Graphique barres |
| pie_chart           | 4-6         | 3           | Camembert |
| donut_chart         | 4-6         | 3           | Donut |
| chat_interface      | 12          | 5-6         | Interface chat |

### LAYOUTS TYPES:

**Layout "Formulaire avec paramètres + Résultats" (agent de veille, analyse, etc.):**
```yaml
widgets:
  # Ligne 0: Champ de saisie principal
  - type: textarea
    name: "input_topic"
    label: "Thématique à analyser"
    placeholder: "Décrivez le sujet..."
    gridPosition: {{x: 0, y: 0, w: 8, h: 2}}

  # Ligne 0: Bouton à droite
  - type: button
    name: "run_btn"
    label: "Lancer l'analyse"
    gridPosition: {{x: 8, y: 0, w: 3, h: 1}}
    is_trigger_button: true
    button_action: "trigger_agent"
    button_variant: "primary"

  # Ligne 2: Paramètres de configuration côte à côte
  - type: date_picker
    name: "date_start"
    label: "Date de début"
    gridPosition: {{x: 0, y: 2, w: 3, h: 1}}
  - type: date_picker
    name: "date_end"
    label: "Date de fin"
    gridPosition: {{x: 3, y: 2, w: 3, h: 1}}
  - type: number_input
    name: "max_results"
    label: "Nombre max de résultats"
    default_value: 10
    gridPosition: {{x: 6, y: 2, w: 3, h: 1}}

  # Ligne 3: Résultats (plusieurs zones markdown côte à côte ou empilées)
  - type: markdown_viewer
    name: "swot_result"
    label: "Analyse SWOT"
    auto_bind_output: true
    gridPosition: {{x: 0, y: 3, w: 6, h: 4}}
  - type: markdown_viewer
    name: "synthesis_result"
    label: "Synthèse"
    auto_bind_output: true
    gridPosition: {{x: 6, y: 3, w: 6, h: 4}}

  # Ligne 7: Autres résultats
  - type: markdown_viewer
    name: "recommendations_result"
    label: "Recommandations"
    auto_bind_output: true
    gridPosition: {{x: 0, y: 7, w: 6, h: 3}}
  - type: markdown_viewer
    name: "sources_result"
    label: "Sources"
    auto_bind_output: true
    gridPosition: {{x: 6, y: 7, w: 6, h: 3}}
```

**Layout "Upload fichier + Analyse":**
```yaml
widgets:
  - type: file_upload
    name: "input_file"
    label: "Fichier à analyser"
    accept: ".csv,.xlsx,.pdf"
    gridPosition: {{x: 0, y: 0, w: 5, h: 2}}
  - type: button
    name: "analyze_btn"
    label: "Analyser"
    gridPosition: {{x: 5, y: 0, w: 2, h: 1}}
    is_trigger_button: true
    button_action: "trigger_agent"
    button_variant: "primary"
  - type: markdown_viewer
    name: "analysis_result"
    label: "Résultat de l'analyse"
    auto_bind_output: true
    gridPosition: {{x: 0, y: 2, w: 12, h: 5}}
```

**Layout "Dashboard analytique avec graphiques":**
```yaml
widgets:
  - type: file_upload
    name: "data_file"
    label: "Données"
    gridPosition: {{x: 0, y: 0, w: 4, h: 2}}
  - type: select
    name: "analysis_type"
    label: "Type d'analyse"
    options:
      - {{value: "trend", label: "Tendances"}}
      - {{value: "comparison", label: "Comparaison"}}
    gridPosition: {{x: 4, y: 0, w: 3, h: 1}}
  - type: button
    name: "run_btn"
    label: "Analyser"
    gridPosition: {{x: 7, y: 0, w: 2, h: 1}}
    is_trigger_button: true
    button_action: "trigger_agent"
    button_variant: "primary"
  - type: line_chart
    name: "trend_chart"
    label: "Tendances"
    auto_bind_output: true
    gridPosition: {{x: 0, y: 2, w: 6, h: 3}}
  - type: pie_chart
    name: "distribution_chart"
    label: "Répartition"
    auto_bind_output: true
    gridPosition: {{x: 6, y: 2, w: 6, h: 3}}
  - type: markdown_viewer
    name: "analysis_summary"
    label: "Analyse détaillée"
    auto_bind_output: true
    gridPosition: {{x: 0, y: 5, w: 12, h: 3}}
```

## ═══════════════════════════════════════════════════════════════════════════
## CHOIX INTELLIGENT DU TYPE DE GRAPHIQUE
## ═══════════════════════════════════════════════════════════════════════════

| Cas d'usage                                    | Type à utiliser |
|------------------------------------------------|-----------------|
| Évolution dans le temps (dates, mois, années)  | **line_chart**  |
| Comparaison entre catégories                   | **bar_chart**   |
| Répartition en pourcentages (parts d'un tout)  | **pie_chart**   |
| Proportions avec métrique centrale             | **donut_chart** |

## ═══════════════════════════════════════════════════════════════════════════
## CONFIGURATION DES COMPOSANTS D'AFFICHAGE
## ═══════════════════════════════════════════════════════════════════════════

**RÈGLE CRITIQUE: Tout composant qui doit afficher les résultats de l'IA DOIT avoir `auto_bind_output: true`**

Composants d'affichage:
- `markdown_viewer`: Pour afficher du texte formaté (analyses, SWOT, synthèses, etc.)
- `line_chart`, `bar_chart`, `pie_chart`, `donut_chart`: Pour les données visuelles

## ═══════════════════════════════════════════════════════════════════════════
## SORTIE STRUCTURÉE: PLUSIEURS ZONES D'AFFICHAGE
## ═══════════════════════════════════════════════════════════════════════════

**RÈGLE IMPORTANTE: Quand l'utilisateur demande PLUSIEURS sections de résultats distinctes**
(ex: SWOT + Synthèse + Recommandations + Sources), tu DOIS:

1. Créer un `markdown_viewer` pour chaque section avec un `output_key` unique
2. Ajouter dans `business_logic.system_prompt` l'instruction de sortie JSON structurée

**Format des composants avec output_key:**
```yaml
widgets:
  - type: markdown_viewer
    name: "swot_output"
    label: "Analyse SWOT"
    auto_bind_output: true
    output_key: "swot"              # Clé JSON à extraire
    gridPosition: {{x: 0, y: 3, w: 6, h: 4}}
  - type: markdown_viewer
    name: "synthesis_output"
    label: "Synthèse"
    auto_bind_output: true
    output_key: "synthesis"          # Clé JSON à extraire
    gridPosition: {{x: 6, y: 3, w: 6, h: 4}}
  - type: markdown_viewer
    name: "recommendations_output"
    label: "Recommandations"
    auto_bind_output: true
    output_key: "recommendations"    # Clé JSON à extraire
    gridPosition: {{x: 0, y: 7, w: 6, h: 4}}
  - type: markdown_viewer
    name: "sources_output"
    label: "Sources"
    auto_bind_output: true
    output_key: "sources"            # Clé JSON à extraire
    gridPosition: {{x: 6, y: 7, w: 6, h: 4}}
```

**OBLIGATOIRE dans business_logic.system_prompt - Ajouter ces instructions à la fin:**
```
## FORMAT DE RÉPONSE OBLIGATOIRE
Tu DOIS répondre UNIQUEMENT avec un objet JSON valide ayant cette structure:
{{
  "swot": "## Analyse SWOT\\n\\n### Forces\\n- ...\\n### Faiblesses\\n- ...",
  "synthesis": "## Synthèse\\n\\nContenu en markdown...",
  "recommendations": "## Recommandations\\n\\n1. ...\\n2. ...",
  "sources": "## Sources\\n\\n- [Titre](url)\\n- ..."
}}
Chaque valeur doit être du markdown formaté. Ne réponds avec RIEN d'autre que ce JSON.
```

**SANS output_key (un seul viewer):**
```yaml
- type: markdown_viewer
  name: "result_output"
  label: "Résultat"
  auto_bind_output: true  # Reçoit toute la réponse
  gridPosition: {{x: 0, y: 3, w: 12, h: 6}}
```

## ═══════════════════════════════════════════════════════════════════════════
## BOUTONS DÉCLENCHEURS (TRIGGERS)
## ═══════════════════════════════════════════════════════════════════════════

**RÈGLE ABSOLUE:** Tout bouton qui doit déclencher l'agent DOIT avoir:
1. `is_trigger_button: true`
2. `button_action: "trigger_agent"`
3. Un workflow avec `trigger: "button_click"` et `trigger_config.button` correspondant

```yaml
# Dans ui.widgets:
- type: button
  name: "execute_btn"
  label: "Exécuter"
  button_action: "trigger_agent"
  button_variant: "primary"
  is_trigger_button: true
  gridPosition: {{x: 6, y: 0, w: 2, h: 1}}

# Dans workflows.workflows:
- name: "Workflow principal"
  trigger: "button_click"
  trigger_config:
    button: "execute_btn"
  steps:
    - id: "step1"
      name: "Exécution"
      type: "llm_call"
      output_variable: "result"
  entry_step: "step1"
```

## ═══════════════════════════════════════════════════════════════════════════
## COMPOSANTS UI DISPONIBLES
## ═══════════════════════════════════════════════════════════════════════════

### Entrées utilisateur:
- **text_input**: Champ texte simple
- **textarea**: Zone de texte multi-lignes (pour descriptions longues)
- **number_input**: Entrée numérique
- **select**: Liste déroulante (nécessite `options: [{{value: "v1", label: "Label 1"}}]`)
- **checkbox**: Case à cocher
- **radio_group**: Boutons radio
- **date_picker**: Sélecteur de date
- **slider**: Curseur numérique

### Fichiers:
- **file_upload**: Upload de fichiers (utilise `accept: ".pdf,.csv,.xlsx"`)
- **document_repository**: Dépôt de documents multiples

### Affichage résultats:
- **markdown_viewer**: Affiche du markdown formaté (IDÉAL pour les réponses LLM)
- **text_display**: Affiche du texte brut
- **code_viewer**: Code avec coloration syntaxique
- **line_chart**, **bar_chart**, **pie_chart**, **donut_chart**: Graphiques

### Actions:
- **button**: Bouton d'action
- **chat_interface**: Interface de conversation

## CONTRAINTES DE VALIDATION:

1. **gridPosition** est OBLIGATOIRE pour chaque widget
2. **auto_bind_output: true** est OBLIGATOIRE pour les composants d'affichage de résultats
3. **sections** doit être vide `[]` - utiliser UNIQUEMENT widgets
4. **Chaque bouton déclencheur** DOIT avoir son workflow correspondant
5. **options** pour select: LISTE D'OBJETS `[{{value: "v1", label: "Label 1"}}]`

## RÈGLE FINALE:
Tu DOIS générer un YAML complet avec une interface utilisateur fonctionnelle.
Analyse la demande utilisateur et choisis les composants UI appropriés:
- Quelles entrées sont nécessaires? (texte, fichier, date, nombre, sélection...)
- Quelles sorties/résultats afficher? (markdown pour texte, charts pour données)
- Comment organiser l'interface de manière logique et ergonomique?

Réponds UNIQUEMENT avec le contenu YAML, sans balises de code, sans explications.
"""

    def __init__(self):
        self.dsl_service = get_agent_dsl_service()

    def _get_llm_config(self, provider: str) -> dict:
        """Get the LLM connector configuration for a given provider."""
        return LLM_CONFIG.get(provider, LLM_CONFIG["mistral"])

    def _get_tools_list(self) -> str:
        """Format available tools as a string list."""
        lines = []
        for tool_id, info in self.AVAILABLE_TOOLS.items():
            lines.append(f"- {tool_id}: {info['name']} - {info['description']} (catégorie: {info['category']})")
        return "\n".join(lines)

    def _get_ui_components_list(self) -> str:
        """Format available UI components as a string list."""
        return ", ".join(self.AVAILABLE_UI_COMPONENTS)

    def _get_providers_list(self) -> str:
        """Format available providers as a string list."""
        return ", ".join(self.AVAILABLE_PROVIDERS)

    def _build_system_prompt(self) -> str:
        """Build the system prompt with available components."""
        return self.GENERATION_SYSTEM_PROMPT.format(
            tools_list=self._get_tools_list(),
            ui_components_list=self._get_ui_components_list(),
            providers_list=self._get_providers_list()
        )

    async def generate_from_prompt(
        self,
        user_prompt: str,
        provider: str = "mistral",
        model: str = "mistral-large-latest",
        temperature: float = 0.3,
    ) -> GenerationResult:
        """
        Generate an agent YAML from a natural language prompt.

        Args:
            user_prompt: User's description of the desired agent
            provider: LLM provider to use for generation
            model: Specific model to use
            temperature: Temperature for generation (lower = more deterministic)

        Returns:
            GenerationResult with the generated YAML or errors
        """
        try:
            logger.info(f"Starting generation for prompt: {user_prompt[:100]}...")

            # Build the prompt
            logger.info("Building system prompt...")
            system_prompt = self._build_system_prompt()
            logger.info(f"System prompt built, length: {len(system_prompt)} chars")

            user_message = f"""Génère un agent YAML basé sur la description suivante:

{user_prompt}

Rappel: Réponds UNIQUEMENT avec le contenu YAML valide."""

            # Call LLM
            logger.info(f"Calling LLM with provider={provider}, model={model}")
            yaml_content, usage = await self._call_llm(
                system_prompt=system_prompt,
                user_message=user_message,
                provider=provider,
                model=model,
                temperature=temperature
            )

            if not yaml_content:
                logger.warning("LLM returned no content")
                return GenerationResult(
                    status=GenerationStatus.FAILED,
                    errors=["Le LLM n'a pas pu générer de réponse. Veuillez réessayer."]
                )

            logger.info(f"LLM returned {len(yaml_content)} chars")

            # Clean the YAML (remove potential code blocks)
            logger.info("Cleaning YAML content...")
            yaml_content = self._clean_yaml_content(yaml_content)
            logger.info(f"Cleaned YAML: {len(yaml_content)} chars")

            # Validate the generated YAML
            logger.info("Validating and checking components...")
            result = self._validate_and_check_components(yaml_content)
            logger.info(f"Validation complete, status: {result.status}")

            # Include usage data in the result
            result.usage = usage

            return result

        except Exception as e:
            logger.error(f"Generation error: {e}", exc_info=True)
            return GenerationResult(
                status=GenerationStatus.FAILED,
                errors=[f"Erreur lors de la génération: {str(e)}"]
            )

    async def _call_llm(
        self,
        system_prompt: str,
        user_message: str,
        provider: str,
        model: str,
        temperature: float
    ) -> Tuple[Optional[str], Optional[Dict[str, int]]]:
        """Call the LLM to generate the agent YAML.

        Returns:
            Tuple of (content, usage) where usage is a dict with prompt_tokens,
            completion_tokens, and total_tokens.
        """
        try:
            config = self._get_llm_config(provider)
            llm_url = config["url"]
            endpoint = config["endpoint"]
            full_url = f"{llm_url}{endpoint}"
            logger.info(f"Calling LLM at {full_url} with provider={provider}, model={model}")

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    full_url,
                    json={
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message}
                        ],
                        "model": model,
                        "temperature": temperature,
                        "max_tokens": 8192,
                        "stream": False
                    }
                )

                logger.info(f"LLM response status: {response.status_code}")

                if response.status_code >= 400:
                    logger.error(f"LLM error: {response.status_code} - {response.text}")
                    return None, None

                result = response.json()
                logger.info(f"LLM response keys: {result.keys() if isinstance(result, dict) else type(result)}")

                # Extract usage data from LLM response
                usage = None
                if "usage" in result and result["usage"]:
                    usage = {
                        "prompt_tokens": result["usage"].get("prompt_tokens", 0),
                        "completion_tokens": result["usage"].get("completion_tokens", 0),
                        "total_tokens": result["usage"].get("total_tokens", 0)
                    }

                # Extract content based on response format
                content = None
                if "message" in result and isinstance(result["message"], dict):
                    content = result["message"].get("content", "")
                elif "content" in result:
                    content = result["content"]
                elif "choices" in result and result["choices"]:
                    choice = result["choices"][0]
                    if "message" in choice:
                        content = choice["message"].get("content", "")
                    elif "text" in choice:
                        content = choice["text"]
                else:
                    content = str(result)

                if content:
                    logger.info(f"LLM response content length: {len(content)} chars")
                else:
                    logger.warning("LLM returned empty content")

                return content, usage

        except Exception as e:
            logger.error(f"Error calling LLM: {e}", exc_info=True)
            return None, None

    def _clean_yaml_content(self, content: str) -> str:
        """Clean YAML content by removing code blocks and extra whitespace."""
        # Remove markdown code blocks
        content = content.strip()

        # Remove ```yaml and ``` markers
        if content.startswith("```yaml"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]

        if content.endswith("```"):
            content = content[:-3]

        return content.strip()

    def _fix_common_errors(self, data: dict) -> dict:
        """Fix common LLM generation errors in the parsed YAML data."""
        try:
            # Fix tool parameter sources
            if "tools" in data and isinstance(data.get("tools"), dict) and "tools" in data["tools"]:
                for tool in data["tools"]["tools"]:
                    if isinstance(tool, dict) and "parameters" in tool:
                        for param in tool["parameters"]:
                            if not isinstance(param, dict):
                                continue

                            # Fix missing source field
                            if "source" not in param:
                                if "value" in param:
                                    # If there's a value, it's a constant
                                    param["source"] = "constant"
                                elif "input_component" in param:
                                    # If there's an input_component, it's input
                                    param["source"] = "input"
                                else:
                                    # Default to input
                                    param["source"] = "input"
                                logger.info(f"Auto-set source='{param['source']}' for parameter '{param.get('name', 'unnamed')}'")

                            # Fix invalid source values
                            # Valid values: input, constant, variable, previous_output, context
                            current_source = param.get("source", "")
                            if current_source not in ("input", "constant", "variable", "previous_output", "context"):
                                # Map common invalid values to valid ones
                                if current_source in ("static", "fixed", "default", "hardcoded", "value"):
                                    param["source"] = "constant"
                                elif current_source in ("llm", "model", "ai", "generated", "output", "result"):
                                    param["source"] = "previous_output"
                                elif current_source in ("user", "form", "ui", "component"):
                                    param["source"] = "input"
                                else:
                                    # Default fallback based on other fields
                                    if "value" in param and param["value"] is not None:
                                        param["source"] = "constant"
                                    elif "input_component" in param:
                                        param["source"] = "input"
                                    else:
                                        param["source"] = "input"
                                logger.info(f"Fixed invalid source '{current_source}' -> '{param['source']}' for parameter '{param.get('name', 'unnamed')}'")

            # Collect all buttons that should trigger workflows
            trigger_buttons = []
            chart_components = []
            markdown_output_components = []  # markdown_viewers with output_key

            # ═══════════════════════════════════════════════════════
            # ENSURE UI EXISTS WITH DASHBOARD MODE
            # ═══════════════════════════════════════════════════════
            if "ui" not in data or not isinstance(data.get("ui"), dict):
                data["ui"] = {}

            ui_data = data["ui"]

            # Always set dashboard mode
            ui_data["layout_mode"] = "dashboard"
            if not ui_data.get("dashboard_config"):
                ui_data["dashboard_config"] = {
                    "columns": 12,
                    "rowHeight": 80,
                    "gap": 12
                }
            if not ui_data.get("show_header"):
                ui_data["show_header"] = True
            if not ui_data.get("header_title") and "identity" in data:
                ui_data["header_title"] = data["identity"].get("name", "Agent")

            # ═══════════════════════════════════════════════════════
            # MIGRATE: Convert old sections format to new dashboard/widgets format
            # ═══════════════════════════════════════════════════════
            if "sections" in ui_data and ui_data["sections"] and not ui_data.get("widgets"):
                logger.info("Migrating sections format to dashboard/widgets format")
                widgets = []
                current_y = 0

                for section in ui_data["sections"]:
                    if isinstance(section, dict) and "components" in section:
                        for component in section["components"]:
                            if not isinstance(component, dict):
                                continue

                            # Calculate grid position based on component type
                            grid_pos = self._calculate_grid_position(component, current_y, len(widgets))
                            component["gridPosition"] = grid_pos

                            widgets.append(component)

                        # Move to next row after section
                        if widgets:
                            last_widget = widgets[-1]
                            if "gridPosition" in last_widget:
                                current_y = last_widget["gridPosition"]["y"] + last_widget["gridPosition"]["h"]

                ui_data["widgets"] = widgets
                ui_data["sections"] = []
                logger.info(f"Migrated {len(widgets)} components to widgets format")

            # ═══════════════════════════════════════════════════════
            # GENERATE DEFAULT UI IF WIDGETS IS EMPTY
            # ═══════════════════════════════════════════════════════
            if not ui_data.get("widgets") or len(ui_data.get("widgets", [])) == 0:
                logger.info("Widgets is empty, generating default UI based on agent config")
                ui_data["widgets"] = self._generate_default_widgets(data)
                ui_data["sections"] = []

            # Ensure sections is always an empty list in dashboard mode
            ui_data["sections"] = []

            # Process widgets (new format) or sections (old format)
            all_components = []
            if "ui" in data and isinstance(data.get("ui"), dict):
                # Collect from widgets
                if "widgets" in data["ui"] and isinstance(data["ui"]["widgets"], list):
                    all_components.extend(data["ui"]["widgets"])
                # Also collect from sections (fallback)
                if "sections" in data["ui"] and isinstance(data["ui"]["sections"], list):
                    for section in data["ui"]["sections"]:
                        if isinstance(section, dict) and "components" in section:
                            all_components.extend(section["components"])

            # Fix UI component issues
            for component in all_components:
                if not isinstance(component, dict):
                    continue

                comp_type = component.get("type", "")

                # Fix accept field (list -> string)
                if "accept" in component and isinstance(component["accept"], list):
                    component["accept"] = ",".join(str(a) for a in component["accept"])

                # Fix options (strings -> objects)
                if "options" in component and isinstance(component["options"], list):
                    fixed_options = []
                    for opt in component["options"]:
                        if isinstance(opt, str):
                            # Convert string to SelectOption object
                            value = opt.lower().replace(" ", "_").replace("/", "_").replace("(", "").replace(")", "").replace(">", "gt").replace("<", "lt")
                            fixed_options.append({
                                "value": value,
                                "label": opt
                            })
                        elif isinstance(opt, dict):
                            # Ensure value and label exist
                            if "value" not in opt:
                                opt["value"] = opt.get("label", "option").lower().replace(" ", "_")
                            if "label" not in opt:
                                opt["label"] = opt.get("value", "Option")
                            fixed_options.append(opt)
                    component["options"] = fixed_options

                # ═══════════════════════════════════════════════════════
                # FIX: Auto-enable auto_bind_output for chart components
                # ═══════════════════════════════════════════════════════
                if comp_type in ["line_chart", "bar_chart", "pie_chart", "donut_chart"]:
                    chart_components.append(component)
                    # Always enable auto_bind_output for charts
                    if not component.get("auto_bind_output"):
                        component["auto_bind_output"] = True
                        logger.info(f"Auto-enabled auto_bind_output for chart: {component.get('name', 'unnamed')}")
                    # Add default chart_config if missing
                    if not component.get("chart_config"):
                        component["chart_config"] = {
                            "show_legend": True,
                            "animate": True
                        }

                # Also enable for markdown_viewer if it looks like an output component
                if comp_type == "markdown_viewer":
                    if not component.get("auto_bind_output"):
                        component["auto_bind_output"] = True
                    # Collect markdown_viewers with output_key for structured output
                    if component.get("output_key"):
                        markdown_output_components.append(component)

                # ═══════════════════════════════════════════════════════
                # FIX: Collect and fix trigger buttons
                # ═══════════════════════════════════════════════════════
                if comp_type == "button":
                    button_action = component.get("button_action", "")
                    is_trigger = component.get("is_trigger_button", False)

                    # If button has trigger_agent action or is marked as trigger
                    if button_action == "trigger_agent" or is_trigger:
                        # Ensure both flags are set
                        component["is_trigger_button"] = True
                        component["button_action"] = "trigger_agent"
                        trigger_buttons.append(component.get("name", "unnamed_button"))
                    # If button has no action but looks like a main action button
                    elif not button_action and component.get("button_variant") == "primary":
                        # Assume it's meant to trigger the agent
                        component["is_trigger_button"] = True
                        component["button_action"] = "trigger_agent"
                        trigger_buttons.append(component.get("name", "unnamed_button"))
                        logger.info(f"Auto-configured button as trigger: {component.get('name', 'unnamed')}")

            # ═══════════════════════════════════════════════════════
            # FIX: Ensure workflows exist for trigger buttons
            # ═══════════════════════════════════════════════════════
            if trigger_buttons:
                if "workflows" not in data:
                    data["workflows"] = {"workflows": []}
                elif not isinstance(data.get("workflows"), dict):
                    data["workflows"] = {"workflows": []}
                elif "workflows" not in data["workflows"]:
                    data["workflows"]["workflows"] = []

                existing_workflows = data["workflows"]["workflows"]

                # Check which buttons have workflows
                buttons_with_workflows = set()
                for workflow in existing_workflows:
                    if not isinstance(workflow, dict):
                        continue
                    if workflow.get("trigger") == "button_click":
                        trigger_config = workflow.get("trigger_config", {})
                        if isinstance(trigger_config, dict):
                            button_name = trigger_config.get("button", "")
                            if button_name:
                                buttons_with_workflows.add(button_name)

                # Create workflows for buttons that don't have one
                for button_name in trigger_buttons:
                    if button_name not in buttons_with_workflows:
                        new_workflow = {
                            "name": f"Workflow - {button_name}",
                            "trigger": "button_click",
                            "trigger_config": {
                                "button": button_name
                            },
                            "enabled": True,
                            "steps": [
                                {
                                    "id": "main_step",
                                    "name": "Traitement principal",
                                    "type": "llm_call",
                                    "output_variable": "result"
                                }
                            ],
                            "entry_step": "main_step"
                        }
                        data["workflows"]["workflows"].append(new_workflow)
                        logger.info(f"Auto-created workflow for button: {button_name}")

            # ═══════════════════════════════════════════════════════
            # FIX: Enhance system_prompt with structured output instructions
            # Handles both charts and markdown viewers with output_key
            # ═══════════════════════════════════════════════════════
            has_structured_outputs = chart_components or markdown_output_components
            if has_structured_outputs and "business_logic" in data and isinstance(data.get("business_logic"), dict):
                system_prompt = data["business_logic"].get("system_prompt", "")
                if system_prompt and isinstance(system_prompt, str):
                    # Check if the prompt already contains JSON formatting instructions
                    has_json_instruction = any(keyword in system_prompt.lower() for keyword in [
                        "format de réponse obligatoire", "response format", "json valide"
                    ])

                    if not has_json_instruction:
                        # Build unified structured output instruction
                        structured_instruction = self._build_structured_output_instruction(
                            chart_components, markdown_output_components
                        )
                        data["business_logic"]["system_prompt"] = system_prompt + structured_instruction
                        logger.info(f"Auto-added structured output instructions for {len(chart_components)} charts and {len(markdown_output_components)} markdown viewers")

            # Fix workflow conditions
            if "workflows" in data and isinstance(data.get("workflows"), dict) and "workflows" in data["workflows"]:
                for workflow in data["workflows"]["workflows"]:
                    if not isinstance(workflow, dict) or "steps" not in workflow:
                        continue
                    for step in workflow["steps"]:
                        if not isinstance(step, dict):
                            continue
                        if "condition" in step and isinstance(step["condition"], dict):
                            cond = step["condition"]
                            # Fix left/right format to variable/value format
                            if "left" in cond and "variable" not in cond:
                                cond["variable"] = cond.pop("left")
                            if "right" in cond and "value" not in cond:
                                cond["value"] = cond.pop("right")

                            # Ensure required fields exist
                            if "variable" not in cond:
                                cond["variable"] = "unknown"
                            if "value" not in cond:
                                cond["value"] = ""
                            if "operator" not in cond:
                                cond["operator"] = "eq"

                            # Fix operator names
                            op_mapping = {
                                "equals": "eq",
                                "not_equals": "ne",
                                "greater_than": "gt",
                                "less_than": "lt",
                                "greater_than_or_equal": "gte",
                                "less_than_or_equal": "lte",
                                "is_empty": "is_empty",
                                "is_not_empty": "is_not_empty",
                                "contains": "contains",
                                "not_contains": "not_contains",
                            }
                            if cond.get("operator") in op_mapping:
                                cond["operator"] = op_mapping[cond["operator"]]

            logger.info("Successfully fixed common errors in YAML data")
            return data
        except Exception as e:
            logger.error(f"Error fixing YAML data: {e}", exc_info=True)
            # Return original data if fixing fails
            return data

    def _generate_default_widgets(self, data: dict) -> list:
        """Generate a default UI based on the agent configuration."""
        widgets = []
        current_y = 0

        # Get agent identity for context
        identity = data.get("identity", {})
        agent_name = identity.get("name", "Agent")
        agent_description = identity.get("description", "")
        agent_category = identity.get("category", "custom")

        # Check if there are tools that need file input
        tools = data.get("tools", {}).get("tools", [])
        needs_file_upload = any(
            t.get("tool_id") in ["document-extractor", "file-upload", "eml-parser"]
            for t in tools if isinstance(t, dict)
        )

        # Check business logic for hints about what inputs are needed
        business_logic = data.get("business_logic", {})
        system_prompt = business_logic.get("system_prompt", "").lower()
        user_prompt = business_logic.get("user_prompt_template", "").lower()

        # Detect what kind of inputs might be needed
        needs_text_input = any(kw in system_prompt or kw in user_prompt for kw in [
            "thématique", "sujet", "topic", "question", "requête", "message", "texte", "description"
        ])
        needs_date_range = any(kw in system_prompt or kw in user_prompt for kw in [
            "date", "période", "calendaire", "début", "fin", "depuis", "jusqu"
        ])
        needs_number_param = any(kw in system_prompt or kw in user_prompt for kw in [
            "nombre", "max", "limite", "quantité", "combien"
        ])

        # Generate input widgets
        logger.info(f"Generating default UI - file:{needs_file_upload}, text:{needs_text_input}, date:{needs_date_range}, number:{needs_number_param}")

        # Row 0: Main input (text or file)
        if needs_file_upload:
            widgets.append({
                "type": "file_upload",
                "name": "input_file",
                "label": "Fichier à analyser",
                "gridPosition": {"x": 0, "y": current_y, "w": 5, "h": 2}
            })
            btn_x = 5
        elif needs_text_input:
            widgets.append({
                "type": "textarea",
                "name": "input_text",
                "label": "Votre demande",
                "placeholder": "Décrivez ce que vous souhaitez...",
                "gridPosition": {"x": 0, "y": current_y, "w": 8, "h": 2}
            })
            btn_x = 8
        else:
            # Default: text input
            widgets.append({
                "type": "textarea",
                "name": "input_text",
                "label": "Votre demande",
                "placeholder": "Décrivez ce que vous souhaitez...",
                "gridPosition": {"x": 0, "y": current_y, "w": 8, "h": 2}
            })
            btn_x = 8

        # Add main action button
        widgets.append({
            "type": "button",
            "name": "run_btn",
            "label": "Exécuter",
            "button_action": "trigger_agent",
            "button_variant": "primary",
            "is_trigger_button": True,
            "gridPosition": {"x": btn_x, "y": current_y, "w": 2, "h": 1}
        })

        current_y += 2

        # Row 2: Additional parameters (date range, number limit)
        param_x = 0
        if needs_date_range:
            widgets.append({
                "type": "date_picker",
                "name": "date_start",
                "label": "Date de début",
                "gridPosition": {"x": param_x, "y": current_y, "w": 3, "h": 1}
            })
            param_x += 3
            widgets.append({
                "type": "date_picker",
                "name": "date_end",
                "label": "Date de fin",
                "gridPosition": {"x": param_x, "y": current_y, "w": 3, "h": 1}
            })
            param_x += 3

        if needs_number_param:
            widgets.append({
                "type": "number_input",
                "name": "max_results",
                "label": "Nombre max de résultats",
                "default_value": 10,
                "gridPosition": {"x": param_x, "y": current_y, "w": 3, "h": 1}
            })
            param_x += 3

        if needs_date_range or needs_number_param:
            current_y += 1

        # Row 3+: Output widgets
        # Check if multiple output sections are expected
        output_keywords = {
            "swot": "Analyse SWOT",
            "synthèse": "Synthèse",
            "résumé": "Résumé",
            "recommandation": "Recommandations",
            "source": "Sources",
            "conclusion": "Conclusion",
            "analyse": "Analyse",
        }

        detected_outputs = []
        for keyword, label in output_keywords.items():
            if keyword in system_prompt or keyword in agent_description.lower():
                detected_outputs.append((keyword, label))

        if len(detected_outputs) >= 2:
            # Multiple output sections - arrange in grid
            col = 0
            row_offset = 0
            for i, (key, label) in enumerate(detected_outputs[:4]):  # Max 4 output sections
                w = 6
                h = 3
                x = col * 6
                y = current_y + row_offset

                widgets.append({
                    "type": "markdown_viewer",
                    "name": f"output_{key}",
                    "label": label,
                    "auto_bind_output": True,
                    "gridPosition": {"x": x, "y": y, "w": w, "h": h}
                })

                col += 1
                if col >= 2:
                    col = 0
                    row_offset += h
        else:
            # Single output section
            widgets.append({
                "type": "markdown_viewer",
                "name": "output_result",
                "label": "Résultat",
                "auto_bind_output": True,
                "gridPosition": {"x": 0, "y": current_y, "w": 12, "h": 5}
            })

        logger.info(f"Generated {len(widgets)} default widgets")
        return widgets

    def _calculate_grid_position(self, component: dict, current_y: int, widget_index: int) -> dict:
        """Calculate grid position for a component based on its type."""
        comp_type = component.get("type", "text_input")

        # Default sizes by component type
        sizes = {
            "text_input": {"w": 4, "h": 1},
            "textarea": {"w": 6, "h": 2},
            "number_input": {"w": 3, "h": 1},
            "email_input": {"w": 4, "h": 1},
            "select": {"w": 3, "h": 1},
            "checkbox": {"w": 2, "h": 1},
            "radio_group": {"w": 4, "h": 2},
            "date_picker": {"w": 3, "h": 1},
            "slider": {"w": 4, "h": 1},
            "toggle": {"w": 2, "h": 1},
            "file_upload": {"w": 5, "h": 2},
            "image_upload": {"w": 4, "h": 2},
            "document_upload": {"w": 5, "h": 2},
            "document_repository": {"w": 6, "h": 3},
            "text_display": {"w": 6, "h": 1},
            "markdown_viewer": {"w": 8, "h": 4},
            "pdf_viewer": {"w": 6, "h": 4},
            "code_viewer": {"w": 6, "h": 3},
            "line_chart": {"w": 6, "h": 3},
            "bar_chart": {"w": 6, "h": 3},
            "pie_chart": {"w": 5, "h": 3},
            "donut_chart": {"w": 5, "h": 3},
            "button": {"w": 2, "h": 1},
            "button_group": {"w": 4, "h": 1},
            "chat_interface": {"w": 12, "h": 5},
            "card": {"w": 6, "h": 3},
            "tabs": {"w": 12, "h": 4},
            "progress_bar": {"w": 6, "h": 1},
            "data_table": {"w": 12, "h": 4},
        }

        size = sizes.get(comp_type, {"w": 4, "h": 2})

        # Use existing gridPosition if present
        if "gridPosition" in component and isinstance(component["gridPosition"], dict):
            pos = component["gridPosition"]
            return {
                "x": pos.get("x", 0),
                "y": pos.get("y", current_y),
                "w": pos.get("w", size["w"]),
                "h": pos.get("h", size["h"])
            }

        # Calculate x position based on widget index (try to fill row)
        x = 0
        y = current_y

        # Simple layout: input components in one row, outputs in next rows
        if comp_type in ["file_upload", "document_upload", "image_upload", "document_repository"]:
            x = 0
        elif comp_type == "button":
            x = 5  # Place button next to upload
        elif comp_type in ["line_chart", "bar_chart"]:
            x = 0
            y = current_y + 2 if widget_index > 2 else current_y
        elif comp_type in ["pie_chart", "donut_chart"]:
            x = 6
            y = current_y + 2 if widget_index > 2 else current_y
        elif comp_type == "markdown_viewer":
            x = 0
            y = current_y + 3 if widget_index > 3 else current_y

        return {
            "x": x,
            "y": y,
            "w": size["w"],
            "h": size["h"]
        }

    def _build_structured_output_instruction(self, chart_components: List[dict], markdown_components: List[dict]) -> str:
        """Build unified structured output instruction for the system prompt.

        This handles both charts and markdown viewers with output_key, ensuring
        the AI returns a proper JSON response with all required keys.
        """
        instruction_parts = [
            "\n\n## FORMAT DE RÉPONSE OBLIGATOIRE",
            "Tu DOIS répondre avec un objet JSON valide contenant les clés suivantes:"
        ]

        # Build example JSON structure
        example_parts = []

        # Add chart components
        for i, comp in enumerate(chart_components):
            json_key = comp.get("output_key", comp.get("name", f"chart_{i}"))
            chart_type = comp.get("type", "line_chart")
            label = comp.get("label", json_key)

            if chart_type in ["pie_chart", "donut_chart"]:
                example_parts.append(f'  "{json_key}": {{\n    "labels": ["Catégorie 1", "Catégorie 2", "Catégorie 3"],\n    "datasets": [{{"label": "{label}", "data": [30, 50, 20]}}]\n  }}')
            else:
                example_parts.append(f'  "{json_key}": {{\n    "labels": ["Jan", "Fév", "Mar", "Avr"],\n    "datasets": [{{"label": "{label}", "data": [10, 25, 40, 30]}}]\n  }}')

        # Add markdown components with output_key
        for comp in markdown_components:
            json_key = comp.get("output_key")
            if json_key:
                label = comp.get("label", json_key)
                example_parts.append(f'  "{json_key}": "## {label}\\n\\nVotre contenu markdown ici..."')

        # Build the example JSON
        example_json = "```json\n{\n" + ",\n".join(example_parts) + "\n}\n```"
        instruction_parts.append(example_json)

        # Add explanation
        if chart_components and markdown_components:
            instruction_parts.append("\n**RÈGLES:**")
            instruction_parts.append("- Les clés de graphiques doivent contenir `labels` (tableau) et `datasets` (tableau avec `label` et `data`)")
            instruction_parts.append("- Les clés de texte doivent contenir du markdown formaté (titres, listes, etc.)")
            instruction_parts.append("- Ne réponds avec RIEN d'autre que ce JSON")
        elif chart_components:
            instruction_parts.append("\nChaque graphique doit avoir `labels` (tableau) et `datasets` (tableau avec `label` et `data`).")
        elif markdown_components:
            instruction_parts.append("\nChaque valeur doit être du markdown formaté. Ne réponds avec RIEN d'autre que ce JSON.")

        return "\n".join(instruction_parts)

    def _build_chart_instruction(self, chart_names: List[str], chart_components: List[dict]) -> str:
        """Build chart formatting instructions for the system prompt.

        Note: This method is kept for backwards compatibility but
        _build_structured_output_instruction is preferred for new code.
        """
        instruction_parts = [
            "\n\n## FORMAT DE RÉPONSE POUR LES GRAPHIQUES",
            "IMPORTANT: Tu DOIS formater tes données pour les graphiques en JSON.",
            "Structure obligatoire:"
        ]

        # Build example JSON - use output_key if specified, otherwise use name
        example_json = "```json\n{"
        for i, (name, comp) in enumerate(zip(chart_names, chart_components)):
            # Use output_key if specified, otherwise fall back to name
            json_key = comp.get("output_key", name)
            chart_type = comp.get("type", "line_chart")
            if chart_type in ["pie_chart", "donut_chart"]:
                example_json += f'\n  "{json_key}": {{\n    "labels": ["Catégorie 1", "Catégorie 2", "Catégorie 3"],\n    "datasets": [{{\n      "label": "Répartition",\n      "data": [30, 50, 20]\n    }}]\n  }}'
            else:
                example_json += f'\n  "{json_key}": {{\n    "labels": ["Point 1", "Point 2", "Point 3"],\n    "datasets": [{{\n      "label": "Série de données",\n      "data": [10, 25, 40]\n    }}]\n  }}'
            if i < len(chart_names) - 1:
                example_json += ","
        example_json += "\n}\n```"

        instruction_parts.append(example_json)
        instruction_parts.append("\nTu peux ajouter du texte explicatif avant ou après le JSON.")

        return "\n".join(instruction_parts)

    def _validate_and_check_components(self, yaml_content: str) -> GenerationResult:
        """Validate the YAML and check for missing components."""
        warnings = []
        errors = []
        missing_components = []
        suggestions = []

        # Try to parse the YAML
        try:
            data = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            return GenerationResult(
                status=GenerationStatus.FAILED,
                yaml_content=yaml_content,
                errors=[f"YAML invalide: {str(e)}"]
            )

        if not isinstance(data, dict):
            return GenerationResult(
                status=GenerationStatus.FAILED,
                yaml_content=yaml_content,
                errors=["Le contenu YAML doit être un objet (dictionnaire)"]
            )

        # Fix common LLM generation errors
        data = self._fix_common_errors(data)
        # Re-serialize to YAML with fixes applied
        yaml_content = yaml.dump(data, allow_unicode=True, default_flow_style=False, sort_keys=False)

        # Check for tools
        tools_section = data.get("tools", {}).get("tools", [])
        for tool in tools_section:
            tool_id = tool.get("tool_id", "")
            if tool_id and tool_id not in self.AVAILABLE_TOOLS:
                missing_components.append(MissingComponent(
                    type="tool",
                    name=tool_id,
                    description=f"L'outil '{tool_id}' n'existe pas dans la plateforme",
                    suggestion="Contactez l'administrateur pour ajouter cet outil"
                ))

        # Check for UI components
        ui_sections = data.get("ui", {}).get("sections", [])
        for section in ui_sections:
            for component in section.get("components", []):
                comp_type = component.get("type", "")
                if comp_type and comp_type not in self.AVAILABLE_UI_COMPONENTS:
                    missing_components.append(MissingComponent(
                        type="ui_component",
                        name=comp_type,
                        description=f"Le composant UI '{comp_type}' n'existe pas",
                        suggestion="Contactez l'administrateur pour ajouter ce composant graphique"
                    ))

        # Check for LLM provider
        business_logic = data.get("business_logic", {})
        provider = business_logic.get("llm_provider", "")
        if provider and provider not in self.AVAILABLE_PROVIDERS:
            missing_components.append(MissingComponent(
                type="connector",
                name=provider,
                description=f"Le fournisseur LLM '{provider}' n'est pas disponible",
                suggestion="Utilisez un des fournisseurs disponibles: " + ", ".join(self.AVAILABLE_PROVIDERS)
            ))

        # Check for connectors
        connectors_section = data.get("connectors", {}).get("connectors", [])
        for connector in connectors_section:
            connector_provider = connector.get("provider", "")
            if connector_provider and connector_provider not in self.AVAILABLE_PROVIDERS:
                missing_components.append(MissingComponent(
                    type="connector",
                    name=connector_provider,
                    description=f"Le connecteur '{connector_provider}' n'est pas disponible",
                    suggestion="Contactez l'administrateur pour configurer ce connecteur"
                ))

        # Try to validate with the DSL service
        agent_dsl, validation = self.dsl_service.parse_yaml(yaml_content)

        if validation.errors:
            for error in validation.errors:
                errors.append(f"{error.path}: {error.message}")

        if validation.warnings:
            for warning in validation.warnings:
                warnings.append(f"{warning.path}: {warning.message}")

        # Determine status
        if errors:
            status = GenerationStatus.FAILED
        elif missing_components:
            status = GenerationStatus.MISSING_COMPONENTS
            suggestions.append(
                "Certaines fonctionnalités demandées nécessitent des composants non disponibles. "
                "Veuillez contacter l'administrateur ou modifier votre demande."
            )
        elif warnings:
            status = GenerationStatus.PARTIAL
        else:
            status = GenerationStatus.SUCCESS

        return GenerationResult(
            status=status,
            yaml_content=yaml_content,
            agent_dsl=agent_dsl,
            warnings=warnings,
            errors=errors,
            missing_components=missing_components,
            suggestions=suggestions
        )

    async def refine_agent(
        self,
        current_yaml: str,
        refinement_prompt: str,
        provider: str = "mistral",
        model: str = "mistral-large-latest",
    ) -> GenerationResult:
        """
        Refine an existing agent YAML based on user feedback.

        Args:
            current_yaml: The current agent YAML
            refinement_prompt: User's refinement request
            provider: LLM provider
            model: Model to use

        Returns:
            GenerationResult with the refined YAML
        """
        try:
            system_prompt = self._build_system_prompt()
            user_message = f"""Voici un agent YAML existant:

```yaml
{current_yaml}
```

L'utilisateur souhaite la modification suivante:
{refinement_prompt}

Génère le YAML modifié en tenant compte de cette demande.
Réponds UNIQUEMENT avec le contenu YAML complet modifié."""

            yaml_content, usage = await self._call_llm(
                system_prompt=system_prompt,
                user_message=user_message,
                provider=provider,
                model=model,
                temperature=0.3
            )

            if not yaml_content:
                return GenerationResult(
                    status=GenerationStatus.FAILED,
                    errors=["Le LLM n'a pas pu générer de réponse. Veuillez réessayer."]
                )

            yaml_content = self._clean_yaml_content(yaml_content)
            result = self._validate_and_check_components(yaml_content)

            # Include usage data in the result
            result.usage = usage

            return result

        except Exception as e:
            return GenerationResult(
                status=GenerationStatus.FAILED,
                errors=[f"Erreur lors du raffinement: {str(e)}"]
            )

    def get_available_capabilities(self) -> Dict[str, Any]:
        """Return a summary of available capabilities in the platform."""
        return {
            "tools": self.AVAILABLE_TOOLS,
            "ui_components": self.AVAILABLE_UI_COMPONENTS,
            "llm_providers": self.AVAILABLE_PROVIDERS,
            "categories": ["custom", "document_analysis", "data_processing", "conversation",
                          "automation", "monitoring", "integration", "analytics"],
            "triggers": [e.value for e in TriggerType],
            "workflow_steps": [e.value for e in WorkflowStepType]
        }


# Singleton instance
_service: Optional[AgentGeneratorService] = None


def get_agent_generator_service() -> AgentGeneratorService:
    """Get the agent generator service singleton."""
    global _service
    if _service is None:
        _service = AgentGeneratorService()
    return _service
