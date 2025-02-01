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
import "./webcomponents/informationManager/informations"
import "./webcomponents/fileExplorer/fileExplorer"
import "./webcomponents/blogPost/blogPosts"
import "./webcomponents/grapeJS/grape"
import "./webcomponents/table"
import { Backend } from './backend/backend';
import './webcomponents/router';
import './webcomponents/dynamicWebpage';
import './styles.css';
import "./webcomponents/style.css"
import "./webcomponents/plyr.css"

// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

    console.log("Document loaded");
    // Initialize the backend
    Backend.init("https://localhost:443", () => {
        // Here I will find the dynamic page component and call the updatePageContent method
        console.log("Backend initialized");

        const webpageManager = document.querySelector('globular-webpage-manager') as any;
        webpageManager.router = document.querySelector('globular-router') as any;
        if (webpageManager.router == null) {
            webpageManager.router = document.createElement('globular-router');
            document.body.appendChild(webpageManager.router);
        }

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
                await webpageManager.loadPages(webpageManager.root, window.location.pathname);
            })();
        } else {
            console.error('globular-webpage-manager or globular-router not found in DOM.');
        }
    }, err => {
        console.log("Error:", err)
    })

});