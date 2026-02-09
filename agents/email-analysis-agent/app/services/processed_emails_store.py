"""
Service pour stocker les emails déjà traités
"""
import json
import os
from typing import Set
import logging
from datetime import datetime

from app.config import settings


logger = logging.getLogger(__name__)


class ProcessedEmailsStore:
    """
    Stocke les UIDs des emails déjà traités pour éviter les doublons.
    Utilise un fichier JSON pour la persistance.
    """

    def __init__(self, filepath: str = None):
        self.filepath = filepath or settings.processed_emails_file
        self._processed_uids: Set[str] = set()
        self._load()

    def _load(self):
        """Charge les emails traités depuis le fichier"""
        try:
            if os.path.exists(self.filepath):
                with open(self.filepath, 'r') as f:
                    data = json.load(f)
                    self._processed_uids = set(data.get("processed_uids", []))
                    logger.info(f"Chargé {len(self._processed_uids)} emails traités depuis {self.filepath}")
            else:
                # Créer le répertoire si nécessaire
                os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
                self._save()
                logger.info(f"Créé nouveau fichier de stockage: {self.filepath}")
        except Exception as e:
            logger.error(f"Erreur lors du chargement des emails traités: {e}")
            self._processed_uids = set()

    def _save(self):
        """Sauvegarde les emails traités dans le fichier"""
        try:
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            with open(self.filepath, 'w') as f:
                json.dump({
                    "processed_uids": list(self._processed_uids),
                    "last_updated": datetime.utcnow().isoformat()
                }, f, indent=2)
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde des emails traités: {e}")

    def is_processed(self, uid: str) -> bool:
        """Vérifie si un email a déjà été traité"""
        return uid in self._processed_uids

    def mark_as_processed(self, uid: str):
        """Marque un email comme traité"""
        self._processed_uids.add(uid)
        self._save()

    def get_processed_count(self) -> int:
        """Retourne le nombre d'emails traités"""
        return len(self._processed_uids)

    def clear(self):
        """Efface tous les emails traités (pour les tests)"""
        self._processed_uids.clear()
        self._save()
