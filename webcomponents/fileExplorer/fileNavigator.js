import { Backend, displayError, generatePeerToken } from "../../backend/backend";
import getUuidByString from "uuid-by-string"
import { FileController } from "../../backend/file";
import { FileInfo, GetPublicDirsRequest } from "globular-web-client/file/file_pb";
import { AccountController } from "../../backend/account";
import { GetSharedResourceRqst, SubjectType } from "globular-web-client/rbac/rbac_pb";

export class FileNavigator extends HTMLElement {
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // The active explorer path.
        this.path = undefined

        // The function will be call in case of error.
        this.onerror = err => displayError(err, 3000);

        // List of listeners...
        this.navigationListener = ""

        // The file explorer.
        this._file_explorer_ = undefined

        // Here I will keep the list of div in memory to be able to 
        // reload it...
        this.dirs = {}

        // The directory displayed in the navigator.
        this.dir = null

        // The root div.
        this.div = null

        // The control width
        this.width = 360

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

            #file-navigator-div{
                min-width: ${this.width}px;
                user-select: none;
            }

            /** On smaller display **/
            @media (max-width: 801px) {
                #file-navigator-div{
                    min-height: 150px;
                }
            }

            select {
                padding: 5px;
                background-color: var(--surface-color);
                color: var(--primary-text-color);
                font-size: 1.0rem;
                font-family: var(--font-family);
                width: 100%;
                border: none;
                outline: none;
                scroll-behavior: smooth;
            }

        </style>

        <div id="file-navigator-div" style="">
            <select></select>
            <div id="user-files-div"></div>
            <div id="shared-files-div"></div>
            <div id="public-files-div"></div>
        </div>
        `

        // The get the root div.
        this.div = this.shadowRoot.querySelector("#file-navigator-div ");
        this.userDiv = this.shadowRoot.querySelector("#user-files-div");
        this.sharedDiv = this.shadowRoot.querySelector("#shared-files-div");
        this.publicDiv = this.shadowRoot.querySelector("#public-files-div");

        // Set the peers list.
        let peers = Backend.getGlobules();
        let selectElement = this.shadowRoot.querySelector("select");

        // Clear any existing options (optional)
        selectElement.innerHTML = "";

        // Populate the select element with options
        peers.forEach((p, index) => {
            let option = document.createElement("option");
            option.value = index;
            option.innerHTML = p.address;
            option.peer = p;
            selectElement.appendChild(option);
        });

        // Add an event listener to handle option changes
        selectElement.addEventListener("change", (event) => {
            Backend.eventHub.publish("start_peer_evt_", event.target.peer, true)
        });

        // Trigger the event for the initial selection
        if (peers.length > 0) {
            selectElement.value = 0; // Set initial value to the first option
            selectElement.dispatchEvent(new Event("change")); // Trigger the change event
        }

        // Select the peer.
        this.shadowRoot.querySelector("select").onchange = () => {
            let index = this.shadowRoot.querySelector("select").value
            this.userDiv.innerHTML = ""
            this._file_explorer_.setGlobule(peers[index])
        }
    }

    // The connection callback.
    connectedCallback() {

        if (this._file_explorer_ != undefined) {
            let index = 0
            let peers = Backend.getGlobules()
            peers.forEach(p => {
                if (p.address == this._file_explorer_.globule.address) {
                    this.shadowRoot.querySelector("select").value = index;
                }
                index++
            })
        }

    }


    hide() {
        this.div.style.display = "none"
    }

    show() {
        this.div.style.display = ""
    }

    // remove div and reload it from it content...
    reload(dir, callback) {
        if (this.dirs[this._file_explorer_.globule.domain + "@" + dir.getPath()] != undefined) {
            let div = this.div.querySelector(`#${this.dirs[this._file_explorer_.globule.domain + "@" + dir.getPath()].id}`)

            // force reading from the server...
            FileController.removeDir(dir.getPath(), this._file_explorer_.globule)

            if (div != null) {
                let parent = div.parentNode
                let level = this.dirs[this._file_explorer_.globule.domain + "@" + dir.getPath()].level
                if (div != null) {
                    parent.removeChild(div)
                    delete this.dirs[this._file_explorer_.globule.domain + "@" + dir.getPath()]
                }
                // reload the div...
                this.initPublic(callback)
                dir.setPath(dir.getPath().split("\\").join("/"))
                if (dir.getPath() != "/public") {
                    this.initTreeView(dir, parent, level)
                }
            }
        }
    }


    // Init the tree view.
    initTreeView(dir, div, level) {

        if (dir.getName().startsWith(".") || dir.getMime() == "video/hls-stream") {
            return;
        }

        if (div == undefined) {
            return
        }

        // old id value was dir.getPath().split("/").join("_").split("@").join("_")
        let id = "_" + getUuidByString(dir.getPath()).split("-").join("_")

        // keep it in memory 
        this.dirs[this._file_explorer_.globule.domain + "@" + dir.getPath()] = { id: id, level: level }

        // Remove existing values and renit the tree view...
        let dir_ = this.div.querySelector(`#${id}`)
        if (dir_ == undefined) {
            let name = dir.getPath().split("/").pop();

            if (name.startsWith(AccountController.account.getId())) {
                // display more readable folder name...
                name = name.replace(AccountController.account.getId(), AccountController.account.getName())
            }

            let offset = 10 * level
            let html = `
                <style>
                    #${id}:hover{
                        cursor: pointer;
                    }

                    .directory-lnk{
                        display: flex;
                        align-items: center;
                        overflow: hidden;
                    }

                    .directory-lnk iron-icon {
                        height: 24px;
                        width: 24px;
                    }

                    .folder-name-span{
                        max-width: 350px;
                        margin-left: 5px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        user-select: none;

                    }
                </style>

                <div id="${id}" style="padding-left: ${offset}px;">
                    <div style="display: flex; padding-top: 5px; padding-bottom: 5px; align-items: center;  position: relative;">
                        <iron-icon id="${id}_expand_btn" icon="icons:chevron-right" style="--iron-icon-fill-color:var(--palette-action-disabled);"></iron-icon>
                        <iron-icon id="${id}_shrink_btn" icon="icons:expand-more" style="--iron-icon-fill-color:var(--palette-action-active); display: none;"></iron-icon>
                        <div id="${id}_directory_lnk" class="directory-lnk">
                            <iron-icon id="${id}_directory_icon" icon="icons:folder"></iron-icon>
                            <span class="folder-name-span" title="${name}" style="margin-left: 5px;"> ${name}</span>
                        </div>
                        <paper-ripple recenters></paper-ripple>
                    </div>
                    <div id="${id}_files_div" style="display: none;">
                    <div>
                </div>
            `
            let range = document.createRange()
            div.appendChild(range.createContextualFragment(html));


        }

        /** Now i will get the */


        let shrinkBtn = this.shadowRoot.getElementById(id + "_shrink_btn")
        if (shrinkBtn) {
            shrinkBtn.onmouseover = () => {
                shrinkBtn.style.cursor = "pointer"
            }

            shrinkBtn.onmouseleave = () => {
                shrinkBtn.style.cursor = "default"
            }
        }

        let expandBtn = this.shadowRoot.getElementById(id + "_expand_btn")
        if (expandBtn) {
            expandBtn.onmouseover = () => {
                expandBtn.style.cursor = "pointer"
            }

            expandBtn.onmouseleave = () => {
                expandBtn.style.cursor = "default"
            }
        }

        let dirLnk = this.shadowRoot.getElementById(id + "_directory_lnk")
        let dirIco = this.shadowRoot.getElementById(id + "_directory_icon")
        if (dirLnk) {
            dirLnk.ondragover = (evt) => {
                evt.preventDefault()
                dirIco.icon = "icons:folder-open"
            }

            dirLnk.ondragleave = () => {
                dirIco.icon = "icons:folder"
            }

            dirLnk.ondrop = (evt) => {
                evt.stopPropagation();
                let files = JSON.parse(evt.dataTransfer.getData('files'))
                let id = evt.dataTransfer.getData('id')
                let domain = evt.dataTransfer.getData('domain')
                this.selected = {}
                dirIco.icon = "icons:folder"
                if (id.length > 0) {
                    files.forEach(f => {
                        Backend.eventHub.publish(`drop_file_${id}_event`, { file: f, dir: dir.getPath(), id: id, domain: domain }, true)
                    })
                }
            }
        }

        let hasSubdir = false;
        let fileDiv = this.shadowRoot.getElementById(id + "_files_div")
        if (dir.getMime() != "video/hls-stream") {
            for (var f of dir.getFilesList()) {
                if (f.getIsDir()) {
                    this.initTreeView(f, fileDiv, level + 1);
                    hasSubdir = true;
                }
            }
        }

        // hide the button if no sub-document exist.
        if (expandBtn) {
            if (!hasSubdir) {
                expandBtn.style.visibility = "hidden"
            } else {
                expandBtn.style.visibility = "visible"
            }
            expandBtn.onclick = (evt) => {
                evt.stopPropagation();
                shrinkBtn.style.display = "block"
                fileDiv.style.display = "block"
                dirIco.icon = "icons:folder-open"

                if (dir.getFilesList().length > 0) {
                    expandBtn.style.display = "none";
                } else {
                    expandBtn.style.visibility = "hidden";
                }
            }

        }

        // Now actions.
        if (shrinkBtn) {
            shrinkBtn.onmouseover = () => {
                shrinkBtn.style.cursor = "pointer"
            }

            shrinkBtn.onmouseleave = () => {
                shrinkBtn.style.cursor = "default"
            }

            shrinkBtn.onclick = (evt) => {
                evt.stopPropagation();
                shrinkBtn.style.display = "none";
                fileDiv.style.display = "none"
                dirIco.icon = "icons:folder"

                if (dir.getFilesList().length > 0) {
                    expandBtn.style.display = "block";
                } else {
                    expandBtn.style.visibility = "visible";
                }
            }
        }

        if (dirLnk) {
            dirLnk.onclick = (evt) => {
                evt.stopPropagation();
                this._file_explorer_.publishSetDirEvent(dir.getPath())

                if (this._file_explorer_.informationManager) {
                    if (this._file_explorer_.informationManager.parentNode)
                        this._file_explorer_.informationManager.parentNode.removeChild(this._file_explorer_.informationManager)
                }
            }

            dirLnk.onmouseover = () => {
                dirLnk.style.cursor = "pointer"
            }

            dirLnk.onmouseleave = () => {
                dirLnk.style.cursor = "default"
            }
        }

    }

    // Set the directory.
    setDir(dir, callback) {

        if (!FileController.validateDirAccess(dir)) {
            return
        }

        this.dir = dir;
        this.initTreeView(dir, this.userDiv, 0)

        // Init public list of directories
        this.initPublic(() => {
            // Init shared...
            this.initShared((shared_, public_) => { if (callback) callback(shared_, public_); this._file_explorer_.resume() })
        })
    }

    // Init the public folder...
    initPublic(initCallback) {

        this.publicDiv.innerHTML = ""

        // The public directory will contain a list of directories readable by 
        // any use, permission can also be set on file and directories, but all is 
        // accessible by default.
        this.public_ = new FileInfo
        this.public_.setName("public")
        this.public_.setPath("/public")
        this.public_.setIsDir(true);
        this.public_.setFilesList([]);
        this.public_.setMime("inode/directory");
        // set the mode time as unix time...
        this.public_.setModeTime(new Date().getTime())

        // keep track of all sub-dir...
        //FileController.addPublicDir(this.public_)

        this._file_explorer_.globule.eventHub.subscribe("public_change_permission_event", uuid => { },
            evt => {
                // refresh the shared...
                this.initPublic()
            }, false, this)


        generatePeerToken(this._file_explorer_.globule, token => {
            this._file_explorer_.globule.fileService.getPublicDirs(new GetPublicDirsRequest, { domain: this._file_explorer_.globule.domain, token: token })
                .then(rsp => {
                    let index = 0;
                    let publicDirs = rsp.getDirsList()
                    let initPublicDir = (callback, errorCallback) => {
                        if (publicDirs.length > 0) {
                            if (index < publicDirs.length) {
                                let path = publicDirs[index]
                                // Read the dir content (files and directory informations.)
                                FileController.readDir(path, dir => {
                                    this._file_explorer_.resume()
                                    // used by set dir...
                                    FileController.markAsPublic(dir, path)
                                    this.public_.getFilesList().push(dir)
                                    index++
                                    initPublicDir(callback, err => displayError(err, 3000))
                                }, err => displayError(err, 3000), this._file_explorer_.globule, true)

                            } else {
                                callback()
                            }
                        } else {
                            callback()
                        }
                    }

                    // Init
                    initPublicDir(() => {
                        FileController.addDir(this.public_)
                        this.initTreeView(this.public_, this.publicDiv, 0)
                        if (initCallback) {
                            initCallback()
                        }
                    })
                })
        })
    }



    // Init shared folders
    initShared(initCallback) {

        this.sharedDiv.innerHTML = ""
        this.shared = {}

        // keep track of all sub-dir...
        FileController.clearSharedDirs()

        // The public directory will contain a list of directories readable by 
        // any use, permission can also be set on file and directories, but all is 
        // accessible by default.
        this.shared_ = new FileInfo
        this.shared_.setName("shared")
        this.shared_.setPath("/shared")
        this.shared_.setIsDir(true)
        this.shared_.setFilesList([])
        this.shared_.setMime("")
        this.shared_.setModeTime(new Date())


        // Init the share info
        let initShared = (share, callback) => {
            if(AccountController.account == undefined){
                callback()
                return
            }

            // Try to get the user id...
            let userId = share.getPath().split("/")[2];
            if (userId == AccountController.account.getId() || userId == AccountController.account.getId() + "@" + AccountController.account.getDomain()) {
                callback()
                return // I will not display it...
            } else if (userId.indexOf("@") != -1) {

                AccountController.getAccount(userId, user => {

                    if (this.shared[userId] == undefined) {
                        this.shared[userId] = new FileInfo
                        this.shared[userId].name = user.name
                        this.shared[userId].setPath("/shared/" + userId)
                        this.shared[userId].setIsDir(true)
                        this.shared[userId].setFilesList([])
                        this.shared[userId].setMime("")
                        this.shared[userId].setModeTime(new Date())

                        this.shared_.getFilesList().push(this.shared[userId])

                        this._file_explorer_.globule.eventHub.subscribe(userId + "_change_permission_event", uuid => { },
                            evt => {
                                // refresh the shared...
                                this.initShared()
                            }, false, this)
                    }


                    FileController.readDir(share.getPath(), dir => {

                        this._file_explorer_.resume()

                        // used by set dir...
                        FileController.markAsShare(dir)

                        // From the path I will get the user id who share the file and 
                        // create a local directory if none exist...
                        if (this.shared[userId]) {
                            if (this.shared[userId].getFilesList().find(f => f.getPath() == dir.getPath()) == undefined) {
                                this.shared[userId].getFilesList().push(dir)
                            }
                        }
                        callback()
                    }, err => {
                        // The file is not a directory so the file will simply put in the share.
                        this._file_explorer_.resume();
                        if (err.message.indexOf("is not a directory") != -1) {
                            FileController.getFile(this._file_explorer_.globule, share.getPath(), 100, 64,
                                (f) => {
                                    if (f.getPath().indexOf(".hidden") != -1) {
                                        // In that case I need to append the file in a local dir named hidden.
                                        let hiddenDir = null;
                                        this.shared[userId].getFilesList().forEach(f => {
                                            if (f.name == ".hidden") {
                                                hiddenDir = f
                                            }
                                        })
                                        if (hiddenDir == null) {
                                            hiddenDir = new FileInfo
                                            hiddenDir.setName(".hidden")
                                            hiddenDir.setPath("/shared/" + userId + "/.hidden")
                                            hiddenDir.setIsDir(true)
                                            hiddenDir.setFilesList([f])
                                            hiddenDir.setMime("")
                                            hiddenDir.setModeTime(new Date())
                                            this.shared[userId].getFilesList().push(hiddenDir)

                                        } else {
                                            // append only if it dosent exist....
                                            if (this.shared[userId].getFilesList().find(f_ => f.getPath() == f_.getPath()) == undefined) {
                                                hiddenDir.getFilesList().push(f)
                                            }
                                        }

                                    } else {
                                        if (this.shared[userId].getFilesList().find(f_ => f.getPath() == f_.getPath()) == undefined) {
                                            this.shared[userId].getFilesList().push(f)
                                        }
                                    }
                                    callback()
                                }, err => displayError(err, 3000))
                        }
                    }, this._file_explorer_.globule)
                }, err => {
                    callback()
                })
            } else {
                callback()
            }
        }


        // The account...
        if (AccountController.account != undefined) {


            let rqst = new GetSharedResourceRqst
            rqst.setSubject(AccountController.account.getId() + "@" + AccountController.account.getDomain())
            rqst.setType(SubjectType.ACCOUNT)

            // Get file shared by account.
            let globule = this._file_explorer_.globule
            generatePeerToken(globule, token => {
                globule.rbacService.getSharedResource(rqst, { domain: globule.domain, token: token })
                    .then(rsp => {
                        // Here I need to sync the funtion and init the tree view once all is done...
                        let callback = () => {
                            let s = rsp.getSharedresourceList().pop()
                            if (s != undefined) {
                                initShared(s, callback)
                            } else {

                                for (const id in this.shared) {
                                    let shared = this.shared[id]
                                    // this.initTreeView(shared, this.sharedDiv, 0)
                                    this.initTreeView(this.shared_, this.sharedDiv, 0)
                                    FileController.removeDir(shared.path, this._file_explorer_.globule)
                                }

                                if (initCallback)
                                    initCallback(this.shared, this.public_)

                            }
                        }

                        callback(); // call once
                    })
                    .catch(e => displayError(e, 3000))
            })
        }

    }


}

customElements.define('globular-file-navigator', FileNavigator)
