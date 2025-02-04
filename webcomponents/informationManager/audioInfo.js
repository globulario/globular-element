import f from "@editorjs/checklist";
import { AudioInfoEditor } from "./audioInfomationsEditor";

function toHoursAndMinutes(totalSeconds) {
    const totalMinutes = Math.floor(totalSeconds / 60);

    const seconds = totalSeconds % 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return { h: hours, m: minutes, s: seconds };
}

/**
 * Display basic file informations.
 */
export class AudioInfo extends HTMLElement {

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.isShort = false


        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

            #container {
                display: flex;
                flex-direction: column;
                color: var(--primary-text-color);
            }

            img {
                width: 256px;
            }

        </style>
        <div id="container">
            <div>
                <img id="image"></img>
            </div>
            <div style="display: table; flex-grow: 1; padding-left: 20px;">
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Title:</div>
                    <div id="title-div" style="display: table-cell;"></div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Artist:</div>
                    <div id="artist-div" style="display: table-cell;"></div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Album:</div>
                    <div id="album-div" style="display: table-cell;"></div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Album Artist:</div>
                    <div id="album-artist-div" style="display: table-cell;"></div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Genre:</div>
                    <div  id="genre-div" style="display: table-cell;"></div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Year:</div>
                    <div id="year-div" style="display: table-cell;"></div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Track:</div>
                    <div id="track-div" style="display: table-cell;"></div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Duration:</div>
                    <div id="duration-div" style="display: table-cell;"></div>
                </div>
            </div>
            <div class="action-div" style="${this.isShort ? "display: none;" : ""}">
                <paper-button id="edit-indexation-btn">Edit</paper-button>
                <paper-button id="delete-indexation-btn">Delete</paper-button>
            </div>
        </div>
        `


        if (!localStorage.getItem("user_token")) {
            this.shadowRoot.querySelector("#edit-indexation-btn").style.display = "none"
            this.shadowRoot.querySelector("#delete-indexation-btn").style.display = "none"
        }

    }

    setAudio(audio) {
        this.shadowRoot.querySelector("#image").src = audio.getPoster().getContenturl()
        this.shadowRoot.querySelector("#title-div").innerHTML = audio.getTitle()
        this.shadowRoot.querySelector("#artist-div").innerHTML = audio.getArtist()
        this.shadowRoot.querySelector("#album-div").innerHTML = audio.getAlbum()
        this.shadowRoot.querySelector("#album-artist-div").innerHTML = audio.getAlbumartist()
        this.shadowRoot.querySelector("#genre-div").innerHTML = audio.getGenresList().join(" / ")
        this.shadowRoot.querySelector("#year-div").innerHTML = audio.getYear() + ""
        this.shadowRoot.querySelector("#track-div").innerHTML = audio.getTracknumber() + ""
        let duration = toHoursAndMinutes(audio.getDuration())
        this.shadowRoot.querySelector("#duration-div").innerHTML = duration.m + ":" + duration.s + ""

        // Display the edit and delete buttons.
        if (localStorage.getItem("user_token")) {
            let editor = new AudioInfoEditor(audio, this)

            let editIndexationBtn = this.shadowRoot.querySelector("#edit-indexation-btn")
            editIndexationBtn.onclick = () => {
                // So here I will display the editor...
                let parent = this.parentNode
                parent.removeChild(this)
                parent.appendChild(editor)
            }
        }

        let deleteIndexationBtn = this.shadowRoot.querySelector("#delete-indexation-btn")
        // Delete the indexation from the database.
        deleteIndexationBtn.onclick = () => {
            let toast = displayQuestion(``, `
            <style>
               
            </style>
            <div id="select-media-dialog">
                <div>Your about to delete indexation</div>
                <p style="font-style: italic;  max-width: 300px;" id="title-type"></p>
                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <img style="width: 185.31px; align-self: center; padding-top: 10px; padding-bottom: 15px;" id="title-poster"> </img>
                </div>
                <div>Is that what you want to do? </div>
                <div style="display: flex; justify-content: flex-end;">
                    <paper-button id="imdb-lnk-ok-button">Ok</paper-button>
                    <paper-button id="imdb-lnk-cancel-button">Cancel</paper-button>
                </div>
            </div>
            `, 60 * 1000)

            let cancelBtn = toast.toastElement.querySelector("#imdb-lnk-cancel-button")
            cancelBtn.onclick = () => {
                toast.hideToast();
            }

            toast.toastElement.querySelector("#title-type").innerHTML = audio.getTitle()
            toast.toastElement.querySelector("#title-poster").src = audio.getPoster().getContenturl()

            let okBtn = toast.toastElement.querySelector("#imdb-lnk-ok-button")
            okBtn.onclick = () => {
                let rqst = new DeleteVideoRequest()
                rqst.setAudioid(audio.getId())
                rqst.setIndexpath(Backend.globular.config.DataPath + "/search/audio")
                Backend.globular.titleService.deleteAudio(rqst, { domain: Backend.globular.domain, token: localStorage.getItem("user_token") })
                    .then(() => {
                        displaySuccess(`${audio.getId()}:${audio.getTitle()} was deleted`, 3000)
                        Backend.eventHub.publish("_delete_infos_" + audio.getId() + "_evt", {}, true)
                        this.parentNode.removeChild(this)

                        if (this.ondelete) {
                            this.ondelete()
                        }
                    })
                    .catch(err => displayError(err, 3000))

                toast.hideToast();
            }
        }
    }
}

customElements.define('globular-audio-info', AudioInfo)
