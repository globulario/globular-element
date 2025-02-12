import getUuidByString from "uuid-by-string";
import { Backend } from "../../backend/backend";
import { BlogPostInfo } from "../informationManager/blogPostInfo";
import { InformationsManager } from "../informationManager/informationsManager";
import { SearchAudioCard } from "./searchAudioCard";
import { FacetSearchFilter } from "./searchFacet";
import { SearchTitleCard } from "./searchTitleCard";
import { SearchVideoCard } from "./searchVideoCard";
import { randomUUID } from "../utility";

const MAX_DISPLAY_RESULTS = 20

export class SearchResultsPagesNavigator extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.page = null;


        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container{
                display: flex;
                padding: 10px;
                flex-wrap: wrap;
            }

            .pagination-btn{
                display: flex;
                justify-content: center;
                align-items: center;
                height: 35px;
                width: 35px;
                margin: 5px;
                
                transition: background 0.2s ease,padding 0.8s linear;
                border: 1px solid var(--palette-text-disabled);
                border-radius: 5px;
            }

            @media (max-width: 600px) {
                #container{
                    padding: 2px;
                }

                .pagination-btn{
                    height: 25px;
                    width: 25px;
                }
            }

            .pagination-btn:hover{
                cursor: pointer;
                -webkit-filter: invert(30%);
            }

            .pagination-btn.active {
                border-color: var(--palette-error-dark);
            }

        </style>
        <div id="container">
            
        </div>
        `
        // give the focus to the input.
        this.container = this.shadowRoot.querySelector("#container")
        this.nb_pages = 0;
    }

    // The connection callback.
    connectedCallback() {
        // When the component is set on the page and ready...

    }

    // Set the page reuslts...
    setSearchResultsPage(page) {
        this.page = page;
    }

    setIndex(index, btn) {
        if (btn == undefined) {
            btn = this.container.querySelector(`#page_${index}`)
        }

        // so here I will get the new search...
        this.page.offset = index

        Backend.eventHub.publish("_display_search_results_", {}, true)
        this.page.refresh()

        let actives = this.shadowRoot.querySelectorAll(".active")
        for (var i = 0; i < actives.length; i++) {
            actives[i].classList.remove("active")
        }

        btn.classList.add("active")
    }

    setTotal(total) {
        if (this.nb_pages == Math.ceil(total / MAX_DISPLAY_RESULTS)) {
            return
        }

        this.container.innerHTML = ""
        this.nb_pages = Math.ceil(total / MAX_DISPLAY_RESULTS)
        if (this.nb_pages > 1) {
            for (var i = 0; i < this.nb_pages; i++) {
                let btn = document.createElement("div")
                btn.id = "page_" + i
                btn.innerHTML = i + 1
                btn.classList.add("pagination-btn")
                if (i == this.page.offset) {
                    btn.classList.add("active")
                }
                let index = i
                btn.onclick = () => {
                    this.setIndex(index, btn)
                }
                this.container.appendChild(btn)
            }
        }
    }
}

customElements.define('globular-search-results-pages-navigator', SearchResultsPagesNavigator)


/**
 * Sample empty component
 */
export class SearchResultsPageContextsSelector extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.page = null;
        this.contexts = [];

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
                <style>
                   
                    #container{
                        display: flex;
                        margin: 5px;
                        margin-left: 10px;
                    }

                    #container div{
                        margin-right: 15px;
                        align-items: center;
                    }

                </style>
                <div id="container">
                </div>
                `
        // give the focus to the input.
        this.container = this.shadowRoot.querySelector("#container")
    }

    // The connection callback.
    connectedCallback() {

    }

    // Set the page reuslts...
    setSearchResultsPage(page) {
        this.page = page;
    }

    // Set the context...
    setContexts(contexts) {
        contexts.forEach(context => {
            let html = `
                <div id="${context}_div" style="display: none;">
                    <paper-checkbox checked id="${context}_checkbox"></paper-checkbox>
                    <span >${context}</span>
                    <span id="${context}_total" style="font-size: 1rem;margin-left: 5px;"></span>
                </div>
            `
            let range = document.createRange()
            this.container.appendChild(range.createContextualFragment(html))

            let checkbox = this.container.querySelector(`#${context}_checkbox`);
            checkbox.onclick = () => {
                this.page.setContextState(context, checkbox.checked)
            }
        })
    }

    // Set context total.
    setContextTotal(context, total) {
        this.container.querySelector(`#${context}_div`).style.display = "flex";
        this.container.querySelector(`#${context}_total`).innerHTML = `(${total})`
    }

}

