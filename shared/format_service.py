"""
Service centralisé de formatage et d'embellissement des réponses des agents.

Ce module fournit des fonctions et constantes pour formater de manière cohérente
et élégante les réponses de tous les agents de la plateforme.
"""

import re
from typing import Dict, Any, Optional, List
from enum import Enum


class IconCategory(Enum):
    """Catégories d'icônes disponibles pour le formatage."""
    # Status et validations
    SUCCESS = "✅"
    ERROR = "❌"
    WARNING = "⚠️"
    INFO = "ℹ️"
    BLOCKED = "🚫"

    # Documents et contenus
    DOCUMENT = "📄"
    CONTRACT = "📋"
    FOLDER = "📁"
    ATTACHMENT = "📎"
    PDF = "📕"

    # Business et professionnel
    BUSINESS = "💼"
    MONEY = "💰"
    CHART = "📊"
    CALENDAR = "📅"
    CLOCK = "🕐"

    # Actions et processus
    SEARCH = "🔍"
    ANALYSIS = "🔬"
    WRITING = "✍️"
    SETTINGS = "⚙️"
    ROCKET = "🚀"

    # Personnes et communication
    PEOPLE = "👥"
    USER = "👤"
    PHONE = "📞"
    EMAIL = "📧"

    # Résultats et évaluations
    STAR = "⭐"
    TROPHY = "🏆"
    THUMBS_UP = "👍"
    THUMBS_DOWN = "👎"

    # Sécurité et juridique
    LOCK = "🔒"
    SHIELD = "🛡️"
    BALANCE = "⚖️"
    ALERT = "🚨"

    # Technologie
    COMPUTER = "💻"
    GLOBE = "🌐"
    DATABASE = "🗄️"
    CODE = "💾"


