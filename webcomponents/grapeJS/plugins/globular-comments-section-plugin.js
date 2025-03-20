import grapesjs from 'grapesjs';

export default grapesjs.plugins.add('gjs-plugin-comment-section', (editor, options = {}) => {
  // Load required script and style (if any)
  
  const scriptUrl = 'path/to/your/comment-component-script.js';
  const styleUrl = 'path/to/your/comment-component-style.css';

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
  }
  

  // Add custom comment component
  editor.Components.addType('comment-section', {
    model: {
      defaults: {
        tagName: 'globular-comment-list', // Use the custom element tag name
        attributes: {
          'background-color': '#ffffff',
          'text-color': '#000000',
        },
        components: '', // No initial components inside the comment section
        stylable: ['background-color', 'text-color'],
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
  editor.BlockManager.add('comment-section', {
    label: 'Comment Section',
    category: 'Basic',
    content: { type: 'comment-section' },
  });
});
