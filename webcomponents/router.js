export class Router extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
  
      // Handle browser navigation (back/forward)
      window.addEventListener('popstate', () => {
        this.dispatchRouteChange();
      });
    }
  
    connectedCallback() {
      // Initialize the router with the current path
      this.dispatchRouteChange();
    }
  
    navigate(path) {
      if (window.location.pathname !== path) {
        history.pushState({}, '', path);
        this.dispatchRouteChange();
      }
    }
  
    dispatchRouteChange() {
      const event = new CustomEvent('route-change', {
        detail: { path: window.location.pathname },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }
  }
  
  // Define the custom element
  customElements.define('globular-router', Router);
  