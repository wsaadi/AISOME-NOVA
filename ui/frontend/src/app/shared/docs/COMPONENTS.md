# Documentation des Briques Graphiques

Cette documentation présente les composants réutilisables de l'interface utilisateur de la plateforme.

## Table des matières

1. [Custom Button](#custom-button)
2. [Custom Form](#custom-form)
3. [PDF Viewer](#pdf-viewer)

---

## Custom Button

Composant de bouton personnalisable avec support des variants, tailles, icônes et états de chargement.

### Import

```typescript
import { CustomButtonComponent } from './shared/components/custom-button/custom-button.component';
```

### Utilisation de base

```html
<app-custom-button
  label="Cliquez-moi"
  variant="primary"
  (onClick)="handleClick()">
</app-custom-button>
```

### Propriétés

| Propriété | Type | Par défaut | Description |
|-----------|------|------------|-------------|
| `label` | `string` | `'Button'` | Texte du bouton |
| `variant` | `ButtonVariant` | `'primary'` | Variante de couleur (`primary`, `secondary`, `success`, `danger`, `warning`, `info`) |
| `size` | `ButtonSize` | `'medium'` | Taille du bouton (`small`, `medium`, `large`) |
| `disabled` | `boolean` | `false` | Désactiver le bouton |
| `loading` | `boolean` | `false` | Afficher un spinner de chargement |
| `icon` | `string` | `undefined` | Classe d'icône (ex: `'fa fa-check'`) |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Position de l'icône |
| `fullWidth` | `boolean` | `false` | Bouton pleine largeur |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Type HTML du bouton |

### Événements

| Événement | Type | Description |
|-----------|------|-------------|
| `onClick` | `EventEmitter<MouseEvent>` | Émis lors du clic (si pas désactivé ou en chargement) |

### Exemples

```html
<!-- Bouton primaire simple -->
<app-custom-button
  label="Enregistrer"
  variant="primary"
  (onClick)="save()">
</app-custom-button>

<!-- Bouton avec icône -->
<app-custom-button
  label="Télécharger"
  variant="success"
  icon="fa fa-download"
  (onClick)="download()">
</app-custom-button>

<!-- Bouton avec état de chargement -->
<app-custom-button
  label="Chargement..."
  variant="primary"
  [loading]="isLoading"
  (onClick)="submit()">
</app-custom-button>

<!-- Bouton danger désactivé -->
<app-custom-button
  label="Supprimer"
  variant="danger"
  [disabled]="true">
</app-custom-button>

<!-- Grand bouton pleine largeur -->
<app-custom-button
  label="Continuer"
  variant="primary"
  size="large"
  [fullWidth]="true"
  (onClick)="continue()">
</app-custom-button>
```

---

## Custom Form

Composant de formulaire multi-champs configurable avec validation intégrée.

### Import

```typescript
import { CustomFormComponent, FormConfig, FormField } from './shared/components/custom-form/custom-form.component';
```

### Utilisation de base

```typescript
// Dans le composant TypeScript
formConfig: FormConfig = {
  fields: [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'votre@email.com'
    },
    {
      name: 'password',
      label: 'Mot de passe',
      type: 'password',
      required: true,
      helpText: 'Au moins 8 caractères'
    }
  ],
  submitLabel: 'Se connecter',
  showReset: false
};

onFormSubmit(data: any) {
  console.log('Données du formulaire:', data);
}
```

```html
<app-custom-form
  [config]="formConfig"
  (onSubmit)="onFormSubmit($event)">
</app-custom-form>
```

### Configuration (FormConfig)

| Propriété | Type | Par défaut | Description |
|-----------|------|------------|-------------|
| `fields` | `FormField[]` | - | Liste des champs du formulaire |
| `submitLabel` | `string` | `'Soumettre'` | Texte du bouton de soumission |
| `resetLabel` | `string` | `'Réinitialiser'` | Texte du bouton de réinitialisation |
| `showReset` | `boolean` | `false` | Afficher le bouton de réinitialisation |
| `layout` | `'vertical' \| 'horizontal'` | `'vertical'` | Disposition du formulaire |

### Champ (FormField)

| Propriété | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Nom du champ (requis) |
| `label` | `string` | Label du champ (requis) |
| `type` | `FieldType` | Type de champ: `text`, `email`, `password`, `number`, `tel`, `url`, `textarea`, `select`, `checkbox`, `radio`, `date` |
| `placeholder` | `string` | Texte de placeholder |
| `required` | `boolean` | Champ obligatoire |
| `disabled` | `boolean` | Champ désactivé |
| `value` | `any` | Valeur par défaut |
| `options` | `Array<{value, label}>` | Options pour select/radio |
| `validators` | `any[]` | Validateurs Angular supplémentaires |
| `rows` | `number` | Nombre de lignes (textarea) |
| `min` | `number` | Valeur minimale (number) |
| `max` | `number` | Valeur maximale (number) |
| `pattern` | `string` | Pattern de validation |
| `helpText` | `string` | Texte d'aide |

### Événements

| Événement | Type | Description |
|-----------|------|-------------|
| `onSubmit` | `EventEmitter<any>` | Émis lors de la soumission avec les données |
| `onReset` | `EventEmitter<void>` | Émis lors de la réinitialisation |
| `onChange` | `EventEmitter<any>` | Émis à chaque changement de valeur |

### Exemples

```typescript
// Formulaire d'inscription complet
registrationForm: FormConfig = {
  fields: [
    {
      name: 'username',
      label: 'Nom d\'utilisateur',
      type: 'text',
      required: true,
      pattern: '^[a-zA-Z0-9_]{3,20}$',
      helpText: '3-20 caractères alphanumériques'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true
    },
    {
      name: 'password',
      label: 'Mot de passe',
      type: 'password',
      required: true,
      min: 8
    },
    {
      name: 'age',
      label: 'Âge',
      type: 'number',
      min: 18,
      max: 120,
      required: true
    },
    {
      name: 'country',
      label: 'Pays',
      type: 'select',
      required: true,
      options: [
        { value: 'fr', label: 'France' },
        { value: 'be', label: 'Belgique' },
        { value: 'ch', label: 'Suisse' }
      ]
    },
    {
      name: 'bio',
      label: 'Biographie',
      type: 'textarea',
      rows: 5,
      helpText: 'Parlez-nous de vous'
    },
    {
      name: 'terms',
      label: 'J\'accepte les conditions',
      type: 'checkbox',
      required: true,
      placeholder: 'J\'accepte les conditions d\'utilisation'
    }
  ],
  submitLabel: 'S\'inscrire',
  showReset: true,
  layout: 'vertical'
};
```

---

## PDF Viewer

Composant de visualisation de fichiers PDF avec contrôles de navigation et zoom.

### Import

```typescript
import { PdfViewerComponent, PDFViewerConfig } from './shared/components/pdf-viewer/pdf-viewer.component';
```

### Utilisation de base

```typescript
// Dans le composant TypeScript
pdfUrl = 'https://example.com/document.pdf';

pdfConfig: PDFViewerConfig = {
  showToolbar: true,
  showNavigation: true,
  showZoom: true,
  showDownload: true,
  initialZoom: 1.0
};

onPageChange(page: number) {
  console.log('Page actuelle:', page);
}
```

```html
<app-pdf-viewer
  [src]="pdfUrl"
  [config]="pdfConfig"
  (onPageChange)="onPageChange($event)">
</app-pdf-viewer>
```

### Propriétés

| Propriété | Type | Par défaut | Description |
|-----------|------|------------|-------------|
| `src` | `string \| Blob \| ArrayBuffer` | - | Source du PDF (URL, Blob ou ArrayBuffer) |
| `config` | `PDFViewerConfig` | - | Configuration du viewer |

### Configuration (PDFViewerConfig)

| Propriété | Type | Par défaut | Description |
|-----------|------|------------|-------------|
| `showToolbar` | `boolean` | `true` | Afficher la barre d'outils |
| `showNavigation` | `boolean` | `true` | Afficher les contrôles de navigation |
| `showZoom` | `boolean` | `true` | Afficher les contrôles de zoom |
| `showDownload` | `boolean` | `true` | Afficher le bouton de téléchargement |
| `showPrint` | `boolean` | `true` | Afficher le bouton d'impression |
| `initialZoom` | `number` | `1.0` | Zoom initial (1.0 = 100%) |
| `maxZoom` | `number` | `3.0` | Zoom maximal |
| `minZoom` | `number` | `0.5` | Zoom minimal |

### Événements

| Événement | Type | Description |
|-----------|------|-------------|
| `onLoad` | `EventEmitter<any>` | Émis lorsque le PDF est chargé |
| `onError` | `EventEmitter<any>` | Émis en cas d'erreur |
| `onPageChange` | `EventEmitter<number>` | Émis lors du changement de page |

### Exemples

```typescript
// Charger depuis une URL
pdfUrl = 'https://example.com/document.pdf';
```

```html
<app-pdf-viewer [src]="pdfUrl"></app-pdf-viewer>
```

```typescript
// Charger depuis un Blob
loadPdfFromBlob() {
  fetch('/api/pdf')
    .then(response => response.blob())
    .then(blob => {
      this.pdfBlob = blob;
    });
}
```

```html
<app-pdf-viewer [src]="pdfBlob"></app-pdf-viewer>
```

```typescript
// Configuration personnalisée
customConfig: PDFViewerConfig = {
  showToolbar: true,
  showNavigation: true,
  showZoom: true,
  showDownload: false, // Désactiver le téléchargement
  showPrint: false,    // Désactiver l'impression
  initialZoom: 1.2,
  maxZoom: 2.0,
  minZoom: 0.75
};
```

---

## Intégration

### 1. Importer les composants

Les composants sont standalone et peuvent être importés directement :

```typescript
import { CustomButtonComponent } from './shared/components/custom-button/custom-button.component';
import { CustomFormComponent } from './shared/components/custom-form/custom-form.component';
import { PdfViewerComponent } from './shared/components/pdf-viewer/pdf-viewer.component';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [
    CommonModule,
    CustomButtonComponent,
    CustomFormComponent,
    PdfViewerComponent
  ],
  // ...
})
export class MyComponent {
  // ...
}
```

### 2. Utiliser dans les templates

```html
<!-- Bouton -->
<app-custom-button
  label="Action"
  variant="primary"
  (onClick)="handleAction()">
</app-custom-button>

<!-- Formulaire -->
<app-custom-form
  [config]="formConfig"
  (onSubmit)="handleSubmit($event)">
</app-custom-form>

<!-- PDF Viewer -->
<app-pdf-viewer
  [src]="pdfUrl"
  [config]="pdfConfig">
</app-pdf-viewer>
```

## Support et Contribution

Pour toute question ou suggestion d'amélioration, consultez le README principal du projet.
