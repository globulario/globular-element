class Comment extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
  
    connectedCallback() {
      this.render();
    }
  
    render() {
      const comment = JSON.parse(this.getAttribute('comment'));
      this.shadowRoot.innerHTML = `
        <style>
          .comment {
            border: 1px solid #ddd;
            padding: 10px;
            margin-bottom: 10px;
            display: flex;
            flex-direction: column;
          }
          .actions, .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header img {
            width: 32px;
            height: 32px;
            border-radius: 16px;
          }
        </style>
        <div class="comment">
          <div class="header">
            <div>
              <img src="${comment.authorProfilePicture}" alt="Author Profile Picture">
              <span>${comment.authorId}</span>
            </div>
            <span>${this.timeSince(new Date(comment.creationTime))}</span>
          </div>
          <div id="comment-text"></div>
          <div class="actions">
            <button onclick="this.parentElement.parentElement.likeComment()">Like (${comment.likes})</button>
            <button onclick="this.parentElement.parentElement.reply()">Reply</button>
          </div>
          <div id="replies"></div>
        </div>
      `;
      this.displayCommentText(comment.text);
    }
  
    displayCommentText(text) {
      const textDiv = this.shadowRoot.querySelector('#comment-text');
      textDiv.innerHTML = jsonToHtml(JSON.parse(text));
    }
  
    timeSince(date) {
      const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 },
        { label: 'second', seconds: 1 }
      ];
      const seconds = Math.floor((Date.now() - date) / 1000);
      const interval = intervals.find(i => i.seconds < seconds);
      const count = Math.floor(seconds / interval.seconds);
      return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
    }
  
    likeComment() {
      const comment = JSON.parse(this.getAttribute('comment'));
      comment.likes += 1;
      this.setAttribute('comment', JSON.stringify(comment));
      this.render();
    }
  
    reply() {
      const commentEditor = document.createElement('comment-editor');
      commentEditor.setAttribute('on-submit', 'addReply');
      this.shadowRoot.querySelector('#replies').appendChild(commentEditor);
    }
  
    addReply(replyText) {
      const comment = JSON.parse(this.getAttribute('comment'));
      comment.replies.push({ text: replyText, likes: 0, replies: [], creationTime: Date.now(), authorId: 'ReplyAuthor', authorProfilePicture: '' });
      this.setAttribute('comment', JSON.stringify(comment));
      this.render();
    }
  }
  customElements.define('globular-comment-component', Comment);