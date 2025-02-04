import { SearchVideoCard } from "./search/searchVideoCard.js";
import { SearchTitleCard } from "./search/searchTitleCard.js";
import { DeleteOneRqst, ReplaceOneRqst, FindOneRqst, FindRqst } from "globular-web-client/persistence/persistence_pb.js";
import { Backend, displayError, generatePeerToken } from "../backend/backend";
import "@polymer/iron-icons/iron-icons.js";
import '@polymer/iron-icons/maps-icons'
import jwt from "jwt-decode";
import { TitleController } from "../backend/title";
import { mergeTypedArrays, uint8arrayToStringMethod } from "../Utility";

/**
 * Search Box
 */
export class MediaWatching extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

           
           
            :host{
                padding: 10px;
            }

            #container {
                display: flex;
                flex-direction: column;
                background-color: var(--surface-color);
                color: var(--palette-text-primary);
                user-select: none;
                position: absolute;
                top: 0px;
                left: 0px;
                bottom: 0px;
                right: 0px;

            }

            #video_div{
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
            }

            #title_div{
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
            }

            h1{
                margin: 0px; 
                margin-left: 10px;
            }

            h2{
                margin-bottom: 4px; 
                margin-left: 10px;
                border-bottom: 1px solid var(--palette-divider);
                width: 80%;
            }

            #movie-title, #video-title {
                font-size: 1.4rem;
            }

            paper-card h1 {
                font-size: 1.65rem;
            }

            .media-cards {
                display: flex; 
                flex-wrap: wrap;
                justify-content: space-around;
                padding: 10px;
            }

            @media (max-width: 650px) {
                .media-cards {
                    justify-content: center;
                }
            }


            
        </style>

        <div id="container">
        
            <div style="display: flex; justify-content: center;">
                <h1 style="flex-grow: 1;">Continue Watching...</h1>
                <paper-icon-button id="close-btn" icon="icons:close"></paper-icon-button>
            </div>

            <div style="display: flex; flex-direction: column; flex-grow: 1; overflow-y: auto; padding: 10px;">
                <div id="video_div" style="display: none; flex-direction: column;">
                    <h2 id="video-title">Video(s)</h2>
                    <div class="media-cards">
                        <slot  name="video"></slot>
                    </div>
                </div>
                
                <div id="title_div" style="display: none; flex-direction: column;">
                    <h2 id="movie-title">Title(s)</h2>
                    <div class="media-cards">
                        <slot name="title"></slot>
                    </div>
                </div>
            </div>
        </div>
        `

        this.onclose = null

        // simply close the watching content...
        this.shadowRoot.querySelector("#close-btn").onclick = () => {
            this.parentNode.removeChild(this)
            if (this.onclose != null) {
                this.onclose()
            }
        }
    }

    appendTitle(title, callback, errorCallback) {

        if(localStorage.getItem("user_token") == null){
            return
        }

        if (this.querySelector("#_" + title._id)) {

            if (title.isVideo) {
                this.shadowRoot.querySelector("#video_div").style.display = "flex"
                this.shadowRoot.querySelector("#video-title").innerHTML = `Video(${this.querySelectorAll(`[slot="video"]`).length})`
            } else {
                this.shadowRoot.querySelector("#title_div").style.display = "flex"
                this.shadowRoot.querySelector("#movie-title").innerHTML = `Title(${this.querySelectorAll(`[slot="title"]`).length})`
            }

            return
        }

        let card = new MediaWatchingCard
        card.id = title._id

        card.setTitle(title, () => {
            this.appendChild(card)

            if (title.isVideo) {
                card.slot = "video"
            } else {
                card.slot = "title"
            }


            if (title.isVideo) {
                this.shadowRoot.querySelector("#video_div").style.display = "flex"
                this.shadowRoot.querySelector("#video-title").innerHTML = `Video(${this.querySelectorAll(`[slot="video"]`).length})`
            } else {
                this.shadowRoot.querySelector("#title_div").style.display = "flex"
                this.shadowRoot.querySelector("#movie-title").innerHTML = `Title(${this.querySelectorAll(`[slot="title"]`).length})`
            }

            Backend.eventHub.subscribe("remove_video_player_evt_", uuid => { }, evt => {
                if (title._id == evt._id) {
                    if (!card) {
                        return
                    }
                    if (!card.parentNode) {
                        return
                    }

                    card.parentNode.removeChild(card)
                    let video_count = this.querySelectorAll(`[slot="video"]`).length
                    if (video_count > 0) {
                        this.shadowRoot.querySelector("#video_div").style.display = "flex"
                        this.shadowRoot.querySelector("#video-title").innerHTML = `Video(${video_count})`
                    } else {
                        this.shadowRoot.querySelector("#video_div").style.display = "none"
                    }

                    let movie_count = this.querySelectorAll(`[slot="title"]`).length
                    if (movie_count > 0) {
                        this.shadowRoot.querySelector("#title_div").style.display = "flex"
                        this.shadowRoot.querySelector("#movie-title").innerHTML = `Title(${movie_count})`
                    } else {
                        this.shadowRoot.querySelector("#title_div").style.display = "none"
                    }

                }
            }, true)

            if (callback) {
                callback()
            }

        }, errorCallback)
    }
}

customElements.define('globular-media-watching', MediaWatching)


export class MediaWatchingCard extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container {
                display: flex;
                flex-direction: column;
                padding-top: 16px;
            }

            #container span {
                flex-grow: 1;
                text-align: right;
                user-select: none;
            }

            #title-date {
                font-size: 1rem;
                user-select: none;
            }
        </style>

        <div id="container">
            <div style="display: flex; margin-left: 5px; margin-right: 20px; align-items: end;">
                <paper-icon-button icon="icons:close"></paper-icon-button>
                <span id="title-date"></span>
            </div>
            <slot></slot>
        </div>
        `


    }

    // Append title.
    setTitle(title, callback, errorCallback) {

        let lastView = new Date(title.date)
        this.shadowRoot.querySelector("#title-date").innerHTML = lastView.toLocaleDateString() + " " + lastView.toLocaleTimeString()

        let closeButton = this.shadowRoot.querySelector("paper-icon-button")
        closeButton.onclick = () => {
            Backend.eventHub.publish("remove_video_player_evt_", title, true)
        }

        Backend.eventHub.subscribe("remove_media_watching_card_" + title.domain + "_evt_", uuid => { },
            evt => {
                if (this.parentNode)
                    this.parentNode.removeChild(this)
            }, true)

        if (title.domain) {
            if (title.isVideo) {
                TitleController.getVideoInfo(title._id, (video) => {

                    let videoCard = new SearchVideoCard();
                    videoCard.id = "_" + title._id
                    videoCard.setVideo(video)
                    this.appendChild(videoCard)
                    if (callback) {
                        callback()
                    }


                }, (err) => { }, Backend.getGlobule(title.domain))
            } else {

                TitleController.getTitleInfo(title._id, (title) => {
                    let titleCard = new SearchTitleCard();
                    titleCard.id = "_" + title._id
                    titleCard.setTitle(title)
                    this.appendChild(titleCard)
                    if (callback) {
                        callback()
                    }

                }, errorCallback, Backend.getGlobule(title.domain))
            }
        }
    }
}

