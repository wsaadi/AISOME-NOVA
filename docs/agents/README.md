# 🤖 Agents - Documentation

## Vue d'ensemble

Les **Agents** sont des orchestrateurs intelligents qui combinent plusieurs outils (tools) et services d'IA pour accomplir des tâches complexes de manière autonome. Chaque agent expose une API REST de haut niveau qui abstrait la complexité de l'orchestration.

## Agents disponibles

### 1. [AI Chat Agent](./AI_CHAT_AGENT.md)
**Port:** 8012
**Complexité:** ⭐⭐⭐

Agent de conversation IA gouvernée avec modération et classification automatiques.

**Capacités:**
- Chat multimodal (texte, images, documents)
- Modération systématique des prompts
- Classification professionnelle du contenu
- Support Mistral AI et OpenAI
- Historique de conversation

**Workflow:**
```
Prompt → Classification → Modération → IA → Réponse
```

**Utilisation:**
```bash
curl -X POST "http://localhost:8012/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Aide-moi à rédiger un email"}],
    "provider": "mistral"
  }'
```

### 2. [Document Analyzer Agent](./DOCUMENT_ANALYZER.md)
**Port:** 8009
**Complexité:** ⭐⭐⭐⭐

Agent d'analyse intelligente de documents administratifs et marchés publics.

**Capacités:**
- Upload multi-fichiers (Word, PDF, Excel)
- Extraction automatique de contenu
- Analyse IA structurée
- Génération de synthèse Word
- Support marchés publics

**Workflow:**
```
Upload → Extraction → Analyse IA → Synthèse Word
```

**Utilisation:**
```bash
curl -X POST "http://localhost:8009/api/v1/analyze/documents" \
  -F "files=@document.pdf" \
  -F "output_format=word"
```

### 3. [Appointment Scheduler Agent](./APPOINTMENT_SCHEDULER.md)
**Port:** 8010
**Complexité:** ⭐⭐⭐⭐

Agent de préparation automatisée de rendez-vous commerciaux.

**Capacités:**
- Recherche automatique d'actualités entreprise
- Analyse du profil interlocuteur
- Recommandations stratégiques IA
- Génération PowerPoint professionnelle
- Points de discussion et questions

**Workflow:**
```
Config RDV → Recherche Web → Analyse IA → PowerPoint
```

**Utilisation:**
```bash
curl -X POST "http://localhost:8010/api/v1/scheduler/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Corp",
    "contact_name": "Jean Dupont",
    "appointment_objective": "Présenter solution"
  }'
```

## Architecture des agents

### Principe d'orchestration

Les agents orchestrent plusieurs services pour accomplir des tâches complexes :

```
┌─────────────────────────────────────────┐
│           Agent Layer                   │
│  (Logique d'orchestration)              │
└──────────────┬──────────────────────────┘
               │
        Appels parallèles/séquentiels
               │
┌──────────────┴──────────────────────────┐
│                                         │
▼                ▼                ▼       ▼
Tool 1        Tool 2          Core     Tool N
(8002)        (8013)        Connector  (8011)
                              (8005)
```

### Structure commune

```
agents/{agent-name}/
├── app/
│   ├── main.py                  # FastAPI app
│   ├── config.py                # Configuration
│   ├── models/                  # Schémas Pydantic
│   ├── services/
│   │   ├── orchestrator.py      # Logique d'orchestration
│   │   ├── tool1_client.py      # Client pour tool 1
│   │   └── tool2_client.py      # Client pour tool 2
│   └── routers/
│       └── agent.py             # Endpoints API
├── Dockerfile
├── requirements.txt
└── README.md
```

## Dépendances des agents

### AI Chat Agent
- Content Classification Tool (8014)
- Prompt Moderation Tool (8013)
- Mistral Connector (8005)
- OpenAI Connector (8006) - optionnel

### Document Analyzer Agent
- Document Extractor Tool (8008)
- Mistral Connector (8005)
- Word CRUD Tool (8001)

### Appointment Scheduler Agent
- Web Search Tool (8002)
- Mistral Connector (8005)
- PowerPoint CRUD Tool (8011)
- File Upload Tool (8007)

## Configuration

### Variables d'environnement

Chaque agent a sa propre configuration :

```bash
# AI Chat Agent
AI_CHAT_ENVIRONMENT=production
MISTRAL_CONNECTOR_URL=http://mistral-connector:8000
PROMPT_MODERATION_URL=http://prompt-moderation-tool:8000
CONTENT_CLASSIFICATION_URL=http://content-classification-tool:8000

# Document Analyzer Agent
DOCUMENT_ANALYZER_ENVIRONMENT=production
DOCUMENT_EXTRACTOR_URL=http://document-extractor-tool:8000
WORD_CRUD_URL=http://word-crud-tool:8000
MISTRAL_CONNECTOR_URL=http://mistral-connector:8000

# Appointment Scheduler Agent
APPOINTMENT_SCHEDULER_ENVIRONMENT=production
WEB_SEARCH_URL=http://web-search-tool:8000
PPTX_CRUD_URL=http://pptx-crud-tool:8000
MISTRAL_CONNECTOR_URL=http://mistral-connector:8000
```

### Démarrage

