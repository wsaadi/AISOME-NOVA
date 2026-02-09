/**
 * Index des composants partagés
 * Permet d'importer facilement tous les composants de la bibliothèque
 */

// Composants de formulaire
export { CustomButtonComponent } from './custom-button/custom-button.component';
export { SelectComponent } from './select/select.component';
export type { SelectOption } from './select/select.component';
export { RadioButtonComponent } from './radio-button/radio-button.component';
export type { RadioOption } from './radio-button/radio-button.component';
export { CheckboxComponent } from './checkbox/checkbox.component';
export { TextInputComponent } from './text-input/text-input.component';

// Composants existants
export { CustomFormComponent } from './custom-form/custom-form.component';
export { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';

// Composants de graphiques
export { LineChartComponent } from './charts/line-chart/line-chart.component';
export { BarChartComponent } from './charts/bar-chart/bar-chart.component';
export { PieChartComponent } from './charts/pie-chart/pie-chart.component';
export { DonutChartComponent } from './charts/donut-chart/donut-chart.component';

// Services
export { ChartService } from '../services/chart.service';
export type { ChartData, ChartDataset, ChartOptions } from '../services/chart.service';
