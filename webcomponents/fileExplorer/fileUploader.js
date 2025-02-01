import getUuidByString from "uuid-by-string"
import { Backend, displayMessage, generatePeerToken } from "../../backend/backend"
import { DropTorrentRequest, GetTorrentInfosRequest, GetTorrentLnksRequest } from "globular-web-client/torrent/torrent_pb";
import { FileController, getFileSizeString } from "../../backend/file";
import { uploadFiles } from "globular-web-client/api";
import { formatBytes } from "../utility";
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/paper-tabs/paper-tab.js';

export class FilesUploader extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {

        super()

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.width = 320;
        if (this.hasAttribute("width")) {
            this.width = parseInt(this.getAttribute("width"));
        }

        this.height = 550;
        if (this.hasAttribute("height")) {
            this.height = parseInt(this.getAttribute("height"));
        }

        this.shadowRoot.innerHTML = `
        <style>
        
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

            #container{
                background-color: var(--surface-color);
                position: relative;
                font-size: 1rem;
                display: flex;
                flex-direction: column;
            }

            .collapse-torrent-panel{
                display: flex;
                flex-direction: column;
                max-height: 200px;
                overflow: auto;
                width: 100%;
            }

            // test only...
            this.getWorkspace().appendChild(ApplicationView.filesUploader)
        
            }
                
            paper-icon-button .active{

            }

            paper-icon-button {
                
            }

            .content{
                display: flex;
                flex-direction: column;
            }

            .card-content{
                border-left: 1px solid var(--palette-divider); 
                overflow-y: auto;
                flex-grow: 1;
                max-height: calc(100vh - 200px);
                min-height: 300px;
            }

            .table {
                width: 100%;
                display: flex;
                flex-direction: column;
            }

            

            .table-header {
                border-bottom: 1px solid var(--palette-divider); 
                padding-bottom: 5px;
            }

            .table-body{
                position: relative;
                width: 100%;
                display: flex;
                flex-direction: column;
            }

            .table-header, .table-row {
                display: flex;
                flex-direction: row;
                width: 100%;
            }

            .table-row{
                border-bottom: 1px solid var(--palette-divider); 
            }

            .table-cell {
                padding: 5px;
                align-item: center;
                justify-content: flex-start;
            }

            .file-name {
                overflow: hidden;
                white-space:nowrap;
                text-overflow:ellipsis;
                display:inline-block;
            }

            .file-path {
                overflow: hidden;
                white-space:nowrap;
                text-overflow:ellipsis;
                display:inline-block;
                text-decoration: underline;
                flex-grow: 1;
            }

            .file-path:hover {
                cursor: pointer;
            }

            .speedometer-div {
                min-width: 60px;
                text-align: right;
                padding-right: 5px;
            }

            paper-card{
                background-color: var(--surface-color);
                color: var(--primary-text-color);
            }

            paper-tabs{
                background: var(--surface-color); 
                border-left: 1px solid var(--palette-divider); 

                width: 100%;

                /* custom CSS property */
                --paper-tabs-selection-bar-color: var(--primary-color); 
                color: var(--primary-text-color);
                --paper-tab-ink: var(--palette-action-disabled);
            }

            #close-btn{
                display: none;
            }

            @media (max-width: 500px) {
                .table {
                    width: calc(100vw - 5px);
                }

                .table-cell {
                    padding: 0px;
                }

                .card-content {
                    max-height: calc(100vh - 120px);
                    height: calc(100vh - 120px);
                }

                #container{
                    height: 100%;
                }

                #close-btn{
                    display: block;
                }

                .file-path{
                    max-width: calc(100vw - 160px);
                }
            }

        </style>
        <div id="container">
            <div class="content">
                <div style="display: flex; align-items: center; background: var(--palette-primary-accent); ">
                    <paper-tabs selected="0" style="">
                        <paper-tab id="file-upload-tab">Files</paper-tab>
                        <paper-tab id="links-download-tab">Videos</paper-tab>
                        <paper-tab id="torrents-dowload-tab">Torrents</paper-tab>
                    </paper-tabs>
                    <paper-icon-button id="close-btn" icon="icons:close"></paper-icon-button>
                </div>
                <div class="card-content" style="padding: 0px;">
                    <div class="table" id="files-upload-table">
                        <div class="table-header" class="files-list-view-header">
                        </div>
                        <div class="table-body" id="file-upload-tbody" class="files-list-view-info">
                        </div>
                    </div>
                    <div class="table" id="links-download-table" style="display: none;">
                        <div class="table-header" class="files-list-view-header">
                        </div>
                        <div class="table-body" id="links-download-tbody" class="files-list-view-info">
                        </div>
                    </div>
                    <div class="table" id="torrents-download-table" style="display: none;">
                        <div class="table-header" class="files-list-view-header">
                        </div>
                        <div class="table-body" id="torrent-download-tbody" class="files-list-view-info">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `


