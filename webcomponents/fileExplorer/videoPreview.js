import { Backend } from "../../backend/backend";
import { FileController } from "../../backend/file";


export class VideoPreview extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(file, height, onresize, globule) {
        super()

        this.file = file
        this.path = file.getPath();
        this.height = height;
        this.onresize = onresize;
        this.onpreview = null;
        this.onplay = null;
        this.title = file.getPath();

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.shadowRoot.innerHTML = `
        <style>
           

            #container{
                height: ${height}px;
                position: relative;
            }

            #container:hover {
                cursor: pointer;
            }

            img {
                display: block;
                width:auto;
                height: 60px;
            }

            .preview{

            }
        </style>
       <div id = "container" draggable="false" >
            <slot style="position: relative;"></slot>
            <paper-ripple></paper-ripple>
        </div>
        `

        this.images = []

        // give the focus to the input.
        this.container = this.shadowRoot.querySelector("#container")

        let index = 0;
        if (this.file.getThumbnail().length > 0) {
            this.firstImage = document.createElement("img")
            this.firstImage.src = this.file.getThumbnail()
            this.firstImage.onload = () => {
                let ratio = this.height / this.firstImage.offsetHeight
                this.width = this.firstImage.offsetWidth * ratio;
                if (this.onresize != undefined) {
                    this.onresize()
                }
                this.container.appendChild(this.firstImage)
                this.images.push(this.firstImage)
            }
        } else {
            console.log("no thumbnail image was found for ", this.file)
        }

        // Play the video
        this.container.onclick = (evt) => {
            evt.stopPropagation()
            this.play(globule)
        }

        // the next image timeout...
        this.timeout = null;

        // Connect events
        this.container.onmouseenter = (evt) => {
            evt.stopPropagation();

            if (this.images.length == 1) {
                FileController.getHiddenFiles(file.getPath(), previewDir => {
                    let previews = []
                    if (previewDir) {
                        if (previewDir.getFilesList().length > 0) {
                            previews = previewDir.getFilesList()
                        }
                    }

                    FileController.getImage((images) => {
                        this.images = images
                        if (this.images.length > 0) {
                            this.container.appendChild(this.images[0])

                            if (this.interval == null) {
                                this.startPreview();
                            }

                            if (this.onresize != undefined) {
                                this.onresize()
                            }
                        }
                    }, this.images, previews, index, globule) // Download the first image only...

                }, globule)
            } else if (this.images.length > 1) {
                if (this.interval == null) {
                    this.startPreview();
                }
            }

        }

        this.container.onmouseout = (evt) => {
            evt.stopPropagation();
            if (this.interval != null) {
                this.stopPreview();
            }
        }

    }


    /**
     * Start display the image 
     */
    startPreview() {

        let iconViews = document.querySelectorAll("globular-file-icon-view")
        for (var i = 0; i < iconViews.length; i++) {
            iconViews[i].stopPreview()
        }

        let index = 0;
        if (this.onpreview != null) {
            this.onpreview()
        }

        this.interval = setInterval(() => {

            let img = this.images[index]
            if (img != undefined) {
                img.draggable = false;
                while (this.container.children.length > 2) {
                    this.container.removeChild(this.container.children[this.container.children.length - 1])
                }

                this.container.appendChild(img, this.container.firstChild)
            }
            // reset the conter if index reach the number of preview images.
            if (index < this.images.length) {
                index++
            } else {
                index = 0
            }
        }, 450)
    }

    connectedCallback() {

        //or however you get a handle to the IMG

    }

    /**
     * Stop the image preview...
     */
    stopPreview() {
        if (this.images.length == 0) {
            return
        }

        clearInterval(this.interval)
        this.interval = null

        while (this.container.children.length > 2) {
            this.container.removeChild(this.container.children[this.container.children.length - 1])
        }

        this.container.appendChild(this.firstImage)
    }

    /**
     * Play video
     */
    play(globule) {

        this.stopPreview()

        if (this._file_explorer_ != undefined) {
            Backend.eventHub.publish("__play_video__", { file: this.file, file_explorer_id: this._file_explorer_.id, globule: globule }, true)
        }

        if (this.onplay != undefined) {
            this.onplay(this.file)
        }
    }

}

customElements.define('globular-video-preview', VideoPreview)
