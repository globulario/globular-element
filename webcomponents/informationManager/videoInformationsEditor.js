import { CreatePersonRequest, CreateVideoRequest, Publisher, UpdateVideoMetadataRequest } from "globular-web-client/title/title_pb";
import { PermissionsManager } from "../permissionManager/permissionManager.js";
import getUuidByString from "uuid-by-string"
import { Person } from "globular-web-client/title/title_pb";
import { PersonEditor } from "./personEditor.js";
import { Poster } from "globular-web-client/title/title_pb";
import { generatePeerToken, displayError, displaySuccess } from "../../backend/backend";
import { EditableStringList } from "../list.js";
import '@polymer/iron-autogrow-textarea/iron-autogrow-textarea.js';
import '@polymer/iron-icons/image-icons.js'

/**
 * The video infos editor.
 */
export class VideoInfoEditor extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(video, videoInfosDisplay) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.videoInfosDisplay = videoInfosDisplay

        let imageUrl = "" // in case the video dosent contain any poster info...
        if (video.getPoster())
            imageUrl = video.getPoster().getContenturl()

        let publisher = video.getPublisherid()
        if (!publisher) {
            publisher = new Publisher
        }

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
                border-top: 2px solid;dataUrl
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

        </style>
        <div id="container">
            <div style="display: flex; flex-direction: column; justify-content: flex-start;  margin-left: 15px;">
                <div style="display: flex; flex-direction: column; margin: 5px;">
                    <globular-image-selector label="cover" url="${imageUrl}"></globular-image-selector>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; width: 100%;">
               
                <div style="display: table; flex-grow: 1; margin-left: 20px; border-collapse: collapse;">
                        <div style="display: table-row;  border-bottom: 1px solid var(--palette-divider);  margin-bottom: 10px;">
                            <div class="label" style="display: table-cell; font-weight: 450;">Publisher</div>
                        </div>
                        <div style="display: table-row;">
                            <div class="label" style="display: table-cell; font-weight: 450; ">Id:</div>
                            <div style="display: table-cell; width: 100%;"  id="publisher-id-div">${publisher.getId()}</div>
                            <paper-input style="display: none; width: 100%;" value="${publisher.getId()}" id="publisher-id-input" no-label-float></paper-input>
                            <div class="button-div">
                                <paper-icon-button id="edit-publisher-id-btn" icon="image:edit"></paper-icon-button>
                            </div>
                        </div>
                        <div style="display: table-row;">
                            <div class="label" style="display: table-cell; font-weight: 450;">Url:</div>
                            <div style="display: table-cell; width: 100%;"  id="publisher-url-div">${publisher.getUrl()}</div>
                            <paper-input style="display: none; width: 100%;" value="${publisher.getUrl()}" id="publisher-url-input" no-label-float></paper-input>
                            <div class="button-div">
                                <paper-icon-button id="edit-publisher-url-btn" icon="image:edit"></paper-icon-button>
                            </div>
                        </div>
                        <div style="display: table-row;">
                            <div class="label" style="display: table-cell; font-weight: 450; ">Name:</div>
                            <div style="display: table-cell; width: 100%;"  id="publisher-name-div">${publisher.getName()}</div>
                            <paper-input style="display: none; width: 100%;" value="${publisher.getName()}" id="publisher-name-input" no-label-float></paper-input>
                            <div class="button-div">
                                <paper-icon-button id="edit-publisher-name-btn" icon="image:edit"></paper-icon-button>
                            </div>
                        </div>
                </div>


                <div id="casting-table" style="flex-grow: 1; margin-left: 20px; border-collapse: collapse;">
                    <div style="display: table-row;  border-bottom: 1px solid var(--palette-divider);  margin-bottom: 10px;">
                        <div class="label" style="display: table-cell; font-weight: 450;">Casting</div>
                        <div style="display: table-cell; width: 100%;" ></div>
                       
                        <div class="button-div" style="position: relative;">
                            <paper-icon-button id="add-casting-btn" icon="social:person-add"></paper-icon-button>
                        </div>

                    </div>
                    <slot name="casting"></slot>
                </div>

                <div style="display: table; flex-grow: 1; margin-left: 20px; border-collapse: collapse; margin-top: 20px; margin-bottom: 10px;">
                    <div style="display: table-row; border-bottom: 1px solid var(--palette-divider)" >
                        <div class="label" style="display: table-cell; font-weight: 450; border-bottom: 1px solid var(--palette-divider)">Video</div>
                    </div>
                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Id:</div>
                        <div style="display: table-cell; width: 100%;"  id="video-id-div">${video.getId()}</div>
                        <paper-input style="display: none; width: 100%;" value="${video.getId()}" id="video-id-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-video-id-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>
                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450;">URL:</div>
                        <div id="video-url-div" style="display: table-cell; width: 100%;">${video.getUrl()}</div>
                        <paper-input id="video-url-input" no-label-float style="display: none; width: 100%;" value="${video.getUrl()}"></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-video-url-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>
                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; vertical-align: top;">Description:</div>
                        <div id="video-description-div" style="display: table-cell;width: 100%;" >${video.getDescription()}</div>
                        <iron-autogrow-textarea id="video-description-input"  style="display: none; border: none; width: 100%;" value="${video.getDescription()}"></iron-autogrow-textarea>
                        <div class="button-div">
                            <paper-icon-button id="edit-video-description-btn" style="vertical-align: top;" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>
                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450;">Genres:</div>
                        <div id="video-genres-div" style="display: table-cell; width: 100%;"></div>
                    </div>
                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450;">Tags:</div>
                        <div id="video-tags-div" style="display: table-cell; width: 100%; max-width: 450px;"></div>
                    </div>
                </div>
            </div>
        </div>
        <iron-collapse class="permissions" id="collapse-panel" style="display: flex; flex-direction: column; margin: 5px;">
        </iron-collapse>
        <div class="action-div" style="${this.isShort ? "display: none;" : ""}">
            <paper-button id="edit-permissions-btn" title="set who can edit this video informations">Permissions</paper-button>
            <span style="flex-grow: 1;"></span>
            <paper-button id="save-indexation-btn">Save</paper-button>
            <paper-button id="cancel-indexation-btn">Cancel</paper-button>
        </div>
        `

        let editPemissionsBtn = this.shadowRoot.querySelector("#edit-permissions-btn")
        let collapse_panel = this.shadowRoot.querySelector("#collapse-panel")

        this.permissionManager = new PermissionsManager()
        this.permissionManager.permissions = null
        this.permissionManager.globule = video.globule
        this.permissionManager.setPath(video.getId())
        this.permissionManager.setResourceType = "video_info"

        let indexPath = video.globule.config.DataPath + "/search/videos"

        let addCastingBtn = this.shadowRoot.querySelector("#add-casting-btn")
        addCastingBtn.onclick = () => {
            let html = `
            <paper-card id="add-casting-panel" style="z-index: 100; background-color: var(--surface-color);  color: var(--primary-text-color); position: absolute; top: 35px; right: 5px;">
                <div style="display:flex; flex-direction: column;">
                    <globular-search-person-input indexpath="${indexPath}" title="search existing cast"></globular-search-person-input>
                    <div style="display:flex; justify-content: flex-end;">
                        <paper-button id="new-person-btn" title="Create a new cast">New</paper-button>
                        <paper-button id="cancel-btn" >Cancel</paper-button>
                    </div>
                </div>
            </paper-card>
            `
            let parent = addCastingBtn.parentNode
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

                let editor = this.appendPersonEditor(person, video)
                editor.focus()

                // remove the panel...
                let addCastingPanel = parent.querySelector("#add-casting-panel")
                addCastingPanel.parentNode.removeChild(addCastingPanel)
            }

            // close the search box...
            let searchPersonInput = parent.querySelector("globular-search-person-input")

            searchPersonInput.oneditperson = (person) => {
                person.globule = video.globule
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
                        background-color: var(--surface-color);
                        border-left: 1px solid var(--palette-divider); 
                        border-right: 1px solid var(--palette-divider) rgba(255, 255, 255, 0.12);
                        border-top: 1px solid var(--palette-divider) rgba(255, 255, 255, 0.12);
                        color: var(--primary-text-color);
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
                let indexPath = globule.config.DataPath + "/search/videos" // TODO set it correctly for video...

                generatePeerToken(globule, token => {

                    // remove the video id from casting field.
                    let casting = person.getCastingList()
                    if (casting.indexOf(video.getId()) == 0) {
                        casting.push(video.getId())
                    }

                    person.setCastingList(casting)

                    let rqst = new CreatePersonRequest
                    rqst.setPerson(person)
                    rqst.setIndexpath(indexPath)

                    // save the person witout the video id...
                    globule.titleService.createPerson(rqst, { domain: globule.domain, token: token })
                        .then(rsp => {
                            // Now I will remove the person from the video casting...
                            let casting = video.getCastingList()

                            // remove it if it was existing.
                            casting = casting.filter(p => p.getId() !== person.getId());

                            // set it back.
                            casting.push(person)
                            video.setCastingList(casting)

                            let rqst = new CreateVideoRequest
                            rqst.setVideo(video)
                            rqst.setIndexpath(indexPath)

                            globule.titleService.createVideo(rqst, { domain: globule.domain, token: token })
                                .then(rsp => {
                                    this.appendPersonEditor(person, video)
                                    // remove the panel...
                                    let addCastingPanel = parent.querySelector("#add-casting-panel")
                                    addCastingPanel.parentNode.removeChild(addCastingPanel)
                                }).catch(err => displayError(err))
                        }).catch(err => displayError(err))

                })
            }

            searchPersonInput.onclose = parent.querySelector("#cancel-btn").onclick = () => {
                let addCastingPanel = parent.querySelector("#add-casting-panel")
                addCastingPanel.parentNode.removeChild(addCastingPanel)
            }


        }

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
            parent.appendChild(videoInfosDisplay)
        }

        // Delete the postser/cover image.
        this.shadowRoot.querySelector("globular-image-selector").ondelete = () => {
            video.getPoster().setContenturl("")
        }

        // Select new image.
        this.shadowRoot.querySelector("globular-image-selector").onselectimage = (imageUrl) => {
            if (video.getPoster() == null) {
                let poster = new Poster()
                video.setPoster(poster)
            }

            video.getPoster().setContenturl(imageUrl)
        }


        // so here I will set the casting...
        video.getCastingList().forEach(p => {
            this.appendPersonEditor(p, video)
        })

        // The publisher id
        let editPublisherIdBtn = this.shadowRoot.querySelector("#edit-publisher-id-btn")
        let publisherIdInput = this.shadowRoot.querySelector("#publisher-id-input")
        let publisherIdDiv = this.shadowRoot.querySelector("#publisher-id-div")

        editPublisherIdBtn.onclick = () => {
            publisherIdInput.style.display = "table-cell"
            publisherIdDiv.style.display = "none"
            setTimeout(() => {
                publisherIdInput.focus()
                publisherIdInput.inputElement.inputElement.select()
            }, 100)
        }

        publisherIdInput.onblur = () => {
            publisherIdInput.style.display = "none"
            publisherIdDiv.style.display = "table-cell"
            publisherIdDiv.innerHTML = publisherIdInput.value
        }

        // The publisher url
        let editPublisherUrlBtn = this.shadowRoot.querySelector("#edit-publisher-url-btn")
        let publisherUrlInput = this.shadowRoot.querySelector("#publisher-url-input")
        let publisherUrlDiv = this.shadowRoot.querySelector("#publisher-url-div")

        editPublisherUrlBtn.onclick = () => {
            publisherUrlInput.style.display = "table-cell"
            publisherUrlDiv.style.display = "none"
            setTimeout(() => {
                publisherUrlInput.focus()
                publisherUrlInput.inputElement.inputElement.select()
            }, 100)
        }

        publisherIdInput.onblur = () => {
            publisherUrlInput.style.display = "none"
            publisherUrlDiv.style.display = "table-cell"
            publisherUrlDiv.innerHTML = publisherUrlInput.value
        }

        // The publisher name
        let editPublisherNameBtn = this.shadowRoot.querySelector("#edit-publisher-name-btn")
        let publisherNameInput = this.shadowRoot.querySelector("#publisher-name-input")
        let publisherNameDiv = this.shadowRoot.querySelector("#publisher-name-div")

        editPublisherNameBtn.onclick = () => {
            publisherNameInput.style.display = "table-cell"
            publisherNameDiv.style.display = "none"
            setTimeout(() => {
                publisherNameInput.focus()
                publisherNameInput.inputElement.inputElement.select()
            }, 100)
        }

        publisherIdInput.onblur = () => {
            publisherNameInput.style.display = "none"
            publisherNameDiv.style.display = "table-cell"
            publisherNameDiv.innerHTML = publisherNameInput.value
        }


        // The video id
        let editVideoIdBtn = this.shadowRoot.querySelector("#edit-video-id-btn")
        let videoIdInput = this.shadowRoot.querySelector("#video-id-input")
        let videoIdDiv = this.shadowRoot.querySelector("#video-id-div")

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

        // The original url link...
        let editVideoUrlBtn = this.shadowRoot.querySelector("#edit-video-url-btn")
        let videoUrlInput = this.shadowRoot.querySelector("#video-url-input")
        let videoUrlDiv = this.shadowRoot.querySelector("#video-url-div")

        editVideoUrlBtn.onclick = () => {
            videoUrlInput.style.display = "table-cell"
            videoUrlDiv.style.display = "none"
            setTimeout(() => {
                videoUrlInput.focus()
                videoUrlInput.inputElement.inputElement.select()
            }, 100)
        }

        // set back to non edit mode.
        videoUrlInput.onblur = () => {
            videoUrlInput.style.display = "none"
            videoUrlDiv.style.display = "table-cell"
            videoUrlDiv.innerHTML = videoUrlInput.value

        }

        // The video description
        let editVideoDescriptionBtn = this.shadowRoot.querySelector("#edit-video-description-btn")
        let videoVideoDescriptionInput = this.shadowRoot.querySelector("#video-description-input")
        let videoVideoDescriptionDiv = this.shadowRoot.querySelector("#video-description-div")

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

        let videoGenresDiv = this.shadowRoot.querySelector("#video-genres-div")
        let videoGenresList = new EditableStringList(video.getGenresList())
        videoGenresDiv.appendChild(videoGenresList)

        let videoTagsDiv = this.shadowRoot.querySelector("#video-tags-div")
        let videoTagsList = new EditableStringList(video.getTagsList())
        videoTagsDiv.appendChild(videoTagsList)

        this.shadowRoot.querySelector("#save-indexation-btn").onclick = () => {

            // set the publisher information.
            let publisher = video.getPublisherid()
            if (publisher == null) {
                publisher = new Publisher()
            }

            publisher.setId(publisherIdInput.value)
            publisher.setUrl(publisherUrlInput.value)
            publisher.setName(publisherNameInput.value)

            // set back the modified values.
            video.setPublisherid(publisher)

            // So here I will set video values back and update it in the parent...
            video.setId(videoIdInput.value)
            video.setUrl(videoUrlInput.value)
            video.setDescription(videoVideoDescriptionInput.value)

            video.setTagsList(videoTagsList.getItems())
            video.setGenresList(videoGenresList.getItems())

            // set the casting values...
            // casting are interfaced by PersonEditor and PersonEditor are contain 
            // in the casting slot, so I will use children iterator here...
            for (var i = 0; i < this.children.length; i++) {
                this.children[i].save()
            }

            this.saveCasting(video, casting => {
                let globule = video.globule
                generatePeerToken(globule, token => {
                    let indexPath = globule.config.DataPath + "/search/videos"
                    let rqst = new CreateVideoRequest
                    rqst.setVideo(video)
                    rqst.setIndexpath(indexPath)
                    video.setCastingList(casting)

                    globule.titleService.createVideo(rqst, { domain: globule.domain, token: token })
                        .then(rsp => {
                            displaySuccess("Video Information are updated", 3000)
                            this.videoInfosDisplay.setVideo(video)

                            // Now I will save the title metadata...
                            let rqst = new UpdateVideoMetadataRequest
                            rqst.setVideo(video)
                            rqst.setIndexpath(indexPath)
                            globule.titleService.updateVideoMetadata(rqst, { domain: globule.domain, token: token })
                                .then(rsp => {
                                    console.log("metadata was update!")
                                })
                                .catch(err => displayError(err))

                        })
                        .catch(err => displayError(err))
                    let parent = this.parentNode
                    parent.removeChild(this)
                    parent.appendChild(videoInfosDisplay)
                })
            })
        }
    }

    // Save casting this will create new person and set value in existing one.
    saveCasting(video, callback) {

        let castingEditors = this.querySelectorAll("globular-person-editor")
        let casting = []
        for (var i = 0; i < castingEditors.length; i++) {
            let person = castingEditors[i].getPerson()
            casting.push(person)

            let casting_ = person.getCastingList()
            if (!casting_) {
                casting_ = []
            }

            if (casting_.indexOf(video.getId()) == -1) {
                casting_.push(video.getId())
            }
            person.setCastingList(casting_)
        }

        let globule = video.globule

        let savePerson = (index) => {
            let indexPath = globule.config.DataPath + "/search/videos"
            let p = casting[index]
            index++
            let rqst = new CreatePersonRequest
            rqst.setIndexpath(indexPath)
            rqst.setPerson(p)

            // save the person one by one...
            generatePeerToken(globule, token => {
                globule.titleService.createPerson(rqst, { domain: globule.domain, token: token })
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

    appendPersonEditor(person, video) {
        person.globule = video.globule
        let uuid = "_" + getUuidByString(person.getId())

        // Create the person editor.
        let personEditor = this.querySelector(`#${uuid}`)

        if (personEditor == null) {
            personEditor = new PersonEditor(person, video)
            personEditor.id = uuid;

            personEditor.slot = "casting"
            personEditor.onremovefromcast = (p) => {
                personEditor.parentNode.removeChild(personEditor)
            }

            // Append to the list of casting
            this.appendChild(personEditor)
        }

        return personEditor
    }

}

customElements.define('globular-video-editor', VideoInfoEditor)

