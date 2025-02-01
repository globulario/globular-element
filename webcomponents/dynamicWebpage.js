export class DynamicPage extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: 'open' });


        this.pageHtml = '';
        this.errorMessage = '';

        this.shadowRoot.innerHTML = `
        <style>
          .dynamic-container {
            font-family: Arial, sans-serif;
            background-color: #f9f9f9;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 2px 4px #0000001a;
            background-color: var(--surface-color);

          }
          .content-frame {
            border: none;
            width: 100%;
          }
          .error-message {
            color: red;
            font-size: 14px;
            margin-top: 20px;
          }
          iframe {
            width: 100%;
            border: none;
            overflow: hidden;
          }
        </style>
        <div class="dynamic-container">
          <iframe class="content-frame" frameborder="0" width="100%"></iframe>
          <div class="error-message" hidden></div>
        </div>
      `;

        this.iframe = this.shadowRoot.querySelector('.content-frame');
        this.errorDiv = this.shadowRoot.querySelector('.error-message');
    }

    connectedCallback() {
        document.addEventListener('pageSelected', (event) => this.updatePageContent(event.detail));
        document.addEventListener('pageError', (event) => this.displayErrorMessage(event.detail));
    }

    disconnectedCallback() {
        document.removeEventListener('pageSelected', this.updatePageContent);
        document.removeEventListener('pageError', this.displayErrorMessage);
    }

    updatePageContent({ path, content }) {

        this.title = `Page: ${path}`;
        this.pageHtml = content;
        this.errorMessage = '';

        this.iframe.srcdoc = this.pageHtml;
        this.errorDiv.hidden = true;

        this.iframe.onload = () => this.adjustIframeHeight();
    }

    displayErrorMessage(message) {

        this.errorMessage = message;
        this.pageHtml = '';
        this.iframe.srcdoc = '';

        this.errorDiv.textContent = this.errorMessage;
        this.errorDiv.hidden = false;
    }

    adjustIframeHeight() {
      const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow?.document;
  
      if (iframeDocument) {
          const adjustHeight = () => {
              const body = iframeDocument.body;
              const html = iframeDocument.documentElement;
  
              // Reset margin and padding to avoid extra space
              body.style.margin = 0;
              body.style.padding = 0;
              html.style.margin = 0;
              html.style.padding = 0;
              body.style.overflow = '';
  
              // Calculate the content height of the iframe
              const contentHeight = Math.max(
                  body.scrollHeight, body.offsetHeight,
                  html.scrollHeight, html.offsetHeight
              );
  
              // Get iframe computed style to account for padding and borders
              const iframeStyle = window.getComputedStyle(this.iframe);
              const iframePadding = parseInt(iframeStyle.paddingTop) + parseInt(iframeStyle.paddingBottom);
              const iframeBorder = parseInt(iframeStyle.borderTopWidth) + parseInt(iframeStyle.borderBottomWidth);
  
              // Adjust height considering the iframe's padding and border
              const adjustedHeight = contentHeight + iframePadding + iframeBorder;
  
              // Set the iframe height to the adjusted content height
              this.iframe.style.height = `${adjustedHeight}px`;
  
              // Check if the scrollbar is visible and keep adjusting until it is not
              const hasScrollbar = iframeDocument.documentElement.scrollHeight > iframeDocument.documentElement.clientHeight +15;
  
              if (hasScrollbar) {
                  // If scrollbar is visible, increase height slightly and check again
                  this.iframe.style.height = `${adjustedHeight + 1}px`;  // Slightly increase height
                  setTimeout(adjustHeight, 100);  // Recursively adjust until no scrollbar
              }else{
                body.style.overflow = 'hidden';
              }
          };
  
          // Trigger height adjustment when iframe content is loaded
          this.iframe.onload = adjustHeight;
  
          // If the iframe is already loaded, trigger adjustment immediately
          if (this.iframe.contentWindow.document.readyState === 'complete') {
              adjustHeight();
          }
  
          // Adjust iframe height when the window is resized
          window.addEventListener('resize', adjustHeight);
  
          // Fire resize event to trigger height adjustment
          setTimeout(() => window.dispatchEvent(new Event('resize')), 5);
      }
  }
  
  
}

customElements.define('globular-dynamic-page', DynamicPage);