import getUuidByString from "uuid-by-string";
import { PersonEditor } from "./personEditor";
import { displayError, displayMessage, generatePeerToken } from "../../backend/backend";
import { PermissionsManager } from "../permissionManager/permissionManager";
import { EditableStringList } from "../list";
import { CreatePersonRequest, CreateTitleRequest, Person, Poster, UpdateTitleMetadataRequest } from "globular-web-client/title/title_pb";

/**
 * The title infos editor.
 */
export class TitleInfoEditor extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(title, titleInfosDisplay) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.titleInfosDisplay = titleInfosDisplay

        let imageUrl = "" // in case the video dosent contain any poster info...
        if (title.getPoster())
            imageUrl = title.getPoster().getContenturl()

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container {
                display: flex;
                margin-top: 15px;
                margin-bottom: 15px;
            }

            .action-div{
                display: flex;
                justify-content: end;
                border-top: 2px solid;
                border-color: var(--palette-divider);
            }

            .button-div{
                display: table-cell;
                vertical-align: top;
            }

            .label{
                font-size: 1rem;
                padding-right: 10px;
                min-width: 150px;
            }

            div, paper-input, iron-autogrow-textarea {
                font-size: 1rem;
            }

            paper-button {
                font-size: 1rem;
            }

            a {
                color: var(--palette-divider);
            }

            select {
                background: var(--palette-background-default); 
                color: var(--palette-text-accent);
                border:0px;
                outline:0px;
            }

        </style>
        <div id="container">
            <div style="display: flex; flex-direction: column; justify-content: flex-start;  margin-left: 15px;">
                <div style="display: flex; flex-direction: column; margin: 5px;">
                    <globular-image-selector label="cover" url="${imageUrl}"></globular-image-selector>
                </div>
                
            </div>

            <div style="display: flex; flex-direction: column; width: 100%;">

                <div style="display: table; flex-grow: 1; margin-left: 20px; border-collapse: collapse; margin-top: 20px; margin-bottom: 10px;">
                    <div style="display: table-row; border-bottom: 1px solid var(--palette-divider)" >
                        <div class="label" style="display: table-cell; font-weight: 450; border-bottom: 1px solid var(--palette-divider)">Title</div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Id:</div>
                        <div style="display: table-cell; width: 100%;"  id="title-id-div">${title.getId()}</div>
                        <paper-input style="display: none; width: 100%;" value="${title.getId()}" id="title-id-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-title-id-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Title:</div>
                        <div style="display: table-cell; width: 100%;"  id="title-name-div">${title.getName()}</div>
                        <paper-input style="display: none; width: 100%;" value="${title.getName()}" id="title-name-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-title-name-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; vertical-align: top;">Synopsis:</div>
                        <div id="title-description-div" style="display: table-cell;width: 100%; padding-bottom: 10px;" >${title.getDescription()}</div>
                        <iron-autogrow-textarea id="title-description-input"  style="display: none; border: none; width: 100%;" value="${title.getDescription()}"></iron-autogrow-textarea>
                        <div class="button-div">
                            <paper-icon-button id="edit-title-description-btn" style="vertical-align: top;" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;" id="title-year-row">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Year:</div>
                        <div style="display: table-cell; width: 100%;"  id="title-year-div">${title.getYear()}</div>
                        <paper-input style="display: none; width: 100%;" type="number" value="${title.getYear()}" id="title-year-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-title-year-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Type:</div>
                        <div style="display: table-cell; width: 100%;"  id="title-type-div">${title.getType()}</div>
                        <select style="display: none; width: 100%;" id="title-type-select" no-label-float>
                            <option id="movie-type-option">Movie</option>
                            <option id="serie-type-option">TVSeries</option>
                            <option id="episode-type-option">TVEpisode</option>
                        </select>
                        <div class="button-div">
                            <paper-icon-button id="edit-title-type-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row; ${title.getType() != "TVEpisode" ? "display:none" : ""}" id="title-serie-row" >
                        <div class="label" style="display: table-cell; font-weight: 450; ">Serie:</div>
                        <div style="display: table-cell; width: 100%;"  id="title-serie-div">${title.getSerie()}</div>
                        <paper-input style="display: none; width: 100%;" value="${title.getSerie()}" id="title-serie-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-title-serie-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row; ${title.getType() != "TVEpisode" ? "display:none" : ""}" id="title-season-row">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Season:</div>
                        <div style="display: table-cell; width: 100%;"  id="title-season-div">${title.getSeason()}</div>
                        <paper-input  type="number" style="display: none; width: 100%;" value="${title.getSeason()}" id="title-season-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-title-season-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row; ${title.getType() != "TVEpisode" ? "display:none" : ""}" id="title-episode-row">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Episode:</div>
                        <div style="display: table-cell; width: 100%;"  id="title-episode-div">${title.getEpisode()}</div>
                        <paper-input  type="number" style="display: none; width: 100%;" value="${title.getEpisode()}" id="title-episode-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-title-episode-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450;">Genres:</div>
                        <div id="title-genres-div" style="display: table-cell; width: 100%;"></div>
                    </div>
                    
                </div>

                <div id="directors-table" style="flex-grow: 1; margin-left: 20px; border-collapse: collapse;">
                <div style="display: table-row;  border-bottom: 1px solid var(--palette-divider);  margin-bottom: 10px;">
                        <div class="label" style="display: table-cell; font-weight: 450;">Directors</div>
                        <div style="display: table-cell; width: 100%;" ></div>
                        <div class="button-div" style="position: relative;">
                            <paper-icon-button id="add-directors-btn" icon="social:person-add"></paper-icon-button>
                        </div>
                    </div>
                    <slot name="directors"></slot>
                </div>

                <div id="writers-table" style="flex-grow: 1; margin-left: 20px; border-collapse: collapse;">
                <div style="display: table-row;  border-bottom: 1px solid var(--palette-divider);  margin-bottom: 10px;">
                        <div class="label" style="display: table-cell; font-weight: 450;">Writers</div>
                        <div style="display: table-cell; width: 100%;" ></div>
                        <div class="button-div" style="position: relative;">
                            <paper-icon-button id="add-writers-btn" icon="social:person-add"></paper-icon-button>
                        </div>
                    </div>
                    <slot name="writers"></slot>
                </div>

                <div id="actors-table" style="flex-grow: 1; margin-left: 20px; border-collapse: collapse;">
                    <div style="display: table-row;  border-bottom: 1px solid var(--palette-divider);  margin-bottom: 10px;">
                        <div class="label" style="display: table-cell; font-weight: 450;">Actors</div>
                        <div style="display: table-cell; width: 100%;" ></div>
                        <div class="button-div" style="position: relative;">
                            <paper-icon-button id="add-actors-btn" icon="social:person-add"></paper-icon-button>
                        </div>
                    </div>
                    <slot name="actors"></slot>
                </div>

            </div>
        </div>
        <iron-collapse class="permissions" id="collapse-panel" style="display: flex; flex-direction: column; margin: 5px;">
        </iron-collapse>
        <div class="action-div" style="${this.isShort ? "display: none;" : ""}">
            <paper-button id="edit-permissions-btn" title="set who can edit this title informations">Permissions</paper-button>
            <span style="flex-grow: 1;"></span>
            <paper-button id="save-indexation-btn">Save</paper-button>
            <paper-button id="cancel-indexation-btn">Cancel</paper-button>
        </div>
        `

        // Here I will initialyse Casting...
        title.getDirectorsList().forEach(p => {
            this.appendPersonEditor(p, title, "directors")
        })

        title.getWritersList().forEach(p => {
            this.appendPersonEditor(p, title, "writers")
        })

        title.getActorsList().forEach(p => {
            this.appendPersonEditor(p, title, "actors")
        })

        let addActorsBtn = this.shadowRoot.querySelector("#add-actors-btn")
        addActorsBtn.onclick = () => {
            let globule = title.globule
            let indexPath = globule.config.DataPath + "/search/titles"
            this.addCasting(addActorsBtn.parentNode, title, "Acting", indexPath)
        }

        let addWritersBtn = this.shadowRoot.querySelector("#add-writers-btn")
        addWritersBtn.onclick = () => {
            let globule = title.globule
            let indexPath = globule.config.DataPath + "/search/titles"
            this.addCasting(addWritersBtn.parentNode, title, "Writing", indexPath)
        }

        let addDirectorsBtn = this.shadowRoot.querySelector("#add-directors-btn")
        addDirectorsBtn.onclick = () => {
            let globule = title.globule
            let indexPath = globule.config.DataPath + "/search/titles"
            this.addCasting(addDirectorsBtn.parentNode, title, "Directing", indexPath)
        }

        let editPemissionsBtn = this.shadowRoot.querySelector("#edit-permissions-btn")
        let collapse_panel = this.shadowRoot.querySelector("#collapse-panel")

        this.permissionManager = new PermissionsManager()
        this.permissionManager.permissions = null
        this.permissionManager.globule = title.globule
        this.permissionManager.setPath(title.getId())
        this.permissionManager.setResourceType = "title_info"

        // toggle the collapse panel when the permission manager panel is close.
        this.permissionManager.onclose = () => {
            collapse_panel.toggle();
        }

        // I will display the permission manager.
        editPemissionsBtn.onclick = () => {
            collapse_panel.appendChild(this.permissionManager)
            collapse_panel.toggle();
        }

        // Here I will set the interaction...
        this.shadowRoot.querySelector("#cancel-indexation-btn").onclick = () => {
            let parent = this.parentNode
            parent.removeChild(this)
            parent.appendChild(titleInfosDisplay)
        }

        // Delete the postser/cover image.
        this.shadowRoot.querySelector("globular-image-selector").ondelete = () => {
            title.getPoster().setContenturl("")
        }

        // Select new image.
        this.shadowRoot.querySelector("globular-image-selector").onselectimage = (imageUrl) => {
            if (title.getPoster() == null) {
                let poster = new Poster()
                title.setPoster(poster)
            }
            title.getPoster().setContenturl(imageUrl)
        }

        // Set the list selector.
        let tileGenresDiv = this.shadowRoot.querySelector("#title-genres-div")
        let videoGenresList = new EditableStringList(title.getGenresList())
        tileGenresDiv.appendChild(videoGenresList)


        // The title name
        let editVideoNameBtn = this.shadowRoot.querySelector("#edit-title-name-btn")
        let videoNameInput = this.shadowRoot.querySelector("#title-name-input")
        let videoNameDiv = this.shadowRoot.querySelector("#title-name-div")

        editVideoNameBtn.onclick = () => {
            videoNameInput.style.display = "table-cell"
            videoNameDiv.style.display = "none"
            setTimeout(() => {
                videoNameInput.focus()
                videoNameInput.inputElement.inputElement.select()
            }, 100)
        }

        videoNameInput.onblur = () => {
            videoNameInput.style.display = "none"
            videoNameDiv.style.display = "table-cell"
            videoNameDiv.innerHTML = videoNameInput.value
        }

        // The title id
        let editVideoIdBtn = this.shadowRoot.querySelector("#edit-title-id-btn")
        let videoIdInput = this.shadowRoot.querySelector("#title-id-input")
        let videoIdDiv = this.shadowRoot.querySelector("#title-id-div")

        editVideoIdBtn.onclick = () => {
            videoIdInput.style.display = "table-cell"
            videoIdDiv.style.display = "none"
            setTimeout(() => {
                videoIdInput.focus()
                videoIdInput.inputElement.inputElement.select()
            }, 100)
        }

        videoIdInput.onblur = () => {
            videoIdInput.style.display = "none"
            videoIdDiv.style.display = "table-cell"
            videoIdDiv.innerHTML = videoIdInput.value
        }

        // The title year
        let editVideoYearBtn = this.shadowRoot.querySelector("#edit-title-year-btn")
        let videoYearInput = this.shadowRoot.querySelector("#title-year-input")
        let videoYearDiv = this.shadowRoot.querySelector("#title-year-div")

        editVideoYearBtn.onclick = () => {
            videoYearInput.style.display = "table-cell"
            videoYearDiv.style.display = "none"
            setTimeout(() => {
                videoYearInput.focus()
                videoYearInput.inputElement.inputElement.select()
            }, 100)
        }

        videoYearInput.onblur = () => {
            videoYearInput.style.display = "none"
            videoYearDiv.style.display = "table-cell"
            videoYearDiv.innerHTML = videoYearInput.value
        }

        // The title episode
        let editEpisodeBtn = this.shadowRoot.querySelector("#edit-title-episode-btn")
        let videoEpisodeInput = this.shadowRoot.querySelector("#title-episode-input")
        let videoEpisodeDiv = this.shadowRoot.querySelector("#title-episode-div")

        editEpisodeBtn.onclick = () => {
            videoEpisodeInput.style.display = "table-cell"
            videoEpisodeDiv.style.display = "none"
            setTimeout(() => {
                videoEpisodeInput.focus()
                videoEpisodeInput.inputElement.inputElement.select()
            }, 100)
        }

        videoEpisodeInput.onblur = () => {
            videoEpisodeInput.style.display = "none"
            videoEpisodeDiv.style.display = "table-cell"
            videoEpisodeDiv.innerHTML = videoEpisodeInput.value
        }

        // The title season
        let editSeasonBtn = this.shadowRoot.querySelector("#edit-title-season-btn")
        let videoSeasonInput = this.shadowRoot.querySelector("#title-season-input")
        let videoSeasonDiv = this.shadowRoot.querySelector("#title-season-div")

        editSeasonBtn.onclick = () => {
            videoSeasonInput.style.display = "table-cell"
            videoSeasonDiv.style.display = "none"
            setTimeout(() => {
                videoSeasonInput.focus()
                videoSeasonInput.inputElement.inputElement.select()
            }, 100)
        }

        videoSeasonInput.onblur = () => {
            videoSeasonInput.style.display = "none"
            videoSeasonDiv.style.display = "table-cell"
            videoSeasonDiv.innerHTML = videoSeasonInput.value
        }


        // The title serie
        let editSerieBtn = this.shadowRoot.querySelector("#edit-title-serie-btn")
        let videoSerieInput = this.shadowRoot.querySelector("#title-serie-input")
        let videoSerieDiv = this.shadowRoot.querySelector("#title-serie-div")

        editSerieBtn.onclick = () => {
            videoSerieInput.style.display = "table-cell"
            videoSerieDiv.style.display = "none"
            setTimeout(() => {
                videoSerieInput.focus()
                videoSerieInput.inputElement.inputElement.select()
            }, 100)
        }

        videoSerieInput.onblur = () => {
            videoSerieInput.style.display = "none"
            videoSerieDiv.style.display = "table-cell"
            videoSerieDiv.innerHTML = videoSerieInput.value
        }

        // The title type
        let editTypeBtn = this.shadowRoot.querySelector("#edit-title-type-btn")
        let videoTypeSelect = this.shadowRoot.querySelector("#title-type-select")
        let videoTypeDiv = this.shadowRoot.querySelector("#title-type-div")

        if (title.getType() == "Movie") {
            this.shadowRoot.querySelector("#movie-type-option").selected = true
            this.shadowRoot.querySelector("#serie-type-option").selected = false
            this.shadowRoot.querySelector("#episode-type-option").selected = false
        } else if (title.getType() == "TVEpisode") {
            this.shadowRoot.querySelector("#movie-type-option").selected = false
            this.shadowRoot.querySelector("#serie-type-option").selected = false
            this.shadowRoot.querySelector("#episode-type-option").selected = true
        } else if (title.getType() == "TVSeries") {
            this.shadowRoot.querySelector("#movie-type-option").selected = false
            this.shadowRoot.querySelector("#serie-type-option").selected = true
            this.shadowRoot.querySelector("#episode-type-option").selected = false
        }

        editTypeBtn.onclick = () => {
            videoTypeSelect.style.display = "table-cell"
            videoTypeDiv.style.display = "none"
        }

        videoTypeSelect.onchange = () => {
            videoTypeSelect.style.display = "none"
            videoTypeDiv.style.display = "table-cell"
            videoTypeDiv.innerHTML = videoTypeSelect.options[videoTypeSelect.selectedIndex].text

            if (videoTypeDiv.innerHTML == "Movie") {
                this.shadowRoot.querySelector("#movie-type-option").selected = true
                this.shadowRoot.querySelector("#serie-type-option").selected = false
                this.shadowRoot.querySelector("#episode-type-option").selected = false
                this.shadowRoot.querySelector("#title-episode-row").style.display = "none"
                this.shadowRoot.querySelector("#title-serie-row").style.display = "none"
                this.shadowRoot.querySelector("#title-season-row").style.display = "none"
            } else if (videoTypeDiv.innerHTML == "TVEpisode") {
                this.shadowRoot.querySelector("#movie-type-option").selected = false
                this.shadowRoot.querySelector("#serie-type-option").selected = false
                this.shadowRoot.querySelector("#episode-type-option").selected = true
                this.shadowRoot.querySelector("#title-episode-row").style.display = "table-row"
                this.shadowRoot.querySelector("#title-serie-row").style.display = "table-row"
                this.shadowRoot.querySelector("#title-season-row").style.display = "table-row"
            } else if (videoTypeDiv.innerHTML == "TVSeries") {
                this.shadowRoot.querySelector("#movie-type-option").selected = false
                this.shadowRoot.querySelector("#serie-type-option").selected = true
                this.shadowRoot.querySelector("#episode-type-option").selected = false
                this.shadowRoot.querySelector("#title-episode-row").style.display = "none"
                this.shadowRoot.querySelector("#title-serie-row").style.display = "none"
                this.shadowRoot.querySelector("#title-season-row").style.display = "none"
            }
        }

        // The video description
        let editVideoDescriptionBtn = this.shadowRoot.querySelector("#edit-title-description-btn")
        let videoVideoDescriptionInput = this.shadowRoot.querySelector("#title-description-input")
        let videoVideoDescriptionDiv = this.shadowRoot.querySelector("#title-description-div")

        editVideoDescriptionBtn.onclick = () => {
            videoVideoDescriptionInput.style.display = "table-cell"
            videoVideoDescriptionDiv.style.display = "none"
            setTimeout(() => {
                videoVideoDescriptionInput.focus()
                videoVideoDescriptionInput.textarea.select()
            }, 100)
        }

        // set back to non edit mode.
        videoVideoDescriptionInput.onblur = () => {
            videoVideoDescriptionInput.style.display = "none"
            videoVideoDescriptionDiv.style.display = "table-cell"
            videoVideoDescriptionDiv.innerHTML = videoVideoDescriptionInput.value
        }

        this.shadowRoot.querySelector("#save-indexation-btn").onclick = () => {

            // So here I will set video values back and update it in the parent...
            title.setId(videoIdInput.value)
            title.setName(videoNameInput.value)
            title.setDescription(videoVideoDescriptionInput.value)
            title.setGenresList(videoGenresList.getItems())
            title.setEpisode(videoEpisodeInput.value)
            title.setSeason(videoSeasonInput.value)
            title.setSerie(videoSerieInput.value)
            title.setYear(videoYearInput.value)
            title.setType(videoTypeSelect.options[videoTypeSelect.selectedIndex].text)

            // set the casting values...
            // casting are interfaced by PersonEditor and PersonEditor are contain 
            // in the casting slot, so I will use children iterator here...
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].save()
            }

            this.saveCasting(title, "Acting", actors => {
                title.setActorsList(actors)
                this.saveCasting(title, "Writing", writers => {
                    title.setWritersList(writers)
                    this.saveCasting(title, "Directing", directors => {
                        title.setDirectorsList(directors)
                        let globule = title.globule
                        generatePeerToken(globule, token => {
                            let indexPath = globule.config.DataPath + "/search/titles"
                            let rqst = new CreateTitleRequest
                            rqst.setTitle(title)
                            rqst.setIndexpath(indexPath)
                            globule.titleService.createTitle(rqst, {domain: globule.domain, token: token })
                                .then(rsp => {
                                    displayMessage("Title Information are updated", 3000)
                                    this.titleInfosDisplay.setTitle(title)

                                    // Now I will save the title metadata...
                                    let rqst = new UpdateTitleMetadataRequest
                                    rqst.setTitle(title)
                                    rqst.setIndexpath(indexPath)
                                    globule.titleService.updateTitleMetadata(rqst, {domain: globule.domain, token: token })
                                        .then(rsp => {
                                            console.log("metadata was update!")
                                        })
                                        .catch(err => displayError(err, 3000))

                                })
                                .catch(err => displayError(err, 3000))

                            let parent = this.parentNode
                            parent.removeChild(this)
                            parent.appendChild(titleInfosDisplay)
                        })
                    })
                })
            })
        }
    }

    // create casting...
    addCasting(parent, title, role, indexPath) {

        let html = `
        <paper-card id="add-casting-panel" style="z-index: 100; background-color: var(--surface-color);  color: var(--palette-text-primary); position: absolute; top: 35px; right: 5px;">
            <div style="display:flex; flex-direction: column;">
                <globular-search-person-input indexpath="${indexPath}" title="search existing cast"></globular-search-person-input>
                <div style="display:flex; justify-content: flex-end;">
                    <paper-button id="new-person-btn" title="Create a new cast">New</paper-button>
                    <paper-button id="cancel-btn" >Cancel</paper-button>
                </div>
            </div>
        </paper-card>
        `

        let addCastingPanel = parent.querySelector("#add-casting-panel")
        if (addCastingPanel != null) {
            return
        }

        let range = document.createRange()
        parent.appendChild(range.createContextualFragment(html))

        let createNewPersonBtn = parent.querySelector("#new-person-btn")
        createNewPersonBtn.onclick = () => {

            let person = new Person()
            person.setId("New Casting")

            let editor = null
            if (role == "Acting") {
                editor = this.appendPersonEditor(person, title, "actors")
            } else if (role == "Writing") {
                editor = this.appendPersonEditor(person, title, "writers")
            } else if (role == "Directing") {
                editor = this.appendPersonEditor(person, title, "directors")
            }

            editor.focus()

            // remove the panel...
            let addCastingPanel = parent.querySelector("#add-casting-panel")
            addCastingPanel.parentNode.removeChild(addCastingPanel)
        }

        // close the search box...
        let searchPersonInput = parent.querySelector("globular-search-person-input")
        searchPersonInput.oneditperson = (person) => {
            person.globule = title.globule
            let personEditor = new PersonEditor(person)
            let uuid = "_" + getUuidByString(person.getId()) + "_edit_panel"

            let div = document.body.querySelector(`#${uuid}`)
            if (div) {
                return // already a panel...
            }

            let html = `
            <style>
                #${uuid}{
                    z-index: 1000;
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: var(--palette-background-default);
                    border-left: 1px solid var(--palette-divider); 
                    border-right: 1px solid var(--palette-divider) rgba(255, 255, 255, 0.12);
                    border-top: 1px solid var(--palette-divider) rgba(255, 255, 255, 0.12);
                    color: var(--palette-text-primary);
                    font-size: 1rem;
                }

            </style>
            <paper-card id="${uuid}">

            </paper-card>
            `

            let range = document.createRange()

            // so here I will append the editor into the body...
            document.body.appendChild(range.createContextualFragment(html))
            div = document.body.querySelector(`#${uuid}`)

            personEditor.onclose = () => {
                div.parentNode.removeChild(div)
            }

            div.appendChild(personEditor)
            personEditor.focus()
        }

        searchPersonInput.onaddcasting = (person) => {

            let globule = person.globule
            let indexPath = globule.config.DataPath + "/search/titles" // TODO set it correctly for video...

            generatePeerToken(globule, token => {

                // remove the video id from casting field.
                if (role == "Acting") {
                    let casting = person.getActingList()
                    if (casting.indexOf(title.getId()) == 0) {
                        casting.push(title.getId())
                    }
                    person.setActingList(casting)
                } else if (role == "Directing") {
                    let casting = person.getDirectingList()
                    if (casting.indexOf(title.getId()) == 0) {
                        casting.push(title.getId())
                    }
                    person.setDirectingList(casting)
                } else if (role == "Writing") {
                    let casting = person.getWritingList()
                    if (casting.indexOf(title.getId()) == 0) {
                        casting.push(title.getId())
                    }
                    person.setDirectingList(casting)
                }

                // Now I will create persons
                let rqst = new CreatePersonRequest
                rqst.setPerson(person)
                rqst.setIndexpath(indexPath)

                // save the person witout the title id...
                globule.titleService.createPerson(rqst, {domain: globule.domain, token: token })
                    .then(rsp => {
                        if (role == "Acting") {
                            // Now I will remove the person from the title casting...
                            let casting = title.getActorsList()

                            // remove it if it was existing.
                            casting = casting.filter(p => p.getId() !== person.getId());

                            casting.push(person)
                            title.setActorsList(casting)

                        } else if (role == "Writing") {
                            // Now I will remove the person from the title casting...
                            let casting = title.getWritersList()

                            // remove it if it was existing.
                            casting = casting.filter(p => p.getId() !== person.getId());
                            casting.push(person)

                            title.setWritersList(casting)
                        } else if (role == "Directing") {
                            // Now I will remove the person from the title casting...
                            let casting = title.getDirectorsList()
                            casting = casting.filter(p => p.getId() !== person.getId());
                            casting.push(person)
                            title.setDirectorsList(casting)
                        }

                        let rqst = new CreateTitleRequest
                        rqst.setTitle(title)
                        rqst.setIndexpath(indexPath)

                        // update the title.
                        globule.titleService.createTitle(rqst, {domain: globule.domain, token: token })
                            .then(rsp => {
                                if (role == "Acting") {
                                    this.appendPersonEditor(person, title, "actors")
                                } else if (role == "Writing") {
                                    this.appendPersonEditor(person, title, "writers")
                                } else if (role == "Directing") {
                                    this.appendPersonEditor(person, title, "directors")
                                }
                                // remove the panel...
                                let addCastingPanel = parent.querySelector("#add-casting-panel")
                                addCastingPanel.parentNode.removeChild(addCastingPanel)

                            }).catch(err => displayError(err, 3000))
                    }).catch(err => displayError(err, 3000))

            })
        }

        searchPersonInput.onclose = parent.querySelector("#cancel-btn").onclick = () => {
            let addCastingPanel = parent.querySelector("#add-casting-panel")
            addCastingPanel.parentNode.removeChild(addCastingPanel)
        }
    }

    // Save casting this will create new person and set value in existing one.
    saveCasting(title, role, callback) {

        let castingEditors = this.querySelectorAll("globular-person-editor")
        let casting = []

        for (var i = 0; i < castingEditors.length; i++) {
            let person = castingEditors[i].getPerson()

            if (role == "Acting") {
                if (castingEditors[i].slot == "actors") {
                    casting.push(person)
                    let casting_ = person.getActingList()
                    if (!casting_) {
                        casting_ = []
                    }

                    if (casting_.indexOf(title.getId()) == -1) {
                        casting_.push(title.getId())
                    }
                    person.setActingList(casting_)
                }
            } else if (role == "Writing") {
                if (castingEditors[i].slot == "writers") {
                    casting.push(person)

                    let casting_ = person.getWritingList()
                    if (!casting_) {
                        casting_ = []
                    }

                    if (casting_.indexOf(title.getId()) == -1) {
                        casting_.push(title.getId())
                    }
                    person.setWritingList(casting_)
                }
            } else if (role == "Directing") {
                if (castingEditors[i].slot == "directors") {
                    casting.push(person)

                    let casting_ = person.getDirectingList()
                    if (!casting_) {
                        casting_ = []
                    }

                    if (casting_.indexOf(title.getId()) == -1) {
                        casting_.push(title.getId())
                    }
                    person.setDirectingList(casting_)
                }
            }
        }

        let globule = title.globule

        let savePerson = (index) => {
            let indexPath = globule.config.DataPath + "/search/titles"
            let p = casting[index]
            index++
            let rqst = new CreatePersonRequest
            rqst.setIndexpath(indexPath)
            rqst.setPerson(p)

            // save the person one by one...
            generatePeerToken(globule, token => {
                globule.titleService.createPerson(rqst, {domain: globule.domain, token: token })
                    .then(rsp => {
                        if (index < casting.length) {
                            savePerson(index)
                        } else {
                            callback(casting)
                        }
                    })
                    .catch(err => {
                        if (index < casting.length) {
                            savePerson(index)
                        } else {
                            callback(casting)
                        }
                    })
            })
        }

        let index = 0
        if (casting.length > 0)
            savePerson(index)
        else
            callback([])

    }

    appendPersonEditor(person, title, slot) {
        person.globule = title.globule
        let uuid = "_" + getUuidByString(person.getId() + slot)

        // Create the person editor.
        let personEditor = this.querySelector(`#${uuid}`)

        if (personEditor == null) {
            personEditor = new PersonEditor(person, title)
            personEditor.id = uuid;

            personEditor.slot = slot

            personEditor.onremovefromcast = (p) => {
                personEditor.parentNode.removeChild(personEditor)
            }

            // Append to the list of casting
            this.appendChild(personEditor)
        }

        return personEditor
    }
}

customElements.define('globular-title-info-editor', TitleInfoEditor)
