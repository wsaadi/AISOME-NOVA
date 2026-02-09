# Documentation UI - Composants et Pages

## Vue d'ensemble

Cette documentation présente l'architecture complète de l'interface utilisateur du projet. L'application est construite avec **Angular 20** en mode standalone avec une architecture moderne et scalable.

### Stack technique
- **Framework:** Angular 20 (composants standalone)
- **Styles:** SCSS avec variables CSS personnalisées
- **Composants UI:** Material Design (Angular Material)
- **Validation:** Reactive Forms
- **Graphiques:** Chart.js
- **Traduction:** ngx-translate
- **HTTP:** HttpClient avec RxJS

---

## Composants partagés (11)

Les composants partagés sont réutilisables dans toute l'application. Ils sont situés dans `/ui/frontend/src/app/shared/components/`.

### 1. Charts (Graphiques)

Le module Charts contient 4 types de graphiques différents, tous utilisant **Chart.js** en mode asynchrone pour optimiser les performances.

#### Bar Chart (Graphique en barres)
**Objectif:** Afficher des données comparatives sous forme de barres verticales ou horizontales.

**Props/Inputs:**
- `data: ChartData` - Données du graphique (obligatoire)
- `options?: ChartOptions` - Options de configuration Chart.js
- `height: number = 400` - Hauteur du canvas en pixels
- `orientation: 'vertical' | 'horizontal' = 'vertical'` - Orientation des barres
- `showLegend: boolean = true` - Afficher la légende
- `animate: boolean = true` - Activer les animations
- `stacked: boolean = false` - Mode empilé

**Événements/Outputs:** Aucun événement (affichage seul)

**Méthodes publiques:**
- `updateChart(newData: ChartData)` - Mettre à jour les données
- `refresh()` - Rafraîchir l'affichage

**Exemple:**
```typescript
chartData: ChartData = {
  labels: ['Produit A', 'Produit B', 'Produit C'],
  datasets: [{
    label: 'Ventes Q1',
    data: [12, 19, 3],
    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
  }]
};
```

```html
<app-bar-chart
  [data]="chartData"
  [height]="400"
  [orientation]="'vertical'"
  [showLegend]="true">
</app-bar-chart>
```

---

#### Pie Chart (Graphique en camembert)
**Objectif:** Afficher les parts de marché ou proportions.

**Props/Inputs:**
- `data: ChartData` - Données du graphique (obligatoire)
- `options?: ChartOptions` - Options de configuration
- `height: number = 400` - Hauteur du canvas
- `showLegend: boolean = true` - Afficher la légende
- `legendPosition: 'top' | 'bottom' | 'left' | 'right' = 'right'` - Position de la légende
- `animate: boolean = true` - Activer les animations
- `showPercentage: boolean = true` - Afficher les pourcentages dans les tooltips

**Exemple:**
```html
<app-pie-chart
  [data]="chartData"
  [showLegend]="true"
  [legendPosition]="'right'"
  [showPercentage]="true">
</app-pie-chart>
```

---

#### Line Chart (Graphique en ligne)
**Objectif:** Afficher l'évolution des données dans le temps.

**Props/Inputs:**
- `data: ChartData` - Données du graphique (obligatoire)
- `options?: ChartOptions` - Options de configuration
- `height: number = 400` - Hauteur du canvas
- `showLegend: boolean = true` - Afficher la légende
- `animate: boolean = true` - Activer les animations

**Exemple:**
```typescript
chartData: ChartData = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai'],
  datasets: [{
    label: 'Ventes 2024',
    data: [65, 59, 80, 81, 56],
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    tension: 0.4
  }]
};
```

---

#### Donut Chart (Graphique en donut)
**Objectif:** Afficher les proportions avec un design en anneau.

**Props/Inputs:**
- `data: ChartData` - Données du graphique (obligatoire)
- `options?: ChartOptions` - Options de configuration
- `height: number = 400` - Hauteur du canvas
- `showLegend: boolean = true` - Afficher la légende
- `legendPosition: 'top' | 'bottom' | 'left' | 'right' = 'right'` - Position de la légende
- `animate: boolean = true` - Activer les animations
- `showPercentage: boolean = true` - Afficher les pourcentages
- `cutout: number = 70` - Pourcentage du trou au centre (0-100)
- `centerText: string = ''` - Texte à afficher au centre

