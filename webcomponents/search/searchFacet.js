import getUuidByString from "uuid-by-string";
import { playAudios } from "../audio";
import { playVideos } from "../video";
import { displayError } from "../../backend/backend";

export class FacetSearchFilter extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(page) {
        super()

        this.page = page
        this.panels = {};

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container{
                font-size: 1.17rem;
                padding: 10px;
                padding-right: 30px;
                max-width: 235px;
                position: absolute;
                overflow-y: auto;
                top: 45px;
                bottom: 0px;

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


            @media (max-width: 600px) {
                #container{
                    position: initial;
                    height: 180px;
                }
            }
            
        </style>
        <div id="container">
           <slot name="facets"></slot>
        </div>
        `
    }

    // Refresh the facets...
    refresh() {
        for (var key in this.panels) {
            this.panels[key].refresh()
        }
    }

    // Set the facets...
    setFacets(facets) {

        facets.getFacetsList().forEach(facet => {
            let id = "_" + getUuidByString(facet.getField())
            let p = this.panels[id]
            if (p == undefined) {
                p = new SearchFacetPanel(this.page)
                this.panels[id] = p
            }

            if (facet.getTotal() > 0) {
                p.slot = "facets"
                p.setFacet(facet)
                this.appendChild(p)
            }
        })
    }
}

customElements.define('globular-facet-search-filter', FacetSearchFilter)

/**
 * This facet informations...
 */
export class SearchFacetPanel extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(page) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.page = page
        this.terms = {}

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           

            .facet-list{
                padding-bottom: 20px;
                font-size: 1rem;
            }

            span{
                font-style: italic;
                font-size: 1rem;
                margin-left: 10px;
            }

            paper-checkbox{
                margin-top: 15px;
            }

        </style>

        <div style="display: flex; flex-direction: column;">
            <div class="facet-label" style="display: flex; justify-items: center; align-items: baseline;">
                <paper-icon-button id="play_facet_btn"  style="display: none"  icon="av:play-arrow"></paper-icon-button>
                <paper-checkbox checked> <span id='field_span'></span> <span id='total_span'></span></paper-checkbox checked>
            </div>
            <div class="facet-list">

            </div>
        </div>
        `

        let facetList = this.shadowRoot.querySelector(".facet-list")
        let checkbox_ = this.shadowRoot.querySelector("paper-checkbox")

