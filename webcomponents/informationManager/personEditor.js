import getUuidByString from "uuid-by-string"
import { displayError, displaySuccess, displayMessage, Backend, generatePeerToken } from "../../backend/backend"
import '@polymer/iron-icons/editor-icons.js'
import { CreatePersonRequest, CreateTitleRequest, CreateVideoRequest, DeletePersonRequest } from "globular-web-client/title/title_pb"

/**
 * Use to edit title or video casting
 */
export class PersonEditor extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(person, title) {
        super()

        // keep a refrence on the person object.
        this.person = person
        this.titleInfo = title

        Backend.eventHub.subscribe(`delete_${person.getId()}_evt`, l => { }, evt => {
            this.parentNode.removeChild(this)
        }, true)

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Generate a uuid from the person id.
        let uuid = "_" + getUuidByString(person.getId())
        this.uuid = uuid

        let imageUrl = person.getPicture()
        if (!imageUrl) {
            imageUrl = ""
        }

        let bio = person.getBiography()
        try {
            bio = atob(bio)
        } catch (err) {
            bio = person.getBiography()
        }

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container{
                color: var(--primary-text-color);
            }

            .table-cell {
                display: table-cell; 
                width: 100%;
                padding-left: 5px;
            }

            .label{
                font-size: 1rem;
                padding-right: 10px;
                min-width: 150px;
            }

            .button-div{
                display: flex;
                justify-content: end;
            }

            .table-cell a {
                color: var(--primary-text-color);
            }
        </style>

        <div id="container" style="display: flex; flex-grow: 1; margin-left: 20px; flex-direction: column;">
            <div style="display: flex;  border-bottom: 1px solid var(--palette-divider);  margin-bottom: 10px; align-items: center;">
                <paper-icon-button id="collapse-btn"  icon="unfold-less" --iron-icon-fill-color:var(--primary-text-color);"></paper-icon-button>
                <div id="header-text" class="label" style="flex-grow: 1;">${person.getFullname()}</div>
                <div>
                    <paper-icon-button id="edit-${uuid}-person-remove-btn" icon="icons:close"></paper-icon-button>
                </div>
            </div>
            <iron-collapse class="" id="collapse-panel">
                <div style="display: flex; width: 100%;">

                    <div style="display: flex; flex-direction: column; justify-content: flex-start;  margin-right: 20px;">
                        <div style="display: flex; flex-direction: column; margin: 5px;">
                            <globular-image-selector label="Profile Picture" url="${imageUrl}"></globular-image-selector>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; width: 100%;">
                        <div style="display: table; border-collapse: collapse; flex-grow: 1;">
                            <div style="display: table-row;">
                                <div class="label" style="display: table-cell; font-weight: 450; ">Id:</div>
                                <div class="table-cell"  id="${uuid}-person-id-div">${person.getId()}</div>
                                <paper-input style="display: none; width: 100%;" value="${person.getId()}" id="${uuid}-person-id-input" no-label-float></paper-input>
                                <div class="button-div">
                                    <paper-icon-button id="edit-${uuid}-person-id-btn" icon="image:edit"></paper-icon-button>
                                </div>
                            </div>

                            <div style="display: table-row;">
                                <div class="label" style="display: table-cell; font-weight: 450;">Url:</div>
                                <div class="table-cell" id="${uuid}-person-url-div">${person.getUrl()}</div>
                                <paper-input style="display: none; width: 100%;" value="${person.getUrl()}" id="${uuid}-person-url-input" no-label-float></paper-input>
                                <div class="button-div">
                                    <paper-icon-button id="edit-${uuid}-person-url-btn" icon="image:edit"></paper-icon-button>
                                </div>
                            </div>

                            <div style="display: table-row;">
                                <div class="label" style="display: table-cell; font-weight: 450; ">Name:</div>
                                <div class="table-cell"  id="${uuid}-person-name-div">${person.getFullname()}</div>
                                <paper-input style="display: none; width: 100%;" value="${person.getFullname()}" id="${uuid}-person-name-input" no-label-float></paper-input>
                                <div class="button-div">
                                    <paper-icon-button id="edit-${uuid}-person-name-btn" icon="image:edit"></paper-icon-button>
                                </div>
                            </div>