class FormattingService:
    """Service de formatage centralisé pour tous les agents."""

    @staticmethod
    def clean_ai_artifacts(text: str) -> str:
        """
        Nettoie les artefacts générés par l'IA (balises XML, code blocks indésirables, etc.).

        Args:
            text: Texte brut de l'IA

        Returns:
            Texte nettoyé sans artefacts
        """
        if not text:
            return ""

        # Supprimer les balises thinking et autres balises XML
        text = re.sub(r'<thinking>.*?</thinking>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<thought>.*?</thought>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<reasoning>.*?</reasoning>', '', text, flags=re.DOTALL | re.IGNORECASE)

        # Supprimer les balises de section vides ou mal formées
        text = re.sub(r'\[.*?\]\s*:\s*$', '', text, flags=re.MULTILINE)

        # Nettoyer les headers markdown mal formés (### ou #### seuls)
        text = re.sub(r'^#{1,6}\s*$', '', text, flags=re.MULTILINE)

        # Supprimer les lignes vides multiples (plus de 2)
        text = re.sub(r'\n{3,}', '\n\n', text)

        # Nettoyer les espaces en fin de ligne
        text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)

        # Supprimer les lignes contenant uniquement des tirets ou underscores
        text = re.sub(r'^[-_]{3,}$', '', text, flags=re.MULTILINE)

        return text.strip()

    @staticmethod
    def format_section(
        title: str,
        content: str,
        icon: Optional[str] = None,
        level: int = 2,
        add_spacing: bool = True
    ) -> str:
        """
        Formate une section avec titre, icône optionnelle et contenu.

        Args:
            title: Titre de la section
            content: Contenu de la section
            icon: Icône à afficher (emoji ou IconCategory)
            level: Niveau de header (1-6), défaut 2 pour ##
            add_spacing: Ajouter un espacement avant la section

        Returns:
            Section formatée en markdown
        """
        if not content or content.strip() in ["", "N/A", "Non spécifié", "Aucun"]:
            return ""

        # Construire le header
        header_prefix = "#" * max(1, min(6, level))
        icon_str = f"{icon} " if icon else ""

        # Nettoyer le contenu
        content_clean = content.strip()

        # Construire la section
        spacing = "\n" if add_spacing else ""
        section = f"{spacing}{header_prefix} {icon_str}{title}\n\n{content_clean}\n"

        return section

    @staticmethod
    def format_key_value(
        key: str,
        value: str,
        icon: Optional[str] = None,
        bold_key: bool = True
    ) -> str:
        """
        Formate une paire clé-valeur.

        Args:
            key: Clé (label)
            value: Valeur
            icon: Icône optionnelle
            bold_key: Mettre la clé en gras

        Returns:
            Paire formatée
        """
        if not value or value.strip() in ["", "N/A", "Non spécifié"]:
            return ""

        icon_str = f"{icon} " if icon else ""
        key_formatted = f"**{key}**" if bold_key else key

        return f"{icon_str}{key_formatted}: {value.strip()}"

    @staticmethod
    def format_list(
        items: List[str],
        ordered: bool = False,
        icon: Optional[str] = None
    ) -> str:
        """
        Formate une liste d'éléments.

        Args:
            items: Liste d'éléments
            ordered: Liste ordonnée (numérotée) ou non
            icon: Icône à ajouter devant chaque élément

        Returns:
            Liste formatée en markdown
        """
        if not items:
            return ""

        formatted_items = []
        for i, item in enumerate(items, 1):
            if not item or not item.strip():
                continue

            icon_str = f"{icon} " if icon else ""

            if ordered:
                formatted_items.append(f"{i}. {icon_str}{item.strip()}")
            else:
                formatted_items.append(f"- {icon_str}{item.strip()}")

        return "\n".join(formatted_items)

    @staticmethod
    def format_table(headers: List[str], rows: List[List[str]]) -> str:
        """
        Formate un tableau markdown.

        Args:
            headers: En-têtes du tableau
            rows: Lignes du tableau

        Returns:
            Tableau formaté en markdown
        """
        if not headers or not rows:
            return ""

        # Construire le header
        header_row = "| " + " | ".join(headers) + " |"
        separator = "| " + " | ".join(["---"] * len(headers)) + " |"

        # Construire les lignes
        data_rows = []
        for row in rows:
            # Compléter avec des cellules vides si nécessaire
            row_padded = row + [""] * (len(headers) - len(row))
            data_rows.append("| " + " | ".join(row_padded[:len(headers)]) + " |")

        return "\n".join([header_row, separator] + data_rows)

    @staticmethod
    def format_alert(
        message: str,
        alert_type: str = "info",
        title: Optional[str] = None
    ) -> str:
        """
        Formate un message d'alerte/notification.

        Args:
            message: Message de l'alerte
            alert_type: Type d'alerte (info, warning, error, success)
            title: Titre optionnel de l'alerte

        Returns:
            Alerte formatée
        """
        icons = {
            "info": IconCategory.INFO.value,
            "warning": IconCategory.WARNING.value,
            "error": IconCategory.ERROR.value,
            "success": IconCategory.SUCCESS.value,
            "blocked": IconCategory.BLOCKED.value
        }

        icon = icons.get(alert_type.lower(), IconCategory.INFO.value)

        if title:
            return f"{icon} **{title}**\n\n{message.strip()}"
        else:
            return f"{icon} {message.strip()}"

    @staticmethod
    def format_contract_analysis(synthesis_data: Dict[str, Any]) -> str:
        """
        Formate spécifiquement une analyse de contrat.

        Args:
            synthesis_data: Données de synthèse du contrat

        Returns:
            Analyse formatée avec icônes et sections
        """
        sections = []

        # En-tête
        sections.append(FormattingService.format_section(
            title="Analyse de Contrat",
            content="Synthèse juridique détaillée",
            icon=IconCategory.CONTRACT.value,
            level=1,
            add_spacing=False
        ))

        # Parties contractantes
        if parties := synthesis_data.get("parties"):
            sections.append(FormattingService.format_section(
                title="Parties Contractantes",
                content=parties,
                icon=IconCategory.PEOPLE.value
            ))

        # Objet du contrat
        if contract_object := synthesis_data.get("contract_object"):
            sections.append(FormattingService.format_section(
                title="Objet du Contrat",
                content=contract_object,
                icon=IconCategory.DOCUMENT.value
            ))

        # Durée
        if duration := synthesis_data.get("duration"):
            sections.append(FormattingService.format_section(
                title="Durée et Échéances",
                content=duration,
                icon=IconCategory.CALENDAR.value
            ))

        # Obligations
        if obligations := synthesis_data.get("obligations"):
            sections.append(FormattingService.format_section(
                title="Obligations des Parties",
                content=obligations,
                icon=IconCategory.BALANCE.value
            ))

        # Clauses de résiliation
        if termination := synthesis_data.get("termination_clauses"):
            sections.append(FormattingService.format_section(
                title="Clauses de Résiliation",
                content=termination,
                icon=IconCategory.ALERT.value
            ))

        # Responsabilités
        if liability := synthesis_data.get("liability_clauses"):
            sections.append(FormattingService.format_section(
                title="Clauses de Responsabilité",
                content=liability,
                icon=IconCategory.SHIELD.value
            ))

        # Conditions de paiement
        if payment := synthesis_data.get("payment_terms"):
            sections.append(FormattingService.format_section(
                title="Conditions de Paiement",
                content=payment,
                icon=IconCategory.MONEY.value
            ))

        # Points forts
        if strengths := synthesis_data.get("strengths"):
            sections.append(FormattingService.format_section(
                title="Points Forts",
                content=strengths,
                icon=IconCategory.THUMBS_UP.value
            ))

        # Risques
        if risks := synthesis_data.get("risks"):
            sections.append(FormattingService.format_section(
                title="Risques Identifiés",
                content=risks,
                icon=IconCategory.WARNING.value
            ))

        # Recommandations
        if recommendations := synthesis_data.get("recommendations"):
            sections.append(FormattingService.format_section(
                title="Recommandations",
                content=recommendations,
                icon=IconCategory.STAR.value
            ))

        return "\n".join(filter(None, sections))

    @staticmethod
    def format_call_for_tender(tender_data: Dict[str, Any]) -> str:
        """
        Formate spécifiquement une analyse d'appel d'offre.

        Args:
            tender_data: Données d'analyse de l'appel d'offre

        Returns:
            Analyse formatée avec icônes et sections
        """
        sections = []

        # En-tête
        sections.append(FormattingService.format_section(
            title="Analyse d'Appel d'Offre",
            content="Synthèse détaillée de l'opportunité",
            icon=IconCategory.DOCUMENT.value,
            level=1,
            add_spacing=False
        ))

        # Date d'échéance
        if deadline := tender_data.get("deadline"):
            sections.append(FormattingService.format_alert(
                message=f"Date limite : {deadline}",
                alert_type="warning",
                title="Échéance"
            ))

        # Organisme
        if organization := tender_data.get("organization"):
            sections.append(FormattingService.format_section(
                title="Organisme",
                content=organization,
                icon=IconCategory.BUSINESS.value
            ))

        # Objet
        if subject := tender_data.get("subject"):
            sections.append(FormattingService.format_section(
                title="Objet de l'Appel d'Offre",
                content=subject,
                icon=IconCategory.SEARCH.value
            ))

        # Budget
        if budget := tender_data.get("budget"):
            sections.append(FormattingService.format_section(
                title="Budget Estimé",
                content=budget,
                icon=IconCategory.MONEY.value
            ))

        # Critères de sélection
        if criteria := tender_data.get("selection_criteria"):
            sections.append(FormattingService.format_section(
                title="Critères de Sélection",
                content=criteria,
                icon=IconCategory.STAR.value
            ))

        # Modalités de réponse
        if response_method := tender_data.get("response_method"):
            sections.append(FormattingService.format_section(
                title="Modalités de Réponse",
                content=response_method,
                icon=IconCategory.WRITING.value
            ))

        # Documents requis
        if documents := tender_data.get("required_documents"):
            sections.append(FormattingService.format_section(
                title="Documents Requis",
                content=documents,
                icon=IconCategory.ATTACHMENT.value
            ))

        # Opportunités
        if opportunities := tender_data.get("opportunities"):
            sections.append(FormattingService.format_section(
                title="Opportunités",
                content=opportunities,
                icon=IconCategory.THUMBS_UP.value
            ))

        # Contraintes
        if constraints := tender_data.get("constraints"):
            sections.append(FormattingService.format_section(
                title="Contraintes",
                content=constraints,
                icon=IconCategory.WARNING.value
            ))

        # Recommandations
        if recommendations := tender_data.get("recommendations"):
            sections.append(FormattingService.format_section(
                title="Recommandations",
                content=recommendations,
                icon=IconCategory.ROCKET.value
            ))

        return "\n".join(filter(None, sections))

    @staticmethod
    def format_tech_monitoring(monitoring_data: Dict[str, Any]) -> str:
        """
        Formate spécifiquement une veille technologique.

        Args:
            monitoring_data: Données de veille

        Returns:
            Veille formatée avec icônes et sections
        """
        sections = []

        # En-tête
        sections.append(FormattingService.format_section(
            title="Veille Technologique et Marché",
            content="Analyse des tendances et opportunités",
            icon=IconCategory.GLOBE.value,
            level=1,
            add_spacing=False
        ))

        # Résumé
        if summary := monitoring_data.get("summary"):
            sections.append(FormattingService.format_section(
                title="Résumé Exécutif",
                content=summary,
                icon=IconCategory.INFO.value
            ))

        # Tendances identifiées
        if trends := monitoring_data.get("trends"):
            sections.append(FormattingService.format_section(
                title="Tendances Identifiées",
                content=trends,
                icon=IconCategory.CHART.value
            ))

        # Technologies émergentes
        if technologies := monitoring_data.get("emerging_technologies"):
            sections.append(FormattingService.format_section(
                title="Technologies Émergentes",
                content=technologies,
                icon=IconCategory.ROCKET.value
            ))

        # Opportunités de marché
        if opportunities := monitoring_data.get("market_opportunities"):
            sections.append(FormattingService.format_section(
                title="Opportunités de Marché",
                content=opportunities,
                icon=IconCategory.TROPHY.value
            ))

        # Risques et menaces
        if risks := monitoring_data.get("risks"):
            sections.append(FormattingService.format_section(
                title="Risques et Menaces",
                content=risks,
                icon=IconCategory.WARNING.value
            ))

        # Recommandations stratégiques
        if recommendations := monitoring_data.get("recommendations"):
            sections.append(FormattingService.format_section(
                title="Recommandations Stratégiques",
                content=recommendations,
                icon=IconCategory.STAR.value
            ))

        # Sources
        if sources := monitoring_data.get("sources"):
            sources_formatted = FormattingService.format_section(
                title="Sources",
                content=sources,
                icon=IconCategory.DATABASE.value
            )
            sections.append(sources_formatted)

        return "\n".join(filter(None, sections))

    @staticmethod
    def enhance_markdown(text: str) -> str:
        """
        Améliore un texte markdown existant en nettoyant les artefacts
        et en préservant le formatage.

        Cette fonction est l'opposé de _clean_markdown() - elle AMÉLIORE
        au lieu de supprimer.

        Args:
            text: Texte markdown à améliorer

        Returns:
            Texte markdown amélioré
        """
        if not text:
            return ""

        # Nettoyer les artefacts d'IA
        text = FormattingService.clean_ai_artifacts(text)

        # Normaliser les headers markdown (éviter ##  ## ou ### ### )
        text = re.sub(r'^(#{1,6})\s+\1\s*$', r'\1 ', text, flags=re.MULTILINE)

        # Corriger les listes mal formées
        text = re.sub(r'^\s*[-*•]\s+$', '', text, flags=re.MULTILINE)

        # Nettoyer les espaces multiples (mais garder le formatage)
        text = re.sub(r'  +', ' ', text)

        # Normaliser les sauts de ligne (max 2 consécutifs)
        text = re.sub(r'\n{3,}', '\n\n', text)

        return text.strip()


# Aliases pour compatibilité et facilité d'utilisation
format_section = FormattingService.format_section
format_key_value = FormattingService.format_key_value
format_list = FormattingService.format_list
format_table = FormattingService.format_table
format_alert = FormattingService.format_alert
clean_ai_artifacts = FormattingService.clean_ai_artifacts
enhance_markdown = FormattingService.enhance_markdown
format_contract_analysis = FormattingService.format_contract_analysis
format_call_for_tender = FormattingService.format_call_for_tender
format_tech_monitoring = FormattingService.format_tech_monitoring
