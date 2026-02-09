# 🔧 Guide de Diagnostic des Services-

## 📋 Résumé du Problème

Vous rencontriez deux problèmes principaux :
1. **URLs incorrectes** : Utilisation des noms de conteneurs Docker au lieu de localhost
2. **Bouton de téléchargement manquant** : Bouton conditionnel qui n'apparaît que si l'analyse réussit

---

## ✅ Corrections Effectuées

### 1. Configuration des URLs dans l'environnement Angular

Les fichiers suivants ont été mis à jour avec les bonnes URLs :

- ✅ `frontend/src/environments/environment.ts`
- ✅ `frontend/src/environments/environment.prod.ts`
- ✅ `frontend/src/environment.development.ts`

**URLs configurées :**

```typescript
api: {
  wordCrud: 'http://localhost:8001',
  webSearch: 'http://localhost:8002',
  pdfCrud: 'http://localhost:8003',
  excelCrud: 'http://localhost:8004',
  mistralConnector: 'http://localhost:8005',
  fileUpload: 'http://localhost:8007',
  documentExtractor: 'http://localhost:8008',
  documentAnalyzer: 'http://localhost:8009'
}
```

### 2. Mise à jour du Component Document Analyzer

Le fichier `frontend/src/app/pages/document-analyzer/document-analyzer.component.ts` a été corrigé pour utiliser les URLs de l'environnement au lieu de valeurs hardcodées.

---

## 🧪 Comment Tester les Services

### Étape 1 : Vérifier que Docker est lancé

```bash
docker ps
```

Vous devriez voir tous les conteneurs en cours d'exécution :
- agent-pf-frontend
- agent-pf-word-crud-tool
- agent-pf-mistral-connector
- agent-pf-file-upload-tool
- agent-pf-document-analyzer-tool
- etc.

### Étape 2 : Tester les Endpoints de Santé

Testez chaque service depuis votre navigateur ou avec curl :

#### Word CRUD Tool
```bash
curl http://localhost:8001/health
# Attendu: {"status":"healthy","service":"word-crud-tool","version":"1.0.0"}
```

Navigateur : http://localhost:8001/docs

#### Mistral Connector
```bash
curl http://localhost:8005/health
# Attendu: {"status":"healthy","service":"mistral-connector","version":"1.0.0","mistral_configured":true}
```

Navigateur : http://localhost:8005/docs

#### File Upload Tool
```bash
curl http://localhost:8007/health
# Attendu: {"status":"healthy","service":"file-upload-tool","version":"1.0.0"}
```

Navigateur : http://localhost:8007/docs

#### Document Analyzer Tool
```bash
curl http://localhost:8009/health
# Attendu: {"status":"healthy","service":"document-analyzer-tool","version":"1.0.0"}
```

Navigateur : http://localhost:8009/docs

---

## 🎯 Endpoints Disponibles par Service

### Word CRUD Tool (Port 8001)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/health` | GET | Health check |
| `/docs` | GET | Documentation Swagger |
| `/api/v1/word/...` | - | Endpoints CRUD pour Word |

### Mistral Connector (Port 8005)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/health` | GET | Health check |
| `/docs` | GET | Documentation Swagger |
| `/api/v1/mistral/chat` | POST | Chat avec Mistral AI |
| `/api/v1/mistral/embeddings` | POST | Générer des embeddings |
| `/api/v1/mistral/models` | GET | Lister les modèles disponibles |

### File Upload Tool (Port 8007)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/health` | GET | Health check |
| `/docs` | GET | Documentation Swagger |
| `/api/v1/upload/...` | - | Endpoints upload/download |

### Document Analyzer Tool (Port 8009)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/health` | GET | Health check |
| `/docs` | GET | Documentation Swagger |
| `/api/v1/analyze/documents` | POST | Analyser des documents |
| `/api/v1/analyze/files/{file_id}` | GET | Télécharger un fichier généré |

---

## 🔍 Pourquoi le Bouton de Téléchargement Word n'apparaît pas ?

Le bouton de téléchargement est **conditionnel** et n'apparaît que si toutes ces conditions sont remplies :

### ✅ Conditions d'Affichage

