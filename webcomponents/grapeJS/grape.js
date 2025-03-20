// Import necessary dependencies
import grapesjs from 'grapesjs';
import tailwindPlugin from 'grapesjs-tailwind';
import bootstrap5Plugin from '@toiyabe/grapesjs-blocks-bootstrap-5/dist/grapesjs-blocks-bootstrap-5.min.js.min.js';
import scripEditorPlugin from 'grapesjs-script-editor';
import componentCodeEditorPlugin from 'grapesjs-component-code-editor';
import parserPostCSSPlugin from 'grapesjs-parser-postcss';
import { fireResize } from '../utility';
import ckEditorPlugin from 'grapesjs-plugin-ckeditor';
import exportPlugin from 'grapesjs-plugin-export';
import postcss from 'postcss';
import removeDuplicateValues from 'postcss-discard-duplicates';
import "grapesjs-component-code-editor/dist/grapesjs-component-code-editor.min.css"
import "grapesjs/dist/css/grapes.min.css"

// Globular plugin's
import markdownPlugin from './plugins/globular-markdown-plugin';
import commentsPlugin from './plugins/globular-comments-section-plugin';

class ExternalResourceManager extends HTMLElement {
    constructor() {
        super();

        // Create shadow root
        const shadow = this.attachShadow({ mode: 'open' });

        // Modal container
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Manage External Resources</h2>
          <ul class="resource-list"></ul>
          <div class="add-resource">
            <select>
              <option value="script">Script</option>
              <option value="link">Stylesheet</option>
            </select>
            <input type="text" placeholder="Enter URL" />
            <iron-icon class="add-btn" icon="add" title="Add"></iron-icon>
          </div>
        </div>
      `;

        // Modal styles
        const style = document.createElement('style');
        style.textContent = `
        input[type="text"] {
            width: 100%;
            padding: 5px;
            margin: 5px 0;
            box-sizing: border-box;
            border: none;
            border-bottom: 1px solid #ccc;
            outline: none;
            font-size: 1rem;
            background: var(--gjs-secondary-dark-color);
            color: var(--gjs-secondary-color);
            font-family: var(--gjs-main-font);
            font-size: var(--gjs-font-size);
        }

        select {
            background-color: transparent;
            padding: 5px;
            margin: 5px 0;
            box-sizing: border-box;
            border: none;
            outline: none;
            font-size: 1rem;
            background: var(--gjs-secondary-dark-color);
            color: var(--gjs-secondary-color);
            font-family: var(--gjs-main-font);
            font-size: var(--gjs-font-size);
        }

        select option {
          background: var(--gjs-primary-color);
          color: var(--gjs-secondary-color);
        }

        iron-icon {
            margin: 0 5px;
            cursor: pointer;
        }

        iron-icon:hover {
            color: #007bff;
        }
        .add-resource {
            display: flex;
            align-items: center;
        }
        .add-btn {
            cursor: pointer;
        }
        
        .modal {
     
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          overflow: auto;
          background-color: rgba(0, 0, 0, 0.4);
        }
        .modal-content {
          background-color: #fff;
          margin: 10% auto;
          padding: 20px;
          border: 1px solid rgba(61,61,61, 1);
          width: 800px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          background: var(--gjs-primary-color);
          color: var(--gjs-secondary-color);
          font-family: var(--gjs-main-font);
          font-size: var(--gjs-font-size);
          position: relative;
          box-sizing: border-box;
        }
        .close {
          float: right;
          font-size: 24px;
          cursor: pointer;
        }
        .resource-list {
          list-style: none;
          padding: 0;
        }
        .resource-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .resource-item span,
        .resource-item input {
          flex: 1;
          margin-right: 10px;
        }
      `;

        // Append modal and styles
        shadow.appendChild(style);
        shadow.appendChild(modal);

        // Close modal logic
        const closeModal = modal.querySelector('.close');
        closeModal.addEventListener('click', () => this.closeModal());

        // Add resource logic
        const addResourceBtn = modal.querySelector('.add-btn');
        const resourceTypeSelect = modal.querySelector('select');
        const resourceInput = modal.querySelector('input');
        const resourceList = modal.querySelector('.resource-list');

        addResourceBtn.addEventListener('click', () => {
            const type = resourceTypeSelect.value;
            const url = resourceInput.value.trim();
            if (url) {
                this.addResource(type, url);
                resourceInput.value = '';
            }
        });

        this.modal = modal;
        this.resourceList = resourceList;
    }

    openModal() {
        this.modal.style.display = 'block';
        this.loadExistingResources();
    }

    closeModal() {
        this.modal.style.display = 'none';
    }

    loadExistingResources() {
        const iframeDoc = this.iframeDoc;
        this.resourceList.innerHTML = '';

        // Load <script> and <link> elements
        ['script', 'link'].forEach((type) => {
            const elements = type === 'script' ? iframeDoc.querySelectorAll('script[src]') : iframeDoc.querySelectorAll('link[rel="stylesheet"]');
            elements.forEach((el) => {
                const url = type === 'script' ? el.src : el.href;
                this.addResourceItem(type, url, false);
            });
        });
    }

    addResource(type, url) {

        // Check if the resource already exists
        const elements = this.iframeDoc.querySelectorAll(type === 'script' ? 'script[src]' : 'link[rel="stylesheet"]');
        let exists = false;
        elements.forEach((el) => {
            if ((type === 'script' && el.src === url) || (type === 'link' && el.href === url)) {
                exists = true;
            }
        });

        if (exists) {
            return;
        }

        // Test if the URL is valid
        try {
            new URL(url);
        } catch (e) {
            alert('Invalid URL');
            return;
        }

        // If the type is css then the url should end with .css
        if (type === 'link' && !url.endsWith('.css')) {
            alert('Invalid URL');
            return;
        }

        if (type === 'script' && !url.endsWith('.js')) {
            alert('Invalid URL');
            return;
        }


        this.addResourceItem(type, url, true);
    }


    addResourceToDocument(type, url) {

        const iframeDoc = this.iframeDoc;
        let element;
        if (type === 'script') {
            element = document.createElement('script');
            element.src = url;
        } else if (type === 'link') {
            element = document.createElement('link');
            element.rel = 'stylesheet';
            element.href = url;
        }

        if (element) {
            // I will add the element to the head of the iframe document if it does not exist
            iframeDoc.head.querySelectorAll(type === 'script' ? 'script' : 'link').forEach((el) => {
                if ((type === 'script' && el.src === url) || (type === 'link' && el.href === url)) {
                    return; // The element already exists
                }
            });

            if (element) {
                iframeDoc.head.appendChild(element);
            }

        }
    }

    addResourceItem(type, url, isNew) {

        // I will test if the item already exists
        const items = this.resourceList.querySelectorAll('.resource-item');
        for (let i = 0; i < items.length; i++) {
            const span = items[i].querySelector('span');
            if (span.textContent === url) {
                return; // The item already exists
            }
        }


        const li = document.createElement('li');
        li.className = 'resource-item';
        li.innerHTML = `
        <span>${url}</span>
        <input type="text" value="${url}" style="display: none;" />
        <iron-icon class="move-up-btn" icon="arrow-upward" title="Move Up"></iron-icon>
        <iron-icon class="move-down-btn" icon="arrow-downward" title="Move Down"></iron-icon>
        <iron-icon class="edit-btn" icon="editor:mode-edit" title="Edit"></iron-icon>
        <iron-icon class="delete-btn" icon="delete" title="Delete"></iron-icon>
      `;
        this.resourceList.appendChild(li);

        const span = li.querySelector('span');
        const input = li.querySelector('input');
        const moveUpBtn = li.querySelector('.move-up-btn');
        const moveDownBtn = li.querySelector('.move-down-btn');
        const editBtn = li.querySelector('.edit-btn');
        const deleteBtn = li.querySelector('.delete-btn');

        // Move up logic
        moveUpBtn.addEventListener('click', () => {
            const prevSibling = li.previousElementSibling;
            if (prevSibling) {
                this.resourceList.insertBefore(li, prevSibling);
                this.updateOrderInDocument();
            }
        });

        // Move down logic
        moveDownBtn.addEventListener('click', () => {
            const nextSibling = li.nextElementSibling;
            if (nextSibling) {
                this.resourceList.insertBefore(nextSibling, li);
                this.updateOrderInDocument();
            }
        });

        // Edit logic
        editBtn.addEventListener('click', () => {
            if (span.style.display === 'none') {
                // Save changes
                const newUrl = input.value.trim();
                if (newUrl && newUrl !== url) {
                    this.updateResource(type, url, newUrl);
                    span.textContent = newUrl;
                    url = newUrl;
                }
                input.style.display = 'none';
                span.style.display = 'block';
            } else {
                // Enter edit mode
                span.style.display = 'none';
                input.style.display = 'block';
                input.focus();
            }
        });

        // Delete logic
        deleteBtn.addEventListener('click', (evt) => {
            evt.stopPropagation();
            this.deleteResource(type, url);
            li.remove();
            this.updateOrderInDocument();
        });

        if (isNew) {
            this.addResourceToDocument(type, url);
        }
    }

    updateOrderInDocument() {
        const iframeDoc = this.iframeDoc;
        const elements = this.resourceList.querySelectorAll('.resource-item');
        const head = iframeDoc.head;

        // Here I will remove script witout src and reappend them at the end
        const localScripts = head.querySelectorAll('script:not([src])');

        const localStyles = head.querySelectorAll('link:not([href])');

        // Clear existing scripts and styles
        head.querySelectorAll('script, link', 'style').forEach(el => el.remove());


        // Add elements in updated order
        elements.forEach(li => {
            const type = li.querySelector('span').textContent.includes('.js') ? 'script' : 'link';
            const url = li.querySelector('span').textContent;

            if (type === 'script') {
                const script = document.createElement('script');
                script.src = url;
                head.appendChild(script);
            } else if (type === 'link') {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                head.appendChild(link);
            }
        });


        localStyles.forEach(style => {
            head.appendChild(style); // Move the style to the end of the head
        });

        localScripts.forEach(script => {
            head.appendChild(script); // Move the script to the end of the head
        });

    }

    // Delete resource
    deleteResource(type, url) {
        const iframeDoc = this.iframeDoc;
        const elements = type === 'script' ? iframeDoc.querySelectorAll('script') : iframeDoc.querySelectorAll('link');
        elements.forEach((el) => {
            if ((type === 'script' && el.src === url) || (type === 'link' && el.href === url)) {
                el.remove();
            }
        });
    }

    set iframeDoc(doc) {
        this._iframeDoc = doc;
    }

    get iframeDoc() {
        return this._iframeDoc;
    }
}

// Define the custom element
customElements.define('external-resource-manager', ExternalResourceManager);


export class GrapesEditor extends HTMLElement {
    constructor() {
        super();
        // Create a shadow root for encapsulation
        this.attachShadow({ mode: 'open' });

        // Add Tailwind CSS link and slot to the shadow DOM
        this.shadowRoot.innerHTML = `

      <style>
        :host {
          display: block;
          height: 100%;
        }
        .editor-container {
          display: block;
          height: 100%;
          width: 100%;
        }
      </style>
      <globular-dialog is-moveable="true" is-resizeable="true" is-maximizeable="true" is-minimizeable="true" width="1200px" height="600px" class="editor-container" >
            <span slot="title">GrapesJS Editor</span>
            <!-- Named slot -->
            <slot name="editor"></slot>
      </globular-dialog>
    `;


        this.editor = null; // Reference to the GrapesJS editor
        const container = this.shadowRoot.querySelector('globular-dialog');
        container.onmove = () => {
            fireResize(); // Fire the resize event when the dialog is moved
        };

        container.onclose = () => {
            this.parentNode.removeChild(this);
        }

    }

    connectedCallback() {

        const slot = this.shadowRoot.querySelector('slot[name="editor"]');
        if (this.hasAttribute('title')) {
            this.shadowRoot.querySelector('span[slot="title"]').textContent = this.getAttribute('title');
        }

        // Listen for changes in the slot content
        slot.addEventListener('slotchange', () => {

            const assignedElements = slot.assignedElements();
            if (assignedElements.length > 0) {
                const container = assignedElements[0];
                if (container) {
                    // Initialize GrapesJS on the first assigned element
                    this.editor = grapesjs.init({
                        container,
                        height: '100%',
                        width: 'auto',
                        fromElement: true,
                        pageManager: true,
                        storageManager: false,
                        allowScripts: 1,
                        allowUnsafeAttr: true, // Allow the style tag to be added
                        plugins: [componentCodeEditorPlugin, markdownPlugin, commentsPlugin, /*tailwindPlugin,*/bootstrap5Plugin, scripEditorPlugin, ckEditorPlugin, parserPostCSSPlugin, exportPlugin],
                        pluginsOpts: {
                            [ckEditorPlugin]: {
                                options: {
                                    versionCheck: false,
                                    //other options...
                                }
                            },
                        },
                        canvas: {
                            styles: [
                            ],
                            scripts: [
                            ]
                        },
                    });

                    const resourceManager = document.createElement('external-resource-manager');

                    this.editor.on('load', () => {
                        const iframeDoc = this.editor.Canvas.getDocument(); // Access the iframe document directly
                        iframeDoc.body.style.fontFamily = 'Arial, sans-serif';

                        if (this.onload) {
                            this.onload(iframeDoc);
                            resourceManager.iframeDoc = editor.Canvas.getDocument(); // Access the iframe document
                            resourceManager.loadExistingResources();
                            document.body.appendChild(resourceManager);

                        };
                    });

                    // Adding a custom panel and button
                    const pn = this.editor.Panels;
                    const panelViews = pn.addPanel({
                        id: 'views',
                        el: document.createElement('div'), // Create a container element for the panel
                    });
                    panelViews.get('buttons').add([{
                        attributes: {
                            title: 'Open Code',
                        },
                        className: 'fa fa-file-code-o', // FontAwesome icon class for the button
                        command: 'open-code',           // Command name to trigger when clicked
                        togglable: false,               // Prevent toggling the button
                        id: 'open-code',                // Unique button ID
                    }]);

                    // Grapes.js integration
                    this.editor.Panels.addButton('options', {
                        id: 'manage-resources',
                        active: false,
                        className: 'fa fa-link',
                        command: () => {
                            resourceManager.openModal();
                        },
                        attributes: { title: 'Manage External Links, Scripts, and Styles' },

                    });

                    // the save button
                    this.editor.Panels.addButton('options', {
                        id: 'save-page',
                        active: false,
                        className: 'fa fa-save',
                        command: () => this.saveContent(),
                        attributes: { title: 'Save the webpage on the server' },
                    });


                    // returns the html content of the editor
                    this.editor.getDocument = () => {
                        return this.editor.Canvas.getDocument();
                    }

                    // that function will be call when the save button is clicked
                    if (this.onready) {
                        this.onready();
                    }


                }
            } else {
                console.error('No element found in the "editor" slot.');
            }
        });
    }

    // Method to save the editor's content manually
    saveContent() {
        if (this.onsave) {
            // Add dynamic styles
            const head = this.editor.Canvas.getDocument().head;

            // Get the current styles and scripts in the canvas
            let scripts = head.querySelectorAll('script');

            // get link to the css
            let links = head.querySelectorAll('link');

            postcss([
                removeDuplicateValues({
                    // options here
                }),
            ])
                .process(this.editor.getCss(), { from: undefined })
                .then((result) => {
                    this.onsave(this.editor.getHtml(), result.css, scripts, links);
                });
        }
    }

    // Method to load the editor's content manually
    loadContent(html, css) {
        this.editor.setComponents(html);
        this.editor.setStyle(css);
        //this.editor.Canvas.render();
    }
}

// Define the custom element
customElements.define('grapes-editor', GrapesEditor);
