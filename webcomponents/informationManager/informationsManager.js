import getUuidByString from "uuid-by-string"

import { AudioInfo } from "./audioInfo.js"
import { VideoInfo } from "./videoInfo.js"
import { TitleInfo } from "./titleInfo.js"
import { BlogPostInfo } from "./blogPostInfo.js"
import { FileInfo } from "./fileInfo.js"
import { Backend } from "../../backend/backend"


/**
 * Display information about given object ex. titles, files...
 */
export class InformationsManager extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        let isShort = this.hasAttribute("short")
        this.onclose = null;

        // Innitialisation of the layout.
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

            #container{
                display: flex;
                flex-direction: column;
                padding: 8px;
                z-index: 100;
                background-color: var(--surface-color);
                color: var(--on-surface-color);
                font-size: 1rem;
                user-select: none;
                max-height: calc(100vh - 100px);
                overflow-y: auto;
                overflow-x: hidden;
            }

            #header {
                display: flex;
                line-height: 20px;
                padding-bottom: 10px;
            }

            #header paper-icon-button {
                min-width: 40px;
            }


            h1 {
                font-size: 1.55rem;
            }

            h2 {
                font-size: 1.35rem;
            }

            h3 {
                font-size: 1.25rem;
            }


            #header h1, h2, h3 {
                margin: 5px;
            }

            .title-div{
                display: flex;
                flex-direction: column;
                flex-grow: 1;
                color: var(--palette-text-primery);
                border-bottom: 2px solid;
                border-color: var(--palette-divider);
                width: 66.66%;
                margin-bottom: 0px;
                user-select: none;
            }

            .title-sub-title-div{
                display: flex;
            }
            title-sub-title-div span {
                padding-right: 5px;
                user-select: none;
            }

            #title-year {
                padding-left: 10px;
                padding-right: 10px;
            }

            .permissions{
                padding: 10px;
            }

        </style>
        <div id="container">
            <div id="header">
                <div class="title-div"></div>
                <paper-icon-button icon="close" style="${isShort ? "display: none;" : ""}"></paper-icon-button>
            </div>
            <slot></slot>
        </div>
        `
        // give the focus to the input.
        this.container = this.shadowRoot.querySelector("#container")

        // The close button...
        let closeButton = this.shadowRoot.querySelector("paper-icon-button")
        closeButton.onclick = () => {
            // remove it from it parent.
            this.parentNode.removeChild(this)
            if (this.onclose != null) {
                this.onclose()
            }

        }

        // Connect event here...
        let globules = Backend.globule

        let subscribe = (index) => {
            let globule = globules[index]
            index++
            globule.eventHub.subscribe("delete_audio_event", uuid => { }, evt => {
                let id = "_" + getUuidByString(evt)
                if (this.querySelector("#" + id)) {
                    if (this.parentNode)
                        this.parentNode.removeChild(this)
                }
            }, false)

            globule.eventHub.subscribe("delete_video_event", uuid => { }, evt => {
                let id = "_" + getUuidByString(evt)
                if (this.querySelector("#" + id)) {
                    if (this.parentNode)
                        this.parentNode.removeChild(this)
                }
            }, false)

            globule.eventHub.subscribe("delete_title_event", uuid => { }, evt => {
                let id = "_" + getUuidByString(evt)
                if (this.querySelector("#" + id)) {
                    if (this.parentNode)
                        this.parentNode.removeChild(this)
                }
            }, false)

            if (index < globules.length) {
                subscribe(index)
            }
        }

        if (globules > 0) {
            let index = 0
            subscribe(index)
        }

    }

    hideHeader() {
        if (this.shadowRoot.querySelector("paper-icon-button"))
            this.shadowRoot.querySelector("paper-icon-button").style.display = "none"
        if (this.shadowRoot.querySelector("#title-name"))
            this.shadowRoot.querySelector("#title-name").style.display = "none"
    }

    /**
     * Display video informations.
     * @param {*} videos 
     */
    setAudiosInformation(audios) {
        this.innerHTML = "" // remove previous content.
        this.shadowRoot.querySelector(".title-div").innerHTML = ""
        let audio = audios[0]
        let audioInfo = new AudioInfo(this.shadowRoot.querySelector(".title-div"), this.hasAttribute("short"))
        audioInfo.ondelete = () => {
            if (this.parentNode)
                this.parentNode.removeChild(this)
        }
        audioInfo.id = "_" + getUuidByString(audio.getId())
        audioInfo.setAudio(audio)


        this.appendChild(audioInfo)
    }

    /**
     * Display video informations.
     * @param {*} videos 
     */
    setVideosInformation(videos) {
        this.innerHTML = "" // remove previous content.
        this.shadowRoot.querySelector(".title-div").innerHTML = ""
        let video = videos[0]
        let videoInfo = new VideoInfo(this.shadowRoot.querySelector(".title-div"), this.hasAttribute("short"))
        videoInfo.ondelete = () => {
            if (this.parentNode)
                this.parentNode.removeChild(this)
        }
        videoInfo.id = "_" + getUuidByString(video.getId())
        videoInfo.setVideo(video)
        this.appendChild(videoInfo)


    }

    /**
     * Display video informations.
     * @param {*} blog post 
     */
    setBlogPostInformation(blogPost) {
        this.innerHTML = "" // remove previous content.
        this.shadowRoot.querySelector(".title-div").innerHTML = ""
        let blogPostInfo = new BlogPostInfo(blogPost)
        blogPostInfo.ondelete = () => {
            if (this.parentNode)
                this.parentNode.removeChild(this)
        }
        blogPostInfo.id = "_" + getUuidByString(blogPost.getId())
        this.appendChild(blogPostInfo)
    }

    /**
     * Display title informations.
     * @param {*} titles 
     */
    setTitlesInformation(titles) {
        this.innerHTML = "" // remove previous content.
        this.shadowRoot.querySelector(".title-div").innerHTML = ""
        if (titles.length == 0) {
            /** nothinh to display... */
            return;
        }

        let title = null;
        if (titles.length == 1) {
            title = titles[0]
        } else {
            titles.forEach(t => {
                if (t.getType() == "TVSeries") {
                    title = t;
                }
            })
        }

        if (title == null) {
            title = titles[titles.length - 1]
        }

        let titleInfo = new TitleInfo(this.shadowRoot.querySelector(".title-div"), this.hasAttribute("short"), title.globule)
        titleInfo.ondelete = () => {
            if (this.parentNode)
                this.parentNode.removeChild(this)
        }

        titleInfo.id = "_" + getUuidByString(title.getId())
        titleInfo.setTitle(title)
        this.appendChild(titleInfo)
    }

    setFileInformation(file) {
        this.innerHTML = "" // remove previous content.
        this.shadowRoot.querySelector(".title-div").innerHTML = `
        <div style="display: flex; align-items: center;">
            <iron-icon id="icon" icon="icons:info"> </iron-icon> 
            <span style="flex-grow: 1; padding-left: 20px; font-size: 1.1rem;  user-select: none;">${file.name} <span style="color: var(--palette-text-secondary);  margin-left: 16px; user-select: none;">Properties</span></span>
        </div>`
        let fileInfo = new FileInfo(file)
        this.appendChild(fileInfo)
    }

}

customElements.define('globular-informations-manager', InformationsManager)