                            <div style="display: table-row;">
                                <div class="label" style="display: table-cell; font-weight: 450; ">Aliases:</div>
                                <div class="table-cell"  id="${uuid}-person-aliases-div">${person.getAliasesList().join(", ")}</div>
                                <paper-input style="display: none; width: 100%;" value="${person.getAliasesList().join(", ")}" id="${uuid}-person-aliases-input" no-label-float></paper-input>
                                <div class="button-div">
                                    <paper-icon-button id="edit-${uuid}-person-aliases-btn" icon="image:edit"></paper-icon-button>
                                </div>
                            </div>

                            <div style="display: table-row;">
                                <div class="label" style="display: table-cell; font-weight: 450; ">Date of birth:</div>
                                <div class="table-cell"  id="${uuid}-person-birthdate-div">${person.getBirthdate()}</div>
                                <paper-input style="display: none; width: 100%;" value="${person.getBirthdate()}" id="${uuid}-person-birthdate-input" no-label-float></paper-input>
                                <div class="button-div">
                                    <paper-icon-button id="edit-${uuid}-person-birthdate-btn" icon="image:edit"></paper-icon-button>
                                </div>
                            </div>

                            <div style="display: table-row;">
                                <div class="label" style="display: table-cell; font-weight: 450; ">Place of birth:</div>
                                <div class="table-cell"  id="${uuid}-person-birthplace-div">${person.getBirthplace()}</div>
                                <paper-input style="display: none; width: 100%;" id="${uuid}-person-birthplace-input" no-label-float></paper-input>
                                <div class="button-div">
                                    <paper-icon-button id="edit-${uuid}-person-birthplace-btn" icon="image:edit"></paper-icon-button>
                                </div>
                            </div>

                            <div style="display: table-row;">
                                <div class="label" style="display: table-cell; font-weight: 450; vertical-align: top;">Biography:</div>
                                <div id="${uuid}-person-biography-div" style="display: table-cell;width: 100%;" >${bio}</div>
                                <div style="display: none; width: 100%;">
                                    <iron-autogrow-textarea id="${uuid}-person-biography-input"  style="border: none; width: 100%;" value="${bio}"></iron-autogrow-textarea>
                                </div>
                                <div class="button-div">
                                    <paper-icon-button id="edit-${uuid}-person-biography-btn" style="vertical-align: top;" icon="image:edit"></paper-icon-button>
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; justify-content: flex-end;">
                            <paper-button id="${uuid}-save-btn" title="save person information">Save</paper-button>
                            <paper-button id="${uuid}-delete-btn" title="delete person information">Delete</paper-button>
                        </div>
                    </div>
                </div>
            </iron-collapse>
        </div>
        `
        // give the focus to the input.
        let container = this.shadowRoot.querySelector("#container")

        let collapse_btn = container.querySelector("#collapse-btn")
        let collapse_panel = container.querySelector("#collapse-panel")
        collapse_btn.onclick = () => {
            if (!collapse_panel.opened) {
                collapse_btn.icon = "unfold-more"
            } else {
                collapse_btn.icon = "unfold-less"
            }
            collapse_panel.toggle();
        }

        let saveCastBtn = container.querySelector(`#${uuid}-save-btn`)
        saveCastBtn.onclick = () => {

            this.save()

            let globule = this.person.globule

            let indexPath = globule.config.DataPath + "/search/videos"
            if (this.slot != "casting") {
                indexPath = globule.config.DataPath + "/search/titles"
            }

            let rqst = new CreatePersonRequest
            rqst.setIndexpath(indexPath)
            rqst.setPerson(this.person)

            if (this.titleInfo) {
                if (this.slot == "casting") {
                    let casting = this.person.getCastingList()
                    casting = casting.filter(e => e !== this.titleInfo.getId());
                    casting.push(this.titleInfo.getId())
                    person.setCastingList(casting)

                    // Set as casting
                    let casting_ = this.titleInfo.getCastingList()
                    if (casting_) {
                        casting_ = casting_.filter(e => e.getId() !== this.person.getId());
                    }
                    casting_.push(this.person)
                    this.titleInfo.setCastingList(casting_)

                } else if (this.slot == "actors") {
                    let casting = this.person.getActingList()
                    casting = casting.filter(e => e !== this.titleInfo.getId());
                    casting.push(this.titleInfo.getId())
                    person.setActingList(casting)

                    // Set as casting
                    let casting_ = this.titleInfo.getActorsList()
                    if (casting_) {
                        casting_ = casting_.filter(e => e.getId() !== this.person.getId());
                    }
                    casting_.push(this.person)
                    this.titleInfo.setActorsList(casting_)
                } else if (this.slot == "writers") {
                    let casting = this.person.getWritingList()
                    casting = casting.filter(e => e !== this.titleInfo.getId());
                    casting.push(this.titleInfo.getId())
                    person.setWritingList(casting)

                    // Set as casting
                    let casting_ = this.titleInfo.getWritersList()
                    if (casting_) {
                        casting_ = casting_.filter(e => e.getId() !== this.person.getId());
                    }
                    casting_.push(this.person)
                    this.titleInfo.setWritersList(casting_)
                } else if (this.slot == "directors") {
                    let casting = this.person.getDirectingList()
                    casting = casting.filter(e => e !== this.titleInfo.getId());
                    casting.push(this.titleInfo.getId())
                    person.setDirectingList(casting)

                    // Set as casting
                    let casting_ = this.titleInfo.getDirectorsList()
                    if (casting_) {
                        casting_ = casting_.filter(e => e.getId() !== this.person.getId());
                    }
                    casting_.push(this.person)
                    this.titleInfo.setDirectorsList(casting_)
                }

            }

            // save the person one by one...
            generatePeerToken(globule, token => {
                globule.titleService.createPerson(rqst, { domain: globule.domain, token: token })
                    .then(rsp => {
                        displaySuccess(this.person.getFullname() + " infos was saved!", 3000)
                    })
                    .catch(err => {
                        displayError(err, 3000)
                    })
            })
        }

