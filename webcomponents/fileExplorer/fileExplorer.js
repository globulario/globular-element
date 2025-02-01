import getUuidByString from "uuid-by-string"
import { generatePeerToken, Backend, displayError, displayMessage } from '../../backend/backend';
import { displayAuthentication, randomUUID } from "../utility.js";
import { FilesListView } from "./filesListView.js";
import { FilesIconView } from "./filesIconView.js";
import { PermissionsManager } from "../permissionManager/permissionManager.js";
import { InformationsManager } from "../informationManager/informationsManager.js";
import { ImageViewer } from "../image.js";
import { GlobularFileReader } from "./fileReader.js";
import { FileNavigator } from './fileNavigator.js';
import { PathNavigator } from './pathNavigator.js';
import { fireResize } from '../utility.js';
import { DiskSpaceManager } from "./diskSpaceManager.js"
import { FileController } from "../../backend/file"
import { AccountController } from "../../backend/account";
import { playVideo } from "../video.js";
import { playAudio } from "../audio.js";
import { TitleController } from "../../backend/title";
import '@polymer/paper-input/paper-input.js';
import { AddPublicDirRequest, CreateDirRequest } from "globular-web-client/file/file_pb.js";
import { FilesUploader } from "./fileUploader.js";
import { SearchBar } from "../search/searchBar.js";
import { SearchResults } from "../search/searchResults.js";
import { set } from "lodash";

function getElementIndex(element) {
    return Array.from(element.parentNode.children).indexOf(element);
}

export class FileExplorer extends HTMLElement {
    // attributes.
    static paperTray = []

    static fileUploader = null

    /**
      * Constructor to initialize the file explorer instance.
      * @param {Object} globule - Backend service instance for file operations (optional).
      */
    constructor(globule) {
        super();

        // Use default globule instance if none provided
        this.globule = globule || Backend.globule;

        // Attach shadow DOM for encapsulation
        this.attachShadow({ mode: 'open' });

        // Generate a unique ID for the explorer instance
        this.id = `_${randomUUID()}`;
        this.setAttribute("id", this.id);

        // Define initial properties
        this.path = undefined; // Current active path
        this.root = undefined; // Root path of the explorer
        this.navigations = []; // Stack to track navigation paths
        this.onerror = (err) => displayError(err, 3000); // Error handler
        this.dialog = undefined; // Dialog element for the explorer
        this.onclose = undefined; // Close event handler
        this.onopen = undefined; // Open event handler
        this.listeners = {}; // Event listeners registry

        // Define interface elements
        this.filesListView = undefined; // List view for files
        this.filesIconView = undefined; // Icon view for files
        this.permissionManager = undefined; // Permission manager instance
        this.informationManager = undefined; // Information manager instance
        this.pathNavigator = undefined; // Path navigation component
        this.fileNavigator = undefined; // File navigation component
        this.filesListBtn = undefined; // Button for list view
        this.fileIconBtn = undefined; // Button for icon view
        this.fileUploaderBtn = undefined; // Button for file upload
        this.refreshBtn = undefined; // Refresh button
        this.backNavigationBtn = undefined; // Back navigation button
        this.upwardNavigationBtn = undefined; // Upward navigation button

        // Initialize layout and styles
        this._initializeLayout();

        // Initialize UI components and bind events
        this._initializeComponents();

        this._bindEventHandlers();


        // init the file explorer.
        this.init(() => {
            console.log("file explorer initialized.")
            this.fileIconBtn.click()

        });

        if (FileExplorer.fileUploader == null) {
            FileExplorer.fileUploader = new FilesUploader()
        }

    }

    /**
     * Initializes the layout and shadow DOM styles.
     * Contains the HTML structure and CSS styles.
     */
    _initializeLayout() {
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

        /* Button hover effect */
        paper-icon-button:hover {
            cursor: pointer;
        }

        /* File explorer panel styles */
        #file-navigation-panel, #file-selection-panel {
            background-color: var(--surface-color);
            color: var(--primary-text-color);
        }