**Méthodes publiques:**
- `updateChart(newData: ChartData)` - Mettre à jour les données
- `updateCenterText(text: string)` - Mettre à jour le texte du centre
- `refresh()` - Rafraîchir l'affichage

**Exemple:**
```html
<app-donut-chart
  [data]="chartData"
  [cutout]="70"
  [centerText]="'Total: 100'">
</app-donut-chart>
```

---

### 2. Checkbox

**Objectif:** Sélection binaire avec label et description optionnelle.

**Props/Inputs:**
- `label: string = ''` - Étiquette affichée
- `description: string = ''` - Description supplémentaire
- `disabled: boolean = false` - État désactivé
- `required: boolean = false` - Champ obligatoire
- `error: string = ''` - Message d'erreur
- `size: 'small' | 'medium' | 'large' = 'medium'` - Taille
- `indeterminate: boolean = false` - État indéterminé

**Événements/Outputs:**
- `valueChange: EventEmitter<boolean>` - Émis lors de changement

**ControlValueAccessor:** Oui (compatible avec [(ngModel)])

**Exemple:**
```html
<app-checkbox
  [label]="'J\'accepte les conditions'"
  [description]="'En cochant, vous acceptez nos CGU'"
  [(ngModel)]="isAccepted"
  (valueChange)="handleChange($event)">
</app-checkbox>
```

---

### 3. Custom Button

**Objectif:** Bouton personnalisable avec plusieurs variantes et états.

**Props/Inputs:**
- `label: string = 'Button'` - Texte du bouton
- `variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' = 'primary'` - Variante de style
- `size: 'small' | 'medium' | 'large' = 'medium'` - Taille du bouton
- `disabled: boolean = false` - État désactivé
- `loading: boolean = false` - État de chargement (affiche un spinner)
- `icon?: string` - Classe Font Awesome (ex: 'fa fa-check')
- `iconPosition: 'left' | 'right' = 'left'` - Position de l'icône
- `fullWidth: boolean = false` - Prendre 100% de la largeur
- `type: 'button' | 'submit' | 'reset' = 'button'` - Type HTML

**Événements/Outputs:**
- `onClick: EventEmitter<MouseEvent>` - Clique sur le bouton

**Exemple:**
```html
<app-custom-button
  label="Envoyer"
  variant="primary"
  size="medium"
  icon="fa fa-paper-plane"
  iconPosition="right"
  [disabled]="!isValid"
  [loading]="isSubmitting"
  (onClick)="handleSubmit()">
</app-custom-button>
```

---

### 4. Custom Form

**Objectif:** Formulaire dynamique multi-champs basé sur une configuration.

**Props/Inputs:**
- `config: FormConfig` - Configuration du formulaire (obligatoire)

**Configuration FormConfig:**
```typescript
interface FormConfig {
  fields: FormField[];
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  layout?: 'vertical' | 'horizontal';
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: any;
  options?: { value: any; label: string }[];
  validators?: any[];
  rows?: number; // Pour textarea
  min?: number; // Pour number
  max?: number; // Pour number
  pattern?: string;
  helpText?: string;
}
```

**Événements/Outputs:**
- `onSubmit: EventEmitter<any>` - Données du formulaire validé
- `onReset: EventEmitter<void>` - Réinitialisation du formulaire
- `onChange: EventEmitter<any>` - Changement de valeur

**Exemple:**
```typescript
formConfig: FormConfig = {
  fields: [
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Mot de passe', type: 'password', required: true },
    { name: 'age', label: 'Âge', type: 'number', min: 18, max: 100 }
  ],
  submitLabel: 'Envoyer',
  showReset: true
};

onFormSubmit(data: any) {
  console.log('Form data:', data);
}
```

```html
<app-custom-form
  [config]="formConfig"
  (onSubmit)="onFormSubmit($event)">
</app-custom-form>
```

---

### 5. File Upload

**Objectif:** Upload de fichiers avec drag-and-drop et validation.

