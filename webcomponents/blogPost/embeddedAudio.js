import { playAudios } from "../audio";
import { SearchAudioCard } from "../search/searchAudioCard";

/**
 * Simple class to display a group of audios files.
 */
export class EmbeddedAudios extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
            #container{
                position: relative;
                background-color: var(--palette-background-paper);
                color: var(--palette-text-primary);
                display: flex;
                flex-direction: column;

            }

            #audios{
                display: flex;
                flex-wrap: wrap;
            }

            #play-all-btn {
                position:absolute;
                top: 0px; 
                right: 0px;
                z-index: 100;
            }

        </style>
        <div id="container">
            <paper-icon-button id="play-all-btn" title="play all audio" icon="av:playlist-play"></paper-icon-button>
            <div id="audios">
                <slot></slot>
            </div>
        </div>
        `

        // Keep a reference to the audios.
        this.audios = []

        this.playAllBtn = this.shadowRoot.querySelector("#play-all-btn")

        this.playAllBtn.onclick = (evt) => {
            playAudios(this.audios, "audio list")
        }
    }

    getAudio(index) {
        return this.audios[index]
    }

    removeAudio(audio) {
        if (this.onremoveaudio) {
            this.onremoveaudio(audio)
        }
    }

    setAudios(audios) {
        this.audios = audios
        this.innerHTML = ""

        if (audios.length > 4) {
            let carousel = new Carousel
            carousel.style.width = "100%"

            // put video info in the carousel.
            carousel.setItems(audios)

            // set the carousel...
            this.appendChild(carousel)

        } else {
            // Create video card's
            this.audios.forEach(audio => {
                let card = new SearchAudioCard
                card.setAudio(audio)
                card.onclose = () => {
                    this.removeChild(card)
                    this.removeAudio(audio.file.getPath())
                }
                card.setEditable(this.editable)
                this.appendChild(card)
            })
        }
    }

    // hide or show the edit button...
    setEditable(editable) {
        this.editable = editable;
        for (var i = 0; i < this.children.length; i++) {
            this.children[i].setEditable(editable)
        }
    }

    getImages(){
        let images = []
        for (var i = 0; i < this.audios.length; i++) {
            let img = document.createElement("img")
            img.src = this.audios[i].getPoster().getContenturl()
            images.push(img)
        }
        return images;
    }
}

customElements.define('globular-embedded-audios', EmbeddedAudios)
