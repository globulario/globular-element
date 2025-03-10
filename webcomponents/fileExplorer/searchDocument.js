import { get } from "lodash";
import { Backend, displayMessage } from "../../backend/backend";
import { FileController } from "../../backend/file";
import { SearchDocumentsRequest } from "globular-web-client/search/search_pb";

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

        this._file_explorer_ = null
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

            let previousResults = this._file_explorer_.querySelector("globular-document-search-results");
            if (previousResults) {
                previousResults.style.display = "";
            }
        }

        searchIcon.onclick = () => {
            this.search()
        }

        searchInput.onkeyup = (evt) => {
            if (evt.key === "Enter") {
                this.search()
            }
            if(searchInput.value.length == 0){
                let previousResults = this._file_explorer_.querySelector("globular-document-search-results");
                if (previousResults) {
                    previousResults.parentElement.removeChild(previousResults);
                }
            }
        }
    }

    search() {
        let globule = Backend.globular;
        let searchInput = this.shadowRoot.getElementById("search_input")
        let searchValue = searchInput.value
        if (searchValue.length > 0) {
            let indexs = []
            let getIndexPaths = (dir) => {
                let files = dir.getFilesList()
                for (let i = 0; i < files.length; i++) {
                    let file = files[i]
                    if (file.getName() == "__index_db__") {
                        let path = file.getPath()
                        if (path.startsWith("/users/") || path.startsWith("/applications/")) {

                            path = globule.config.DataPath + "/files" + path
                        }
                        indexs.push(path)
                    } else if (file.getIsDir()) {
                        getIndexPaths(file)
                    }
                }
            }

            // Here I will get the current folder and search for the file.
            let current_folder = this._file_explorer_.path + "/.hidden"
            FileController.readDir(current_folder, (hiddenDir) => {
                getIndexPaths(hiddenDir)
                if (indexs.length == 0) {
                    displayMessage("No index found for the search")
                    return
                }

                // Now I will search document...
                let router = document.querySelector("globular-router");
                let application = router.getAttribute("base");
                let query = `Text:${searchValue}`;

                console.log("Searching for the file", query)
                // Create the search request
                let rqst = new SearchDocumentsRequest();
                console.log("Indexs", indexs)
                rqst.setPathsList(indexs);
                rqst.setLanguage("en");
                rqst.setFieldsList(["Text"]);
                rqst.setOffset(0);
                rqst.setPagesize(1000);
                rqst.setQuery(query);

                let stream = globule.searchService.searchDocuments(rqst, {
                    domain: globule.domain,
                    application: application
                });

                let results = [];

                // Process the search stream using event listeners
                stream.on("data", (rsp) => {
                    results = results.concat(rsp.getResults().getResultsList());
                });

                stream.on("end", () => {
                    let searchResults = new DocumentSearchResults();
                    searchResults._file_explorer_ = this._file_explorer_;
                    searchResults.setResults(results);
                    this._file_explorer_.setSearchResults(searchResults);
                });

                stream.on("error", (error) => {
                    displayMessage("Error while searching for the file " + error.message)
                });

            }, (error) => {
                displayMessage("Error while searching for the file " + error.message)
            }, Backend.globular, true)


            //searchInput.value = ""
            searchInput.blur()

        }
    }
}

// Define the custom element.
customElements.define('globular-search-document-bar', SearchDocumentBar);


class DocumentSearchResults extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = `
            <style>
                #document-search-results {
                    display: flex;
                    flex-direction: column;
                    background-color: var(--surface-color);
                }

                paper-icon-button { 
                    color: var(--on-surface-color);
                    align-self: flex-end;
                }

                .result-container {
                    display: flex;
                    flex-direction: column;
                    margin: 10px;
                }
                .result-header {
                    display: flex;
                    align-items: baseline;
                    margin-left: 2px;
                }
                .result-link {
                    font-size: 1rem;
                    font-weight: 400;
                    text-decoration: underline;
                    cursor: pointer;
                }
                .result-link:hover {
                    text-decoration-color: var(--primary-color);
                }
                .snippet-container {
                    padding: 15px;
                    font-size: 1rem;
                }
                .separator {
                    border-bottom: 1px solid var(--palette-action-disabled);
                    width: 80%;
                }
            </style>
            <div id="document-search-results">
                 
            </div>
        `;
    }

    setResults(results) {
        const documentSearchResults = this.shadowRoot.querySelector("#document-search-results");
        documentSearchResults.innerHTML = "";
        let range = document.createRange();

        let closeBtn = document.createElement("paper-icon-button");
        closeBtn.icon = "close";
        closeBtn.style = "position: sticky; z-index: 1000;";
        closeBtn.onclick = () => {
            this.parentElement.removeChild(this);
        };
        documentSearchResults.appendChild(closeBtn);

        results.forEach((r) => {
            let doc = JSON.parse(r.getData());
            let snippet = JSON.parse(r.getSnippet());
            let uuid = crypto.randomUUID();
            console.log("Document", doc);

            let html = `
                <div class="result-container">
                    <div class="result-header">
                        <span style="font-size: 1.1rem; padding-right: 10px;">${parseFloat(r.getRank() / 1000).toFixed(3)}</span>
                        <div id="page-${uuid}-lnk" class="result-link">${doc.Path}</div>
                    </div>
                    <div id="content-${uuid}" style="display: flex;">
                        <div id="snippets-${uuid}-div" class="snippet-container"></div>
                    </div>  
                    <span class="separator"></span>
                </div>
            `;

            documentSearchResults.appendChild(range.createContextualFragment(html));
            let content = documentSearchResults.querySelector(`#content-${uuid}`);
            let snippetsDiv = content.querySelector(`#snippets-${uuid}-div`);
            let lnk = documentSearchResults.querySelector(`#page-${uuid}-lnk`);
            FileController.getFile(Backend.globular, doc.Path, 64, 64, (file) => {
                let thumbnail = file.getThumbnail();
                if (thumbnail) {
                    let img = document.createElement("img");
                    img.src = thumbnail;
                    img.style = "width: 128px; height: 128px; margin-right: 20px; padding: 10px;";
                    content.insertBefore(img, snippetsDiv);

                    img.onmouseenter = () => { img.style.cursor = "pointer"; };
                    img.onmouseleave = () => { img.style.cursor = "default"; };

                    lnk.onclick = img.onclick = () => {
                        this.style.display = "none";
                        this._file_explorer_.readFile(file, doc.Number + 1); // Open the document at the page number.
                    };
                }
            }, (error) => { console.log("Error while getting the file", error) });


            snippet.Text.forEach((s) => {
                let div = document.createElement("div");
                div.innerHTML = s;
                snippetsDiv.appendChild(div);
            });


        });
    }
}

customElements.define("globular-document-search-results", DocumentSearchResults);