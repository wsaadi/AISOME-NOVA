import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { AgentDefinition } from '../models/agent.models';

/**
 * Interface for Microsoft Copilot Manifest
 */
interface CopilotManifest {
  version: string;
  id: string;
  developer: {
    name: string;
    websiteUrl?: string;
    privacyUrl?: string;
    termsOfUseUrl?: string;
  };
  name: {
    short: string;
    full: string;
  };
  description: {
    short: string;
    full: string;
  };
  icons?: {
    outline?: string;
    color?: string;
  };
  accentColor?: string;
  copilotAgents?: {
    declarativeAgents: Array<{
      id: string;
      file: string;
    }>;
  };
}

/**
 * Interface for Microsoft Copilot Declarative Agent
 */
interface CopilotDeclarativeAgent {
  version: string;
  id: string;
  name: string;
  description: string;
  instructions: string;
  conversation_starters?: Array<{
    text: string;
    title: string;
  }>;
  actions?: any[];
  capabilities?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CopilotImportService {

  constructor() { }

  /**
   * Imports a Microsoft Copilot ZIP file and converts it to AgentDefinition format
   * Creates one agent per conversation starter
   * @param file The ZIP file from Microsoft Copilot
   * @returns Promise with array of converted AgentDefinitions
   */
  async importCopilotZip(file: File): Promise<Partial<AgentDefinition>[]> {
    try {
      console.log('📦 Loading Copilot ZIP file:', file.name);

      // Load and unzip the file
      const zip = await JSZip.loadAsync(file);

      // Extract manifest.json
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) {
        throw new Error('manifest.json not found in ZIP file');
      }

      const manifestContent = await manifestFile.async('text');
      const manifest: CopilotManifest = JSON.parse(manifestContent);
      console.log('📄 Manifest parsed:', manifest);

      // Extract declarative agent file
      let declarativeAgent: CopilotDeclarativeAgent | null = null;

      if (manifest.copilotAgents?.declarativeAgents?.[0]) {
        const agentFileName = manifest.copilotAgents.declarativeAgents[0].file;
        console.log('🤖 Loading declarative agent file:', agentFileName);
        const agentFile = zip.file(agentFileName);

        if (agentFile) {
          const agentContent = await agentFile.async('text');
          declarativeAgent = JSON.parse(agentContent);
          console.log('🤖 Declarative agent parsed:', declarativeAgent);
        }
      }

      // Extract icons if available
      let iconData: string | undefined;
      if (manifest.icons?.color) {
        const iconFile = zip.file(manifest.icons.color);
        if (iconFile) {
          const iconBlob = await iconFile.async('blob');
          iconData = await this.blobToBase64(iconBlob);
          console.log('🎨 Icon extracted (base64 length):', iconData.length);
        }
      }

      // Create one agent per conversation starter
      const agents = this.mapCopilotToAgents(manifest, declarativeAgent, iconData);
      console.log(`✨ Created ${agents.length} agent(s) from Copilot import`);

      return agents;
    } catch (error) {
      console.error('❌ Error importing Copilot ZIP:', error);
      throw new Error(`Failed to import Copilot ZIP: ${error}`);
    }
  }

  /**
   * Maps Microsoft Copilot format to multiple AgentDefinitions
   * Creates one agent per conversation starter
   */
  private mapCopilotToAgents(
    manifest: CopilotManifest,
    declarativeAgent: CopilotDeclarativeAgent | null,
    iconData?: string
  ): Partial<AgentDefinition>[] {

    const agents: Partial<AgentDefinition>[] = [];

    // If there are conversation starters, create one agent per starter
    if (declarativeAgent?.conversation_starters && declarativeAgent.conversation_starters.length > 0) {
      console.log(`🎯 Creating ${declarativeAgent.conversation_starters.length} agents from conversation starters`);

      for (const starter of declarativeAgent.conversation_starters) {
        const agent = this.createAgentFromStarter(
          manifest,
          declarativeAgent,
          starter,
          iconData
        );
        agents.push(agent);
      }
    } else {
      // No conversation starters, create a single agent
      console.log('📝 No conversation starters found, creating single agent');
      const agent = this.createSingleAgent(manifest, declarativeAgent, iconData);
      agents.push(agent);
    }

    return agents;
  }

