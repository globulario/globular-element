
import { Backend } from "../../backend/backend";
import { FileController } from "../../backend/file";
import { TitleController } from "../../backend/title";
import { getCoords } from "../utility";
import { VideoPreview } from "./videoPreview";

export class FileIconView extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        let h = 80
        if (this.hasAttribute("height")) {
            h = parseInt(this.getAttribute("height"))
        }

        let w = 80
        if (this.hasAttribute("width")) {
            w = parseInt(this.getAttribute("width"))
        }

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
            /** Display icon div */
            .file-icon-div{
                display: flex;
                position: relative;
                flex-direction: column;
                margin: 5px;
                padding: 5px;
                padding-top:25px;
                border-radius: 2.5px;
                border: 1px solid var(--surface-color);
                transition: background 0.2s ease,padding 0.8s linear;
                background-color: var(--surface-color);
                height: ${h}px;
                min-width: ${w}px;
                justify-content: center;
                align-items: center;
                position: relative;
                user-select: none;
            }

            .file-icon-div svg {
                height: 12px;
                fill: var(--palette-action-disabled);
                position: absolute;
                top: 8px;
                left: 32px;
                display: none;
                visibility: hidden;
            }

            .file-icon-div paper-checkbox{
                position: absolute;
                display: none;
                top: 5px; 
                left: 5px;
            }

            .file-icon-div .menu-div{
                position: absolute;
                top: 1px; 
                right: 1px;
            }

            .file-icon-div img {
                display: block;
                min-width: 50px;
                height: 100%;
            }


            .file-div {
                display:flex; 
                flex-direction: column;
                align-items: center;
                position: relative;
            }

            .file-icon-div:hover{
                cursor: pointer;
            }

            .shortcut-icon {
                position: absolute;
                bottom: -5px;
                left: 0px;
            }

            .shortcut-icon iron-icon{
                background: white;
                fill: black;
                height: 16px;
                width: 16px;
            }

            .file-div span {
                word-wrap: break-word;
                text-align: center;
                max-height: 200px;
                overflow-y: hidden;
                word-break: break-all;
                font-size: 0.85rem;
                padding: 5px;
                user-select: none;
            }

            .file-path {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                text-decoration: underline;
            }

            .file-path:hover {
                cursor: pointer;
            }

            .file-icon-div.active{
                filter: invert(10%);
            }

            globular-dropdown-menu {
                position: absolute;
                top: -1.5px;
                right: 0px;
                z-index: 100;
            }

            iron-icon {
                height: 48px;
                width: 48px;
            }

        </style>

        <div class="file-div" >
            <div class="file-icon-div">
                <paper-checkbox></paper-checkbox>
                <div class="menu-div"></div>
                <paper-ripple recenters></paper-ripple>
                <svg title="keep file local" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M32 32C32 14.3 46.3 0 64 0H320c17.7 0 32 14.3 32 32s-14.3 32-32 32H290.5l11.4 148.2c36.7 19.9 65.7 53.2 79.5 94.7l1 3c3.3 9.8 1.6 20.5-4.4 28.8s-15.7 13.3-26 13.3H32c-10.3 0-19.9-4.9-26-13.3s-7.7-19.1-4.4-28.8l1-3c13.8-41.5 42.8-74.8 79.5-94.7L93.5 64H64C46.3 64 32 49.7 32 32zM160 384h64v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V384z"/></svg>
            </div>
        </div>
        `

        this.file = null;
        this.preview = null;
    }

    select() {
        let checkbox = this.shadowRoot.querySelector("paper-checkbox")
        checkbox.checked = true
        checkbox.style.display = "block"
        Backend.eventHub.publish("__file_select_unselect_" + this.file.getPath(), checkbox.checked, true)
    }

    unselect() {
        let checkbox = this.shadowRoot.querySelector("paper-checkbox")
        checkbox.checked = false
        checkbox.style.display = "none"
        Backend.eventHub.publish("__file_select_unselect_" + this.file.getPath(), checkbox.checked, true)
    }

    stopPreview() {
        if (this.preview)
            this.preview.stopPreview()
    }

    // Call search event.
    setFile(file, view) {

        this.file = file;

        let h = 80
        if (this.hasAttribute("height")) {
            h = parseInt(this.getAttribute("height"))
        }

        let w = 80
        if (this.hasAttribute("width")) {
            w = parseInt(this.getAttribute("width"))
        }

        // set reference from view...
        this._file_explorer_ = view._file_explorer_
        this.menu = view.menu
        this.shareResource = view.shareResource
        this.div = view.div
        this.selected = view.selected
        this.rename = view.rename

        let fileIconDiv = this.shadowRoot.querySelector(`.file-icon-div`)
        this.fileIconDiv = fileIconDiv

        let fileType = file.getMime().split("/")[0]
        let range = document.createRange()

        if (file.lnk != undefined) {
            // here the file is a lnk...
            let lnkIcon = `
                <div class="shortcut-icon">
                    <iron-icon icon="icons:reply"></iron-icon>
                </div> 
                `
            fileIconDiv.appendChild(range.createContextualFragment(lnkIcon))
        }

        // Now I will append the file name span...
        let fileNameSpan = document.createElement("span")
        fileNameSpan.style.maxWidth = "100px"

        let checkbox = fileIconDiv.querySelector("paper-checkbox")

        checkbox.onclick = (evt) => {
            evt.stopPropagation();
            Backend.eventHub.publish("__file_select_unselect_" + file.getPath(), checkbox.checked, true)
        }

        Backend.eventHub.subscribe("__file_select_unselect_" + file.getPath(), () => { }, checked => {
            checkbox.checked = checked;
            if (checked) {
                checkbox.style.display = "block"
                this.selected[file.getPath()] = file
            } else {
                checkbox.style.display = "none"
                delete this.selected[file.getPath()]
            }
        }, true, this)

        let thumbtack = fileIconDiv.querySelector("svg")
        thumbtack.onclick = (evt) => {
            evt.stopPropagation()
            // Do stuff here...
            FileController.hasLocal(file.getPath(), exists => {
                if (exists) {
                    file.removeLocalCopy(() => {
                        thumbtack.style.fill = ""
                        thumbtack.style.display = "none";
                        thumbtack.style.left = ""
                    })
                } else {
                    file.keepLocalyCopy(() => {
                        thumbtack.style.display = "block";
                        thumbtack.style.left = "8px"
                        thumbtack.style.fill = "var(--palette-primary-main)"
                    })
                }
            })
        }

        // Here I will append the interation.
        fileIconDiv.onmouseover = (evt) => {
            evt.stopPropagation();
            checkbox.style.display = "block"
            thumbtack.style.display = "block"
            if (File.hasLocal)
                FileController.hasLocal(file.getPath(), exist => {
                    if (exist) {
                        thumbtack.style.display = "block";
                        thumbtack.style.left = ""
                        thumbtack.style.fill = "var(--palette-primary-main)"
                    }
                })

            fileIconDiv.appendChild(this.shareResource)

            let files = [];
            for (var key in this.selected) {
                files.push(this.selected[key])
            }

            if (files.filter(f => f.getPath() === file.getPath()).length == 0) {
                files.push(file)
            }

            this.shareResource.setFiles(files)

            this.shareResource.style.position = "absolute"
            this.shareResource.style.top = "0px";
            this.shareResource.style.right = "20px";
        }

        fileIconDiv.onmouseleave = (evt) => {
            evt.stopPropagation();
            let checkbox = fileIconDiv.querySelector("paper-checkbox")
            if (!checkbox.checked) {
                checkbox.style.display = "none"
            }

            if (this.shareResource.parentNode) {
                this.shareResource.parentNode.removeChild(this.shareResource)
            }

            thumbtack.style.display = "none"

            if (File.hasLocal)
                FileController.hasLocal(file.getPath(), exist => {
                    if (exist) {
                        thumbtack.style.display = "block";
                        thumbtack.style.left = "8px"
                        thumbtack.style.fill = "var(--palette-primary-main)"
                    }
                })
        }

        // video or audio file can be keep localy
        if ((file.getMime().startsWith("video") || file.getMime().startsWith("audio")) && file.getMime() != "video/hls-stream") {
            if (File.hasLocal) {
                thumbtack.style.visibility = "visible"
                FileController.hasLocal(file.getPath(), exist => {
                    if (exist) {
                        thumbtack.style.display = "block";
                        thumbtack.style.left = "8px"
                        thumbtack.style.fill = "var(--palette-primary-main)"
                    }
                })
            }
        }

        if (fileType == "video") {

            /** In that case I will display the vieo preview. */
            let h = 72;

            this.preview = new VideoPreview(file, h, () => {
                fileNameSpan.style.wordBreak = "break-all"
                fileNameSpan.style.fontSize = ".85rem"
                fileNameSpan.style.maxWidth = this.preview.width + "px"
                if (file.videos) {
                    if (file.videos.length > 0)
                        fileNameSpan.innerHTML = file.videos[0].getDescription()
                }

            }, this._file_explorer_.globule)

            // keep the explorer link...
            this.preview._file_explorer_ = this._file_explorer_
            this.preview.name = file.getName();

            fileIconDiv.insertBefore(this.preview, fileIconDiv.firstChild)

            this.preview.draggable = false

            fileIconDiv.ondrop = (evt) => {
                evt.stopPropagation();
                evt.preventDefault()
                let url = evt.dataTransfer.getData("Url");
                if (url.startsWith("https://www.imdb.com/title")) {
                    view.setImdbTitleInfo(url, file)
                }
            }

            // Retreive the video title to display more readable file name...
            TitleController.getFileVideosInfo(file, videos => {

                fileNameSpan.innerHTML = videos[0].getDescription()

                // keep the video in the file itself...
                file.videos = videos

            }, err => {
                TitleController.getFileTitlesInfo(file, (titles) => {
                    let title = titles[0]
                    let name = title.getName()
                    if (title.getEpisode() > 0) {
                        name += " S" + title.getSeason() + "-E" + title.getEpisode()
                    }
                    fileNameSpan.innerHTML = name
                    fileNameSpan.title = file.getPath()

                }, err => { }, this._file_explorer_.globule)
            }, this._file_explorer_.globule)


        } else if (file.getIsDir()) {

            // Here I will create a folder mosaic from the folder content...
            let folderIcon = document.createRange().createContextualFragment(`<iron-icon icon="icons:folder"></iron-icon>`)
            fileIconDiv.insertBefore(folderIcon, fileIconDiv.firstChild)


            fileIconDiv.onclick = (evt) => {
                evt.stopPropagation();
                this._file_explorer_.publishSetDirEvent(file.getPath())
            }

            folderIcon.draggable = false

            // So here I will try to get infos.json file...
            FileController.getFile(file.globule, file.getPath() + "/infos.json", -1, -1, infos => {

                // read the text information...
                FileController.readText(infos, text => {


                    // Read the json file and get the title infos...
                    let title_infos_ = JSON.parse(text)

                    // remove the default icon...
                    TitleController.getTitleInfo(title_infos_["ID"], (title) => {

                        let folderIcon = fileIconDiv.querySelector("iron-icon")
                        folderIcon.parentNode.removeChild(folderIcon)


                        file.titles = [title] // krr[]
                        // so here I will initialyse the title infos.
                        folderIcon = document.createRange().createContextualFragment(`<img src="${title.getPoster().getContenturl()}"></img>`)
                        fileIconDiv.insertBefore(folderIcon, fileIconDiv.firstChild)

                        fileIconDiv.onclick = (evt) => {
                            evt.stopPropagation();
                            this._file_explorer_.publishSetDirEvent(file.getPath())
                        }

                        folderIcon.draggable = false

                        fileNameSpan.innerHTML = title.getName()
                    }, err => { }, this._file_explorer_.globule)




                })

            }, err => {

            })

        } else if (file.getThumbnail() != undefined) {

            /** Display the thumbnail. */
            let img = document.createElement("img")
            img.src = file.getThumbnail()
            img.draggable = false

            // The size of the span will be calculated in respect of the image size.
            let getMeta = (url) => {
                var img = new Image();
                img.onload = function () {
                    if (img.width > 0 && img.height > 0) {
                        w = (img.width / img.height) * h
                        fileNameSpan.style.maxWidth = w + "px"
                        fileNameSpan.style.wordBreak = "break-all"
                        fileNameSpan.style.fontSize = ".85rem"
                        if (file.audios) {
                            if (file.audios.length > 0)
                                fileNameSpan.innerHTML = file.audios[0].getTitle()
                        }

                    }
                };
                img.src = url;
            }

            getMeta(file.getThumbnail())

            fileIconDiv.insertBefore(img, fileIconDiv.firstChild)

            if (fileType == "image") {
                img.onclick = (evt) => {
                    evt.stopPropagation();
                    Backend.eventHub.publish("__show_image__", { file: file, file_explorer_id: this._file_explorer_.id }, true)
                    this.menu.close()
                    if (this.menu.parentNode)
                        this.menu.parentNode.removeChild(this.menu)
                }
            } else if (fileType == "audio") {
                img.onclick = (evt) => {
                    evt.stopPropagation();
                    Backend.eventHub.publish("__play_audio__", { file: file, file_explorer_id: this._file_explorer_.id }, true)
                    this.menu.close()
                    if (this.menu.parentNode)
                        this.menu.parentNode.removeChild(this.menu)
                }

            } else {
                // here I will try the file viewer.
                img.onclick = (evt) => {
                    evt.stopPropagation();
                    Backend.eventHub.publish("__read_file__", { file: file, file_explorer_id: this._file_explorer_.id }, true)
                    this.menu.close()
                    if (this.menu.parentNode)
                        this.menu.parentNode.removeChild(this.menu)

                }
            }

            // display more readable name.
            TitleController.getFileAudiosInfo(file, audios => {
                if (audios.length > 0) {
                    file.audios = audios // keep in the file itself...
                    fileNameSpan.innerHTML = file.audios[0].getTitle()
                    if (file.audios[0].getPoster())
                        if (file.audios[0].getPoster().getContenturl().length > 0) {
                            img.src = file.audios[0].getPoster().getContenturl()
                        }
                }
            })

        }

        if (file.getIsDir()) {
            fileIconDiv.ondragover = (evt) => {
                evt.preventDefault()
                fileIconDiv.children[0].icon = "icons:folder-open"
                this._file_explorer_.setAtTop()
            }

            fileIconDiv.ondragleave = () => {
                fileIconDiv.children[0].icon = "icons:folder"
            }

            fileIconDiv.ondrop = (evt) => {
                evt.stopPropagation()

                evt.preventDefault()
                let url = evt.dataTransfer.getData("Url");
                if (url.startsWith("https://www.imdb.com/title")) {
                    view.setImdbTitleInfo(url, file)
                } else if (evt.dataTransfer.files.length > 0) {
                    // So here I will simply upload the files...
                    Backend.eventHub.publish("__upload_files_event__", { dir: file, files: evt.dataTransfer.files, globule: this._file_explorer_.globule }, true)
                } else {

                    let files = JSON.parse(evt.dataTransfer.getData('files'))
                    let id = evt.dataTransfer.getData('id')
                    fileIconDiv.children[0].icon = "icons:folder"
                    let domain = evt.dataTransfer.getData('domain')

                    // Create drop_file_event...
                    if (file != undefined && id.length > 0) {
                        files.forEach(f => {
                            Backend.eventHub.publish(`drop_file_${this._file_explorer_.id}_event`, { file: f, dir: file.getPath(), id: id, domain: domain }, true)
                        })
                    }
                }
            }
        }


        fileNameSpan.innerHTML = file.getName();
        fileIconDiv.parentNode.appendChild(fileNameSpan);

        fileIconDiv.onmouseenter = (evt) => {
            evt.stopPropagation();

            let thumbtacks = this.div.querySelectorAll("svg")
            for (var i = 0; i < thumbtacks.length; i++) {
                if (thumbtacks[i].style.fill == "var(--palette-primary-main)") {
                    thumbtacks[i].style.left = "8px"
                } else {
                    thumbtacks[i].style.display = "none"
                    thumbtacks[i].style.left = ""
                }
            }

            if (File.hasLocal) {
                thumbtack.style.display = "block";
                FileController.hasLocal(file.getPath(), exist => {
                    if (exist) {
                        thumbtack.style.display = "block";
                        thumbtack.style.left = ""
                        thumbtack.style.fill = "var(--palette-primary-main)"
                    }
                })
            }

            let checkboxs = this.div.querySelectorAll("paper-checkbox")
            for (var i = 0; i < checkboxs.length; i++) {
                if (!checkboxs[i].checked) {
                    checkboxs[i].style.display = "none"
                }
            }

            let fileIconDivs = this.div.querySelectorAll(".file-icon-div")
            for (var i = 0; i < fileIconDivs.length; i++) {
                fileIconDivs[i].classList.remove("active")
            }

            fileIconDiv.classList.add("active")

            // display the actual checkbox...
            checkbox.style.display = "block"


            fileIconDiv.appendChild(this.shareResource)

            let files = [];
            for (var key in this.selected) {
                files.push(this.selected[key])
            }

            if (files.filter(f => f.getPath() === file.getPath()).length == 0) {
                files.push(file)
            }

            this.shareResource.setFiles(files)

            this.shareResource.style.position = "absolute"
            this.shareResource.style.top = "0px";
            this.shareResource.style.right = "20px";

            document.body.appendChild(this.menu)


            if (!this.menu.isOpen()) {
                this.menu.showBtn()
                //fileIconDiv.parentNode.appendChild(this.menu)

                let coords = getCoords(fileIconDiv.parentNode)
                this.menu.style.position = "absolute"
                this.menu.__top__ = coords.top + 4
                this.menu.style.top = coords.top + 4 + "px"
                this.menu.__left__ = coords.left + fileIconDiv.offsetWidth + 5 - 20
                this.menu.style.left = coords.left + fileIconDiv.offsetWidth + 5 - 20 + "px"

                this.menu.onmouseover = (evt) => {
                    evt.stopPropagation();
                    fileIconDiv.classList.add("active")
                }

                this.menu.onmouseout = (evt) => {
                    evt.stopPropagation();
                    fileIconDiv.classList.remove("active")
                }

                this.menu.setFile(file)

                // set the rename function.
                this.menu.rename = () => {
                    this.rename(fileIconDiv, file, fileIconDiv.offsetHeight + 6)
                }
            }
        }
    }

    setActive() {
        this.fileIconDiv.classList.add("active")
    }

    resetActive() {
        this.fileIconDiv.classList.remove("active")
    }
}


customElements.define('globular-file-icon-view', FileIconView)