        // The body where upload files info are displayed
        this.files_upload_table = this.shadowRoot.querySelector("#file-upload-tbody")

        // The body where torrents files will be displayed.
        this.torrent_download_table = this.shadowRoot.querySelector("#torrent-download-tbody")

        // The list of link where link's 
        this.links_download_table = this.shadowRoot.querySelector("#links-download-tbody")

        // The tabs...
        this.filesUploadTab = this.shadowRoot.querySelector("#file-upload-tab")
        this.torrentsDowloadTab = this.shadowRoot.querySelector("#torrents-dowload-tab")
        this.linksDownloadTab = this.shadowRoot.querySelector("#links-download-tab")

        // So here I will set the tab interractions.
        this.filesUploadTab.onclick = () => {
            let tables = this.shadowRoot.querySelectorAll(".table")
            for (var i = 0; i < tables.length; i++) {
                tables[i].style.display = "none"
            }

            let table = this.shadowRoot.querySelector("#files-upload-table")
            table.style.display = ""
        }

        this.torrentsDowloadTab.onclick = () => {
            let tables = this.shadowRoot.querySelectorAll(".table")
            for (var i = 0; i < tables.length; i++) {
                tables[i].style.display = "none"
            }

            let table = this.shadowRoot.querySelector("#torrents-download-table")
            table.style.display = ""
        }

        this.linksDownloadTab.onclick = () => {
            let tables = this.shadowRoot.querySelectorAll(".table")
            for (var i = 0; i < tables.length; i++) {
                tables[i].style.display = "none"
            }

            let table = this.shadowRoot.querySelector("#links-download-table")
            table.style.display = ""
        }

        // Upload file event.
        Backend.eventHub.subscribe(
            "__upload_files_event__", (uuid) => { },
            (evt) => {
                this.uploadFiles(evt.dir.getPath(), evt.files, evt.globule)

            }
            , true, this
        )

        // Upload link (youtube, pornhub...)
        Backend.eventHub.subscribe(
            "__upload_link_event__", (uuid) => { },
            (evt) => {
                this.uploadLink(evt.pid, evt.path, evt.infos, evt.lnk, evt.done, evt.globule)
            }
            , true, this
        )

        // Upload torrent files.
        Backend.eventHub.subscribe(
            "__upload_torrent_event__", (uuid) => { },
            (evt) => {
                this.uploadTorrent(evt)
            }
            , true, this
        )

        // Append the globule to the list.
        Backend.eventHub.subscribe("start_peer_evt_",
            uuid => { },
            p => {

                let domain = Backend.globular.domain
                if(p != undefined){
                    domain = p.getDomain()
                }

                let globule = Backend.getGlobule(domain)
                this.getTorrentLnks(globule, lnks => {

                })

                this.getTorrentsInfo(globule)

            }, true)


        // Connect events...
        Backend.getGlobules().forEach(globule => {
            this.getTorrentLnks(globule, lnks => {

            })

            this.getTorrentsInfo(globule)
        })