1. **Analyse réussie** : `analysisResult` doit exister
2. **Synthèse générée** : `analysisResult.synthesis` doit exister
3. **Fichier Word créé** : `analysisResult.synthesis_word_file_id` doit exister

### 📝 Processus Complet

1. **Uploader des documents** (PDF, Word, Excel)
2. **Configurer la clé API Mistral** (bouton ⚙️ en haut à droite)
3. **Lancer l'analyse** (bouton "Analyser les documents")
4. **Attendre la fin de l'analyse** (barre de progression)
5. **Le bouton apparaît** si tout s'est bien passé ✨

---

## 🚨 Dépannage

### Problème : "Network Error" ou "Connection Refused"

**Cause** : Le service backend n'est pas démarré

**Solution** :
```bash
cd /home/user/agent-pf
docker-compose up -d
```

### Problème : "CORS Error"

**Cause** : Configuration CORS incorrecte

**Solution** : Vérifier que `CORS_ORIGINS=*` dans le docker-compose.yml

### Problème : "Mistral API Key not configured"

**Cause** : La clé API Mistral n'est pas configurée

**Solution** :
1. Cliquer sur le bouton ⚙️ en haut à droite
2. Saisir votre clé API Mistral
3. Sauvegarder

### Problème : Le bouton de téléchargement n'apparaît toujours pas

**Vérifications** :
1. Ouvrir la console du navigateur (F12)
2. Vérifier s'il y a des erreurs dans l'onglet "Console"
3. Vérifier la réponse de l'API dans l'onglet "Network"
4. S'assurer que `synthesis_word_file_id` est présent dans la réponse

---

## 🔄 Rebuild du Frontend

Si les changements ne sont pas visibles après modification :

```bash
cd /home/user/agent-pf
docker-compose down
docker-compose build frontend
docker-compose up -d
```

Ou rebuild complet :

```bash
docker-compose down
docker-compose build
docker-compose up -d
```

---

## 📊 Mapping des Ports

| Service | Port Interne Docker | Port Externe (Browser) | URL Navigateur |
|---------|---------------------|------------------------|----------------|
| Frontend | 80 | 4200 | http://localhost:4200 |
| Word CRUD | 8000 | 8001 | http://localhost:8001 |
| Web Search | 8000 | 8002 | http://localhost:8002 |
| PDF CRUD | 8000 | 8003 | http://localhost:8003 |
| Excel CRUD | 8000 | 8004 | http://localhost:8004 |
| Mistral Connector | 8000 | 8005 | http://localhost:8005 |
| File Upload | 8007 | 8007 | http://localhost:8007 |
| Document Extractor | 8008 | 8008 | http://localhost:8008 |
| Document Analyzer | 8009 | 8009 | http://localhost:8009 |

---

## ⚠️ Important

**NE JAMAIS utiliser les noms de conteneurs depuis le navigateur !**

❌ Mauvais :
- `http://word-crud-tool:8000`
- `http://mistral-connector:8000`
- `http://file-upload-tool:8007`

✅ Correct :
- `http://localhost:8001`
- `http://localhost:8005`
- `http://localhost:8007`

Les noms de conteneurs fonctionnent **uniquement** entre les conteneurs Docker, pas depuis votre navigateur !

---

## 📝 Logs et Debugging

### Voir les logs d'un service

```bash
# Document Analyzer
docker logs agent-pf-document-analyzer-tool -f

# Mistral Connector
docker logs agent-pf-mistral-connector -f

# Word CRUD
docker logs agent-pf-word-crud-tool -f

# Frontend
docker logs agent-pf-frontend -f
```

### Vérifier le statut des conteneurs

```bash
docker-compose ps
```

### Redémarrer un service spécifique

```bash
docker-compose restart document-analyzer-tool
docker-compose restart mistral-connector
```

---

## ✨ Prochaines Étapes

1. Rebuild le frontend : `docker-compose build frontend && docker-compose up -d`
2. Accéder à l'interface : http://localhost:4200
3. Tester l'analyseur de documents
4. Vérifier que le bouton de téléchargement apparaît après une analyse réussie

---

**Date de création** : 2025-12-22
**Dernière mise à jour** : 2025-12-22
