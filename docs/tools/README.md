# 🛠️ Tools - Documentation

## Vue d'ensemble

Les **Tools** sont les briques de base de la plateforme. Ce sont des services spécialisés qui fournissent des fonctionnalités atomiques réutilisables par les agents. Chaque tool expose une API REST pour une tâche spécifique.

## Catégories de tools

### 📄 Traitement de documents (4)
- **[Word CRUD Tool](./WORD_CRUD_TOOL.md)** (8001) - Manipulation documents Word
- **[PDF CRUD Tool](./PDF_CRUD_TOOL.md)** (8003) - Opérations avancées PDF
- **[Excel CRUD Tool](./EXCEL_CRUD_TOOL.md)** (8004) - Gestion classeurs Excel
- **[PowerPoint CRUD Tool](./PPTX_CRUD_TOOL.md)** (8011) - Création présentations

### 🌐 Services web et fichiers (3)
- **[Web Search Tool](./WEB_SEARCH_TOOL.md)** (8002) - Recherche web et extraction
- **[File Upload Tool](./FILE_UPLOAD_TOOL.md)** (8007) - Upload et gestion fichiers
- **[Document Extractor Tool](./DOCUMENT_EXTRACTOR_TOOL.md)** (8008) - Extraction centralisée

### 🧠 IA et modération (2)
- **[Prompt Moderation Tool](./PROMPT_MODERATION_TOOL.md)** (8013) - Modération prompts
- **[Content Classification Tool](./CONTENT_CLASSIFICATION_TOOL.md)** (8014) - Classification contenu

## Quick Reference

| Tool | Port | Fonction principale | Complexité |
|------|------|---------------------|------------|
| **Word CRUD** | 8001 | Créer/lire/modifier Word | ⭐⭐ |
| **PDF CRUD** | 8003 | Fusion/extraction PDF | ⭐⭐ |
| **Excel CRUD** | 8004 | Manipuler classeurs Excel | ⭐⭐⭐ |
| **PowerPoint CRUD** | 8011 | Générer présentations | ⭐⭐⭐ |
| **Web Search** | 8002 | Recherche web | ⭐⭐ |
| **File Upload** | 8007 | Upload fichiers | ⭐ |
| **Document Extractor** | 8008 | Extraire contenu docs | ⭐⭐ |
| **Prompt Moderation** | 8013 | Modérer prompts IA | ⭐⭐⭐ |
| **Content Classification** | 8014 | Classifier contenu | ⭐⭐⭐ |

## Architecture des tools

### Structure commune

Tous les tools suivent la même architecture :

```
tools/{tool-name}/
├── app/
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration
│   ├── models/              # Schémas Pydantic
│   ├── services/            # Logique métier
│   └── routers/             # Endpoints API
├── tests/
├── Dockerfile
├── requirements.txt
└── README.md
```

### Principes de conception

1. **Responsabilité unique** : Chaque tool fait une chose et la fait bien
2. **Stateless** : Aucun état persistant entre les requêtes
3. **API REST** : Interface standardisée et documentée
4. **Isolation** : Containerisé pour éviter les conflits
5. **Réutilisable** : Appelable par n'importe quel agent

## Configuration

### Variables d'environnement

Chaque tool utilise un pattern de configuration similaire :

```bash
# Pattern général
{TOOL_NAME}_ENVIRONMENT=production
{TOOL_NAME}_CORS_ORIGINS=*
{TOOL_NAME}_LOG_LEVEL=INFO

# Exemples spécifiques
WORD_CRUD_ENVIRONMENT=production
PDF_CRUD_CORS_ORIGINS=*
WEB_SEARCH_LOG_LEVEL=DEBUG
```

### Démarrage

```bash
# Démarrer tous les tools
docker-compose up -d

# Démarrer seulement les tools de documents
docker-compose up -d word-crud-tool pdf-crud-tool excel-crud-tool pptx-crud-tool

# Démarrer seulement les tools web
docker-compose up -d web-search-tool file-upload-tool

# Vérifier l'état
docker-compose ps | grep tool
```

## Utilisation rapide

### Word CRUD Tool

```bash
# Créer un document Word
curl -X POST "http://localhost:8001/api/v1/word/create" \
  -H "Content-Type: application/json" \
  -d '{
    "paragraphs": ["Bonjour", "Ceci est un test"],
    "title": "Mon document"
  }'
```

### PDF CRUD Tool

```bash
# Fusionner des PDFs
curl -X POST "http://localhost:8003/api/v1/pdf/merge" \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.pdf"
```

### Excel CRUD Tool

```bash
# Créer un classeur Excel
curl -X POST "http://localhost:8004/api/v1/excel/create" \
  -H "Content-Type: application/json" \
  -d '{
    "sheets": [
      {
        "name": "Feuille1",
        "data": [["A1", "B1"], ["A2", "B2"]]
      }
    ]
  }'
```

### PowerPoint CRUD Tool

```bash
# Créer une présentation
curl -X POST "http://localhost:8011/api/v1/pptx/create" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Ma présentation",
    "slides": [
      {
        "type": "title",
        "content": {"title": "Titre", "subtitle": "Sous-titre"}
      }
    ]
  }'
```

### Web Search Tool

```bash
# Rechercher sur le web
curl -X POST "http://localhost:8002/api/v1/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "actualités technologie IA",
    "max_results": 10
  }'
```

### File Upload Tool

```bash
# Uploader un fichier
curl -X POST "http://localhost:8007/api/v1/upload" \
  -F "file=@document.pdf"
```

### Document Extractor Tool

```bash
# Extraire le contenu d'un document
curl -X POST "http://localhost:8008/api/v1/extract" \
  -F "file=@document.docx"
```

### Prompt Moderation Tool

