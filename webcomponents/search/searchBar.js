import { Backend, displayMessage } from "../../backend/backend";
import { search } from "./search";

/**
 * Search Box
 */
export class SearchBar extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.titlesCheckbox = null
        this.moviesCheckbox = null
        this.tvSeriesCheckbox = null
        this.tvEpisodesCheckbox = null
        this.videosCheckbox = null
        this.youtubeCheckbox = null
        this.adultCheckbox = null
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


            #context-search-selector{
                display: none;
                flex-direction: column;
                position: absolute;
                top: 55px;
                right: 0px;
                left: 0px;
                border-radius: 5px;
                background-color: var(--surface-color);
                z-index: 1000;
                color:var(--on-surface-color);
                min-width: 340px;
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

            @media (max-width: 500px) {
                #context-search-selector {
                    position: fixed;
                    left: 5px;
                    top: 75px;
                    right: 5px;
                }
             }

             paper-card{
                background-color: var(--surface-color);
                color: var(--palette-text-primary);
            }

            paper-checkbox {
                margin-left: 16px;
                margin-bottom: 8px;
                margin-top: 8px;
            }

            .context-filter{
                display: flex;
                font-size: .85rem;
                margin: 0px 18px 5px 18px;
                border-bottom: 1px solid  var(--palette-action-disabled);
            }

            .context-filter paper-checkbox {

            }

            #search_icon:hover{
                cursor: pointer;
            }

        </style>
        <div id="search-bar">
            <iron-icon id='search_icon' icon="search" style="--iron-icon-fill-color: var(--palette-text-accent);" ></iron-icon>
            <input id='search_input' placeholder="Search"></input>
            <paper-icon-button id="change-search-context" icon="icons:expand-more" style="--iron-icon-fill-color: var(--palette-text-accent); margin-right: 2px; height: 36px;" ></paper-icon-button>
            <paper-card id="context-search-selector">
                <paper-checkbox class="context" checked name="webPages" id="context-search-selector-webpages">Webpages</paper-checkbox>
                <paper-checkbox class="context" checked name="blogPosts" id="context-search-selector-blog-posts">Blog Posts</paper-checkbox>
                <div style="display: flex; flex-direction: column">
                    <paper-checkbox class="context" checked name="titles" id="context-search-selector-titles">Titles</paper-checkbox>
                    <div class="context-filter">
                        <paper-checkbox checked name="movies" id="context-search-selector-movies">Movies</paper-checkbox>
                        <paper-checkbox checked name="movies" id="context-search-selector-tv-series">TV-Series</paper-checkbox>
                        <paper-checkbox checked name="movies" id="context-search-selector-tv-episodes">TV-Episodes</paper-checkbox>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column">
                    <paper-checkbox class="context" checked name="videos" id="context-search-selector-videos">Videos</paper-checkbox>
                    <div class="context-filter">
                        <paper-checkbox checked name="youtube" id="context-search-selector-youtube">Youtube</paper-checkbox>
                        <paper-checkbox  name="adult" id="context-search-selector-adult">Adult</paper-checkbox>
                    </div>
                </div>
                <paper-checkbox class="context" checked name="audios" id="context-search-selector-audios">Audios</paper-checkbox>
            </paper-card>
        </div>
        `


        // give the focus to the input.
        let searchInput = this.shadowRoot.getElementById("search_input")
        let searchIcon = this.shadowRoot.getElementById("search_icon")
        let div = this.shadowRoot.getElementById("search-bar")

        let changeSearchContextBtn = this.shadowRoot.getElementById("change-search-context")
        let contextSearchSelector = this.shadowRoot.getElementById("context-search-selector")

        this.titlesCheckbox = this.shadowRoot.querySelector("#context-search-selector-titles")
        this.moviesCheckbox = this.shadowRoot.querySelector("#context-search-selector-movies")
        this.tvSeriesCheckbox = this.shadowRoot.querySelector("#context-search-selector-tv-series")
        this.tvEpisodesCheckbox = this.shadowRoot.querySelector("#context-search-selector-tv-episodes")

        this.titlesCheckbox.onchange = () => {
            if (this.titlesCheckbox.checked) {
                this.moviesCheckbox.removeAttribute("disabled")
                this.tvSeriesCheckbox.removeAttribute("disabled")
                this.tvEpisodesCheckbox.removeAttribute("disabled")
            } else {
                this.moviesCheckbox.setAttribute("disabled", "")
                this.tvSeriesCheckbox.setAttribute("disabled", "")
                this.tvEpisodesCheckbox.setAttribute("disabled", "")
            }
        }

        this.videosCheckbox = this.shadowRoot.querySelector("#context-search-selector-videos")
        this.youtubeCheckbox = this.shadowRoot.querySelector("#context-search-selector-youtube")
        this.adultCheckbox = this.shadowRoot.querySelector("#context-search-selector-adult")

        this.videosCheckbox.onchange = () => {
            if (this.videosCheckbox.checked) {
                this.youtubeCheckbox.removeAttribute("disabled")
                this.adultCheckbox.removeAttribute("disabled")
            } else {
                this.youtubeCheckbox.setAttribute("disabled", "")
                this.adultCheckbox.setAttribute("disabled", "")
            }
        }


        searchInput.onblur = () => {
            if (contextSearchSelector.style.display != "flex") {
                div.style.boxShadow = ""
                div.style.backgroundColor = ""

                searchInput.style.backgroundColor = "transparent"
                searchInput.style.color = "var(--on-primary-color)"
                searchIcon.style.color = "var(--on-primary-color)"
                changeSearchContextBtn.style.color = "var(--on-primary-color)"
                contextSearchSelector.style.display = "none"
            }
        }

        searchInput.onkeydown = (evt) => {
            if (evt.key == "Enter") {
                this.search()

            } else if (evt.key == "Escape") {
                Backend.eventHub.publish("_hide_search_results_", { "id": this.id }, true)
            }
        }


        searchInput.onfocus = (evt) => {
            evt.stopPropagation();
            div.style.boxShadow = "var(--dark-mode-shadow)"
            div.style.backgroundColor = "var(--surface-color)"
            searchInput.style.color = "var(--on-surface-color)"
            searchIcon.style.color = "var(--on-surface-color)"
            changeSearchContextBtn.style.color = "var(--on-surface-color)"

            contextSearchSelector.style.display = "none"
            Backend.eventHub.publish("_display_search_results_", { "id": this.id }, true)



            let pages = document.querySelectorAll("globular-search-results-page")
            for (var i = 0; i < pages.length; i++) {
                let page = pages[i]
                if (page.style.display != "none") {
                    page.facetFilter.style.display = ""
                }
            }

            // I will remove all highligted text..
            let highlighted = document.getElementsByClassName("highlighted")
            for (var i = 0; i < highlighted.length; i++) {
                if (highlighted[i].lowlight)
                    highlighted[i].lowlight();
            }
        }

        // Change the search context, this will search over other indexations...
        changeSearchContextBtn.onclick = () => {

            if (contextSearchSelector.style.display != "flex") {
                contextSearchSelector.style.display = "flex"
            } else {
                contextSearchSelector.style.display = "none"
                searchInput.focus()

            }
        }

        searchIcon.onclick = () => {
            this.search()
        }
    }

    search() {
        let contextSearchSelector = this.shadowRoot.getElementById("context-search-selector")
        let searchInput = this.shadowRoot.getElementById("search_input")
        let contexts = []
        let checkboxs = this.shadowRoot.querySelectorAll(".context")
        for (var i = 0; i < checkboxs.length; i++) {
            let c = checkboxs[i]
            if (c.checked) {
                if (!contexts.includes(c.name))
                    contexts.push(c.name)
            }
        }

        if (contexts.length > 0) {
            let query = searchInput.value

            // remove unwanted results...
            if (!this.adultCheckbox.checked) {
                query += " -adult"
            }

            if (!this.youtubeCheckbox.checked) {
                query += " -youtube"
            }

            if (!this.moviesCheckbox.checked) {
                query += " -Movie"
            }

            if (!this.tvEpisodesCheckbox.checked) {
                query += " -TVEpisode"
            }

            if (!this.tvSeriesCheckbox.checked) {
                query += " -TVSerie"
            }

            search(query, contexts, 0, this.id)
            searchInput.value = ""
            Backend.eventHub.publish("_display_search_results_", { "id": this.id }, true)

        } else {
            displayMessage("You must selected a search context, Blog, Video or Title...", 3000)
            contextSearchSelector.style.display = "flex"
        }
    }
}

customElements.define('globular-search-bar', SearchBar)
