import { v4 as uuidv4 } from "uuid";
import { ShareResourceMenu } from "../share/shareResourceMenu";
import { DropdownMenu } from "../menu.js";
import { Backend, displayError, displayMessage, generatePeerToken, getUrl } from "../../backend/backend";
import { TitleController } from "../../backend/title";
import { AccountController } from "../../backend/account";
import { ConvertVideoToHlsRequest, ConvertVideoToMpeg4H264Request, CreateVideoPreviewRequest, CreateVideoTimeLineRequest, StartProcessVideoRequest, UploadVideoRequest } from "globular-web-client/media/media_pb.js";
import { CopyRequest, DeleteDirRequest, GetPublicDirsRequest, MoveRequest, RemovePublicDirRequest, UploadFileRequest } from "globular-web-client/file/file_pb.js";
import { AssociateFileWithTitleRequest, CreateTitleRequest, CreateVideoRequest, Poster, Publisher, Video, Title} from "globular-web-client/title/title_pb.js";
import { DownloadTorrentRequest } from "globular-web-client/torrent/torrent_pb.js";
import { deleteDir, deleteFile, downloadFileHttp, renameFile } from "globular-web-client/api.js";
import getUuidByString from "uuid-by-string";
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';
import { copyToClipboard, FileController } from "../../backend/file";
import { FileExplorer } from "./fileExplorer.js";
import { getCoords } from "../utility.js";


let editMode = ""

/**
 * That class is the base class of FilesListView and FilesIconView
 */
export class FilesView extends HTMLElement {

    constructor() {
        super()

        // must icon or list view one is active at time.
        this._active_ = false

        // The parent file explorer
        this._file_explorer_ = null;

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // The active explorer path.
        this.path = undefined

        // The current directory.
        this.__dir__ = null;

        // The list of files to delete
        this.selected = {};

        // The function will be call in case of error.
        this.onerror = err => displayError(err, 3000);

        // Innitialisation of the layout.
        let id = "_" + uuidv4().split("-").join("_").split("@").join("_");

        // Create the share resource menu.
        this.shareResource = new ShareResourceMenu(this)


        let menuItemsHTML = `
        <globular-dropdown-menu-item  id="file-infos-menu-item" icon="icons:info" text="File Infos" action=""> </globular-dropdown-menu-item>
        <globular-dropdown-menu-item  id="title-infos-menu-item" icon="icons:info" text="Title Infos" action="" style="display: none;"> </globular-dropdown-menu-item>
        <globular-dropdown-menu-item  id="manage-acess-menu-item" icon="folder-shared" text="Manage access" action=""></globular-dropdown-menu-item>
        <globular-dropdown-menu-item  id="refresh-infos-menu-item" icon="icons:refresh" text="Refresh infos" action="" style="display: none;"></globular-dropdown-menu-item>
        <globular-dropdown-menu-item separator="true" id="video-menu-item" icon="maps:local-movies" text="Movies" action="" style="display: none;"> 
            <globular-dropdown-menu>
                <globular-dropdown-menu-item id="generate-timeline-menu-item" icon="maps:local-movies" text="generate timeline" action=""> </globular-dropdown-menu-item>
                <globular-dropdown-menu-item id="generate-preview-menu-item" icon="maps:local-movies" text="generate preview" action=""> </globular-dropdown-menu-item>
                <globular-dropdown-menu-item separator="true" id="to-mp4-menu-item" icon="maps:local-movies" text="convert to mp4" action="" style="display: none;"> </globular-dropdown-menu-item>
                <globular-dropdown-menu-item separator="true" id="to-hls-menu-item" icon="maps:local-movies" text="convert to hls" action="" style="display: none;"> </globular-dropdown-menu-item>
            </globular-dropdown-menu>
        </globular-dropdown-menu-item>
        <globular-dropdown-menu-item separator="true"  id="cut-menu-item"  icon="icons:content-cut" text="Cut" action=""></globular-dropdown-menu-item>
        <globular-dropdown-menu-item id="copy-menu-item" icon="content-copy" text="Copy" action=""></globular-dropdown-menu-item>
        <globular-dropdown-menu-item id="paste-menu-item" icon="icons:content-paste" action="" text="Paste"></globular-dropdown-menu-item>
        <globular-dropdown-menu-item separator="true"  id="rename-menu-item" text="Rename" icon="icons:create" action=""> </globular-dropdown-menu-item>
        <globular-dropdown-menu-item id="delete-menu-item" icon="icons:delete" action="" text="Delete"> </globular-dropdown-menu-item>
        <globular-dropdown-menu-item separator="true"  id="download-menu-item" icon="icons:cloud-download" text="Download" action=""> </globular-dropdown-menu-item>
        <globular-dropdown-menu-item id="open-in-new-tab-menu-item" icon="icons:open-in-new" text="Open in new tab" action="" style="display: none;"> </globular-dropdown-menu-item>
        <globular-dropdown-menu-item id="copy-url-menu-item" icon="icons:link" text="Copy url" action=""> </globular-dropdown-menu-item>
        `

        this.menu = new DropdownMenu("icons:more-vert")
        this.menu.style.zIndex = 1000
        this.menu.className = "file-dropdown-menu"
        this.menu.innerHTML = menuItemsHTML

        this.videMenuItem = this.menu.querySelector("#video-menu-item")
        this.fileInfosMenuItem = this.menu.querySelector("#file-infos-menu-item")
        this.titleInfosMenuItem = this.menu.querySelector("#title-infos-menu-item")
        this.refreshInfoMenuItem = this.menu.querySelector("#refresh-infos-menu-item")
        this.mananageAccessMenuItem = this.menu.querySelector("#manage-acess-menu-item")
        this.renameMenuItem = this.menu.querySelector("#rename-menu-item")
        this.deleteMenuItem = this.menu.querySelector("#delete-menu-item")
        this.downloadMenuItem = this.menu.querySelector("#download-menu-item")
        this.openInNewTabItem = this.menu.querySelector("#open-in-new-tab-menu-item")
        this.copyUrlItem = this.menu.querySelector("#copy-url-menu-item")

        // video conversion menu
        this.generateTimeLineItem = this.menu.querySelector("#generate-timeline-menu-item")
        this.generatePreviewItem = this.menu.querySelector("#generate-preview-menu-item")
        this.toMp4MenuItem = this.menu.querySelector("#to-mp4-menu-item")
        this.toHlsMenuItem = this.menu.querySelector("#to-hls-menu-item")

        // Now the cut copy and paste menu...
        this.cutMenuItem = this.menu.querySelector("#cut-menu-item")
        this.copyMenuItem = this.menu.querySelector("#copy-menu-item")
        this.pasteMenuItem = this.menu.querySelector("#paste-menu-item")


        // Action to do when file is set
        this.menu.setFile = (f) => {

            this.menu.file = f;
            if (this.menu.file.getMime().startsWith("video") || this.menu.file.videos != undefined || this.menu.file.titles != undefined || this.menu.file.getIsDir()) {
                this.titleInfosMenuItem.style.display = "block"
                if (this.menu.file.getMime().startsWith("video")) {
                    this.videMenuItem.style.display = "block"
                    this.openInNewTabItem.style.display = "block"
                    this.generateTimeLineItem.style.display = "block"
                    this.generatePreviewItem.style.display = "block"


                    if (this.menu.file.getName().endsWith(".mp4") || this.menu.file.getName().endsWith(".MP4")) {
                        this.toHlsMenuItem.style.display = "block"
                        this.toMp4MenuItem.style.display = "none"
                    } else if (this.menu.file.mime == "video/hls-stream") {
                        this.toHlsMenuItem.style.display = "none"
                        this.toMp4MenuItem.style.display = "none"
                    } else {
                        this.toHlsMenuItem.style.display = "none"
                        this.toMp4MenuItem.style.display = "block"
                    }
                }
            } else {
                this.videMenuItem.style.display = "none"

                if (this.menu.file.getMime().startsWith("audio")) {
                    this.titleInfosMenuItem.style.display = "block"
                } else {
                    this.titleInfosMenuItem.style.display = "none"
                }

                if (this.menu.file.getIsDir()) {
                    this.refreshInfoMenuItem.style.display = "block"
                    this.videMenuItem.style.display = "block"
                    this.toHlsMenuItem.style.display = "block"
                    this.toMp4MenuItem.style.display = "block"
                    this.generateTimeLineItem.style.display = "none"
                    this.generatePreviewItem.style.display = "none"
                }


                this.openInNewTabItem.style.display = "none"
            }
        }

        this.refreshInfoMenuItem.action = () => {
            let rqst = new StartProcessVideoRequest
            rqst.setPath(this.menu.file.getPath())
            let globule = this._file_explorer_.globule

            generatePeerToken(globule, token => {
                globule.mediaService.startProcessVideo(rqst, { domain: globule.domain, token: token }).then(() => {
                    displayMessage("informations are now updated", 3000)
                })
                    .catch(err => displayError(err, 3000))
            })

            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)

        }

