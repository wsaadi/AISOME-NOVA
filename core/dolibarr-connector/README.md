# Connecteur Dolibarr

Connecteur central et standard pour interagir avec l'API REST Dolibarr à travers toute la plateforme agent-pf.

## 🎯 Objectif

Ce connecteur offre une interface unifiée pour que tous les agents de la plateforme puissent exploiter les données de Dolibarr (opportunités, clients, factures, etc.).

## 🚀 Fonctionnalités

### Opportunités (Propositions commerciales)

- **Récupération des propositions** : Accès à toutes les propositions commerciales
- **Filtrage par date** : Sélectionner une période spécifique
- **Statistiques automatiques** : Calcul des totaux et répartition par statut
- **Support multi-statuts** : Brouillon, Validée, Signée, Non signée, Facturée

### Gestion des clients (Tiers)

- **Informations client** : Récupération des détails des clients
- **Données de contact** : Email, téléphone, code client

## 📡 API Endpoints

### POST /api/v1/dolibarr/opportunities

Récupère les opportunités (propositions commerciales) depuis Dolibarr.

**Requête** :
```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "limit": 100,
  "sortfield": "t.date_creation",
  "sortorder": "DESC"
}
```

**Réponse** :
```json
{
  "success": true,
  "opportunities": [
    {
      "id": "1",
      "ref": "PR2401-0001",
      "status": "1",
      "status_label": "Validée",
      "total_ht": 5000.00,
      "total_ttc": 6000.00,
      "date": "2024-01-15T10:30:00",
      "date_creation": "2024-01-10T09:15:00",
      "socid": "12",
      "client_name": "ABC Corp",
      "note_public": "Proposition pour...",
      "raw_data": { ... }
    }
  ],
  "stats": {
    "total_count": 42,
    "total_amount_ht": 125000.00,
    "total_amount_ttc": 150000.00,
    "by_status": {
      "Validée": 15,
      "Signée": 10,
      "Facturée": 12,
      "Brouillon": 5
    },
    "by_status_amount": {
      "Validée": 45000.00,
      "Signée": 35000.00,
      "Facturée": 40000.00,
      "Brouillon": 5000.00
    }
  },
  "total": 42
}
```

### GET /health

Vérifie l'état de santé du service.

**Réponse** :
```json
{
  "status": "healthy",
  "service": "dolibarr-connector",
  "version": "1.0.0",
  "dolibarr_configured": true,
  "dolibarr_url": "http://localhost:8081"
}
```

## 🔐 Authentification

L'API supporte deux modes d'authentification :

### 1. Configuration globale (recommandé)

Configurez la clé API via les variables d'environnement :
```env
DOLIBARR_URL=http://localhost:8081
DOLIBARR_API_KEY=your_dolibarr_api_key
```

Tous les appels utiliseront cette configuration par défaut.

### 2. Paramètres par requête

Fournissez les paramètres spécifiques dans les headers :
```bash
curl -X POST "http://localhost:8015/api/v1/dolibarr/opportunities" \
  -H "X-API-Key: your-dolibarr-api-key" \
  -H "X-Dolibarr-URL: http://localhost:8081" \
  -H "Content-Type: application/json" \
  -d '{"start_date": "2024-01-01", "end_date": "2024-12-31"}'
```

## 🏗️ Installation

### Prérequis

1. **Dolibarr** installé et configuré
2. **Module API REST** activé dans Dolibarr (Configuration > Modules > API REST)
3. **Clé API** générée dans Dolibarr

### Génération de la clé API Dolibarr

1. Connectez-vous à Dolibarr en tant qu'administrateur
2. Allez dans **Configuration** > **Modules/Applications**
3. Activez le module **API REST** si ce n'est pas déjà fait
4. Allez dans **Accueil** > **Configuration** > **Utilisateurs et groupes**
5. Sélectionnez votre utilisateur
6. Dans l'onglet **Informations**, trouvez la section **Clés API**
7. Cliquez sur **Générer une nouvelle clé**
8. Copiez la clé générée

### Configuration

1. **Copier le fichier de configuration** :
```bash
cp .env.example .env
```

2. **Éditer le fichier `.env`** :
```env
DOLIBARR_URL=http://localhost:8081
DOLIBARR_API_KEY=votre_cle_api_dolibarr_ici
ENVIRONMENT=production
CORS_ORIGINS=*
```

### Démarrage

#### Via Docker Compose (recommandé)

