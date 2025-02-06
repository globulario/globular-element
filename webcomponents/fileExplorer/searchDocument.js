import { Backend, displayMessage } from "../../backend/backend";

/**
 * The search document bar.
 */
export class SearchDocumentBar extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
    }

    // The connection callback.
    connectedCallback() {

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

            input {
                width: 100%;
                border: none;
                margin-right: 11px;   
                background: transparent;
                color: var(--on-primary-color);
                box-sizing: border-box;
                font-size: 1.2rem;
            }

            ::placeholder { /* Chrome, Firefox, Opera, Safari 10.1+ */
                color: var(--palette-text-accent);
                opacity: 1; /* Firefox */
            }


            iron-icon{
                padding-left: 11px;
                padding-right: 11px;
            }

            input:focus{
                outline: none;
            }

            input:-webkit-autofill {
                background-color: var(--surface-color) !important; /* Dark mode color */
                color: var(--on-surface-color) !important;
                box-shadow: 0 0 0px 1000px var(--surface-color) inset !important;
            }

            input:-webkit-autofill:not(:focus) {
                background-color: var(--primary-color); /* Reverts to normal autofill color */
                color: var(--on-primary-color);
                box-shadow: 0 0 0px 1000px var(--primary-color) inset !important;
            }

            #search-bar {
                min-width: 280px;
                display: flex;
                align-items: center;
                border-radius: 22px;
                box-sizing: border-box;
                font-size: 16px;
                height: var(--searchbox-height);
                opacity: 1;
                transition: none;
                background: transparent;
                color: var(--palette-text-accent);
                border: 1px solid var(--palette-divider);
                position: relative;
            }


            #search_icon:hover{
                cursor: pointer;
            }

        </style>
        <div id="search-bar">
            <iron-icon id='search_icon' icon="search" style="--iron-icon-fill-color: var(--palette-text-accent);" ></iron-icon>
            <input id='search_input' placeholder="Search"></input>
        </div>
        `

        let searchInput = this.shadowRoot.getElementById("search_input")
        let searchIcon = this.shadowRoot.getElementById("search_icon")
        let div = this.shadowRoot.getElementById("search-bar")

        searchInput.onblur = () => {
            
            div.style.boxShadow = ""
            div.style.backgroundColor = ""

            searchInput.style.backgroundColor = "transparent"
            searchInput.style.color = "var(--on-primary-color)"
            searchIcon.style.color = "var(--on-primary-color)"
        }


        searchInput.onfocus = (evt) => {
            evt.stopPropagation();
            div.style.boxShadow = "var(--dark-mode-shadow)"
            div.style.backgroundColor = "var(--surface-color)"
            searchInput.style.color = "var(--on-surface-color)"
            searchIcon.style.color = "var(--on-surface-color)"
        }
    }
}

// Define the custom element.
customElements.define('globular-search-document-bar', SearchDocumentBar);