# 📄 Document Analyzer Agent

## 📋 Vue d'ensemble

Le **Document Analyzer Agent** est un agent orchestrateur intelligent qui automatise l'analyse de documents administratifs et marchés publics. Il combine extraction, analyse IA et génération de synthèse pour transformer des documents complexes en analyses structurées.

### Objectif

Automatiser l'analyse de documents pour :
- **Gagner du temps** : Analyse en minutes vs heures manuelles
- **Extraire l'essentiel** : Points clés, dates, exigences
- **Générer des synthèses** : Documents Word professionnels
- **Supporter multi-formats** : Word, PDF, Excel

### Capacités

- 📤 **Upload multi-fichiers** : Traitement batch de documents
- 🔍 **Extraction intelligente** : Contenu texte, tableaux, métadonnées
- 🧠 **Analyse IA** : Compréhension contextuelle avec Mistral
- 📊 **Synthèse structurée** : Génération automatique de rapports
- 📝 **Export Word** : Documents professionnels prêts à l'emploi

## 🏗️ Architecture

### Workflow d'analyse

```
┌─────────────────────────────────────────────────────┐
│ 1. UPLOAD : Réception de documents                 │
│    → Word (.docx)                                   │
│    → PDF (.pdf)                                     │
│    → Excel (.xlsx)                                  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ 2. EXTRACTION : Document Extractor Tool            │
│    [Port 8008]                                      │
│    → Extraction texte                              │
│    → Extraction tableaux                           │
│    → Métadonnées                                   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ 3. ANALYSE : Mistral AI                            │
│    [Mistral Connector]                              │
│    → Identification dates                          │
│    → Extraction modalités                          │
│    → Analyse cahier charges                        │
│    → Détection clauses/pénalités                   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ 4. GÉNÉRATION : Word CRUD Tool                     │
│    [Port 8001]                                      │
│    → Document Word structuré                       │
│    → Sections formatées                            │
│    → Prêt à l'export                               │
└─────────────────────────────────────────────────────┘
```

### Dépendances

- **Document Extractor Tool** (port 8008) - Extraction de contenu
- **Mistral Connector** (port 8005) - Analyse IA
- **Word CRUD Tool** (port 8001) - Génération Word

### Structure du service

```
agents/document-analyzer-tool/
├── app/
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration
│   ├── models/
│   │   └── analyzer_models.py  # Schémas
│   ├── services/
│   │   ├── orchestrator.py  # Logique orchestration
│   │   ├── extractor.py     # Client extraction
│   │   ├── analyzer.py      # Client Mistral
│   │   └── generator.py     # Client Word CRUD
│   └── routers/
│       └── analyze.py       # Endpoints API
├── Dockerfile
├── requirements.txt
└── README.md
```

## 🔌 API REST

### Endpoint principal

#### **POST /api/v1/analyze/documents**

Analyse un ou plusieurs documents et génère une synthèse.

**Requête multipart/form-data:**
```bash
curl -X POST "http://localhost:8009/api/v1/analyze/documents" \
  -F "files=@cahier_charges.pdf" \
  -F "files=@annexe_technique.docx" \
  -F "files=@budget.xlsx" \
  -F "mistral_api_key=your_api_key" \
  -F "mistral_model=mistral-small-latest" \
  -F "output_format=word"
```

**Paramètres:**
- `files` : Fichiers à analyser (multiple, obligatoire)
- `mistral_api_key` : Clé API Mistral (optionnel si configuré)
- `mistral_model` : Modèle à utiliser (défaut: mistral-small-latest)
- `output_format` : Format de sortie (`json` ou `word`, défaut: word)
- `analysis_type` : Type d'analyse (`marche_public`, `contrat`, `general`)

