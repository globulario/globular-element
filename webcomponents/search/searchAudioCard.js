import getUuidByString from "uuid-by-string";
import { displayError, displayMessage } from "../../backend/backend";

export class SearchAudioCard extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.audio = null;
        this.editable = false;

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container{
                position: relative;
                background-color: var(--surface-color);
                color: var(--palette-text-primary);
            }

            .audio-card{
                container-type: inline-size;
                container-name: audiocard;

                display: flex;
                flex-direction: column;
                border-radius: 3.5px;
                border: 1px solid var(--palette-divider);
                height: calc( 100% - 2px);
                overflow: hidden;
            }

            .audio-card:hover{
                box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
            }

            .audio-card img{
                min-height: 100px;
                max-height: 180px;
                border-top-left-radius: 3.5px;
                border-top-right-radius: 3.5px;
            }

            .audio-card img:hover{
                cursor: pointer;
            }

            #artist, #album {
                font-weight: 500;
                font-size: 1.2rem;
            }

            #title{
                font-size: 1.25rem;
                font-weight: 350;
                
            }

             #album{
                color: white;
            }

            #close-btn{
                display: none;
                z-index: 100;
                position: absolute;
                top: 0px;
                left: 0px;
                background-color: black;
                --paper-icon-button-ink-color: white;
                --iron-icon-fill-color: white;
                border-bottom: 1px solid var(--palette-divider);
                border-right: 1px solid var(--palette-divider);
                padding: 4px;
                width: 30px;
                height: 30px;
                --iron-icon-width: 24px;
                --iron-icon-height: 24px;
            }

            .album-header-bar{
                display: flex; 
                align-items: center;
                position: absolute; 
                background-color: rgba(0,0,0,.65);
                top: 0px; 
                left: 0px; 
                right: 0px; 
                padding: 5px;
            }
 
            @container audiocard (max-width: 300px) {
                #artist, #album {
                    font-weight: 500;
                    font-size: 1.2rem;
                }
    
                #title{
                    font-size: 1.25rem;
                    font-weight: 350;
                }

    
            }

            @container audiocard (max-width: 225px) {
                #close-btn{
                    --iron-icon-height: 32px;
                    --iron-icon-width: 32px;
                }

                #artist, #album {
                    font-weight: 300;
                    font-size: .95rem;
                }
    
                #title{
                    font-size: 1rem;
                    font-weight: 250;
                }

                .audio-card img {
                    min-height: 120px;
                    max-height: 120px;
                }

                .album-header-bar{
                    max-height: 30px;
                }

                .album-header-bar paper-icon-button{
                    height: 30px;
                    width: 30px;
                }

                #close-btn{
                    padding: 4px;
                    width: 25px;
                    height: 25px;
                    --iron-icon-width: 20px;
                    --iron-icon-height: 20px;
                    padding: 3px
                }
            }

            @container audiocard (max-width: 150px) {

                #artist, #album {
                    font-weight: 300;
                    font-size: .75rem;
                }
    
                #title{
                    font-size: .85rem;
                    font-weight: 250;
                }

                .audio-card img {
                    min-height: 80px;
                    max-height: 80px;
                }


                .album-header-bar{
                    max-height: 25px;
                }

                .album-header-bar paper-icon-button{
                    display: none;
                }

                #close-btn{
                    padding: 4px;
                    width: 20px;
                    height: 20px;
                    --iron-icon-width: 16px;
                    --iron-icon-height: 16px;
                    padding: 2px
                }
            }



        </style>

        <div id="container" class="audio-card">
            <paper-icon-button icon="icons:close" id="close-btn"></paper-icon-button>
            <img></img>
            <div style="padding: 5px; display: flex; flex-direction: column; align-items: flex-start;">
                <span id="artist"></span>
                <div class="album-header-bar">
                    <span id="album" style="flex-grow: 1; text-align: center;"></span> 
                    <paper-icon-button id="play-album-btn" style=" --iron-icon-fill-color: white;" title="play album" icon="av:play-arrow"></paper-icon-button> 
                </div>
                <div style="display: flex; justify-items: center; width: 100%">
                    <span id="title" style="flex-grow: 1; text-align: left;"></span>
                    <paper-icon-button id="play-title-btn" title="play title" icon="av:play-arrow"></paper-icon-button> 
                </div>
            </div>
        </div>
        `
        this.closeBtn = this.shadowRoot.querySelector("#close-btn")

        this.closeBtn.onclick = (evt) => {
            evt.stopPropagation()

            // Here I will ask the user for confirmation before actually delete the contact informations.
            let toast = displayMessage(
                `<style>
                    
                    #yes-no-audio-delete-box{
                        display: flex;
                        flex-direction: column;
                    }
    
                    #yes-no-audio-delete-box globular-picture-card{
                        padding-bottom: 10px;
                    }
    
                    #yes-no-audio-delete-box div{
                        display: flex;
                        padding-bottom: 10px;
                    }
    
                </style>
                <div id="yes-no-audio-delete-box">
                    <div>Your about to remove audio</div>
                        <img style="max-height: 256px; object-fit: contain; width: 100%;" src="${this.audio.getPoster().getContenturl()}"></img>
                        <p style="font-size: .85rem;">${this.audio.getTitle()}</p>
                        <div>Is it what you want to do? </div>
                        <div style="justify-content: flex-end;">
                        <paper-button raised id="yes-delete-picture">Yes</paper-button>
                        <paper-button raised id="no-delete-picture">No</paper-button>
                    </div>
                </div>
                `,
                60 * 1000 // 60 sec...
            );

            let yesBtn = document.querySelector("#yes-delete-picture")
            let noBtn = document.querySelector("#no-delete-picture")

            // On yes
            yesBtn.onclick = () => {
                if (this.onclose) {
                    this.onclose()
                }
               toast.hideToast();
                displayMessage(
                    `<div style="display: flex; flex-direction: column;">
                        <span style="font-size: .85rem;">${this.audio.getTitle()}</span>
                        <span>was remove</span>
                    </div>`,
                    3000
                );

                if(this.onclose){
                    this.onclose()
                }
            }

            noBtn.onclick = () => {
               toast.hideToast();
            }
        }
    }

    connectedCallback() {

    }

    // return the audio element...
    getAudio() {
        return this.audio;
    }

    // Call search event.
    setAudio(audio) {

        this.audio = audio
        let globule = audio.globule

        this.classList.add("filterable")
        audio.getGenresList().forEach(g => {
            g.split(" ").forEach(g_ => this.classList.add(getUuidByString(g_.toLowerCase())))

        })

        this.shadowRoot.querySelector("img").src = audio.getPoster().getContenturl()

        // I will display the album and year info...
        this.shadowRoot.querySelector("#artist").innerHTML = audio.getArtist()
        this.shadowRoot.querySelector("#title").innerHTML = audio.getTitle()
        this.shadowRoot.querySelector("#album").innerHTML = audio.getAlbum().trim()

        if (audio.getAlbum().length == 0) {
            this.shadowRoot.querySelector(".album-header-bar").style.display = "none"
        } else {
            if (audio.getAlbum() == "<Inconnu>") {
                this.shadowRoot.querySelector(".album-header-bar").style.display = "none"
            }
        }


        // Now the action...
        this.shadowRoot.querySelector("img").onclick = this.shadowRoot.querySelector("#play-title-btn").onclick = () => {
            // paly only the first file...
            let rqst = new GetTitleFilesRequest
            rqst.setTitleid(audio.getId())
            let indexPath = globule.config.DataPath + "/search/audios"
            rqst.setIndexpath(indexPath)

            globule.titleService.getTitleFiles(rqst, { domain: globule.domain })
                .then(rsp => {

                    if (rsp.getFilepathsList().length > 0) {
                        let path = rsp.getFilepathsList().pop()
                        playAudio(path, null, null, audio, globule)
                    }

                }).catch(err => displayError(err, 3000))
        }

        this.shadowRoot.querySelector("#play-album-btn").onclick = () => {

            searchTitles(globule, audio.getAlbum(), [], globule.config.DataPath + "/search/audios", 0, 500, hits => {
                let audios = []
                hits.forEach(hit => {
                    if (hit.hasAudio) {
                        let a = hit.getAudio()
                        if (a.getAlbum() == audio.getAlbum()) {
                            audios.push(a)
                        }

                    }
                })
                if (audios.length > 0) {
                    if (audios[0].getTracknumber())
                        audios = audios.sort((a, b) => {
                            return b.getTracknumber() - a.getTracknumber()
                        })
                    playAudios(audios, audio.getAlbum())
                }
            }, ["album"])
        }
    }

    setEditable(editable) {
        this.editable = editable;

        // console.log("show hide edit value control...", editable)
        if (this.editable) {
            if (this.onclose) {
                this.closeBtn.style.display = "block"
            }
        } else {
            this.closeBtn.style.display = "none"
        }
    }
}

customElements.define('globular-search-audio-card', SearchAudioCard)
