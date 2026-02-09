"""
Service principal d'analyse des emails
"""
import httpx
from typing import List, Dict, Any, Optional
import logging
import json
import re
from datetime import datetime

from app.config import settings
from app.models.agent_models import (
    Task,
    EmailAnalysisResult,
    ProcessingStatus
)
from app.services.processed_emails_store import ProcessedEmailsStore


logger = logging.getLogger(__name__)


# Prompt système pour l'analyse des emails
SYSTEM_PROMPT = """Tu es un assistant spécialisé dans l'analyse d'emails professionnels.
Ta tâche est d'identifier les actions à réaliser mentionnées dans les emails.

Pour chaque email, tu dois:
1. Identifier toutes les tâches/actions à effectuer
2. Pour chaque tâche, extraire:
   - Un titre court et clair (max 80 caractères)
   - Une description détaillée
   - La date limite si mentionnée (format ISO 8601: YYYY-MM-DDTHH:MM:SSZ)
   - La priorité (haute, moyenne, basse) basée sur l'urgence exprimée

IMPORTANT:
- Si plusieurs tâches sont mentionnées dans un email, liste-les toutes séparément
- Si aucune tâche n'est identifiable, retourne une liste vide
- Les dates doivent être au format ISO 8601
- Sois précis et concis dans les titres

Tu dois répondre UNIQUEMENT avec un JSON valide au format suivant:
{
    "tasks": [
        {
            "title": "Titre de la tâche",
            "description": "Description détaillée de ce qu'il faut faire",
            "due_date": "2024-01-20T18:00:00Z",
            "priority": "haute"
        }
    ]
}

Si aucune tâche n'est trouvée:
{
    "tasks": []
}
"""