**Props/Inputs:**
- `accept: string = '.pdf,.docx,.xlsx,...'` - Extensions acceptées
- `multiple: boolean = true` - Sélection multiple
- `maxSize: number = 50` - Taille maximale en MB
- `maxFiles: number = 10` - Nombre maximum de fichiers
- `disabled: boolean = false` - État désactivé
- `label: string = 'Déposer des fichiers ici'` - Texte principal
- `hint: string = 'ou cliquez pour sélectionner'` - Texte secondaire
- `showPreview: boolean = true` - Afficher les aperçus

**Événements/Outputs:**
- `filesSelected: EventEmitter<UploadedFile[]>` - Fichiers sélectionnés
- `filesRemoved: EventEmitter<UploadedFile[]>` - Fichiers supprimés
- `error: EventEmitter<string>` - Erreur de validation

**ControlValueAccessor:** Oui (compatible avec [(ngModel)])

**Interface UploadedFile:**
```typescript
interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string; // Base64 pour les images
}
```

**Exemple:**
```html
<app-file-upload
  [accept]="'.pdf,.docx,.xlsx'"
  [multiple]="true"
  [maxSize]="50"
  [maxFiles]="10"
  (filesSelected)="handleFiles($event)"
  (error)="handleError($event)">
</app-file-upload>
```

---

### 6. Markdown Viewer

**Objectif:** Afficher du contenu texte formaté en Markdown (sans dépendance externe).

**Props/Inputs:**
- `content: string = ''` - Contenu Markdown à afficher
- `showLineNumbers: boolean = false` - Afficher les numéros de ligne
- `title: string = ''` - Titre optionnel
- `maxHeight: string = 'auto'` - Hauteur maximale du conteneur

