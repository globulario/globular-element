import { DeleteVideoRequest } from "globular-web-client/title/title_pb";
import { parseDuration } from "../utility";
import { Backend, displaySuccess, displayError, displayMessage } from "../../backend/backend";
import { VideoInfoEditor } from "./videoInformationsEditor.js";
import getUuidByString from "uuid-by-string";

const __style__ = `
.title-div {
    display: flex;

}

.title-poster-div {
    padding-right: 20px;
}


.title-informations-div {
    font-size: 1em;
    min-width: 350px;
    max-width: 450px;
  
}

.title-poster-div img, p{
    /*max-width: 256px;*/
}

.title-genre-span {
    border: 1px solid var(--palette-divider);
    padding: 1px;
    padding-left: 5px;
    padding-right: 5px;
    margin-right: 5px;
    user-select: none;
}

.rating-star{
    --iron-icon-fill-color: rgb(245 197 24);
    padding-right: 10px;
    height: 30px;
    width: 30px;
}

.title-rating-div{
    display: flex;
    align-items: center;
    color: var(--palette-text-secondery);
    font-size: 1rem;
}

.title-genres-div{
    padding: 5px;
    display: flex;
    flex-wrap: wrap;
    font-size: .9rem;
}

#rating-span{
    font-weight: 600;
    font-size: 1.2rem;
    color: var(--palette-text-primery);
    user-select: none;
}

.title-credit {
    flex-grow: 1;
    color: var(--palette-text-primery);
    border-bottom: 2px solid;
    border-color: var(--palette-divider);
    width: 100%;
    margin-bottom: 10px;
}

.title-files-div {
    display: flex;
    width: 100%;
    flex-wrap: wrap;
    max-width: 400px;
}

.title-files-div globular-video-preview {
    margin-right: 5px;
}

.title-files-div paper-progress{
    width: 100%;
}

.title-top-credit, title-credit{
    margin-top: 15px;
    display: flex;
    flex-direction: column;
}

.title-credit-title{
    font-weight: 400;
    font-size: 1.1rem;
    color: var(--palette-text-primery);
}

.title-credit-lst{
    display: flex;
}

.title-credit-lst a {
    color: var(--palette-warning-main);
    font-size: 1.1rem;
    margin-right: 12px;
}

.title-credit-lst a:link { text-decoration: none; }
.title-credit-lst a:visited { text-decoration: none; }
.title-credit-lst a:hover { text-decoration: none; cursor:pointer; }
.title-credit-lst a:active { text-decoration: none; }

/** Small **/
@media only screen and (max-width: 600px) {
    .title-div {
        flex-direction: column;
    }

    .title-poster-div {
        display: flex;
        justify-content: center;
        margin-bottom: 20px;
        flex-direction: column;
    }

    globular-video-preview{
        margin-top: 10px;
    }
}
`

/**
 * Video information
 */
export class VideoInfo extends HTMLElement {
    // attributes.


