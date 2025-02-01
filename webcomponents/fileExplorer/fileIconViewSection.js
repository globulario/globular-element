import { StartProcessAudioRequest, StartProcessVideoRequest, UploadVideoRequest } from "globular-web-client/media/media_pb";
import { displayMessage, displayError, generatePeerToken, getUrl } from "../../backend/backend";
import { ReadFileRequest } from "globular-web-client/file/file_pb";
import { FileIconView } from "./fileIconView";
import { mergeTypedArrays, uint8arrayToStringMethod } from "../../Utility"
import '@polymer/iron-icon/iron-icon.js';
import { playVideos } from "../video";
import { playAudios } from "../audio";
import { copyToClipboard } from "../../backend/file";

export class FileIconViewSection extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        let fileType = this.getAttribute("filetype")

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            /** The file section */
            .file-type-section {
                display: flex;
                flex-direction: column;
            }

            .file-type-section .title{
                display: flex;
                align-items: center;
                font-size: 1.2rem;
                font-weight: 400;
                text-transform: uppercase;
                color: var(--palette-text-secondary);
                border-bottom: 2px solid;
                border-color: var(--palette-divider);
                width: 66.66%;
                user-select: none;
            }
            
            .file-type-section .title iron-icon{
                height: 32px;
                width: 32px;
                user-select: none;
            }
            
            .file-type-section .title iron-icon:hover{
                cursor: pointer;
            }

            .file-type-section .content {
                display: flex;
                margin-bottom: 16px;
                margin-top: 16px;
                flex-wrap: wrap;
            }

            .file-type-section .title span {
                font-weight: 400;
                font-size: 1rem;
            }

            #audio_playlist_div, #video_playlist_div {
                display: flex;
            }

            #video_playlist_div iron-icon {
                height: 24px;
                width: 24px;
                margin-left: 16px;
            }

            #audio_playlist_div iron-icon {
                height: 24px;
                width: 24px;
                margin-left: 16px;
            }

        </style>
        <div class="file-type-section">
            <div class="title"><paper-checkbox id="select-all-checkbox"> </paper-checkbox> ${fileType} <span id="section_count" style="flex-grow: 1; padding-left: 5px;"></span> <div id="${fileType}_playlist_div"></div></div>
            <div class="content" id="${fileType}_section">
                <slot></slot>
            </div>
        </div>
        `

        this.countDiv = this.shadowRoot.querySelector(`#${fileType}_section_count`)

        let selectAllCheckbox = this.shadowRoot.querySelector("#select-all-checkbox")
        selectAllCheckbox.onchange = () => {
            let iconViews = this.querySelectorAll("globular-file-icon-view")
            if (selectAllCheckbox.checked) {
                iconViews.forEach(v => {
                    v.select()
                })
            } else {
                iconViews.forEach(v => {
                    v.unselect()
                })
            }
        }
    }

    // Set files...
    init(dir, fileType, view) {

        // set reference
        this.div = view.div
        this._file_explorer_ = view._file_explorer_
        this.menu = view.menu

        let copyUrl = (path) => {
            let globule = this._file_explorer_.globule

            generatePeerToken(globule, token => {
                let url = getUrl(globule)

                path.split("/").forEach(item => {
                    let component = encodeURIComponent(item.trim())
                    if (component.length > 0) {
                        url += "/" + component
                    }

                })

                if (this.menu.file.mime == "video/hls-stream") {
                    url += "/playlist.m3u8"
                }

                url += "?token=" + token;
                url += "&application=" + globule.application

                copyToClipboard(url)

                displayMessage("url was copy to clipboard...", 3000)
            })
        }

        if (fileType == "audio" || fileType == "video") {
            let playlistDiv = this.shadowRoot.querySelector(`#${fileType}_playlist_div`)

            if (fileType == "audio") {
                playlistDiv.innerHTML = `
                    <iron-icon id="refresh-audios-btn" icon="icons:refresh" title="refresh audios infos and playlist"></iron-icon>
                    <iron-icon id="download-audios-btn" icon="av:playlist-add-check" title="download new audio from the channel" style="display:none;"></iron-icon>
                    <iron-icon id="play-audios-btn" icon="av:queue-music" title="play audio files"></iron-icon>
                    <iron-icon id="copy-audios-playlist-lnk" icon="icons:link" title="copy playlist url"></iron-icon>
                `
                // Get reference to button...
                let refreshAudiosBtn = playlistDiv.querySelector("#refresh-audios-btn")
                let playAudiosBtn = playlistDiv.querySelector("#play-audios-btn")
                let copyAudiosBtn = playlistDiv.querySelector("#copy-audios-playlist-lnk")
                let downloadAudiosBtn = playlistDiv.querySelector("#download-audios-btn")
                let globule = this._file_explorer_.globule
                let playlist = null

                generatePeerToken(globule, token => {
                    let rqst = new ReadFileRequest
                    rqst.setPath(dir.getPath() + "/.hidden/playlist.json")
                    let stream = globule.fileService.readFile(rqst, {
                        token: token,
                        domain: globule.domain,
                        address: globule.config.address
                    })

                    let data = [];
                    stream.on("data", (rsp) => {
                        data = mergeTypedArrays(data, rsp.getData());
                    });

                    stream.on("status", (status) => {
                        if (status.code == 0) {
                            uint8arrayToStringMethod(data, (str) => {
                                playlist = JSON.parse(str)
                                if (downloadAudiosBtn)
                                    downloadAudiosBtn.style.display = "block"
                            });
                        }
                    });
                })

                // Update videos from a channel.
                downloadAudiosBtn.onclick = () => {

                    if (!playlist) {
                        downloadAudiosBtn.style.display = "none"
                        return
                    }

                    generatePeerToken(globule, token => {
                        let rqst = new UploadVideoRequest
                        rqst.setDest(playlist.path)
                        rqst.setFormat(playlist.format)
                        rqst.setUrl(playlist.url)

                        let stream = this._file_explorer_.globule.mediaService.uploadVideo(rqst, { domain: this._file_explorer_.globule.domain, token: token })
                        let pid = -1;

                        // Here I will create a local event to be catch by the file uploader...
                        stream.on("data", (rsp) => {
                            if (rsp.getPid() != null) {
                                pid = rsp.getPid()
                            }

                            // Publish local event.
                            Backend.eventHub.publish("__upload_link_event__", { pid: pid, path: playlist.path, infos: rsp.getResult(), done: false, lnk: playlist.url, globule: this._file_explorer_.globule }, true);
                        })

                        stream.on("status", (status) => {
                            if (status.code === 0) {
                                Backend.eventHub.publish("__upload_link_event__", { pid: pid, path: playlist.path, infos: "", done: true, lnk: playlist.url, globule: this._file_explorer_.globule }, true);
                            } else {
                                displayError(status.details, 3000)
                            }
                        });
                    })
                }


                refreshAudiosBtn.onclick = () => {
                    let rqst = new StartProcessAudioRequest
                    rqst.setPath(dir.getPath())
                    let globule = this._file_explorer_.globule

                    generatePeerToken(globule, token => {
                        globule.mediaService.startProcessAudio(rqst, {
                            token: token,
                            domain: globule.domain,
                            address: globule.config.address
                        }).then(() => {
                            displayMessage("playlist and audios informations are now updated", 3000)
                        })
                            .catch(err => displayError(err, 3000))
                    })

                }

                copyAudiosBtn.onclick = () => {
                    copyUrl(dir.__audioPlaylist__.getPath())
                }

                playAudiosBtn.onclick = () => {
                    let audios = []
                    dir.getFilesList().forEach(f => {
                        if (f.getMime().startsWith("audio")) {
                            if (f.audios) {
                                audios = audios.concat(f.audios)
                            }
                        }
                    })
                    if (audios.length > 0) {
                        playAudios(audios, dir.name)
                    } else {
                        displayMessage("no audio informations found to generate a playlist")
                    }

                }

            } else if (fileType == "video") {
                playlistDiv.innerHTML = `
                    <globular-watching-menu style="padding: 0px; height: 24px; width: 24px;"></globular-watching-menu>
                    <iron-icon id="refresh-videos-btn" icon="icons:refresh" title="refresh video infos and playlist"></iron-icon>
                    <iron-icon id="download-videos-btn" icon="av:playlist-add-check" title="download new video from the channel" style="display:none;"></iron-icon>
                    <iron-icon id="play-videos-btn" icon="av:playlist-play" title="play video files"></iron-icon>
                    <iron-icon id="copy-videos-playlist-lnk" icon="icons:link" title="copy playlist url"></iron-icon>
                `

                // Get reference to button...
                let downloadVideosBtn = playlistDiv.querySelector("#download-videos-btn")
                let refreshVideosBtn = playlistDiv.querySelector("#refresh-videos-btn")
                let playVideosBtn = playlistDiv.querySelector("#play-videos-btn")
                let copyVideosBtn = playlistDiv.querySelector("#copy-videos-playlist-lnk")
                let watchingMenu = playlistDiv.querySelector("globular-watching-menu")

                let globule = this._file_explorer_.globule
                let playlist = null

                watchingMenu.addEventListener("open-media-watching", (evt) => {
                    this.parentNode._file_explorer_.openMediaWatching(evt.detail.mediaWatching)
                })

                generatePeerToken(globule, token => {
                    let rqst = new ReadFileRequest
                    rqst.setPath(dir.getPath() + "/.hidden/playlist.json")
                    let stream = globule.fileService.readFile(rqst, {
                        token: token,
                        domain: globule.domain,
                        address: globule.config.address
                    })

                    let data = [];
                    stream.on("data", (rsp) => {
                        data = mergeTypedArrays(data, rsp.getData());
                    });

                    stream.on("status", (status) => {
                        if (status.code == 0) {
                            uint8arrayToStringMethod(data, (str) => {
                                playlist = JSON.parse(str)
                                downloadVideosBtn.style.display = "block"
                            });
                        }
                    });
                })

                // Update videos from a channel.
                downloadVideosBtn.onclick = () => {

                    if (!playlist) {
                        downloadVideosBtn.style.display = "none"
                        return
                    }
                    generatePeerToken(globule, token => {
                        let rqst = new UploadVideoRequest
                        rqst.setDest(playlist.path)
                        rqst.setFormat(playlist.format)
                        rqst.setUrl(playlist.url)

                        let stream = this._file_explorer_.globule.mediaService.uploadVideo(rqst, { domain: this._file_explorer_.globule.domain, token: token })
                        let pid = -1;

                        // Here I will create a local event to be catch by the file uploader...
                        stream.on("data", (rsp) => {
                            if (rsp.getPid() != null) {
                                pid = rsp.getPid()
                            }

                            // Publish local event.
                            Backend.eventHub.publish("__upload_link_event__", { pid: pid, path: playlist.path, infos: rsp.getResult(), done: false, lnk: playlist.url, globule: this._file_explorer_.globule }, true);
                        })

                        stream.on("status", (status) => {
                            if (status.code === 0) {
                                Backend.eventHub.publish("__upload_link_event__", { pid: pid, path: playlist.path, infos: "", done: true, lnk: playlist.url, globule: this._file_explorer_.globule }, true);
                            } else {
                                displayError(status.details, 3000)
                            }
                        });
                    })
                }

                refreshVideosBtn.onclick = () => {
                    let rqst = new StartProcessVideoRequest
                    rqst.setPath(dir.getPath())
                    let globule = this._file_explorer_.globule

                    generatePeerToken(globule, token => {
                        globule.mediaService.startProcessVideo(rqst, {
                            token: token,
                            domain: globule.domain,
                            address: globule.config.address
                        }).then(() => {
                            displayMessage("Playlist is updated. Informations will be update...", 3000)


                        })
                            .catch(err => displayError(err, 3000))
                    })


                }

                copyVideosBtn.onclick = () => {
                    if (dir.__videoPlaylist__)
                        copyUrl(dir.__videoPlaylist__.getPath())
                    else
                        displayMessage("no playlist found at path ", dir.getPath())
                }

                playVideosBtn.onclick = () => {
                    let videos = []
                    dir.getFilesList().forEach(f => {

                        if (f.getMime().startsWith("video")) {
                            if (f.videos) {
                                videos = videos.concat(f.videos)
                            }
                        }
                    })

                    if (videos.length > 0) {
                        playVideos(videos, dir.name)
                    } else {
                        displayMessage("no video informations found to generate a playlist", 3000)
                    }
                }

            }
        }
    }

    updateCount() {
        this.shadowRoot.querySelector(`#section_count`).innerHTML = ` (${this.children.length})`
    }

}

customElements.define('globular-file-icon-view-section', FileIconViewSection)
