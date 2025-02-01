import { FilesView } from "./filesView.js"
import getUuidByString from "uuid-by-string"
import { FileController } from "../../backend/file"
import {FileIconViewSection} from "./fileIconViewSection.js"
import { AssociateFileWithTitleRequest, CreatePersonRequest, CreateTitleRequest, Person, Poster, Title } from "globular-web-client/title/title_pb.js"
import { displayError, displayMessage, generatePeerToken } from "../../backend/backend"
import '@polymer/iron-icon/iron-icon.js';
import { TitleController } from "../../backend/title"

export class FilesIconView extends FilesView {
    constructor() {
        super()
        this.imageHeight = 80

    }

    /**
     * Display the content of a directory
     * @param {*} dir 
     */
    /**
     * Display the content of a directory
     * @param {*} dir 
     */
    setDir(dir) {

        if(!FileController.validateDirAccess(dir)){
            return
        }
        
        this.div.innerHTML = "";
        let h = this.imageHeight; // the height of the image/icon div
        let w = this.imageHeight;
        let hiddens = {};

        let html = `
        <style>
            #container {
                background-color: var(--surface-color);
                display: flex;
                flex-direction: column;
                padding: 8px;
                height: 100%;
            }



        </style>
        <div id="container" class="no-select">
            <slot></slot>
        </div>
        `

        // Clear the actual content..
        this.innerHTML = ""

        // Create the header.
        this.div.innerHTML = html
        this.container = this.div.querySelector(`#container`);

        this.container.onmouseleave = (evt) => {
            evt.stopPropagation()
        }

        this.container.onclick = (evt) => {
            evt.stopPropagation()
        }

        this.container.ondrop = (evt) => {
            evt.preventDefault()
            this.ondrop(evt)
        }

        this.container.ondragover = (evt) => {
            evt.preventDefault()
            this._file_explorer_.setAtTop()
        }

        let filesByType = {};
        let size = ""
        let mime = "Dossier de fichiers"
        let icon = "icons:folder"


        // get the info div that will contain the information.
        for (let f of dir.getFilesList()) {
            if (f.getName() == "audio.m3u") {
                dir.__audioPlaylist__ = f
            } else if (f.getName() == "video.m3u") {
                dir.__videoPlaylist__ = f
            } else {
                if (!f.getIsDir()) {
                    icon = "editor:insert-drive-file";
                    if (f.getName().endsWith(".lnk")) {
                        // So here I will make little transformation...
                        f.lnk.lnk = f
                        f = f.lnk
                    }

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
                // the first part of the mime type will be use as tile and category of file.
                let fileType = f.getMime().split("/")[0]

                if (f.getIsDir() && fileType.length == 0) {
                    fileType = "folder"

                }
                if (filesByType[fileType] == undefined) {
                    filesByType[fileType] = []
                }

                if (!f.getName().startsWith(".")) {
                    filesByType[fileType].push(f)
                } else if (f.getName().startsWith(".hidden")) {
                    // The hidden dir.
                    if (f.getFilesList() != undefined) {
                        f.getFilesList().forEach(file_ => {
                            let path = file_.getPath().replace("/.hidden/", "/")
                            hiddens[path] = file_
                        })
                    }
                }
            }

            let range = document.createRange()
            // Now I will display files by their categories.
            for (var fileType in filesByType) {
                let section = this.querySelector(`#${fileType}_section`)

                // create the section if it not already exist...
                if (section == undefined && filesByType[fileType].length > 0) {

                    let html = `<globular-file-icon-view-section id="${fileType}_section" filetype="${fileType}"></globular-file-icon-view-section>`
                    this.appendChild(range.createContextualFragment(html))

                    section = this.querySelector(`#${fileType}_section`)
                    section.init(dir, fileType, this)
                }

                // Now I will create the icon file view.
                filesByType[fileType].forEach(file => {

                    let id = "_" + getUuidByString(file.getPath() + "/" + file.getName());
                    if (!section.querySelector("#" + id)) {
                        let html = `<globular-file-icon-view id=${id} height="${h}" width="${w}"></globular-file-icon-view>`
                        section.appendChild(range.createContextualFragment(html))
                        section.updateCount()
                        let fileIconView = section.querySelector(`#${id}`)
                        fileIconView.setFile(file, this)

                        fileIconView.draggable = true;
                        fileIconView.ondragstart = (evt) => {

                            // set the file path...
                            let files = [];
                            for (var key in this.selected) {
                                files.push(this.selected[key].getPath())
                            }

                            if (files.length == 0) {
                                files.push(file.getPath())
                            }

                            evt.dataTransfer.setData('files', JSON.stringify(files));
                            evt.dataTransfer.setData('id', fileIconView.id);
                            evt.dataTransfer.setData('domain', this._file_explorer_.globule.domain);
                        }

                        fileIconView.ondragend = (evt) => {
                            evt.stopPropagation();
                        }

                        // Here I will append the interation.
                        fileIconView.onmouseover = (evt) => {
                            evt.stopPropagation();
                            fileIconView.setActive()
                        }

                        fileIconView.onmouseleave = (evt) => {
                            evt.stopPropagation();
                            let fileIconViews = this.querySelectorAll("globular-file-icon-view")
                            for (var i = 0; i < fileIconViews.length; i++) {
                                fileIconViews[i].resetActive()
                            }
                        }
                    }
                })
            }
        }
    }

    /**
     * Set file info, this will made use of the search engine...
     */
    setFileInfo(info, file) {

        let title = new Title
        let persons_ = {}

        // init person infos...
        let createPersons = (values) => {
            let persons = []
            if (values != undefined) {
                values.forEach(v => {
                    // The value to be store outside the title.
                    let p = new Person
                    p.setId(v.ID)
                    p.setUrl(v.URL)
                    p.setFullname(v.FullName)
                    p.setBiography(v.Biography)
                    p.setPicture(v.Picture)
                    p.setBirthdate(v.BirthDate)
                    p.setBirthplace(v.BirthPlace)
                    persons.push(p)

                    // Needed to save person...
                    persons_[v.ID] = p
                })
            }

            return persons
        }

        // Create title object and set it values from json...
        title.setId(info.ID)
        title.setName(info.Name)
        title.setAkaList(info.AKA)
        title.setDescription(info.Description)
        title.setDuration(info.Duration)
        title.setGenresList(info.Genres)
        title.setNationalitiesList(info.Nationalities)
        title.setRating(parseFloat(info.Rating))
        title.setRatingcount(parseInt(info.RatingCount))
        title.setType(info.Type)

        // Set TVEpisode Season and Episode number.
        if (info.Type == "TVEpisode") {
            title.setSeason(info.Season)
            title.setEpisode(info.Episode)
            title.setSerie(info.Serie)
        }

        title.setUrl(info.URL)
        title.setYear(info.Year)

        title.setDirectorsList(createPersons(info.Directors))
        title.setActorsList(createPersons(info.Actors))
        title.setWritersList(createPersons(info.Writers))

        let poster = new Poster
        poster.setId(info.Poster.ID)
        poster.setUrl(info.Poster.URL)
        poster.setContenturl(info.Poster.ContentURL)
        title.setPoster(poster)

        let indexPath = this._file_explorer_.globule.config.DataPath + "/search/titles"

        // save the title infos
        let createTitle = () => {

            let rqst = new CreateTitleRequest
            rqst.setIndexpath(indexPath)
            rqst.setTitle(title)

            // Now I will create the title info...
            generatePeerToken(this._file_explorer_.globule, token => {
                this._file_explorer_.globule.titleService.createTitle(rqst, {  domain: this._file_explorer_.globule.domain, token: token })
                    .then(rsp => {
                        // Now I will asscociated the file and the title.
                        let rqst_ = new AssociateFileWithTitleRequest
                        rqst_.setFilepath(file.getPath())
                        rqst_.setTitleid(title.getId())
                        rqst_.setIndexpath(indexPath)

                        this._file_explorer_.globule.titleService.associateFileWithTitle(rqst_, { domain: this._file_explorer_.globule.domain, token: token })
                            .then(rsp => {
                                console.log("title was created!")
                                title.globule = this._file_explorer_.globule
                                file.titles = [title]
                            }).catch(err => displayError(err, 3000))

                    }).catch(err => displayError(err, 3000))
            })
        }

        // get the list of person to be save...
        let persons = []
        for (var k in persons_) {
            persons.push(persons_[k])
        }

        // save person infos...
        let createPerson = (index) => {
            let p = persons[index]
            index++
            let rqst = new CreatePersonRequest
            rqst.setIndexpath(indexPath)
            rqst.setPerson(p)
            generatePeerToken(this._file_explorer_.globule, token => {
                this._file_explorer_.globule.titleService.createPerson(rqst, { domain: this._file_explorer_.globule.domain, token: token })
                    .then(() => {
                        if (index < persons.length) {
                            createPerson(index)
                        } else {
                            createTitle()
                        }
                    }).catch(() => {
                        if (index < persons.length) {
                            createPerson(index)
                        } else {
                            createTitle()
                        }
                    })
            })
        }

        // save person and titles after...
        if (persons.length > 0) {
            let index = 0;
            createPerson(index)
        } else {
            createTitle()
        }

    }


    // Set imdb title info.
    setImdbTitleInfo(url, file) {

        let matchs = url.match(/tt\d{5,8}/);
        if (matchs.length == 0) {
            return // nothing to todo...
        }

        TitleController.getImdbInfo(matchs[0], (info) => {
            // So here I will get the information from imdb and propose to assciate it with the file.
            let toast = displayMessage(`
                    <style>
                       
                    </style>
                    <div id="select-media-dialog">
                        <div>Your about to associate <span id="title-type" style="max-width: 300px;"></span> <a id="title-name" target="_blank"></a></div>
                        <div>with file <span style="font-style: italic;" id="file-path"></span></div>
                        <div style="display: flex; flex-direction: column; justify-content: center;">
                            <img style="width: 185.31px; align-self: center; padding-top: 10px; padding-bottom: 15px;" id="title-poster"> </img>
                        </div>
                        <div>Is that what you want to do? </div>
                        <div style="display: flex; justify-content: flex-end;">
                            <paper-button id="imdb-lnk-ok-button">Ok</paper-button>
                            <paper-button id="imdb-lnk-cancel-button">Cancel</paper-button>
                        </div>
                    </div>
                    `, 60 * 1000)


            let cancelBtn = toast.toastElement.querySelector("#imdb-lnk-cancel-button")
            cancelBtn.onclick = () => {
                toast.hideToast();
            }

            toast.toastElement.querySelector("#title-type").innerHTML = info.Type
            toast.toastElement.querySelector("#title-name").innerHTML = info.Name
            toast.toastElement.querySelector("#title-name").href = info.URL
            toast.toastElement.querySelector("#title-poster").src = info.Poster.ContentURL
            toast.toastElement.querySelector("#file-path").innerHTML = file.name

            let okBtn = toast.toastElement.querySelector("#imdb-lnk-ok-button")
            okBtn.onclick = () => {
                this.setFileInfo(info, file)
                toast.hideToast();
            }


        }, err => displayError(err, 3000), this._file_explorer_.globule)

    }
}

customElements.define('globular-files-icon-view', FilesIconView)
