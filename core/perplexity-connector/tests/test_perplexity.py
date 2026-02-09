"""
Tests pour le connecteur Perplexity
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


def test_root():
    """Test de l'endpoint racine"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == settings.api_title
    assert data["version"] == settings.api_version
    assert data["status"] == "operational"


def test_health():
    """Test du health check"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "service" in data
    assert data["service"] == "perplexity-connector"


def test_api_health():
    """Test du health check de l'API"""
    response = client.get("/api/v1/perplexity/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "perplexity_configured" in data


@pytest.mark.skipif(
    not settings.perplexity_api_key,
    reason="Pas de clé API Perplexity configurée"
)
def test_chat_completion():
    """Test de la génération de chat"""
    response = client.post(
        "/api/v1/perplexity/chat",
        json={
            "messages": [
                {"role": "user", "content": "Dis bonjour en un mot"}
            ],
            "max_tokens": 10
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "message" in data


@pytest.mark.skipif(
    not settings.perplexity_api_key,
    reason="Pas de clé API Perplexity configurée"
)
def test_list_models():
    """Test de la liste des modèles"""
    response = client.get("/api/v1/perplexity/models")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "models" in data