customElements.define('globular-search-results-page-contexts-selector', SearchResultsPageContextsSelector)

/**
 * Search Results
 */
export class SearchResultsPage extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(uuid, summary, contexts, tab) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.id = `${uuid}-results-page`
        this.offset = 0;
        this.count = 0;
        this.query = summary.getQuery();
        this.contexts = contexts;
        this.tab = tab;

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container {
                display: flex;
            }

            #summary {
                display: flex;
            }

            #summary span {
                flex-grow: 1;
            }

            .disable{
                --iron-icon-fill-color: var(--palette-action-disabled);
            }

            #webpage-search-results{
                display: flex;
                flex-direction: column;
            }

            #summary span{
                font-size: 1rem;
            }

            #results{
                display: flex; 
                flex-direction: column; 
                overflow-y: auto;
                overflow-x: hidden;
                height: 100%;
            }

            #results-actions{
                display: none;
                justify-content: flex-end;
                position: fixed;
                bottom: 0px;
                left: 0px;
                right: 0px;
                margin: 10px;
                align-items: center;
            }

            #results-actions-btns{
                display:flex; background: var(--palette-background-default);
                border-radius: 20px; 
                align-items: center; 
                border: 1px solid var(--palette-divider); 
                margin-right: 5px;
                z-index: 1000;
            }

            #mosaic-view{
                display: flex;
                height: 100%;
            }

            ::-webkit-scrollbar {
                width: 5px;
                height: 5px;
             }
             
             ::-webkit-scrollbar-track {
                background: var(--palette-background-default);
             }
             
             ::-webkit-scrollbar-thumb {
                background: var(--palette-divider);
             }

             .header{
                align-items: center;
             }

             
             #facets{
                margin-right: 5px;
                min-width: 225xp;
            }

            #content{
                margin-left: 20px;
            }

            ::slotted([slot="mosaic_videos"]) {
                padding: 10px;
            }

            @media (max-width: 600px) {

                #content{
                    margin-left: 0px;
                }

                
                #container {
                    flex-direction: column;
                }

                #facets{
                    max-height: 200px;
                }

                .header{
                    flex-direction: column;
                    align-items: flex-start;
                }

                #summary{
                    align-self: flex-end;
                }

                globular-search-results-page-contexts-selector {
                    font-size: 1rem;
                }

                #results{
                    padding-bottom: 100px;
                }

                @media (max-width: 650px) {
                    slot {
                        justify-content: center;
                    }
                }
             }

        </style>
        <div id="container">
            <div id="facets">
                <slot  name="facets"></slot>
            </div>
            <div id="content" style="display: flex; flex-direction: column; width: 100%;">
                <div class="header" style="display: flex;">
                    <div style="display: flex; flex-wrap: wrap; flex-grow: 1; align-items: center;">
                        <globular-search-results-page-contexts-selector ></globular-search-results-page-contexts-selector>
                        <globular-search-results-pages-navigator></globular-search-results-pages-navigator>
                    </div>
                    <div id="summary">
                        <paper-icon-button id="search-result-icon-view-btn" style="" icon="icons:view-module"></paper-icon-button>
                        <paper-icon-button class="disable"  id="search-result-lst-view-btn" icon="icons:view-list"></paper-icon-button>
                    </div>
                </div>

                <div id="results" style="">
                    
                    <div id="mosaic-view" style="display: block;">
                        <slot name="mosaic_blogPosts" style="display: flex; flex-wrap: wrap;"></slot>
                        <slot name="mosaic_videos" style="display: flex; flex-wrap: wrap;"></slot>
                        <slot name="mosaic_titles" style="display: flex; flex-wrap: wrap;"></slot>
                        <slot name="mosaic_audios" style="display: flex; flex-wrap: wrap;"></slot>
                    </div>
                    <div id="list-view" style="display: none;">
                        <slot name="list_blogPosts" style="display: flex; flex-wrap: wrap;"> </slot>
                        <slot name="list_videos" style="display: flex; flex-wrap: wrap;"> </slot>
                        <slot name="list_titles" style="display: flex; flex-wrap: wrap;"> </slot>
                        <slot name="list_audios" style="display: flex; flex-wrap: wrap;"> </slot>
                    </div>
                    <h2 style="display: none;">Webpage search results (<span id="webpage-search-results-count"></span>)</h2>
                    <div id="webpage-search-results"></div>
                    <div id="results-actions">
                        <div id="results-actions-btns" style="">
                            <paper-icon-button id="previous-results-btn" icon="icons:chevron-left" style="visibility: hidden;"></paper-icon-button>
                            <span id="results-index"></span>
                            <paper-icon-button id="next-results-btn" icon="icons:chevron-right"></paper-icon-button>
                        </div>
                    </div>
                   
                </div>
            </div>
        </div>
        `

        // the next and previous results buttons.
        this.nextResultsBtn = this.shadowRoot.querySelector("#next-results-btn")
        this.previousResultsBtn = this.shadowRoot.querySelector("#previous-results-btn")
        this.currentPageIndex = this.shadowRoot.querySelector("#results-index")
        this.currentActionsBtns = this.shadowRoot.querySelector("#results-actions-btns")

        // display hint about more results can be displayed.
        let resultsDiv = this.shadowRoot.querySelector("#results")
        resultsDiv.onscroll = () => {
            if (resultsDiv.scrollTop == 0) {
                resultsDiv.style.boxShadow = ""
                resultsDiv.style.borderTop = ""
            } else {
                resultsDiv.style.boxShadow = "inset 0px 5px 6px -3px rgb(0 0 0 / 40%)"
                resultsDiv.style.borderTop = "1px solid var(--palette-divider)"
            }
        }

        this.navigator = this.shadowRoot.querySelector("globular-search-results-pages-navigator")
        this.navigator.setSearchResultsPage(this)

        // connect the previous and next page buttons
        this.nextResultsBtn.onclick = () => {
            this.navigator.setIndex(this.offset + 1)
        }

        this.previousResultsBtn.onclick = () => {
            this.navigator.setIndex(this.offset - 1)
        }

        this.contextsSelector = this.shadowRoot.querySelector("globular-search-results-page-contexts-selector")
        this.contextsSelector.setSearchResultsPage(this)
        this.contextsSelector.setContexts(contexts)

        // left or right side filter...
        this.facetFilter = new FacetSearchFilter(this)
        this.facetFilter.slot = "facets"
        this.appendChild(this.facetFilter)

        // Get the tow button...
        this.searchReusltLstViewBtn = this.shadowRoot.querySelector("#search-result-lst-view-btn")
        this.searchReusltIconViewBtn = this.shadowRoot.querySelector("#search-result-icon-view-btn")
        this.viewType = "icon"
        this.hits = {} // keep the current list in memory...
        this.hits_by_context = {}
        this.hits_by_className = {}

        this.searchReusltLstViewBtn.onclick = () => {
            this.searchReusltLstViewBtn.classList.remove("disable")
            this.searchReusltIconViewBtn.classList.add("disable")
            this.viewType = "lst"
            this.shadowRoot.querySelector("#list-view").style.display = "block"
            this.shadowRoot.querySelector("#mosaic-view").style.display = "none"
        }

        this.searchReusltIconViewBtn.onclick = () => {
            this.searchReusltLstViewBtn.classList.add("disable")
            this.searchReusltIconViewBtn.classList.remove("disable")
            this.viewType = "mosaic"
            this.shadowRoot.querySelector("#list-view").style.display = "none"
            this.shadowRoot.querySelector("#mosaic-view").style.display = "block"
        }

        // Display facets
        Backend.eventHub.subscribe(`${uuid}_search_facets_event__`, listner_uuid => { },
            evt => {
                this.facetFilter.setFacets(evt.facets)
            }, true)

        // Append it to the results.
        Backend.eventHub.subscribe(`${uuid}_search_hit_event__`, listner_uuid => { },
            evt => {
                Backend.eventHub.publish("_display_search_results_", { "file-explorer-id": evt["file-explorer-id"] }, true)
                if (this.hits_by_context[evt.context] == null) {
                    this.hits_by_context[evt.context] = []
                }

                // get the uuid from the hit content object.
                let getHitUuid = (hit) => {
                    if (hit.hasTitle || hit.hasVideo || hit.hasAudio) {
                        if (hit.hasTitle()) {
                            return getUuidByString(hit.getTitle().getName())
                        } else if (hit.hasVideo()) {
                            return getUuidByString(hit.getVideo().getId())
                        } else if (hit.hasAudio()) {
                            return getUuidByString(hit.getAudio().getId())
                        }
                    } else if (hit.hasBlog()) {
                        return hit.getBlog().getUuid()
                    }
                }

                let hit = evt.hit
                let uuid = getHitUuid(hit)

                if (this.hits[uuid] == undefined) {

                    this.hits[uuid] = hit
                    this.hits_by_context[evt.context].push(hit)

                    hit.hidden = false;
                    hit.enable = true;
                    if (hit.hasTitle || hit.hasVideo || hit.hasAudio) {
                        // here I will keep track of hit classes...
                        if (hit.hasTitle()) {
                            hit.getTitle().getGenresList().forEach(g => {
                                let className = getUuidByString(g.toLowerCase())
                                if (this.hits_by_className[className] == undefined) {
                                    this.hits_by_className[className] = []
                                }
                                if (this.hits_by_className[className].indexOf(uuid) == -1) {
                                    this.hits_by_className[className].push(uuid)
                                }
                            })
                            // now the term..
                            let className = getUuidByString("high")
                            if (hit.getTitle().getRating() < 3.5) {
                                className = getUuidByString("low")
                            } else if (hit.getTitle().getRating() < 7.0) {
                                className = getUuidByString("medium")
                            }

                            if (this.hits_by_className[className] == undefined) {
                                this.hits_by_className[className] = []
                            }

                            if (this.hits_by_className[className].indexOf(uuid) == -1) {
                                this.hits_by_className[className].push(uuid)
                            }

                        } else if (hit.hasVideo()) {
                            hit.getVideo().getGenresList().forEach(g => {
                                let className = getUuidByString(g.toLowerCase())
                                if (this.hits_by_className[className] == undefined) {
                                    this.hits_by_className[className] = []
                                }
                                if (this.hits_by_className[className].indexOf(uuid) == -1) {
                                    this.hits_by_className[className].push(uuid)
                                }
                            })

                            hit.getVideo().getTagsList().forEach(g => {
                                let className = getUuidByString(g.toLowerCase())
                                if (this.hits_by_className[className] == undefined) {
                                    this.hits_by_className[className] = []
                                }
                                if (this.hits_by_className[className].indexOf(uuid) == -1) {
                                    this.hits_by_className[className].push(uuid)
                                }
                            })

                            // now the term..
                            let className = getUuidByString("high")
                            if (hit.getVideo().getRating() < 3.5) {
                                className = getUuidByString("low")
                            } else if (hit.getVideo().getRating() < 7.0) {
                                className = getUuidByString("medium")
                            }

                            if (this.hits_by_className[className] == undefined) {
                                this.hits_by_className[className] = []
                            }

                            if (this.hits_by_className[className].indexOf(uuid) == -1) {
                                this.hits_by_className[className].push(uuid)
                            }
                        } else if (hit.hasAudio()) {

                            hit.getAudio().getGenresList().forEach(g => {
                                g.split(" ").forEach(g_ => {
                                    let className = getUuidByString(g_.toLowerCase())

                                    if (this.hits_by_className[className] == undefined) {
                                        this.hits_by_className[className] = []
                                    }
                                    if (this.hits_by_className[className].indexOf(uuid) == -1) {
                                        this.hits_by_className[className].push(uuid)
                                    }
                                })

                            })
                        }
                    }

                    // Display first results...
                    if (this.hits_by_context[evt.context].length < MAX_DISPLAY_RESULTS) {
                        this.appendChild(this.displayMosaicHit(hit, evt.context))
                        this.appendChild(this.displayListHit(hit, evt.context))
                    }

                    this.refreshNavigatorAndContextSelector()

                    // set the total...
                    if (this.tab) {
                        if (this.tab.totalSpan) {
                            this.tab.totalSpan.innerHTML = this.getTotal() + ""
                        }
                    }


                }

            }, true)


        // Append the webpage search result...
        Backend.eventHub.subscribe(
            "display_webpage_search_result_" + summary.getQuery(),
            (uuid) => (this.display_webpage_search_result_page = uuid),
            (results) => {
                // Set the search results navigator.
                let range = document.createRange();
                let webpageSearchResults = this.shadowRoot.querySelector("#webpage-search-results");
                webpageSearchResults.innerHTML = "";
                let count = 0;
                results.forEach((r) => {
                    let doc = JSON.parse(r.getData());
                    let snippet = JSON.parse(r.getSnippet());
                    let uuid = crypto.randomUUID(); // Use UUID for unique identification
                    let html = `
                <div style="display: flex; flex-direction: column; margin: 10px;">
                    <div style="display: flex; align-items: baseline; margin-left: 2px;">
                        <span style="font-size: 1.1rem; padding-right: 10px;">${parseFloat(r.getRank() / 1000).toFixed(3)}</span> 
                        <div id="page-${uuid}-lnk" style="font-size: 1.1rem; font-weight: 400; text-decoration: underline; cursor: pointer;">
                            ${doc.PageName}
                        </div>
                    </div>
                    <div id="snippets-${uuid}-div" style="padding: 15px; font-size: 1.1rem"></div>
                    <span style="border-bottom: 1px solid var(--palette-action-disabled); width: 80%;"></span>
                </div>
            `;


                    if (snippet.Text && snippet.Text.length > 0) {
                        webpageSearchResults.appendChild(range.createContextualFragment(html));
                        let snippetsDiv = webpageSearchResults.querySelector(`#snippets-${uuid}-div`);
                        snippet.Text.forEach((s) => {
                            let div = document.createElement("div");
                            div.innerHTML = s;
                            snippetsDiv.appendChild(div);
                        });

                        // Update the search results count
                        let webpageSearchResultsCount = this.shadowRoot.querySelector("#webpage-search-results-count");
                        webpageSearchResultsCount.innerHTML = ++count + "";
                        webpageSearchResultsCount.parentElement.style.display = "block";


                        // Set up the event listener for when the link is clicked
                        let lnk = webpageSearchResults.querySelector(`#page-${uuid}-lnk`);
                        lnk.onclick = () => {
                            let event = new CustomEvent("webpage-search-result-clicked", {
                                detail: {
                                    link: doc.Link,
                                    elementId: doc.Id,
                                    elementPath: doc.Path,
                                    query: summary.getQuery(),
                                },
                            });
                            document.dispatchEvent(event);
                        };

                        // Styling effects for better UX
                        lnk.onmouseleave = () => {
                            lnk.style.cursor = "default";
                            lnk.style.textDecorationColor = "";
                        };

                        lnk.onmouseover = () => {
                            lnk.style.cursor = "pointer";
                            lnk.style.textDecorationColor = "var(--palette-primary-main)";
                        };
                    }
                });
            }
        );

        // Listen for the search result click event
        document.addEventListener("webpage-search-result-clicked", (e) => {
            const { link, elementId } = e.detail;

            // Open the page using the correct PageId
            let pageLinks = document.getElementsByTagName("globular-page-link");
            for (let i = 0; i < pageLinks.length; i++) {
                if (pageLinks[i].id.startsWith(link)) {
                    pageLinks[i].click();

                    setTimeout(() => {
                        let targetElement = document.getElementById(elementId);
                        if (targetElement) {
                            let position = targetElement.getBoundingClientRect();

                            // Scroll smoothly to the element
                            window.scrollTo({
                                top: position.top + window.scrollY - (65 + 10),
                                behavior: "smooth",
                            });

                            // Remove any previously highlighted text
                            let highlighted = document.getElementsByClassName("highlighted");
                            Array.from(highlighted).forEach((el) => {
                                if (el.lowlight) el.lowlight();
                            });

                            // Highlight the searched text
                            const regex = new RegExp(summary.getQuery(), "gi");
                            let text = targetElement.innerHTML;
                            text = text.replace(/(<mark class="highlight">|<\/mark>)/gim, ""); // Remove existing highlights
                            targetElement.innerHTML = text.replace(regex, '<mark class="highlight">$&</mark>');
                            targetElement.classList.add("highlighted");

                            // Function to remove highlight when needed
                            targetElement.lowlight = () => {
                                targetElement.innerHTML = text;
                                targetElement.classList.remove("highlighted");
                                delete targetElement.lowlight;
                            };
                        }
                    }, 500); // Delay to allow page load transition
                    return;
                }
            }
        });

    }

    connectedCallback() {

        // set the results height
        //let results = this.shadowRoot.querySelector("#results")
        //results.style.height = `calc(100vh  + 65px)`
    }

    clear() {
        this.hits = {}
    }

    refresh() {

        let results = this.shadowRoot.querySelector("#results")
        results.scrollTo({ top: 0, behavior: 'smooth' })

        // this.innerHTML = ""
        while (this.children.length > 0) {
            this.removeChild(this.children[0])
        }

        this.appendChild(this.facetFilter)


        this.contexts.forEach(context => {
            if (this.hits_by_context[context]) {
                let hits = []
                for (var i = 0; i < this.hits_by_context[context].length; i++) {
                    let hit = this.hits_by_context[context][i]
                    if (hit) {
                        if (!hit.hidden && hit.enable) {
                            hits.push(hit)
                        }
                    }
                }

                for (var i = this.offset * MAX_DISPLAY_RESULTS; this.querySelectorAll("." + context).length < MAX_DISPLAY_RESULTS && i < hits.length; i++) {
                    let hit = hits[i]
                    if (!hit.hidden && hit.enable) {
                        // append the mosaic card (blog, title, video, audio...)
                        this.appendChild(this.displayMosaicHit(hit, context))
                        this.appendChild(this.displayListHit(hit, context))
                    }
                }
            }
        })

        // set the button...
        this.currentPageIndex.innerHTML = this.offset + 1
        if (this.offset == 0) {
            this.previousResultsBtn.style.visibility = "hidden"
        } else {
            this.previousResultsBtn.style.visibility = "visible"
        }

        if (this.offset >= (this.count / MAX_DISPLAY_RESULTS) - 1) {
            this.nextResultsBtn.style.visibility = "hidden"
        } else {
            this.nextResultsBtn.style.visibility = "visible"
        }

    }

    refreshNavigatorAndContextSelector() {
        // count the number of search results to be displayed by the naviagtor...
        let count = 0

        this.contexts.forEach(context => {
            if (this.hits_by_context[context]) {
                let count__ = 0;
                let count_ = 0;
                this.hits_by_context[context].forEach(hit => {
                    if (!hit.hidden) {
                        count_++
                    }
                    if (!hit.hidden && hit.enable) {
                        count__++
                    }
                })
                if (count__ > count) {
                    count = count__
                }

                // display the number of results by context.
                this.contextsSelector.setContextTotal(context, count_)
            }
        })
        this.navigator.setTotal(count)

        // display the next page button at the bottom of the reuslts page.
        if (count / MAX_DISPLAY_RESULTS > 1) {
            this.shadowRoot.querySelector("#results-actions").style.display = "flex"
            this.nextResultsBtn.style.visibility = "visible"
        } else {
            this.shadowRoot.querySelector("#results-actions").style.display = "none"

        }

        this.count = count
        this.currentPageIndex.innerHTML = this.offset + 1
    }

    // Return the number of visible element (not filter)
    getTotal() {
        let count = 0
        for (var id in this.hits) {
            let hit = this.hits[id]
            if (!hit.hidden && hit.enable) {
                count++
            }
        }

        // count the number of webpage search results...
        let webpageSearchResults = this.shadowRoot.querySelector("#webpage-search-results")
        count += webpageSearchResults.children.length

        return count;
    }

    // Show or hide visual.
    setContextState(context, state) {
        if (this.hits_by_context[context]) {
            this.hits_by_context[context].forEach((hit) => {
                hit.enable = state;
            })

            // refresh the visual.
            this.refresh()
            this.refreshNavigatorAndContextSelector()

            // refresh the number of results...
            this.facetFilter.refresh()
        }
    }

    hideAll(className) {
        if (className != undefined) {
            className = getUuidByString(className)
        }
        for (var id in this.hits) {
            let hit = this.hits[id]
            if (className == undefined) {
                hit.hidden = true
            } else if (this.hits_by_className[className]) {
                if (this.hits_by_className[className].indexOf(id) != -1) {
                    hit.hidden = true
                }
            }
        }
    }

    showAll(className) {
        if (className != undefined) {
            className = getUuidByString(className)
        }
        for (var id in this.hits) {
            let hit = this.hits[id]
            if (className == undefined) {
                hit.hidden = false
            } else if (this.hits_by_className[className]) {
                /*hit.card.classList.contains(getUuidByString(className))*/
                if (this.hits_by_className[className].indexOf(id) != -1) {
                    hit.hidden = false
                }
            }
        }
    }

    countElementByClassName(className) {
        let count = 0
        className = getUuidByString(className)
        for (var id in this.hits) {
            let hit = this.hits[id]
            if (hit.enable) {
                if (this.hits_by_className[className]) {
                    if (this.hits_by_className[className].indexOf(id) != -1) {
                        count++
                    }
                }
            }
        }
        return count;
    }

    // Return all audio from cards...
    getAudios(className) {
        let audios = []

        if (this.hits_by_context["audios"]) {
            this.hits_by_context["audios"].forEach(hit => {
                let audio = hit.getAudio()
                if (className == undefined) {
                    audios.push(hit.getAudio())
                } else {
                    audio.getGenresList().forEach(g => {
                        g.split(" ").forEach(g_ => {
                            if (g_.toLowerCase() == className) {
                                audios.push(hit.getAudio())
                            }
                        })
                    })
                }
            })
        }
        return audios
    }

    getVideos(className, field) {
        let videos = []
        if (this.hits_by_context["videos"]) {
            this.hits_by_context["videos"].forEach(hit => {
                let video = hit.getVideo()
                if (className == undefined) {
                    videos.push(hit.getVideo())
                } else {
                    if (field == "Genres") {
                        video.getGenresList().forEach(g => {
                            g.split(" ").forEach(g_ => {
                                if (g_.toLowerCase() == className) {
                                    videos.push(hit.getVideo())
                                }
                            })
                        })
                    } else if (field == "Tags") {
                        video.getTagsList().forEach(g => {
                            g.split(" ").forEach(g_ => {
                                if (g_.toLowerCase() == className) {
                                    videos.push(hit.getVideo())
                                }
                            })
                        })
                    }
                }
            })
        }

        // remove duplicate values.
        return [...new Map(videos.map(v => [v.getId(), v])).values()]
    }

    setSearchResultsNavigator() {
        this.shadowRoot.querySelector("globular-search-results-pages-navigator").setSearchResultsPage(this)
    }

    // Display a mosaic vue of the result. If the result is a title I will use a flit card
    // if is a video well a video card.
    displayMosaicHit(hit, context) {
        if (hit.hasTitle || hit.hasVideo || hit.hasAudio) {
            if (hit.hasTitle()) {
                let title = hit.getTitle()
                title.globule = hit.globule
                let id = "_flip_card_" + getUuidByString(title.getName())
                let flipCard = this.querySelector("#" + id)
                if (!flipCard) {
                    flipCard = new SearchTitleCard();
                    flipCard.id = id
                    flipCard.slot = "mosaic_" + context
                    flipCard.setTitle(title)
                    flipCard.classList.add(context)
                }
                return flipCard
            } else if (hit.hasVideo()) {
                let id = "_video_card_" + getUuidByString(hit.getVideo().getId())
                let videoCard = this.querySelector("#" + id)
                let video = hit.getVideo()
                video.globule = hit.globule;
                if (!videoCard) {
                    videoCard = new SearchVideoCard();
                    videoCard.id = id
                    videoCard.slot = "mosaic_" + context
                    videoCard.setVideo(video)
                    videoCard.classList.add(context)
                }
                return videoCard
            } else if (hit.hasAudio()) {
                let audio = hit.getAudio()
                audio.globule = hit.globule
                let id = "_audio_card_" + audio.getId()
                let audioCard = this.querySelector("#" + id)
                if (!audioCard) {
                    audioCard = new SearchAudioCard();
                    audioCard.id = id
                    audioCard.slot = "mosaic_" + context
                    audioCard.setAudio(audio)
                    audioCard.classList.add(context)
                }
                return audioCard
            }
        } else {
            let blogPost = hit.getBlog()
            blogPost.globule = hit.globule;
            let id = "_" + blogPost.getUuid() + "_info"
            let blogPostInfo = this.querySelector("#" + id);
            if (!blogPostInfo) {
                blogPostInfo = new BlogPostInfo(blogPost, true, hit.globule);
                blogPostInfo.classList.add("filterable")
                blogPost.getKeywordsList().forEach(kw => blogPostInfo.classList.add(getUuidByString(kw.toLowerCase())))
                blogPostInfo.id = id
                blogPostInfo.slot = "mosaic_" + context
                blogPostInfo.classList.add(context)
            }
            return blogPostInfo
        }

    }

    displayListHit(hit, context) {
        let titleName = ""
        let uuid = ""
        if (hit.hasTitle || hit.hasVideo || hit.hasAudio) {
            if (hit.hasTitle()) {
                titleName = hit.getTitle().getName()
                uuid = getUuidByString(hit.getIndex() + "_title")
            } else if (hit.hasVideo()) {
                uuid = getUuidByString(hit.getIndex() + "_video")
            } else if (hit.hasAudio()) {
                uuid = getUuidByString(hit.getIndex() + "_audio")
            }
        } else {
            uuid = getUuidByString(hit.getIndex() + "_blog")
        }

        // insert one time...
        if (this.querySelector(`#hit-div-${uuid}`)) {
            return this.querySelector(`#hit-div-${uuid}`)
        }

        let html = `
        <div id="hit-div-${uuid}" class="hit-div" slot="list_${context}">
            <div class="hit-header-div">
                <span class="hit-index-div">
                    ${hit.getIndex() + 1}.
                </span>
                <span  class="hit-title-name-div">
                    ${titleName}
                </span>
                <span class="hit-score-div">
                    ${hit.getScore().toFixed(3)}
                </span>
            </div>
            <div class="snippets-div">
                
            </div>
            <div class="title-info-div">
            </div>
        </div>
        `


        let range = document.createRange()
        //this.appendChild()
        let hitDiv = range.createContextualFragment(html)

        let snippetDiv = hitDiv.querySelector(`.snippets-div`)

        let titleInfoDiv = hitDiv.querySelector(`.title-info-div`)

        let infoDisplay = new InformationsManager()

        if (hit.hasTitle || hit.hasVideo || hit.hasAudio) {
            if (hit.hasTitle()) {
                infoDisplay.setTitlesInformation([hit.getTitle()], hit.globule)
                hitDiv.children[0].classList.add("filterable")
                let title = hit.getTitle()
                title.globule = hit.globule;
                title.getGenresList().forEach(g => hitDiv.children[0].classList.add(getUuidByString(g.toLowerCase())))
                hitDiv.children[0].classList.add(getUuidByString(title.getType().toLowerCase()))

                // now the term..
                if (title.getRating() < 3.5) {
                    hitDiv.children[0].classList.add(getUuidByString("low"))
                } else if (title.getRating() < 7.0) {
                    hitDiv.children[0].classList.add(getUuidByString("medium"))
                } else {
                    hitDiv.children[0].classList.add(getUuidByString("high"))
                }

            } else if (hit.hasVideo()) {
                infoDisplay.setVideosInformation([hit.getVideo()])
                hitDiv.children[0].classList.add("filterable")
                let video = hit.getVideo()
                video.globule = hit.globule
                video.getGenresList().forEach(g => hitDiv.children[0].classList.add(getUuidByString(g.toLowerCase())))
                video.getTagsList().forEach(tag => hitDiv.children[0].classList.add(getUuidByString(tag.toLowerCase())))

                // now the term..
                if (video.getRating() < 3.5) {
                    hitDiv.children[0].classList.add(getUuidByString("low"))
                } else if (video.getRating() < 7.0) {
                    hitDiv.children[0].classList.add(getUuidByString("medium"))
                } else {
                    hitDiv.children[0].classList.add(getUuidByString("high"))
                }
            } else if (hit.hasAudio()) {
                infoDisplay.setAudiosInformation([hit.getAudio()])
                hitDiv.children[0].classList.add("filterable")
                let audio = hit.getAudio()
                audio.globule = hit.globule
                audio.getGenresList().forEach(g => {
                    g.split(" ").forEach(g_ => hitDiv.children[0].classList.add(getUuidByString(g_.toLowerCase())))

                })
            }

            infoDisplay.hideHeader()
        } else {
            let blogPost = hit.getBlog()
            blogPost.globule = hit.globule;
            hitDiv.children[0].classList.add("filterable")
            infoDisplay.setBlogPostInformation(blogPost)
            blogPost.getKeywordsList().forEach(kw => hitDiv.children[0].classList.add(getUuidByString(kw.toLowerCase())))
        }


        titleInfoDiv.appendChild(infoDisplay)

        // Here  I will display the snippet results.
        hit.getSnippetsList().forEach(snippet => {
            let html = `
            <div style="display: flex; flex-direction: column; padding: 10px;">
                <div class="snippet-field">${snippet.getField()}</div>
                <div class="snippet-fragments"></div>
            </div>
            `
            snippetDiv.appendChild(range.createContextualFragment(html))

            let fragmentDiv = snippetDiv.children[snippetDiv.children.length - 1].children[1]
            snippet.getFragmentsList().forEach(f => {
                let div = document.createElement("div")
                div.style.paddingBottom = "5px";
                div.innerHTML = f
                fragmentDiv.appendChild(div)
            })
        })

        return hitDiv
    }
}

customElements.define('globular-search-results-page', SearchResultsPage)