        #file-explorer-content {
            display: flex;
            flex-direction: column;
            height: calc( 100% - 40px );
        }

        /* File layout styles */
        #file-explorer-layout {
            display: flex;
            flex-grow: 1;
            overflow: hidden;
        }

        globular-file-reader{
            height: 100%;
        }

        /* Permissions and info managers */
        globular-permissions-manager, globular-informations-manager {
            background-color: var(--surface-color);
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: auto;
            z-index: 100;
        }

        /* Navigation progress */
        #progress-div {
            position: absolute; 
            bottom: 0;
            left: 10px;
            display: none;
            font-size: 0.85rem;
            background-color: var(--surface-color);
        }

        .card-actions{
            display: flex;
        }

        /* Mobile-specific styles */
        @media (max-width: 500px) {
            .footer {
                width: calc(100vw - 35px);
                bottom: 0;
                position: fixed;
            }
            #file-explorer-content {
                margin-bottom: 40px;
            }
            #enter-full-screen-btn {
                display: none;
            }
        }
    </style>

    <globular-dialog id="${this.id}" class="file-explorer" name="file-explorer" 
        is-moveable="true" is-maximizeable="true" is-resizeable="true" 
        show-icon="true" is-minimizeable="true">
        <span id="title-span" slot="title">File Explorer</span>

        <!-- Header action buttons -->
        <globular-search-bar slot="search" id="search-bar"></globular-search-bar>
        <paper-icon-button slot="header" id="navigation-cloud-upload-btn" icon="icons:cloud-upload"></paper-icon-button>
        <paper-icon-button slot="header" id="navigation-create-dir-btn" icon="icons:create-new-folder"></paper-icon-button>
        <paper-icon-button slot="header" id="navigation-refresh-btn" icon="icons:refresh"></paper-icon-button>

        <div id="file-explorer-content" class="card-content no-select">
            <div id="file-navigation-header">
                <div id="btn-group-0" style="display: flex;">
                    <paper-icon-button id="navigation-back-btn" icon="icons:arrow-back"></paper-icon-button>
                    <paper-icon-button id="navigation-forward-btn" icon="icons:arrow-forward"></paper-icon-button>
                    <paper-icon-button id="navigation-upward-btn" icon="icons:arrow-upward"></paper-icon-button>
                </div>
                <globular-path-navigator  style="flex-grow: 1;"></globular-path-navigator>
            </div>
            <globular-split-view id="file-explorer-layout">
                <globular-split-pane id="file-navigation-panel" style="width: 360px;">
                    <globular-file-navigator ></globular-file-navigator>
                </globular-split-pane>
                <globular-split-pane id="file-selection-panel" style="position: relative; width: 100%;">
                    <slot></slot>
                    <div id="progress-div">
                        <span id="progress-message">Loading...</span>
                        <paper-progress id="globular-dir-loading-progress-bar" indeterminate></paper-progress>
                    </div>
                </globular-split-pane>
            </globular-split-view>
        </div>

        <div class="card-actions footer" style="background-color: var(--surface-color);">
            <globular-disk-space-manager account="sa@localhost" style="display: none;"></globular-disk-space-manager>
            <span style="flex-grow: 1;"></span>
            <paper-icon-button id="files-icon-btn" class="active" icon="icons:view-module" style="--iron-icon-fill-color: var(--palette-action-active);" role="button" tabindex="0" aria-disabled="false"></paper-icon-button>
            <paper-icon-button id="files-list-btn" icon="icons:view-list" style="--iron-icon-fill-color: var(--palette-action-disabled);" role="button" tabindex="1" aria-disabled="false" ></paper-icon-button>
            <paper-icon-button id="file_uploader_icon" icon="icons:file-upload" style="--iron-icon-fill-color: var(--palette-action-disabled);" ></paper-icon-button >
        </div>

    </globular-dialog>
    `;
    }

    /**
     * Initializes file explorer components.
     */
    _initializeComponents() {

        // Get the file explorer content.
        this.dialog = this.shadowRoot.querySelector("globular-dialog");
        this.progressDiv = this.shadowRoot.querySelector("#progress-div");
        this.permissionManager = new PermissionsManager();
        this.informationManager = new InformationsManager();
        this.pathNavigator = this.shadowRoot.querySelector("globular-path-navigator");
        this.pathNavigator._file_explorer_ = this;
        this.fileNavigator = this.shadowRoot.querySelector("globular-file-navigator");
        this.fileNavigator._file_explorer_ = this;
        this.diskSpaceManager = this.shadowRoot.querySelector("globular-disk-space-manager")
        this.diskSpaceManager.globule = this.globule
        this.fileSelectionPanel = this.shadowRoot.querySelector("#file-selection-panel")
        this._file_explorer_Content = this.shadowRoot.querySelector("#file-explorer-content")
        this.diskSpaceManager.account = AccountController.account;

        this.filesListView = new FilesListView()
        this.filesListView.id = "globular-files-list-view"
        this.filesListView._file_explorer_ = this;
        this.appendChild(this.filesListView)

        this.filesIconView = new FilesIconView()
        this.filesIconView._active_ = true // true be default...
        this.filesIconView.id = "globular-files-icon-view"
        this.filesIconView._file_explorer_ = this;
        this.appendChild(this.filesIconView)

        // set the search bar...
        this.searchBar = this.shadowRoot.querySelector("#search-bar")
        this.searchBar._file_explorer_ = this



    }

    /**
     * Binds event handlers for file explorer actions.
     */
    _bindEventHandlers() {

        this.dialog.onclose = () => {
            this.filesIconView.hide()
            this.filesListView.hide()
        }

        this.dialog.onmove = (left, top) => {
            this.filesIconView.hideMenu()
            this.filesListView.hideMenu()
        }

        this.refreshBtn = this.shadowRoot.querySelector("#navigation-refresh-btn");
        this.refreshBtn.onclick = () => Backend.eventHub.publish("reload_dir_event", this.path, true);


        // The create directory button.
        this.createDirectoryBtn = this.shadowRoot.querySelector("#navigation-create-dir-btn")

        // The upload file button.
        this.uploadBtn = this.shadowRoot.querySelector("#navigation-cloud-upload-btn")

        this.filesListBtn = this.shadowRoot.querySelector("#files-list-btn")
        this.fileIconBtn = this.shadowRoot.querySelector("#files-icon-btn")
        this.fileUploaderBtn = this.shadowRoot.querySelector("#file_uploader_icon")

        // File navigation button.
        this.backNavigationBtn = this.shadowRoot.querySelector("#navigation-back-btn")
        this.fowardNavigationBtn = this.shadowRoot.querySelector("#navigation-forward-btn")
        this.upwardNavigationBtn = this.shadowRoot.querySelector("#navigation-upward-btn")
        this.lstNavigationBtn = this.shadowRoot.querySelector("#navigation-lst-btn")


        // Upload a file.
        this.uploadBtn.onclick = () => {
            let fileInput = document.querySelector("file-input")
            if (fileInput == undefined) {
                fileInput = document.createElement("input")
                fileInput.id = "file-input"
                fileInput.type = "file"
                fileInput.multiple = "true"
                fileInput.style.display = "none"
                document.body.appendChild(fileInput)
            }

            fileInput.click()
            // this.pathNavigator
            fileInput.onchange = () => {
                FileExplorer.fileUploader.uploadFiles(this.path, fileInput.files, this.globule)
            }
        }

        // Here I will connect the windows resize event...
        this.backNavigationBtn.onclick = (evt) => {
            evt.stopPropagation();
            let index = this.navigations.indexOf(this.path)
            index--
            if (index < this.navigations.length && index > -1) {
                this.publishSetDirEvent(this.navigations[index])
            }
        }

        this.fowardNavigationBtn.onclick = (evt) => {
            evt.stopPropagation();
            let index = this.navigations.indexOf(this.path)
            index++
            if (index < this.navigations.length && index > -1) {
                this.publishSetDirEvent(this.navigations[index])
            }
        }

        this.upwardNavigationBtn.onclick = (evt) => {
            evt.stopPropagation();
            if (this.path.split("/").length > 2) {
                this.path = this.path.substring(0, this.path.lastIndexOf("/"))

                this.publishSetDirEvent(this.path)
            }
        }


        this.filesListBtn.onclick = (evt) => {
            evt.stopPropagation();
            this.imageViewer.style.display = "none"
            this.filesListView.show()
            this.filesIconView.hide()
            this.filesIconView._active_ = false
            this.filesListView._active_ = true
            this.fileReader.style.display = "none"
            this.filesListBtn.classList.add("active")
            this.fileIconBtn.classList.remove("active")
            this.fileUploaderBtn.classList.remove("active")
            this.filesListBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-active)")
            this.fileIconBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-disabled)")
            this.fileUploaderBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-disabled)")

            if (FileExplorer.fileUploader.parentNode) {
                FileExplorer.fileUploader.parentNode.removeChild(FileExplorer.fileUploader)
            }

            if (this.filesListView.menu.parentNode) {
                this.filesListView.menu.parentNode.removeChild(this.filesListView.menu)
                this.filesListView.menu.close()
            }

            if (this.filesIconView.menu.parentNode) {
                this.filesIconView.menu.parentNode.removeChild(this.filesIconView.menu)
                this.filesIconView.menu.close()
            }

        }

        this.fileUploaderBtn.onclick = (evt) => {
            evt.stopPropagation();

            this.imageViewer.style.display = "none"
            this.filesListView.hide()
            this.filesIconView.hide()
            this.fileReader.style.display = "none"
            this.filesListBtn.classList.remove("active")
            this.fileIconBtn.classList.remove("active")
            this.filesListBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-disabled)")
            this.fileIconBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-disabled)")
            this.fileUploaderBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-active)")
            this.fileUploaderBtn.classList.add("active")

            this.appendChild(FileExplorer.fileUploader)
        }

        //  Backend.eventHub.publish("__upload_files_event__", { dir: this.__dir__, files: [fileObject], lnk: lnk, globule: this._file_explorer_.globule }, true)
        Backend.eventHub.subscribe("__upload_files_event__", (uuid) => { }, (evt) => {
            if (evt.dir.getPath() == this.path) {
                this.refreshBtn.click()
                this.fileUploaderBtn.click()
            }
        }, false)

        this.fileIconBtn.onclick = (evt) => {
            evt.stopPropagation();
            this.imageViewer.style.display = "none"
            this.filesListBtn.classList.remove("active")
            this.fileIconBtn.classList.add("active")
            this.fileUploaderBtn.classList.remove("active")
            this.filesIconView._active_ = true
            this.filesListView._active_ = false
            this.filesListView.hide()
            this.filesIconView.show()
            this.fileReader.style.display = "none"
            this.filesListBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-disabled)")
            this.fileIconBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-active)")
            this.fileUploaderBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-disabled)")

            if (FileExplorer.fileUploader.parentNode) {
                FileExplorer.fileUploader.parentNode.removeChild(FileExplorer.fileUploader)
            }

            if (this.filesListView.menu.parentNode) {
                this.filesListView.menu.parentNode.removeChild(this.filesListView.menu)
                this.filesListView.menu.close()
            }

            if (this.filesIconView.menu.parentNode) {
                this.filesIconView.menu.parentNode.removeChild(this.filesIconView.menu)
                this.filesIconView.menu.close()
            }
        }

        // Create a new directory here...
        this.createDirectoryBtn.onclick = (evt) => {
            evt.stopPropagation();

            // Here I will use a simple paper-card with a paper input...
            let html = `
                        <style>
                            #new-dir-dialog{
                                display: flex;
                                position: absolute;
                                flex-direction: column;
                                right: 60px;
                                top: 50px;
                                z-index: 100;
                            }
        
                            .new-dir-dialog-actions{
                                font-size: .85rem;
                                align-items: center;
                                justify-content: flex-end;
                                display: flex;
                                background-color: var(--surface-color);
                                color: var(--primary-text-color);
                            }
        
                            paper-card{
                                background-color: var(--surface-color);
                                color: var(--primary-text-color);
                            }
                      
        
                        </style>
                        <paper-card id="new-dir-dialog">
                            <div class="card-content">
                                <paper-input id="new-dir-input" label="new folder name" value="Untitled Folder"></paper-input>
                            </div>
                            <div class="new-dir-dialog-actions">
                                <paper-button id="new-dir-cancel-btn">Cancel</paper-button>
                                <paper-button id="new-dir-create-btn">Create</paper-button>
                            </div>
                        </paper-card>
                    `
            // only one dialog open at time.
            if (this._file_explorer_Content.querySelector("#new-dir-dialog") == undefined) {
                let range = document.createRange()
                this._file_explorer_Content.appendChild(range.createContextualFragment(html))
            }

            let input = this._file_explorer_Content.querySelector("#new-dir-input")
            setTimeout(() => {
                input.focus()
                input.inputElement._inputElement.select();
            }, 50)

            let cancel_btn = this._file_explorer_Content.querySelector("#new-dir-cancel-btn")
            let create_btn = this._file_explorer_Content.querySelector("#new-dir-create-btn")

            // simply remove the dialog
            cancel_btn.onclick = (evt) => {
                evt.stopPropagation();
                let dialog = this._file_explorer_Content.querySelector("#new-dir-dialog")
                dialog.parentNode.removeChild(dialog)
            }

            input.onkeydown = (evt) => {
                if (evt.keyCode == 13) {
                    create_btn.click()
                } else if (evt.keyCode == 27) {
                    cancel_btn.click()
                }
            }

            create_btn.onclick = (evt) => {
                evt.stopPropagation();
                let dialog = this._file_explorer_Content.querySelector("#new-dir-dialog")
                dialog.parentNode.removeChild(dialog)

                // if the current directory is the public dir...
                if (this.path == "/public") {
                    // Here I will add public directory...
                    const rqst = new AddPublicDirRequest
                    rqst.setPath(input.value)
                    generatePeerToken(this.globule, token => {
                        // Create a directory at the given path.
                        this.globule.fileService
                            .addPublicDir(rqst, {
                                token: token,
                                domain: this.globule.domain
                            })
                            .then(() => {
                                // The new directory was created.
                                Backend.publish("reload_dir_event", this.path, false);
                            })
                            .catch((err) => {
                                displayError(err, 3000)
                            });
                    })
                } else {
                    // Here I will create a new folder...
                    // Set the request.
                    const rqst = new CreateDirRequest();
                    rqst.setPath(this.path);
                    rqst.setName(input.value);

                    generatePeerToken(this.globule, token => {
                        // Create a directory at the given path.
                        this.globule.fileService
                            .createDir(rqst, {
                                token: token,
                                domain: this.globule.domain
                            })
                            .then(() => {
                                // The new directory was created.
                                this.globule.eventHub.publish("reload_dir_event", this.path, false);
                            })
                            .catch((err) => {
                                displayError(err, 3000)
                            });
                    })
                }
            }

        }

        // Refresh the root directory and send event to
        // refresh all the interface.
        this.refreshBtn.onclick = () => {
            this.globule.eventHub.publish("reload_dir_event", this.path, false);
        }

    }


    publishSetDirEvent(path) {
        this.displayWaitMessage("load " + path)
        FileController.readDir(path, (dir) => {

            Backend.eventHub.publish("__set_dir_event__", { dir: dir, file_explorer_id: this.id }, true)
            this.resume()
        }, err => { displayError(err, 3000); this.resume(); }, this.globule)
    }

    setAtTop() {

        let draggables = document.querySelectorAll(".draggable")
        for (var i = 0; i < draggables.length; i++) {
            draggables[i].style.zIndex = 100;
        }

        this.style.zIndex = 1000;
    }

    displayWaitMessage(message) {
        this.progressDiv.style.display = "block"
        let messageDiv = this.progressDiv.querySelector("#progress-message")
        this.globule.eventHub.publish("refresh_dir_evt", this.path, false);
        messageDiv.innerHTML = message
    }

    resume() {
        this.progressDiv.style.display = "none"
    }

    hideNavigator() {
        this.fileNavigator.hide()
        window.dispatchEvent(new Event('resize'));
    }

    showNavigator() {
        this.fileNavigator.show()
        window.dispatchEvent(new Event('resize'));
    }

    setGlobule(globule) {
        shared = {}
        public_ = {}

        this.globule = globule

        this.shadowRoot.querySelector("globular-disk-space-manager").globule = globule
        this.permissionManager.globule = globule // set the globule for get permissions...

        this.init()
    }

    // display the video watching.
    openMediaWatching(media_watching) {

        this.appendChild(media_watching)

    }

    // Set the file explorer directory.
    init(callback) {

        // The file reader
        if (this.fileReader) {
            this.fileReader.parentNode.removeChild(this.fileReader)
        }

        this.fileReader = new GlobularFileReader()
        this.fileReader.id = "#globular-file-reader"
        this.fileReader.style.display = "none"
        this.fileReader.style.zIndex = 1000
        this.fileReader._file_explorer_ = this
        this.fileReader.style.height = "100%"

        this.appendChild(this.fileReader)

        // The image viewer
        if (this.imageViewer) {
            this.imageViewer.parentNode.removeChild(this.imageViewer)
        }

        this.imageViewer = new ImageViewer()
        this.imageViewer.id = "#globular-image-viewer"
        this.imageViewer.style.display = "none"
        this.imageViewer.setAttribute("closeable", "true")
        this.appendChild(this.imageViewer)


        // Init the path navigator
        this.pathNavigator.init();

        // Init the files views
        this.filesListView.init();
        this.filesIconView.init();

        // set the available space on the globule.
        this.shadowRoot.querySelector("globular-disk-space-manager").refresh()

        if (this.listeners["__set_dir_event__"] == undefined) {

            Backend.eventHub.subscribe("__set_dir_event__",
                (uuid) => {
                    this.listeners["__set_dir_event__"] = uuid;
                },
                (evt) => {
                    // keep the active path.
                    if (this.id == evt.file_explorer_id) {
                        // remove actual context and set back the default files view.
                        this.fileReader.style.display = "none"
                        this.imageViewer.style.display = "none";
                        this.permissionManager.style.display = "none"

                        this.setDir(evt.dir)

                    }
                }, true
            )
        }

        // Service configuration change event...
        if (this.listeners[`update_globular_service_configuration_${this.globule.domain}_evt`] == undefined) {
            this.globule.eventHub.subscribe(`update_globular_service_configuration_evt`,
                (uuid) => {
                    this.listeners[`update_globular_service_configuration_${this.globule.domain}_evt`] = uuid;
                }, (event) => {
                    let config = JSON.parse(event)
                    if (config.Name == "file.FileService") {

                    }

                }, false, this)
        }

        // File rename event.
        if (this.listeners[`file_rename_${this.globule.domain}_event`] == undefined) {
            this.globule.eventHub.subscribe("file_rename_event",
                (uuid) => {
                    this.listeners[`file_rename_${this.globule.domain}_event`] = uuid;
                }, (path) => {
                    if (path.startsWith(this.getRoot())) {
                        this.publishSetDirEvent(this.path)
                    }
                }, false, this)
        }

        // Permissions 
        if (this.listeners[`display_permission_manager_${this.id}_event`] == undefined) {
            this.globule.eventHub.subscribe(`display_permission_manager_${this.id}_event`,
                (uuid) => {
                    this.listeners[`display_permission_manager_${this.id}_event`] = uuid;
                }, (file) => {

                    this.permissionManager.permissions = null
                    this.permissionManager.globule = file.globule
                    this.permissionManager.setPath(file.getPath())
                    this.permissionManager.setResourceType = "file"
                    this.permissionManager.style.display = ""


                    // I will display the permission manager.
                    this.fileSelectionPanel.appendChild(this.permissionManager)

                }, false)
        }

        // Informations
        if (this.listeners[`display_media_infos_${this.id}_event`] == undefined) {
            this.globule.eventHub.subscribe(`display_media_infos_${this.id}_event`,
                (uuid) => {
                    this.listeners[`display_media_infos_${this.id}_event`] = uuid;
                }, (file) => {

                    let infos = null

                    if (file.titles != undefined) {
                        if (file.titles.length > 0) {
                            this.informationManager.setTitlesInformation(file.titles)
                            infos = file.titles[0]
                        }
                    }

                    if (file.videos != undefined) {
                        if (file.videos.length > 0) {
                            this.informationManager.setVideosInformation(file.videos)
                            infos = file.videos[0]
                        }
                    }

                    if (file.audios != undefined) {
                        if (file.audios.length > 0) {
                            this.informationManager.setAudiosInformation(file.audios)
                            infos = file.audios[0]
                        }
                    }


                    this.fileSelectionPanel.appendChild(this.informationManager)

                    // remove all display menu.
                    let menus = document.querySelectorAll("globular-dropdown-menu")
                    for (var i = 0; i < menus.length; i++) {
                        let menu = menus[i]
                        if (menu.parentNode) {
                            menu.parentNode.removeChild(menu)
                        }
                    }

                    // listen if the diplayed info is deleted.
                    if (infos) {
                        Backend.eventHub.subscribe("_delete_infos_" + infos.getId() + "_evt", uuid => { }, evt => {
                            if (this.informationManager.parentNode) {
                                this.informationManager.parentNode.removeChild(this.informationManager)
                            }
                        }, true)

                    }

                }, false)
        }

        if (this.listeners[`display_file_infos_${this.id}_event`] == undefined) {
            this.globule.eventHub.subscribe(`display_file_infos_${this.id}_event`,
                (uuid) => {
                    this.listeners[`display_file_infos_${this.id}_event`] = uuid;
                }, (file) => {

                    // display the file information itself.
                    this.informationManager.setFileInformation(file)

                    // I will display the permission manager.
                    this.fileSelectionPanel.appendChild(this.informationManager)

                }, false)
        }

        if (this.listeners[`_display_search_results_${this.id}_event`] == undefined) {
            // Search result event...
            Backend.eventHub.subscribe("_display_search_results_",
                uuid => { },
                evt => {

                    if (this.id != evt["file-explorer-id"]) {
                        return
                    }

                    if (this._searchResults != undefined) {
                        if (this._searchResults.parentNode != undefined) {
                            this._searchResults.parentNode.removeChild(this._searchResults)
                        }
                    }

                    // The search result panel where the result will be displayed.
                    if (this._searchResults == null) {
                        this._searchResults = new SearchResults()
                        this._searchResults._file_explorer_ = this
                    }

                    this.appendChild(this._searchResults);

                }, true)
        }

        if (this.listeners[`_hide_search_results_${this.id}_event`] == undefined) {
            Backend.eventHub.subscribe("_hide_search_results_",
                uuid => { },
                evt => {
                    if (this.id != evt["file-explorer-id"]) {
                        return
                    }

                    // hide all the side bar...
                    let facetFilters = this.getElementsByTagName("globular-facet-search-filter")
                    for (var i = 0; i < facetFilters.length; i++) {
                        let f = facetFilters[i]
                        f.style.display = "none"
                    }

                    // The search results
                    if (this._searchBar != undefined) {
                        if (this._searchResults) {
                            if (this._searchResults.parentNode != undefined) {
                                this._searchResults.parentNode.removeChild(this._searchResults)
                            }
                        }
                    }

                    this._searchResults.parentNode.removeChild(this._searchResults)

                }, true)
        }

        // Reload the content of a dir with the actual dir content description on the server.
        // must be call after file are deleted or renamed
        if (this.listeners[`reload_dir_${this.globule.domain}_event`] == undefined) {
            this.globule.eventHub.subscribe("reload_dir_event",
                (uuid) => {
                    this.listeners[`reload_dir_${this.globule.domain}_event`] = uuid
                }, (path) => {
                    if (this.path && path) {
                        if (path.endsWith(this.path)) {
                            this.displayWaitMessage("load " + path)

                            // clear previous selection.
                            FileExplorer.paperTray = []
                            this.filesIconView.selected = {}
                            this.filesListView.selected = {}

                            FileController.readDir(path, (dir) => {
                                this.fileNavigator.reload(dir, () => {
                                    // reload dir to be sure if it's public that change will be applied.
                                    FileController.readDir(path, (dir) => {
                                        this.resume()
                                        if (dir.getPath() == this.path) {
                                            this.__dir__ = dir
                                            Backend.eventHub.publish("__set_dir_event__", { dir: dir, file_explorer_id: this.id }, true)

                                        }
                                        if (this.shadowRoot.querySelector("globular-disk-space-manager") != undefined) {
                                            this.shadowRoot.querySelector("globular-disk-space-manager").refresh()
                                        }

                                    }, err => { displayError(err, 3000); this.resume() }, this.globule)
                                })
                            }, err => displayError(err, 3000), this.globule, true)
                        }
                    } else {
                        this.resume()
                    }
                }, false)
        }

        // Refresh the interface.
        if (this.listeners[`upload_files_${this.globule.domain}_event`] == undefined) {
            this.globule.eventHub.subscribe("upload_files_event", (uuid) => {
                this.listeners[`upload_files_${this.globule.domain}_event`] = uuid
            },
                evt => {
                    if (evt == this.path) {
                        // refresh the interface.
                        delete FileController.dirs[getUuidByString(this.globule.domain + "@" + this.path)]
                        this.refreshBtn.click();
                    }
                }, false)
        }


        // Play the video...
        if (this.listeners["__play_video__"] == undefined) {
            Backend.eventHub.subscribe("__play_video__", (uuid) => {
                this.listeners["__play_video__"] = uuid
            }, (evt) => {
                if (this.id == evt.file_explorer_id) {
                    this.playVideo(evt.file, evt.globule)
                }
            }, true)
        }

        // Play audio
        if (this.listeners["__play_audio__"] == undefined) {
            Backend.eventHub.subscribe("__play_audio__", (uuid) => {
                this.listeners["__play_audio__"] = uuid
            }, (evt) => {
                if (this.id == evt.file_explorer_id) {
                    this.playAudio(evt.file, evt.globule)
                }

            }, true)
        }

        // Read file
        if (this.listeners["__read_file__"] == undefined) {
            Backend.eventHub.subscribe("__read_file__", (uuid) => {
                this.listeners["__read_file__"] = uuid
            }, (evt) => {
                if (this.id == evt.file_explorer_id) {
                    this.readFile(evt.file)
                }
            }, true, this)
        }

        // Show image...
        if (this.listeners["__show_image__"] == undefined) {
            Backend.eventHub.subscribe("__show_image__", (uuid) => {
                this.listeners["__show_image__"] = uuid
            }, (evt) => {
                if (this.id == evt.file_explorer_id) {
                    this.showImage(evt.file)
                }

            }, true)
        }

        if (this.listeners["__show_share_wizard__"] == undefined) {
            Backend.eventHub.subscribe("__show_share_wizard__", (uuid) => {
                this.listeners["__show_share_wizard__"] = uuid
            }, (evt) => {
                if (this.id == evt.file_explorer_id) {

                    evt.wizard.style.position = "absolute"

                    evt.wizard.style.zIndex = 1000
                    evt.wizard.style.top = "0px"
                    evt.wizard.style.left = "0px"
                    evt.wizard.style.right = "0px"
                    evt.wizard.style.bottom = "0px"

                    this.showShareWizard(evt.wizard)
                }

            }, true)
        }


        let readRootDir = (root) => {

            FileController.readDir(root, (dir) => {

                // set interface with the given directory.
                this.resume()
                this.root = dir
                this.path = dir.getPath()

                if (this.fileNavigator != null) {
                    this.fileNavigator.setDir(dir, (shared_, public_) => { if (callback) callback(shared_, public_) })
                } else {
                    console.log("no file navigator!")
                }

                if (this.pathNavigator != null) {
                    this.pathNavigator.setDir(dir)
                } else {
                    console.log("no path navigator!")
                }

                if (this.filesListView != null) {
                    this.filesListView.setDir(dir)
                } else {
                    console.log("no file list view!")
                }

                if (this.filesIconView) {
                    this.filesIconView.setDir(dir)
                } else {
                    console.log("no file icon view!")
                }

                // set the user dir...
                this.setDir(dir)

                // display the root dir...
                Backend.eventHub.publish("__set_dir_event__", { dir: dir, file_explorer_id: this.id }, true)


            }, (err) => {
                this.onerror;
                this.resume();
                console.log(err);
            }, this.globule)

        }

        // this.displayWaitMessage("load " + root)

        // read the root dir...
        if (AccountController.account == undefined) {
            displayAuthentication("Authentication required to access the resource.", globule, () => {
                let root = "/users/" + AccountController.account.getId() + "@" + AccountController.account.getDomain()
                readRootDir(root)
            })
        } else {
            let root = "/users/" + AccountController.account.getId() + "@" + AccountController.account.getDomain()
            readRootDir(root)
        }

        let applicatonDir = "/applications/" + window.location.pathname.split('/')[1];
        readRootDir(applicatonDir)

    }

    // The connection callback.
    connectedCallback() {

    }

    getRoot() {
        if (!this.root) {
            return ""
        }
        let root = this.root.path
        let values = root.split("/")
        return "/" + values[1] + "/" + values[2]
    }

    playVideo(file) {

        this.style.zIndex = 1;
        let video = null
        if (file.videos) {
            video = file.videos[0]
        }

        if (file.titles) {
            video = file.titles[0]
        }

        playVideo(file.getPath(), null, () => {

        }, video, this.globule)
    }

    playAudio(file) {

        // hide the content.
        this.style.zIndex = 1;

        TitleController.getFileAudiosInfo(file, audios => {
            if (audios) {
                playAudio(file.getPath(), () => { }, () => { }, audios[0], this.globule)
            }
        })

    }

    /**
     * Create a link(shortcut) to a given file.
     * @param {*} file The file to create the shortcut from
     * @param {*} dest 
     * @param {*} globule 
     */
    createLink(file, dest, globule) {

        let fileName = file.getPath().substring(file.getPath().lastIndexOf("/") + 1)
        if (fileName.indexOf(".") > 0) {
            fileName = fileName.substring(0, fileName.indexOf("."))
        }

        generatePeerToken(globule, token => {

            let rqst = new CreateLnkRequest
            rqst.setName(fileName + ".lnk")
            rqst.setPath(dest)
            rqst.setLnk(file.toString())

            globule.fileService.createLnk(rqst, { domain: globule.domain, token: token }).then(() => {
                globule.eventHub.publish("reload_dir_event", dest, false);
            })
                .catch(err => displayError(err, 3000))
        })

    }

    readFile(file) {

        // hide the content.
        this.filesListView.hide()
        this.filesIconView.hide()
        this.fileReader.style.display = "block"

        // Display the video only if the path match the video player /applications vs /users
        this.fileReader.read(file)
    }

    showShareWizard(wizard) {

        wizard.onclose = () => {
            this.displayView(this.__dir__)
        }

        // hide the content.
        this.filesListView.hide()
        this.filesIconView.hide()
        this.fileReader.style.display = "none"

        this.appendChild(wizard)
    }

    showImage(file) {

        // hide the content.
        this.filesListView.hide()
        this.filesIconView.hide()
        this.fileReader.style.display = "none"

        // Display the image viewer...
        this.imageViewer.style.display = "block"

        // Set the image viewer size.
        this.imageViewer.width = this.fileSelectionPanel.offsetWidth
        this.imageViewer.height = this.fileSelectionPanel.offsetHeight

        // Here I will set the active image.
        for (var i = 0; this.imageViewer.children.length; i++) {
            if (this.imageViewer.children[i].name == file.getPath()) {
                this.imageViewer.activeImage(getElementIndex(this.imageViewer.children[i]))
                break
            }
        }

        // refresh the image browser.
        this.imageViewer.redraw()
    }

    displayView(dir) {
        this.filesListView.__dir__ = dir
        this.filesIconView.__dir__ = dir

        this.filesIconView.menu.close()
        this.filesListView.menu.close()

        if (this.fileUploaderBtn.classList.contains("active")) {
            this.filesListView.hide()
            this.filesIconView.hide()
            this.appendChild(FileExplorer.fileUploader)

        } else if (this.filesListBtn.classList.contains("active")) {
            this.filesListView.show()
            this.filesIconView.hide()
            if (FileExplorer.fileUploader.parentNode) {
                FileExplorer.fileUploader.parentNode.removeChild(FileExplorer.fileUploader)
            }

        } else {
            this.filesListView.hide()
            this.filesIconView.show()
            if (FileExplorer.fileUploader.parentNode) {
                FileExplorer.fileUploader.parentNode.removeChild(FileExplorer.fileUploader)
            }

        }
    }

    loadImages(dir, callback) {
        // get all images in the directory
        let images_ = []
        for (var i = 0; i < dir.getFilesList().length; i++) {
            let f = dir.getFilesList()[i]
            if (f.getMime().startsWith("image")) {
                images_.push(f)
            }
        }

        // Initialyse images from the server.
        let index = 0;
        let images = [];

        // Set the images in the image viewer.
        if (images_.length > 0) {
            FileController.getImage((images) => {
                for (var i = 0; i < images.length; i++) {
                    let img = images[i]
                    img.name = images_[i].getPath()
                    img.slot = "images"
                    img.draggable = false;
                    let exist = false;
                    for (var j = 0; j < this.imageViewer.children.length; j++) {
                        if (this.imageViewer.children[j].name == img.name) {
                            exist = true;
                            break
                        }
                    }

                    // append image only if is not already there...
                    if (!exist) {
                        this.imageViewer.addImage(img)
                    }
                }
                // Init the images...
                this.imageViewer.populateChildren();

                // call when finish...
                if (callback)
                    callback()
            }, images, images_, index, this.globule)
        }
    }

    setDir(dir, callback) {

        if (!FileController.validateDirAccess(dir)) {
            return
        }

        // Set back the list and icon view
        this.displayView(dir)

        this.fileReader.style.display = "none"
        this.imageViewer.style.display = "none";
        this.permissionManager.style.display = "none"

        this.imageViewer.innerHTML = "";

        // Set back the view when the image viewer is close.
        this.imageViewer.onclose = () => {
            this.displayView()
        }

        this.fileReader.onclose = () => {
            this.displayView()
        }

        this.loadImages(dir, callback)

        if (this.backNavigationBtn != null) {
            this.backNavigationBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-disabled)")
        }
        if (this.fowardNavigationBtn != null) {
            this.fowardNavigationBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-disabled)")
        }
        if (this.upwardNavigationBtn != null) {
            this.upwardNavigationBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-disabled)")
        }

        // Append the dir in the list of 
        if (this.navigations.indexOf(dir.getPath()) == -1) {
            this.navigations.push(dir.getPath()) // set the path in the navigation.
        }

        if (this.navigations.length > 2 && this.lstNavigationBtn != null) {
            this.lstNavigationBtn.style.display = "block"
            let navigationLst = null
            if (this.lstNavigationBtn.parentNode.children.length == 1) {
                // Here I will set the navigation list.
                navigationLst = document.createElement("paper-card")
                navigationLst.className = "directories-selector"
                navigationLst.style.display = "none"
                navigationLst.style.flexDirection = "column"
                navigationLst.style.position = "absolute"
                navigationLst.style.padding = "5px"
                navigationLst.style.zIndex = "100";
                navigationLst.style.top = title.offsetHeight + "px"
                navigationLst.style.left = "0px"
                navigationLst.style.backgroundColor = "var(--surface-color)"
                navigationLst.style.color = "var(--primary-text-color)"
                this.lstNavigationBtn.parentNode.appendChild(navigationLst)
                this.lstNavigationBtn.onclick = () => {
                    if (navigationLst.style.display == "flex") {
                        navigationLst.style.display = "none"
                    } else {
                        navigationLst.style.display = "flex"
                    }
                }

                navigationLst.onmouseleave = () => {
                    navigationLst.style.display = "none"
                }

            } else {
                navigationLst = this.lstNavigationBtn.parentNode.children[1]
            }

            navigationLst.innerHTML = "";
            let range = document.createRange()

            for (let path of this.navigations) {
                if (path.indexOf(".hidden") == -1) {
                    let html = `
                    <div style="display: flex; align-items: center;">
                        <iron-icon style="height: 16px;"></iron-icon><div> ${path.split("/").pop()} </div>
                    </div>
                `
                    navigationLst.appendChild(range.createContextualFragment(html));
                    let index = navigationLst.children.length - 1
                    let navigationLine = navigationLst.children[index]
                    let _index = this.navigations.indexOf(dir.getPath())
                    if (index < _index) {
                        navigationLine.children[0].icon = "icons:arrow-back"
                    } else if (index > _index) {
                        navigationLine.children[0].icon = "icons:arrow-forward"
                    } else {
                        navigationLine.children[0].icon = "icons:check"
                    }

                    navigationLine.onmouseover = () => {
                        navigationLine.style.cursor = "pointer"
                        navigationLine.style.setProperty("background-color", "var( --surface-color)")
                        navigationLine.children[0].style.setProperty("background-color", "var( --surface-color)")
                        navigationLine.children[1].style.setProperty("background-color", "var( --surface-color)")
                    }

                    navigationLine.onmouseleave = () => {
                        navigationLine.style.cursor = "default"
                        navigationLine.style.setProperty("background-color", "var(--surface-color)")
                        navigationLine.children[0].style.setProperty("background-color", "var(--surface-color)")
                        navigationLine.children[1].style.setProperty("background-color", "var(--surface-color)")
                    }

                    navigationLine.onclick = () => {
                        navigationLst.style.display = "none"
                        this.publishSetDirEvent(this.navigations[index])
                    }
                }
            }


            let index = this.navigations.indexOf(dir.getPath())
            if (index > 0) {
                this.backNavigationBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-active)")
            }

            if (index < this.navigations.length - 1) {
                this.fowardNavigationBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-active)")
            }
        }

        this.path = dir.getPath();

        if (this.path.split("/").length > 2 && this.upwardNavigationBtn != null) {
            this.upwardNavigationBtn.style.setProperty("--iron-icon-fill-color", "var(--palette-action-active)")
        }

    }

    hideActions() {
        this.shadowRoot.querySelector(".card-actions").style.display = "none";
    }

    delete() {
        for (let evt in this.listeners) {
            Backend.eventHub.unSubscribe(evt, this.listeners[evt])
        }
    }
}

customElements.define('globular-file-explorer', FileExplorer)