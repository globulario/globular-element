// grapesjs-globular-markdown-plugin.js
export default (editor, opts = {}) => {
  const options = {
    label: 'Markdown',
    category: 'Basic',
    scriptUrl: 'URL_TO_GLOBULAR_MARKDOWN_JS', // <-- Replace with actual URL
    ...opts,
  };

  // Add the block
  editor.BlockManager.add('markdown-block', {
    label: options.label,
    category: options.category,
    content: `
      <globular-markdown 
        background-color="#ffffff" 
        theme="https://cdn.jsdelivr.net/npm/highlight.js@10.7.2/styles/tomorrow.min.css">
        <pre><![CDATA[
## Example Markdown Content
This is a sample Markdown content rendered by the \`globular-markdown\` component.

\`\`\`javascript
const greeting = 'Hello, world!';
console.log(greeting);
\`\`\`
        ]]></pre>
      </globular-markdown>
    `,
    attributes: { class: 'fa fa-code' },
  });

  // Define the component
  editor.DomComponents.addType('globular-markdown', {
    model: {
      defaults: {
        tagName: 'globular-markdown',
        traits: [
          {
            type: 'text',
            name: 'background-color',
            label: 'Background Color',
          },
          {
            type: 'text',
            name: 'code-background-color',
            label: 'Code Background',
          },
          {
            type: 'text',
            name: 'text-color',
            label: 'Text Color',
          },
          {
            type: 'text',
            name: 'theme',
            label: 'Theme URL',
          },
        ],
        script: function () {
          if (!window.globularMarkdownLoaded) {
            window.globularMarkdownLoaded = true;
            const script = document.createElement('script');
            script.src = '${options.scriptUrl}'; // Load Web Component script
            script.type = 'module';
            document.head.appendChild(script);
          }

          // Ensure the component initializes properly
          this.connectedCallback();
        },
      },
    },
    isComponent(el) {
      if (el.tagName === 'GLOBULAR-MARKDOWN') {
        return { type: 'globular-markdown' };
      }
    },
  });
};