class EmailAnalyzerService:
    """Service pour analyser les emails et créer des tâches WeKan"""

    def __init__(self):
        self.ollama_url = settings.ollama_url
        self.wekan_url = settings.wekan_url
        self.imap_url = settings.imap_url
        self.processed_store = ProcessedEmailsStore()

        # Statistiques
        self.stats = {
            "emails_processed": 0,
            "tasks_created": 0,
            "errors_count": 0,
            "last_check": None
        }

        logger.info("EmailAnalyzerService initialisé")

    async def check_services_health(self) -> Dict[str, bool]:
        """Vérifie l'état des services dépendants"""
        services = {}

        async with httpx.AsyncClient(timeout=10) as client:
            # Vérifier Ollama
            try:
                response = await client.get(f"{self.ollama_url}/health")
                services["ollama"] = response.status_code == 200
            except Exception:
                services["ollama"] = False

            # Vérifier WeKan
            try:
                response = await client.get(f"{self.wekan_url}/health")
                services["wekan"] = response.status_code == 200
            except Exception:
                services["wekan"] = False

            # Vérifier IMAP
            try:
                response = await client.get(f"{self.imap_url}/health")
                services["imap"] = response.status_code == 200
            except Exception:
                services["imap"] = False

        return services

    async def fetch_unread_emails(self) -> List[Dict[str, Any]]:
        """Récupère les emails non lus via le service IMAP"""
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    f"{self.imap_url}/api/v1/imap/fetch",
                    json={
                        "folder": "INBOX",
                        "unread_only": True,
                        "limit": 50,
                        "include_body": True,
                        "include_attachments": False,
                        "mark_as_read": False
                    }
                )
                response.raise_for_status()
                data = response.json()

                if data.get("success"):
                    emails = data.get("emails", [])
                    logger.info(f"Récupéré {len(emails)} emails non lus")
                    return emails
                else:
                    logger.error(f"Erreur IMAP: {data.get('error')}")
                    return []

        except Exception as e:
            logger.error(f"Erreur lors de la récupération des emails: {e}")
            return []

    async def analyze_email_with_llm(self, email: Dict[str, Any]) -> List[Task]:
        """Analyse un email avec le LLM pour extraire les tâches"""
        try:
            # Construire le contenu de l'email pour l'analyse
            email_content = f"""
Email de: {email.get('sender', 'Inconnu')} ({email.get('sender_name', '')})
Objet: {email.get('subject', 'Sans objet')}
Date: {email.get('date', 'Non spécifiée')}

Contenu:
{email.get('body_text', email.get('body_html', 'Contenu non disponible'))}
"""

            # Appeler Ollama pour l'analyse
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/v1/ollama/chat",
                    json={
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": f"Analyse cet email et identifie les tâches à réaliser:\n\n{email_content}"}
                        ],
                        "model": settings.llm_model,
                        "temperature": settings.llm_temperature,
                        "max_tokens": settings.llm_max_tokens
                    }
                )
                response.raise_for_status()
                data = response.json()

                if not data.get("success"):
                    logger.error(f"Erreur LLM: {data.get('error')}")
                    return []

                # Extraire la réponse
                llm_response = data.get("message", {}).get("content", "")
                logger.debug(f"Réponse LLM: {llm_response}")

                # Parser le JSON de la réponse
                tasks = self._parse_llm_response(
                    llm_response,
                    email.get("uid", ""),
                    email.get("subject", ""),
                    email.get("sender", "")
                )

                return tasks

        except Exception as e:
            logger.error(f"Erreur lors de l'analyse LLM: {e}")
            return []

    def _parse_llm_response(
        self,
        response: str,
        email_uid: str,
        email_subject: str,
        email_sender: str
    ) -> List[Task]:
        """Parse la réponse JSON du LLM"""
        tasks = []

        try:
            # Essayer de trouver le JSON dans la réponse
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                json_str = json_match.group()
                data = json.loads(json_str)

                for task_data in data.get("tasks", []):
                    task = Task(
                        title=task_data.get("title", "Tâche sans titre")[:100],
                        description=task_data.get("description", ""),
                        due_date=task_data.get("due_date"),
                        priority=task_data.get("priority", "moyenne"),
                        email_uid=email_uid,
                        email_subject=email_subject,
                        email_sender=email_sender
                    )
                    tasks.append(task)

                logger.info(f"Extrait {len(tasks)} tâches de l'email {email_uid}")

        except json.JSONDecodeError as e:
            logger.warning(f"Impossible de parser la réponse LLM: {e}")
        except Exception as e:
            logger.error(f"Erreur lors du parsing: {e}")

        return tasks

    async def create_wekan_card(self, task: Task) -> Optional[str]:
        """Crée une carte WeKan pour une tâche"""
        try:
            if not settings.wekan_board_id or not settings.wekan_todo_list_id:
                logger.warning("WeKan board_id ou todo_list_id non configuré")
                return None

            # Construire la description avec les infos de l'email source
            description = f"""## Tâche extraite d'un email

**Expéditeur:** {task.email_sender}
**Objet:** {task.email_subject}
**UID Email:** {task.email_uid}

---

{task.description}

---
*Créé automatiquement par l'agent d'analyse d'emails*
"""

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.wekan_url}/api/v1/wekan/cards",
                    json={
                        "board_id": settings.wekan_board_id,
                        "list_id": settings.wekan_todo_list_id,
                        "title": f"[{task.priority.upper() if task.priority else 'NORMAL'}] {task.title}",
                        "description": description,
                        "due_date": task.due_date
                    }
                )
                response.raise_for_status()
                data = response.json()

                if data.get("success"):
                    card_id = data.get("card_id")
                    logger.info(f"Carte WeKan créée: {card_id}")
                    return card_id
                else:
                    logger.error(f"Erreur création carte: {data.get('error')}")
                    return None

        except Exception as e:
            logger.error(f"Erreur lors de la création de la carte WeKan: {e}")
            return None

    async def mark_email_as_read(self, uid: str, folder: str = "INBOX"):
        """Marque un email comme lu"""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{self.imap_url}/api/v1/imap/mark-read",
                    json={
                        "uids": [uid],
                        "folder": folder
                    }
                )
                response.raise_for_status()
                logger.info(f"Email {uid} marqué comme lu")

        except Exception as e:
            logger.warning(f"Impossible de marquer l'email {uid} comme lu: {e}")

    async def process_single_email(self, email: Dict[str, Any]) -> EmailAnalysisResult:
        """Traite un seul email: analyse + création de cartes"""
        email_uid = email.get("uid", "")
        email_subject = email.get("subject", "")
        email_sender = email.get("sender", "")

        result = EmailAnalysisResult(
            email_uid=email_uid,
            email_subject=email_subject,
            email_sender=email_sender,
            processed_at=datetime.utcnow().isoformat()
        )

        try:
            # Analyser l'email avec le LLM
            tasks = await self.analyze_email_with_llm(email)
            result.tasks = tasks

            # Créer les cartes WeKan pour chaque tâche
            for task in tasks:
                card_id = await self.create_wekan_card(task)
                if card_id:
                    result.cards_created.append(card_id)
                    self.stats["tasks_created"] += 1

            # Marquer l'email comme traité
            self.processed_store.mark_as_processed(email_uid)

            # Marquer comme lu dans la boîte mail
            await self.mark_email_as_read(email_uid)

            result.success = True
            self.stats["emails_processed"] += 1

            logger.info(f"Email {email_uid} traité: {len(tasks)} tâches, {len(result.cards_created)} cartes créées")

        except Exception as e:
            logger.error(f"Erreur lors du traitement de l'email {email_uid}: {e}")
            result.success = False
            result.error = str(e)
            self.stats["errors_count"] += 1

        return result

    async def process_emails(self) -> List[EmailAnalysisResult]:
        """Traite tous les emails non lus et non traités"""
        self.stats["last_check"] = datetime.utcnow().isoformat()

        # Récupérer les emails non lus
        emails = await self.fetch_unread_emails()

        if not emails:
            logger.info("Aucun nouvel email à traiter")
            return []

        results = []

        for email in emails:
            email_uid = email.get("uid", "")

            # Vérifier si déjà traité
            if self.processed_store.is_processed(email_uid):
                logger.debug(f"Email {email_uid} déjà traité, ignoré")
                continue

            # Traiter l'email
            result = await self.process_single_email(email)
            results.append(result)

        return results

    def get_processing_status(self) -> ProcessingStatus:
        """Retourne le statut du traitement"""
        return ProcessingStatus(
            is_running=settings.polling_enabled,
            last_check=self.stats["last_check"],
            emails_processed=self.stats["emails_processed"],
            tasks_created=self.stats["tasks_created"],
            errors_count=self.stats["errors_count"],
            next_check=None
        )