**Réponse:**
```json
{
  "success": true,
  "analysis": {
    "date_echeance": "2025-03-15",
    "modalite_reponse": "Plateforme PLACE",
    "resume_lots": [
      {
        "numero": "Lot 1",
        "description": "Développement application web",
        "montant_estime": "150000€"
      }
    ],
    "cahier_charges": {
      "objectifs": "Moderniser le système d'information...",
      "perimetre": "Application web responsive...",
      "exigences_techniques": ["Python 3.11+", "PostgreSQL"],
      "livrables": ["Code source", "Documentation"]
    },
    "clauses_penalites": {
      "clauses_contractuelles": ["Garantie 12 mois"],
      "penalites_retard": "500€ par jour",
      "garanties": "10% du montant"
    }
  },
  "word_document": {
    "file_id": "doc_12345",
    "download_url": "/api/v1/analyze/download/doc_12345"
  },
  "metadata": {
    "files_processed": 3,
    "total_pages": 45,
    "processing_time": "12.5s"
  }
}
```

#### **GET /api/v1/analyze/download/{file_id}**

Télécharge le document Word généré.

```bash
curl -O -J "http://localhost:8009/api/v1/analyze/download/doc_12345"
```

#### **GET /health**

Vérification de santé du service.

```bash
curl http://localhost:8009/health
```

## 🚀 Utilisation

### Configuration

```bash
# Variables d'environnement (.env ou docker-compose.yml)
DOCUMENT_ANALYZER_ENVIRONMENT=production
CORS_ORIGINS=*

# URLs des services dépendants
DOCUMENT_EXTRACTOR_URL=http://document-extractor-tool:8000
WORD_CRUD_URL=http://word-crud-tool:8000
MISTRAL_CONNECTOR_URL=http://mistral-connector:8000

# Configuration Mistral (optionnel)
MISTRAL_API_KEY=your_api_key
MISTRAL_DEFAULT_MODEL=mistral-small-latest
```

### Démarrage

```bash
# Via Docker Compose
docker-compose up -d document-analyzer-tool

# Logs
docker-compose logs -f document-analyzer-tool

# Test
curl http://localhost:8009/health
```

### Exemples d'utilisation

#### Analyse simple (Python)

```python
import httpx
from pathlib import Path

async def analyze_document(file_path: str):
    async with httpx.AsyncClient(timeout=120.0) as client:
        # Ouvrir le fichier
        with open(file_path, "rb") as f:
            files = {"files": (Path(file_path).name, f)}

            response = await client.post(
                "http://localhost:8009/api/v1/analyze/documents",
                files=files,
                data={
                    "mistral_model": "mistral-small-latest",
                    "output_format": "word"
                }
            )

        result = response.json()
        if result["success"]:
            print("Date échéance:", result["analysis"]["date_echeance"])
            print("Modalité:", result["analysis"]["modalite_reponse"])
            print("Document Word:", result["word_document"]["download_url"])
        else:
            print("Erreur:", result.get("error"))

# Utilisation
await analyze_document("cahier_charges.pdf")
```

#### Analyse multi-fichiers

```python
async def analyze_multiple_documents(file_paths: list):
    async with httpx.AsyncClient(timeout=180.0) as client:
        # Préparer les fichiers
        files = []
        for path in file_paths:
            with open(path, "rb") as f:
                content = f.read()
                files.append(
                    ("files", (Path(path).name, content))
                )

        response = await client.post(
            "http://localhost:8009/api/v1/analyze/documents",
            files=files,
            data={
                "analysis_type": "marche_public",
                "output_format": "word"
            }
        )

        result = response.json()
        if result["success"]:
            # Télécharger le Word
            download_url = result["word_document"]["download_url"]
            word_response = await client.get(
                f"http://localhost:8009{download_url}"
            )

            with open("synthese_analyse.docx", "wb") as f:
                f.write(word_response.content)

            print(f"Analysé {result['metadata']['files_processed']} fichiers")
            print(f"Temps: {result['metadata']['processing_time']}")

# Utilisation
await analyze_multiple_documents([
    "cahier_charges.pdf",
    "annexe_technique.docx",
    "budget.xlsx"
])
```

#### Depuis JavaScript/TypeScript

```typescript
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class DocumentAnalyzerService {
  private baseUrl = 'http://localhost:8009/api/v1/analyze';

  constructor(private http: HttpClient) {}

  analyzeDocuments(files: File[]): Observable<any> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    formData.append('output_format', 'word');
    formData.append('analysis_type', 'marche_public');

    return this.http.post(`${this.baseUrl}/documents`, formData);
  }

  downloadWord(fileId: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/download/${fileId}`,
      { responseType: 'blob' }
    );
  }
}

