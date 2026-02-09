# 📅 Appointment Scheduler Agent

## 📋 Vue d'ensemble

Le **Appointment Scheduler Agent** est un agent orchestrateur intelligent qui automatise la préparation de rendez-vous commerciaux. Il combine recherche web, analyse IA et génération de présentation pour créer des dossiers de préparation complets.

### Objectif

Automatiser la préparation de rendez-vous pour :
- **Gagner du temps** : Préparation complète en minutes
- **Contextualiser** : Actualités entreprise et profil contact
- **Recommandations IA** : Points de discussion, questions stratégiques
- **Présentation pro** : PowerPoint généré automatiquement

### Capacités

- 🔍 **Recherche automatique** : Actualités de l'entreprise cible
- 👤 **Analyse profil** : Informations sur l'interlocuteur
- 🧠 **Recommandations IA** : Stratégie de rendez-vous avec Mistral
- 📊 **Génération PowerPoint** : Présentation professionnelle
- 📁 **Stockage sécurisé** : Fichiers uploadés et accessibles

## 🏗️ Architecture

### Workflow de préparation

```
┌─────────────────────────────────────────────────────┐
│ 1. RECHERCHE : Web Search Tool                     │
│    [Port 8002]                                      │
│    → Actualités entreprise                         │
│    → Informations secteur                          │
│    → Profil interlocuteur                          │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ 2. ANALYSE : Mistral AI                            │
│    [Mistral Connector]                              │
│    → Points de discussion                          │
│    → Questions stratégiques                        │
│    → Propositions de valeur                        │
│    → Recommandations approche                      │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ 3. GÉNÉRATION : PowerPoint CRUD Tool               │
│    [Port 8011]                                      │
│    → Présentation structurée                       │
│    → Slides formatées                              │
│    → Prête à présenter                             │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│ 4. STOCKAGE : File Upload Tool                     │
│    [Port 8007]                                      │
│    → Sauvegarde fichier                            │
│    → URL de téléchargement                         │
└─────────────────────────────────────────────────────┘
```

### Dépendances

- **Web Search Tool** (port 8002) - Recherche d'informations
- **Mistral Connector** (port 8005) - Analyse et recommandations
- **PowerPoint CRUD Tool** (port 8011) - Génération présentation
- **File Upload Tool** (port 8007) - Stockage fichiers

### Structure du service

```
agents/appointment-scheduler-tool/
├── app/
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration
│   ├── models/
│   │   └── scheduler_models.py  # Schémas
│   ├── services/
│   │   ├── orchestrator.py  # Logique orchestration
│   │   ├── research.py      # Client Web Search
│   │   ├── analyzer.py      # Client Mistral
│   │   └── generator.py     # Client PowerPoint
│   └── routers/
│       └── scheduler.py     # Endpoints API
├── Dockerfile
├── requirements.txt
└── README.md
```

## 🔌 API REST

### Endpoint principal

#### **POST /api/v1/scheduler/prepare**

Prépare un rendez-vous commercial complet.

**Requête JSON:**
```json
{
  "appointment_date": "2025-01-20",
  "company_name": "Acme Corporation",
  "contact_name": "Marie Martin",
  "contact_position": "Directrice Innovation",
  "appointment_objective": "Présenter notre solution d'IA pour automatiser les processus métier",
  "mistral_api_key": "your_api_key",
  "mistral_model": "mistral-small-latest",
  "include_web_research": true,
  "generate_powerpoint": true
}
```

**Paramètres:**
- `appointment_date` : Date du rendez-vous (obligatoire)
- `company_name` : Nom de l'entreprise cible (obligatoire)
- `contact_name` : Nom du contact (obligatoire)
- `contact_position` : Poste du contact (optionnel)
- `appointment_objective` : Objectif du RDV (obligatoire)
- `mistral_api_key` : Clé API Mistral (optionnel si configuré)
- `mistral_model` : Modèle Mistral (défaut: mistral-small-latest)
- `include_web_research` : Inclure recherche web (défaut: true)
- `generate_powerpoint` : Générer PowerPoint (défaut: true)