  /**
   * Creates a single agent from manifest and declarative agent
   */
  private createSingleAgent(
    manifest: CopilotManifest,
    declarativeAgent: CopilotDeclarativeAgent | null,
    iconData?: string
  ): Partial<AgentDefinition> {

    // Base agent definition
    const agentDef: Partial<AgentDefinition> = {
      name: manifest.name.short || declarativeAgent?.name || 'Imported Copilot Agent',
      description: manifest.description.short || declarativeAgent?.description || '',
      long_description: manifest.description.full || declarativeAgent?.description || '',
      icon: iconData || 'robot',
      category: 'imported',
      status: 'draft',
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: manifest.developer.name || 'Unknown',
        version: '1.0.0',
        tags: ['imported', 'copilot', `copilot-id:${manifest.id}`]
      },
      tools: [],
      ui_layout: {
        show_header: true,
        header_title: manifest.name.short || 'Agent',
        header_subtitle: manifest.description.short || '',
        header_icon: 'smart_toy',
        primary_color: manifest.accentColor || '#E0F6FC',
        sections: [
          {
            id: 'input_section',
            name: 'input_section',
            title: 'Documents et Entrées',
            layout_type: 'column',
            components: [
              {
                id: 'document_upload',
                type: 'file_upload',
                name: 'documents',
                label: 'Télécharger vos documents',
                help_text: 'Chargez vos documents (CCTP, CCAP, RC, PDF, Word, etc.)',
                accept: '.pdf,.doc,.docx,.txt',
                multiple: true,
                max_size_mb: 50,
                required: false
              },
              {
                id: 'additional_input',
                type: 'textarea',
                name: 'additional_context',
                label: 'Informations complémentaires (optionnel)',
                help_text: 'Ajoutez des informations contextuelles si nécessaire',
                placeholder: 'Ex: Date limite, contraintes spécifiques, etc.',
                required: false
              },
              {
                id: 'trigger_button',
                type: 'button',
                name: 'trigger_analysis',
                label: 'Lancer l\'analyse',
                button_action: 'trigger_agent',
                button_variant: 'primary',
                is_trigger_button: true,
                required: false
              }
            ]
          },
          {
            id: 'result_section',
            name: 'result_section',
            title: 'Résultats',
            layout_type: 'column',
            components: [
              {
                id: 'result_viewer',
                type: 'markdown_viewer',
                name: 'analysis_result',
                label: 'Résultat de l\'analyse',
                help_text: 'Le résultat de l\'agent s\'affichera ici',
                auto_bind_output: true,
                required: false
              }
            ]
          }
        ],
        show_sidebar: false,
        sidebar_sections: [],
        sidebar_position: 'right',
        sidebar_width: '300px',
        show_footer: false,
        footer_content: ''
      },
      ai_behavior: {
        system_prompt: '',
        tone: 'professional',
        default_provider: 'mistral',
        default_model: 'mistral-large-latest',
        temperature: 0.7,
        max_tokens: 4096,
        response_format: {
          type: 'text'
        },
        enable_moderation: true,
        enable_classification: false,
        include_sources: false,
        include_confidence: false
      },
      workflows: []
    };

    // Add instructions from declarative agent as system prompt
    if (declarativeAgent?.instructions) {
      agentDef.ai_behavior!.system_prompt = declarativeAgent.instructions;
    }

    // Add conversation starters as part of system prompt
    if (declarativeAgent?.conversation_starters && declarativeAgent.conversation_starters.length > 0) {
      const startersText = '\n\n## Example Questions:\n' +
        declarativeAgent.conversation_starters.map(s => `- ${s.title}: "${s.text}"`).join('\n');
      agentDef.ai_behavior!.system_prompt += startersText;
    }

    // Add developer info to long description
    if (manifest.developer) {
      const devInfo = `\n\n---\n**Developer:** ${manifest.developer.name}`;
      agentDef.long_description = (agentDef.long_description || '') + devInfo;
    }

