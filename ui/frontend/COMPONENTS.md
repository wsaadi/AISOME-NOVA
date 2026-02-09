# Bibliothèque de Composants - Documentation API

> Bibliothèque complète de composants graphiques réutilisables pour les agents intelligents

## 📋 Table des matières

- [Introduction](#introduction)
- [Installation](#installation)
- [Composants de formulaire](#composants-de-formulaire)
  - [Bouton Standard](#bouton-standard)
  - [Liste Déroulante (Select)](#liste-déroulante-select)
  - [Bouton Radio](#bouton-radio)
  - [Case à Cocher (Checkbox)](#case-à-cocher-checkbox)
  - [Champ Texte](#champ-texte)
- [Composants de graphiques](#composants-de-graphiques)
  - [Graphique en Ligne](#graphique-en-ligne)
  - [Graphique en Barres](#graphique-en-barres)
  - [Graphique Camembert (Pie)](#graphique-camembert-pie)
  - [Graphique Donut](#graphique-donut)
- [Service Chart](#service-chart)
- [Personnalisation](#personnalisation)

---

## Introduction

Cette bibliothèque fournit un ensemble de composants Angular standalone prêts à l'emploi pour créer des interfaces utilisateur modernes et professionnelles. Tous les composants sont :

- ✅ **Standalone** : Peuvent être importés individuellement sans module
- ✅ **Réactifs** : Supportent ngModel et les Reactive Forms
- ✅ **Personnalisables** : Nombreuses options de configuration
- ✅ **Documentés** : Documentation JSDoc complète
- ✅ **Accessibles** : Respectent les standards d'accessibilité
- ✅ **Typés** : Support complet TypeScript

---

## Installation

### Prérequis

```json
{
  "dependencies": {
    "@angular/core": "^20.3.0",
    "@angular/common": "^20.3.0",
    "@angular/forms": "^20.3.0",
    "chart.js": "^4.4.1"
  }
}
```

### Installation des dépendances

```bash
npm install chart.js
```

### Import des composants

Les composants sont standalone et peuvent être importés directement :

```typescript
import { CustomButtonComponent } from './shared/components/custom-button/custom-button.component';
import { SelectComponent } from './shared/components/select/select.component';
import { LineChartComponent } from './shared/components/charts/line-chart/line-chart.component';

@Component({
  standalone: true,
  imports: [CustomButtonComponent, SelectComponent, LineChartComponent],
  // ...
})
export class MonComposant {}
```

---

## Composants de formulaire

### Bouton Standard

**Localisation** : `frontend/src/app/shared/components/custom-button/`

Composant de bouton personnalisable avec plusieurs variantes et tailles.

#### Propriétés

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `label` | `string` | `'Button'` | Texte du bouton |
| `variant` | `'primary' \| 'secondary' \| 'success' \| 'danger' \| 'warning' \| 'info'` | `'primary'` | Variante de couleur |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Taille du bouton |
| `disabled` | `boolean` | `false` | État désactivé |
| `loading` | `boolean` | `false` | État de chargement |
| `icon` | `string` | - | Classe d'icône (ex: 'fa fa-check') |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Position de l'icône |
| `fullWidth` | `boolean` | `false` | Largeur 100% |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Type HTML du bouton |

#### Événements

| Événement | Payload | Description |
|-----------|---------|-------------|
| `onClick` | `MouseEvent` | Émis lors du clic |

#### Exemple d'utilisation

```html
<app-custom-button
  label="Enregistrer"
  variant="primary"
  size="medium"
  icon="fa fa-save"
  [loading]="isSaving"
  (onClick)="handleSave()">
</app-custom-button>
```

---

### Liste Déroulante (Select)

**Localisation** : `frontend/src/app/shared/components/select/`

Composant de sélection avec support ngModel et Reactive Forms.

#### Propriétés

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `options` | `SelectOption[]` | `[]` | Liste des options |
| `label` | `string` | `''` | Label du champ |
| `placeholder` | `string` | `'Sélectionnez...'` | Texte placeholder |
| `disabled` | `boolean` | `false` | État désactivé |
| `required` | `boolean` | `false` | Champ requis |
| `error` | `string` | `''` | Message d'erreur |
| `helpText` | `string` | `''` | Texte d'aide |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Taille du champ |

#### Types

```typescript
interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}
```

#### Événements

| Événement | Payload | Description |
|-----------|---------|-------------|
| `valueChange` | `any` | Émis lors du changement de valeur |

#### Exemple d'utilisation

```typescript
// Component
options: SelectOption[] = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3', disabled: true }
];
```

```html
<!-- Template -->
<app-select
  [options]="options"
  label="Choisissez une option"
  placeholder="Sélectionnez..."
  [required]="true"
  [(ngModel)]="selectedValue"
  (valueChange)="handleChange($event)">
</app-select>
```

---

### Bouton Radio

**Localisation** : `frontend/src/app/shared/components/radio-button/`

Composant de boutons radio avec support de descriptions.

#### Propriétés

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `options` | `RadioOption[]` | `[]` | Liste des options |
| `name` | `string` | `''` | Nom du groupe radio |
| `label` | `string` | `''` | Label du groupe |
| `layout` | `'horizontal' \| 'vertical'` | `'vertical'` | Disposition |
| `disabled` | `boolean` | `false` | État désactivé |
| `required` | `boolean` | `false` | Champ requis |
| `error` | `string` | `''` | Message d'erreur |

#### Types

```typescript
interface RadioOption {
  label: string;
  value: any;
  disabled?: boolean;
  description?: string;
}
```

#### Événements

| Événement | Payload | Description |
|-----------|---------|-------------|
| `valueChange` | `any` | Émis lors du changement de valeur |

#### Exemple d'utilisation

```typescript
// Component
radioOptions: RadioOption[] = [
  {
    label: 'Carte de crédit',
    value: 'credit',
    description: 'Paiement sécurisé par carte'
  },
  {
    label: 'PayPal',
    value: 'paypal',
    description: 'Paiement via PayPal'
  }
];
```

```html
<!-- Template -->
<app-radio-button
  [options]="radioOptions"
  name="payment-method"
  label="Méthode de paiement"
  layout="vertical"
  [(ngModel)]="selectedMethod">
</app-radio-button>
```

---

### Case à Cocher (Checkbox)

**Localisation** : `frontend/src/app/shared/components/checkbox/`

Composant de case à cocher avec support de l'état indéterminé.

#### Propriétés

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `label` | `string` | `''` | Label de la checkbox |
| `description` | `string` | `''` | Description |
| `disabled` | `boolean` | `false` | État désactivé |
| `required` | `boolean` | `false` | Champ requis |
| `error` | `string` | `''` | Message d'erreur |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Taille |
| `indeterminate` | `boolean` | `false` | État indéterminé |

#### Événements

| Événement | Payload | Description |
|-----------|---------|-------------|
| `valueChange` | `boolean` | Émis lors du changement d'état |

#### Exemple d'utilisation

```html
<app-checkbox
  label="J'accepte les conditions d'utilisation"
  description="En cochant cette case, vous acceptez nos CGU"
  [required]="true"
  [(ngModel)]="isAccepted">
</app-checkbox>
```

---

### Champ Texte

**Localisation** : `frontend/src/app/shared/components/text-input/`

Composant de champ texte avec support de validation et icônes.

#### Propriétés

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `label` | `string` | `''` | Label du champ |
| `placeholder` | `string` | `''` | Texte placeholder |
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url' \| 'search'` | `'text'` | Type d'input |
| `disabled` | `boolean` | `false` | État désactivé |
| `required` | `boolean` | `false` | Champ requis |
| `error` | `string` | `''` | Message d'erreur |
| `helpText` | `string` | `''` | Texte d'aide |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Taille |
| `icon` | `string` | `''` | Classe d'icône |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Position de l'icône |
| `maxLength` | `number` | - | Longueur maximale |
| `minLength` | `number` | - | Longueur minimale |
| `pattern` | `string` | - | Pattern de validation |
| `autocomplete` | `string` | `'off'` | Attribut autocomplete |
| `showCharacterCount` | `boolean` | `false` | Afficher le compteur |

#### Événements

| Événement | Payload | Description |
|-----------|---------|-------------|
| `valueChange` | `string` | Émis lors du changement de valeur |
| `onBlur` | `void` | Émis lors de la perte de focus |
| `onFocus` | `void` | Émis lors du focus |

#### Exemple d'utilisation

```html
<app-text-input
  label="Adresse email"
  type="email"
  placeholder="vous@exemple.com"
  icon="fa fa-envelope"
  [required]="true"
  [maxLength]="100"
  [showCharacterCount]="true"
  [(ngModel)]="email"
  [error]="emailError">
</app-text-input>
```

---

## Composants de graphiques

### Graphique en Ligne

**Localisation** : `frontend/src/app/shared/components/charts/line-chart/`

Composant de graphique linéaire utilisant Chart.js.

#### Propriétés

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `data` | `ChartData` | - | Données du graphique |
| `options` | `ChartOptions` | - | Options Chart.js |
| `height` | `number` | `400` | Hauteur en pixels |
| `showLegend` | `boolean` | `true` | Afficher la légende |
| `animate` | `boolean` | `true` | Activer les animations |

#### Méthodes publiques

| Méthode | Paramètres | Description |
|---------|------------|-------------|
| `updateChart()` | `newData: ChartData` | Met à jour les données |
| `refresh()` | - | Rafraîchit le graphique |

#### Exemple d'utilisation

```typescript
// Component
chartData: ChartData = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
  datasets: [{
    label: 'Ventes 2024',
    data: [65, 59, 80, 81, 56, 55],
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    tension: 0.4
  }]
};
```

```html
<!-- Template -->
<app-line-chart
  [data]="chartData"
  [height]="400"
  [showLegend]="true">
</app-line-chart>
```

---

### Graphique en Barres

**Localisation** : `frontend/src/app/shared/components/charts/bar-chart/`

Composant de graphique en barres avec support horizontal/vertical.

#### Propriétés

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `data` | `ChartData` | - | Données du graphique |
| `options` | `ChartOptions` | - | Options Chart.js |
| `height` | `number` | `400` | Hauteur en pixels |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Orientation |
| `showLegend` | `boolean` | `true` | Afficher la légende |
| `animate` | `boolean` | `true` | Activer les animations |
| `stacked` | `boolean` | `false` | Mode empilé |

#### Méthodes publiques

| Méthode | Paramètres | Description |
|---------|------------|-------------|
| `updateChart()` | `newData: ChartData` | Met à jour les données |
| `refresh()` | - | Rafraîchit le graphique |

#### Exemple d'utilisation

```typescript
// Component
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
<!-- Template -->
<app-bar-chart
  [data]="chartData"
  [height]="400"
  orientation="vertical"
  [stacked]="false">
</app-bar-chart>
```

---

### Graphique Camembert (Pie)

**Localisation** : `frontend/src/app/shared/components/charts/pie-chart/`

Composant de graphique circulaire (camembert).

#### Propriétés

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `data` | `ChartData` | - | Données du graphique |
| `options` | `ChartOptions` | - | Options Chart.js |
| `height` | `number` | `400` | Hauteur en pixels |
| `showLegend` | `boolean` | `true` | Afficher la légende |
| `legendPosition` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'right'` | Position légende |
| `animate` | `boolean` | `true` | Activer les animations |
| `showPercentage` | `boolean` | `true` | Afficher les pourcentages |

#### Méthodes publiques

| Méthode | Paramètres | Description |
|---------|------------|-------------|
| `updateChart()` | `newData: ChartData` | Met à jour les données |
| `refresh()` | - | Rafraîchit le graphique |

#### Exemple d'utilisation

```typescript
// Component
chartData: ChartData = {
  labels: ['Chrome', 'Firefox', 'Safari', 'Edge'],
  datasets: [{
    label: 'Parts de marché',
    data: [65, 15, 10, 10],
    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  }]
};
```

```html
<!-- Template -->
<app-pie-chart
  [data]="chartData"
  [height]="400"
  legendPosition="right"
  [showPercentage]="true">
</app-pie-chart>
```

---

### Graphique Donut

**Localisation** : `frontend/src/app/shared/components/charts/donut-chart/`

Composant de graphique en anneau (donut) avec texte central optionnel.

#### Propriétés

| Propriété | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `data` | `ChartData` | - | Données du graphique |
| `options` | `ChartOptions` | - | Options Chart.js |
| `height` | `number` | `400` | Hauteur en pixels |
| `showLegend` | `boolean` | `true` | Afficher la légende |
| `legendPosition` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'right'` | Position légende |
| `animate` | `boolean` | `true` | Activer les animations |
| `showPercentage` | `boolean` | `true` | Afficher les pourcentages |
| `cutout` | `number` | `70` | Taille du trou (0-100%) |
| `centerText` | `string` | `''` | Texte au centre |

#### Méthodes publiques

| Méthode | Paramètres | Description |
|---------|------------|-------------|
| `updateChart()` | `newData: ChartData` | Met à jour les données |
| `updateCenterText()` | `text: string` | Met à jour le texte central |
| `refresh()` | - | Rafraîchit le graphique |

#### Exemple d'utilisation

```typescript
// Component
chartData: ChartData = {
  labels: ['Complété', 'En cours', 'À faire'],
  datasets: [{
    label: 'Statut des tâches',
    data: [45, 25, 30],
    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b']
  }]
};
```

```html
<!-- Template -->
<app-donut-chart
  [data]="chartData"
  [height]="400"
  [cutout]="70"
  centerText="Total: 100"
  [showPercentage]="true">
</app-donut-chart>
```

---

## Service Chart

**Localisation** : `frontend/src/app/shared/services/chart.service.ts`

Service utilitaire pour la gestion des graphiques.

### Types

```typescript
interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    title?: {
      display?: boolean;
      text?: string;
    };
    tooltip?: {
      enabled?: boolean;
    };
  };
  scales?: any;
}
```

### Méthodes

#### `generateColors(count: number): string[]`

Génère un tableau de couleurs pour les datasets.

```typescript
const colors = this.chartService.generateColors(5);
// ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
```

#### `generateColorsWithAlpha(count: number, alpha: number = 0.5): string[]`

Génère des couleurs avec transparence.

```typescript
const colors = this.chartService.generateColorsWithAlpha(3, 0.3);
// ['rgba(59, 130, 246, 0.3)', 'rgba(16, 185, 129, 0.3)', ...]
```

#### `getDefaultLineChartOptions(): ChartOptions`

Retourne les options par défaut pour les graphiques en ligne.

#### `getDefaultBarChartOptions(): ChartOptions`

Retourne les options par défaut pour les graphiques en barres.

#### `getDefaultPieChartOptions(): ChartOptions`

Retourne les options par défaut pour les graphiques circulaires.

---

## Personnalisation

### Thème global

Les composants utilisent des variables CSS qui peuvent être personnalisées :

```scss
// Dans votre styles.scss global
:root {
  --primary-color: #3b82f6;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --warning-color: #f59e0b;
  // ...
}
```

### Styles personnalisés

Vous pouvez surcharger les styles de chaque composant :

```scss
// Dans votre composant
::ng-deep app-custom-button {
  .custom-button--primary {
    background-color: #custom-color;
  }
}
```

### Options avancées Chart.js

Pour une personnalisation avancée des graphiques, consultez la [documentation Chart.js](https://www.chartjs.org/docs/latest/).

---

## Support et Contribution

Pour toute question ou contribution :

1. Consultez la documentation dans chaque fichier de composant
2. Vérifiez les exemples d'utilisation fournis
3. Créez une issue sur le dépôt Git du projet

**Version** : 1.0.0
**Dernière mise à jour** : Décembre 2024
