import { EmbeddedVideos } from "./embeddedVideo";
import { EmbeddedAudio } from "./embeddedAudio";
import { Backend } from "../../backend/backend";
import { FileController } from "../../backend/file";
import { TitleController } from "../../backend/title";

/**
 * Test if string is a valid json.
 * @param {*} str 
 * @returns 
 */
function isJson(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}


/**
 * That component will be use to display file(s) into a post.
 */
export class FileDropZone extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {

        super()

        // The list of paths
        this.files = []


        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
            #zone{
                position: relative;
                margin-top: 10px;
                margin-bottom: 10px;
                padding: 5px;
                min-height: 200px;
                border-radius: 5px;
                transition: background 0.2s ease,padding 0.8s linear;
            }

            .editable {
                background-color: var(--palette-background-paper);
                border: 2px dashed var(--palette-divider);
            }

            #loading{
                position: absolute; 
                display: flex;
                top: 0px;
                left: 0px;
                right: 0px;
                bottom: 0px;
                border: 1px solid var(--palette-divider);
                justify-content: center;
                align-items: center;
                border-radius: 10px;
            }

            #loading paper-spinner{

            }

        </style>

        <div  id="zone">
            <slot></slot>
        </div>
        `

        // So here I will make the zone drop-able....
        this.dropZone = this.shadowRoot.querySelector("#zone")

        this.dropZone.ondragenter = (evt) => {
            if (!this.hasAttribute("editable")) {
                return
            }

            evt.stopPropagation();
            evt.preventDefault();
            this.dropZone.style.filter = "invert(10%)"

        }

        this.dropZone.ondragover = (evt) => {
            if (!this.hasAttribute("editable")) {
                return
            }
            evt.stopPropagation();
            evt.preventDefault();
        }

        this.dropZone.ondragleave = (evt) => {
            if (!this.hasAttribute("editable")) {
                return
            }

            evt.preventDefault()
            this.dropZone.style.filter = ""
        }

        this.dropZone.ondrop = (evt) => {
            if (!this.hasAttribute("editable")) {
                return
            }

            evt.stopPropagation();
            evt.preventDefault();

            this.dropZone.style.filter = ""

            // So now I will create component to be display in the blog
            // based on the file type. Those component created to fit well
            // on a simple layout (no pop-pup).
            let paths = JSON.parse(evt.dataTransfer.getData('files'))
            let domain = evt.dataTransfer.getData('domain')

            // keep track
            paths.forEach(path => {
                this.files.push({ domain: domain, path: path })
            })

            this.setAttribute('files', btoa(JSON.stringify(this.files)));
            
            this.render()
        }

        if (this.hasAttribute("files")) {
            let jsonStr = atob(this.getAttribute("files"))
            if (isJson(jsonStr)) {
                this.files = JSON.parse(jsonStr)
            }
            this.render()
        }

    }

    setEditable(editable) {
        this.editable = editable

        if (editable) {
            this.dropZone.classList.add("editable")
            this.setAttribute("editable", "true")
        } else {
            this.dropZone.classList.remove("editable")
            this.removeAttribute("editable")
        }
    }

    // Call search event.
    setFiles(files) {
        this.files = files
        this.render()
    }

    getFiles() {
        return this.files // the list of files path
    }

    getFilesInfo(callback) {

        // the loading display
        let loading = document.createElement("div")
        loading.id = "loading"
        let spinner = document.createElement("paper-spinner")
        spinner.setAttribute("active", "")
        loading.appendChild(spinner)
        this.dropZone.appendChild(loading)

        let files = []
        let getFileInfo = (index) => {
            let path = this.files[index].path
            let g = Backend.getGlobule(this.files[index].domain)
            index++
            FileController.getFile(g, path, 80, 80,
                file => {
                    files.push(file)
                    if (index == this.files.length) {
                        if (loading.parentNode)
                            loading.parentNode.removeChild(loading)
                        callback(files)
                    } else {
                        getFileInfo(index)
                    }
                },
                err => {
                    if (index == this.files.length) {
                        if (loading.parentNode)
                            loading.parentNode.removeChild(loading)
                        callback(files)
                    } else {
                        getFileInfo(index)
                    }
                })
        }

        if (this.files.length > 0) {
            let index = 0
            getFileInfo(index)
        } else {
            if (loading.parentNode)
                loading.parentNode.removeChild(loading)
        }
    }

    // This function will display the files.
    render() {
        this.getFilesInfo(files => {
            let filesByType = {}
            files.forEach(f => {
                let fileType = f.getMime().split("/")[0]
                if (!filesByType[fileType]) {
                    filesByType[fileType] = []
                }
                filesByType[fileType].push(f)
            })

            if (filesByType["image"]) {
                this.renderImages(filesByType["image"])
            }

            if (filesByType["audio"]) {
                this.renderAudio(filesByType["audio"])
            }

            if (filesByType["video"]) {
                this.renderVideos(filesByType["video"])
            }

        })
    }

    /**
     * Render video.
     * @param {*} videos 
     */
    renderVideos(files) {

        // so here I will initalyse files and their video informations.
        let index = 0;
        let videos_ = []

        // Get the video informations...
        let initVideoInfo = (index, callback) => {
            let file = files[index]
            index++
            TitleController.getFileVideosInfo(file, videos => {
                if (videos.length > 0) {
                    let video = videos[0]
                    video.file = file
                    videos_.push(video)
                    if (index < files.length) {
                        initVideoInfo(index, callback)
                    } else {
                        callback(videos_)
                    }
                } else {
                    if (index < files.length) {
                        initVideoInfo(index, callback)
                    } else {
                        callback(videos_)
                    }
                }
            }, err => {console.log(err)})
        }

        if (files.length > 0) {
            initVideoInfo(index, videos => {
                let embeddedVideos = this.querySelector("globular-embedded-videos")
                if (!embeddedVideos) {
                    embeddedVideos = new EmbeddedVideos()
                    embeddedVideos.onremovevideo = (path) => {
                        this.files = this.files.filter(e => e.path !== path);
                        this.setAttribute('files', btoa(JSON.stringify(this.files)));
                    }
                }

                this.appendChild(embeddedVideos)
                embeddedVideos.setVideos(videos)

                if (this.parentNode) {
                    if (this.parentNode.classList.contains("ce-block__content")) {
                        this.setEditable(true)
                        embeddedVideos.setEditable(true)
                    } else {
                        this.setEditable(false)
                        embeddedVideos.setEditable(false)
                    }
                }

            })
        }
    }

    renderAudio(files) {

        // so here I will initalyse files and their video informations.
        let index = 0;
        let audios_ = []

        // Get the video informations...
        let initAudioInfo = (index, callback) => {
            let file = files[index]
            index++
            TitleController.getFileAudiosInfo(file, audios => {
                if (audios.length > 0) {
                    let audio = audios[0]
                    audio.file = file
                    audios_.push(audio)
                    if (index < files.length) {
                        initAudioInfo(index, callback)
                    } else {
                        callback(audios_)
                    }
                } else {
                    if (index < files.length) {
                        initAudioInfo(index, callback)
                    } else {
                        callback(audios_)
                    }
                }
            })
        }

        if (files.length > 0) {
            initAudioInfo(index, audios => {
                let embeddedAudios = this.querySelector("globular-embedded-audios")
                if (!embeddedAudios) {
                    embeddedAudios = new EmbeddedAudios()
                    embeddedAudios.onremoveaudio = (path) => {
                        this.files = this.files.filter(e => e.path !== path);
                    }
                    this.setAttribute('files', btoa(JSON.stringify(this.files)));
                }

                this.appendChild(embeddedAudios)
                embeddedAudios.setAudios(audios)

                if (this.parentNode) {
                    if (this.parentNode.classList.contains("ce-block__content")) {
                        this.setEditable(true)
                        embeddedAudios.setEditable(true)
                    } else {
                        this.setEditable(false)
                        embeddedAudios.setEditable(false)
                    }
                }

            })
        }
    }

    renderImages(images) {

        // Set the image Gallery...
        let imageGallery = this.querySelector("globular-image-gallery")
        if (!imageGallery) {
            imageGallery = new ImageGallery
            imageGallery.onremoveimage = (url) => {
                this.files = this.files.filter(e => e.path !== url);
            }
        }

        this.appendChild(imageGallery)

        let urls = []
        let index = 0
        let getImageUrl = (index) => {
            let img = images[index]
            index++
            generatePeerToken(img.globule, token => {
                let url = getUrl(img.globule)
                img.path.split("/").forEach(item => {
                    item = item.trim()
                    if (item.length > 0) {
                        url += "/" + encodeURIComponent(item)
                    }
                })
                url += `?token=${token}`
                urls.push(url)
                if (index < images.length) {
                    getImageUrl(index)
                } else {
                    imageGallery.setImages(urls)
                }
            }, err => {
                if (index < images.length) {
                    getImageUrl(index)
                } else {
                    imageGallery.setImages(urls)
                }
            })
        }

        getImageUrl(index)

        if (this.parentNode) {
            if (this.parentNode.classList.contains("ce-block__content")) {
                this.setEditable(true)
                imageGallery.setEditable(true)
            } else {
                this.setEditable(false)
                imageGallery.setEditable(false)
            }
        }
    }

    connectedCallback() {
        if (this.parentNode.classList.contains("ce-block__content")) {
            this.setEditable(true)
        } else {
            this.setEditable(false)
        }
    }
}

customElements.define('globular-file-drop-zone', FileDropZone)


export default class FileDropZoneTool {
    constructor({ data, api }) {
        this.data = data;
        this.api = api;
        this.api.caret.focus(false);
        this.api.caret.setToBlock('start', 0);

        // Initialize the drop zone
        this.dropZone = document.createElement('globular-file-drop-zone');
        if (data.files) {
            this.dropZone.setAttribute('files', btoa(JSON.stringify(data.files)));
            this.dropZone.setFiles(data["files"])
        }
    }

    render() {
        return this.dropZone; // Return the actual element
    }

    static get toolbox() {
        return {
            title: 'File Selector',
            icon:
                '<svg width="17" height="15" viewBox="0 0 336 276" xmlns="http://www.w3.org/2000/svg"><path d="M291 150V79c0-19-15-34-34-34H79c-19 0-34 15-34 34v42l67-44 81 72 56-29 42 30zm0 52l-43-30-56 30-81-67-66 39v23c0 19 15 34 34 34h178c17 0 31-13 34-29zM79 0h178c44 0 79 35 79 79v118c0 44-35 79-79 79H79c-44 0-79-35-79-79V79C0 35 35 0 79 0z"/></svg>',
        };
    }

    save(blockContent) {
        // Extract the files from the `globular-file-drop-zone`
        const files = blockContent.getAttribute('files');
        return {
            files: files ? JSON.parse(atob(files)) : []
        };
    }
}
