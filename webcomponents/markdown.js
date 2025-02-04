import '@polymer/marked-element/marked-element.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { getTextColorForBackground } from './utility';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

const md = new MarkdownIt();

/**
 * Markdown element.
 */
export class Markdown extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.originalMarkdown = "";
  }

  connectedCallback() {
    const theme = this.getAttribute('theme') || '';
    const backgroundColor = this.getAttribute('background-color') || '#f5f2f0';
    const codeBackgroundColor = this.getAttribute('code-background-color') || '#f5f2f0';
    const textColor = this.getAttribute('text-color') || getTextColorForBackground(backgroundColor);

    this.shadowRoot.innerHTML = `
      <style>
        @import url('https://cdn.jsdelivr.net/npm/highlight.js/styles/default.min.css');
        @import url('${theme}');

        paper-icon-button {
          width: 36px;
          height: 36px;
        }
       
        .copy-button {
          position: absolute;
          right: 0.5rem;
          top: 0.5rem;
          background-color: ${backgroundColor};
          color: ${getTextColorForBackground(backgroundColor)};
          border-radius: 50%;
        }
       
        code.hljs {
          background-color: ${codeBackgroundColor};
          margin-bottom: 1rem;
        }
       
        #content {
          padding: 1.5rem;
          border-radius: 0.5rem;
          border: 1px solid var(--divider-color, #eae7e3);
          overflow: auto;
          margin-bottom: 10px;
          background-color: ${backgroundColor};
          color: ${textColor};
        }
      </style>

      <div id="content"></div>
      <slot></slot>
    `;

    const content = this.shadowRoot.querySelector('#content');
    const slot = this.shadowRoot.querySelector('slot');

    slot.addEventListener('slotchange', () => {
      const assignedNodes = slot.assignedNodes();
      let markdownText = "";
      
      Array.from(assignedNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE || node.nodeName === "CODE" || node.nodeName === "PRE")
        .forEach(node => {
          markdownText += node.textContent || node.innerText;
        });

      if (markdownText === "") return;

      this.originalMarkdown = markdownText.trim();
      content.innerHTML = md.render(this.originalMarkdown);

      this.highlightCodeBlocks();
    });
  }

  highlightCodeBlocks() {
    const codeBlocks = this.shadowRoot.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      let code = block.textContent;
      hljs.highlightElement(block);

      let copyButton = document.createElement('paper-icon-button');
      copyButton.setAttribute('icon', 'content-copy');
      copyButton.setAttribute('title', 'Copy to clipboard');
      copyButton.setAttribute('class', 'copy-button');
      copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(code).then(() => {
          copyButton.setAttribute('icon', 'check');
          setTimeout(() => {
            copyButton.setAttribute('icon', 'content-copy');
          }, 1000);
        });
      });

      block.parentElement.style.position = 'relative';
      block.parentElement.appendChild(copyButton);
    });
  }

  getMarkdown() {
    return this.originalMarkdown;
  }
}

customElements.define('globular-markdown', Markdown);
