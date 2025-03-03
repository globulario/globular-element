import { FileController} from "../../backend/file"
import { Backend } from "../../backend/backend"
import { FilesView } from "./filesView.js"
import getUuidByString from "uuid-by-string"
import { getCoords } from '../utility.js';

import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/iron-icon/iron-icon.js';
import { TitleController } from "../../backend/title";

export class FilesListView extends FilesView {
    constructor() {
        super()

    }

    /**
     * Display the content of a directory
     * @param {*} dir 
     */
    setDir(dir) {

        if(!FileController.validateDirAccess(dir)){
            return
        }

        this.div.innerHTML = "";


        let checkboxs = this.div.querySelectorAll("paper-checkbox")
        for (var i = 0; i < checkboxs.length; i++) {
            if (!checkboxs[i].checked) {
                checkboxs[i].style.visibility = "hidden"
            }
        }


         let id = "_" + getUuidByString(dir.getPath() + "/" + dir.getName());

        let html = `
        <style>
            tbody{
                position: relative;
            }

            tbody tr {
                background-color: var(--surface-color);
                transition: background 0.2s ease,padding 0.8s linear;
            }

            tr.active{
                filter: invert(10%);
            }

            .first-cell {
                display: flex;
                align-items: center;
                position: relative;

            }

            .first-cell span{
                display: flex;
                flex-grow: 1;
                padding-top: 4px;
                padding-left: 4px;
                padding-right: 40px;
                margin-left: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .first-cell span:hover{
                cursor: pointer;
                /*text-decoration: underline;*/
            }
            
            .first-cell paper-checkbox, paper-icon-button {
                visibility: hidden;
            }

            .first-cell paper-icon-button {
                min-width: 40px;
            }

            globular-dropdown-menu {
                position: absolute;
            }

            .ellipsis {
                display: inline-block; /* Ensures the element respects width */
                max-width: 150px; /* Set a max width */
                white-space: nowrap; /* Prevent text wrapping */
                overflow: hidden; /* Hide overflowed text */
                text-overflow: ellipsis; /* Append '...' for truncated text */
            }

        </style>
        <table>
            <thead class="files-list-view-header">
                <tr>
                    <th class="name_header_div files-list-view-header">Name</th>
                    <th class="modified_header_div files-list-view-header">Modifiy</th>
                    <th class="mime_header_div files-list-view-header">Type</th>
                    <th class="size_header_div files-list-view-header">Size</th>
                </tr>
            </thead>
            <tbody id=${id}"_files_list_view_info" class="files-list-view-info"></tbody>
        </table>
        `

        // Create the header.
        this.div.innerHTML = html

        this.div.querySelector(`table`).onmouseleave = (evt) => {
            evt.stopPropagation()

        }

        this.div.querySelector(`table`).ondrop = (evt) => {
            evt.preventDefault()
            this.ondrop(evt)
        }

        this.div.querySelector(`table`).ondragover = (evt) => {
            evt.preventDefault()
        }

        this.div.onclick = (evt) => {
            evt.stopPropagation()

        }

        // get the info div that will contain the information.
        let fileListView = this.div.getElementsByClassName("files-list-view-info")[0]
        if (dir == undefined) {
            return
        }
        for (let f of dir.getFilesList()) {
            let size = ""
            let mime = "Dossier de fichiers"
            let icon = "icons:folder"

            if (f.getName() == "audio.m3u") {
                dir.__audioPlaylist__ = f
            } else if (f.getName() == "video.m3u") {
                dir.__videoPlaylist__ = f
            } else {

                if (f.getMime().length > 0) {
                    mime = f.getMime()
                }

                if (f.getMime().length > 0) {
                    icon = "editor:insert-drive-file";
                    if (f.getSize() > 1024) {
                        if (f.getSize() > 1024 * 1024) {
                            if (f.getSize() > 1024 * 1024 * 1024) {
                                let fileSize = f.getSize() / (1024 * 1024 * 1024);

                                size = fileSize.toFixed(2) + " Gb";
                            } else {
                                let fileSize = f.getSize() / (1024 * 1024);
                                size = fileSize.toFixed(2) + " Mb";
                            }
                        } else {
                            let fileSize = f.getSize() / 1024;
                            size = fileSize.toFixed(2) + " Kb";
                        }
                    } else {
                        size = f.getSize() + " bytes";
                    }
                    mime = f.getMime().split(";")[0].split("/")
                } else {
                    size = f.getFilesList().length + " items"
                }



                // Here I will get the last modified time from unix time.
                let modeTime = new Date(f.getModeTime() * 1000).toLocaleString()

                // Set the text.
                let html = `
                <td class="first-cell">
                    <paper-checkbox></paper-checkbox>
                    <iron-icon id="${id}_icon" class="file-lnk-ico" style="height: 18px;" icon="${icon}"></iron-icon> 
                    <img  style="height: 32px; display: none;"/>
                    <span class="ellipsis" style="margin-right: 60px;"> ${f.getName()} </span>
                </td>
                <td>${modeTime}</td>
                <td>${mime}</td>
                <td>${size}</td>
            `

                let row = document.createElement("tr")
                row.innerHTML = html;

                let rowId = "_" + getUuidByString(f.getPath()).split("-").join("_")

                row.id = rowId;

                if (f.getMime().startsWith("video")) {
                    row.querySelector(`#${id}_icon`).icon = "av:movie"
                } else if (f.getMime().startsWith("audio")) {
                    row.querySelector(`#${id}_icon`).icon = "av:music-video"
                } else if (f.getMime().startsWith("image")) {
                    let icon = row.querySelector("iron-icon")
                    icon.style.display = "none"
                    let img = row.querySelector("img")
                    img.src = f.getThumbnail()
                    img.style.display = "block"
                } else if (f.getIsDir()) {
                    row.querySelector(`#${id}_icon`).icon = "icons:folder"
                }


                let checkbox = row.querySelector("paper-checkbox")
                // Connect interface from various point...
                checkbox.onclick = (evt) => {
                    evt.stopPropagation();
                    Backend.eventHub.publish("__file_select_unselect_" + f.path, checkbox.checked, true)
                }

                Backend.eventHub.subscribe("__file_select_unselect_" + f.path, () => { }, checked => {
                    checkbox.checked = checked;
                    if (checked) {
                        checkbox.style.visibility = "visible"
                        this.selected[f.path] = f
                    } else {
                        checkbox.style.visibility = "hidden"
                        delete this.selected[f.path]
                    }
                }, true, this)


                let span = row.querySelector("span")
                span.onclick = (evt) => {
                    evt.stopPropagation();
                    if (f.getMime().startsWith("video")) {
                        Backend.eventHub.publish("__play_video__", { file: f, file_explorer_id: this._file_explorer_.id }, true)
                    } else if (f.getMime().startsWith("audio")) {
                        Backend.eventHub.publish("__play_audio__", { file: f, file_explorer_id: this._file_explorer_.id }, true)
                    } else if (f.getIsDir()) {
                        this._file_explorer_.publishSetDirEvent(f.getPath())
                    } else if (f.getMime().startsWith("image")) {
                        Backend.eventHub.publish("__show_image__", { file: f, file_explorer_id: this._file_explorer_.id }, true)
                    }
                    this.menu.close()
                }

                if(mime[0] == "video"){
                    // I will try to get the viedeo information.
                    TitleController.getFileVideosInfo(f, videos=>{
                        if(videos.length > 0){
                            let video = videos[0]
                            span.innerHTML = video.getDescription()

                            //console.log(video.getPoster().getUrl(), video.getPoster().getContenturl())
                            let img = row.querySelector("img")
                            img.src = video.getPoster().getUrl()
                            img.style.display = "block"

                            let icon = row.querySelector("iron-icon")
                            icon.style.display = "none"
                        }
                    }, err=>{
                        TitleController.getFileTitlesInfo(f, titles=>{
                            if(titles.length > 0){
                                let title = titles[0]
                            }
                        }
                        , err=>{
                        }, f.globule)
                    }, f.globule)
                }

                row.onmouseenter = (evt) => {
                    evt.stopPropagation();

                    if (!this.menu.isOpen()) {


                        let files = [];
                        for (var key in this.selected) {
                            files.push(this.selected[key])
                        }

                        if (files.filter(f_ => f_.path === f.path).length == 0) {
                            files.push(f)
                        }


                        this.menu.showBtn()

                        document.body.appendChild(this.menu)

                        this.menu.style.position = "absolute"
                        this.menu.__top__ = coords.top
                        this.menu.style.top = coords.top + "px"
                        this.menu.__left__ = coords.left + 22
                        this.menu.style.left = coords.left + 22 + "px"

                        this.menu.setFile(f)

                        this.menu.onmouseover = (evt) => {
                            evt.stopPropagation();
                            row.classList.add("active")
                        }

                        this.menu.onmouseout = (evt) => {
                            evt.stopPropagation();
                            row.classList.remove("active")
                        }

                        // set the rename function.
                        this.menu.rename = () => {
                            this.rename(row, f, row.offsetTop + row.offsetHeight + 6)
                        }
                    }
                }

                // On mouse over event.
                row.onmouseover = (evt) => {
                    evt.stopPropagation();
                    // if a rename box is open I will not display the menu...
                    if (row.parentNode.querySelector("#rename-file-dialog") != undefined) {
                        return
                    }
                    checkbox.style.visibility = "visible"
                    row.classList.add("active")
                }

                // On mouseout event.
                row.onmouseleave = (evt) => {
                    evt.stopPropagation()
                    if (!checkbox.checked) {
                        checkbox.style.visibility = "hidden"
                    }
                    row.classList.remove("active")

                }

                if (!f.getName().startsWith(".")) {
                    if (f.getIsDir()) {
                        fileListView.insertBefore(row, fileListView.firstChild);
                        let lnk = this.div.getElementsByClassName("file-lnk-ico")[0]
                        lnk.onclick = (evt) => {
                            evt.stopPropagation();
                            this._file_explorer_.publishSetDirEvent(f.getPath())
                        }

                        lnk.onmouseover = () => {
                            lnk.style.cursor = "pointer"
                        }

                        lnk.onmouseleave = () => {
                            lnk.style.cursor = "default"
                        }

                    } else {
                        fileListView.appendChild(row);

                        // TODO create the code for open file.
                    }
                }
            }
        }
    }
}

customElements.define('globular-files-list-view', FilesListView)
