"""
Tests pour le connecteur Mistral AI
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import os

from app.main import app
from app.models.mistral_models import ChatMessage, MessageRole


# Créer un client de test
client = TestClient(app)


class TestHealthEndpoint:
    """Tests pour l'endpoint de santé"""

    def test_health_check_without_api_key(self):
        """Test du health check sans clé API configurée"""
        with patch.dict(os.environ, {}, clear=True):
            response = client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["service"] == "mistral-connector"
            assert data["mistral_configured"] is False

    def test_health_check_with_api_key(self):
        """Test du health check avec clé API configurée"""
        with patch.dict(os.environ, {"MISTRAL_API_KEY": "test-key"}):
            response = client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["service"] == "mistral-connector"
            # Note: peut être unhealthy si la clé est invalide


class TestRootEndpoint:
    """Tests pour l'endpoint racine"""

    def test_root_endpoint(self):
        """Test de l'endpoint racine"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
        assert "documentation" in data
        assert "endpoints" in data


class TestChatEndpoint:
    """Tests pour l'endpoint de chat"""

    @patch('app.services.mistral_service.MistralClient')
    def test_chat_completion_success(self, mock_client_class):
        """Test d'une complétion de chat réussie"""
        # Mock du client Mistral
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        # Mock de la réponse
        mock_choice = MagicMock()
        mock_choice.message.role = "assistant"
        mock_choice.message.content = "Bonjour ! Comment puis-je vous aider ?"
        mock_choice.finish_reason = "stop"

        mock_usage = MagicMock()
        mock_usage.prompt_tokens = 10
        mock_usage.completion_tokens = 15
        mock_usage.total_tokens = 25

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_response.usage = mock_usage

        mock_client.chat.return_value = mock_response

        # Tester l'endpoint
        with patch.dict(os.environ, {"MISTRAL_API_KEY": "test-key"}):
            response = client.post(
                "/api/v1/mistral/chat",
                json={
                    "messages": [
                        {"role": "user", "content": "Bonjour"}
                    ]
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message"]["role"] == "assistant"
        assert "usage" in data

    def test_chat_completion_without_messages(self):
        """Test avec des messages manquants"""
        response = client.post(
            "/api/v1/mistral/chat",
            json={}
        )
        assert response.status_code == 422  # Validation error


class TestEmbeddingsEndpoint:
    """Tests pour l'endpoint d'embeddings"""

    @patch('app.services.mistral_service.MistralClient')
    def test_embeddings_success(self, mock_client_class):
        """Test de génération d'embeddings réussie"""
        # Mock du client
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        # Mock de la réponse
        mock_data1 = MagicMock()
        mock_data1.embedding = [0.1, 0.2, 0.3]

        mock_data2 = MagicMock()
        mock_data2.embedding = [0.4, 0.5, 0.6]

        mock_usage = MagicMock()
        mock_usage.total_tokens = 50

        mock_response = MagicMock()
        mock_response.data = [mock_data1, mock_data2]
        mock_response.usage = mock_usage

        mock_client.embeddings.return_value = mock_response

        # Tester l'endpoint
        with patch.dict(os.environ, {"MISTRAL_API_KEY": "test-key"}):
            response = client.post(
                "/api/v1/mistral/embeddings",
                json={
                    "input": ["Texte 1", "Texte 2"]
                }
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["embeddings"]) == 2
        assert "usage" in data

    def test_embeddings_without_input(self):
        """Test sans input"""
        response = client.post(
            "/api/v1/mistral/embeddings",
            json={}
        )
        assert response.status_code == 422  # Validation error


class TestModelsEndpoint:
    """Tests pour l'endpoint de liste des modèles"""

    @patch('app.services.mistral_service.MistralClient')
    def test_list_models_success(self, mock_client_class):
        """Test de récupération des modèles"""
        # Mock du client
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        # Mock de la réponse
        mock_model1 = MagicMock()
        mock_model1.id = "mistral-small-latest"
        mock_model1.object = "model"
        mock_model1.created = 1234567890
        mock_model1.owned_by = "mistralai"

        mock_model2 = MagicMock()
        mock_model2.id = "mistral-medium-latest"
        mock_model2.object = "model"
        mock_model2.created = 1234567891
        mock_model2.owned_by = "mistralai"

        mock_response = MagicMock()
        mock_response.data = [mock_model1, mock_model2]

        mock_client.list_models.return_value = mock_response

        # Tester l'endpoint
        with patch.dict(os.environ, {"MISTRAL_API_KEY": "test-key"}):
            response = client.get("/api/v1/mistral/models")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["models"]) == 2


class TestCustomAPIKey:
    """Tests pour l'utilisation d'une clé API personnalisée"""

    @patch('app.services.mistral_service.MistralClient')
    def test_chat_with_custom_api_key(self, mock_client_class):
        """Test d'utilisation d'une clé API via header"""
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        # Mock de la réponse
        mock_choice = MagicMock()
        mock_choice.message.role = "assistant"
        mock_choice.message.content = "Réponse"
        mock_choice.finish_reason = "stop"

        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_response.usage = None

        mock_client.chat.return_value = mock_response

        # Tester avec une clé personnalisée
        response = client.post(
            "/api/v1/mistral/chat",
            json={
                "messages": [
                    {"role": "user", "content": "Test"}
                ]
            },
            headers={"X-API-Key": "custom-key"}
        )

        # Vérifier que le client a été créé avec la clé personnalisée
        mock_client_class.assert_called_with(api_key="custom-key")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