        // Remove a person from the cast...
        let removeFromCastBtn = container.querySelector(`#edit-${uuid}-person-remove-btn`)
        removeFromCastBtn.onclick = () => {

            if (title == undefined) {
                // simply remove it from it parent.
                this.parentNode.removeChild(this)
                if (this.onclose) {
                    this.onclose()
                }

                return
            }

            // Here I will remove the panel from it parent.
            if (this.person.getFullname().length == 0) {
                this.parentNode.removeChild(this)
                return
            }

           displayMessage(``,`
            <style>
               
            </style>
            <div id="select-media-dialog">
                <div>Your about to remove <span style="font-size: 1.2rem;">${this.person.getFullname()}</span></div>

                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <img src="${this.person.getPicture()}" style="width: 185.31px; align-self: center; padding-top: 10px; padding-bottom: 15px;" id="title-poster"> </img>
                </div>

                <div>from title ${this.titleInfo.getDescription()}</div>
                <div style="display: flex; flex-direction: column; justify-content: center;">
                    <img src="${this.titleInfo.getPoster().getContenturl()}" style="width: 185.31px; align-self: center; padding-top: 10px; padding-bottom: 15px;" id="title-poster"> </img>
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

            let okBtn = toast.toastElement.querySelector("#imdb-lnk-ok-button")
            okBtn.onclick = () => {

                let globule = person.globule
                let indexPath = globule.config.DataPath + "/search/videos" // TODO set it correctly for video...
                if (this.slot != "casting") {
                    indexPath = globule.config.DataPath + "/search/titles"
                }

                generatePeerToken(globule, token => {

                    // remove the video id from casting field.
                    if (this.slot == "casting") {
                        let casting = person.getCastingList()
                        casting = casting.filter(e => e !== this.titleInfo.getId());
                        person.setCastingList(casting)
                    } else if (this.slot == "actors") {
                        let casting = person.getActingList()
                        casting = casting.filter(e => e !== this.titleInfo.getId());
                        person.setActingList(casting)
                    } else if (this.slot == "writers") {
                        let casting = person.getWritingList()
                        casting = casting.filter(e => e !== this.titleInfo.getId());
                        person.setWritingList(casting)
                    } else if (this.slot == "directors") {
                        let casting = person.getDirectingList()
                        casting = casting.filter(e => e !== this.titleInfo.getId());
                        person.setDirectingList(casting)
                    }

                    let rqst = new CreatePersonRequest
                    rqst.setPerson(person)
                    rqst.setIndexpath(indexPath)

                    // save the person witout the video id...
                    globule.titleService.createPerson(rqst, { domain: globule.domain, token: token })
                        .then(rsp => {

                            // set values...
                            this.save()

                            // get the elements with the actual uuid
                            let uuid = this.uuid
                            let personBiographyInput = container.querySelector(`#${uuid}-person-biography-input`)
                            let personUrlInput = container.querySelector(`#${uuid}-person-url-input`)
                            let personIdInput = container.querySelector(`#${uuid}-person-id-input`)
                            let personNameInput = container.querySelector(`#${uuid}-person-name-input`)
                            let personAliasesInput = container.querySelector(`#${uuid}-person-aliases-input`)
                            let personBirthdateInput = container.querySelector(`#${uuid}-person-birthdate-input`)
                            let personBirthplaceInput = container.querySelector(`#${uuid}-person-birthplace-input`)

                            // update element id's
                            uuid = "_" + getUuidByString(person.getId())
                            if (uuid != this.uuid) {
                                this.uuid = uuid
                                personBiographyInput.id = `#${uuid}-person-biography-input`
                                personUrlInput.id = `#${uuid}-person-url-input`
                                personIdInput.id = `#${uuid}-person-id-input`
                                personNameInput.id = `#${uuid}-person-name-input`
                                personAliasesInput.id = `#${uuid}-person-aliases-input`
                                personBirthdateInput.id = `#${uuid}-person-birthdate-input`
                                personBirthplaceInput.id = `#${uuid}-person-birthplace-input`
                            }

                            // Now I will remove the person from the video casting...
                            if (this.slot == "casting") {
                                let casting = this.titleInfo.getCastingList()
                                casting = casting.filter(p => p.getId() !== person.getId());
                                this.titleInfo.setCastingList(casting)
                            } else if (this.slot == "actors") {
                                let casting = this.titleInfo.getActorsList()
                                casting = casting.filter(p => p.getId() !== person.getId());
                                this.titleInfo.setActorsList(casting)
                            } else if (this.slot == "writers") {
                                let casting = this.titleInfo.getWritersList()
                                casting = casting.filter(p => p.getId() !== person.getId());
                                this.titleInfo.setWritersList(casting)
                            } else if (this.slot == "directors") {
                                let casting = this.titleInfo.getDirectorsList()
                                casting = casting.filter(p => p.getId() !== person.getId());
                                this.titleInfo.setDirectorsList(casting)
                            }

                            if (this.slot == "casting") {

                                let rqst = new CreateVideoRequest
                                rqst.setVideo(this.titleInfo)
                                rqst.setIndexpath(indexPath)
                                globule.titleService.createVideo(rqst, { domain: globule.domain, token: token })
                                    .then(rsp => {
                                        displaySuccess(`${person.getFullname()} was removed from the cast of ${this.titleInfo.getDescription()}`, 3000)
                                        if (this.onremovefromcast) {
                                            this.onremovefromcast(person)
                                        }
                                    }).catch(err => displayError(err))
                            } else {

                                let rqst = new CreateTitleRequest
                                rqst.setTitle(this.titleInfo)
                                rqst.setIndexpath(indexPath)
                                globule.titleService.createTitle(rqst, { domain: globule.domain, token: token })
                                    .then(rsp => {
                                        displaySuccess(`${person.getFullname()} was removed from the cast of ${this.titleInfo.getName()}`, 3000)
                                        if (this.onremovefromcast) {
                                            this.onremovefromcast(person)
                                        }
                                    }).catch(err => displayError(err))
                            }

                        }).catch(err => displayError(err))

                })
                toast.hideToast();
            }
        }

        // Now the actions...
        let deleteBtn = container.querySelector(`#${uuid}-delete-btn`)
        deleteBtn.onclick = () => {
            if (this.person.getFullname().length == 0) {
                // In that case i will simply remove the editor from it parent.
                this.parentNode.removeChild(this)
            } else {
                this.deletePerson()
            }
        }

        // The person id
        let editpersonIdBtn = container.querySelector(`#edit-${uuid}-person-id-btn`)
        let personIdInput = container.querySelector(`#${uuid}-person-id-input`)
        let personIdDiv = container.querySelector(`#${uuid}-person-id-div`)

        editpersonIdBtn.onclick = () => {
            personIdInput.style.display = "table-cell"
            personIdDiv.style.display = "none"
            setTimeout(() => {
                personIdInput.focus()
                personIdInput.inputElement.inputElement.select()
            }, 100)
        }

        personIdInput.onblur = () => {
            personIdInput.style.display = "none"
            personIdDiv.style.display = "table-cell"
            personIdDiv.innerHTML = personIdInput.value
        }

        // The person name
        let editpersonNameBtn = container.querySelector(`#edit-${uuid}-person-name-btn`)
        let personNameInput = container.querySelector(`#${uuid}-person-name-input`)
        let personNameDiv = container.querySelector(`#${uuid}-person-name-div`)

        editpersonNameBtn.onclick = () => {
            personNameInput.style.display = "table-cell"
            personNameDiv.style.display = "none"
            setTimeout(() => {
                personNameInput.focus()
                personNameInput.inputElement.inputElement.select()
            }, 100)
        }

        personNameInput.onkeyup = () => {
            container.querySelector("#header-text").innerHTML = personNameInput.value
        }

        personNameInput.onblur = () => {
            personNameInput.style.display = "none"
            personNameDiv.style.display = "table-cell"
            personNameDiv.innerHTML = personNameInput.value
        }

        // The person aliases
        let editpersonAliasesBtn = container.querySelector(`#edit-${uuid}-person-aliases-btn`)
        let personAliasesInput = container.querySelector(`#${uuid}-person-aliases-input`)
        let personAliasesDiv = container.querySelector(`#${uuid}-person-aliases-div`)

        editpersonAliasesBtn.onclick = () => {
            personAliasesInput.style.display = "table-cell"
            personAliasesDiv.style.display = "none"
            setTimeout(() => {
                personAliasesInput.focus()
                personAliasesInput.inputElement.inputElement.select()
            }, 100)
        }

        personAliasesInput.onblur = () => {
            personAliasesInput.style.display = "none"
            personAliasesDiv.style.display = "table-cell"
            personAliasesDiv.innerHTML = personAliasesInput.value
        }

        // The person birthdate
        let editpersonBirthdateBtn = container.querySelector(`#edit-${uuid}-person-birthdate-btn`)
        let personBirthdateInput = container.querySelector(`#${uuid}-person-birthdate-input`)
        let personBirthdateDiv = container.querySelector(`#${uuid}-person-birthdate-div`)

        editpersonBirthdateBtn.onclick = () => {
            personBirthdateInput.style.display = "table-cell"
            personBirthdateDiv.style.display = "none"
            setTimeout(() => {
                personBirthdateInput.focus()
                personBirthdateInput.inputElement.inputElement.select()
            }, 100)
        }

        personBirthdateInput.onblur = () => {
            personBirthdateInput.style.display = "none"
            personBirthdateDiv.style.display = "table-cell"
            personBirthdateDiv.innerHTML = personBirthdateInput.value
        }

        // The person birthplace
        let editpersonBirthplaceBtn = container.querySelector(`#edit-${uuid}-person-birthplace-btn`)
        let personBirthplaceInput = container.querySelector(`#${uuid}-person-birthplace-input`)
        let personBirthplaceDiv = container.querySelector(`#${uuid}-person-birthplace-div`)

        editpersonBirthplaceBtn.onclick = () => {
            personBirthplaceInput.style.display = "table-cell"
            personBirthplaceDiv.style.display = "none"
            setTimeout(() => {
                personBirthplaceInput.focus()
                personBirthplaceInput.value = personBirthplaceDiv.innerText.replace(/\s\s+/g, ' ').trim()
                personBirthplaceInput.inputElement.inputElement.select()
            }, 100)
        }

        personBirthplaceInput.onblur = () => {
            personBirthplaceInput.style.display = "none"
            personBirthplaceDiv.style.display = "table-cell"
            personBirthplaceDiv.innerHTML = personBirthplaceInput.value
        }

        // The person url
        let editpersonUrlBtn = container.querySelector(`#edit-${uuid}-person-url-btn`)
        let personUrlInput = container.querySelector(`#${uuid}-person-url-input`)
        let personUrlDiv = container.querySelector(`#${uuid}-person-url-div`)

        editpersonUrlBtn.onclick = () => {
            personUrlInput.style.display = "table-cell"
            personUrlDiv.style.display = "none"
            setTimeout(() => {
                personUrlInput.focus()
                personUrlInput.inputElement.inputElement.select()
            }, 100)
        }

        personUrlInput.onblur = () => {
            personUrlInput.style.display = "none"
            personUrlDiv.style.display = "table-cell"
            personUrlDiv.innerHTML = personUrlInput.value
        }

        // The person biography text.
        let editPersonBiographyBtn = this.shadowRoot.querySelector(`#edit-${uuid}-person-biography-btn`)
        let personBiographyInput = this.shadowRoot.querySelector(`#${uuid}-person-biography-input`)
        let personBiographyDiv = this.shadowRoot.querySelector(`#${uuid}-person-biography-div`)

        editPersonBiographyBtn.onclick = () => {
            personBiographyInput.parentNode.style.display = "table-cell"
            personBiographyDiv.style.display = "none"
            setTimeout(() => {
                personBiographyInput.focus()
                personBiographyInput.textarea.select()
            }, 100)
        }

        personBiographyInput.onblur = () => {
            personBiographyInput.parentNode.style.display = "none"
            personBiographyDiv.style.display = "table-cell"
            personBiographyDiv.innerHTML = personBiographyInput.value
        }

    }

    focus() {
        // onpen the panel...
        let container = this.shadowRoot.querySelector("#container")
        let uuid = this.uuid

        let collapse_btn = container.querySelector("#collapse-btn")
        collapse_btn.click()

        let editpersonIdBtn = container.querySelector(`#edit-${uuid}-person-id-btn`)
        editpersonIdBtn.click()
    }

    deletePerson() {
       displayMessage(``,`
        <style>
           
        </style>
        <div id="select-media-dialog">
            <div>Your about to delete <span style="font-size: 1.2rem;">${this.person.getFullname()}</span></div>
            <div style="display: flex; flex-direction: column; justify-content: center;">
                <img src="${this.person.getPicture()}" style="width: 185.31px; align-self: center; padding-top: 10px; padding-bottom: 15px;" id="title-poster"> </img>
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

        let okBtn = toast.toastElement.querySelector("#imdb-lnk-ok-button")
        okBtn.onclick = () => {
            let rqst = new DeletePersonRequest()
            let globule = this.person.globule
            generatePeerToken(globule, token => {

                rqst.setPersonid(this.person.getId())
                let indexPath = globule.config.DataPath + "/search/videos" // TODO set it correctly for video...
                if (this.slot != "casting") {
                    indexPath = globule.config.DataPath + "/search/titles"
                }
                rqst.setIndexpath(indexPath)

                globule.titleService.deletePerson(rqst, { domain: globule.domain, token: token })
                    .then(() => {
                        displaySuccess(`${this.person.getFullname()} information was deleted`, 3000)
                        Backend.publish(`delete_${this.person.getId()}_evt`, {}, true)
                    })
                    .catch(err => displayError(err))
            })

            toast.hideToast();
        }
    }

    // Save will simply set value in the person attribute...
    save() {
        // The uuid
        let uuid = this.uuid
        let container = this.shadowRoot.querySelector("#container")

        // get interface elements.
        let personBiographyInput = container.querySelector(`#${uuid}-person-biography-input`)
        let personUrlInput = container.querySelector(`#${uuid}-person-url-input`)
        let personIdInput = container.querySelector(`#${uuid}-person-id-input`)
        let personNameInput = container.querySelector(`#${uuid}-person-name-input`)
        let imageSelector = container.querySelector("globular-image-selector")
        let personAliasesInput = container.querySelector(`#${uuid}-person-aliases-input`)
        let personBirthdateInput = container.querySelector(`#${uuid}-person-birthdate-input`)
        let personBirthplaceInput = container.querySelector(`#${uuid}-person-birthplace-input`)

        // set values.
        this.person.setId(personIdInput.value)
        this.person.setFullname(personNameInput.value)
        this.person.setUrl(personUrlInput.value)
        this.person.setBiography(btoa(personBiographyInput.value))
        this.person.setPicture(imageSelector.getImageUrl())

        // little formatting...
        let aliases = personAliasesInput.value.split(",")
        aliases.forEach(a => { a = a.trim() })
        this.person.setAliasesList(aliases)

        this.person.setBirthdate(personBirthdateInput.value)
        this.person.setBirthplace(personBirthplaceInput.value)
    }

    getPerson() {
        return this.person
    }
}

customElements.define('globular-person-editor', PersonEditor)