**Réponse:**
```json
{
  "success": true,
  "preparation": {
    "company_info": {
      "name": "Acme Corporation",
      "sector": "Technologie",
      "recent_news": [
        "Acme annonce une levée de fonds de 50M€",
        "Lancement nouvelle gamme produits en Q1 2025"
      ]
    },
    "contact_info": {
      "name": "Marie Martin",
      "position": "Directrice Innovation",
      "background": "Expert en transformation digitale..."
    },
    "recommendations": {
      "discussion_points": [
        "Présenter ROI de la solution sur cas similaires",
        "Démonstration live de l'automatisation"
      ],
      "strategic_questions": [
        "Quels processus souhaitez-vous automatiser en priorité ?",
        "Quel est votre budget alloué à l'innovation ?"
      ],
      "value_propositions": [
        "Réduction de 40% du temps de traitement",
        "ROI en moins de 6 mois"
      ],
      "approach_tips": [
        "Insister sur la simplicité d'intégration",
        "Montrer des cas clients du même secteur"
      ]
    }
  },
  "powerpoint": {
    "file_id": "pptx_67890",
    "download_url": "/api/v1/scheduler/download/pptx_67890",
    "slides_count": 8
  },
  "metadata": {
    "preparation_time": "8.2s",
    "sources_used": 12
  }
}
```

#### **GET /api/v1/scheduler/download/{file_id}**

Télécharge la présentation PowerPoint.

```bash
curl -O -J "http://localhost:8010/api/v1/scheduler/download/pptx_67890"
```

#### **GET /health**

Vérification de santé du service.

## 🚀 Utilisation

### Configuration

```bash
# Variables d'environnement
APPOINTMENT_SCHEDULER_ENVIRONMENT=production
CORS_ORIGINS=*

# URLs des services
WEB_SEARCH_URL=http://web-search-tool:8000
MISTRAL_CONNECTOR_URL=http://mistral-connector:8000
PPTX_CRUD_URL=http://pptx-crud-tool:8000
FILE_UPLOAD_URL=http://file-upload-tool:8000

# Configuration Mistral (optionnel)
MISTRAL_API_KEY=your_api_key
MISTRAL_DEFAULT_MODEL=mistral-small-latest
```

### Démarrage

```bash
# Via Docker Compose
docker-compose up -d appointment-scheduler-tool

# Logs
docker-compose logs -f appointment-scheduler-tool

# Test
curl http://localhost:8010/health
```

### Exemples d'utilisation

#### Préparation simple (Python)

```python
import httpx

async def prepare_appointment():
    config = {
        "appointment_date": "2025-01-20",
        "company_name": "TechCorp",
        "contact_name": "Jean Dupont",
        "contact_position": "CTO",
        "appointment_objective": "Présenter solution IA",
        "include_web_research": True,
        "generate_powerpoint": True
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            "http://localhost:8010/api/v1/scheduler/prepare",
            json=config
        )

        result = response.json()
        if result["success"]:
            # Afficher les recommandations
            reco = result["preparation"]["recommendations"]
            print("Points de discussion:", reco["discussion_points"])
            print("Questions:", reco["strategic_questions"])

            # Télécharger le PowerPoint
            file_id = result["powerpoint"]["file_id"]
            pptx_response = await client.get(
                f"http://localhost:8010/api/v1/scheduler/download/{file_id}"
            )

            with open("preparation_rdv.pptx", "wb") as f:
                f.write(pptx_response.content)

            print("PowerPoint généré !")

await prepare_appointment()
```

#### Préparation avancée

```python
async def prepare_meeting_batch(meetings: list):
    """Prépare plusieurs rendez-vous en batch"""

    results = []
    async with httpx.AsyncClient(timeout=180.0) as client:
        for meeting in meetings:
            response = await client.post(
                "http://localhost:8010/api/v1/scheduler/prepare",
                json=meeting
            )
            results.append(response.json())

    # Traiter les résultats
    for idx, result in enumerate(results):
        if result["success"]:
            print(f"RDV {idx+1}: {result['powerpoint']['slides_count']} slides")
        else:
            print(f"RDV {idx+1}: Erreur - {result.get('error')}")

# Utilisation
meetings = [
    {
        "appointment_date": "2025-01-20",
        "company_name": "Acme Corp",
        "contact_name": "Alice",
        "appointment_objective": "Vendre solution A"
    },
    {
        "appointment_date": "2025-01-22",
        "company_name": "Beta Inc",
        "contact_name": "Bob",
        "appointment_objective": "Vendre solution B"
    }
]

await prepare_meeting_batch(meetings)
```

