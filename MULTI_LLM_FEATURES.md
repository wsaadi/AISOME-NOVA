# Configuration Multi-LLM et Détection de Documents Professionnels

## 📋 Vue d'ensemble

Ce document décrit les fonctionnalités du systeme multi-LLM de la plateforme, gerees par l'Agent Runtime (port 8025). Deux problematiques principales sont adressees :

1. **Blocage injustifié de documents professionnels** (CCTP, RFP, etc.) par la modération
2. **Besoin de modèles LLM spécialisés** selon le type de tâche (texte, document, image)

---

## 🎯 Problème Résolu : Documents Professionnels Bloqués

### Symptôme
Les documents professionnels (CCTP, RFP, cahiers des charges) étaient bloqués par la modération car ils contenaient des mots comme "confidentiel", "secret", etc., considérés à tort comme suspects.

### Solution Implémentée
1. **Détection automatique** des documents professionnels par nom de fichier et contenu
2. **Modération adaptée** qui comprend le contexte professionnel
3. **Patterns reconnus** : CCTP, RFP, RFI, RFQ, Appel d'offre, Cahier des charges, Marché public, etc.

### Exemple
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Peux-tu analyser ce document ?",
      "documents": [
        {
          "name": "20255414 - CCTP AC solutions IA V2.pdf",
          "type": "application/pdf",
          "content": "..."
        }
      ]
    }
  ]
}
```

**Résultat** : Le document est automatiquement reconnu comme professionnel et la modération s'adapte ✅

---

## 🚀 Nouvelle Fonctionnalité : Configuration Multi-LLM

### Principe
Vous pouvez maintenant configurer **différents modèles LLM** pour différents types de tâches :
- 💬 **Texte/Prompt classique** → Modèle léger et rapide (Mistral Small, GPT-4o Mini)
- 📄 **Analyse de documents** → Modèle puissant (Mistral Large, GPT-4o)
- 🖼️ **Analyse d'images** → Modèle vision (Pixtral, GPT-4 Vision)

### Configuration par Défaut (variables d'environnement)

#### Texte/Prompt Chat
```env
TEXT_CHAT_PROVIDER=mistral
TEXT_CHAT_MODEL=mistral-small-latest
TEXT_CHAT_TEMPERATURE=0.7
TEXT_CHAT_MAX_TOKENS=4096
```

#### Analyse de Documents
```env
DOCUMENT_ANALYSIS_PROVIDER=mistral
DOCUMENT_ANALYSIS_MODEL=mistral-large-latest
DOCUMENT_ANALYSIS_TEMPERATURE=0.3
DOCUMENT_ANALYSIS_MAX_TOKENS=8192
```

#### Analyse d'Images
```env
IMAGE_ANALYSIS_PROVIDER=mistral
IMAGE_ANALYSIS_MODEL=pixtral-12b-2409
IMAGE_ANALYSIS_TEMPERATURE=0.5
IMAGE_ANALYSIS_MAX_TOKENS=4096
```

### Configuration par Requête (API)

Vous pouvez aussi configurer les LLM dynamiquement lors de chaque requête :

```json
{
  "messages": [...],
  "multi_llm_config": {
    "text_chat": {
      "provider": "mistral",
      "model": "mistral-small-latest",
      "temperature": 0.7,
      "max_tokens": 4096
    },
    "document_analysis": {
      "provider": "mistral",
      "model": "mistral-large-latest",
      "temperature": 0.3,
      "max_tokens": 8192
    },
    "image_analysis": {
      "provider": "openai",
      "model": "gpt-4o",
      "temperature": 0.5,
      "max_tokens": 4096
    }
  },
  "task_type": "document_analysis"
}
```

### Détection Automatique du Type de Tâche

Si vous ne spécifiez pas `task_type`, le système détecte automatiquement :
- Présence d'**images** → `image_analysis`
- Présence de **documents** → `document_analysis`
- Sinon → `text_chat`

---

## 📊 Modèles Recommandés

### Mistral
| Tâche | Modèle | Pourquoi |
|-------|--------|----------|
| Texte classique | `mistral-small-latest` | Rapide, économique, efficace |
| Documents complexes | `mistral-large-latest` | Meilleure compréhension, plus de contexte |
| Images | `pixtral-12b-2409` | Modèle vision natif Mistral |

### OpenAI
| Tâche | Modèle | Pourquoi |
|-------|--------|----------|
| Texte classique | `gpt-4o-mini` | Rapide, économique |
| Documents complexes | `gpt-4o` | Excellente compréhension |
| Images | `gpt-4o` | Vision intégrée |

### Anthropic
| Tâche | Modèle | Pourquoi |
|-------|--------|----------|
| Texte classique | `claude-3-5-sonnet` | Raisonnement avancé |
| Documents complexes | `claude-3-5-sonnet` | Excellente analyse |

### Gemini
| Tâche | Modèle | Pourquoi |
|-------|--------|----------|
| Texte classique | `gemini-2.0-flash-exp` | Rapide, multimodal |
| Documents complexes | `gemini-2.0-flash-exp` | Support natif documents |

### NVIDIA NIM
| Tâche | Modèle | Pourquoi |
|-------|--------|----------|
| Texte classique | `llama-3.1-8b-instruct` | Haute performance |

### Ollama (inference locale)
| Tâche | Modèle | Pourquoi |
|-------|--------|----------|
| Texte classique | `gemma3:4b` | Inference hors-ligne, confidentialite |

---

## Implementation technique

### Composants concernes

#### Agent Runtime (`agents/agent-runtime/`, port 8025)

Le moteur d'execution universel gere la configuration multi-LLM :
- `TaskType` enum : `text_chat`, `document_analysis`, `image_analysis`
- `LLMConfig` et `MultiLLMConfig` : modeles de configuration par type de tache
- Detection automatique du type de tache selon le contenu de la requete
- Resolution dynamique du connecteur LLM a utiliser
- Detection des documents professionnels (CCTP, RFP, etc.)
- Transmission du contexte professionnel a la moderation

#### Moderation (`tools/prompt-moderation-tool/`, port 8013)
- Champs de requete : `is_professional_document`, `document_type`, `has_attachments`
- Logique de moderation adaptee au contexte professionnel
- Patterns de confidentialite relaxes pour documents professionnels

#### Connecteurs LLM disponibles
- Mistral (port 8005), OpenAI (port 8006), Anthropic (port 8024)
- Gemini (port 8023), Perplexity (port 8022), NVIDIA NIM (port 8028)
- Ollama (port 8040) pour l'inference locale

---

## 🧪 Exemples d'Utilisation

### Exemple 1 : Document CCTP avec Auto-Détection
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Analyse ce CCTP et donne-moi les points clés",
      "documents": [
        {
          "name": "CCTP_Projet_IA.pdf",
          "type": "application/pdf",
          "content": "..."
        }
      ]
    }
  ]
}
```

