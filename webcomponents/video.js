import { Backend, generatePeerToken, getUrl, displayError} from '../backend/backend';
import Plyr from 'plyr';
import Hls from "hls.js";
import { GetFileTitlesRequest, GetFileVideosRequest, GetTitleFilesRequest, Poster, Video } from "globular-web-client/title/title_pb";
import { FileController } from "../backend/file";
import {fireResize } from "./utility";
import { PlayList } from "./playlist"
import { TitleController } from '../backend/title';
import { add } from 'lodash';
import { WatchingMenu } from './watching';
import "./plyr.css"


Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get: function () {

        return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
    }
})

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

// get files associated with the titles, videos or videos...
function getTitleFiles(id, indexPath, globule, callback) {
    let rqst = new GetTitleFilesRequest
    rqst.setTitleid(id)
    rqst.setIndexpath(indexPath)
    generatePeerToken(globule, token => {
        globule.titleService.getTitleFiles(rqst, { token: token })
            .then(rsp => {
                callback(rsp.getFilepathsList())
            }).catch(err => {
                callback([])
            })
    })
}

export function playVideos(videos, name) {

    let videos_ = [...new Map(videos.map(v => [v.getId(), v])).values()]

    // here I will get the audi
    let video_playList = "#EXTM3U\n"
    video_playList += "#PLAYLIST: " + name + "\n\n"

    // Generate the playlist with found video items.
    let generateVideoPlaylist = () => {
        let video = videos_.pop();
        let globule = video.globule;

        // set the video info
        let indexPath = globule.config.DataPath + "/search/videos"

        // get the title file path...
        getTitleFiles(video.getId(), indexPath, globule, files => {

            if (files.length > 0) {
                video_playList += `#EXTINF:${video.getDuration()}, ${video.getDescription()}, tvg-id="${video.getId()}"\n`

                let url = getUrl(globule)

                if (!files[0].endsWith(".mp4")) {
                    files[0] += "/playlist.m3u8"
                }
                let path = files[0].split("/")
                path.forEach(item => {
                    item = item.trim()
                    if (item.length > 0)
                        url += "/" + encodeURIComponent(item) //* fail to parse if the item is encoded...
                })

                video_playList += url + "\n\n"
            }
            if (videos_.length > 0) {
                generateVideoPlaylist()
            } else {
                playVideo(video_playList, null, null, null, globule)
            }
        })
    }

    generateVideoPlaylist()
}


/**
 * Function to play a video on the same player.
 * @param {*} path 
 * @param {*} onplay 
 * @param {*} onclose 
 */
export function playVideo(path, onplay, onclose, title, globule) {
    if (globule == null) {
        globule = Backend.getGlobule()
    }

    if (title) {
        if (title.globule) {
            globule = title.globule
        } else if (globule != null) {
            title.globule = globule
        }
    }

    let menus = document.body.querySelectorAll("globular-dropdown-menu")
    for (var i = 0; i < menus.length; i++) {
        menus[i].close()
        if (menus[i].classList.contains("file-dropdown-menu")) {
            menus[i].parentNode.removeChild(menus[i])
        }
    }

    let videoPlayer = document.querySelector("globular-video-player")

    if (videoPlayer == null) {
        videoPlayer = new VideoPlayer()
    } else {
        videoPlayer.stop()
    }

    videoPlayer.resume = false;
    videoPlayer.style.zIndex = 100

    if (onplay && !videoPlayer.onplay) {
        videoPlayer.onplay = onplay
    }

    // keep the title
    videoPlayer.titleInfo = title;
    videoPlayer.globule = globule;


    if (onclose && !videoPlayer.onclose) {
        videoPlayer.onclose = onclose
    }

    // clear the playlist...
    if (videoPlayer.playlist)
        videoPlayer.playlist.clear()

    // Remove the watching if there is one.
    let watching = document.querySelector("globular-media-watching")
    if (watching) {
        watching.parentNode.removeChild(watching)
    }


    // play a given title.
    if (path.endsWith("video.m3u") || path.startsWith("#EXTM3U")) {
        videoPlayer.loadPlaylist(path, globule)
    } else {
        // make sure the player is not show before the video is loaded.
        videoPlayer.play(path, globule)

    }

    document.body.appendChild(videoPlayer)

    return videoPlayer
}

function getSubtitlesFiles(globule, path, callback) {
    let subtitlesPath = path.substr(0, path.lastIndexOf("."))
    subtitlesPath = subtitlesPath.substring(0, subtitlesPath.lastIndexOf("/") + 1) + ".hidden" + subtitlesPath.substring(subtitlesPath.lastIndexOf("/")) + "/__subtitles__"
    FileController.readDir(subtitlesPath, callback, err => { console.log(err); }, globule)
}



/**
 * Sample empty component
 */
