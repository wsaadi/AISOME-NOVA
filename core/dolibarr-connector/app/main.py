"""
Application principale du connecteur Dolibarr
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.routers import dolibarr_router


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Description complète de l'API
API_DESCRIPTION = """
# Connecteur Dolibarr

Connecteur central et standard pour interagir avec Dolibarr ERP/CRM à travers toute la plateforme agent-pf.

## 🎯 Objectif

Ce connecteur offre une interface unifiée pour que tous les agents de la plateforme puissent
exploiter les données de Dolibarr (opportunités, clients, factures, etc.).

## 🚀 Fonctionnalités

### Opportunités (Propositions commerciales)
* **Récupération des propositions** - Accès à toutes les propositions commerciales
* **Filtrage par date** - Sélectionner une période spécifique
* **Statistiques automatiques** - Calcul des totaux et répartition par statut
* **Support multi-statuts** - Brouillon, Validée, Signée, Non signée, Facturée

### Gestion des clients (Tiers)
* **Informations client** - Récupération des détails des clients
* **Données de contact** - Email, téléphone, code client

## 🔐 Authentification

L'API supporte deux modes d'authentification :

### 1. Configuration globale (recommandé)
Configurez la clé API via les variables d'environnement :
- `DOLIBARR_API_KEY` - Clé API Dolibarr (DOLAPIKEY)
- `DOLIBARR_URL` - URL de votre instance Dolibarr

Tous les appels utiliseront cette configuration par défaut.

### 2. Paramètres par requête
Fournissez les paramètres spécifiques dans les headers :
- `X-API-Key` - Clé API Dolibarr
- `X-Dolibarr-URL` - URL de l'instance Dolibarr

Utile pour des agents avec leurs propres configurations.

```bash
curl -X POST "http://localhost:8015/api/v1/dolibarr/opportunities" \\
  -H "X-API-Key: your-dolibarr-api-key" \\
  -H "X-Dolibarr-URL: http://localhost:8081" \\
  -H "Content-Type: application/json" \\
  -d '{"start_date": "2024-01-01", "end_date": "2024-12-31"}'
```

## 📊 Statuts des propositions

- **0 - Brouillon** - Proposition en cours de rédaction
- **1 - Validée** - Proposition validée et envoyée au client
- **2 - Signée** - Proposition acceptée par le client
- **3 - Non signée** - Proposition refusée par le client
- **4 - Facturée** - Proposition transformée en facture

## 💡 Exemples d'utilisation

### Récupérer les opportunités d'une période
```python
import httpx

response = httpx.post(
    "http://localhost:8015/api/v1/dolibarr/opportunities",
    json={
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "limit": 100
    }
)

data = response.json()
print(f"Total opportunités: {data['total']}")
print(f"Montant total HT: {data['stats']['total_amount_ht']}")
print(f"Répartition par statut: {data['stats']['by_status']}")
```

## 🔧 Configuration

Variables d'environnement :

- `DOLIBARR_API_KEY` - Clé API Dolibarr (obligatoire pour l'authentification)
- `DOLIBARR_URL` - URL de l'instance Dolibarr (défaut: http://localhost:8081)
- `CORS_ORIGINS` - Origines CORS autorisées (défaut: *)
- `ENVIRONMENT` - Environnement (production/development)

## 📚 Documentation

- **Swagger UI** : `/docs`
- **ReDoc** : `/redoc`
- **OpenAPI Schema** : `/openapi.json`

## 🏥 Health Check

Endpoint : `GET /health`

Vérifiez l'état du service et la configuration de la connexion Dolibarr.
"""


# Créer l'application FastAPI
app = FastAPI(
    title=settings.api_title,
    description=API_DESCRIPTION,
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Enregistrer les routers
app.include_router(dolibarr_router)


@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    logger.info(f"Démarrage de {settings.api_title} v{settings.api_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Dolibarr URL: {settings.dolibarr_url}")

    if settings.dolibarr_api_key:
        logger.info("Clé API Dolibarr configurée ✓")
    else:
        logger.warning("⚠️  Clé API Dolibarr non configurée ! Configurez DOLIBARR_API_KEY")


@app.on_event("shutdown")
async def shutdown_event():
    """Actions à l'arrêt de l'application"""
    logger.info(f"Arrêt de {settings.api_title}")


@app.get("/", tags=["Root"])
async def root():
    """Point d'entrée principal de l'API"""
    return {
        "name": settings.api_title,
        "version": settings.api_version,
        "status": "operational",
        "dolibarr_url": settings.dolibarr_url,
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "endpoints": {
            "health": "/health",
            "opportunities": "/api/v1/dolibarr/opportunities"
        }
    }


@app.get("/health", tags=["Health"])
async def health():
    """Endpoint de santé pour les health checks"""
    is_configured = settings.dolibarr_api_key is not None

    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy" if is_configured else "unhealthy",
            "service": "dolibarr-connector",
            "version": settings.api_version,
            "dolibarr_configured": is_configured,
            "dolibarr_url": settings.dolibarr_url
        }
    )


# Gestionnaire d'erreurs global
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Gestion globale des erreurs"""
    logger.error(f"Erreur non gérée: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": f"Erreur interne du serveur: {str(exc)}",
            "error": type(exc).__name__
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8015,
        reload=settings.environment == "development"
    )