**Fonctionnalités:**
- Support des en-têtes (# à ######)
- Gras (**text** ou __text__)
- Italique (*text* ou _text_)
- Code inline (`code`)
- Listes à puces (- ou *)
- Tableaux Markdown
- Lignes horizontales (---)
- Paragraphes (double saut de ligne)

**Exemple:**
```html
<app-markdown-viewer
  [content]="markdownContent"
  [showLineNumbers]="false"
  [title]="'Synthèse'">
</app-markdown-viewer>
```

---

### 7. PDF Viewer

**Objectif:** Lecteur PDF avec toolbars de navigation et zoom.

**Props/Inputs:**
- `src: string | Blob | ArrayBuffer` - Source du PDF
- `config: PDFViewerConfig` - Configuration optionnelle

**Configuration PDFViewerConfig:**
```typescript
interface PDFViewerConfig {
  showToolbar?: boolean;
  showNavigation?: boolean;
  showZoom?: boolean;
  showDownload?: boolean;
  showPrint?: boolean;
  initialZoom?: number;
  maxZoom?: number;
  minZoom?: number;
}
```

**Événements/Outputs:**
- `onLoad: EventEmitter<any>` - PDF chargé
- `onError: EventEmitter<any>` - Erreur de chargement
- `onPageChange: EventEmitter<number>` - Changement de page

**Méthodes publiques:**
- `previousPage()` - Aller à la page précédente
- `nextPage()` - Aller à la page suivante
- `goToPage(page: number)` - Aller à une page spécifique
- `zoomIn()` - Augmenter le zoom
- `zoomOut()` - Diminuer le zoom
- `resetZoom()` - Réinitialiser le zoom
- `downloadPDF()` - Télécharger le PDF
- `printPDF()` - Imprimer le PDF

**Exemple:**
```typescript
pdfConfig: PDFViewerConfig = {
  showToolbar: true,
  showNavigation: true,
  showZoom: true,
  showDownload: true,
  initialZoom: 1.0
};

onPageChange(page: number) {
  console.log('Current page:', page);
}
```

```html
<app-pdf-viewer
  [src]="pdfUrl"
  [config]="pdfConfig"
  (onPageChange)="onPageChange($event)">
</app-pdf-viewer>
```

---

### 8. Progress Bar

**Objectif:** Barre de progression avec plusieurs variantes de couleur.

**Props/Inputs:**
- `value: number = 0` - Valeur actuelle (0-100)
- `max: number = 100` - Valeur maximale
- `variant: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'primary'` - Couleur
- `size: 'small' | 'medium' | 'large' = 'medium'` - Taille
- `showLabel: boolean = true` - Afficher le label
- `animated: boolean = false` - Animation de progression
- `striped: boolean = false` - Motif rayé
- `label: string = ''` - Label personnalisé
- `labelPosition: 'inside' | 'outside' = 'inside'` - Position du label

**Exemple:**
```html
<app-progress-bar
  [value]="75"
  [max]="100"
  variant="primary"
  size="medium"
  [showLabel]="true"
  [animated]="true">
</app-progress-bar>
```

---

### 9. Radio Button

**Objectif:** Sélection exclusive entre plusieurs options.

**Props/Inputs:**
- `options: RadioOption[] = []` - Options disponibles
- `name: string = ''` - Nom du groupe radio
- `label: string = ''` - Label du groupe
- `layout: 'horizontal' | 'vertical' = 'vertical'` - Disposition
- `disabled: boolean = false` - État désactivé
- `required: boolean = false` - Champ obligatoire
- `error: string = ''` - Message d'erreur

**Interface RadioOption:**
```typescript
interface RadioOption {
  label: string;
  value: any;
  disabled?: boolean;
  description?: string;
}
```

**Événements/Outputs:**
- `valueChange: EventEmitter<any>` - Changement de sélection

**ControlValueAccessor:** Oui

**Exemple:**
```typescript
radioOptions: RadioOption[] = [
  { label: 'Carte bancaire', value: 'card' },
  { label: 'Virement', value: 'transfer' },
  { label: 'Chèque', value: 'check' }
];
```

```html
<app-radio-button
  [options]="radioOptions"
  [name]="'payment-method'"
  [label]="'Méthode de paiement'"
  [layout]="'vertical'"
  [(ngModel)]="selectedMethod">
</app-radio-button>
```

---

### 10. Select

**Objectif:** Liste déroulante personnalisée.

**Props/Inputs:**
- `options: SelectOption[] = []` - Options disponibles
- `label: string = ''` - Label
- `placeholder: string = 'Sélectionnez une option'` - Placeholder
- `disabled: boolean = false` - État désactivé
- `required: boolean = false` - Champ obligatoire
- `error: string = ''` - Message d'erreur
- `helpText: string = ''` - Texte d'aide
- `size: 'small' | 'medium' | 'large' = 'medium'` - Taille

**Interface SelectOption:**
```typescript
interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}
```

**Événements/Outputs:**
- `valueChange: EventEmitter<any>` - Changement de sélection

**ControlValueAccessor:** Oui

**Exemple:**
```typescript
options: SelectOption[] = [
  { label: 'Option 1', value: 'opt1' },
  { label: 'Option 2', value: 'opt2' },
  { label: 'Option 3', value: 'opt3' }
];
```

```html
<app-select
  [options]="options"
  [label]="'Choisir une option'"
  [placeholder]="'Sélectionnez...'"
  [(ngModel)]="selectedValue"
  (valueChange)="handleChange($event)">
</app-select>
```

---

### 11. Text Input

**Objectif:** Champ texte personnalisable avec support d'icône.

**Props/Inputs:**
- `label: string = ''` - Label
- `placeholder: string = ''` - Placeholder
- `type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' = 'text'` - Type de champ
- `disabled: boolean = false` - État désactivé
- `required: boolean = false` - Champ obligatoire
- `error: string = ''` - Message d'erreur
- `helpText: string = ''` - Texte d'aide
- `size: 'small' | 'medium' | 'large' = 'medium'` - Taille
- `icon: string = ''` - Classe Font Awesome
- `iconPosition: 'left' | 'right' = 'left'` - Position de l'icône
- `maxLength?: number` - Longueur maximale
- `minLength?: number` - Longueur minimale
- `pattern?: string` - Pattern regex
- `autocomplete: string = 'off'` - Type autocomplete
- `showCharacterCount: boolean = false` - Afficher le compteur

**Événements/Outputs:**
- `valueChange: EventEmitter<string>` - Changement de valeur
- `onBlur: EventEmitter<void>` - Perte du focus
- `onFocus: EventEmitter<void>` - Gain du focus

**ControlValueAccessor:** Oui

**Exemple:**
```html
<app-text-input
  [label]="'Email'"
  [placeholder]="'vous@exemple.com'"
  [type]="'email'"
  [required]="true"
  [icon]="'fa fa-envelope'"
  [showCharacterCount]="true"
  [maxLength]="100"
  [(ngModel)]="email"
  (valueChange)="handleChange($event)">
</app-text-input>
```

---

## Pages applicatives (9)

Les pages sont des composants complets situés dans `/ui/frontend/src/app/pages/`.

### 1. Home

**Objectif:** Page d'accueil avec présentation générale de l'application.

**Fonctionnalités:**
- Hero section avec gradient et animations
- Grille de features avec cartes interactives
- Section statistiques avec cartes de stat
- Animations CSS fluides et modernes
- Navigation vers Dashboard et Profile

**Composants utilisés:**
- Material Card, Icon, Button
- Translations (i18n)

**Template features:**
```html
- Badge avec icône "stars"
- Titre avec gradient text
- Sous-titre descriptif
- Boutons d'action (Dashboard, Profile)
- Icônes flottantes animées
- Grille de 6 features cards
- Statistiques animées
```

**Responsive:** Oui (breakpoint 768px)

---

### 2. Dashboard

**Objectif:** Vue d'ensemble avec statistiques et activité récente.

**Fonctionnalités:**
- 4 cartes statistiques avec tendances
- Graphiques de progression
- Section d'activité récente avec timeline
- Actions rapides pour accès directs
- Animations au chargement
- Bouton Actualiser

**Composants utilisés:**
- Material Card, Icon, Button, ProgressBar
- Signals Angular (réactivité)

**Données affichées:**
- Utilisateurs actifs: 2,543 (+12.5%)
- Revenus mensuels: 45.2K€ (+8.3%)
- Taux de conversion: 3.48% (+2.1%)
- Satisfaction client: 4.8/5 (+0.3)
- Activité: Nouveaux utilisateurs, commandes, avis, alertes

**Responsive:** Oui (layout adapté pour mobile)

---

### 3. Profile

**Objectif:** Affichage du profil utilisateur avec statistiques.

**Fonctionnalités:**
- En-tête avec bannière dégradée
- Avatar utilisateur avec statut
- Affichage des rôles sous forme de chips
- Informations de contact
- Statistiques (sessions, temps, tâches)
- Tous les rôles chargés depuis RoleService

**Composants utilisés:**
- Material Card, Icon, Chips
- RoleService pour les rôles

**Données affichées:**
- Nom d'utilisateur
- Email
- Rôles et permissions
- Dernière connexion
- Sessions: 24
- Temps total: 12h
- Tâches: 156

---

### 4. Settings

**Objectif:** Paramètres utilisateur (thème, langue, notifications).

**Fonctionnalités:**
- Toggle mode sombre/clair
- Sélection de langue (FR/EN)
- Notifications par email et push
- Authentification 2FA
- Historique d'activité
- Gestion des préférences

**Sections:**
1. **Apparence:** Mode sombre
2. **Langue & Région:** Sélection langue
3. **Notifications:** Email et push
4. **Confidentialité & Sécurité:** 2FA et historique

**Composants utilisés:**
- Material SlideToggle, Select, FormField
- ThemeService pour le thème
- TranslateService pour la langue

---

### 5. Agent Settings

**Objectif:** Paramètres spécifiques aux agents IA (Mistral API).

**Fonctionnalités:**
- Configuration de la clé API Mistral
- Sélection du modèle (Small, Medium, Large)
- Paramétrage de température
- Paramétrage du nombre de tokens
- Sauvegarde en localStorage
- Réinitialisation des paramètres

**Champs:**
- Clé API Mistral (texte)
- Modèle par défaut (select)
- Température: 0.7 (range)
- Max tokens: 4096 (nombre)

**Actions:**
- Sauvegarder les paramètres
- Réinitialiser tous les paramètres
- Retour à l'agent précédent

---

### 6. Agents Catalog

**Objectif:** Catalogue de tous les agents IA disponibles.

**Fonctionnalités:**
- Affichage en grille de tous les agents
- Filtrage par catégorie
- Recherche textuelle
- Statuts: Active, Beta, Coming-soon
- Configuration par agent
- Navigation vers les agents actifs

**Agents:**
1. **Analyse d'appel d'offre** - Analyse préliminaire CCTP
2. **Préparateur de rendez-vous** - Préparation commerciale
3. **Assistant IA Professionnel** - Chat gouverné avec modération
4. **Extracteur de Données** - Extraction depuis documents
5. **Générateur de Rapports** - Génération Word (Beta)
6. **Analyseur de Contrats** - Analyse juridique (Coming-soon)

**Catégories:**
- Analyse documentaire
- Commercial
- Assistant IA
- Extraction
- Génération
- Analyse juridique

**Filtrage:** Par catégorie ou recherche textuelle

---

### 7. AI Chat

**Objectif:** Interface de chat gouvernée avec modération et classification.

**Fonctionnalités principales:**
- Chat conversationnel avec historique
- Support de Mistral et OpenAI
- Upload d'images en base64
- Upload de documents (PDFs, Word, Excel)
- Modération des prompts (strict/permissive)
- Classification du contenu (professionnel/non-professionnel)
- Affichage des métadonnées
- Blocage des messages non conformes
- Gestion des erreurs détaillée
- Support du multipart/form-data pour gros fichiers

**Configuration:**
- Provider: Mistral ou OpenAI
- Modèle: Sélectionnable
- Température: 0 à 1
- Max tokens: configurable
- Clés API pour chaque provider
- Mode modération strict

**Messages bloqués:**
- Affichage du message de refus
- Métadonnées de modération
- Classification de la demande
- Score professionnel

**Exemple d'utilisation:**
```typescript
// Configuration
this.provider = 'mistral';
this.model = 'mistral-small-latest';
this.temperature = 0.7;

// Envoi de message
await this.sendMessage();

// Avec documents
onDocumentSelect(event);
```

---

### 8. Appointment Scheduler

**Objectif:** Préparation de rendez-vous commerciaux avec analyse IA.

**Fonctionnalités:**
- Formulaire de saisie du rendez-vous
- Recherche et analyse de l'entreprise
- Analyse du contact
- Recommandations commerciales
- Génération de présentation PowerPoint
- Affichage du résumé exécutif
- Barre de progression
- Sauvegarde de la configuration

**Champs du formulaire:**
- Date du rendez-vous
- Nom de l'entreprise
- Nom du contact
- Position du contact
- Objectif du rendez-vous

**Résultats:**
- Analyse de l'entreprise (actualités, marché)
- Analyse du contact (background, activités)
- Recommandations (points de discussion, questions)
- Résumé exécutif
- Fichier PowerPoint généré

**API Response:**
```typescript
interface SchedulerResult {
  success: boolean;
  preparation_id: string;
  synthesis: AppointmentSynthesis;
  pptx_file_id: string;
  processing_time_seconds: number;
}
```

---

### 9. Document Analyzer

**Objectif:** Analyse de documents (CCTP, appels d'offre) avec synthèse.

**Fonctionnalités:**
- Upload multiple de documents (PDF, Word, Excel)
- Analyse avec Mistral AI
- Synthèse complète du document
- Extraction des informations clés
- Analyse des clauses
- Génération d'un fichier Word
- Barre de progression
- Gestion des erreurs

**Fichiers supportés:**
- PDF
- Word (.docx, .doc)
- Excel (.xlsx, .xls)
- PowerPoint (.pptx, .ppt)
- Texte (.txt)

**Configuration:**
- Clé API Mistral
- Modèle (Small, Medium, Large)
- Température
- Max tokens

**Résultats:**
```typescript
interface AnalysisResult {
  success: boolean;
  analysis_id: string;
  synthesis: {
    deadline: string;
    response_method: string;
    lots_summary: string;
    specifications_analysis: string;
    clauses_analysis: string;
    full_synthesis: string;
  };
  synthesis_word_file_id: string;
  processing_time_seconds: number;
}
```

**Actions:**
- Analyser les documents
- Télécharger le fichier Word
- Réinitialiser l'analyse

---

## Architecture et Patterns

### ControlValueAccessor
Plusieurs composants implémentent `ControlValueAccessor` pour être utilisés avec `[(ngModel)]` ou Reactive Forms:
- Checkbox
- File Upload
- Radio Button
- Select
- Text Input

### Service Architecture
- **ThemeService:** Gestion du thème (clair/sombre)
- **RoleService:** Gestion des rôles utilisateur
- **ChartService:** Utilitaires pour les graphiques
- **TranslateService:** Traductions (i18n)

### Validation
- Validators built-in: required, email, min, max, pattern
- Custom validators dans les composants
- Affichage des erreurs personnalisé

### Styling
- Utilisation de variables CSS (--primary-color, --text-primary, etc.)
- Gradients linéaires (135deg)
- Animations CSS fluides
- Classes CSS modulaires (BEM)
- Support du mode sombre

### Performance
- Composants standalone (moins de bundle)
- Chargement asynchrone des Charts
- OnPush change detection strategy
- Destruction automatique des ressources (OnDestroy)

---

## Guide d'utilisation

### Installation et configuration

```typescript
// Importer le composant dans votre module/page
import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload.component';

@Component({
  standalone: true,
  imports: [CustomButtonComponent, FileUploadComponent]
})
```

### Exemple complet: Formulaire avec upload

```typescript
// Composant
export class MyFormComponent {
  formConfig: FormConfig = {
    fields: [
      { name: 'name', label: 'Nom', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true }
    ],
    submitLabel: 'Envoyer'
  };

  uploadedFiles: UploadedFile[] = [];

  onFormSubmit(data: any) {
    console.log('Form:', data);
    console.log('Files:', this.uploadedFiles);
  }

  onFilesSelected(files: UploadedFile[]) {
    this.uploadedFiles = files;
  }
}
```

```html
<!-- Template -->
<app-custom-form [config]="formConfig" (onSubmit)="onFormSubmit($event)"></app-custom-form>

<app-file-upload
  [accept]="'.pdf,.docx'"
  [multiple]="true"
  (filesSelected)="onFilesSelected($event)">
</app-file-upload>

<app-custom-button
  label="Valider"
  variant="primary"
  [disabled]="uploadedFiles.length === 0"
  (onClick)="onFormSubmit({})">
</app-custom-button>
```

### Intégration avec les formulaires réactifs

```typescript
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export class MyComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      acceptTerms: [false, Validators.requiredTrue]
    });
  }
}
```

```html
<form [formGroup]="form">
  <app-text-input
    [label]="'Email'"
    [formControl]="form.get('email')">
  </app-text-input>

  <app-checkbox
    [label]="'J\'accepte les conditions'"
    [formControl]="form.get('acceptTerms')">
  </app-checkbox>

  <app-custom-button
    label="Envoyer"
    [disabled]="!form.valid"
    (onClick)="onSubmit()">
  </app-custom-button>
</form>
```

### Affichage de graphiques dynamiques

```typescript
export class DashboardComponent implements OnInit {
  chartData: ChartData = {
    labels: ['Jan', 'Fév', 'Mar'],
    datasets: []
  };

  @ViewChild(LineChartComponent) lineChart!: LineChartComponent;

  ngOnInit() {
    // Charger les données
    this.loadChartData();
  }

  loadChartData() {
    // Simulation API call
    this.chartData = {
      labels: ['Jan', 'Fév', 'Mar', 'Avr'],
      datasets: [{
        label: 'Ventes',
        data: [100, 150, 120, 180]
      }]
    };
  }

  updateChart() {
    // Mettre à jour le graphique
    this.lineChart.updateChart({
      labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai'],
      datasets: [{
        label: 'Ventes',
        data: [100, 150, 120, 180, 200]
      }]
    });
  }
}
```

---

## Bonnes pratiques

1. **Composants:** Utilisez les composants standalone
2. **Styling:** Définissez les variables CSS dans :root
3. **Validation:** Utilisez les Validators d'Angular
4. **Performance:** Limitez les re-renders avec OnPush
5. **Accessibilité:** Utilisez les bons rôles ARIA
6. **Traductions:** Utilisez les clés i18n.lang
7. **Erreurs:** Affichez les erreurs explicitement
8. **Upload:** Validez les fichiers côté client ET serveur

---

## Liens utiles

- [Angular Documentation](https://angular.io)
- [Angular Material](https://material.angular.io)
- [Chart.js Documentation](https://www.chartjs.org)
- [ngx-translate](https://github.com/ngx-translate/core)
- [Font Awesome Icons](https://fontawesome.com)

---

*Documentation générée le 2026-01-06*
*Version: 1.0*
*Architecture: Angular 20 Standalone Components*
