
import { createDir, deleteFile, readDir, uploadFiles } from "globular-web-client/api";
import * as getUuidByString from "uuid-by-string";
import "@polymer/iron-icons/av-icons";
import { Account, Contact, SetAccountContactRqst } from "globular-web-client/resource/resource_pb.js";
import { Backend, displayError, displayMessage, generatePeerToken, getUrl } from "../../backend/backend";
import { AccountController } from "../../backend/account";
import { split } from "lodash";
import { FileInfo } from "globular-web-client/file/file_pb";

/**
 * Sample empty component
 */
export class Ringtones extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.account = null;


        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

            #container{
                display: flex;
                flex-direction: column;
            }

            ::-webkit-scrollbar {
                width: 5px;
                height: 5px;
             }
             
             ::-webkit-scrollbar-track {
                background: var(--palette-background-default);
             }
             
             ::-webkit-scrollbar-thumb {
                background: var(--palette-divider);
             }

            #ringtones{
                display: flex;
                flex-direction: column;
                max-height: 150px;
                overflow-y: auto;
                border-top: 1px solid var(--palette-action-disabled);
            }

            #ringtone-div{
                display: flex;
                flex-direction: row;
                background-color: var(--palette-background-paper);
                color: var(--palette-text-primary);
                --iron-icon-fill-color: var(--palette-text-primary);
                align-items: center;
                font-size: .85rem;
            }

            iron-icon{
                whidth: 24px;
                height: 24px;
            }

        </style>

        <div  id="container">
            <div id="ringtone-div">
                <div id="ringtone"></div>
                <iron-icon id="ringtones-button" icon="arrow-drop-down"></iron-icon>
                <span style="flex-grow: 1;"></span>
                <iron-icon id="upload-button" icon="icons:file-upload"></iron-icon>
            </div>
            <div id="ringtones" style="display: none;">
                <slot></slot>
            </div>
        </div>
        `

        // give the focus to the input.
        this.container = this.shadowRoot.querySelector("#container")
        let ringtonesDiv = this.shadowRoot.querySelector("#ringtones")

        this.shadowRoot.querySelector("#ringtones-button").onclick = () => {
            if (ringtonesDiv.style.display == "none") {
                ringtonesDiv.style.display = "flex"
                this.shadowRoot.querySelector("#upload-button").style.display = "flex"
            } else {
                ringtonesDiv.style.display = "none"
                this.shadowRoot.querySelector("#upload-button").style.display = "none"
            }
        }

        // upload a new ringtone
        this.shadowRoot.querySelector("#upload-button").onclick = () => {

            var input = document.createElement('input');
            input.type = 'file';
            input.accept = ".mp3"
            input.click();

            input.onchange = (evt) => {
                const files = evt.target.files
                if (files && files[0]) {

                    let globule = Backend.getGlobule(AccountController.account.getDomain())

                    // retreive the application name
                    let router = document.body.querySelector("globular-router")
                    let application = router.getAttribute("base")

                    // set the path...
                    let path = "/applications/" + application + "/_ringtones"

                    uploadFiles(globule, localStorage.getItem("user_token"), path, files, () => {
                        let f = files[0]
                        f.path = path + "/" + f.name

                        let fileInfo = new FileInfo
                        fileInfo.setName(f.name)
                        fileInfo.setPath(f.path)
                        fileInfo.setIsDir(false)
                        
                        let ringtone = new Ringtone(fileInfo, this)
                        this.insertBefore(ringtone, this.children[0])

                    }, err => { console.log(err) })
                }
            }
        }
    }

    // The connection callback.
    connectedCallback() {

        if (this.children.length > 0) {
            return;
        }

        // Now I will save the contact ringtone...
        AccountController.getAccount(this.getAttribute("account"), contact => {
            this.account = contact;
            let id = contact.getId() + "@" + contact.getDomain()
            AccountController.getContacts(AccountController.account, `{"_id":"${id}"}`, contacts => {
                if (contacts.length > 0) {
                    if (contacts[0].ringtone) {
                        this.account.ringtone = contacts[0].ringtone
                        this.account.status = contacts[0].status // keep the status
                    }

                    let router = document.body.querySelector("globular-router")
                    let application = router.getAttribute("base")

                    let webRoot = Backend.globular.config.WebRoot
                    let path = webRoot + "/" + application + "/" + this.getAttribute("dir")

                    // Now I will set the file...
                    this.loadRingTone(path, () => {

                        // The dir where additional ringtone will be place.
                        createDir(Backend.globular, Backend.globular.config.DataPath + "/files/applications/" + application, "_ringtones",
                            () => {
                                this.loadRingTone("/applications/" + application + "/_ringtones", () => this.setCurrentRingtone())
                            },
                            () => {
                                this.loadRingTone("/applications/" + application + "/_ringtones", () => this.setCurrentRingtone())
                            })
                    }, false)
                }


            }, err => displayError(err, 3000))

        }, err => displayError(err, 3000))

    }

    setCurrentRingtone() {
        // set the firt ringtone by default...
        if (this.children.length > 0 && !this.account.ringtone) {
            this.setRingtone(this.children[0])
        } else {
            let values = this.account.ringtone.split("/")
            let id = "_" + getUuidByString(values[values.length - 1])
            let ringtone = this.querySelector("#" + id)
            this.setRingtone(ringtone)
        }
    }

    loadRingTone(path, callback, deletable) {

        readDir(Backend.globular, path, false, dir => {

            dir.getFilesList().forEach(f => {
                if (f.getName().indexOf(".mp3") != -1) {

                    let ringtone = new Ringtone(f, this)
                    if (!this.querySelector("#" + ringtone.getAttribute("id"))) {
                        this.appendChild(ringtone)
                        if (deletable != undefined) {
                            if (deletable == false) {
                                ringtone.deleteButton.style.visibility = "hidden"
                            }
                        }
                    }
                }
            });
            if (callback) {
                callback()
            }
        }, err => displayError(err, 3000))

    }

    deleteRingtone(ringtone) {


        let toast = displayMessage(
            `
              <style>
              
                #yes-no-contact-delete-box{
                  display: flex;
                  flex-direction: column;
                }
        
                #yes-no-contact-delete-box globular-contact-card{
                  padding-bottom: 10px;
                }
        
                #yes-no-contact-delete-box div{
                  display: flex;
                  padding-bottom: 10px;
                }
        
                paper-button{
                  font-size: .85rem;
                  height: 32px;
                }
        
              </style>
              <div id="yes-no-contact-delete-box">
                <div>Your about to delete ringtone named ${ringtone.file.getName()}</div>
                <div>Is it what you want to do? </div>
                <div style="justify-content: flex-end;">
                  <paper-button id="yes-delete-btn">Yes</paper-button>
                  <paper-button id="no-delete-btn">No</paper-button>
                </div>
              </div>
              `,
            15000 // 15 sec...
        );

        let yesBtn = toast.toastElement.querySelector("#yes-delete-btn")
        let noBtn = toast.toastElement.querySelector("#no-delete-btn")

        // On yes
        yesBtn.onclick = () => {

            let globule = Backend.getGlobule(AccountController.account.domain)
            deleteFile(globule, ringtone.file.getPath(),
                () => {
                    this.removeChild(ringtone)
                    toast.hideToast();
                    displayMessage("the ringtone " + ringtone.file.getName() + " was deleted", 3000)
                },
                err => { displayError(err, 3000) })

        }

        noBtn.onclick = () => {
            toast.hideToast();
        }
    }

    setRingtone(ringtone) {
        if (!ringtone) {
            return
        }

        // set back the actual ringtone in the list
        ringtone.hideSetButton()
        ringtone.hideDeleteButton()

        if (this.shadowRoot.querySelector("#ringtone").children.length > 0) {
            let ringtone_ = this.shadowRoot.querySelector("#ringtone").children[0]
            ringtone_.showSetButton()
            ringtone_.showDeleteButton()
            this.appendChild(ringtone_)
        }

        // set the new ringtone.
        this.shadowRoot.querySelector("#ringtone").appendChild(ringtone)


        let ringtonesDiv = this.shadowRoot.querySelector("#ringtones")
        ringtonesDiv.style.display = "none"
        this.shadowRoot.querySelector("#upload-button").style.display = "none"


        // set the file path.
        this.account.ringtone = ringtone.file.getPath()

        // Here I will return the value with it
        let rqst = new SetAccountContactRqst
        rqst.setAccountid(AccountController.account.getId() + "@" + AccountController.account.getDomain())

        let contact = new Contact
        contact.setId(this.account.getId() + "@" + this.account.getDomain())
        contact.setStatus("accepted")
        contact.setRingtone(this.account.ringtone)
        if (this.account.getProfilepicture())
            contact.setProfilepicture(this.account.getProfilepicture())

        contact.setInvitationtime(Math.round(Date.now() / 1000))
        rqst.setContact(contact)
        let token = localStorage.getItem("user_token")
        let globule =  Backend.getGlobule(AccountController.account.getDomain())
        // call persist data
        globule.resourceService
            .setAccountContact(rqst, {
                token: token,
                domain: globule.domain
            })
            .then((rsp) => {
                // Here I will return the value with it
            })
            .catch(err => displayError(err, 3000));
    }

    play(loop) {
        this.shadowRoot.querySelector("#ringtone").children[0].play(loop)
    }


    stop() {
        this.shadowRoot.querySelector("#ringtone").children[0].stop()
    }
}

customElements.define('globular-ringtones', Ringtones)

/**
 * Sample empty component
 */
export class Ringtone extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(file, parent) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.id = "_" + getUuidByString(file.getName())

        this.parent = parent;

        this.file = file;

        this.shadowRoot.innerHTML = `
        <style>
            #container {
                display: flex;
                align-items: center;
                font-size: .85rem;
                align-items: center;
                justify-content: flex-start;
            }
    
            .small {
                height: 16px;
                width: 16px;
            }
        </style>
        <div id="container">
            <iron-icon class="small" id="play-button" icon="av:play-arrow"></iron-icon>
            <iron-icon class="small" id="stop-button" icon="av:stop" style="display: none;"></iron-icon>
            <paper-button id="set-button" style="font-size: .75em;">set</paper-button>
            <span>${file.getName().split(".")[0].split("_").join(" ")}</span>
            <iron-icon class="small" id="delete-button">delete</iron-icon>
        </div>
    `;
        // give the focus to the input.
        this.playBtn = this.shadowRoot.querySelector("#play-button")
        this.stopBtn = this.shadowRoot.querySelector("#stop-button")
        this.setButton = this.shadowRoot.querySelector("#set-button")
        this.deleteButton = this.shadowRoot.querySelector("#delete-button")

        let globule = Backend.getGlobule(AccountController.account.getDomain())
        let url = getUrl(globule)

        let path = file.getPath()
        path = path.replace(globule.config.WebRoot, "")

        path.split("/").forEach(item => {
            item = item.trim()
            if (item.length > 0) {
                url += "/" + encodeURIComponent(item)
            }
        })

        generatePeerToken(globule, token => {
            if (localStorage.getItem("user_token") != undefined) {
                url += "?token=" + token
            }
            this.url = url;
        })

        this.audio = null;


        this.playBtn.onclick = () => {
            this.play()
        }

        this.stopBtn.onclick = () => {
            this.stop()
        }

        this.setButton.onclick = () => {
            let ringtones = this.parent.getElementsByTagName("globular-ringtone")
            for (var i = 0; i < ringtones.length; i++) {
                ringtones[i].stop()
            }
            this.parent.setRingtone(this)
        }

        this.deleteButton.onclick = () => {
            let ringtones = this.parent.getElementsByTagName("globular-ringtone")
            for (var i = 0; i < ringtones.length; i++) {
                ringtones[i].stop()
            }

            this.parent.deleteRingtone(this)
        }

    }

    // The connection callback.
    connectedCallback() {

    }

    hideSetButton() {
        this.setButton.style.display = "none"
    }

    showSetButton() {
        this.setButton.style.display = ""
    }

    hideDeleteButton() {
        this.deleteButton.style.display = "none"
    }

    showDeleteButton() {
        this.deleteButton.style.display = ""
    }

    // Call search event.
    play(loop) {

        // stop currently selected ringtone...
        let ringtones = this.parent.getElementsByTagName("globular-ringtone")
        for (var i = 0; i < ringtones.length; i++) {
            ringtones[i].stop()
        }

        this.playBtn.style.display = "none"
        this.stopBtn.style.display = ""
        if (this.audio == null) {
            this.audio = new Audio(this.url)
        }

        if (loop) {
            this.audio.setAttribute("loop", "true")
        }

        this.audio.play()

        this.audio.onended = () => {
            this.stop()
        }
    }

    stop() {
        this.playBtn.style.display = ""
        this.stopBtn.style.display = "none"
        if (this.audio != null) {
            this.audio.pause()
        }

    }
}

customElements.define('globular-ringtone', Ringtone)