```bash
# Démarrer tous les agents
docker-compose up -d ai-chat-agent document-analyzer-tool appointment-scheduler-tool

# Ou individuellement
docker-compose up -d ai-chat-agent

# Vérifier l'état
docker-compose ps | grep agent

# Logs
docker-compose logs -f ai-chat-agent
```

## Utilisation

### Depuis Python

```python
import httpx

# AI Chat Agent
async def chat_with_moderation(prompt: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8012/api/v1/chat/completions",
            json={
                "messages": [{"role": "user", "content": prompt}],
                "provider": "mistral"
            }
        )
        return response.json()

# Document Analyzer
async def analyze_document(file_path: str):
    async with httpx.AsyncClient(timeout=120.0) as client:
        with open(file_path, "rb") as f:
            response = await client.post(
                "http://localhost:8009/api/v1/analyze/documents",
                files={"files": f},
                data={"output_format": "word"}
            )
        return response.json()

# Appointment Scheduler
async def prepare_appointment(company: str, contact: str):
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "http://localhost:8010/api/v1/scheduler/prepare",
            json={
                "company_name": company,
                "contact_name": contact,
                "appointment_objective": "Présenter notre solution"
            }
        )
        return response.json()
```

### Depuis JavaScript/TypeScript

```typescript
// Service Angular pour les agents
@Injectable({ providedIn: 'root' })
export class AgentsService {
  constructor(private http: HttpClient) {}

  // AI Chat
  chat(messages: any[]): Observable<any> {
    return this.http.post('http://localhost:8012/api/v1/chat/completions', {
      messages,
      provider: 'mistral'
    });
  }

  // Document Analyzer
  analyzeDocument(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('output_format', 'word');
    return this.http.post('http://localhost:8009/api/v1/analyze/documents', formData);
  }

  // Appointment Scheduler
  prepareAppointment(config: any): Observable<any> {
    return this.http.post('http://localhost:8010/api/v1/scheduler/prepare', config);
  }
}
```

## Patterns d'orchestration

### 1. Orchestration séquentielle
Les outils sont appelés l'un après l'autre, chaque étape dépendant de la précédente.

```python
# Exemple: Document Analyzer
result1 = await extractor_tool.extract(file)
result2 = await mistral.analyze(result1.content)
result3 = await word_tool.generate(result2.analysis)
```

### 2. Orchestration parallèle
Plusieurs outils sont appelés simultanément pour optimiser les performances.

```python
# Exemple: Appointment Scheduler
results = await asyncio.gather(
    web_search.search_company(company_name),
    web_search.search_contact(contact_name),
    web_search.search_sector(sector)
)
```

### 3. Orchestration conditionnelle
Le workflow s'adapte en fonction des résultats intermédiaires.

```python
# Exemple: AI Chat Agent
classification = await classifier.classify(prompt)
if classification.professional_score >= 60:
    moderation = await moderator.moderate(prompt)
    if moderation.passed:
        response = await mistral.chat(prompt)
```

## Monitoring et observabilité

### Health checks

```bash
# Vérifier tous les agents
for port in 8009 8010 8012; do
  echo "Agent on port $port:"
  curl http://localhost:$port/health
done
```

### Logs structurés

```bash
# Logs avec filtre par niveau
docker-compose logs ai-chat-agent | grep ERROR
docker-compose logs ai-chat-agent | grep WARNING

# Logs avec timestamp
docker-compose logs -t ai-chat-agent
```

## Troubleshooting

### Problèmes courants

#### Agent ne démarre pas
```bash
# Vérifier les services dépendants
docker-compose ps

# Redémarrer les dépendances
docker-compose restart mistral-connector
docker-compose restart ai-chat-agent
```

#### Timeout lors des requêtes
```python
# Augmenter le timeout (agents complexes)
async with httpx.AsyncClient(timeout=180.0) as client:
    response = await client.post(...)
```

#### Erreur de service dépendant
```bash
# Vérifier qu'un tool est disponible
curl http://localhost:8013/health  # Prompt Moderation
curl http://localhost:8014/health  # Content Classification

# Redémarrer si nécessaire
docker-compose restart prompt-moderation-tool
```

## Sécurité

### Bonnes pratiques

1. ✅ **Validation des entrées** : Pydantic sur tous les endpoints
2. ✅ **Timeouts appropriés** : Éviter les blocages
3. ✅ **Gestion d'erreurs** : Circuit breaker pour les dépendances
4. ✅ **Logs d'audit** : Traçabilité des actions
5. ✅ **Rate limiting** : Par utilisateur/IP

## Performance

### Optimisations

- **Parallélisation** : Appels simultanés quand possible
- **Cache** : Résultats de recherche web (TTL 1h)
- **Pooling** : Connexions HTTP réutilisées
- **Async/await** : Non-blocking I/O partout

## Documentation détaillée

- [AI Chat Agent - Documentation complète](./AI_CHAT_AGENT.md)
- [Document Analyzer - Documentation complète](./DOCUMENT_ANALYZER.md)
- [Appointment Scheduler - Documentation complète](./APPOINTMENT_SCHEDULER.md)
- [Documentation plateforme](../platform/PLATFORM.md)

---

**Dernière mise à jour** : Janvier 2026