        checkbox_.onclick = () => {
            this.page.hideAll()
            if (checkbox_.checked) {
                this.page.showAll()
            }

            // refresh the page
            this.page.refresh()
            this.page.refreshNavigatorAndContextSelector()

            let checkboxs = facetList.querySelectorAll("paper-checkbox")
            for (var i = 0; i < checkboxs.length; i++) {
                let checkbox = checkboxs[i]
                if (!checkbox_.checked) {
                    if (checkbox.checked) {
                        checkbox.checked = false
                    }
                } else {
                    if (!checkbox.checked) {
                        checkbox.checked = true
                    }
                }
            }
        }
    }

    refresh() {
        // refresh the panels....
        this.shadowRoot.querySelector("#total_span").innerHTML = "(" + this.page.getTotal() + ")"
        let facetList = this.shadowRoot.querySelector(".facet-list")

        for (var key in this.terms) {
            let term = this.terms[key]
            let count = this.page.countElementByClassName(term.className)
            if (count > 0) {
                term.countDiv.innerHTML = "(" + count + ")"
                facetList.appendChild(term)
            } else if (term.parentNode) {
                term.parentNode.removeChild(term)
            }
        }

    }

    setFacet(facet) {
        this.facet = facet;
        this.id = "_" + getUuidByString(facet.getField())
        let field = facet.getField()
        this.shadowRoot.querySelector("#total_span").innerHTML = "(" + this.page.getTotal() + ")"
        this.shadowRoot.querySelector("#field_span").innerHTML = facet.getField()

        /** Play all results found... */
        this.shadowRoot.querySelector("#play_facet_btn").onclick = () => {

            let audios = this.page.getAudios()
            let videos = this.page.getVideos()

            // Play the audios found...
            if (audios.length > 0) {
                playAudios(audios, facet.getField())
            } else if (videos.length > 0) {
                playVideos(videos, facet.getField())
            } else {
                displayError("no item to play!", 3000)
            }
        }

        let range = document.createRange()
        let terms = facet.getTermsList().sort((a, b) => {
            if (a.getTerm() < b.getTerm()) { return -1; }
            if (a.getTerm() > b.getTerm()) { return 1; }
            return 0;
        })

        let facetList = this.shadowRoot.querySelector(".facet-list")
        let checkbox_ = this.shadowRoot.querySelector("paper-checkbox")

        terms.forEach(t => {

            let term = t.getTerm()
            let className = t.getTerm()
            if (term.startsWith("{")) {
                let obj = JSON.parse(term)
                term = obj.name + "  " + obj.min + "-" + obj.max
                className = obj.name
            }

            let uuid = "_" + getUuidByString(className)
            if (this.terms[uuid] == undefined) {
                let html = `
                    <div id="${uuid}_div" style="margin-left: 25px; display: flex; justify-items: center; align-items: baseline;">
                        <paper-icon-button  style="display: none"  id="${uuid}_play_btn" icon="av:play-arrow"></paper-icon-button>
                        <paper-checkbox class="${className}" id="${uuid}" checked> <div  class="facet-label"> ${term + "<span id='" + uuid + "_total'></span>"} </div></paper-checkbox> 
                    <div>
                    `
                // The facet list.
                facetList.appendChild(range.createContextualFragment(html))

                if (this.getAudios(className).length > 0 || this.getVideos(className, field).length > 0) {
                    this.shadowRoot.querySelector("#" + uuid + "_play_btn").style.display = "block"
                    this.shadowRoot.querySelector("#play_facet_btn").style.display = "block"
                } else {
                    this.shadowRoot.querySelector("#" + uuid + "_play_btn").style.display = "none"
                }

                this.shadowRoot.querySelector("#" + uuid + "_play_btn").onclick = () => {
                    // Play the audios found...
                    let audios = this.getAudios(className)
                    if (audios.length > 0)
                        playAudios(audios, term)

                    let videos = this.getVideos(className, field)
                    if (videos.length > 0)
                        playVideos(videos, term)

                }

                // keep track of the terms...
                this.terms[uuid] = this.shadowRoot.querySelector("#" + uuid + "_div")

                let checkbox = this.shadowRoot.querySelector("#" + uuid)
                checkbox.onclick = () => {
                    this.page.hideAll()
                    // Get all checkboxs of a facet...
                    let checkboxs = facetList.querySelectorAll("paper-checkbox")

                    for (var i = 0; i < checkboxs.length; i++) {
                        let checkbox = checkboxs[i]
                        if (checkbox.checked) {
                            this.page.showAll(checkbox.className)
                        }
                    }

                    this.page.offset = 0;
                    this.page.navigator.setTotal(this.page.getTotal())
                    this.page.refresh()
                    this.page.refreshNavigatorAndContextSelector()
                }


                checkbox.onchange = () => {
                    if (checkbox.checked) {
                        checkbox_.checked = true
                    }
                }

                // keep reference into the object.
                this.terms[uuid].countDiv = facetList.querySelector("#" + uuid + "_total")
                this.terms[uuid].className = className
            }

            let count = this.page.countElementByClassName(className)
            if (this.terms[uuid]) {
                if (count > 0) {
                    this.terms[uuid].countDiv.innerHTML = "(" + count + ")"
                } else if (this.terms[uuid].parentNode) {
                    // remove it from the dom...
                    this.terms[uuid].parentNode.removeChild(this.terms[uuid])
                }
            }

        })
    }



    getAudios(className) {
        let audios = this.page.getAudios(className)
        return audios
    }

    getVideos(className, field) {
        let videos = this.page.getVideos(className, field)
        return videos
    }

}

customElements.define('globular-facet', SearchFacetPanel)
