import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
        data: { permissions: ['admin:settings'] }
      },
      {
        path: 'document-analyzer',
        loadComponent: () => import('./pages/document-analyzer/document-analyzer.component').then(m => m.DocumentAnalyzerComponent)
      },
      {
        path: 'agents-catalog',
        loadComponent: () => import('./pages/agents-catalog/agents-catalog.component').then(m => m.AgentsCatalogComponent)
      },
      {
        path: 'appointment-scheduler',
        loadComponent: () => import('./pages/appointment-scheduler/appointment-scheduler.component').then(m => m.AppointmentSchedulerComponent)
      },
      {
        path: 'ai-chat',
        loadComponent: () => import('./pages/ai-chat/ai-chat.component').then(m => m.AiChatComponent)
      },
      {
        path: 'moderation-settings',
        loadComponent: () => import('./pages/moderation-settings/moderation-settings.component').then(m => m.ModerationSettingsComponent),
        data: { permissions: ['admin:moderation'] }
      },
      {
        path: 'llm-settings',
        loadComponent: () => import('./pages/llm-settings/llm-settings.component').then(m => m.LLMSettingsComponent),
        data: { permissions: ['admin:llm-settings'] }
      },
      {
        path: 'token-consumption',
        loadComponent: () => import('./pages/token-consumption/token-consumption.component').then(m => m.TokenConsumptionComponent),
        data: { permissions: ['admin:token-consumption'] }
      },
      {
        path: 'catalog-management',
        loadComponent: () => import('./pages/catalog-management/catalog-management.component').then(m => m.CatalogManagementComponent),
        data: { permissions: ['agent:manage-own'] }
      },
      {
        path: 'user-management',
        loadComponent: () => import('./pages/user-management/user-management.component').then(m => m.UserManagementComponent),
        data: { permissions: ['admin:users'] }
      },
      {
        path: 'dolibarr-stats',
        loadComponent: () => import('./pages/dolibarr-stats/dolibarr-stats.component').then(m => m.DolibarrStatsComponent)
      },
      {
        path: 'web-monitoring',
        loadComponent: () => import('./pages/web-monitoring-agent/web-monitoring-agent.component').then(m => m.WebMonitoringAgentComponent)
      },
      {
        path: 'contract-analysis',
        loadComponent: () => import('./pages/contract-analysis/contract-analysis.component').then(m => m.ContractAnalysisComponent)
      },
      {
        path: 'pod-analyzer',
        loadComponent: () => import('./pages/pod-analyzer/pod-analyzer.component').then(m => m.PodAnalyzerComponent)
      },
      {
        path: 'iso9001-audit',
        loadComponent: () => import('./pages/iso9001-audit/iso9001-audit.component').then(m => m.Iso9001AuditComponent)
      },
      {
        path: 'nvidia-multimodal',
        loadComponent: () => import('./pages/nvidia-multimodal/nvidia-multimodal.component').then(m => m.NvidiaMultimodalComponent)
      },
      {
        path: 'nvidia-vista3d',
        loadComponent: () => import('./pages/nvidia-vista3d/nvidia-vista3d.component').then(m => m.NvidiaVista3dComponent)
      },
      {
        path: 'nvidia-fourcastnet',
        loadComponent: () => import('./pages/nvidia-fourcastnet/nvidia-fourcastnet.component').then(m => m.NvidiaFourcastnetComponent)
      },
      {
        path: 'nvidia-openfold3',
        loadComponent: () => import('./pages/nvidia-openfold3/nvidia-openfold3.component').then(m => m.NvidiaOpenfold3Component)
      },
      {
        path: 'nvidia-grounding-dino',
        loadComponent: () => import('./pages/nvidia-grounding-dino/nvidia-grounding-dino.component').then(m => m.NvidiaGroundingDinoComponent)
      },
      {
        path: 'webgpu-local-agent',
        loadComponent: () => import('./pages/webgpu-local-agent/webgpu-local-agent.component').then(m => m.WebgpuLocalAgentComponent)
      },
      {
        path: 'create-agent',
        loadComponent: () => import('./pages/simple-builder/simple-builder.component').then(m => m.SimpleBuilderComponent)
      },
      {
        path: 'edit-agent/:id',
        loadComponent: () => import('./pages/simple-builder/simple-builder.component').then(m => m.SimpleBuilderComponent),
        data: { editMode: true }
      },
      {
        path: 'agent/:id',
        loadComponent: () => import('./pages/agent-runner/agent-runner.component').then(m => m.AgentRunnerComponent)
      },
      {
        path: 'agent-runtime/:slug',
        loadComponent: () => import('./pages/agent-runner/agent-runner.component').then(m => m.AgentRunnerComponent),
        data: { useRuntime: true }
      }
    ]
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
