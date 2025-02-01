import { SearchVideoCard } from "../search/searchVideoCard";
import { playVideos } from "../video";

export class EmbeddedVideos extends HTMLElement {
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
            #container{
                background-color: var(--palette-background-paper);
                color: var(--palette-text-primary);
                display: flex;
                flex-direction: column;
                position: relative;

            }

            #videos{
                display: flex;
                flex-wrap: wrap;
                margin: 0px;
                padding: 0px;
            }

            
            #play-all-btn {
                position:absolute;
                top: 0px; 
                right: 0px;
                z-index: 100;
            }

            ::slotted(globular-search-video-card) {
                margin: 5px;
            }

        </style>
        <div id="container">
            <paper-icon-button id="play-all-btn" title="play all video" icon="av:playlist-play"></paper-icon-button>
            <div id="videos">
                <slot></slot>
            </div>
        </div>
        `

        // Keep a reference to the videos.
        this.videos = []
        this.playAllBtn = this.shadowRoot.querySelector("#play-all-btn")

        this.playAllBtn.onclick = (evt) => {
            playVideos(this.videos, "videos list")
        }
    }

    getVideo(index) {
        return this.videos[index]
    }

    removeVideo(video) {
        if (this.onremovevideo) {
            this.onremovevideo(video)
        }
    }

    setVideos(videos) {
        this.videos = videos
        this.innerHTML = ""

        if (videos.length > 4) {
            let carousel = new Carousel
            carousel.style.width = "100%"

            // put video info in the carousel.
            carousel.setItems(videos)

            // set the carousel...
            this.appendChild(carousel)

        } else {
            // Create video card's
            this.videos.forEach(video => {
                let card = new SearchVideoCard
                card.setVideo(video)
                card.onclose = () => {
                    this.removeChild(card)
                    this.removeVideo(video.file.getPath())
                }
                card.setEditable(this.editable)
                this.appendChild(card)
            })
        }
    }

    getImages(){
        let images = []
        for (var i = 0; i < this.videos.length; i++) {
            let img = document.createElement("img")
            img.src = this.videos[i].getPoster().getContenturl()
            images.push(img)
        }
        return images;
    }

    // hide or show the edit button...
    setEditable(editable) {
        this.editable = editable;
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].setEditable(editable)
        }
    }
}

customElements.define('globular-embedded-videos', EmbeddedVideos)