customElements.define('globular-media-watching-card', MediaWatchingCard)


export class WatchingMenu extends HTMLElement {

    // Create the application view.
    constructor() {

        super()

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            :host{
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;


            }

            iron-icon{
                color: var(--palette-primary);
                cursor: pointer;
            }

            #title{
                font-size: 1.2rem;
            }

        </style>

       
        <iron-icon title="Watching" icon="maps:local-movies"></iron-icon>
       
        `

        this.mediaWatching = document.querySelector("globular-media-watching");
        this.onclose = null;

        this.onclick = () => {
            const mediaWatchingEvt = new CustomEvent("open-media-watching", {
                bubbles: true,
                composed: true,
                detail: {
                    mediaWatching: this.mediaWatching
                }
            });     


            this.dispatchEvent(mediaWatchingEvt)

        }

        if(this.mediaWatching  == null){
            this.init()
        }
    }

    init() {


        if (this.mediaWatching == null) {
            // Here I will connect the update peer event to react of peer connections.
            Backend.eventHub.subscribe("start_peer_evt_", uuid => { }, evt => {
                this.getWatchingTitles(titles => {

                    let appendTitle = () => {
                        if (titles.length == 0) {
                            return
                        }
                        let t = titles.pop()

                        this.mediaWatching.appendTitle(t, () => {
                            localStorage.setItem(t._id, t.currentTime)
                            if (titles.length > 0) {
                                appendTitle()
                            } else {
                                this.mediaWatching.style.display = ""
                            }
                        },
                            err => {
                                if (titles.length > 0) {
                                    appendTitle()
                                }
                            })

                    }
                    appendTitle()
                })
            }, true)

            // stop peer event received.
            Backend.eventHub.subscribe("stop_peer_evt_", uuid => { },
                peer => {
                    Backend.eventHub.publish("remove_media_watching_card_" + peer.getDomain() + "." + peer.getDomain() + "_evt_", {}, true)
                }, true)

            // Initialyse the watching content...
            this.mediaWatching = new MediaWatching()
            this.mediaWatching.onclose = this.onclose

            // Append the media context in the workspace.
            // console here i will get the list of title and movies...
            Backend.eventHub.subscribe("play_video_player_evt_", uuid => { }, evt => {
                this.saveWatchingTitle(evt, () => { })
            }, true)

            Backend.eventHub.subscribe("stop_video_player_evt_", uuid => { }, evt => {
                this.saveWatchingTitle(evt, () => { })

                this.mediaWatching.appendTitle(evt, () => { console.log("title ", evt._id, " was add to watching...") }, err => { console.log("fail to add title with error: ", err) })
            }, true)

            Backend.eventHub.subscribe("remove_video_player_evt_", uuid => { }, evt => {
                this.removeWacthingTitle(evt)
            }, true)

            // Here I will get the list of titles.
            this.getWatchingTitles(titles => {

                let appendTitle = () => {
                    if (titles.length == 0) {
                        return
                    }
                    let t = titles.pop()

                    this.mediaWatching.appendTitle(t, () => {
                        localStorage.setItem(t._id, t.currentTime)
                        if (titles.length > 0) {
                            appendTitle()
                        } else {
                            this.mediaWatching.style.display = ""
                        }
                    },
                        err => {
                            if (titles.length > 0) {
                                appendTitle()
                            }
                        })

                }
                appendTitle()
            })

        }
    }

    /**
   * Return the list of all watching titles
   * @param callback 
   */
    getWatchingTitles(callback) {
        if(localStorage.getItem("user_token") == null){
            callback([])
            return
        }

        let token = localStorage.getItem("user_token")
        const rqst = new FindRqst();
        let decoded = jwt(token);
        let userName = decoded.username;
        let userDomain = decoded.user_domain;
        const collection = "watching";
        let id = userName.split("@").join("_").split(".").join("_");
        let db = id + "_db";

        rqst.setId(id);
        rqst.setDatabase(db);
        rqst.setCollection(collection)

        rqst.setQuery("{}"); // means all values.

        let globule = Backend.getGlobule(userDomain)
        const stream = globule.persistenceService.find(rqst, {
            domain: userDomain, token: token
        });

        let data = [];

        stream.on("data", rsp => {
            data = mergeTypedArrays(data, rsp.getData())
        });

        stream.on("status", (status) => {
            if (status.code === 0) {
                uint8arrayToStringMethod(data, str => { let titles = JSON.parse(str); callback(titles) })
            } else {
                console.log("error", status.details)
                callback([])
            }
        });


        
    }

    /**
     * Find one title...
     * @param callback The callback
     */
    getWacthingTitle(titleId, callback) {
        TitleController.getWacthingTitle(titleId, callback, (err) => { displayError(err, 3000) })
    }

    /**
   * Find one title...
   * @param callback The callback
   */
    removeWacthingTitle(title) {

        if(localStorage.getItem("user_token") == null){
            return
        }

        generatePeerToken(Backend.globular, (token) => {

            let decoded = jwt(token);
            let userName = decoded.username;
            let userDomain = decoded.user_domain;
            const collection = "watching";
            localStorage.removeItem(title._id)

            // save the user_data
            let rqst = new DeleteOneRqst();
            let id = userName.split("@").join("_").split(".").join("_");
            let db = id + "_db";

            // set the connection infos,
            rqst.setQuery(`{"_id":"${title._id}"}`)
            rqst.setId(id);
            rqst.setDatabase(db);
            rqst.setCollection(collection)

            // So here I will set the address from the address found in the token and not 
            // the address of the client itself.
            let globule = Backend.getGlobule(userDomain)

            // call persist data
            globule.persistenceService
                .deleteOne(rqst, {
                    token: token,
                    application: Backend.application,
                    domain: Backend.domain
                })
                .then(rsp => {
                    // Here I will return the value with it
                    console.log(rsp)

                })
                .catch(err => {
                    if(!err.message.includes("not found")){
                        displayError(err, 3000)
                    }
                });

        }, (err) => { displayError(err, 3000) })
    }

    saveWatchingTitle(title, callback) {
        if(localStorage.getItem("user_token") == null){
            callback()
            return
        }

        if (!title.domain) {
            displayError(`title ${title._id} has no domain.`, 3000)
            return
        }

        generatePeerToken(Backend.globular, (token) => {
            let decoded = jwt(token);
            let userName = decoded.username;
            let userDomain = decoded.user_domain;
            const collection = "watching";
            localStorage.setItem(title._id, title.currentTime)

            // save the user_data
            let rqst = new ReplaceOneRqst();
            let id = userName.split("@").join("_").split(".").join("_");
            let db = id + "_db";

            // set the connection infos,
            rqst.setId(id);
            rqst.setDatabase(db);

            // save only user data and not the how user info...
            rqst.setCollection(collection);
            rqst.setQuery(`{"_id":"${title._id}"}`);
            rqst.setValue(JSON.stringify(title));
            rqst.setOptions(`[{"upsert": true}]`);

            // So here I will set the address from the address found in the token and not 
            // the address of the client itself.

            let globule = Backend.getGlobule(userDomain)

            // call persist data
            globule.persistenceService
                .replaceOne(rqst, {
                    token: token,
                    application: Backend.application,
                    domain: Backend.domain
                })
                .then((rsp) => {
                    // Here I will return the value with it
                    callback()
                })
                .catch(err => {
                    console.log(err)
                });
        }, (err) => {   console.log(err) })



    }
}

customElements.define('globular-watching-menu', WatchingMenu)