import { Component, Input, AfterViewChecked, ElementRef, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import mermaid from 'mermaid';

/**
 * Composant pour afficher du contenu Markdown formaté avec support Mermaid
 *
 * @example
 * ```html
 * <app-markdown-viewer
 *   [content]="synthesisText"
 *   [showLineNumbers]="false">
 * </app-markdown-viewer>
 * ```
 */
@Component({
  selector: 'app-markdown-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './markdown-viewer.component.html',
  styleUrls: ['./markdown-viewer.component.scss']
})
export class MarkdownViewerComponent implements AfterViewChecked, OnDestroy, OnChanges {
  @Input() content: string = '';
  @Input() showLineNumbers: boolean = false;
  @Input() title: string = '';
  @Input() maxHeight: string = 'auto';
  formattedContent: SafeHtml = '';

  // Mermaid rendering control (avoid concurrent/late renders)
  private needsMermaidRender = false;
  private renderVersion = 0;
  private isRenderingMermaid = false;

  private mermaidId = 0;

  // Mermaid should be initialized once globally (not per component instance)
  private static mermaidGlobalInitialized = false;

  constructor(
    private elementRef: ElementRef,
    private sanitizer: DomSanitizer
  ) {
    if (!MarkdownViewerComponent.mermaidGlobalInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        }
      });

      MarkdownViewerComponent.mermaidGlobalInitialized = true;
    }
  }

  ngAfterViewChecked(): void {
    // Render Mermaid only when the formatted DOM has been updated (and only when needed)
    if (!this.needsMermaidRender) return;
    if (this.isRenderingMermaid) return;

    // Consume the render request; if content changes during async render,
    // renderVersion will change and we will stop safely.
    this.needsMermaidRender = false;

    const version = this.renderVersion;
    void this.renderMermaidDiagrams(version);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['content'] || changes['showLineNumbers']) {
      this.formattedContent = this.buildFormattedContent(this.content);

      // Mermaid only applies to the formatted (innerHTML) mode
      this.needsMermaidRender = !this.showLineNumbers;
      this.renderVersion++;
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  get contentLines(): string[] {
    return this.content ? this.content.split('\n') : [];
  }

  private buildFormattedContent(content: string): SafeHtml {
    if (!content) return '';

    let html = content.replace(/\r\n/g, '\n');

    // Nettoyer les artefacts d'abord (balises XML, etc.)
    html = this.cleanArtifacts(html);

    // Extraire et remplacer les blocs mermaid AVANT tout autre traitement
    html = this.extractMermaidBlocks(html);

    // Extraire les blocs Mermaid non délimités (texte brut)
    html = this.extractInlineMermaidBlocks(html);

    // Convertir les blocs de code (```language ... ```)
    html = this.convertCodeBlocks(html);

    // Convertir les tableaux Markdown
    html = this.convertTables(html);

    // Convertir les listes (- item or * item)
    html = this.convertLists(html);

    // Headers (dans l'ordre inverse pour éviter les conflits)
    html = html.replace(/^#{6}\s+(.+?)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#{5}\s+(.+?)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#{4}\s+(.+?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^#{3}\s+(.+?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#{2}\s+(.+?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#{1}\s+(.+?)$/gm, '<h1>$1</h1>');

    // Bold (**text** ou __text__)
    html = html.replace(/\*\*([^\*]+?)\*\*/gs, '<strong>$1</strong>');
    html = html.replace(/__([^_]+?)__/gs, '<strong>$1</strong>');

    // Italic (*text* ou _text_) - attention à ne pas matcher les **
    html = html.replace(/(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_(?!_)([^_\n]+?)_(?!_)/g, '<em>$1</em>');

    // Code inline (`code`)
    html = html.replace(/`([^`\n]+?)`/g, '<code>$1</code>');

    // Horizontal rules (--- ou ***)
    html = html.replace(/^[-*]{3,}$/gm, '<hr>');

    // Protéger les blocs mermaid pour éviter qu'ils soient écrasés par la conversion de paragraphes
    const { html: protectedHtml, blocks: mermaidBlocks } = this.protectMermaidBlocks(html);
    html = protectedHtml;

    // Convertir les paragraphes (double saut de ligne)
    html = this.convertParagraphs(html);

    // Restaurer les blocs mermaid
    html = this.restoreMermaidBlocks(html, mermaidBlocks);

    // Nettoyer les balises vides et les espaces
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*<br>/g, '<p>');
    html = html.replace(/<br>\s*<\/p>/g, '</p>');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private async renderMermaidDiagrams(version: number): Promise<void> {
    if (this.showLineNumbers) return;

    this.isRenderingMermaid = true;
    try {
      // Find all mermaid containers in this component
      const containers: NodeListOf<HTMLElement> =
        this.elementRef.nativeElement.querySelectorAll('.mermaid-diagram');

      for (const container of Array.from(containers)) {
        // If new content arrived while rendering, stop (new render will be scheduled)
        if (version !== this.renderVersion) return;

        // Skip already rendered diagrams
        if (container.querySelector('svg')) continue;

        let sourceElement: Element | null = null;
        let rawCode: string | null = null;

        try {
          sourceElement = container.querySelector('.mermaid-source');
          rawCode = sourceElement?.textContent ?? container.getAttribute('data-mermaid');

          if (!rawCode) continue;

          let decodedCode: string;
        if (sourceElement) {
          decodedCode = rawCode;
        } else {
          // data-mermaid is base64
          decodedCode = this.decodeBase64(rawCode);
        }
        const code = this.normalizeMermaidCode(decodedCode);

          const id = `mermaid-${Date.now()}-${Math.random().toString(16).slice(2)}-${this.mermaidId++}`;
          const { svg, bindFunctions } = await mermaid.render(id, code);

          // Re-check before DOM injection
          if (version !== this.renderVersion) return;

          container.innerHTML = svg;
          if (bindFunctions) bindFunctions(container);
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          const errorSource = sourceElement?.textContent ?? (rawCode ? this.decodeHtmlEntities(rawCode) : '');
          const escapedCode = this.escapeHtmlTextContent(errorSource);
          container.innerHTML = `<pre class="mermaid-error">Erreur de rendu du diagramme:\n${escapedCode}</pre>`;
        }
      }
    } finally {
      this.isRenderingMermaid = false;
    }
  }

  private decodeHtmlEntities(str: string): string {
    // Decode HTML entities back to their original characters
    return str
      .replace(/&#10;/g, '\n')  // Decode newlines first
      .replace(/&#13;/g, '\r')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  private extractMermaidBlocks(text: string): string {
    // ÉTAPE 1: Extraire TOUS les blocs ```mermaid...``` AVANT tout autre traitement
    const mermaidBlockRegex = /```\s*mermaid\s*\r?\n([\s\S]*?)```/gi;
    let mermaidCount = 0;

    text = text.replace(mermaidBlockRegex, (match, code) => {
      mermaidCount++;
      return this.buildMermaidContainer(code.trim());
    });

    // ÉTAPE 2: Traiter les autres blocs de code qui pourraient contenir du mermaid par leur contenu
    const codeBlockRegex = /```\s*([\w-]*)\s*\r?\n([\s\S]*?)```/g;

    text = text.replace(codeBlockRegex, (match, language, code) => {
      const trimmedCode = code.trim();
      const lang = (language || '').toLowerCase();

      // Skip si c'est déjà un div mermaid converti
      if (match.includes('mermaid-diagram') || trimmedCode.includes('mermaid-diagram')) {
        return match;
      }

      if (!lang) {
        const normalizedCode = this.normalizeMermaidCode(trimmedCode);
        // Vérifier si c'est du mermaid par le contenu uniquement si aucun langage n'est précisé
        if (this.isMermaidCode(normalizedCode)) {
          return this.buildMermaidContainer(normalizedCode);
        }
      }

      // Sinon, retourner le bloc de code original pour traitement ultérieur
      return match;
    });

    if (mermaidCount > 0) {
      this.mermaidId = 0;
    }

    return text;
  }

  private extractInlineMermaidBlocks(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let inCodeBlock = false;

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        result.push(line);
        i += 1;
        continue;
      }

      if (inCodeBlock || !trimmed || trimmed.includes('mermaid-diagram')) {
        result.push(line);
        i += 1;
        continue;
      }

      const candidateIndex = this.getMermaidStartIndex(lines, i);
      if (candidateIndex === -1) {
        result.push(line);
        i += 1;
        continue;
      }

      const blockLines: string[] = [];
      for (let j = candidateIndex; j < lines.length; j++) {
        const blockLine = lines[j];
        if (this.isMermaidBlockTerminator(blockLine)) {
          i = j + 1;
          break;
        }
        blockLines.push(blockLine);
        i = j + 1;
      }

      if (blockLines.length > 0) {
        const normalizedCode = this.normalizeMermaidCode(blockLines.join('\n'));
        result.push(this.buildMermaidContainer(normalizedCode));
      }
    }

    return result.join('\n');
  }

  private getMermaidStartIndex(lines: string[], index: number): number {
    const current = lines[index]?.trim() ?? '';
    if (this.isMermaidStartLine(current)) {
      return index;
    }

    if (current.startsWith('%%{')) {
      for (let i = index + 1; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed || trimmed.startsWith('%%')) {
          continue;
        }
        return this.isMermaidStartLine(trimmed) ? index : -1;
      }
    }

    return -1;
  }

  private isMermaidStartLine(line: string): boolean {
    const mermaidStartPatterns = [
      /^graph\s+(TD|TB|BT|RL|LR)/i,
      /^flowchart\s+(TD|TB|BT|RL|LR)/i,
      /^sequenceDiagram/i,
      /^classDiagram/i,
      /^stateDiagram(-v2)?/i,
      /^erDiagram/i,
      /^journey/i,
      /^gantt/i,
      /^pie(\s+title)?/i,
      /^quadrantChart/i,
      /^requirementDiagram/i,
      /^gitGraph/i,
      /^mindmap/i,
      /^timeline/i,
      /^C4Context/i,
      /^C4Container/i,
      /^C4Component/i,
      /^C4Dynamic/i,
      /^C4Deployment/i
    ];

    return mermaidStartPatterns.some(pattern => pattern.test(line));
  }

  private isMermaidBlockTerminator(line: string): boolean {
    const trimmed = line.trim();

    if (!trimmed) {
      return true;
    }

    if (trimmed.startsWith('```')) {
      return true;
    }

    if (trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      return true;
    }

    if (/^\d+\./.test(trimmed)) {
      return true;
    }

    return /^---+$/.test(trimmed);
  }

  private protectMermaidBlocks(html: string): { html: string; blocks: string[] } {
    const blocks: string[] = [];
    const processed = html.replace(/<div class="mermaid-diagram">[\s\S]*?<\/div>/g, (match) => {
      const placeholder = `__MERMAID_BLOCK_${blocks.length}__`;
      blocks.push(match);
      return placeholder;
    });
    return { html: processed, blocks };
  }

  private restoreMermaidBlocks(html: string, blocks: string[]): string {
    let restored = html;
    blocks.forEach((block, index) => {
      restored = restored.replace(`__MERMAID_BLOCK_${index}__`, block);
    });
    return restored;
  }

  /**
   * Détecte si un code contient un diagramme Mermaid
   * Utilise plusieurs stratégies pour une détection robuste
   */
  private isMermaidCode(code: string): boolean {
    const cleanCode = this.normalizeMermaidCode(code);
    const firstContentLine = this.getFirstMermaidLine(cleanCode);

    if (!firstContentLine) {
      return false;
    }

    // Stratégie 1: Détecter les mots-clés de début de diagramme Mermaid
    const mermaidStartPatterns = [
      // Graph patterns
      /^graph\s+(TD|TB|BT|RL|LR)/i,
      /^flowchart\s+(TD|TB|BT|RL|LR)/i,
      // Diagram types
      /^sequenceDiagram/i,
      /^classDiagram/i,
      /^stateDiagram(-v2)?/i,
      /^erDiagram/i,
      /^journey/i,
      /^gantt/i,
      /^pie(\s+title)?/i,
      /^quadrantChart/i,
      /^requirementDiagram/i,
      /^gitGraph/i,
      /^mindmap/i,
      /^timeline/i,
      /^C4Context/i,
      /^C4Container/i,
      /^C4Component/i,
      /^C4Dynamic/i,
      /^C4Deployment/i
    ];

    // Tester chaque pattern
    for (const pattern of mermaidStartPatterns) {
      if (pattern.test(firstContentLine)) {
        return true;
      }
    }

    return /^%%\{/.test(firstContentLine);
  }

  private getFirstMermaidLine(code: string): string | null {
    const lines = code.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      if (trimmed.startsWith('%%{')) {
        return trimmed;
      }
      if (trimmed.startsWith('%%')) {
        continue;
      }
      return trimmed;
    }
    return null;
  }

  private normalizeMermaidCode(code: string): string {
    return code.replace(/\r\n/g, '\n').replace(/\r/g, '');
  }


  private encodeBase64(input: string): string {
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  }

  private decodeBase64(input: string): string {
    try {
      const binary = atob(input);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    } catch {
      return input;
    }
  }  

  private buildMermaidContainer(code: string): string {
    // Use a base64 payload in a data attribute so subsequent markdown transforms
    // cannot accidentally alter line breaks inside the diagram source.
    const payload = this.encodeBase64(code);
    return `<div class="mermaid-diagram" data-mermaid="${payload}"></div>`;
  }

  private escapeHtmlTextContent(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private cleanArtifacts(text: string): string {
    // Retirer les balises XML/HTML spécifiques (thinking, etc.)
    text = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '');
    text = text.replace(/<\/?thinking>/g, '');

    // Retirer uniquement certaines balises XML indésirables
    const unwantedTags = ['thinking', 'context', 'debug', 'internal'];
    unwantedTags.forEach(tag => {
      const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'g');
      text = text.replace(regex, '');
      text = text.replace(new RegExp(`<\\/?${tag}[^>]*>`, 'g'), '');
    });

    // Retirer les lignes vides multiples au début
    text = text.replace(/^\s*\n+/g, '');

    return text;
  }

  private convertCodeBlocks(text: string): string {
    // Convertir les blocs de code ```language ... ``` (sauf mermaid qui est déjà traité)
    return text.replace(/```\s*([\w-]*)\s*\r?\n([\s\S]*?)```/g, (match, language, code) => {
      // Skip si c'est du mermaid (déjà traité par extractMermaidBlocks)
      if (language.toLowerCase() === 'mermaid') {
        return match;
      }

      // Skip si le contenu a déjà été converti en div mermaid
      if (code.includes('mermaid-diagram')) {
        return match;
      }

      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const langClass = language ? ` class="language-${language}"` : '';
      return `<pre><code${langClass}>${escapedCode}</code></pre>`;
    });
  }

  private convertTables(text: string): string {
    const lines = text.split('\n');
    let result: string[] = [];
    let inTable = false;
    let tableLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Détecter une ligne de tableau (commence et finit par |)
      if (line.startsWith('|') && line.endsWith('|')) {
        tableLines.push(line);
        inTable = true;
      } else {
        // Si on était dans un tableau et qu'on ne l'est plus, convertir le tableau
        if (inTable && tableLines.length > 0) {
          result.push(this.buildTable(tableLines));
          tableLines = [];
          inTable = false;
        }
        result.push(line);
      }
    }

    // Gérer le dernier tableau si nécessaire
    if (tableLines.length > 0) {
      result.push(this.buildTable(tableLines));
    }

    return result.join('\n');
  }

  private buildTable(lines: string[]): string {
    if (lines.length < 2) return lines.join('\n');

    let html = '<table class="markdown-table">';

    // Header (première ligne)
    const headerCells = lines[0].split('|').filter(cell => cell.trim() !== '');
    html += '<thead><tr>';
    headerCells.forEach(cell => {
      html += `<th>${cell.trim()}</th>`;
    });
    html += '</tr></thead>';

    // Body (ignorer la ligne de séparation et traiter le reste)
    if (lines.length > 2) {
      html += '<tbody>';
      for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').filter(cell => cell.trim() !== '');
        if (cells.length > 0) {
          html += '<tr>';
          cells.forEach(cell => {
            html += `<td>${cell.trim()}</td>`;
          });
          html += '</tr>';
        }
      }
      html += '</tbody>';
    }

    html += '</table>';
    return html;
  }

  private convertLists(text: string): string {
    const lines = text.split('\n');
    let result: string[] = [];
    let inList = false;
    let listItems: string[] = [];

    for (let line of lines) {
      const trimmed = line.trim();

      // Détecter un élément de liste
      if (trimmed.match(/^[-*]\s+(.+)$/)) {
        const match = trimmed.match(/^[-*]\s+(.+)$/);
        if (match) {
          listItems.push(`<li>${match[1]}</li>`);
          inList = true;
        }
      } else {
        // Si on était dans une liste et qu'on ne l'est plus, fermer la liste
        if (inList && listItems.length > 0) {
          result.push('<ul>' + listItems.join('') + '</ul>');
          listItems = [];
          inList = false;
        }
        result.push(line);
      }
    }

    // Gérer la dernière liste si nécessaire
    if (listItems.length > 0) {
      result.push('<ul>' + listItems.join('') + '</ul>');
    }

    return result.join('\n');
  }

  private convertParagraphs(html: string): string {
    const lines = html.split('\n');
    const processed: string[] = [];
    let inParagraph = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Vérifier si c'est un élément de bloc
      const isBlockElement = line.startsWith('<h') || line.startsWith('<hr') ||
                             line.startsWith('<table') || line.startsWith('</table') ||
                             line.startsWith('<ul') || line.startsWith('</ul') ||
                             line.startsWith('<li') || line.startsWith('</li') ||
                             line.startsWith('<thead') || line.startsWith('</thead') ||
                             line.startsWith('<tbody') || line.startsWith('</tbody') ||
                             line.startsWith('<tr') || line.startsWith('</tr') ||
                             line.startsWith('<pre') || line.startsWith('</pre') ||
                             line.startsWith('<div class="mermaid');

      if (line === '') {
        if (inParagraph) {
          processed.push('</p>');
          inParagraph = false;
        }
      } else if (isBlockElement) {
        if (inParagraph) {
          processed.push('</p>');
          inParagraph = false;
        }
        processed.push(line);
      } else {
        if (!inParagraph) {
          processed.push('<p>');
          inParagraph = true;
        } else {
          processed.push('<br>');
        }
        processed.push(line);
      }
    }

    if (inParagraph) {
      processed.push('</p>');
    }

    return processed.join('');
  }
}