        if (this.shadowRoot.parentNode)
            this.shadowRoot.parentNode.removeChild(this.shadowRoot)
    }

    /**
     * Dowload a video on globular server from a link.
     * @param {*} pid The pid of the server command associated with that link
     * @param {*} path The path on the server where the video will be saved
     * @param {*} infos The infos receive about the file transfert.
     */
    uploadLink(pid, path, infos, lnk, done, globule) {

        let id = "link-download-row-" + pid
        let row = this.shadowRoot.querySelector("#" + id)

        if (done || infos == "done") {
            let span_title = this.links_download_table.querySelector("#" + id + "_title")
            if (span_title) {
                displayMessage("File " + span_title.innerHTML + " was now uploaded!", 3000)
                let info = span_title.innerHTML

                // row.parentNode.removeChild(row)
                row.children[1].innerHTML = `
                <div style="display: flex; flex-direction: column; width: 100%; align-items: flex-start; font-size: 0.85rem;">
                    <span id="file-lnk" class="file-path">${info.split(": ")[1]}</span>
                    <span id="dir-lnk" class="file-path">${path}</span>
                </div>
                `

                let cancelBtn = row.querySelector("#cancel-btn")
                cancelBtn.onclick = () => {
                    // so here I will also send an event to cancel the upload process...
                    row.style.display = "none";
                }

                // Open the file
                row.querySelector("#file-lnk").onclick = () => {
                    Backend.eventHub.publish("follow_link_event_", { path: path + "/" + info.split(": ")[1], domain: globule.domain }, true)
                }

                // Open the containing dir.
                row.querySelector("#dir-lnk").onclick = () => {
                    Backend.eventHub.publish("follow_link_event_", { path: path, domain: globule.domain }, true)
                }

            }
            return
        }

        // display the button.
        if (row == undefined) {

            let row = document.createElement("div")
            row.className = "table-row"
            row.id = id

            let cancelCell = document.createElement("div")
            cancelCell.className = "table-cell"

            let cancelBtn = document.createElement("paper-icon-button")
            cancelBtn.icon = "icons:close"
            cancelBtn.id = "cancel-btn"
            cancelCell.appendChild(cancelBtn)

            let cellSource = document.createElement("div")
            cellSource.className = "table-cell"
            cellSource.style.flexGrow = "1"

            let html = `
            <div style="display: flex; flex-direction: column; width: 100%; align-items: flex-start; font-size: 0.85rem;">
                <span id="${id}_title" style="text-align: left; width: 100%;">${infos}</span>
                <p id="${id}_infos" style="text-align: left; width: 100%; white-space: pre-line; margin: 0px;"></p>
                <span class="file-path" style="text-align: left; width: 100%">${path}</span>
            </div>`;

            cellSource.innerHTML = html

            row.appendChild(cancelCell)
            row.appendChild(cellSource);

            // So here if the user click on the lnk...
            row.querySelector(".file-path").onclick = () => {
                Backend.eventHub.publish("follow_link_event_", { path: path, domain: globule.domain }, true)
            }

            cancelBtn.onclick = () => {
                // Here I will ask the user for confirmation before actually delete the contact informations.
                let toast = displayMessage(
                    `
                <style>
                
                #yes-no-upload-video-delete-box{
                    display: flex;
                    flex-direction: column;
                }

                #yes-no-upload-video-delete-box globular-contact-card{
                    padding-bottom: 10px;
                }

                #yes-no-upload-video-delete-box div{
                    display: flex;
                    padding-bottom: 10px;
                }

                paper-button{
                    font-size: .8rem;
                }


                </style>
                <div id="yes-no-upload-video-delete-box">
                <div>Your about to cancel video upload</div>
                <div>Is it what you want to do? </div>
                <div style="justify-content: flex-end;">
                    <paper-button raised id="yes-delete-upload-video">Yes</paper-button>
                    <paper-button raised id="no-delete-upload-video">No</paper-button>
                </div>
                </div>
                `,
                    15000 // 15 sec...
                );

                let yesBtn = document.querySelector("#yes-delete-upload-video")
                let noBtn = document.querySelector("#no-delete-upload-video")

                // On yes
                yesBtn.onclick = () => {
                    toast.hideToast();

                    // so here I will also send an event to cancel the upload process...
                    globule.eventHub.publish("cancel_upload_event", JSON.stringify({ pid: pid, path: path }), false)
                    row.style.display = "none";
                }

                noBtn.onclick = () => {
                    toast.hideToast();
                }
            }

            // Append to files panels.
            this.links_download_table.appendChild(row)

        } else {

            if (infos.startsWith("[download] Destination:")) {
                let span_title = this.links_download_table.querySelector("#" + id + "_title")
                span_title.innerHTML = infos.substring(infos.lastIndexOf("/") + 1)
            } else {
                let span_infos = this.links_download_table.querySelector("#" + id + "_infos")
                span_infos.innerHTML = infos.trim();
            }
        }
    }

    /**
     * Dowload a torrent on globular server.
     * @param {*} torrent 
     * @returns 
     */
    uploadTorrent(torrent) {
        let globule = torrent.globule
        let uuid = getUuidByString(torrent.getName())
        let id = "torrent-download-row-" + uuid
        let row = this.shadowRoot.querySelector("#" + id)

        // display the button.
        if (row == undefined) {
            let row = document.createElement("div")
            row.className = "table-row"
            row.done = false
            row.id = id

            let cancelCell = document.createElement("div")
            cancelCell.className = "table-cell"
            let cancelBtn = document.createElement("paper-icon-button")
            cancelBtn.icon = "icons:close"
            cancelCell.appendChild(cancelBtn)

            let cellSource = document.createElement("div")
            cellSource.className = "table-cell"
            cellSource.style.flexGrow = "1"

            cellSource.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; align-items: flex-start; font-size: 0.85rem;">
            
                <div style="display: flex; align-items: center; width: 100%;">
                    <div style="display: flex; width: 32px; height: 32px; justify-content: center; align-items: center;position: relative;">
                        <iron-icon  id="_${uuid}-collapse-btn"  icon="unfold-less" --iron-icon-fill-color:var(--primary-text-color);"></iron-icon>
                        <paper-ripple class="circle" recenters=""></paper-ripple>
                    </div>
                    <span id="${id}_title" class="file-path" style="flex-grow: 1;">${torrent.getName()}</span>
                    <span class="speedometer-div"></span>
                </div>
   
                <iron-collapse id="_${uuid}-collapse-torrent-panel" class="collapse-torrent-panel">
                    <div id="_${uuid}-file-list-div" style="display: flex; flex-direction: column; padding-left: 15px; padding-right: 5px">
                    </div>
                </iron-collapse>

                <span id="${id}_dest_path" class="file-path">${torrent.getDestination()}</span>
                <paper-progress  id="${id}_progress_bar"  style="width: 100%; margin-top: 5px;"></paper-progress>
            </div>`;

            row.appendChild(cancelCell)
            row.appendChild(cellSource);

            row.querySelector(`#${id}_dest_path`).onclick = () => {
                Backend.eventHub.publish("follow_link_event_", { path: torrent.getDestination(), domain: globule.domain }, true)
            }

            row.querySelector(`#${id}_title`).onclick = () => {
                Backend.eventHub.publish("follow_link_event_", { path: torrent.getDestination() + "/" + torrent.getName(), domain: globule.domain }, true)
            }

            cancelBtn.onclick = () => {

                // Here I will ask the user for confirmation before actually delete the contact informations.
                let toast = displayMessage(
                    `
                    <style>
                    
                    #yes-no-torrent-delete-box{
                        display: flex;
                        flex-direction: column;
                    }
    
                    #yes-no-torrent-delete-box globular-contact-card{
                        padding-bottom: 10px;
                    }
    
                    #yes-no-torrent-delete-box div{
                        display: flex;
                        padding-bottom: 10px;
                    }

                    paper-button{
                        font-size: .8rem;
                    }

                    </style>

                    <div id="yes-no-torrent-delete-box">
                    <div>Your about to remove torrent</div>
                    <div style="font-style: bold;">${torrent.getName()}</div>
                    <div>Is it what you want to do? </div>
                    <div style="justify-content: flex-end;">
                        <paper-button raised id="yes-delete-torrent">Yes</paper-button>
                        <paper-button raised id="no-delete-torrent">No</paper-button>
                    </div>
                    </div>
                    `,
                    15000 // 15 sec...
                );

                let yesBtn = document.querySelector("#yes-delete-torrent")
                let noBtn = document.querySelector("#no-delete-torrent")

                // On yes
                yesBtn.onclick = () => {
                    toast.hideToast();

                    // remove the row firt to prevent the user to click more than once...
                    row.parentNode.removeChild(row)

                    // So here I will remove the torrent from the list...
                    let rqst = new DropTorrentRequest
                    rqst.setName(torrent.getName())
                    generatePeerToken(globule, token => {
                        globule.torrentService.dropTorrent(rqst, { domain: globule.domain, token: token })
                            .then(rsp => {
                                displayMessage(
                                    "Torrent was download was remove",
                                    3000
                                );
                            }).catch(err => displayError(err, 3000))
                    })

                }

                noBtn.onclick = () => {
                    toast.hideToast();
                }
            }

            // Append to files panels.
            this.torrent_download_table.appendChild(row)

        } else {

            let progressBar = row.querySelector(`#${id}_progress_bar`)

            let speedo = row.querySelector(".speedometer-div")
            if (torrent.getPercent() == 100) {
                progressBar.style.display = "none"
                speedo.innerHTML = "Done"
            } else {
                speedo.innerHTML = formatBytes(torrent.getDownloadrate(), 1)
                progressBar.value = torrent.getPercent()

            }

            let collapse_btn = row.querySelector(`#_${uuid}-collapse-btn`)
            let collapse_panel = row.querySelector(`#_${uuid}-collapse-torrent-panel`)
            collapse_btn.onclick = () => {
                if (!collapse_panel.opened) {
                    collapse_btn.icon = "unfold-more"
                } else {
                    collapse_btn.icon = "unfold-less"
                }
                collapse_panel.toggle();
            }

            let filesDiv = row.querySelector(`#_${uuid}-file-list-div`)
            let range = document.createRange()

            // So here I will display the list of files contain in the torrent.
            torrent.getFilesList().forEach(f => {
                // So here I will create the file list...
                let id = "_" + getUuidByString(f.getPath())
                let fileRow = filesDiv.querySelector(`#${id}`)
                if (fileRow == undefined) {
                    let html = `
                        <div id="${id}" style="display: flex; flex-direction: column; font-size: 0.85rem;"> 
                            <div style="display: flex;">
                                <span id="file-lnk" >${f.getPath().split("/")[f.getPath().split("/").length - 1]}</span>
                            </div>
                            <paper-progress id="${id}_progress_bar" style="width: 100%;"></paper-progress>
                        </div>
                    `
                    filesDiv.appendChild(range.createContextualFragment(html))
                    fileRow = filesDiv.querySelector(`#${id}`)
                }

                let progressBar_ = fileRow.querySelector(`#${id}_progress_bar`)
                progressBar_.value = f.getPercent()
                if (f.getPercent() == 100 && progressBar_.style.display != "none") {
                    progressBar_.style.display = "none"
                    // Open the file
                    let fileLnk = fileRow.querySelector("#file-lnk")
                    fileLnk.classList.add("file-path")
                    displayMessage("Torrent File " + f.getPath() + " was uploaded", 3000)
                    fileLnk.onclick = () => {
                        Backend.eventHub.publish("follow_link_event_", { path: torrent.getDestination() + "/" + f.getPath(), domain: globule.domain }, true)
                    }
                }
            })
        }
    }

    /**
     * Upload files from local computer to globular server
     * @param {*} path 
     * @param {*} files 
     */
    uploadFiles(path, files, globule) {

        // So here I will try to get the most information from the backend to be able to keep the user inform about what append 
        // with uploading files process.

        // Upload files panel...
        for (var i = 0; i < files.length; i++) {
            let f = files[i]
            let size = getFileSizeString(f.size)

            let row = document.createElement("div")
            row.className = "table-row"
            row.id = "_" + getUuidByString(path + "/" + f.name)

            let cancelCell = document.createElement("div")
            cancelCell.className = "table-cell"

            let cancelBtn = document.createElement("paper-icon-button")
            cancelBtn.icon = "icons:close"
            cancelCell.appendChild(cancelBtn)

            cancelBtn.onclick = () => {
                row.style.display = "none";
            }

            let cellSource = document.createElement("div")
            cancelCell.className = "table-cell"
            cancelCell.id = "cancel-btn"
            cellSource.style.flexGrow = "1"

            cellSource.innerHTML = `
                <div style="display: flex; flex-direction: column; width: 100%; align-items: flex-start; font-size: 0.85rem;">
                    <span id="file-lnk" style="">${f.name}</span>
                    <span id="dest-lnk" class="file-path" style="">${path}</span>
                    <paper-progress value=0 style="width: 100%;"></paper-progress>
                </div>`;

            let cellSize = document.createElement("div")
            cellSize.className = "table-cell"
            cellSize.innerHTML = size;

            row.appendChild(cancelCell)
            row.appendChild(cellSource);
            row.appendChild(cellSize);

            // Display message to the user.
            row.querySelector("#dest-lnk").onclick = () => {
                Backend.eventHub.publish("follow_link_event_", { path: path, domain: globule.domain }, true)
            }

            // Append to files panels.
            this.files_upload_table.appendChild(row)
        }

        // Upload file one by one and 
        let uploadFile = (index, callback) => {
            let f = files[index]
            index++
            if (this.files_upload_table.children[0].style.display == "none") {
                // simply pass over...
                // this.files_upload_table.removeChild(this.files_upload_table.children[0])
                if (index < files.length) {
                    uploadFile(index, callback)
                } else {
                    FileController.removeDir(f.path, f.globule)
                    callback()
                }
            } else {

                // Take the port number from actual globular service conection.
                let port = globule.config.PortHttp
                if (globule.config.Protocol == "https") {
                    port = globule.config.PortHttps
                }

                // generate a token... 
                generatePeerToken(globule, token => {

                    // retreive the row and the progress bar...
                    let id = "_" + getUuidByString(path + "/" + f.name)
                    let row = this.files_upload_table.querySelector("#" + id)
                    let progress = row.querySelector("paper-progress")
                    let cancelBtn = row.querySelector("#cancel-btn")

                    // Start upload files.
                    let xhr = uploadFiles(globule, token, path, [f],
                        () => {
                            if (index < files.length) {
                                uploadFile(index, callback)
                            } else {
                                FileController.removeDir(f.path, f.globule)
                                callback()
                            }
                        },
                        event => {
                            displayMessage("File upload for " + path + "/" + f.name + " fail", 3000)
                        },
                        event => {

                            progress.value = (event.loaded / event.total) * 100
                            if (event.loaded == event.total) {
                                displayMessage("File " + f.name + " was uploaded", 3000)
                                progress.parentNode.removeChild(progress)

                                // Set the lnk...
                                row.querySelector("#file-lnk").classList.add("file-path")
                                row.querySelector("#file-lnk").onclick = () => {
                                    Backend.eventHub.publish("follow_link_event_", { path: path + "/" + f.name, domain: globule.domain }, true)
                                }
                            }
                        },
                        event => {
                            displayMessage("File upload for " + path + "/" + f.name + " was cancel", 3000)
                        },
                        port)

                    // overide the onclik event to cancel the file upload in that case.
                    cancelBtn.onclick = () => {
                        let toast = displayMessage(
                            `
                        <style>
                        
                        #yes-no-upload-delete-box{
                            display: flex;
                            flex-direction: column;
                        }
        
                        #yes-no-upload-delete-box globular-contact-card{
                            padding-bottom: 10px;
                        }
        
                        #yes-no-upload-delete-box div{
                            display: flex;
                            padding-bottom: 10px;
                        }

                        paper-button{
                            font-size: .8rem;
                        }

                        </style>
                        <div id="yes-no-upload-delete-box">
                        <div>Your about to cancel file upload</div>
                        <div>Is it what you want to do? </div>
                        <div style="justify-content: flex-end;">
                            <paper-button raised id="yes-delete-upload">Yes</paper-button>
                            <paper-button raised id="no-delete-upload">No</paper-button>
                        </div>
                        </div>
                        `,
                            15000 // 15 sec...
                        );

                        let yesBtn = document.querySelector("#yes-delete-upload")
                        let noBtn = document.querySelector("#no-delete-upload")

                        // On yes
                        yesBtn.onclick = () => {
                            toast.hideToast();

                            // send abort signal...
                            xhr.abort()
                            row.style.display = "none";
                        }

                        noBtn.onclick = () => {
                            toast.hideToast();
                        }
                    }

                }, err => displayError(err, 3000))
            }
        }

        // Start file upload!
        uploadFile(0, () => {
            // When all file are uploaded...
            Backend.publish("reload_dir_event", path, false)
        })
    }

    /** Get the list of torrent */
    getTorrentLnks(globule, callback) {
        generatePeerToken(globule, token => {
            let rqst = new GetTorrentLnksRequest
            globule.torrentService.getTorrentLnks(rqst, { domain: globule.domain, token: token })
                .then(lnks => callback(lnks))
        }, err => displayError(err, 3000))

    }

    /**
    * A loop that get torrent info from the server...
    */
    getTorrentsInfo(globule) {
        generatePeerToken(globule, token => {
            let rqst = new GetTorrentInfosRequest
            let stream = globule.torrentService.getTorrentInfos(rqst, {  domain: globule.domain, token: token })
            stream.on("data", (rsp) => {
                /** Local event... */
                rsp.getInfosList().forEach(torrent => {
                    torrent.globule = globule
                    Backend.eventHub.publish("__upload_torrent_event__", torrent, true);
                })
            });

            stream.on("status", (status) => {
                if (status.code != 0) {
                    console.log(status.details)
                }
            });
        }, err => displayError(err, 3000))

    }

}

customElements.define('globular-files-uploader', FilesUploader)