// Utilisation dans un composant
export class AnalyzerComponent {
  constructor(private service: DocumentAnalyzerService) {}

  onFilesSelected(files: FileList) {
    const fileArray = Array.from(files);

    this.service.analyzeDocuments(fileArray).subscribe({
      next: (result) => {
        if (result.success) {
          const fileId = result.word_document.file_id;
          this.downloadAnalysis(fileId);
        }
      }
    });
  }

  downloadAnalysis(fileId: string) {
    this.service.downloadWord(fileId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'synthese_analyse.docx';
        a.click();
      }
    });
  }
}
```

## ⚙️ Configuration avancée

### Types d'analyse

#### Marché public (par défaut)
```json
{
  "analysis_type": "marche_public"
}
```
Extrait : date échéance, lots, cahier charges, pénalités

#### Contrat
```json
{
  "analysis_type": "contrat"
}
```
Extrait : parties, durée, obligations, résiliation

#### Général
```json
{
  "analysis_type": "general"
}
```
Analyse libre du contenu

### Formats de sortie

#### JSON (analyse brute)
```json
{
  "output_format": "json"
}
```
Retourne uniquement l'analyse JSON

#### Word (recommandé)
```json
{
  "output_format": "word"
}
```
Génère un document Word formaté

## 🐛 Troubleshooting

### Erreurs courantes

#### Timeout lors du traitement

**Cause:** Fichiers trop volumineux ou nombreux

**Solutions:**
```python
# Augmenter timeout client
async with httpx.AsyncClient(timeout=300.0) as client:
    response = await client.post(...)

# Réduire nombre de fichiers par batch
# Traiter par lots de 5 fichiers max
```

#### Erreur d'extraction

**Message:** "Document extraction failed"

**Solutions:**
```bash
# Vérifier le service extracteur
docker-compose ps | grep extractor
docker-compose logs document-extractor-tool

# Redémarrer si nécessaire
docker-compose restart document-extractor-tool
```

#### Erreur génération Word

**Cause:** Word CRUD Tool indisponible

**Solutions:**
```bash
# Vérifier et redémarrer
docker-compose restart word-crud-tool
```

## 📊 Éléments analysés

### 1. Date d'échéance
- Date limite de soumission
- Détection automatique de formats variés

### 2. Modalité de réponse
- Plateforme (PLACE, AWS, etc.)
- Courrier recommandé
- Email
- Autre

### 3. Résumé des lots
- Numéro de lot
- Description
- Montant estimé
- Conditions spécifiques

### 4. Cahier des charges
- **Objectifs** : Buts du projet
- **Périmètre** : Étendue des travaux
- **Exigences techniques** : Technologies, normes
- **Livrables** : Documents, code, formations

### 5. Clauses et pénalités
- **Clauses contractuelles** : Garanties, assurances
- **Pénalités de retard** : Montants, conditions
- **Garanties** : Cautions, retenues

## 🔒 Sécurité

### Bonnes pratiques

1. ✅ **Validation fichiers** : Type MIME, taille max
2. ✅ **Scan antivirus** : Recommandé avant traitement
3. ✅ **Nettoyage temporaire** : Suppression auto des fichiers
4. ✅ **Logs d'audit** : Traçabilité des analyses
5. ✅ **Isolation** : Containers Docker séparés

### Recommandations production

- [ ] Limiter taille max fichiers (50 MB)
- [ ] Implémenter scan antivirus
- [ ] Configurer rétention fichiers temporaires
- [ ] Rate limiting par utilisateur
- [ ] Monitoring performance

## 📚 Ressources

### Liens internes

- [Document Extractor Tool](../tools/DOCUMENT_EXTRACTOR_TOOL.md)
- [Mistral Connector](../core/MISTRAL_CONNECTOR.md)
- [Word CRUD Tool](../tools/WORD_CRUD_TOOL.md)

### Cas d'usage

- Analyse appels d'offres
- Revue de contrats
- Extraction cahiers charges
- Audit documentaire
- Préparation réponses marchés

---

**Service** : document-analyzer-tool
**Port** : 8009
**Version** : 1.0.0
**Dernière mise à jour** : Janvier 2026
