import './webcomponents/applicationLayout'
import './webcomponents/webpageManager'
import './webcomponents/themeEditor'
import './webcomponents/codeBlock'
import './webcomponents/markdown'
import './webcomponents/image'
import './webcomponents/menu'
import './webcomponents/carousel'
import './webcomponents/slideShow'
import './webcomponents/dialog'
import "./webcomponents/audio"
import "./webcomponents/video"
import "./webcomponents/charts"
import "./webcomponents/search/search"
import "./webcomponents/informationManager/informations"
import "./webcomponents/fileExplorer/fileExplorer"
import "./webcomponents/blogPost/blogPosts"
import "./webcomponents/grapeJS/grape"
import "./webcomponents/table"
import "./webcomponents/session/login"
import "./webcomponents/session/session"
import { Backend } from './backend/backend';
import './webcomponents/router';
import './webcomponents/dynamicWebpage';

// Import the styles
import './styles.css';
import "./webcomponents/style.css"

import "tailwindcss/tailwind.css"
import "highlight.js/styles/github.css"
import { fireResize } from './Utility'


// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Document loaded");
    // Initialize the backend
    Backend.init("https://localhost:443", () => {
        // Here I will find the dynamic page component and call the updatePageContent method
        const webpageManager = document.querySelector('globular-webpage-manager') as any;
        if (webpageManager == null) {
            // If the webpage manager is not found, then we can't do anything
            // so we just return
            return;
        }

        webpageManager.router = document.querySelector('globular-router') as any;

        if (webpageManager.router == null) {
            webpageManager.router = document.createElement('globular-router');
            document.body.appendChild(webpageManager.router);
        }

        // Intercept the URL and modify it for your custom routing
        if (webpageManager && webpageManager.router) {
            // Listen for route changes from the custom router
            webpageManager.router.addEventListener('route-change', (event: any) => {
                const pagePath = event.detail.path;
                // Update the page content dynamically
                setTimeout(() => {
                    webpageManager.setPage(pagePath);
                }, 0);
            });

            // Initialize with the current URL
            (async () => {
                // Handle initial URL
                const currentUrl = window.location.pathname;
                await webpageManager.loadPages(webpageManager.root, currentUrl);
            })();

        } else {
            console.error('globular-webpage-manager or globular-router not found in DOM.');
        }


        // Search result event...
        Backend.eventHub.subscribe("_display_search_results_",
            uuid => { },
            evt => {
                let pages = document.querySelector("globular-dynamic-page") as any
                if (pages != undefined) {
                    pages.style.display = "none"
                }

                // Display the search results
                let searchResults = document.querySelector("globular-search-results") as any
                if (searchResults != undefined) {
                    searchResults.style.display = ""
                    return
                }

            }, true)

        Backend.eventHub.subscribe("_hide_search_results_",
            uuid => { },
            evt => {
                let pages = document.querySelector("globular-dynamic-page") as any
                if (pages != undefined) {
                    pages.style.display = ""
                    fireResize()
                }

                // Hide the search results
                let searchResults = document.querySelector("globular-search-results") as any
                if (searchResults != undefined) {
                    searchResults.style.display = "none"
                    return
                }
            }, true)
    }, err => {
        console.log("Error:", err)
    });
});