        this.cutMenuItem.action = () => {
            editMode = "cut"
            FileExplorer.paperTray = [];
            for (var key in this.selected) {
                FileExplorer.paperTray.push(this.selected[key].path)
            }

            // Append file to file menu
            if (FileExplorer.paperTray.length == 0) {
                FileExplorer.paperTray.push(this.menu.file.getPath())
            }

            // empty the selection.
            this.selected = {}

            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)
        }

        this.copyMenuItem.action = () => {

            editMode = "copy"

            // So here I will display choice to the user and set the edit mode penpending it response.
            FileExplorer.paperTray = [];
            for (var key in this.selected) {
                FileExplorer.paperTray.push(this.selected[key].path)
            }

            // Append file to file menu
            if (FileExplorer.paperTray.length == 0) {
                FileExplorer.paperTray.push(this.menu.file.getPath())
            }

            // empty the selection.
            this.selected = {}

            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)
        }

        this.pasteMenuItem.action = () => {

            if (editMode == "copy") {
                // Here I will call move on the file manager
                this.copy(this.menu.file.getPath())

            } else if (editMode == "cut") {
                // Here I will call copy
                this.move(this.menu.file.getPath())
            }

            // empty the selection.
            this.selected = {}

            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)
        }

        this.openInNewTabItem.action = () => {
            let globule = this._file_explorer_.globule
            generatePeerToken(globule, token => {
                let url = getUrl(globule)

                this.menu.file.getPath().split("/").forEach(item => {
                    let component = encodeURIComponent(item.trim())
                    if (component.length > 0) {
                        url += "/" + component
                    }
                })

                if (this.menu.file.mime == "video/hls-stream") {
                    url += "/playlist.m3u8"
                }

                url += "?token=" + token
                url += "&application=" + globule.application

                window.open(url, '_blank', "fullscreen=yes");

                // Remove it from it parent... 
                this.menu.close()
                this.menu.parentNode.removeChild(this.menu)
            })

        }

        this.copyUrlItem.action = () => {
            let globule = this._file_explorer_.globule
            generatePeerToken(globule, token => {
                let url = getUrl(globule)
                this.menu.file.getPath().split("/").forEach(item => {
                    let component = encodeURIComponent(item.trim())
                    if (component.length > 0) {
                        url += "/" + component
                    }

                })

                if (this.menu.file.mime == "video/hls-stream") {
                    url += "/playlist.m3u8"
                }

                url += "?token=" + token
                url += "&application=" + globule.application

                copyToClipboard(url)

                displayMessage("url was copy to clipboard...", 3000)

                // Remove it from it parent... 
                this.menu.close()
                this.menu.parentNode.removeChild(this.menu)
            })
        }

        this.downloadMenuItem.action = () => {
            // Here I will create an archive from the selected files and dowload it...
            let files = [];
            let globule = null;
            for (var key in this.selected) {
                files.push(this.selected[key].path)
                globule = this.selected[key].globule
            }

            if (files.length > 0) {
                generatePeerToken(globule, token => {
                    // Create a tempory name...
                    let uuid = "_" + uuidv4().split("-").join("_").split("@").join("_");
                    this._file_explorer_.displayWaitMessage("create archive before for selected files...")
                    createArchive(globule, files, uuid,
                        path => {

                            let url = getUrl(globule)

                            path.split("/").forEach(item => {
                                item = item.trim()
                                if (item.length > 0) {
                                    url += "/" + encodeURIComponent(item)
                                }
                            })

                            if (token) {
                                url += "?token=" + token
                            }
                            url += "&application=" + globule.application

                            // Download the file...
                            this._file_explorer_.displayWaitMessage("start download archive " + path)
                            console.log(url)
                            downloadFileHttp(url, uuid + ".tar.gz",
                                () => {
                                    // Now I will remove the file from the server....
                                    this._file_explorer_.displayWaitMessage("remove archive " + path)
                                    deleteFile(globule, path,
                                        () => {
                                            this._file_explorer_.resume()
                                        },
                                        err => { displayError(err, 3000); this._file_explorer_.resume() }, token)
                                }, token)


                        }, err => { displayError(err, 3000); this._file_explorer_.resume() }, token)
                })

            } else {

                let path = this.menu.file.getPath()
                let name = path.substring(path.lastIndexOf("/") + 1)
                let globule = this.menu.file.globule

                // if the file is a directory I will create archive and download it.
                if (this.menu.file.getIsDir()) {

                    generatePeerToken(globule, token => {
                        this._file_explorer_.displayWaitMessage("create archive before for " + this.menu.file.getPath())
                        createArchive(globule, [path], name,
                            path_ => {

                                let url = getUrl(globule)

                                path_.split("/").forEach(item => {
                                    item = item.trim()
                                    if (item.length > 0) {
                                        url += "/" + encodeURIComponent(item)
                                    }
                                })

                                if (token) {
                                    url += "?token=" + token
                                }

                                url += "&application=" + globule.application

                                // Download the file...
                                this._file_explorer_.displayWaitMessage("start download " + name + ".tar.gz")
                                downloadFileHttp(url, name + ".tar.gz",
                                    () => {
                                        // Now I will remove the file from the server....
                                        deleteFile(globule, path_,
                                            () => {
                                                this._file_explorer_.resume()
                                                this.selected = {} // clear up selected files.
                                            },
                                            err => { displayError(err, 3000); this._file_explorer_.resume(); this.selected = {} }, token)
                                    }, token)
                            }, err => { displayError(err, 3000); this._file_explorer_.resume(); this.selected = {} }, token)
                    })
                } else {
                    // simply download the file.
                    generatePeerToken(globule, token => {
                        let url = getUrl(globule)

                        path.split("/").forEach(item => {
                            item = item.trim()
                            if (item.length > 0) {
                                url += "/" + encodeURIComponent(item)
                            }
                        })

                        if (token) {
                            url += "?token=" + token
                        }
                        url += "&application=" + globule.application

                        downloadFileHttp(url, name,
                            () => {
                                // Now I will remove the file from the server....
                                this.selected = {}
                            }, token), err => { displayError(err, 3000); this.selected = {} }
                    })
                }

            }

            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)
        }

        this.deleteMenuItem.action = () => {
            let files = []
            let fileList = ""
            for (var fileName in this.selected) {
                let file = this.selected[fileName]
                if (file.lnk) {
                    if (!file.getName().endsWith(".lnk")) {
                        file = file.lnk // here I will delete the lnk and not the original file.
                    }
                }
                fileList += `<div>${file.getPath()}</div>`
                files.push(file)
            }

            // if not checked but selected with menu...
            if (fileList.length == 0) {
                let file = this.menu.file
                if (file.lnk) {
                    if (!file.getName().endsWith(".lnk")) {
                        file = file.lnk // here I will delete the lnk and not the original file.
                    }
                }
                fileList += `<div>${file.getPath()}</div>`
                files.push(file)
            }


            let toast = displayMessage(
                `
            <style>
             
              #yes-no-files-delete-box{
                display: flex;
                flex-direction: column;
              }

              #yes-no-files-delete-box globular-files-card{
                padding-bottom: 10px;
              }

              #yes-no-files-delete-box div{
                display: flex;
                padding-bottom: 10px;
              }

                              
              paper-button {
                font-size: .8rem;
              }


            </style>
            <div id="yes-no-files-delete-box">
              <div>Your about to delete files</div>
              <div style="display: flex; flex-direction: column;">
                ${fileList}
              </div>
              <div>Is it what you want to do? </div>
              <div style="justify-content: flex-end; padding-top: 10px; padding-bottom: 0px">
                <paper-button raised id="yes-delete-files">Yes</paper-button>
                <paper-button raised id="no-delete-files">No</paper-button>
              </div>
            </div>
            `,
                15 * 1000 // 15 sec...
            );

            let yesBtn = document.querySelector("#yes-delete-files")
            let noBtn = document.querySelector("#no-delete-files")

            // On yes
            yesBtn.onclick = () => {
                toast.hideToast();

                let success = () => {
                    displayMessage(
                        `<iron-icon icon='delete' style='margin-right: 10px;'></iron-icon><div>
                        Files are now deleted!
                    </div>`,
                        3000
                    );
                    this.selected = {}
                }

                let index = 0;

                let deleteFile_ = () => {
                    let f = files[index]
                    f.setPath(f.getPath().split("\\").join("/"))
                    let path = f.getPath().substring(0, f.getPath().lastIndexOf("/"))
                    index++
                    let globule = this._file_explorer_.globule
                    if (f.getIsDir()) {
                        generatePeerToken(globule, token => {
                            this._file_explorer_.globule.fileService.getPublicDirs(new GetPublicDirsRequest, { domain: this._file_explorer_.globule.domain, token: token })
                                .then(rsp => {
                                    // if the dir is public I will remove it entry from the list and keep the directory...
                                    let dirs = rsp.getDirsList()
                                    if (dirs.includes(f.getPath())) {
                                        const rqst = new RemovePublicDirRequest
                                        rqst.setPath(f.getPath())
                                        generatePeerToken(globule, token => {
                                            globule.fileService.removePublicDir(rqst, { domain: globule.domain, token: token })
                                                .then(rsp => {
                                                    FileController.removeDir(f.getPath(), this._file_explorer_.globule)
                                                    Backend.publish("reload_dir_event", "/public", false);
                                                })
                                                .catch(err => { displayError(err, 3000); })
                                        })
                                    } else {
                                        generatePeerToken(globule, token => {
                                            deleteDir(globule, f.getPath(),
                                                () => {
                                                    FileController.removeDir(f.getPath(), this._file_explorer_.globule)
                                                    this._file_explorer_.globule.eventHub.publish("reload_dir_event", path, false);
                                                    if (index < Object.keys(this.selected).length) {
                                                        deleteFile_()
                                                    } else {
                                                        success()
                                                    }
                                                },
                                                err => { displayError(err, 3000); }, token)
                                        })

                                    }
                                })
                        })

                    } else {
                        deleteFile(globule, f.getPath(),
                            () => {
                                FileController.removeDir(f.getPath(), this._file_explorer_.globule)
                                Backend.publish("reload_dir_event", path, false);
                                if (index < Object.keys(this.selected).length) {
                                    deleteFile_()
                                } else {
                                    success()
                                }
                            },
                            err => { displayError(err, 3000); })
                    }
                }

                // start file deletion...
                deleteFile_()
            }

            noBtn.onclick = () => {
                toast.hideToast();
            }
            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)

        }

        this.renameMenuItem.action = () => {
            // Display the rename input...
            this.menu.rename()
            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)
        }

        this.fileInfosMenuItem.action = () => {
            Backend.eventHub.publish(`display_file_infos_${this._file_explorer_.id}_event`, this.menu.file, true)
            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)
        }

        this.titleInfosMenuItem.action = () => {
            // So here I will create a new permission manager object and display it for the given file.
            let file = this.menu.file
            if (file.videos || file.titles || file.audios) {
                Backend.eventHub.publish(`display_media_infos_${this._file_explorer_.id}_event`, file, true)
            } else {
                console.log("-----------------> 594 ", file)
                if (file.getMime().startsWith("video") || file.getIsDir()) {
                    TitleController.getFileVideosInfo(file, (videos) => {
                        if (videos.length > 0) {
                            Backend.eventHub.publish(`display_media_infos_${this._file_explorer_.id}_event`, file, true)
                            // Remove it from it parent... 
                            if (this.menu.parentNode) {
                                // Remove it from it parent... 
                                this.menu.close()
                                this.menu.parentNode.removeChild(this.menu)
                            }
                        }
                    }, err => {
                        // get the title infos...
                        TitleController.getFileTitlesInfo(file, (titles) => {

                            if (titles.length > 0) {
                                Backend.eventHub.publish(`display_media_infos_${this._file_explorer_.id}_event`, file, true)
                                if (this.menu.parentNode) {
                                    // Remove it from it parent... 
                                    this.menu.close()
                                    this.menu.parentNode.removeChild(this.menu)
                                }
                            }
                        }, err => {

                            // So here no video or title info exist for that file I will propose to the user 
                            // to create a new video infos...
                            // Here I will ask the user for confirmation before actually delete the contact informations.
                            let toast = displayMessage(
                                `
                                <style>
                                    
                                    #yes-no-create-video-info-box{
                                        display: flex;
                                        flex-direction: column;
                                    }

                                    #yes-no-create-video-info-box globular-picture-card{
                                        padding-bottom: 10px;
                                    }

                                    #yes-no-create-video-info-box div{
                                        display: flex;
                                        padding-bottom: 10px;
                                    }
                                    paper-button{
                                        font-size: .8rem;
                                    }

                                </style>
                                <div id="yes-no-create-video-info-box">
                                    <div style="margin-bottom: 10px;">No informations was associated with that video file</div>
                                    <img style="max-height: 100px; object-fit: contain; width: 100%;" src="${file.getThumbnail()}"></img>
                                    <span style="font-size: .95rem; text-align: center;">${file.getPath().substring(file.getPath().lastIndexOf("/") + 1)}</span>
                                    <div style="margin-top: 10px;">Do you want to create video/movie information? </div>
                                    <div style="justify-content: flex-end;">
                                        <paper-button raised id="yes-create-video-info">Yes</paper-button>
                                        <paper-button raised id="no-create-video-info">No</paper-button>
                                    </div>
                                </div>
                                `,
                                60 * 1000 // 60 sec...
                            );

                            let yesBtn = document.querySelector("#yes-create-video-info")
                            let noBtn = document.querySelector("#no-create-video-info")

                            // On yes
                            yesBtn.onclick = () => {

                                // So here I will ask witch type of information the user want's to generate, title, video or audio...
                                toast.hideToast();

                                let toast_ = displayMessage(
                                    `
                                        <style>

                                        </style>

                                        <div style="display: flex; flex-direction: column;">
                                            <div>
                                                Please select the kind of information to create...
                                            </div>
                                            <img style="max-height: 100px; object-fit: contain; width: 100%; margin-top: 15px;" src="${file.getThumbnail()}"></img>
                                            <paper-radio-group selected="video-option" style="margin-top: 15px;">
                                                <paper-radio-button id="video-option" name="video-option"><span title="simple video ex. youtube">Video</span></paper-radio-button>
                                                <paper-radio-button id="title-option" name="title-option"><span title="Movie">Movie or TV Episode/Serie</span></paper-radio-button>
                                            </paper-radio-group>
                                            <div style="justify-content: flex-end; margin-top: 20px;">
                                                <paper-button raised id="yes-create-info">Ok</paper-button>
                                                <paper-button raised id="no-create-info">Cancel</paper-button>
                                            </div>
                                        </div>
                                        `
                                )

                                let videoOption = toast_.toastElement.querySelector("#video-option")
                                let titleOption = toast_.toastElement.querySelector("#title-option")

                                let okBtn = toast_.toastElement.querySelector("#yes-create-info")
                                let cancelBtn = toast_.toastElement.querySelector("#no-create-info")

                                okBtn.onclick = () => {
                                    toast_.hideToast();
                                    if (videoOption.checked) {
                                        this.createVideoInformations(file, (videoInfo) => {
                                            file.videos = [videoInfo]
                                            Backend.eventHub.publish(`display_media_infos_${this._file_explorer_.id}_event`, file, true)
                                            if (this.menu.parentNode) {
                                                // Remove it from it parent... 
                                                this.menu.close()
                                                this.menu.parentNode.removeChild(this.menu)
                                            }

                                        })
                                    } else if (titleOption.checked) {
                                        this.createTitleInformations(file, (titleInfo) => {
                                            file.titles = [titleInfo]
                                            Backend.eventHub.publish(`display_media_infos_${this._file_explorer_.id}_event`, file, true)
                                            if (this.menu.parentNode) {
                                                // Remove it from it parent... 
                                                this.menu.close()
                                                this.menu.parentNode.removeChild(this.menu)
                                            }
                                        })
                                    }
                                }

                                cancelBtn.onclick = () => {
                                    toast_.hideToast();
                                }

                            }

                            noBtn.onclick = () => {
                                toast.hideToast();
                            }

                        })
                    }, this._file_explorer_.globule)
                } else if (file.getMime().startsWith("audio")) {
                    getAudioInfo(file, (audios) => {
                        if (audios.length > 0) {
                            file.audios = audios // keep in the file itself...
                            Backend.eventHub.publish(`display_media_infos_${this._file_explorer_.id}_event`, file, true)
                            // Remove it from it parent... 
                            this.menu.close()
                            this.menu.parentNode.removeChild(this.menu)
                        }
                    })
                }
            }
        }

        this.mananageAccessMenuItem.action = () => {
            // So here I will create a new permission manager object and display it for the given file.
            Backend.eventHub.publish(`display_permission_manager_${this._file_explorer_.id}_event`, this.menu.file, true)
            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)
        }

        this.generateTimeLineItem.action = () => {
            // Generate the video time line...
            let rqst = new CreateVideoTimeLineRequest
            rqst.setWidth(180)
            rqst.setFps(0.2)
            let globule = this._file_explorer_.globule
            let path = this.menu.file.getPath()

            // Set the users files/applications
            if (this.menu.file.getPath().startsWith("/users") || this.menu.file.getPath().startsWith("/applications")) {
                path = globule.config.DataPath + "/files" + this.menu.file.getPath()
            }

            rqst.setPath(path)
            displayMessage("Create timeline for file at path </br>" + path, 3500)
            generatePeerToken(globule, token => {
                globule.mediaService.createVideoTimeLine(rqst, { domain: globule.domain, token: token })
                    .then(rsp => {
                        displayMessage("Timeline is created </br>" + path, 3500)
                    })
                    .catch(err => {
                        displayError(err, 3000);
                    })
            })

            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)

        }

        this.generatePreviewItem.action = () => {
            // Generate the video preview...
            let rqst = new CreateVideoPreviewRequest
            rqst.setHeight(128)
            rqst.setNb(20)
            let globule = this._file_explorer_.globule
            let file = this.menu.file
            let path = file.getPath()


            // Set the users files/applications
            if (this.menu.file.getPath().startsWith("/users") || file.getPath().startsWith("/applications")) {
                path = globule.config.DataPath + "/files" + file.getPath()
            }

            rqst.setPath(path)
            displayMessage("Create preview for file at path </br>" + path, 3500)
            generatePeerToken(globule, token => {
                globule.mediaService.createVideoPreview(rqst, { domain: globule.domain, token: token })
                    .then(rsp => {
                        displayMessage("Preview are created </br>" + path, 3500)
                        Backend.publish("refresh_dir_evt", file.getPath().substring(0, file.getPath().lastIndexOf("/")), false);
                    })
                    .catch(err => {
                        displayError(err, 3000);
                    })
            })
            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)
        }

        this.toMp4MenuItem.action = () => {
            let rqst = new ConvertVideoToMpeg4H264Request
            let file = this.menu.file
            let path = file.getPath()

            let globule = this._file_explorer_.globule
            // Set the users files/applications
            if (file.getPath().startsWith("/users") || file.getPath().startsWith("/applications")) {
                path = globule.config.DataPath + "/files" + file.getPath()
            }
            rqst.setPath(path)

            displayMessage("Convert file at path </br>" + path, 3500)
            generatePeerToken(globule, token => {
                globule.mediaService.convertVideoToMpeg4H264(rqst, { domain: globule.domain, token: token })
                    .then(rsp => {
                        displayMessage("Conversion done </br>" + path, 3500)
                        globule.eventHub.publish("refresh_dir_evt", file.getPath().substring(0, file.getPath().lastIndexOf("/")), false);
                    })
                    .catch(err => {
                        displayError(err, 3000);
                    })
            })
            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)

        }

        this.toHlsMenuItem.action = () => {
            let rqst = new ConvertVideoToHlsRequest
            let file = this.menu.file
            let path = file.getPath()
            let globule = this._file_explorer_.globule
            // Set the users files/applications
            if (file.getPath().startsWith("/users") || file.getPath().startsWith("/applications")) {
                path = globule.config.DataPath + "/files" + file.getPath()
            }
            rqst.setPath(path)

            displayMessage("Convert file at path </br>" + path, 3500)
            generatePeerToken(globule, token => {
                globule.mediaService.convertVideoToHls(rqst, { domain: globule.domain, token: token })
                    .then(rsp => {
                        displayMessage("Conversion done </br>" + path, 3500)
                        Backend.publish("refresh_dir_evt", file.getPath().substring(0, file.getPath().lastIndexOf("/")), false);
                    })
                    .catch(err => {
                        displayError(err, 3000);
                    })
            })

            // Remove it from it parent... 
            this.menu.close()
            this.menu.parentNode.removeChild(this.menu)
        }

        this.shadowRoot.innerHTML = `
          <style>
             

              table {
                  text-align: left;
                  position: relative;
                  border-collapse: separate; /* Don't collapse */
                  border-spacing: 0;
              }
              
              table th,
              table td {
                /* Apply a left border on the first <td> or <th> in a row */
                border-right: 1px solid  var(--palette-action-disabled);
              }

              table th:last-child,
              table td:last-child {
                /* Apply a left border on the first <td> or <th> in a row */
                border-right: none;
              }
              
              thead {
                  display: table-header-group;
                  vertical-align: middle;
                  border-color: inherit;
              }

              tbody {
                  display: table-row-group;
                  vertical-align: middle;
                  border-color: inherit;
              }

              tr {
                  display: table-row;
                  vertical-align: inherit;
                  border-color: inherit;
                  color: var(--primary-text-color);
              }

              td {
                  display: table-cell;
                  vertical-align: inherit;
              }

              th, td {
                  padding: 0.25rem;
                  min-width: 150px;
                  padding-left: 5px;
              }
               
              th {
                  z-index: 100;
                  position: sticky;
                  background-color: var(--surface-color);
                  top: 0; /* Don't forget this, required for the stickiness */
              }

              .files-list-view-header {
                  padding-left: 5px;
                  padding-right: 5px;
              }

              .files-list-view-info {
                  padding: 2px;
              }

              .files-view-div{
                  display: flex;
                  flex-direction: column;
                  background-color: var(--surface-color);
                  color: var(--primary-text-color);
                  position: absolute;
                  top: 0px;
                  left: 0px;
                  bottom: 0px;
                  padding-bottom: 0px;
                  right: 5px;
                  overflow: auto;
              }

              popup-menu-element {
                background-color: var(--surface-color); 
                color: var(--primary-text-color);
              }

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

          </style>

          <div class="files-view-div no-select" /*oncontextmenu="return false;"*/ id="${id}">
          </div>
          `
        // get the div.
        this.div = this.shadowRoot.getElementById(id)

        // Create an observer instance
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === "attributes" && mutation.attributeName === "style") {
                    // Check if the display property changed to 'none'
                    const displayValue = getComputedStyle(this.div).display;
                    if (displayValue === "none") {
                        console.log("The display property changed to 'none'.");
                        this.menu.close()
                        if (this.menu.parentNode)
                            this.menu.parentNode.removeChild(this.menu)
                    }
                }
            }
        });

        // Configuration for the observer
        const config = { attributes: true, attributeFilter: ["style"] };

        // Start observing the target node
        observer.observe(this.div, config);

        this.div.onscroll = () => {
            if (this.div.scrollTop == 0) {
                this.div.style.boxShadow = ""
                this.div.style.borderTop = ""
            } else {
                this.div.style.boxShadow = "inset 0px 5px 6px -3px rgb(0 0 0 / 40%)"
                this.div.style.borderTop = "1px solid var(--palette-divider)"
            }

            // remove the menu...
            this.menu.close()
            if (this.menu.parentNode)
                this.menu.parentNode.removeChild(this.menu)
        }


        /** Remove the menu */
        this.div.onmouseover = () => {
            if (!this.menu.isOpen()) {
                if (this.menu.parentNode != undefined) {
                    this.menu.parentNode.removeChild(this.menu)
                }
            }

            let fileIconDivs = this.div.querySelectorAll(".file-icon-div")
            for (var i = 0; i < fileIconDivs.length; i++) {
                fileIconDivs[i].classList.remove("active")
            }
        }

        this.div.onclick = () => {
            this.menu.close()
            if (this.menu.parentNode != undefined) {
                this.menu.parentNode.removeChild(this.menu)
            }
        }

    }

    disconnectedCallback() {
        this.menu.close()
        if (this.menu.parentNode) {
            this.menu.parentNode.removeChild(this.menu)
        }
    }

    setFileExplorer(fileExplorer) {
        this._file_explorer_ = fileExplorer
    }

    /**
     * Copy file to a given path
     * @param {*} path 
     */
    copy(path) {

        let rqst = new CopyRequest
        rqst.setPath(path)
        rqst.setFilesList(FileExplorer.paperTray)

        let globule = this._file_explorer_.globule
        generatePeerToken(globule, token => {
            // Create a directory at the given path.
            globule.fileService
                .copy(rqst, {
                    token: token,
                    domain: globule.domain
                }).then(() => {
                    FileExplorer.paperTray = []
                    editMode = ""
                    FileController.removeDir(path, this._file_explorer_.globule)
                    this._file_explorer_.globule.eventHub.publish("reload_dir_event", path, false);
                })
                .catch(err => {
                    FileExplorer.paperTray = []
                    editMode = ""
                    displayError(err, 3000);
                })
        })
    }

    createAudioInformations(file, callback) {

    }

    createTitleInformations(file, callback) {

        // I will create video description.
        let rqst = new CreateTitleRequest

        let titleInfo = new Title
        let uuid = getUuidByString(file.getName())
        titleInfo.setId(uuid)

        let poster = new Poster
        poster.setContenturl(file.getThumbnail())
        poster.setUrl()
        titleInfo.setPoster(poster)

        let globule = file.globule

        let url = getUrl(globule)
        file.getPath().split("/").forEach(item => {
            item = item.trim()
            if (item.length > 0) {
                url += "/" + encodeURIComponent(item)
            }
        })

        if (file.getIsDir()) {
            titleInfo.setType("TVSeries")
        }

        titleInfo.setUrl(url)

        /** Other info will be set by the user... */
        generatePeerToken(globule, token => {

            // Create the video title info.
            let createTitle = () => {
                rqst.setTitle(titleInfo)
                rqst.setIndexpath(globule.config.DataPath + "/search/titles")

                globule.titleService.createTitle(rqst, { domain: globule.domain, token: token })
                    .then(rsp => {

                        // So here I Will set the file association.
                        let rqst = new AssociateFileWithTitleRequest
                        rqst.setFilepath(file.getPath())
                        rqst.setTitleid(titleInfo.getId())
                        rqst.setIndexpath(globule.config.DataPath + "/search/titles")

                        globule.titleService.associateFileWithTitle(rqst, { domain: globule.domain, token: token })
                            .then(rsp => {
                                titleInfo.globule = globule
                                file.titles = [titleInfo]
                                callback(titleInfo)

                            }).catch(err => displayError(err, 3000))


                    }).catch(err => displayError(err, 3000))
            }

            // Here is the file is not a dir I will evaluate the video duration.
            if (!file.getIsDir()) {
                let vid = document.createElement("video")
                vid.src = url + "?token=" + token
                // wait for duration to change from NaN to the actual duration
                vid.ondurationchange = () => {
                    titleInfo.setDuration(parseInt(vid.duration))
                    createTitle()
                };
            } else {
                createTitle()
            }
        })

    }

    createVideoInformations(file, callback) {
        // I will create video description.
        let rqst = new CreateVideoRequest
        let videoInfo = new Video
        let uuid = getUuidByString(file.getName()) // I will generate a video from the file path...
        videoInfo.setId(uuid)

        let date = new Date()
        videoInfo.setDate(date.toISOString())
        let publisher = new Publisher
        publisher.setId(AccountController.account.getId() + "@" + AccountController.account.getDomain())

        if (AccountController.account.first_name.length > 0)
            publisher.setName(AccountController.account.first_name + " " + AccountController.account.last_name)

        let poster = new Poster
        poster.setContenturl(file.getThumbnail())
        poster.setUrl()
        videoInfo.setPoster(poster)

        videoInfo.setPublisherid(publisher)
        let globule = file.globule

        let url = getUrl(globule)
        file.getPath().split("/").forEach(item => {
            item = item.trim()
            if (item.length > 0) {
                url += "/" + encodeURIComponent(item)
            }
        })
        videoInfo.setUrl(url)


        /** Other info will be set by the user... */
        generatePeerToken(globule, token => {

            let createVideoInfos = () => {
                rqst.setVideo(videoInfo)
                rqst.setIndexpath(globule.config.DataPath + "/search/videos")

                globule.titleService.createVideo(rqst, { domain: globule.domain, token: token })
                    .then(rsp => {
                        // So here I Will set the file association.
                        let rqst = new AssociateFileWithTitleRequest
                        rqst.setFilepath(file.getPath())
                        rqst.setTitleid(videoInfo.getId())
                        rqst.setIndexpath(globule.config.DataPath + "/search/videos")
                        globule.titleService.associateFileWithTitle(rqst, { domain: globule.domain, token: token })
                            .then(rsp => {
                                videoInfo.globule = globule
                                file.videos = [videoInfo]
                                callback(videoInfo)
                            }).catch(err => displayError(err, 3000))

                    }).catch(err => displayError(err, 3000))
            }

            if (!file.getIsDir()) {
                let vid = document.createElement("video")
                vid.src = url + "?token=" + token

                // wait for duration to change from NaN to the actual duration
                vid.ondurationchange = () => {
                    videoInfo.setDuration(parseInt(vid.duration))
                    createVideoInfos()
                };

            } else {
                createVideoInfos()
            }

        })

    }

    /**
     * Move file to a given path...
     * @param {*} path 
     */
    move(path) {
        let rqst = new MoveRequest
        rqst.setPath(path)
        rqst.setFilesList(FileExplorer.paperTray)

        let globule = this._file_explorer_.globule

        generatePeerToken(globule, token => {
            // Create a directory at the given path.
            globule.fileService
                .move(rqst, {
                    token: token,
                    domain: globule.domain
                }).then(() => {
                    for (var i = 0; i < FileExplorer.paperTray.length; i++) {
                        let f = FileExplorer.paperTray[i]
                        let path_ = f.substring(0, f.lastIndexOf("/"))
                        FileController.removeDir(path, this._file_explorer_.globule)

                        Backend.publish("reload_dir_event", path_, false);
                    }
                    FileExplorer.paperTray = []
                    editMode = ""
                    FileController.removeDir(path, this._file_explorer_.globule)
                    Backend.publish("reload_dir_event", path, false);
                })
                .catch(err => {
                    FileExplorer.paperTray = []
                    editMode = ""
                    displayError(err, 3000);
                })
        })
    }

    init() {

        // The the path
        Backend.eventHub.subscribe("__create_link_event__",
            (uuid) => {
                /** Nothin here. */
            },
            (evt) => {
                if (this._file_explorer_.id == evt.file_explorer_id) {
                    if (!this._active_) {
                        return
                    }

                    this._file_explorer_.createLink(evt.file, evt.dest, evt.globule)
                }
            }, true, this
        )

        // The the path
        Backend.eventHub.subscribe("__set_dir_event__",
            (uuid) => {
                /** Nothin here. */
            },
            (evt) => {
                if (this._file_explorer_.id == evt.file_explorer_id) {
                    if (evt.dir) {
                        this.__dir__ = evt.dir
                        this.setDir(evt.dir)
                    }
                }
            }, true, this
        )

        // The drop file event.
        Backend.eventHub.subscribe(`drop_file_${this._file_explorer_.id}_event`, (uuid) => { }, infos => {

            // be sure the parent file explorer has the focus.
            if (this._file_explorer_.style.zIndex != "1000") {
                return;
            }


            // Hide the icon parent div.
            let div = this.div.querySelector("#" + infos.id)
            if (div != undefined) {
                div.parentNode.style.display = "none"
            } else {
                console.log("div with id ", infos.id, "dosent exist in ", this.div)
            }

            if (editMode.length == 0) {
                editMode = "cut"
            }

            FileExplorer.paperTray = [];
            this.selected = {}

            for (var key in this.selected) {
                FileExplorer.paperTray.push(this.selected[key].path)
            }

            if (FileExplorer.paperTray.length == 0) {
                FileExplorer.paperTray.push(infos.file)
            }

            if (infos.domain != this._file_explorer_.globule.domain) {
                let globule = Backend.getGlobule(infos.domain)
                if (editMode == "cut" || editMode == "copy") {
                    FileController.getFile(globule, infos.file, 80, 80, file => {
                        generatePeerToken(globule, token => {
                            // Here I will transfert a single file...

                            let url = getUrl(globule)
                            file.getPath().split("/").forEach(item => {
                                let component = encodeURIComponent(item.trim())
                                if (component.length > 0) {
                                    url += "/" + component
                                }
                            })

                            url += "?token=" + token;
                            url += "&application=" + globule.application

                            // So here I will need to upload the file on remote server...
                            let rqst = new UploadFileRequest
                            rqst.setDest(this.__dir__.getPath())
                            rqst.setName(file.getName())
                            rqst.setUrl(url)
                            rqst.setDomain(infos.domain)
                            rqst.setIsdir(file.getIsDir())

                            generatePeerToken(this._file_explorer_.globule, token_ => {
                                let stream = this._file_explorer_.globule.fileService.uploadFile(rqst, { domain: this._file_explorer_.globule.domain, token: token_ })

                                let action = "Move"
                                if (editMode == "copy") {
                                    action = "Copy"
                                }
                                let toast = displayMessage(`
                                    <div style="display: flex; flex-direction:column;">
                                        <div>${action} <span style="font-style: italic;">${file.getName()}</span></div>
                                        <div id="info-div"></div>
                                        <div id="progress" style="display: flex; width: 100%;">
                                            <paper-progress style="width: 100%;"  value="0" min="0" max="100"> </paper-progress>
                                        </div>
                                    </div>
                                `)

                                let progressBar = toast.toastElement.querySelector("paper-progress")

                                let infoDiv = toast.toastElement.querySelector("#info-div")

                                // Here I will create a local event to be catch by the file uploader...
                                stream.on("data", (rsp) => {
                                    if (rsp.getInfo() != null) {

                                        infoDiv.innerHTML = rsp.getInfo()
                                        if (rsp.getUploaded() == rsp.getTotal()) {
                                            progressBar.setAttribute("indeterminate", "true")
                                        } else {
                                            progressBar.removeAttribute("indeterminate")
                                        }
                                    }
                                    progressBar.value = parseInt((rsp.getUploaded() / rsp.getTotal()) * 100)
                                })

                                stream.on("status", (status) => {
                                    if (status.code === 0) {
                                        toast.hideToast()
                                        // in case of editmode is "cut" I will remove the original file...
                                        if (editMode == "cut") {
                                            if (file.getIsDir()) {
                                                let rqst = new DeleteDirRequest
                                                rqst.setPath(file.getPath())
                                                globule.fileService.deleteDir(rqst, { domain: globule.domain, token: token })
                                                    .then(rsp => {
                                                        FileController.removeDir(f.getPath(), this._file_explorer_.globule)
                                                        globule.eventHub.publish("reload_dir_event", file.getPath(), false);
                                                    })
                                                    .catch(err => displayError(err, 3000))
                                            } else {
                                                let rqst = new DeleteFileRequest
                                                rqst.setPath(file.getPath())
                                                globule.fileService.deleteFile(rqst, { domain: globule.domain, token: token })
                                                    .then(rsp => {
                                                        FileController.removeDir(f.getPath(), this._file_explorer_.globule)
                                                        globule.eventHub.publish("reload_dir_event", file.getPath().substring(0, file.getPath().lastIndexOf("/")), false);
                                                    })
                                                    .catch(err => displayError(err, 3000))
                                            }
                                        }
                                    } else {
                                        displayError(status.details, 3000)
                                    }
                                });
                            })
                        })
                    }, err => displayError(err, 3000))

                } else if (editMode == "lnks") {
                    FileController.getFile(globule, infos.file, 80, 80, file => {
                        Backend.eventHub.publish("__create_link_event__", { file: file, dest: this._file_explorer_.path, file_explorer_id: this._file_explorer_.id, globule: this._file_explorer_.globule }, true)
                    }, err => displayError(err, 3000))
                }
            } else {
                if (editMode == "cut") {
                    this.move(infos.dir)
                } else if (editMode == "copy") {
                    this.copy(infos.dir)
                } else if (editMode == "lnks") {
                    let globule = this._file_explorer_.globule
                    FileController.getFile(globule, infos.file, 80, 80, file => {
                        Backend.eventHub.publish("__create_link_event__", { file: file, dest: this._file_explorer_.path, file_explorer_id: this._file_explorer_.id, globule: this._file_explorer_.globule }, true)
                    }, err => displayError(err, 3000))
                }
            }

        }, true, this)
    }

    clearSelection() {
        this.selected = {}
    }

    rename(parent, f, offset) {

        // parent.style.position = "relative"

        // Here I will use a simple paper-card with a paper input...
        let html = `
                    <style>
                        #rename-file-dialog{
                            display: flex;
                            position: absolute;
                            flex-direction: column;
                            left: 5px;
                            min-width: 200px;
                            z-index: 100;
                        }
    
                        .rename-file-dialog-actions{
                            font-size: .85rem;
                            align-items: center;
                            justify-content: flex-end;
                            display: flex;
                            background-color: var(--surface-color);
                            color: var(--primary-text-color);
                        }

                        .card-content{
                            background-color: var(--surface-color);
                        }

                        .rename-file-dialog-actions{
                            background-color: var(--surface-color);
                        }

                        paper-card{
                            background-color: var(--surface-color);
                            color: var(--primary-text-color);
                        }
    
                    </style>
                    <paper-card id="rename-file-dialog" style="top: ${offset}px;">
                        <div class="card-content">
                            <paper-textarea id="rename-file-input" label="new folder name" value="${f.getName()}"></paper-textarea>
                        </div>
                        <div class="rename-file-dialog-actions">
                            <paper-button id="rename-file-cancel-btn">Cancel</paper-button>
                            <paper-button id="rename-file-ok-btn">Rename</paper-button>
                        </div>
                    </paper-card>
                `
        // only one dialog open at time.
        let renameDialog = document.body.querySelector("#rename-file-dialog")

        if (renameDialog == undefined) {
            let range = document.createRange()
            document.body.appendChild(range.createContextualFragment(html))
            renameDialog = document.body.querySelector("#rename-file-dialog")
            renameDialog.onmouseover = renameDialog.onmouseenter = (evt) => {
                evt.stopPropagation();
            }
        }

        renameDialog.style.top = offset + "px";


        let input = renameDialog.querySelector("#rename-file-input")
        setTimeout(() => {
            input.focus()
            let index = f.getName().lastIndexOf(".")
            if (index == -1) {
                input.inputElement.textarea.select();
            } else {
                input.inputElement.textarea.setSelectionRange(0, index)
            }
        }, 50)

        let cancel_btn = renameDialog.querySelector("#rename-file-cancel-btn")
        let rename_btn = renameDialog.querySelector("#rename-file-ok-btn")

        // simply remove the dialog
        cancel_btn.onclick = (evt) => {
            evt.stopPropagation();
            renameDialog.parentNode.removeChild(renameDialog)
        }

        input.onkeydown = (evt) => {
            if (evt.keyCode == 13) {
                rename_btn.click()
            } else if (evt.keyCode == 27) {
                cancel_btn.click()
            }
        }

        rename_btn.onclick = (evt) => {
            evt.stopPropagation();

            renameDialog.parentNode.removeChild(renameDialog)
            let path = f.getPath().substring(0, f.getPath().lastIndexOf("/"))

            // Now I will rename the file or directory...
            generatePeerToken(this._file_explorer_.globule, token => {
                renameFile(this._file_explorer_.globule, path, input.value, f.getName(),
                    () => {
                        // Refresh the parent folder...
                        FileController.removeDir(path, this._file_explorer_.globule)
                        this._file_explorer_.globule.eventHub.publish("reload_dir_event", path, false);
                    }, err => { displayError(err, 3000); }, token)
            })

        }
    }

    hide() {
        this.div.style.display = "none"
        this.hideMenu()
    }

    hideMenu() {
        this.menu.close()
        if (this.menu.parentNode) {
            this.menu.parentNode.removeChild(this.menu)
        }
    }

    show() {
        this.menu.close()
        this.div.style.display = "block"
    }

    // The ondrop evt...
    ondrop(evt) {
        evt.stopPropagation()

        let lnk = evt.dataTransfer.getData('text/html');

        if (evt.dataTransfer.getData("Url").length > 0) {
            let url = evt.dataTransfer.getData("Url")
            // Here we got an url...
            if (url.endsWith(".torrent") || url.startsWith("magnet:")) {
                let path = this.__dir__.getPath()
                if (path.startsWith("/users/") || path.startsWith("/applications/")) {
                    path = this._file_explorer_.globule.config.DataPath + "/files" + path
                }

                generatePeerToken(this._file_explorer_.globule, token => {
                    let rqst = new DownloadTorrentRequest
                    rqst.setLink(url)
                    rqst.setDest(path)
                    rqst.setSeed(true) // Can be an option in the console interface...

                    // Display the message.
                    this._file_explorer_.globule.torrentService.downloadTorrent(rqst, { domain: this._file_explorer_.globule.domain, token: token })
                        .then(() => {
                            displayMessage("your torrent was added and will start download soon...", 3000)
                            // Here I will 
                        }).catch(err => displayError(err, 3000))
                })

            } else if (url.endsWith(".jpeg") || url.endsWith(".jpg") || url.startsWith(".bpm") || url.startsWith(".gif") || url.startsWith(".png")) {
                // I will get the file from the url and save it on the server in the current directory.
                var getFileBlob = (url, cb) => {
                    generatePeerToken(this._file_explorer_.globule, token => {
                        var xhr = new XMLHttpRequest();
                        xhr.timeout = 1500
                        xhr.open("GET", url);
                        xhr.responseType = "blob";
                        xhr.setRequestHeader("token", token);
                        xhr.setRequestHeader("domain", this._file_explorer_.globule.domain);
                        xhr.addEventListener('load', () => {
                            cb(xhr.response);
                        });
                        xhr.send();
                    })
                };

                var blobToFile = (blob, name) => {
                    blob.lastModifiedDate = new Date();
                    blob.name = name;
                    return blob;
                };

                var getFileObject = (filePathOrUrl, cb) => {
                    getFileBlob(filePathOrUrl, (blob) => {
                        let name = filePathOrUrl.substring(filePathOrUrl.lastIndexOf("/") + 1)
                        cb(blobToFile(blob, name));
                    });
                };

                getFileObject(url, (fileObject) => {
                    generatePeerToken(this._file_explorer_.globule, token => {
                        uploadFiles(this._file_explorer_.globule, token, this.__dir__.getPath(), [fileObject], () => {
                            Backend.eventHub.publish("__upload_files_event__", { dir: this.__dir__, files: [fileObject], lnk: lnk, globule: this._file_explorer_.globule }, true)
                        }, err => displayError(err, 3000))
                    })
                });

            } else {

                // Just beat it!
                // youtube-dl -f mp4 -o "/tmp/%(title)s.%(ext)s" https://www.youtube.com/watch?v=oRdxUFDoQe0&list=PLCD0445C57F2B7F41&index=12&ab_channel=michaeljacksonVEVO
                // In that case I will made use of the fabulous youtube-dl command line.
                let toast = displayMessage(`
                <style>
                   
                </style>
                <div id="select-media-dialog">
                    <span>What kind of file to you want to create?</span>
                    <div style="display: flex; justify-content: center;">
                        <paper-radio-group>
                            <paper-radio-button id="media-type-mp4" name="media-type" checked>Video (mp4)</paper-radio-button>
                            <paper-radio-button id="media-type-mp3"  name="media-type">Audio (mp3)</paper-radio-button>
                        </paper-radio-group>
                    </div>
                    <div style="display: flex; justify-content: flex-end;">
                        <paper-button id="upload-lnk-ok-button">Ok</paper-button>
                        <paper-button id="upload-lnk-cancel-button">Cancel</paper-button>
                    </div>
                </div>
                `, 60 * 1000)

                let mp4Radio = toast.toastElement.querySelector("#media-type-mp4")
                let mp3Radio = toast.toastElement.querySelector("#media-type-mp3")

                mp4Radio.onclick = () => {
                    mp3Radio.checked = !mp3Radio.checked
                }

                mp3Radio.onclick = () => {
                    mp4Radio.checked = !mp3Radio.checked
                }

                let okBtn = toast.toastElement.querySelector("#upload-lnk-ok-button")
                okBtn.onclick = () => {

                    let rqst = new UploadVideoRequest
                    rqst.setDest(this.__dir__.getPath())

                    if (mp3Radio.checked) {
                        rqst.setFormat("mp3")
                    } else {
                        rqst.setFormat("mp4")
                    }
                    rqst.setUrl(url)

                    generatePeerToken(this._file_explorer_.globule, token => {

                        let stream = this._file_explorer_.globule.mediaService.uploadVideo(rqst, { domain: this._file_explorer_.globule.domain, token: token })
                        let pid = -1;

                        // Here I will create a local event to be catch by the file uploader...
                        stream.on("data", (rsp) => {
                            if (rsp.getPid() != null) {
                                pid = rsp.getPid()
                            }

                            // Publish local event.
                            Backend.eventHub.publish("__upload_link_event__", { pid: pid, path: this.__dir__.getPath(), infos: rsp.getResult(), done: false, lnk: lnk, globule: this._file_explorer_.globule }, true);
                        })

                        stream.on("status", (status) => {
                            if (status.code === 0) {
                                Backend.eventHub.publish("__upload_link_event__", { pid: pid, path: this.__dir__.getPath(), infos: "", done: true, lnk: lnk, globule: this._file_explorer_.globule }, true);
                            } else {
                                displayError(status.details, 3000)
                            }
                        });
                    }, err => displayError(err, 3000))
                    toast.hideToast();

                }

                let cancelBtn = toast.toastElement.querySelector("#upload-lnk-cancel-button")
                cancelBtn.onclick = () => {

                    toast.hideToast();
                }

            }

        } else if (evt.dataTransfer.files.length > 0) {
            // So here I will simply upload the files...
            Backend.eventHub.publish("__upload_files_event__", { dir: this.__dir__, files: evt.dataTransfer.files, lnk: lnk, globule: this._file_explorer_.globule }, true)
        } else {

            let html = `
            <style>
                paper-card{
                    background-color: var(--surface-color); 
                    color: var(--primary-text-color);
                    position: absolute;
                    min-width: 140px;
                }

                .menu-item{
                    font-size: 1rem;
                    padding: 2px 5px 2px 5px;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    transition: background 0.2s ease,padding 0.8s linear;
                }

                .menu-item span{
                    margin-left: 10px;
                    flex-grow: 1;
                }

                .menu-item:hover{
                    cursor: pointer;
                    background-color: var(--palette-primary-accent);
                }

            </style>
            <paper-card id="file-actions-menu">

                <div id="copy-menu-item" class="menu-item">
                    <iron-icon icon="icons:content-copy"></iron-icon>
                    <span>Copy</span>
                    <paper-ripple></paper-ripple>
                </div>

                <div id="move-menu-item" class="menu-item">
                    <iron-icon icon="icons:compare-arrows"></iron-icon>
                    <span>Move</span>
                    <paper-ripple></paper-ripple>
                </div>

                <div id="create-lnks-menu-item" class="menu-item">
                    <iron-icon icon="icons:link"></iron-icon>
                    <span>Create lnk's</span>
                    <paper-ripple></paper-ripple>
                </div>

                <div id="cancel-menu-item" class="menu-item">
                    <iron-icon icon="icons:cancel"></iron-icon>
                    <span>Cancel</span>
                    <paper-ripple></paper-ripple>
                </div>

            </paper-card>
            `

            let files = JSON.parse(evt.dataTransfer.getData('files'))
            let id = evt.dataTransfer.getData('id')
            let domain = evt.dataTransfer.getData('domain')

            if (document.getElementById("file-actions-menu")) {
                return; // nothing todo here.
            }

            let range = document.createRange()
            document.body.appendChild(range.createContextualFragment(html))
            let menu = document.getElementById("file-actions-menu")

            let coords = getCoords(this._file_explorer_.filesIconView)

            menu.style.top = coords.top + 44 + "px"
            menu.style.left = coords.left + 10 + "px"

            // connect the move event.
            this._file_explorer_.addEventListener("move", (e) => {
                // console.log(e.detail.cx, e.detail.cy)
                // I will simply recalculate the menu position.
                if (menu.parentNode != undefined) {
                    let coords = getCoords(this._file_explorer_.filesIconView)
                    menu.style.top = coords.top + 44 + "px"
                    menu.style.left = coords.left + 10 + "px"
                }
            });

            let fct = () => {
                if (id.length > 0) {

                    for (var key in this.selected) {
                        FileExplorer.paperTray.push(this.selected[key].path)
                    }

                    files.forEach(f => {
                        Backend.eventHub.publish(`drop_file_${this._file_explorer_.id}_event`, { file: f, dir: this.__dir__.getPath(), id: id, domain: domain }, true)
                    })
                }
            }

            // Now I will set the actions...
            let copyMenuItem = menu.querySelector("#copy-menu-item")
            copyMenuItem.onclick = () => {
                editMode = "copy"
                fct()
                menu.parentNode.removeChild(menu)
            }

            let moveMenuItem = menu.querySelector("#move-menu-item")
            moveMenuItem.onclick = () => {
                editMode = "cut"
                fct()
                menu.parentNode.removeChild(menu)
            }

            let createLnksMenuItem = menu.querySelector("#create-lnks-menu-item")
            createLnksMenuItem.onclick = () => {
                editMode = "lnks"
                fct()
                menu.parentNode.removeChild(menu)
            }

            let cancelMenuItem = menu.querySelector("#cancel-menu-item")
            cancelMenuItem.onclick = () => {
                menu.parentNode.removeChild(menu)
            }
        }

    }
}