```bash
# Depuis la racine du projet
docker-compose up -d dolibarr-connector
```

#### Développement local

```bash
# Installer les dépendances
pip install -r requirements.txt

# Lancer le connecteur
python -m uvicorn app.main:app --host 0.0.0.0 --port 8015 --reload
```

## 📊 Statuts des Propositions Dolibarr

| Code | Libellé | Signification |
|------|---------|---------------|
| 0 | Brouillon | Proposition en cours de rédaction |
| 1 | Validée | Proposition validée et envoyée au client |
| 2 | Signée | Proposition acceptée par le client |
| 3 | Non signée | Proposition refusée par le client |
| 4 | Facturée | Proposition transformée en facture |

## 🔧 Développement

### Structure du Projet

```
core/dolibarr-connector/
├── app/
│   ├── config.py                 # Configuration
│   ├── main.py                   # Application FastAPI
│   ├── models/
│   │   └── dolibarr_models.py    # Modèles Pydantic
│   ├── routers/
│   │   └── dolibarr.py           # Endpoints API
│   └── services/
│       └── dolibarr_service.py   # Logique métier
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

### Modèles de Données

#### OpportunityRequest
```python
{
  "start_date": "2024-01-01",      # Date de début (YYYY-MM-DD)
  "end_date": "2024-12-31",        # Date de fin (YYYY-MM-DD)
  "limit": 100,                     # Nombre max de résultats
  "sortfield": "t.date_creation",  # Champ de tri
  "sortorder": "DESC"               # Ordre de tri (ASC/DESC)
}
```

#### Opportunity
```python
{
  "id": "1",                        # ID de la proposition
  "ref": "PR2401-0001",            # Référence
  "status": "1",                    # Code statut
  "status_label": "Validée",       # Libellé du statut
  "total_ht": 5000.00,             # Total HT
  "total_ttc": 6000.00,            # Total TTC
  "date": "2024-01-15T10:30:00",  # Date de la proposition
  "date_creation": "...",          # Date de création
  "date_validation": "...",        # Date de validation
  "date_signature": "...",         # Date de signature
  "socid": "12",                   # ID du client
  "client_name": "ABC Corp",       # Nom du client
  "note_public": "...",            # Note publique
  "note_private": "...",           # Note privée
  "raw_data": { ... }              # Données brutes Dolibarr
}
```

## 🧪 Tests

### Tester la connexion

```bash
# Health check
curl http://localhost:8015/health

# Tester la récupération des opportunités
curl -X POST http://localhost:8015/api/v1/dolibarr/opportunities \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  }'
```

### Tests unitaires

```bash
# Lancer les tests
pytest

# Avec couverture
pytest --cov=app
```

## 📚 Documentation

- **Swagger UI** : `http://localhost:8015/docs`
- **ReDoc** : `http://localhost:8015/redoc`
- **OpenAPI Schema** : `http://localhost:8015/openapi.json`

## 🐛 Dépannage

### Erreur "Clé API non configurée"

Vérifiez que la variable d'environnement `DOLIBARR_API_KEY` est définie dans votre fichier `.env`.

### Erreur HTTP 401 ou 403

1. Vérifiez que la clé API est correcte
2. Vérifiez que l'utilisateur Dolibarr associé à la clé a les droits nécessaires
3. Vérifiez que le module API REST est activé dans Dolibarr

### Erreur de connexion à Dolibarr

1. Vérifiez que l'URL Dolibarr est correcte dans `.env`
2. Vérifiez que Dolibarr est accessible depuis le conteneur :
   ```bash
   docker exec agent-pf-dolibarr-connector curl http://votre-dolibarr:8081
   ```

### Données vides retournées

1. Vérifiez qu'il existe des propositions dans Dolibarr pour la période demandée
2. Vérifiez les filtres SQL (start_date, end_date)
3. Consultez les logs :
   ```bash
   docker logs agent-pf-dolibarr-connector
   ```

## 🔄 API Dolibarr Utilisée

Ce connecteur utilise l'API REST de Dolibarr :
- **Documentation** : https://wiki.dolibarr.org/index.php/Module_Web_Services_REST_(API_REST)
- **Endpoint utilisé** : `/api/index.php/proposals`

## 🤝 Contribution

Pour contribuer à ce projet, veuillez suivre les étapes standard de contribution de la plateforme agent-pf.

## 📝 Licence

Ce projet fait partie de la plateforme agent-pf.
