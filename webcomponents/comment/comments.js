import './comment.js';
import './commentEditor.js';

class CommentList extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.comments = [];
    }
  
    connectedCallback() {
      this.render();
    }
  
    render() {
      this.shadowRoot.innerHTML = `
        <style>
          .comment-list {
            margin-top: 20px;
          }
        </style>
        <div class="comment-list">
          <comment-editor on-submit="addComment"></comment-editor>
          <div id="comments"></div>
        </div>
      `;
  
      const commentsDiv = this.shadowRoot.querySelector('#comments');
      commentsDiv.innerHTML = '';
      this.comments.forEach(comment => {
        const commentElement = new Comment();
        commentElement.setAttribute('comment', JSON.stringify(comment));
        commentsDiv.appendChild(commentElement);
      });
    }
  
    addComment(commentText) {
      this.comments.push({ text: commentText, likes: 0, replies: [], creationTime: Date.now(), authorId: 'Author', authorProfilePicture: '' });
      this.render();
    }
  }
  
  customElements.define('globular-comment-list', CommentList);