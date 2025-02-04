import { DeleteVideoRequest, GetTitleFilesRequest } from "globular-web-client/title/title_pb";
import getUuidByString from "uuid-by-string";
import { displayMessage, getUrl } from "../../backend/backend";
import { playVideo } from "../video";

export class SearchVideoCard extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()

        this.video = null;
        this.editable = false;

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
            .video-card{
                width: 200px;
                container-type: inline-size;
                container-name: videocard;

                background-color: var(--surface-color);
                color: var(--palette-text-primary);
                position: relative;
                height: calc( 100% - 2px);
                border-radius: 3.5px;
                border: 1px solid var(--palette-divider);
                overflow: hidden;
                display: flex;
                justify-content: center;
                flex-direction: column;
                user-select: none;
            }

            .video-card:hover{
                box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
            }

            .video-card video{
                max-height: 180px;
                border-top-left-radius: 3.5px;
                border-top-right-radius: 3.5px;
            }

            .video-card video:hover{
                cursor: pointer;
            }

            .video-card img{
                max-height: 180px;
            }

            .video-card p{
                font-size: 1.1rem;
                margin: 5px;
                margin-left: 10px;
                overflow: hidden;
                max-width: 75ch;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .rating-star{
                --iron-icon-fill-color: rgb(245 197 24);
                padding: 10px;
                height: 20px;
                width: 20px;
            }
            
            .title-rating-div{
                display: flex;
                flex-grow: 1;
                align-items: center;
                color: var(--palette-text-secondery);
                font-size: 1rem;
            }

            #preview-video{
                max-height: 180px;
            }
            
            #close-btn{
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

            
            @container videocard (max-width: 300px) {
                .title-rating-div{
                    font-size: 1rem;
                }

                .video-card p{
                    font-size: 1.1rem;
                }
            }

            @container videocard (max-width: 225px) {
                .title-rating-div{
                    font-size: .85rem;
                }

                
                .video-card p{
                    font-size: .95rem;
                }

                .video-card img, video {
                    max-height: 110px;
                }

                #preview-video {
                    max-height: 110px;
                }

                #close-btn{
                    padding: 2px;
                    width: 25px;
                    height: 25px;
                    --iron-icon-width: 20px;
                    --iron-icon-height: 20px;
                    padding: 3px
                }
            }

            @container videocard (max-width: 150px) {
                .title-rating-div{
                    font-size: .75rem;
                }

                .video-card p{
                    font-size: .85rem;
                }

                .video-card img, video {
                    max-height: 60px;
                }
                
                #preview-video {
                    max-height: 60px;
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
        <div class="video-card">
            <paper-icon-button icon="icons:close" style="display: none;" id="close-btn"></paper-icon-button>
            <img id="thumbnail-image"></img>
            <video autoplay muted loop id="preview-video" style="display: none;"></video>
            <p id="description"></p>
            <div style="display: flex;">
                <div class="title-rating-div">
                    <iron-icon class="rating-star" icon="icons:star"></iron-icon>
                    <div style="display: flex; flex-direction: column;">
                        <div><span id="rating-span"></span>/10</div>
                    </div>
                </div>
                <paper-icon-button id="video-info-button" icon="icons:arrow-drop-down-circle"></paper-icon-button>
            </div>
        </div>
        `

        this.videoPreview = this.shadowRoot.querySelector("#preview-video")
        this.closeBtn = this.shadowRoot.querySelector("#close-btn")

        this.closeBtn.onclick = (evt) => {
            evt.stopPropagation()

            // Here I will ask the user for confirmation before actually delete the contact informations.
            let toast = displayMessage(
                `<style>
                    
                    #yes-no-video-delete-box{
                    display: flex;
                    flex-direction: column;
                    }
    
                    #yes-no-video-delete-box globular-picture-card{
                    padding-bottom: 10px;
                    }
    
                    #yes-no-video-delete-box div{
                    display: flex;
                    padding-bottom: 10px;
                    }
    
                </style>
                <div id="yes-no-video-delete-box">
                    <div>Your about to remove video</div>
                        <img style="max-height: 256px; object-fit: contain; width: 100%;" src="${this.video.getPoster().getContenturl()}"></img>
                        <p style="font-size: .85rem;">${this.video.getDescription()}</p>
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

               toast.hideToast();
                displayMessage(
                    `<div style="display: flex; flex-direction: column;">
                        <span style="font-size: .85rem;">${this.video.getDescription()}</span>
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


    showVideoInfo(video) {
        //let uuid = randomUUID()
        let html = `
        <style>
           
            paper-card{
                z-index: 1001;
                color: var(--palette-text-primary);
                background: var(--palette-background-default);
                border-top: 1px solid var(--surface-color);
                border-left: 1px solid var(--surface-color);
            }
        </style>

        <paper-card>
            <globular-informations-manager id="video-info-box"></globular-informations-manager>
        </paper-card>
        `
        let videoInfoBox = document.getElementById("video-info-box")
        if (videoInfoBox == undefined) {
            let range = document.createRange()
            document.body.appendChild(range.createContextualFragment(html))
            videoInfoBox = document.getElementById("video-info-box")
            videoInfoBox.parentNode.style.position = "fixed"
            videoInfoBox.parentNode.style.top = "75px"
            videoInfoBox.parentNode.style.left = "50%"
            videoInfoBox.parentNode.style.transform = "translate(-50%)"
        }
        videoInfoBox.setVideosInformation([video])
    }

    connectedCallback() {

        // test if the gif image is initialysed...
        let preview = this.shadowRoot.querySelector("#preview-video")
        // paly only the first file...
        if (preview.src.length == 0) {

            let video = this.video
            let globule = this.video.globule
            let rqst = new GetTitleFilesRequest
            rqst.setTitleid(video.getId())
            let indexPath = globule.config.DataPath + "/search/videos"
            rqst.setIndexpath(indexPath)
            
            globule.titleService.getTitleFiles(rqst, { domain: video.globule.domain })
                .then(rsp => {
                    if (rsp.getFilepathsList().length > 0) {
                        let path = rsp.getFilepathsList().pop()
                        let thumbnail = this.shadowRoot.querySelector("#thumbnail-image")
                        let thumbnailPath = path
                        if (thumbnailPath.lastIndexOf(".mp4") != -1 || thumbnailPath.lastIndexOf(".MP4") != -1) {
                            thumbnailPath = thumbnailPath.substring(0, thumbnailPath.lastIndexOf("."))
                        }
                        thumbnailPath = thumbnailPath.substring(0, thumbnailPath.lastIndexOf("/") + 1) + ".hidden" + thumbnailPath.substring(thumbnailPath.lastIndexOf("/")) + "/preview.mp4"

                        let url = getUrl(globule)


                        thumbnailPath.split("/").forEach(item => {
                            item = item.trim()
                            if (item.length > 0) {
                                url += "/" + encodeURIComponent(item)
                            }
                        })

                        preview.src = url
                        preview.onclick = () => {
                            playVideo(path, null, null, video, video.globule)
                            
                        }

                    }
                }).catch(err => {
                    // TODO append broken link image and propose the user to delete the file.
                    console.log("no video file found", err)
                    let rqst = new DeleteVideoRequest
                    rqst.setVideoid(video.getId())
                    rqst.setIndexpath(indexPath)
                    globule.titleService.deleteVideo(rqst, { domain: video.globule.domain, token: localStorage.getItem("user_token") })
                        .then(() => {
                            console.log("video ", video.getId(), " was deleted")
                        })
                })
        }
    }

    /** Display the close btn if onclose  */
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

    setVideo(video) {

        this.video = video

        this.classList.add("filterable")
        video.getGenresList().forEach(g => this.classList.add(getUuidByString(g.toLowerCase())))
        video.getTagsList().forEach(tag => this.classList.add(getUuidByString(tag.toLowerCase())))

        // now the term..
        if (video.getRating() < 3.5) {
            this.classList.add(getUuidByString("low"))
        } else if (video.getRating() < 7.0) {
            this.classList.add(getUuidByString("medium"))
        } else {
            this.classList.add(getUuidByString("high"))
        }

        // Set the default thumbnail.
        let thumbnail = this.shadowRoot.querySelector("#thumbnail-image")
        let card = this.shadowRoot.querySelector(".video-card")

        if (video.getPoster()) {
            thumbnail.src = video.getPoster().getContenturl()
        }

        // Here the image was not set properly...
        this.shadowRoot.querySelector("#video-info-button").onclick = () => {
            this.showVideoInfo(video)
        }

        card.onmouseover = () => {
            this.videoPreview.style.display = "block"
            thumbnail.style.display = "none"
            this.videoPreview.play()
        }

        card.onmouseleave = () => {
            this.videoPreview.style.display = "none"
            thumbnail.style.display = "block"
            this.videoPreview.pause()
        }

        // Here I will get the file asscociated with the video...
        this.shadowRoot.querySelector("#description").innerHTML = video.getDescription()
        this.shadowRoot.querySelector("#rating-span").innerHTML = video.getRating().toFixed(1)
    }
}

customElements.define('globular-search-video-card', SearchVideoCard)
