import { Picker } from "emoji-picker-element";

class CommentEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
  
    connectedCallback() {
      this.render();
      this.initializeEditor();
    }
  
    render() {
      this.shadowRoot.innerHTML = `
        <style>
          .comment-editor {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          textarea {
            flex: 1;
          }
          .emoji-picker {
            display: none;
          }
        </style>
        <div class="comment-editor">
          <div id="editor"></div>
          <div class="actions">
            <button id="toggle-emoji">😃</button>
            <button id="submit-comment">Submit</button>
          </div>
          <div class="emoji-picker">
            <emoji-picker></emoji-picker>
          </div>
        </div>
      `;
    }
  
    initializeEditor() {
      const editor = new EditorJS({
        holder: 'editor',
        autofocus: true,
        tools: {
          header: Header,
          delimiter: Delimiter,
          quote: Quote,
          list: NestedList,
          checklist: Checklist,
          table: Table,
          paragraph: Paragraph,
          underline: Underline,
          code: CodeTool,
          raw: RawTool,
          embed: Embed,
          image: SimpleImage,
        },
        data: {}
      });
  
      const toggleEmojiButton = this.shadowRoot.querySelector('#toggle-emoji');
      const emojiPicker = this.shadowRoot.querySelector('.emoji-picker');
      toggleEmojiButton.addEventListener('click', () => {
        emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
      });
  
      const submitButton = this.shadowRoot.querySelector('#submit-comment');
      submitButton.addEventListener('click', () => {
        editor.save().then(outputData => {
          const event = new CustomEvent('submit', { detail: JSON.stringify(outputData) });
          this.dispatchEvent(event);
        });
      });
  
      const emojiPickerElement = this.shadowRoot.querySelector('emoji-picker');
      emojiPickerElement.addEventListener('emoji-click', event => {
        editor.insertEmbed({
          type: 'emoji',
          service: 'emoji',
          source: event.detail.unicode,
          embed: event.detail.unicode,
        });
      });
    }
  }
  
  customElements.define('globular-comment-editor', CommentEditor);