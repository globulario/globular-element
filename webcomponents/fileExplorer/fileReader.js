import { generatePeerToken, getUrl } from "../../backend/backend";

/**
 * Sample empty component
 */
export class GlobularFileReader extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            ::-webkit-scrollbar {
                width: 5px;
                height: 5px;
            }
                
            ::-webkit-scrollbar-track {
                background: var(--surface-color);
            }
            
            ::-webkit-scrollbar-thumb {
                background: var(--palette-divider); 
            }

            #title{
                flex-grow: 1;
                text-align: center;
                font-size: 1.2rem;
            }

            #header{
                display: flex;
                align-items: center;
                background-color: var(--surface-color);
                color: var(--on-surface-color);
                border-bottom: 1px solid var(--palette-divider);
            }

        </style>
        <div id="content"  style="width: 100%; height: calc(100% - 40px);">
            <div id="header">
                <span id="title"></span>
                <paper-icon-button icon="icons:close" id="close-btn" style="--iron-icon-fill-color: var(--palette-text-accent);"></paper-icon-button>
            </div>
            <iframe id="frame" style="width: 100%; height: 100%; border: none;"></iframe>

        </div>
        `

        // give the focus to the input.
        this.frame = this.shadowRoot.querySelector("#frame")
        this.closeBtn = this.shadowRoot.querySelector("#close-btn")
        this.content = this.shadowRoot.querySelector("#content")
        this.file = null;
        this.onclose = null;
        this.titleDiv = this.shadowRoot.querySelector("#title")

        this.closeBtn.onclick = () => {
            this.content.style.display = "none"
            if (this.onclose) {
                this.onclose()
            }
        }
    }

    read(file, page = 0) {

        this.file = file;

        // Read the file...
        let url = getUrl(file.globule)

        file.getPath().split("/").forEach(item => {
            if (item.trim() != "") {
                url += "/" + encodeURIComponent(item.trim())
            }
        })

 

       
        generatePeerToken(file.globule, token => {
            url += "?domain=" + file.globule.domain
            url += "&token=" + token
            let mime = file.getMime()
            if (mime == "application/pdf") {
                this.frame.src = "about:blank"
                // Set the file location.
                url += "#page=" + page
            }
            this.frame.src = url
        }, error => {
            console.error(error)
        })

        // must be white...
        this.content.style.display = ""
        this.frame.style.background = "white";
        this.titleDiv.innerHTML = this.file.getPath().split("/")[this.file.getPath().split("/").length - 1]
    }

}

customElements.define('globular-file-reader', GlobularFileReader)