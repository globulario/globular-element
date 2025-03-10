import getUuidByString from "uuid-by-string";
import { Backend } from "../../backend/backend";
import { SearchResultsPage } from "./searchResultsPage";

/**
 * Search Results
 */
export class SearchResults extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            :host{
                padding: 10px;
            }

            #container{
                display: flex;
                flex-direction: column;
                background-color: var(--surface-color);
                color: var(--palette-text-primary);
                user-select: none;
                height: 100%;
            }

            .header {
                display: flex;
                width: 100%;
            }

            paper-tabs {
                flex-grow: 1;
        
                /* custom CSS property */
                --paper-tabs-selection-bar-color: var(--primary-color); 
                color: var(--palette-text-primary);
                --paper-tab-ink: var(--palette-action-disabled);
            }

            #close-btn {
                width: 30px;
                height: 30px;
                padding: 3px;
            }

            paper-card{
                background-color: var(--surface-color);
                color: var(--palette-text-primary);
            }

            paper-tab {
                display: inlinel;
            }

            paper-tab span {
                font-size: 1.1rem;
                flex-grow: 1;
            }

        </style>

        <div id="container">
            <div class="header">
                <paper-tabs id="search-results" scrollable>
                </paper-tabs>
                <paper-icon-button id="close-btn" icon="icons:close"></paper-icon-button>
            </div>
            <h2 id="empty-search-msg" style="text-align: center; color: var(--palette-divider);">No search results to display...</h2>
            <slot></slot>
        </div>
        `

        this.tabs = this.shadowRoot.querySelector("#search-results")
        document.addEventListener("backend-ready", (evt) => {

            /*Backend.eventHub.subscribe("_hide_search_results_", uuid => { }, evt => {

                if (this.parentNode) {
                    this.parentNode.removeChild(this)
                }
            }, true)*/

            // So here I will create a new Search Result page if none exist...
            Backend.eventHub.subscribe("__new_search_event__", uuid => { },
                evt => {

                    this.shadowRoot.querySelector("#container").style.display = "flex"

                    let uuid = "_" + getUuidByString(evt.query)
                    let tab = this.tabs.querySelector(`#${uuid}-tab`)
                    let query = evt.query.replaceAll(" -adult", "").replaceAll(" -youtube", "").replaceAll(" -TVEpisode", "").replaceAll(" -TVSerie", "").replaceAll(" -Movie", "")
                    if (tab == null) {
                        let html = `
                    <paper-tab id="${uuid}-tab">
                        <span>${query} (<span id="${uuid}-total-span" style="font-size: 1rem;"></span>)</span>
                        <paper-icon-button id="${uuid}-close-btn" icon="icons:close"></paper-icon-button>
                    </paper-tab>
                    `

                        let range = document.createRange()
                        this.tabs.appendChild(range.createContextualFragment(html))
                        tab = this.tabs.querySelector(`#${uuid}-tab`)
                        tab.totalSpan = tab.querySelector(`#${uuid}-total-span`)

                        tab.onclick = () => {


                            let page = this.querySelector(`#${uuid}-results-page`)
                            if (page == undefined) {
                                return
                            }


                            let index = 0
                            for (var i = 0; i < this.children.length; i++) {
                                this.children[i].style.display = "none";
                                if (this.children[i].id == `${uuid}-results-page`) {
                                    index = i
                                }
                            }

                            this.tabs.selected = index;
                            page.style.display = ""


                            // display the filters...
                            page.facetFilter.style.display = ""
                        }

                        let closeBtn = this.tabs.querySelector(`#${uuid}-close-btn`)
                        closeBtn.onclick = (evt_) => {
                            evt_.stopPropagation()
                            this.deletePageResults(uuid)

                            if (this.children.length == 0) {
                                this.shadowRoot.querySelector("#empty-search-msg").style.display = "block";
                            }
                        }
                        this.tabs.selected = this.children.length;

                    } else {
                        tab.click()

                    }

                    // Create a new page...
                    let resultsPage = this.querySelector(`#${uuid}-results-page`)
                    if (resultsPage == null) {
                        resultsPage = new SearchResultsPage(uuid, evt.summary, evt.contexts, tab)
                        for (var i = 0; i < this.children.length; i++) {
                            this.children[i].style.display = "none";
                        }
                        this.appendChild(resultsPage)
                        this.shadowRoot.querySelector("#empty-search-msg").style.display = "none";

                        // ApplicationView.layout.sideMenu().appendChild(resultsPage.facetFilter)

                    } else if (evt.summary) {
                        tab.totalSpan.innerHTML = resultsPage.getTotal() + ""
                    }

                }, true)
        })

        this.closeBtn = this.shadowRoot.querySelector("#close-btn")
        this.closeBtn.onclick = () => {
            this.style.display = "none"  
            Backend.eventHub.publish("_hide_search_results_", {}, true)
        }


    }

    connectedCallback() {

    }

    isEmpty() {
        return this.tabs.querySelectorAll("paper-tab").length == 0
    }

    deletePageResults(uuid) {
        var index = 0;
        for (var i = 0; i < this.children.length; i++) {
            if (this.children[i].id == `${uuid}-results-page`) {
                index = i;
                break
            }
        }

        let page = this.querySelector(`#${uuid}-results-page`)
        page.parentNode.removeChild(page)
        // page.facetFilter.parentNode.removeChild(page.facetFilter)
        //ApplicationView.layout.sideMenu().removeChild(page.facetFilter)

        let tab = this.tabs.querySelector(`#${uuid}-tab`)
        tab.parentNode.removeChild(tab)

        let nextPage = null;
        if (index > this.children.length - 1) {
            nextPage = this.children[this.children.length - 1]
        } else {
            nextPage = this.children[index]
        }

        if (nextPage != null) {
            let tab_uuid = nextPage.id.replace("-results-page", "-tab")
            this.tabs.querySelector(`#${tab_uuid}`).click()
        }

        // close the results view
        if (this.tabs.querySelectorAll("paper-tab").length == 0) {
            Backend.eventHub.publish("_hide_search_results_", { "id": this.id }, true)
        }
    }

}

customElements.define('globular-search-results', SearchResults)
