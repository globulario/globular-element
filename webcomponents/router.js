export class Router extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      // Set the base path for the router
      if (!this.hasAttribute('base')) {
        const base = window.location.pathname.split('/')[1];
        this.setAttribute('base', base);
      }

      // Get the base path from the attribute
      this.base = "/" + this.getAttribute('base');

      // Set the base path in localStorage
      localStorage.setItem('application', this.base);
      
      // Handle browser navigation (back/forward)
      window.addEventListener('popstate', () => {
        this.dispatchRouteChange();
      });
    }
  
    connectedCallback() {
      // Initialize the router with the current path
      this.dispatchRouteChange();
    }
  
    navigate(paths) {
      let route = paths[0];
      if(!route.startsWith(this.base)) {
        route = this.base + route;
      }
      if (window.location.pathname !== route) {
        history.pushState({}, '', route);
        this.dispatchRouteChange();
      }
    }
  
    // The setRoute method will change the path and trigger the event
    setRoute(path) {
      let route = path;
      if(!route.startsWith(this.base)) {
        route = this.base + route;
      }
      if (window.location.pathname !== route) {
        history.replaceState({}, '', route);  // Using replaceState to change without adding to the history stack
        this.dispatchRouteChange();
      }
    }
  
    dispatchRouteChange() {
      let path = window.location.pathname;
      if (path.startsWith(this.base)) {
        path = path.substring(this.base.length);
      }
      const event = new CustomEvent('route-change', {
        detail: { path: path },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }
  }
  
  // Define the custom element
  customElements.define('globular-router', Router);
  