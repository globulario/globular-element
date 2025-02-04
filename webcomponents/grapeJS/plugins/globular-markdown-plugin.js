import grapesjs from 'grapesjs';

export default grapesjs.plugins.add('gjs-plugin-globular-markdown', (editor, options = {}) => {
  // Load required script and style
  /*const scriptUrl = 'https://globular.io/globular-element/bundle.min.js';
  const styleUrl = 'https://globular.io/globular-element/style.css';

  if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.defer = true;
    document.head.appendChild(script);
  }

  if (!document.querySelector(`link[href="${styleUrl}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = styleUrl;
    document.head.appendChild(link);
  }*/

  // Add custom markdown component
  editor.Components.addType('globular-markdown', {
    model: {
      defaults: {
        tagName: 'globular-markdown',
        attributes: {
          'background-color': '#f5f2f0',
          'code-background-color': '#f5f2f0',
          'text-color': '#000000',
          theme: '',
        },
        components: 'Type your **Markdown** content here...',
        stylable: ['background-color', 'text-color', 'code-background-color'],
        droppable: true,
      },
    },
    view: {
      init() {
        this.listenTo(this.model, 'change:components', this.updateContent);
      },
      updateContent() {
        const el = this.el;
        const content = this.model.get('components').map(comp => comp.toHTML()).join('');
        el.innerHTML = content;
      },
    },
  });

  // Add component to GrapesJS block manager
  editor.BlockManager.add('globular-markdown', {
    label: 'Markdown',
    category: 'Basic',
    content: { type: 'globular-markdown' },
  });
});