```bash
# Modérer un prompt
curl -X POST "http://localhost:8013/api/v1/moderate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Peux-tu m'\''aider avec ce code Python ?"
  }'
```

### Content Classification Tool

```bash
# Classifier du contenu
curl -X POST "http://localhost:8014/api/v1/classify" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Analyse des ventes Q4 2024"
  }'
```

## Utilisation depuis Python

```python
import httpx

class ToolsClient:
    def __init__(self, base_url="http://localhost"):
        self.base_url = base_url

    async def create_word(self, paragraphs: list) -> bytes:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}:8001/api/v1/word/create",
                json={"paragraphs": paragraphs}
            )
            return response.content

    async def search_web(self, query: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}:8002/api/v1/search",
                json={"query": query, "max_results": 10}
            )
            return response.json()

    async def upload_file(self, file_path: str) -> dict:
        async with httpx.AsyncClient() as client:
            with open(file_path, "rb") as f:
                response = await client.post(
                    f"{self.base_url}:8007/api/v1/upload",
                    files={"file": f}
                )
            return response.json()

    async def moderate_prompt(self, prompt: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}:8013/api/v1/moderate",
                json={"prompt": prompt}
            )
            return response.json()

# Utilisation
tools = ToolsClient()
result = await tools.moderate_prompt("Mon prompt professionnel")
```

## Utilisation depuis JavaScript

```typescript
// Service Angular pour les tools
@Injectable({ providedIn: 'root' })
export class ToolsService {
  constructor(private http: HttpClient) {}

  createWord(paragraphs: string[]): Observable<Blob> {
    return this.http.post('http://localhost:8001/api/v1/word/create',
      { paragraphs },
      { responseType: 'blob' }
    );
  }

  searchWeb(query: string): Observable<any> {
    return this.http.post('http://localhost:8002/api/v1/search', {
      query,
      max_results: 10
    });
  }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post('http://localhost:8007/api/v1/upload', formData);
  }

  moderatePrompt(prompt: string): Observable<any> {
    return this.http.post('http://localhost:8013/api/v1/moderate', { prompt });
  }
}
```

## Patterns d'utilisation

### 1. Composition de tools

Les agents combinent plusieurs tools pour des tâches complexes :

```python
# Exemple: Analyser un document et créer une synthèse
extracted = await document_extractor.extract(file)
analysis = await mistral.analyze(extracted.content)
word_doc = await word_crud.create(analysis.summary)
```

### 2. Pipeline de traitement

```python
# Exemple: Pipeline de traitement documentaire
file_id = await file_upload.upload(file)
extracted = await document_extractor.extract_by_id(file_id)
moderated = await prompt_moderation.check(extracted.content)
if moderated.safe:
    result = await mistral.process(extracted.content)
```

### 3. Parallélisation

```python
# Exemple: Recherches parallèles
results = await asyncio.gather(
    web_search.search("actualités"),
    web_search.search("innovations"),
    web_search.search("tendances")
)
```

## Monitoring

### Health checks

```bash
# Vérifier tous les tools
for port in 8001 8002 8003 8004 8007 8008 8011 8013 8014; do
  echo "Tool on port $port:"
  curl -s http://localhost:$port/health | jq
done
```

### Performance

```bash
# Logs de performance
docker-compose logs word-crud-tool | grep "Processing time"
docker-compose logs web-search-tool | grep "Search completed"
```

## Troubleshooting

### Problèmes courants

#### Tool ne répond pas

```bash
# Vérifier l'état
docker-compose ps | grep tool-name

# Vérifier les logs
docker-compose logs tool-name

# Redémarrer
docker-compose restart tool-name
```

#### Erreur de format de fichier

```bash
# Vérifier les formats supportés
curl http://localhost:8008/api/v1/supported-formats

# Exemples:
# Word: .docx
# PDF: .pdf
# Excel: .xlsx
# PowerPoint: .pptx
```

#### Timeout

```python
# Augmenter le timeout pour les opérations lourdes
async with httpx.AsyncClient(timeout=60.0) as client:
    response = await client.post(...)
```

## Sécurité

### Bonnes pratiques

1. ✅ **Validation des fichiers** : Type MIME, taille max
2. ✅ **Sanitization** : Nettoyage des entrées utilisateur
3. ✅ **Rate limiting** : Limiter les requêtes par IP
4. ✅ **Scan antivirus** : Pour les uploads de fichiers
5. ✅ **Logs d'audit** : Traçabilité des opérations

### Limites recommandées

```bash
# Tailles maximales de fichiers
WORD_MAX_FILE_SIZE=50MB
PDF_MAX_FILE_SIZE=100MB
EXCEL_MAX_FILE_SIZE=50MB
PPTX_MAX_FILE_SIZE=100MB

# Rate limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
```

## Documentation détaillée

### Traitement de documents
- [Word CRUD Tool](./WORD_CRUD_TOOL.md)
- [PDF CRUD Tool](./PDF_CRUD_TOOL.md)
- [Excel CRUD Tool](./EXCEL_CRUD_TOOL.md)
- [PowerPoint CRUD Tool](./PPTX_CRUD_TOOL.md)

### Services web
- [Web Search Tool](./WEB_SEARCH_TOOL.md)
- [File Upload Tool](./FILE_UPLOAD_TOOL.md)
- [Document Extractor Tool](./DOCUMENT_EXTRACTOR_TOOL.md)

### IA et modération
- [Prompt Moderation Tool](./PROMPT_MODERATION_TOOL.md)
- [Content Classification Tool](./CONTENT_CLASSIFICATION_TOOL.md)

### Autres
- [Documentation plateforme](../platform/PLATFORM.md)
- [Documentation agents](../agents/)

---

**Dernière mise à jour** : Janvier 2026