    // Create the applicaiton view.
    constructor(titleDiv, isShort) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });



        this.titleDiv = titleDiv
        this.isShort = isShort


        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           ${__style__}
            

            .title-div {
                color: var(--primary-text-color);
                user-select: none;
            }

            .action-div{
                display: flex;
                justify-content: end;
            }

            .title-rating-div{
                font-size: .8rem;
            }

            .title-poster-img{
                max-width: 320px;
                max-height: 350px;
                object-fit: cover;
                width: auto;
                height: auto;
            }

            paper-button {
                font-size: 1rem;
            }

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

            @media only screen and (max-width: 600px) {
                .title-div{
                    max-height: calc(100vh - 300px);
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .title-poster-img{
                    max-width: 256px;
                    max-height: 256px;
                }
            }


        </style>
        <div>
            <div class="title-div">
                <div class="title-poster-div" >
                    <img class="title-poster-img" style="${this.isShort ? "display: none;" : ""}"></img>
                    <div class="title-files-div">
                    </div>
                </div>
                <div class="title-informations-div">
                    <p class="title-synopsis-div"></p>
                    <div class="title-genres-div"></div>
                    <div class="title-rating-div">
                        <iron-icon class="rating-star" icon="icons:star"></iron-icon>
                        <div style="display: flex; flex-direction: column;">
                            <div><span id="rating-span"></span>/10</div>
                        </div>
                    </div>
                    <div class="title-top-credit">
                        <div class="title-credit">
                            <div id="title-actors-title" class="title-credit-title">Star</div>
                            <div id="title-actors-lst" class="title-credit-lst"></div>
                        </div>
                    </div>
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

    /** Set video information... */
    setVideo(video) {

        let score = video.getRating()

        let posterUrl = ""
        if (video.getPoster() != undefined) {
            // must be getContentUrl here... 
            posterUrl = video.getPoster().getContenturl()
            this.shadowRoot.querySelector(".title-poster-img").src = posterUrl
        }

        this.shadowRoot.querySelector(".title-synopsis-div").innerHTML = video.getDescription()
        this.shadowRoot.querySelector("#rating-span").innerHTML = score.toFixed(1)

        let genres = ""
        video.getGenresList().forEach((genre, index) => {
            genres += genre
            if (index < video.getGenresList().length - 1) {
                genres += ", "
            }
        })

        let publisherName = ""
        if (video.getPublisherid() != undefined) {
            publisherName = video.getPublisherid().getName()

        }

        let duration = ""
        if (video.getDuration() > 0) {
            duration = parseDuration(video.getDuration())
        }

        // Set the header section.
        this.titleDiv.innerHTML = `
        <div class="title-sub-title-div" style="display: flex; flex-direction: column;"> 
            <h1 id="title-name" class="title" style="${this.isShort ? "font-size: 1rem; padding-bottom: 10px;" : ""}"> ${publisherName} </h1>
            <div style="display: flex; align-items: baseline; max-width: 700px;">
                <h3 class="title-sub-title-div" style="${this.isShort ? "font-size: 1rem;" : ""}">          
                    <span id="title-type"><span>Genre: </span>${genres}</span>
                </h3>    
                <span id="title-duration" style="padding-left: 10px;"><span>Duration: </span> ${duration}</span>
            </span>
        </div>
        `

        // Here I will display the list of categories.
        let genresDiv = this.shadowRoot.querySelector(".title-genres-div")
        genresDiv.innerHTML = ""
        video.getTagsList().forEach(g => {
            let genreSpan = document.createElement("span")
            genreSpan.classList.add("title-genre-span")
            genreSpan.innerHTML = g
            genresDiv.appendChild(genreSpan)
        })


        // Display list of persons...
        let displayPersons = (div, persons) => {
            persons.forEach(p => {
                let uuid = "_" + getUuidByString(p.getId())
                let lnk = div.querySelector(`#${uuid}`)
                if (lnk == null) {
                    lnk = document.createElement("a")
                }
                lnk.id = uuid;
                lnk.href = p.getUrl()
                lnk.innerHTML = p.getFullname()
                lnk.target = "_blank"
                div.appendChild(lnk)
            })
        }

        displayPersons(this.shadowRoot.querySelector("#title-actors-lst"), video.getCastingList())
        if (video.getCastingList().length > 0) {
            this.shadowRoot.querySelector("#title-actors-title").innerHTML = "Actors"
        }

        let filesDiv = this.shadowRoot.querySelector(".title-files-div")
        filesDiv.innerHTML = ""

        /*GetTitleFiles("/search/videos", video, filesDiv, (previews) => {

        })*/

        if (localStorage.getItem("user_token") != null) {
            let editor = new VideoInfoEditor(video, this)

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
            let toast = displayMessage(
                `
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

            toast.toastElement.querySelector("#title-type").innerHTML = video.getDescription()
            toast.toastElement.querySelector("#title-poster").src = posterUrl

            let okBtn = toast.toastElement.querySelector("#imdb-lnk-ok-button")
            okBtn.onclick = () => {
                let rqst = new DeleteVideoRequest()
                rqst.setVideoid(video.getId())
                rqst.setIndexpath(Backend.globular.config.DataPath + "/search/videos")
                Backend.globular.titleService.deleteVideo(rqst, { domain: Backend.globular.domain, token: localStorage.getItem("user_token") })
                    .then(() => {
                        displaySuccess(`${video.getId()}:${video.getDescription()} was deleted`, 3000)
                        Backend.eventHub.publish("_delete_infos_" + video.getId() + "_evt", {}, true)
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

customElements.define('globular-video-info', VideoInfo)
