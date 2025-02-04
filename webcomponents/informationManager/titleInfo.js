import { DeleteTitleRequest, GetTitleFilesRequest, SearchTitlesRequest } from "globular-web-client/title/title_pb";
import { Backend, displayError, displayMessage, displayQuestion, generatePeerToken } from "../../backend/backend";
import getUuidByString from "uuid-by-string";
import { FileController } from "../../backend/file";
import { VideoPreview } from "../fileExplorer/videoPreview";
import { TitleInfoEditor } from "./titleInformationsEditor";
import { randomUUID } from "../utility";
import { playAudio } from "../audio";
import { playVideo } from "../video";


// Create the video preview...
function getVideoPreview(parent, path, name, callback, globule) {

    // set only one preview div...
    let id = "_" + getUuidByString(path) + "_preview_div"
    if (parent.querySelector("#" + id) != null) {
        callback(parent.querySelector("#" + id))
        return
    }

    let h = 64;
    let w = 100;

    FileController.getFile(globule, path, w, h, file => {

        let fileNameSpan = document.createElement("span")
        let preview = new VideoPreview(file, 64, () => {
            if (preview.width > 0 && preview.height > 0) {
                w = (preview.width / preview.height) * h
            }
            fileNameSpan.style.wordBreak = "break-all"
            fileNameSpan.style.fontSize = ".85rem"
            fileNameSpan.style.maxWidth = w + "px";
            fileNameSpan.innerHTML = path.substring(path.lastIndexOf("/") + 1)
        }, globule)

        let range = document.createRange()
        let uuid = randomUUID()
        preview.appendChild(range.createContextualFragment(`<paper-icon-button icon="icons:remove-circle" id="_${uuid}" style="position: absolute;"> </paper-icon-button>`))
        let unlinkBtn = preview.querySelector(`#_${uuid}`)

        // keep the explorer link...
        preview.name = name
        preview.onpreview = () => {
            let previews = parent.querySelectorAll("globular-video-preview")
            previews.forEach(p => {
                // stop all other preview...
                if (preview.name != p.name) {
                    p.stopPreview()
                }
            })
        }

        // Here I will set the filename 
        let previewDiv = document.createElement("div")
        previewDiv.id = id
        previewDiv.style.display = "flex"
        previewDiv.style.flexDirection = "column"
        previewDiv.appendChild(preview)
        previewDiv.appendChild(fileNameSpan)

        // When the file will be unlink...
        unlinkBtn.onclick = (evt) => {
            evt.stopPropagation();

            let toast = displayMessage(`
                <style>
                   
                </style>
                <div id="select-media-dialog">
                    <div>Your about to delete file association</div>
                    <p style="font-style: italic;  max-width: 300px;" id="file-name"></p>
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

            toast.toastElement.querySelector("#file-name").innerHTML = path.substring(path.lastIndexOf("/") + 1)

            let okBtn = toast.toastElement.query.Selector("#imdb-lnk-ok-button")
            okBtn.onclick = () => {
                let rqst = new DissociateFileWithTitleRequest
                rqst.setFilepath(path)
                rqst.setTitleid(name)
                if (name.startsWith("tt")) {
                    rqst.setIndexpath(globule.config.DataPath + "/search/titles")
                } else {
                    rqst.setIndexpath(globule.config.DataPath + "/search/videos")
                }

                globule.titleService.dissociateFileWithTitle(rqst, { domain: globule.domain, token: localStorage.getItem("user_token") })
                    .then(rsp => {
                        // remove the association.
                        previewDiv.parentNode.removeChild(previewDiv)
                        displayMessage("association was delete", 3000)
                       toast.hideToast();
                    }).catch(err => displayError(err, 3000))
            }

        }


        preview.onplay = (f) => {
            path = f.getPath()
            if (path.endsWith(".mp3")) {

                playAudio(path, (audio) => {
                    let titleInfoBox = document.getElementById("title-info-box")
                    if (titleInfoBox) {
                        titleInfoBox.parentNode.removeChild(titleInfoBox)
                    }
                    //video.toggleFullscreen();
                }, null, null, globule)

            } else {
                playVideo(path, (video) => {
                    let titleInfoBox = document.getElementById("title-info-box")
                    if (titleInfoBox) {
                        titleInfoBox.parentNode.removeChild(titleInfoBox)
                    }
                    if (video.toggleFullscreen) {
                        video.toggleFullscreen();
                    }

                }, null, null, globule)
            }

        }


        callback(previewDiv)

    }, err => displayError(err, 3000))

}

/**
 * Return the list of file of a given tile...
 * @param {*} title The title 
 * @param {*} callback 
 */
function __getTitleFiles__(globule, indexPath, title, parent, callback) {

    generatePeerToken(globule, token => {
        let rqst = new GetTitleFilesRequest
        rqst.setTitleid(title.getId())
        rqst.setIndexpath(indexPath)

        globule.titleService.getTitleFiles(rqst, { domain: globule.domain, token: token })
            .then(rsp => {
                let previews = []
                let _getVideoPreview_ = () => {
                    if (rsp.getFilepathsList().length > 0) {
                        let path = rsp.getFilepathsList().pop()
                        // Return the first file only... 
                        getVideoPreview(parent, path, title.getId(), p => {

                            parent.appendChild(p)
                            _getVideoPreview_() // call again...
                        }, globule)
                    } else {
                        callback(previews)
                    }
                }
                _getVideoPreview_() // call once...
            })
            .catch(err => { callback([]) })
    }, err => displayError(err, 3000))

}


function GetTitleFiles(indexPath, title, parent, callback) {

    let previews = []
    let titleFiles = () => {
        let globule = title.globule
        __getTitleFiles__(globule, globule.config.DataPath + indexPath, title, parent, previews_ => {
            previews = previews.concat(previews_)
            callback(previews)
        })
    }

    titleFiles() // call once

}

/**
 * Here I will return the list of asscociated episode for a given series...
 * @param {*} indexPath  The path to the search engine 
 * @param {*} title The title
 * @param {*} callback The callback with the list of episodes.
 */
export function GetEpisodes(indexPath, title, callback) {
    // return the existing list...
    if (title.__episodes__ != undefined) {
        callback(title.__episodes__)
        return
    }

    searchEpisodes(title.getId(), indexPath, episodes => {
        title.__episodes__ = episodes
        callback(title.__episodes__)
    })
}

export function searchEpisodes(serie, indexPath, callback) {
    let episodes = []
    let globules = Backend.getGlobules()

    let __searchEpisodes__ = (globules) => {
        let globule = globules.pop()

        // search episodes...
        _searchEpisodes_(globule, serie, indexPath, episodes_ => {
            episodes = episodes.concat(episodes_)
            if (globules.length > 0) {
                __searchEpisodes__(globules)
            } else {
                callback(episodes)
            }
        })
    }

    if (globules.length > 0) {
        __searchEpisodes__(globules)
    }
}


function _searchEpisodes_(globule, serie, indexPath, callback) {

    // This is a simple test...
    let rqst = new SearchTitlesRequest
    rqst.setIndexpath(indexPath)
    rqst.setQuery(serie)
    rqst.setOffset(0)
    rqst.setSize(1000)
    let episodes = []
    let stream = globule.titleService.searchTitles(rqst, { domain: globule.domain, token: localStorage.getItem("user_token") })
    stream.on("data", (rsp) => {
        if (rsp.hasHit()) {
            let hit = rsp.getHit()
            // display the value in the console...
            hit.getSnippetsList().forEach(val => {
                if (hit.getTitle().getType() == "TVEpisode") {
                    let episode = hit.getTitle()
                    episode.globule = globule
                    episodes.push(episode)
                }
            })
        }
    });

    stream.on("status", (status) => {
        if (status.code == 0) {
            // Here I will sort the episodes by seasons and episodes.
            callback(episodes.sort((a, b) => {
                if (a.getSeason() === b.getSeason()) {
                    // Price is only important when cities are the same
                    return a.getEpisode() - b.getEpisode();
                }
                return a.getSeason() - b.getSeason();
            }))
        }
    });
}



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
 * Globular title information panel.
 */
export class TitleInfo extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(titleDiv, isShort, globule) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });


        if (!globule) {
            this.globule = Backend.globular
        }

        this.isShort = isShort
        this.titleDiv = titleDiv
        this.globule = globule

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

            ${__style__}
           
            

            .title-div{
     
            }

            .action-div{
                display: flex;
                justify-content: end;
            }

            .title-poster-img{
                max-width: 320px;
                max-height: 350px;
                object-fit: cover;
                width: auto;
                height: auto;
            }

            paper-card{
                background-color: var(--surface-color);
                color: var(--primary-text-color);
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
                    object-fit: cover;
                    width: auto;
                    height: auto;
                }
            }
        </style>

        <div class="title-div" >
            <div style="display: flex; flex-direction: column;"> 
                <div class="title-poster-div" style="${this.isShort ? "display: none;" : ""}">
                    <img class="title-poster-img"></img>
                </div>
                <div class="title-files-div" style="${this.isShort ? "display: none;" : ""}">
                    <paper-progress indeterminate></paper-progress>
                </div>
            </div>
            <div class="title-informations-div">
                <div class="title-genres-div"></div>
                <p class="title-synopsis-div" style="${this.isShort ? "display: none;" : ""}"></p>
                <div class="title-rating-div">
                    <iron-icon class="rating-star" icon="icons:star"></iron-icon>
                    <div style="display: flex; flex-direction: column;">
                        <div><span id="rating-span"></span>/10</div>
                        <div id="rating-total-div"></div>
                    </div>
                </div>
                <div class="title-top-credit" style="${this.isShort ? "display: none;" : ""}">
                    <div class="title-credit">
                        <div id="title-directors-title" class="title-credit-title">Director</div>
                        <div  id="title-directors-lst" class="title-credit-lst"></div>
                    </div>
                    <div class="title-credit">
                        <div id="title-writers-title" class="title-credit-title">Writer</div>
                        <div id="title-writers-lst" class="title-credit-lst"></div>
                    </div>
                    <div class="title-credit">
                        <div id="title-actors-title" class="title-credit-title">Star</div>
                        <div id="title-actors-lst" class="title-credit-lst"></div>
                    </div>
                </div>
            </div>
        </div>
        <div id="episodes-div" style="${this.isShort ? "display: none;" : ""}">
            <slot name="episodes"></slot>
        </div>
        <div class="action-div" style="${this.isShort ? "display: none;" : ""}">
            <paper-button id="edit-indexation-btn">Edit</paper-button>
            <paper-button id="delete-indexation-btn">Delete</paper-button>
        </div>
        `
    }

    showTitleInfo(title) {
        let uuid = "_" + getUuidByString(title.getId())
        let html = `
        <paper-card id="video-info-box-dialog-${uuid}" style="background: var(--surface-color); border-top: 1px solid var(--surface-color); border-left: 1px solid var(--surface-color); z-index: 1001;">
            <globular-informations-manager id="title-info-box"></globular-informations-manager>
        </paper-card>
        `
        let titleInfoBox = document.getElementById("title-info-box")
        if (titleInfoBox == undefined) {
            let range = document.createRange()
            document.body.appendChild(range.createContextualFragment(html))
            titleInfoBox = document.getElementById("title-info-box")
            let parent = document.getElementById("video-info-box-dialog-" + uuid)
            parent.style.position = "fixed"
            parent.style.top = "75px"
            parent.style.left = "50%"
            parent.style.transform = "translate(-50%)"

            titleInfoBox.onclose = () => {
                parent.parentNode.removeChild(parent)
            }
        }
        titleInfoBox.setTitlesInformation([title])
    }

    setTitle(title) {

        let posterUrl = ""
        if (title.getPoster() != undefined) {
            posterUrl = title.getPoster().getContenturl()
        }

        // set title values.
        this.shadowRoot.querySelector(".title-synopsis-div").innerHTML = title.getDescription()
        this.shadowRoot.querySelector("#rating-span").innerHTML = title.getRating().toFixed(1)
        this.shadowRoot.querySelector("#rating-total-div").innerHTML = title.getRatingcount()
        this.shadowRoot.querySelector(".title-poster-img").src = posterUrl


        // Set the title div.
        this.titleDiv.innerHTML = `
           <h1 id="title-name" class="title" style="${this.isShort ? "font-size: 1.2rem;text-align: left; margin-bottom: 10px;" : ""}"> </h1>
           <h3 class="title-sub-title-div" style="${this.isShort ? "font-size: 1rem; max-width: 500px;" : ""}">             
               <span id="title-type"></span>
               <span id="title-year"></span>
               <span id="title-duration"></span>
           </h3>
           `
        this.titleDiv.querySelector("#title-name").innerHTML = title.getName();
        this.titleDiv.querySelector("#title-type").innerHTML = title.getType();
        this.titleDiv.querySelector("#title-year").innerHTML = title.getYear();
        if (title.getType() == "TVEpisode") {
            if (title.getSeason() > 0 && title.getEpisode() > 0) {
                this.titleDiv.querySelector("#title-year").innerHTML = `<span>${title.getYear()}</span>&middot<span>S${title.getSeason()}</span>&middot<span>E${title.getEpisode()}</span>`
            }
        }

        this.titleDiv.querySelector("#title-duration").innerHTML = title.getDuration();

        let genresDiv = this.shadowRoot.querySelector(".title-genres-div")
        title.getGenresList().forEach(g => {
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
                if (!lnk) {
                    lnk = document.createElement("a")
                }

                lnk.href = p.getUrl()
                lnk.innerHTML = p.getFullname()
                lnk.target = "_blank"
                lnk.id = uuid

                div.appendChild(lnk)
            })
        }

        // display directors
        displayPersons(this.shadowRoot.querySelector("#title-directors-lst"), title.getDirectorsList())
        if (title.getDirectorsList().length > 0) {
            this.shadowRoot.querySelector("#title-directors-title").innerHTML = "Directors"
        }

        // display writers
        displayPersons(this.shadowRoot.querySelector("#title-writers-lst"), title.getWritersList())
        if (title.getWritersList().length > 0) {
            this.shadowRoot.querySelector("#title-writers-title").innerHTML = "Writers"
        }

        // display actors
        displayPersons(this.shadowRoot.querySelector("#title-actors-lst"), title.getActorsList())
        if (title.getActorsList().length > 0) {
            this.shadowRoot.querySelector("#title-actors-title").innerHTML = "Actors"
        }

        let filesDiv = this.shadowRoot.querySelector(".title-files-div")
        if (title.getType() != "TVSeries") {
            filesDiv.style.paddingLeft = "15px"
            GetTitleFiles("/search/titles", title, filesDiv, (previews) => {
                filesDiv.querySelector("paper-progress").style.display = "none"
            })
        } else {
            // Here the title is a series...
            let indexPath = title.globule.config.DataPath + "/search/titles"
            GetEpisodes(indexPath, title, (episodes) => {
                if (title.onLoadEpisodes != null) {
                    title.onLoadEpisodes(episodes)
                }
                this.displayEpisodes(episodes, this)
                filesDiv.querySelector("paper-progress").style.display = "none"
            })
        }


        let editor = new TitleInfoEditor(title, this)

        let editIndexationBtn = this.shadowRoot.querySelector("#edit-indexation-btn")
        editIndexationBtn.onclick = () => {
            // So here I will display the editor...
            let parent = this.parentNode
            parent.removeChild(this)
            parent.appendChild(editor)
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


            toast.toastElement.querySelector("#title-type").innerHTML = title.getName()
            toast.toastElement.querySelector("#title-poster").src = posterUrl

            let okBtn = toast.toastElement.querySelector("#imdb-lnk-ok-button")
            okBtn.onclick = () => {
                let rqst = new DeleteTitleRequest()
                let globule = title.globule
                generatePeerToken(globule, token => {
                    rqst.setTitleid(title.getId())
                    rqst.setIndexpath(globule.config.DataPath + "/search/titles")
                    globule.titleService.deleteTitle(rqst, { domain: globule.domain, token: token })
                        .then(() => {
                            displaySuccess(`${title.getId()}:${title.getDescription()} was deleted`, 3000)
                            Backend.eventHub.publish("_delete_infos_" + title.getId() + "_evt", {}, true)
                            this.parentNode.removeChild(this)
                            if (this.ondelete) {
                                this.ondelete()
                            }
                        })
                        .catch(err => displayError(err, 3000))

                })

                toast.hideToast();
            }
        }

    }

    // Here I will display the list of each episodes from the list...
    displayEpisodes(episodes, parent) {
        let seasons = {}

        if (parent.querySelector(".episodes-div")) {
            return
        }

        episodes.forEach(e => {
            if (e.getType() == "TVEpisode") {
                if (e.getSeason() > 0) {
                    if (seasons[e.getSeason()] == null) {
                        seasons[e.getSeason()] = []
                    }
                    if (seasons[e.getSeason()].filter(e_ => e_.getEpisode() === e.getEpisode()).length == 0) {
                        seasons[e.getSeason()].push(e)
                    }
                }
            }
        })

        let html = `
        <style>
            .episodes-div{
               display: flex;
               flex-direction: column;
               width: 100%;
            }

            .header {
                display: flex;
                width: 100%;
            }

            .season-page-div{
                display: flex;
                flex-wrap: wrap;
            }

            .episode-small-div{
                display: flex;
                margin: 10px;
                position: relative;
            }

            .episode-small-div img{
                object-fit: cover;
                width: 100%;
                height: 132px;
                max-width: 175px;
                min-width: 140px;
            }

            .slide-on-panel{
                color: white;
                position: absolute;
                bottom: 0px;
                left: 0px;
                right: 0px;
                background: rgba(0,0,0,.65);
                padding: 5px;
                border-top: 1px solid black;
                display: flex;
                align-items: center;
            }

            .slide-on-panel-title-name{
                color: white;
                flex-grow: 1;
                font-size: .85rem;
            }

            .episode-number-div {
                top: 2px;
                right: 10px;
                color: lightgray;
                position: absolute;
                font-weight: 600;
                font-size: larger;
            }

            .play-episode-button{
                position: absolute;
                /*--iron-icon-fill-color: rgb(0, 179, 255);*/
            }

            paper-tab{
                font-size: 1rem;
                font-weight: bold;
            }

            paper-tabs{
                /* custom CSS property */
                --paper-tabs-selection-bar-color: var(--palette-primary-main); 
                color: var(--primary-text-color);
                --paper-tab-ink: var(--palette-action-disabled);
            }

        </style>
        <div class="episodes-div" slot="episodes">
            <div class="header">
                <paper-tabs selected="0" scrollable style="width: 100%;"></paper-tabs>
            </div>
            <div id="episodes-content" style="width: 100%; height: 355px; overflow-y: auto;">

            </div>
        </div>
        `

        let range = document.createRange()
        parent.appendChild(range.createContextualFragment(html))

        let tabs = parent.querySelector("paper-tabs")
        let content = parent.querySelector("#episodes-content")
        let index = 0
        for (var s in seasons) {

            let html = `<paper-tab id="tab-season-${s}">Season ${s}<paper-tab>`
            tabs.appendChild(range.createContextualFragment(html))

            // Now the episodes panel...
            let episodes = seasons[s]
            let page = document.createElement("div")
            page.classList.add("season-page-div")
            content.appendChild(page)
            if (index > 0) {
                page.style.display = "none"
            }
            let tab = tabs.querySelector(`#tab-season-${s}`)
            tab.onclick = () => {
                let pages = content.querySelectorAll(".season-page-div")
                for (let i = 0; i < pages.length; i++) {
                    pages[i].style.display = "none"
                }

                page.style.display = "flex"
            }

            episodes.forEach(e => {
                let posterUrl = ""
                if (e.getPoster() != undefined) {
                    posterUrl = e.getPoster().getContenturl()
                }
                let uuid = "_" + getUuidByString(e.getId())
                let html = `
                    <div class="episode-small-div">
                        <div class="episode-number-div">${e.getEpisode()}</div>
                        <paper-icon-button id="_${uuid}" class="play-episode-button" icon="av:play-circle-filled" ></paper-icon-button>
                        <img src="${posterUrl}"></img>
                        <div class="slide-on-panel">
                            <div class="slide-on-panel-title-name">
                                ${e.getName()}
                            </div>
                            <paper-icon-button id="infos-btn-${uuid}" icon="icons:info-outline"></paper-icon-button>
                        </div>
                    </div>
                `

                page.appendChild(range.createContextualFragment(html))

                let infosBtn = page.querySelector(`#infos-btn-${uuid}`)
                infosBtn.onclick = (evt) => {
                    evt.stopPropagation()
                    this.showTitleInfo(e)
                }

                let playBtn = page.querySelector(`#_${uuid}`)

                playBtn.onclick = () => {
                    let indexPath = e.globule.config.DataPath + "/search/titles"
                    let rqst = new GetTitleFilesRequest
                    let globule = e.globule
                    rqst.setTitleid(e.getId())
                    rqst.setIndexpath(indexPath)
                    globule.titleService.getTitleFiles(rqst, { domain: globule.domain, token: localStorage.getItem("user_token") })
                        .then(rsp => {
                            let path = rsp.getFilepathsList().pop()
                            let titleInfoBox = document.getElementById("title-info-box")
                            let parentNode = null
                            if (titleInfoBox) {
                                parentNode = titleInfoBox.parentNode
                            }

                            playVideo(path,
                                (video) => {
                                    if (titleInfoBox) {
                                        if (titleInfoBox.parentNode) {
                                            titleInfoBox.parentNode.removeChild(titleInfoBox)
                                        }
                                        // video.toggleFullscreen();
                                    }
                                },
                                () => {
                                    if (parentNode != null) {
                                        parentNode.appendChild(titleInfoBox)
                                    }
                                }, e, globule)

                        }).catch(err => displayError(err, 3000))
                }

            })
            index++
        }

    }
}

customElements.define('globular-title-info', TitleInfo)


