"""
Tests pour le connecteur OpenAI
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test de l'endpoint racine"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "OpenAI Connector"
    assert data["status"] == "operational"
    assert "endpoints" in data


def test_health_endpoint():
    """Test de l'endpoint de santé"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["service"] == "openai-connector"
    assert "openai_configured" in data


def test_openai_health_endpoint():
    """Test de l'endpoint de santé OpenAI"""
    response = client.get("/api/v1/openai/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["service"] == "openai-connector"
    assert "openai_configured" in data


# Note: Les tests suivants nécessitent une clé API OpenAI valide
# et sont désactivés par défaut pour ne pas consommer de crédits

@pytest.mark.skip(reason="Nécessite une clé API OpenAI valide")
def test_chat_completion():
    """Test de chat completion (nécessite une clé API)"""
    response = client.post(
        "/api/v1/openai/chat",
        json={
            "messages": [
                {"role": "user", "content": "Bonjour"}
            ],
            "model": "gpt-3.5-turbo",
            "max_tokens": 50
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "message" in data


@pytest.mark.skip(reason="Nécessite une clé API OpenAI valide")
def test_create_embeddings():
    """Test de création d'embeddings (nécessite une clé API)"""
    response = client.post(
        "/api/v1/openai/embeddings",
        json={
            "input": ["Test de texte"],
            "model": "text-embedding-ada-002"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "embeddings" in data


@pytest.mark.skip(reason="Nécessite une clé API OpenAI valide")
def test_list_models():
    """Test de liste des modèles (nécessite une clé API)"""
    response = client.get("/api/v1/openai/models")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "models" in data