**Résultat** :
- ✅ Document reconnu comme CCTP
- ✅ Modération adaptée (pas de blocage pour "confidentiel")
- ✅ Utilise `mistral-large-latest` automatiquement

### Exemple 2 : Image avec Configuration Personnalisée
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Que vois-tu sur cette image ?",
      "images": ["data:image/jpeg;base64,..."]
    }
  ],
  "multi_llm_config": {
    "image_analysis": {
      "provider": "openai",
      "model": "gpt-4o",
      "temperature": 0.3,
      "max_tokens": 2048
    }
  }
}
```

**Résultat** :
- ✅ Détection automatique : `task_type = image_analysis`
- ✅ Utilise GPT-4o avec vision
- ✅ Configuration personnalisée appliquée

### Exemple 3 : Texte Simple
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explique-moi le concept de microservices"
    }
  ]
}
```

**Résultat** :
- ✅ Utilise la config par défaut : `mistral-small-latest`
- ✅ Modération standard
- ✅ Rapide et économique

---

## 🎓 Recommandations

### Quand Utiliser Quel Modèle ?

#### Mistral Small (Texte)
- Questions simples
- Chat conversationnel
- Traductions basiques
- Code simple

#### Mistral Large (Documents)
- Documents techniques (CCTP, RFP)
- Analyses complexes
- Synthèses de documents longs
- Raisonnement avancé

#### Pixtral (Images)
- Analyse de schémas
- Extraction de texte d'images
- Descriptions visuelles
- OCR et reconnaissance

---

## 📝 Notes Importantes

1. **Rétrocompatibilité** : L'ancienne configuration (`provider`, `model`, `temperature`) fonctionne toujours
2. **Auto-détection** : Le système choisit le bon modèle si vous ne spécifiez pas `task_type`
3. **Documents Professionnels** : Reconnaissance automatique par nom de fichier
4. **Modération Intelligente** : S'adapte au contexte professionnel

---

## 🐛 Résolution de Problèmes

### Mon document CCTP est toujours bloqué
- ✅ Vérifiez que le nom du fichier contient "CCTP" ou "cahier des clauses"
- ✅ Ou ajoutez `"is_professional_document": true` dans la requête

### Le mauvais modèle est utilisé
- ✅ Spécifiez explicitement `task_type` dans la requête
- ✅ Ou utilisez `multi_llm_config` pour forcer un modèle

### Erreur "model not found"
- ✅ Vérifiez que le modèle existe chez le provider
- ✅ Mistral : `mistral-small-latest`, `mistral-large-latest`, `pixtral-12b-2409`
- ✅ OpenAI : `gpt-4o-mini`, `gpt-4o`

---

## Support

Pour toute question ou probleme :
1. Consultez ce document
2. Consultez les logs de l'Agent Runtime : `docker-compose logs -f agent-runtime`
3. Consultez la documentation dans `docs/`