    return agentDef;
  }

  /**
   * Creates an agent specialized for a specific conversation starter
   */
  private createAgentFromStarter(
    manifest: CopilotManifest,
    declarativeAgent: CopilotDeclarativeAgent,
    starter: { text: string; title: string },
    iconData?: string
  ): Partial<AgentDefinition> {

    // Create base agent with specialized name
    const agentDef: Partial<AgentDefinition> = {
      name: starter.title || manifest.name.short || 'Imported Agent',
      description: manifest.description.short || declarativeAgent.description || '',
      long_description: manifest.description.full || declarativeAgent.description || '',
      icon: iconData || 'robot',
      category: 'imported',
      status: 'draft',
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: manifest.developer.name || 'Unknown',
        version: '1.0.0',
        tags: ['imported', 'copilot', `copilot-id:${manifest.id}`, `starter:${starter.title}`]
      },
      tools: [],
      ui_layout: {
        show_header: true,
        header_title: starter.title || manifest.name.short || 'Agent',
        header_subtitle: starter.text.substring(0, 100) + (starter.text.length > 100 ? '...' : ''),
        header_icon: 'smart_toy',
        primary_color: manifest.accentColor || '#E0F6FC',
        sections: [
          {
            id: 'input_section',
            name: 'input_section',
            title: 'Documents et Entrées',
            layout_type: 'column',
            components: [
              {
                id: 'document_upload',
                type: 'file_upload',
                name: 'documents',
                label: 'Télécharger vos documents',
                help_text: 'Chargez vos documents (CCTP, CCAP, RC, PDF, Word, etc.)',
                accept: '.pdf,.doc,.docx,.txt',
                multiple: true,
                max_size_mb: 50,
                required: false
              },
              {
                id: 'additional_input',
                type: 'textarea',
                name: 'additional_context',
                label: 'Informations complémentaires (optionnel)',
                help_text: 'Ajoutez des informations contextuelles si nécessaire',
                placeholder: 'Ex: Date limite, contraintes spécifiques, etc.',
                required: false
              },
              {
                id: 'trigger_button',
                type: 'button',
                name: 'trigger_analysis',
                label: starter.title,
                button_action: 'trigger_agent',
                button_variant: 'primary',
                is_trigger_button: true,
                required: false
              }
            ]
          },
          {
            id: 'result_section',
            name: 'result_section',
            title: 'Résultats',
            layout_type: 'column',
            components: [
              {
                id: 'result_viewer',
                type: 'markdown_viewer',
                name: 'analysis_result',
                label: 'Résultat de l\'analyse',
                help_text: 'Le résultat de l\'agent s\'affichera ici',
                auto_bind_output: true,
                required: false
              }
            ]
          }
        ],
        show_sidebar: false,
        sidebar_sections: [],
        sidebar_position: 'right',
        sidebar_width: '300px',
        show_footer: false,
        footer_content: ''
      },
      ai_behavior: {
        system_prompt: declarativeAgent.instructions || '',
        user_prompt: starter.text, // Use the conversation starter as default user prompt
        tone: 'professional',
        default_provider: 'mistral',
        default_model: 'mistral-large-latest',
        temperature: 0.7,
        max_tokens: 4096,
        response_format: {
          type: 'text'
        },
        enable_moderation: true,
        enable_classification: false,
        include_sources: false,
        include_confidence: false
      },
      workflows: []
    };

    // Add developer info to long description
    if (manifest.developer) {
      const devInfo = `\n\n---\n**Developer:** ${manifest.developer.name}\n**Conversation Starter:** ${starter.title}`;
      agentDef.long_description = (agentDef.long_description || '') + devInfo;
    }

    return agentDef;
  }

  /**
   * Converts a Blob to Base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Validates if a file is a valid Copilot ZIP
   */
  async isValidCopilotZip(file: File): Promise<boolean> {
    try {
      const zip = await JSZip.loadAsync(file);
      const manifestFile = zip.file('manifest.json');

      if (!manifestFile) {
        return false;
      }

      const manifestContent = await manifestFile.async('text');
      const manifest = JSON.parse(manifestContent);

      // Check if it has the required Copilot structure
      return !!(manifest.copilotAgents || manifest.name);
    } catch {
      return false;
    }
  }
}