export class VideoPlayer extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.titleInfo = null; // movie, serie title, video
        this.playlist = new PlayList(); // The playlist...
        this.globule = null;
        this.skipPresiousBtn = null;
        this.stopBtn = null;
        this.skipNextBtn = null;
        this.loopBtn = null;
        this.shuffleBtn = null;
        this.trackInfo = null;
        this.loop = true;
        this.shuffle = false;
        this.resume = false;
        this.isMinimized = false;
        this.onMinimize = null;

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

            #container{
                /*
                border-left: 1px solid var(--palette-divider); 
                border-right: 1px solid var(--palette-divider) rgba(255, 255, 255, 0.12);
                border-top: 1px solid var(--palette-divider) rgba(255, 255, 255, 0.12);
                */
                width: 720px;
                user-select: none;
                background-color: black;
            }

            #content{
                height: 100%; /** 600px **/
                width: 100%;
                display: flex;
                background: black;
                justify-items: center;
                overflow: hidden;
                background-color: var(--surface-color);
                color: var(--primary-text-color);
                position: relative;
            }

            @media (max-width: 600px) {
                .header{
                    width: 100vw; 
                }
                
                #content{
                    overflow-y: auto;
                    width: 100vw;
                    max-width: 100vw;
                    min-width: 0px;
                    background: black;
                    flex-direction: column-reverse;
                    height: 410px;
                    overflow: hidden;
                }
            }

            .header{
                display: flex;
                align-items: center;
                color: var(--palette-text-accent);
                background-color: var(--palette-primary-accent);
                border-top: 1px solid var(--palette-action-disabled);
                border-left: 1px solid var(--palette-action-disabled);
            }

            .header span{
                flex-grow: 1;
                text-align: center;
                font-size: 1.1rem;
                font-weight: 500;
                display: inline-block;
                white-space: nowrap;
                overflow: hidden !important;
                text-overflow: ellipsis;
            }

            .header paper-icon-button {
                min-width: 40px;
            }

            .header select {
                background: var(--surface-color); 
                color: var(--palette-text-accent);
                border:0px;
                outline:0px;
            }

            .header paper-icon-button {
                min-width: 40px;
            }

            select {
                background: var(--primary-color); 
                color: var(--on-primary-text-color);
                border:0px;
                outline:0px;
            }

            video {
                display: block;
                width:100%;
                position: "absolute";
                top: 0;
                left: 0;
                bottom: 0;
                right: 0;
                background-color: black;
                
            }
            
            @media (max-width: 600px) {
                #container{
                    width: 100vw;
                }

                #content{
                    flex-direction: column-reverse;
                }

                globular-playlist {
                    min-width: 450px;
                }
            }

            @media (min-width: 600px) {
                globular-playlist {
                    min-width: 450px;
                }
            }

            paper-card {
                background: black; 
            }

        </style>
        <globular-dialog id="video-container" name="video-player" is-moveable="true" is-maximizeable="true" is-resizeable="true" show-icon="true" is-minimizeable="true">
            <span id="title-span" slot="title">no select</span>
            <img slot="icon" src="assets/icons/youtube-flat.svg"/>
            <select slot="header"  id="audio-track-selector" style="display: none"></select>
            <paper-icon-button slot="header" id="title-info-button" icon="icons:arrow-drop-down-circle"></paper-icon-button>
            <globular-watching-menu slot="header"></globular-watching-menu>
            <div id="content">
                <slot name="playlist"></slot>
                <slot name="watching"></slot>
                <slot></slot>
            </div>
        </globular-dialog>
        <slot name="tracks" style="display: none;"></slot>
        `

        this.container = this.shadowRoot.querySelector("#video-container")
        this.container.onminimize = () => {
            this.isMinimized = true
        }

        this.container.setBackGroundColor("black")

        // override the minimize function...
        this.container.getPreview = this.getPreview.bind(this);
        this.container.onclose = () => {
            this.close()
        }

        this.container.onclick = (evt) => {
            evt.stopPropagation()
            // not interfere with plyr click event... do not remove this line.
        }

        this.content = this.shadowRoot.querySelector("#content")
        this.header = this.shadowRoot.querySelector(".header")

        this.shadowRoot.querySelector("#title-info-button").onclick = (evt) => {
            evt.stopPropagation()
            if (this.titleInfo) {
                if (this.titleInfo.clearActorsList != undefined) {
                    this.showTitleInfo(this.titleInfo)
                } else {
                    this.showVideoInfo(this.titleInfo)
                }
            } else {
                displayError("no title information found")
            }

        }

        // give the focus to the input.
        this.video = document.createElement("video")
        this.video.id = "player"
        this.video.autoplay = true
        this.video.controls = true
        this.video.playsinline = true

        this.onclose = null
        this.onplay = null

        this.path = ""
        this.appendChild(this.video)
        this.container.style.height = "auto"
        this.container.name = "video_player"

        // listen to dialog-resized event to resize the video player.
        this.container.addEventListener("dialog-resized", (evt) => {
            this.resize(evt.detail.width)
        })

        // Add an event listener for the 'playing' event
        this.video.addEventListener('playing', () => {
            // Get the video dimensions
            if (this.resized == false) {
                let width = this.video.videoWidth
                if (this.playlist.count() > 1) {
                    width += 350 // min width of the playlist...
                }

                this.resize(width)
            }

        });

        // Set the video to full screen when orientation change.
        window.addEventListener("orientationchange", (event) => {
            var orientation = (screen.orientation || {}).type || screen.mozOrientation || screen.msOrientation;

            if (["landscape-primary", "landscape-secondary"].indexOf(orientation) != -1) {
                this.becomeFullscreen();
            }

            else if (orientation === undefined) {
                console.log("The orientation API isn't supported in this browser :(");
            }
        });


        // Plyr give a nice visual to the video player.
        // TODO set the preview and maybe quality bitrate if possible...
        // So here I will get the vtt file if one exist...
        this.player = new Plyr(this.video, {
            captions: {
                active: true,
                update: true,// THAT line solved my problem
            }
        });

        // toggle full screen
        this.container.addEventListener("dialog-maximized", (evt) => {
            var type = this.player.media.tagName.toLowerCase(),
                toggle = document.querySelector("[data-plyr='fullscreen']");

            if (type === "video" && toggle) {
                toggle.addEventListener("click", this.player.toggleFullscreen, false);
            }
            toggle.click()
        })

        // exit full screen
        this.player.on("exitfullscreen", (evt) => {
            this.container.restore()
        })
        let updateUrl = (url) => {
            let token = localStorage.getItem("user_token");
            let url_ = url.split("?token=")[0];
            let updatedUrl = url_ + "?token=" + token;
        
            if (url === updatedUrl) {
                return;
            }
        
            // Get the current playback time
            let currentTime = this.video.currentTime;
            this.video.src = updatedUrl
            this.video.currentTime = currentTime

            // Set the video to play if it was playing before the change
            if (this.video.playing) {
                this.video.play();
            }
        };
        
        this.player.on('seeked', () =>{
            updateUrl(this.player.source)
        });

        this.player.on('play', () =>{
            updateUrl(this.player.source)
        });

        this.watchingMenu = this.shadowRoot.querySelector("globular-watching-menu")
        this.watchingMenu.addEventListener("open-media-watching", (evt) => {
            evt.stopPropagation()
            evt.detail.mediaWatching.slot = "watching"
            evt.detail.mediaWatching.style.zIndex = "1000"
            this.appendChild(evt.detail.mediaWatching)
        })

        // https://www.tomsguide.com/how-to/how-to-set-chrome-flags
        // you must set enable-experimental-web-platform-features to true
        // chrome://flags/ 
        this.video.onloadeddata = () => {

            //ApplicationView.resume()
            // Options for the observer (which mutations to observe)
            var config = {
                attributes: true,
                subtree: true
            };

            getSubtitlesFiles(this.globule, this.path, subtitles_files => {

                let globule = this.globule
                let url = getUrl(globule)

                subtitles_files.getFilesList().forEach(f => {
                    let track = document.createElement("track")
                    //   <track kind="captions" label="English captions" src="/path/to/captions.vtt" srclang="en" default />
                    track.kind = "captions"

                    // ex. View_From_A_Blue_Moon_Trailer-576p.fr.vtt
                    let language_id = f.getName().split(".")[f.getName().split.length - 1]
                    const languageNames = new Intl.DisplayNames([language_id], {
                        type: 'language'
                    });

                    track.label = languageNames.of(language_id)// todo set the true language.

                    let filePath = f.getPath();

                    // Encode the path to make it URL-safe
                    filePath = filePath.split('/').map(encodeURIComponent).join('/');

                    let fileUrl = filePath.startsWith("/")
                        ? `${url}${filePath}`
                        : `${url}/${filePath}`;

                    track.src = fileUrl;

                    track.srclang = language_id

                    this.player.media.appendChild(track)

                })
            })

            if (this.video.audioTracks) {

                // This will set the video langual...
                if (this.video.audioTracks.length > 1) {
                    let audioTrackSelect = this.shadowRoot.querySelector("#audio-track-selector")
                    audioTrackSelect.style.display = "block"
                    for (let i = 0; i < this.video.audioTracks.length; i++) {
                        let track = this.video.audioTracks[i]
                        let option = document.createElement("option")
                        option.innerHTML = track.language
                        option.value = i
                        audioTrackSelect.appendChild(option)
                    }

                    // Set the language with the browser
                    let browser_language = navigator.language || navigator.userLanguage; // IE <= 10
                    for (let i = 0; i < this.video.audioTracks.length; i++) {
                        let track_language = this.video.audioTracks[i].language.substr(0, 2);

                        // +++ Set the enabled audio track language +++
                        if (track_language) {
                            // When the track language matches the browser language, then enable that audio track
                            if (track_language === browser_language) {
                                // When one audio track is enabled, others are automatically disabled
                                this.video.audioTracks[i].enabled = true;
                                audioTrackSelect.value = i
                                this.player.rewind(0)
                            } else {
                                this.video.audioTracks[i].enabled = false;
                            }
                        }
                    }

                    audioTrackSelect.onchange = (evt) => {
                        evt.stopPropagation()
                        if (this.player) {

                            var selectElement = evt.target;
                            var value = selectElement.value;
                            for (let i = 0; i < this.video.audioTracks.length; i++) {
                                let track = this.video.audioTracks[i]
                                if (i == value) {
                                    track.enabled = true

                                    this.player.forward(0)
                                } else {
                                    track.enabled = false
                                }
                            }
                        }
                    }
                    // Options for the observer (which mutations to observe)
                    var config = {
                        attributes: true,
                        subtree: true
                    };



                }
            }
        }

        // HLS for streamming...
        this.hls = null;

    }

    connectedCallback() {

        let plyrVideo = this.querySelector(".plyr--video")

        plyrVideo.style.backgroundColor = "black"

        if (this.skipPresiousBtn) {
            return
        }


        this.container.hideVerticalResize()


        // hide plyr function not us
        let items = this.querySelectorAll(".plyr__controls__item")
        for (var i = 0; i < items.length; i++) {
            if (items[i].getAttribute("data-plyr") == "pip") {
                items[i].style.display = "none"
            }
        }

        let controls = this.querySelector(".plyr__controls")
        controls.style.flexWrap = "wrap"
        controls.style.justifyContent = "flex-start"



        // add additional button for the playlist...
        let html = `
            <div style="flex-basis: 100%; height: 1px;"></div>
            <iron-icon style="--iron-icon-height: 32px; --iron-icon-width: 32px; fill: #424242;" class="plyr__controls__item plyr__control" title="Shuffle Playlist" id="shuffle" icon="av:shuffle"></iron-icon>
            <iron-icon style="--iron-icon-height: 32px; --iron-icon-width: 32px;" class="plyr__controls__item plyr__control" id="skip-previous" title="Previous Track" icon="av:skip-previous"></iron-icon>
            <iron-icon style="--iron-icon-height: 32px; --iron-icon-width: 32px;" class="plyr__controls__item plyr__control" id="skip-next" title="Next Track" icon="av:skip-next"></iron-icon>
            <iron-icon style="--iron-icon-height: 32px; --iron-icon-width: 32px;" class="plyr__controls__item plyr__control" id="stop" title="Stop" icon="av:stop"></iron-icon>
            <iron-icon style="--iron-icon-height: 32px; --iron-icon-width: 32px;" class="plyr__controls__item plyr__control" title="Loop Playlist" id="repeat" icon="av:repeat"></iron-icon>
            <div id="track-info"></div>
        `
        let range = document.createRange()
        controls.appendChild(range.createContextualFragment(html))

        // Now the buttons actions.
        this.skipPresiousBtn = this.querySelector("#skip-previous")
        this.stopBtn = this.querySelector("#stop")
        this.skipNextBtn = this.querySelector("#skip-next")
        this.loopBtn = this.querySelector("#repeat")
        this.shuffleBtn = this.querySelector("#shuffle")
        this.trackInfo = this.querySelector("#track-info")


        this.playlist.slot = "playlist"
        this.appendChild(this.playlist)

        this.playlist.videoPlayer = this
        /*this.playlist.style.height = "calc(100% - 42px);"*/


        if (this.playlist.count() <= 1) {
            this.hidePlaylist()
        }


        fireResize()


        // hide the playlist...
        this.playlist.addEventListener("hide", (evt) => {
            // I will get the plyr video and use it offsetWidth to set the width of the container.
            let w = plyrVideo.offsetWidth
            this.container.setWidth(w)
        })

        // show the playlist...
        this.playlist.addEventListener("show", (evt) => {
            // set back to the original size...
            let dimension = localStorage.getItem("__video_player_dimension__")
            if (dimension) {
                dimension = JSON.parse(dimension)
                this.container.setWidth(dimension.width)
                this.container.setHeight(dimension.height)
            }
        })


        this.playPauseBtn = controls.children[0]
        this.playPauseBtn.addEventListener("click", evt => {

            let state = evt.target.getAttribute("aria-label")
            if (state == "Play") {
                this.playlist.resumePlaying()
            } else if (state == "Pause") {
                this.playlist.pausePlaying()
            }

        }, true)

        plyrVideo.addEventListener("click", evt => {
            let state = this.playPauseBtn.getAttribute("aria-label")
            if (state == "Play") {
                this.playlist.resumePlaying()
            } else if (state == "Pause") {
                this.playlist.pausePlaying()
            }

        }, true)

        this.loop = false
        if (localStorage.getItem("video_loop")) {
            this.loop = localStorage.getItem("video_loop") == "true"
        }

        if (this.loop) {
            this.loopBtn.style.fill = "white"
        } else {
            this.loopBtn.style.fill = "gray"
        }

        this.shuffle = false
        if (localStorage.getItem("video_shuffle")) {
            this.shuffle = localStorage.getItem("video_shuffle") == "true"
        }

        if (this.shuffle) {
            this.shuffleBtn.style.fill = "white"
        } else {
            this.shuffleBtn.style.fill = "#424242"
        }

        // stop the audio player....
        this.stopBtn.onclick = () => {
            this.stop(false)
            if (this.playlist) {
                this.playlist.stop()
            }
            this.trackInfo.innerHTML = ""
        }

        this.skipNextBtn.onclick = () => {
            this.stop(false)
            if (this.playlist) {
                this.playlist.playNext()
            }
        }

        this.skipPresiousBtn.onclick = () => {
            this.stop(false)
            if (this.playlist) {
                this.playlist.playPrevious()
            }
        }

        // loop...
        this.loopBtn.onclick = () => {

            if (this.loop) {
                localStorage.setItem("video_loop", "false");
                this.loop = false;
            } else {
                localStorage.setItem("video_loop", "true")
                this.loop = true;
            }

            if (this.loop) {
                this.loopBtn.style.fill = "white"
            } else {
                this.loopBtn.style.fill = "#424242"
            }

        }

        this.shuffleBtn.onclick = () => {
            if (this.shuffle) {
                localStorage.setItem("video_shuffle", "false");
                this.shuffle = false;
            } else {
                localStorage.setItem("video_shuffle", "true")
                this.shuffle = true;
            }

            if (this.shuffle) {
                this.shuffleBtn.style.fill = "white"
            } else {
                this.shuffleBtn.style.fill = "#424242"
            }

            this.playlist.orderItems()
        }

        // try to load the tracks...
        this.loadTracks("playlist")

    }

    loadTracks(name) {

        // the source is not empty
        if (this.hasAttribute("src") != null) {
            // here i will read the file and play it...
            fetch(this.getAttribute("src")).then(response => {
                return response.text()  // or return response.json() if json
            }).then(data => {
                // here I will parse the url and get the protocol and address part...
                if (this.hasAttribute("src")) {
                    const url = new URL(this.getAttribute("src"));
                    const address = `${url.protocol}//${url.host}`;
                    this.loadPlaylist(data, Backend.getGlobule(address))
                }
            }).catch(err => {
                console.log(err)
            })
        } else {
            // I will retreive the globular-video-track element...
            let tracks = this.querySelectorAll("globular-video-track")

            if (tracks.length > 0) {
                let videos = []
                let video_playList = "#EXTM3U\n"
                video_playList += "#PLAYLIST: " + name + "\n\n"

                let setTrackDuration = (v, callback) => {
                    this.video.src = v.getUrl()
                    this.video.onloadedmetadata = () => {
                        v.setDuration(this.video.duration)
                        callback(v)
                    };
                }

                let getVideo = (index) => {
                    if (index >= tracks.length) {
                        this.video.onloadedmetadata = null
                        this.video.src = ""
                        this.loadPlaylist(video_playList, null)
                        return
                    }

                    let track = tracks[index]
                    track.getVideo(video => {
                        setTrackDuration(video, (v) => {
                            video_playList += `#EXTINF:${v.getDuration()}, ${v.getTitle()}, tvg-id="${v.getId()}"\n`
                            video_playList += v.getUrl() + "\n\n"
                            videos.push(v)
                            getVideo(index + 1)
                            track.remove()
                        })

                    }, error => {
                        getVideo(index + 1)
                    })
                }

                // get the video from the track...
                getVideo(0);

            }
        }
    }

    loadPlaylist(path, globule) {

        this.playlist.clear()
        this.playlist.load(path, globule, this, () => {
            // show playlist after loading it... (hide it if number of item is less than one)
            this.showPlaylist()

            setTimeout(fireResize(), 500)
        })

    }

    showPlaylist() {
        if (this.playlist.count() > 1) {
            this.playlist.style.display = "block"
            let playlistButtons = this.querySelectorAll("iron-icon")
            for (var i = 0; i < playlistButtons.length; i++) {
                playlistButtons[i].style.display = "block"
            }
        } else {
            this.hidePlaylist()
        }
    }

    hidePlaylist() {

        this.playlist.style.display = "none"
        this.shuffleBtn.style.display = "none"
        this.skipNextBtn.style.display = "none"
        this.skipPresiousBtn.style.display = "none"
        this.stopBtn.style.display = "none"
        this.loopBtn.style.display = "none"
        this.trackInfo.style.display = "none"
    }

    setTarckInfo(index, total) {
        // display the position on the list...
        console.log("set " + index + " of " + total)
    }

    showVideoInfo(video) {
        let uuid = video.getId()
        let html = `
        <paper-card id="video-info-box-dialog-${uuid}" style="background: var(--surface-color); z-index: 1001">
            <globular-informations-manager id="video-info-box"></globular-informations-manager>
        </paper-card>
        `
        let videoInfoBox = document.getElementById("video-info-box")

        if (videoInfoBox == undefined) {
            let range = document.createRange()
            document.body.appendChild(range.createContextualFragment(html))
            videoInfoBox = document.getElementById("video-info-box")
            let parent = videoInfoBox.parentNode
            if (parent) {
                parent.style.position = "fixed"
                parent.style.top = "75px"
                parent.style.left = "50%"
                parent.style.transform = "translate(-50%)"
                videoInfoBox.onclose = () => {
                    parent.parentNode.removeChild(parent)
                }
            }
        }
        videoInfoBox.setVideosInformation([video])
    }

    showTitleInfo(title) {
        let uuid = title.getId()
        let html = `
        <paper-card id="video-info-box-dialog-${uuid}" style="background-color: var(--surface-color); ; z-index: 1001">
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

    getPreview() {

        if (this.preview) {
            this.preview.style.backgroundImage = `url('${this.titleInfo.getPoster().getContenturl()}')`;
            this.preview._title.innerHTML = this.titleInfo.getDescription()
            return this.preview
        }

        let preview = document.createElement("div");
        preview.style.position = "absolute";
        preview.style.top = "0px";
        preview.style.left = "0px";
        preview.style.width = "100%";
        preview.style.height = "100%";
        preview.style.display = "flex";
        preview.style.alignItems = "center";
        preview.style.flexDirection = "column";
        preview.style.justifyContent = "flex-start";
        preview.style.userSelect = "none";

        preview.style.background = "rgba(0, 0, 0, .5)"

        // set the title...
        if (this.titleInfo != null) {
            // set the backgpound image...
            preview.style.backgroundImage = `url('${this.titleInfo.getPoster().getContenturl()}')`;

            preview.style.backgroundSize = "cover" /* This makes the image cover the entire container */
            preview.style.backgroundPosition = "center center" /* This centers the image */
            preview.style.backgroundBlendMode = "overlay"
            preview.style.backgroundRepeat = "no-repeat"
            //preview.style.backgroundPosition= "-50px 20px"

            // set the title...
            let title = document.createElement("span")
            title.style.color = "white"
            title.style.padding = "2px"
            title.style.fontSize = ".8rem"
            title.style.fontWeight = "500"
            title.style.overflow = "hidden"
            title.style.textOverflow = "ellipsis"
            title.style.position = "absolute"
            title.style.bottom = "0px"

            title.innerHTML = this.titleInfo.getDescription()
            preview._title = title

            preview.appendChild(title)

            let buttons = document.createElement("div")
            buttons.style.display = "flex"
            buttons.style.justifyContent = "center"
            buttons.style.alignItems = "center"
            buttons.style.flexDirection = "row"
            buttons.style.flexGrow = "1"

            let skipPreviousBtn = document.createElement("iron-icon")
            skipPreviousBtn.style.fill = "white"
            skipPreviousBtn.style.height = "32px"
            skipPreviousBtn.style.width = "32px"
            skipPreviousBtn.icon = "av:skip-previous"
            skipPreviousBtn.onclick = (evt) => {
                evt.stopPropagation()
                this.skipPresiousBtn.click()
                let event = new CustomEvent('refresh-preview', { bubbles: true, composed: true });
                this.container.dispatchEvent(event)
            }

            buttons.appendChild(skipPreviousBtn)

            let playBtn = document.createElement("iron-icon")
            playBtn.style.fill = "white"
            playBtn.style.height = "48px"
            playBtn.style.width = "48px"
            playBtn.icon = "av:play-circle-outline"

            buttons.appendChild(playBtn)

            let pauseBtn = document.createElement("iron-icon")
            pauseBtn.style.fill = "white"
            pauseBtn.style.height = "48px"
            pauseBtn.style.width = "48px"
            pauseBtn.style.display = "none"
            pauseBtn.icon = "av:pause-circle-outline"

            pauseBtn.onclick = (evt) => {
                evt.stopPropagation()
                this.playPauseBtn.click()
                playBtn.style.display = "block"
                pauseBtn.style.display = "none"
            }


            let state = this.playPauseBtn.getAttribute("aria-label")
            if (state == "Play") {
                playBtn.style.display = "block"
                pauseBtn.style.display = "none"
            } else if (state == "Pause") {
                pauseBtn.style.display = "block"
                playBtn.style.display = "none"
            }

            playBtn.onclick = (evt) => {
                evt.stopPropagation()
                this.playPauseBtn.click()
                pauseBtn.style.display = "block"
                playBtn.style.display = "none"
            }

            buttons.appendChild(pauseBtn)

            let skipNextBtn = document.createElement("iron-icon")
            skipNextBtn.style.fill = "white"
            skipNextBtn.style.height = "32px"
            skipNextBtn.style.width = "32px"
            skipNextBtn.icon = "av:skip-next"
            skipNextBtn.onclick = (evt) => {
                evt.stopPropagation()
                this.skipNextBtn.click()
                let event = new CustomEvent('refresh-preview', { bubbles: true, composed: true });
                this.container.dispatchEvent(event)
            }

            buttons.appendChild(skipNextBtn)

            let trackInfo = document.createElement("span")
            trackInfo.style.color = "white"
            trackInfo.style.fontSize = "1rem"
            trackInfo.style.fontWeight = "500"
            trackInfo.style.whiteSpace = "nowrap"
            trackInfo.style.overflow = "hidden"
            trackInfo.style.textOverflow = "ellipsis"
            trackInfo.style.marginBottom = "16px"
            trackInfo.innerHTML = this.trackInfo.innerHTML

            /*
            let currentTimeSpan = document.createElement("span")
            currentTimeSpan.style.color = "white"
            currentTimeSpan.style.fontSize = ".75rem"
            currentTimeSpan.style.fontWeight = "500"
            currentTimeSpan.style.whiteSpace = "nowrap"
            currentTimeSpan.style.overflow = "hidden"
            currentTimeSpan.style.textOverflow = "ellipsis"
            currentTimeSpan.innerHTML = this.currentTimeSpan.innerHTML + " / " + this.totalTimeSpan.innerHTML
            

            setInterval(() => {
                currentTimeSpan.innerHTML = this.currentTimeSpan.innerHTML + " / " + this.totalTimeSpan.innerHTML
            }, 1000)
            */

            preview.appendChild(buttons)
            preview.appendChild(trackInfo)
            //preview.appendChild(currentTimeSpan)

            this.preview = preview

        }



        return preview;
    }

    play(path, globule, titleInfo) {

        if (titleInfo) {
            if (titleInfo.globule == null) {
                titleInfo.globule = globule
            }
            this.titleInfo = titleInfo
        }

        generatePeerToken(globule, token => {

            let url = path;
            if (!url.startsWith("http")) {
                url = getUrl(globule)

                path.split("/").forEach(item => {
                    item = item.trim()
                    if (item.length > 0) {
                        url += "/" + encodeURIComponent(item)
                    }
                })
                url += "?token=" + token
                url += "&application=" + globule.application

            } else {
                var parser = document.createElement('a');
                url += "?token=" + token
                url += "&application=" + globule.application

                parser.href = url
                path = decodeURIComponent(parser.pathname)
            }


            if (this.path == path) {
                this.resume = true;
                this.video.play()
                return
            } else {
                // keep track of the current path
                this.path = path
                this.resume = false;
            }

            // validate url access.
            fetch(url, { method: "HEAD" })
                .then((response) => {
                    if (response.status == 401) {
                        displayError({ message: `unable to read the file ${path} Check your access privilege` })
                        this.close()
                        return
                    } else if (response.status == 200) {
                        if (File.hasLocal) {
                            FileController.hasLocal(path, exists => {
                                if (exists) {
                                    // local-media
                                    this.play_(path, globule, true, token)
                                } else {
                                    this.play_(path, globule, false, token)
                                }
                            })
                        } else {
                            this.play_(path, globule, false, token)
                        }
                    } else {
                        throw new Error(response.status)
                    }
                })
                .catch((error) => {
                    displayError("fail to read url " + url + "with error " + error)
                    if (this.parentNode) {
                        this.parentNode.removeChild(this)
                    }
                });

        }, err => displayError(err))


    }

    play_(path, globule, local = false, token) {

        this.resized = false

        // replace separator...
        path = path.split("\\").join("/")

        this.style.zIndex = 100

        // Set the title...
        let thumbnailPath = path.replace("/playlist.m3u8", "")
        this.shadowRoot.querySelector("#title-span").innerHTML = thumbnailPath.substring(thumbnailPath.lastIndexOf("/") + 1)
        if (!this.isMinimized) {
            this.shadowRoot.querySelector("#video-container").style.display = ""
        }

        // So Here I will try to get the title or the video info...
        if (!globule) {
            globule = Backend.globular
        }

        // Now I will test if imdb info are allready asscociated.
        let getTitleInfo = (path, callback) => {
            // The title info is already set...
            if (this.titleInfo) {
                if (this.titleInfo.getName != undefined) {
                    this.titleInfo.isVideo = false;
                    callback([this.titleInfo])
                    return
                } else {
                    this.titleInfo.isVideo = true;
                    callback([])
                    return
                }
            }

            let rqst = new GetFileTitlesRequest
            rqst.setIndexpath(globule.config.DataPath + "/search/titles")
            rqst.setFilepath(path)

            globule.titleService.getFileTitles(rqst, { domain: globule.domain, token: token })
                .then(rsp => {
                    rsp.getTitles().getTitlesList().forEach(t => t.globule = globule)
                    callback(rsp.getTitles().getTitlesList())
                })
        }


        let getVideoInfo = (path, callback) => {
            if (this.titleInfo) {
                if (this.titleInfo.getDescription != undefined) {
                    this.titleInfo.isVideo = true;
                    callback([this.titleInfo])
                    return
                } else {
                    this.titleInfo.isVideo = false;
                    callback([])
                    return
                }
            }

            let rqst = new GetFileVideosRequest
            rqst.setIndexpath(globule.config.DataPath + "/search/videos")
            rqst.setFilepath(path)

            globule.titleService.getFileVideos(rqst, { domain: globule.domain, token: token })
                .then(rsp => {
                    rsp.getVideos().getVideosList().forEach(v => v.globule = globule)
                    callback(rsp.getVideos().getVideosList())
                })
        }

        getVideoInfo(path, videos => {
            if (videos.length > 0) {
                let video = videos.pop()
                this.titleInfo = video
                this.titleInfo.isVideo = true
                this.shadowRoot.querySelector("#title-span").innerHTML = video.getDescription().replace("</br>", " ")
                // Start where the video was stop last time... TODO 
                if (this.titleInfo) {
                    if (localStorage.getItem(this.titleInfo.getId())) {
                        let currentTime = parseFloat(localStorage.getItem(this.titleInfo.getId()))
                        this.video.currentTime = currentTime
                    }

                    TitleController.getWacthingTitle(this.titleInfo.getId(), (watching) => {
                        this.video.currentTime = watching.currentTime

                    }, (err) => { /** nothing to do here  */ })


                    this.video.onended = () => {
                        this.resume = false;
                        if (this.titleInfo)
                            localStorage.removeItem(this.titleInfo.getId())

                        if (this.playlist.items.length > 1) {
                            this.playlist.playNext()
                        } else if (this.loop) {
                            if (File.hasLocal) {
                                FileController.hasLocal(this.path, exists => {
                                    if (this.titleInfo) {
                                        this.play(this.path, this.titleInfo.globule)
                                    } else {
                                        this.play(this.path)
                                    }
                                })
                            } else {
                                if (this.titleInfo)
                                    this.play(this.path, this.titleInfo.globule)
                                else
                                    this.play(this.path)
                            }
                        } else {
                            this.stop()
                        }
                    }

                    if (this.playlist.style.display == "none") {
                        Backend.publish("play_video_player_evt_", { _id: this.titleInfo.getId(), domain: this.titleInfo.globule.domain, isVideo: this.titleInfo.isVideo, currentTime: this.video.currentTime, date: new Date() }, true)
                    }
                }

            }
        })

        getTitleInfo(path, tittles => {
            if (tittles.length > 0) {
                let title = tittles.pop()
                this.titleInfo = title
                this.titleInfo.isVideo = false
                this.shadowRoot.querySelector("#title-span").innerHTML = title.getName()
                if (title.getYear()) {
                    this.shadowRoot.querySelector("#title-span").innerHTML += " (" + title.getYear() + ") "
                }
                if (title.getType() == "TVEpisode") {
                    this.shadowRoot.querySelector("#title-span").innerHTML += " S" + title.getSeason() + "E" + title.getEpisode()
                }

                if (this.onplay != null) {
                    this.onplay(this.player, title)
                }

                // Start where the video was stop last time... TODO 
                if (this.titleInfo) {
                    if (localStorage.getItem(this.titleInfo.getId())) {
                        let currentTime = parseFloat(localStorage.getItem(this.titleInfo.getId()))
                        this.video.currentTime = currentTime
                    }
                    Backend.publish("play_video_player_evt_", { _id: this.titleInfo.getId(), isVideo: this.titleInfo.isVideo, currentTime: this.video.currentTime, domain: this.titleInfo.globule.domain, duration: this.video.duration, date: new Date() }, true)
                }
            }
        })

        // Only HLS and MP4 are allow by the video player so if is not one it's the other...
        if (thumbnailPath.lastIndexOf(".mp4") != -1 || thumbnailPath.lastIndexOf(".MP4") != -1) {
            thumbnailPath = thumbnailPath.substring(0, thumbnailPath.lastIndexOf("."))
        } else if (!path.endsWith("/playlist.m3u8")) {
            path += "/playlist.m3u8"
        } else {
            if (!(path.endsWith("/playlist.m3u8") || path.endsWith(".mp4") || path.endsWith(".webm"))) {
                displayError("the file cannot be play by the video player")
                return
            }
        }

        thumbnailPath = thumbnailPath.substring(0, thumbnailPath.lastIndexOf("/") + 1) + ".hidden" + thumbnailPath.substring(thumbnailPath.lastIndexOf("/")) + "/__timeline__/thumbnails.vtt"

        // set the complete url.
        // Get image from the globule.
        let url = getUrl(globule)

        let fileUrl = thumbnailPath.split('/').map(encodeURIComponent).join('/');


        if (fileUrl.startsWith("/")) {
            fileUrl = url + fileUrl
        } else {
            fileUrl = url + "/" + fileUrl
        }

        this.player.setPreviewThumbnails({ enabled: "true", src: fileUrl })

        if (!this.video.paused && this.video.currentSrc.endsWith(path)) {
            // Do nothing...
            return
        } else if (this.video.paused && this.video.currentSrc.endsWith(path)) {
            // Resume the video...
            this.video.play()
            return
        }

        path.split("/").forEach(item => {
            item = item.trim()
            if (item.length > 0) {
                url += "/" + encodeURIComponent(item)
            }
        })

        url += "?token=" + token
        url += "&application=" + globule.application
        
        if (local) {
            url = "local-media://" + path
        }

        // Set the path and play.
        this.video.src = url

        if (path.endsWith(".m3u8")) {
            if (Hls.isSupported()) {
                this.hls = new Hls(
                    {
                        xhrSetup: xhr => {
                            xhr.setRequestHeader('token', token)
                        }
                    }
                );

                this.hls.attachMedia(this.video);

                this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                    this.hls.loadSource(url);
                    this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                        this.video.play();
                    });
                });
            }
        }



    }

    becomeFullscreen() {
        if (this.video.requestFullscreen) {
            this.video.requestFullscreen();
        } else if (this.video.mozRequestFullScreen) {
            /* Firefox */
            this.video.mozRequestFullScreen();
        } else if (this.video.webkitRequestFullscreen) {
            /* Chrome, Safari and Opera */
            this.video.webkitRequestFullscreen();
        } else if (this.video.msRequestFullscreen) {
            /* IE/Edge */
            this.video.msRequestFullscreen();
        }
    }

    /**
     * Close the player...
     */
    close() {

        // save the dimension...

        let plyr = this.querySelector(".plyr--video")
        let width = plyr.offsetWidth + 355;

        let maxHeigth = screen.height - 100
        if (this.container.getHeight() > maxHeigth) {
            this.container.setHeight(maxHeigth)
        }

        localStorage.setItem("__video_player_dimension__", JSON.stringify({ width: width, height: this.container.getHeight() }))

        this.stop()

        this.parentElement.removeChild(this)
        if (this.onclose) {
            this.onclose()
        }
    }

    /**
     * Stop the video.
     */
    stop(save = true) {
        this.video.pause();
        this.resized = false

        // keep the current video location
        if (this.titleInfo != null) {

            // Stop the video
            if (this.video.duration != this.video.currentTime && save) {
                Backend.publish("stop_video_player_evt_", { _id: this.titleInfo.getId(), domain: this.titleInfo.globule.address, isVideo: this.titleInfo.isVideo, currentTime: this.video.currentTime, date: new Date() }, true)
            } else {
                Backend.publish("remove_video_player_evt_", { _id: this.titleInfo.getId(), domain: this.titleInfo.globule.address, isVideo: this.titleInfo.isVideo, currentTime: this.video.currentTime, date: new Date() }, true)
            }
            // keep video info in the local storage...
            localStorage.setItem(this.titleInfo.getId(), this.video.currentTime)
        }
    }

    /**
     * Resize the video player.
     */
    resize(containerWidth) {
        // Exit early if the video player is minimized
        if (this.isMinimized) {
            return;
        }

        this.resized = true
        let videoWidth = this.video.videoWidth


        // Ensure the video has valid dimensions
        if (videoWidth > 0 && this.container.getWidth() < containerWidth - this.playlist.offsetWidth) {
            if (videoWidth > screen.width) {
                containerWidth = screen.width * .9
            } else if (containerWidth > videoWidth) {
                containerWidth = videoWidth
            }
        }

        if (this.playlist.count() > 1) {
            let width = containerWidth - this.playlist.offsetWidth
            if (this.video.videoWidth > 0 && width > this.video.videoWidth) {
                this.container.setWidth(this.video.videoWidth + this.playlist.offsetWidth)
                return
            }
        } else if (this.video.videoWidth > 0 && containerWidth > this.video.videoWidth) {
            this.container.setWidth(this.video.videoWidth)
            return
        }

        this.container.setWidth(containerWidth)
        this.container.setHeight("auto")


    }

}

customElements.define('globular-video-player', VideoPlayer)


/**
 * The video track description.
 */
export class VideoTrack extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = ``;
    }

    // return the video object.
    getVideo(callback, errorCallback) {

        // test if the video is set...
        if (!this.hasAttribute("src") || !this.hasAttribute("id")) {
            errorCallback("no video source")
            return
        }


        // Create a new video object.
        let video = new Video()

        video.setUrl(this.getAttribute("src"))

        // try to get the video info from the attributes...
        if (this.hasAttribute("id")) {
            video.setId(this.getAttribute("id"))
        }

        if (this.hasAttribute("title")) {
            video.setTitle(this.getAttribute("title"))
        }


        if (this.hasAttribute("description")) {
            video.setDescription(this.getAttribute("description"))
        }

        if (this.hasAttribute("genres")) {
            let genres = this.getAttribute("genres").split(",")
            video.setGenresList(genres)
        }

        if (this.hasAttribute("poster")) {
            let poster = new Poster
            poster.setUrl(this.getAttribute("poster"))
            poster.setContenturl(this.getAttribute("poster"))
            video.setPoster(poster)
        }

        // here from the video url I will try to get the video info...
        let url = new URL(video.getUrl())

        // get the globule...
        let globule = Backend.getGlobule(url.origin)

        // set the globule...
        video.globule = globule

        // get the video info...
        TitleController.getVideoInfo(video.getId(), video => {
            video.setUrl(this.getAttribute("src"))
            video.globule = globule
            callback(video)
        }, err => {
            callback(video) // return  the video initialized with attributes.
        }, globule)

    }
}

customElements.define('globular-video-track', VideoTrack);