#### Depuis JavaScript/TypeScript

```typescript
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private baseUrl = 'http://localhost:8010/api/v1/scheduler';

  constructor(private http: HttpClient) {}

  prepareAppointment(config: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/prepare`, config);
  }

  downloadPowerPoint(fileId: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/download/${fileId}`,
      { responseType: 'blob' }
    );
  }
}

// Utilisation
export class MeetingPrepComponent {
  constructor(private service: AppointmentService) {}

  prepareMeeting() {
    const config = {
      appointment_date: '2025-01-20',
      company_name: 'Acme Corp',
      contact_name: 'Marie Dupont',
      appointment_objective: 'Présenter notre solution',
      generate_powerpoint: true
    };

    this.service.prepareAppointment(config).subscribe({
      next: (result) => {
        if (result.success) {
          // Afficher recommandations
          this.displayRecommendations(result.preparation.recommendations);

          // Télécharger PowerPoint
          const fileId = result.powerpoint.file_id;
          this.downloadPresentation(fileId);
        }
      }
    });
  }

  downloadPresentation(fileId: string) {
    this.service.downloadPowerPoint(fileId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'preparation_rdv.pptx';
        a.click();
      }
    });
  }
}
```

## 📊 Contenu généré

### PowerPoint - Structure type

1. **Slide 1 : Page de garde**
   - Entreprise cible
   - Date et objectif RDV

2. **Slide 2 : À propos de l'entreprise**
   - Actualités récentes
   - Secteur et chiffres clés

3. **Slide 3 : Profil du contact**
   - Poste et responsabilités
   - Contexte professionnel

4. **Slide 4 : Objectif du RDV**
   - But de la rencontre
   - Résultats attendus

5. **Slide 5 : Points de discussion**
   - Sujets clés à aborder
   - Arguments principaux

6. **Slide 6 : Questions stratégiques**
   - Questions de découverte
   - Questions de qualification

7. **Slide 7 : Propositions de valeur**
   - Bénéfices solution
   - Différenciation

8. **Slide 8 : Prochaines étapes**
   - Actions à proposer
   - Planning suggéré

## 🐛 Troubleshooting

### Erreurs courantes

#### Recherche web échoue

**Cause:** Web Search Tool indisponible

**Solutions:**
```bash
# Vérifier et redémarrer
docker-compose restart web-search-tool

# Ou désactiver la recherche
{
  "include_web_research": false
}
```

#### Génération PowerPoint échoue

**Solutions:**
```bash
# Vérifier le service
docker-compose logs pptx-crud-tool
docker-compose restart pptx-crud-tool

# Ou demander JSON seulement
{
  "generate_powerpoint": false
}
```

#### Timeout

**Solutions:**
```python
# Augmenter timeout (recherche web peut être lente)
async with httpx.AsyncClient(timeout=180.0) as client:
    response = await client.post(...)
```

## 🔒 Sécurité

### Bonnes pratiques

1. ✅ **Validation données** : Entreprise, contact vérifiés
2. ✅ **Recherche sécurisée** : Pas de requêtes malveillantes
3. ✅ **Stockage temporaire** : Fichiers auto-supprimés
4. ✅ **Logs d'audit** : Traçabilité des préparations

### Recommandations

- [ ] Rate limiting par utilisateur
- [ ] Validation noms entreprises (anti-injection)
- [ ] Scan antivirus fichiers générés
- [ ] Rétention limitée (7 jours max)

## 📚 Ressources

### Liens internes

- [Web Search Tool](../tools/WEB_SEARCH_TOOL.md)
- [Mistral Connector](../core/MISTRAL_CONNECTOR.md)
- [PowerPoint CRUD Tool](../tools/PPTX_CRUD_TOOL.md)
- [File Upload Tool](../tools/FILE_UPLOAD_TOOL.md)

### Cas d'usage

- Préparation rendez-vous commerciaux
- Briefing avant réunions importantes
- Research automatique prospects
- Génération supports présentation

---

**Service** : appointment-scheduler-tool
**Port** : 8010
**Version** : 1.0.0
**Dernière mise à jour** : Janvier 2026
