import getUuidByString from "uuid-by-string"
import { AccountController } from "../../backend/account"
import { Wizard } from "../wizard";
import { randomUUID } from "../utility";
import { Backend, displayError, generatePeerToken } from "../../backend/backend";
import { CreateNotificationRqst, Notification, NotificationType } from "globular-web-client/resource/resource_pb";
import { GetResourcePermissionsRqst, Permissions, SetResourcePermissionsRqst } from "globular-web-client/rbac/rbac_pb";
import { GlobularSubjectsSelected} from "./subjectsSelected";
import { GlobularSubjectsView } from "./subjectsView";
import { GroupController } from "../../backend/group";
import {SharedSubjectsPermissions} from "./sharedSubjectPermissions";


export class ShareResourceWizard extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(files, view) {
        super()

        this.view = view;

        this.files = files;

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container{
                display: flex;
                height: 100%;
                flex-direction: column;
                border-left: 1px solid var(--palette-divider);
                border-right: 1px solid var(--palette-divider);
                background-color: var(--surface-color);
            }

            .header {
                display: flex;
                color: var(--palette-text-accent);
                background-color: var(--palette-primary-accent);
                align-items: center;
            }

            .header paper-icon-button {
                min-width: 40px;
            }


            .title-span {
                flex-grow: 1;
            }

        </style>
        <div id="container">
            <div class="header">
                <iron-icon icon="social:share" style="padding-left: 10px;"></iron-icon>
                <span class="title-span"> </span>
                <paper-icon-button icon="icons:close"></paper-icon-button>
            </div>
            <div class="content" style="display: flex; flex-direction: column; height: 100%; flex-grow: 1;">
                <slot> </slot>
            </div>
        </div>
        `

        // give the focus to the input.
        let wizard = new Wizard()
        wizard.style.flexGrow = 1
        wizard.style.height = "50px"

        // Here I will set the wizard pages...
        let range = document.createRange()
        let files_page = `
            <div class="globular-wizard-page" style="display: flex; flex-wrap: wrap; overflow-y: auto;">
        `

        // The welcome pages...
        files.forEach(file => {
            let title = null
            let name = file.getName();

            if (file.titles) {
                title = file.titles[0]
                name = title.getName()
                if (title.getEpisode() > 0) {
                    name += " S" + title.getSeason() + "-E" + title.getEpisode()
                }

            } else if (file.videos) {
                title = file.videos[0]
                name = title.getDescription()
            } else if (file.audios) {
                title = file.audios[0]
                name = title.getTitle()
            }

            let uuid = "_" + getUuidByString(file.getPath())

            let file_page = `
            <div style="display: flex; flex-direction: column; align-items: center; width: fit-content; margin: 5px; height: fit-content; ">
                <div style="display: flex; flex-direction: column; border: 1px solid var(--palette-divider); padding: 5px; border-radius: 2.5px;">
                    <div style="display: flex; align-items: center; width: 100%;">
                        <paper-checkbox checked  id="${uuid + "_checkbox"}"></paper-checkbox>
                        <span class="title-span" style="flex-grow: 1;"></span>
                        <iron-icon class="wizard-file-infos-btn" id="${uuid + "_infos_btn"}" icon="icons:info"></iron-icon>
                    </div>
        
                    <img style="height: 64px; width: auto; margin-top: 4px;" src="${file.getThumbnail()}"></img>
                </div>
                <span style="font-size: .85rem; padding: 2px; display: block; max-width: 128px; word-break: break-all;" title=${file.getPath()}> ${name}</span>
            </div>
            `
            files_page += file_page;
        })

        files_page += "</div>"

        wizard.appendPage(range.createContextualFragment(files_page).children[0])

        // Now the user, group application and organization page...
        let subjects_page = `
        <style>

            .globular-wizard-page-content{
                display: flex; 
                height: 100%;
            }

            @media(max-width: 500px){
                .globular-wizard-page-content{
                    flex-direction: column;
                }
            }

        </style>
        <div class="globular-wizard-page" style="overflow-y: auto;">
            <div class="globular-wizard-page-content">
                <globular-subjects-view style="height: 100%; min-width: 250px; border-right: 1px solid var(--palette-divider)"></globular-subjects-view>
                <globular-subjects-selected style="height: 100%; margin-left: 20px; flex-grow: 1"></globular-subjects-selected>
            </div>
        </div>
        `
        wizard.appendPage(range.createContextualFragment(subjects_page).children[1])

        let subjectsView = wizard.querySelector("globular-subjects-view")
        let selectedSubjects = wizard.querySelector("globular-subjects-selected")


        let shared_permissions_page = `
        <div  class="globular-wizard-page" style="overflow-y: auto;">
            <globular-shared-subjects-permissions></globular-shared-subjects-permissions>
        </div>
        `
        wizard.appendPage(range.createContextualFragment(shared_permissions_page).children[0])

        let sharedSubjectsPermission = wizard.querySelector("globular-shared-subjects-permissions")

        // Append account 
        subjectsView.on_account_click = (accountDiv, account) => {
            accountDiv.account = account;
            selectedSubjects.appendAccount(accountDiv)
        }

        // Append group
        subjectsView.on_group_click = (groupDiv, group) => {
            groupDiv.group = group;
            selectedSubjects.appendGroup(groupDiv)
        }

        // if account are remove or append...
        subjectsView.on_accounts_change = () => {
            sharedSubjectsPermission.setAccounts(selectedSubjects.getAccounts())
        }

        subjectsView.on_groups_change = () => {
            sharedSubjectsPermission.setGroups(selectedSubjects.getGroups())
        }

        let summary = `
        <style>

            .globular-wizard-page-content{
                display: flex; 
                height: 100%;
            }

            #content{
                display: flex; 
                flex-direction: column; 
                margin-left: 30px; 
                padding-left: 30px; 
                border-left: 1px solid var(--palette-divider)
            }

            @media(max-width: 500px){
                .globular-wizard-page-content{
                    flex-direction: column;
                }

                #content{
                    border-bottom: 1px solid var(--palette-divider)
                }
            }

        </style>
        <div  class="globular-wizard-page" style="overflow-y: auto;">
            <div class="globular-wizard-page-content">
                <div>
                    <iron-icon id="status-ico" style="height: 64px; width: 64px; fill: var(--palette-success-main);" icon="icons:check-circle"></iron-icon>
                </div>
                <div id="content" style="">
                    <p style="flex-grow: 1;">  
                        Resources permissions was successfully created for
                    </p>
                    <div style="display: flex; flex-wrap: wrap;" id="resources"></div>
                    <p>
                        The following user's will be notified of their new access
                    </p>
                    <div style="display: flex; flex-wrap: wrap;" id="paticipants"></div>
                </div>
            </div>
        </div>
        `

        wizard.setSummaryPage(range.createContextualFragment(summary).children[1])

        wizard.ondone = (summary_page) => {
            // Here I will get read element from the interface to get permissions infos...
            let permissions = sharedSubjectsPermission.getPermissions()

            this.setFilesPermissions(permissions, files, errors => {
                let participants = selectedSubjects.getAccounts()
                let groups = selectedSubjects.getGroups()

                // display the list of resource...
                let getMembers = (index) => {
                    let group = groups[index]
                    GroupController.getMembers(group.getId(), members => {
                        // append members...
                        members.forEach(member => {
                            if (participants.filter(p => p.getId() + "@" + p.getDomain() === member.getId() + "@" + member.getDomain()).length == 0) {
                                participants.push(member)
                            }
                        })
                        index++
                        if (index < groups.length) {
                            getMembers(index)
                        } else {
                            displayParticipants()
                        }
                    })
                }


                let displayResources = () => {
                    let resourcesDiv = summary_page.querySelector("#resources")
                    let statusIco = summary_page.querySelector("#status-ico")
                    let nbTotal = files.length
                    let nbFail = 0
                    files.forEach(file => {
                        let title = null
                        let name = file.getName();

                        if (file.titles) {
                            title = file.titles[0]
                            name = title.getName()
                            if (title.getEpisode() > 0) {
                                name += " S" + title.getSeason() + "-E" + title.getEpisode()
                            }

                        } else if (file.videos) {
                            title = file.videos[0]
                            name = title.getDescription()
                        } else if (file.audios) {
                            title = file.audios[0]
                            name = title.getTitle()
                        }

                        let uuid = "_" + getUuidByString(file.getPath())
                        let fileDiv = `
                        <div style="display: flex; flex-direction: column; align-items: center; width: fit-content; margin: 5px; height: fit-content; ">
                            <div style="display: flex; flex-direction: column; border: 1px solid var(--palette-divider); padding: 5px; border-radius: 2.5px;">
                                <div style="display: flex; align-items: center; width: 100%;">
                                    <span class="title-span" style="flex-grow: 1;"></span>
                                    <iron-icon style="fill: var(--palette-success-main);" id="${uuid + "_success"}" icon="icons:check-circle"></iron-icon>
                                    <iron-icon style="fill: var(--palette-secondary-main);" id="${uuid + "_error"}" icon="icons:error"></iron-icon>
                                </div>
                                <img style="height: 64px; width: auto;" src="${file.getThumbnail()}"></img>
                            </div>
                            <span style="font-size: .85rem; padding: 2px; display: block; max-width: 128px; word-break: break-all;" title=${file.getPath()}> ${name}</span>
                        </div>
                        `
                        resourcesDiv.appendChild(range.createContextualFragment(fileDiv))

                        // Here I will display error in the interface if ther some...
                        if (errors[file.getPath()]) {
                            resourcesDiv.querySelector(`#${uuid + "_success"}`).style.display = "none"
                            resourcesDiv.querySelector(`#${uuid + "_error"}`).title = errors[file.getPath()].message
                            nbFail++
                            if(nbFail < nbTotal){
                                statusIco.icon = "icons:warning"
                                statusIco.style.fill = "var(--palette-error-main)"
                            }else{
                                statusIco.icon = "icons:error"
                                statusIco.style.fill = "var(--palette-secondary-main)"
                            }

                        } else {
                            resourcesDiv.querySelector(`#${uuid + "_error"}`).style.display = "none"
                            participants.forEach(contact => {
                                // So here I will send a notification to the participant with the share information...
                                let rqst = new CreateNotificationRqst
                                let notification = new Notification

                                notification.setDate(parseInt(Date.now() / 1000)) // Set the unix time stamp...
                                notification.setId(randomUUID())
                                notification.setRecipient(contact.getId() + "@" + contact.getDomain())
                                notification.setSender(AccountController.account.getId() + "@" + AccountController.account.getDomain())
                                notification.setNotificationType(NotificationType.USER_NOTIFICATION)
                                notification.setMac(Backend.getGlobule(contact.getDomain()).config.Mac)
                                
                                let alias = ""
                                if(file.videos){
                                    alias = file.videos[0].getDescription()
                                }else if (file.titles){
                                    alias = file.titles[0].getName()
                                }else if (file.audios){
                                    alias = file.audio[0].getTitle()
                                }

                                let date = new Date()
                                let msg = `
                                <div style="display: flex; flex-direction: column; padding: 16px;">
                                    <div>
                                    ${date.toLocaleString()}
                                    </div>
                                    <div>
                                        <div style="display: flex; flex-direction: column;">
                                                <p>
                                                    ${AccountController.account.getName()} has share file with you,
                                                </p>

                                                <globular-link alias="${alias}" mime="${file.getMime()}" path="${file.getPath()}" thumbnail="${file.getThumbnail()}" domain="${file.globule.domain}"></globular-link>
      
                                            </div>
                                   
                                    </div>
                                </div>
                                `

                                notification.setMessage(msg)
                                rqst.setNotification(notification)

                                // Create the notification...
                                let globule = Backend.getGlobule(contact.getDomain())
                                generatePeerToken(globule, token => {
                                    globule.resourceService.createNotification(rqst, {
                                        token: token,
                                        domain: contact.getDomain()
                                    }).then((rsp) => {
                                        
                                        // Send notification...
                                        Backend.getGlobule(contact.getDomain()).eventHub.publish(contact.getId() + "@" + contact.getDomain() + "_notification_event", notification.serializeBinary(), false)
                                    }).catch(err => {
                                        displayError(err, 3000);
                                        console.log(err)
                                    })
                                })

                            })
                        }
                    })
                }

                let displayParticipants = () => {
                    let participantsDiv = summary_page.querySelector("#paticipants")
                    let range = document.createRange()

                    // set style...
                    participantsDiv.appendChild(range.createContextualFragment(`
                    <style>
                        .infos {
                            margin: 2px;
                            padding: 4px;
                            display: flex;
                            flex-direction: column;
                            border-radius: 4px;
                            align-items: center;
                            transition: background 0.2s ease,padding 0.8s linear;
                            background-color: var(--surface-color);
                            color: var(--primary-text-color);
                        }
            
                        .infos img{
                            max-height: 64px;
                            max-width: 64px;
                            border-radius: 32px;
                        }
            
                        .infos span{
                            font-size: 1rem;
                        }
                    </style>
                    `))
                    

                    participants.forEach(a => {
                        let name = a.name
                        if(a.getFirstname().length > 0 && a.getLastname().length > 0){
                            name = a.getFirstname() + " " + a.getLastname()
                        }
                        let uuid = "_" + getUuidByString(a.getId() + "@" + a.getDomain())
                        let html = `
                        <div id="${uuid}" class="infos">
                            <img style="width: 32px; height: 32px; display: ${a.getProfilepicture().length == 0 ? "none" : "block"};" src="${a.getProfilepicture()}"></img>
                            <iron-icon icon="account-circle" style="width: 32px; height: 32px; --iron-icon-fill-color:var(--palette-action-disabled); display: ${a.getProfilepicture().length > 0 ? "none" : "block"};"></iron-icon>
                            <span>${name}</span>
                        </div>
                        `
                        participantsDiv.appendChild(range.createContextualFragment(html))
                    })

                    // display resources...
                    displayResources()
                }

                if (groups.length == 0) {
                    displayParticipants()
                } else {
                    getMembers(0)
                }
            })


        }

        this.appendChild(wizard)

        // So he I will connect events...
        files.forEach(file => {
            let title = null
            let video = null
            let audio = null
            if (file.titles) {
                title = file.titles[0]
            } else if (file.videos) {
                video = file.videos[0]
            } else if (file.audios) {
                audio = file.audios[0]
            }

            let uuid = "_" + getUuidByString(file.getPath())

            let infos_btn = this.querySelector(`#${uuid + "_infos_btn"}`)
            if (title) {
                infos_btn.onclick = () => {
                    this.showTitleInfo(title)
                }
            } else if (video) {
                infos_btn.onclick = () => {
                    this.showVideoInfo(video)
                }
            } else {
                infos_btn.style.display = "none"
            }

            infos_btn.onmouseover = () => {
                infos_btn.style.cursor = "pointer"
            }
            infos_btn.onmouseleave = () => {
                infos_btn.style.cursor = "default"
            }

            let checkbox = this.querySelector(`#${uuid + "_checkbox"}`)
            file.selected = true;
            checkbox.onclick = () => {
                file.selected = checkbox.checked;
                console.log(file.getPath(), " is selected ", file.selected)
            }

        })

        // Close the wizard...
        wizard.onclose = () => {
            this.close()
        }

        // Cancel button...
        this.shadowRoot.querySelector("paper-icon-button").onclick = () => {
            this.close()
        }
    }

    // save permission, it will return map of errors if some permissions can't be set 
    // for a given file.
    setFilesPermissions(permissions_, files, callback) {

        let errors = {}

        // save permissions.
        let saveFilePermissions = (f, permissions, callback, errorCallback) => {
            /** todo write the code to save the permission. */
            console.log("save permissions: ", permissions)
            let rqst = new SetResourcePermissionsRqst
            let globule = f.globule
            rqst.setPath(f.getPath())
           
            rqst.setResourcetype("file")
            rqst.setPermissions(permissions)
            generatePeerToken(globule, token => {
                globule.rbacService.setResourcePermissions(rqst, { domain: globule.domain, token: token })
                    .then(() => { console.log("save permission successfully!"); callback(); })
                    .catch(err => {
                        errorCallback(err)
                    })
            })
        }

        let setPermissions = (index) => {
            if (index == files.length) {
                callback(errors)
                return
            }

            let f = files[index]
            let permissions = new Permissions
            permissions.setPath(f.getPath())
            permissions.setResourceType("file")

            let rqst = new GetResourcePermissionsRqst
            rqst.setPath(f.getPath())
            let globule = f.globule

            generatePeerToken(f.globule, token => {
                f.globule.rbacService.getResourcePermissions(rqst, { domain: globule.domain, token: token }).then(
                    rsp => {
                        permissions = rsp.getPermissions()
                        console.log("permission find for file ", f.getPath(), permissions)
                        // so here I will merge the value for permission_ (taken from the interface)
                        // and the existing permissions from the backend.
                        permissions_.allowed.forEach(p => {

                            // Get existing allowed permission accounts list.
                            let allowed = permissions.getAllowedList()

                            // The existing permission with the same name
                            let p_ = allowed.filter(p__ => p__.getName() == p.getName())[0]
                            if (p_) {
                                let accounts_lst = p.getAccountsList()
                                accounts_lst.forEach(a => {
                                    let accounts_lst_ = p_.getAccountsList()
                                    if (accounts_lst_.filter(a_ => a_ == a).length == 0) {
                                        accounts_lst_.push(a)
                                    }
                                    p_.setAccountsList(accounts_lst_)
                                })

                                let groups_lst = p.getGroupsList()
                                groups_lst.forEach(g => {
                                    let groups_lst_ = p_.getGroupsList()
                                    if (groups_lst_.filter(g_ => g_ == g).length == 0) {
                                        groups_lst_.push(g)
                                    }
                                    p_.setGroupsList(groups_lst_)
                                })
                            } else {
                                // no permission with that name exist so I will simply append the new one...
                                permissions.addAllowed(p)
                            }
                        })

                        // Now the denied permissions.
                        permissions_.denied.forEach(p => {

                            // Get existing allowed permission accounts list.
                            let denied = permissions.getDeniedList()

                            // The existing permission with the same name
                            let p_ = denied.filter(p__ => p__.getName() == p.getName())[0]
                            if (p_) {
                                let accounts_lst = p.getAccountsList()
                                accounts_lst.forEach(a => {
                                    let accounts_lst_ = p_.getAccountsList()
                                    if (accounts_lst_.filter(a_ => a_ == a).length == 0) {
                                        accounts_lst_.push(a)
                                    }
                                    p_.setAccountsList(accounts_lst_)
                                })

                                let groups_lst = p.getGroupsList()
                                groups_lst.forEach(g => {
                                    let groups_lst_ = p_.getGroupsList()
                                    if (groups_lst_.filter(g_ => g_ == g).length == 0) {
                                        groups_lst_.push(g)
                                    }
                                    p_.setGroupsList(groups_lst_)
                                })
                            } else {
                                // no permission with that name exist so I will simply append the new one...
                                permissions.addDenied(p)
                            }
                        })

                        // next file...
                        saveFilePermissions(f, permissions, () => {
                            setPermissions(++index)
                        }, err => { console.log("---------->", err); errors[f.getPath()] = err; setPermissions(++index) })

                    }).catch(err => {

                        let msg = JSON.parse(err.message);
                        if (msg.ErrorMsg.startsWith("item not found")) {
                            permissions.setAllowedList(permissions_.allowed)
                            permissions.setDeniedList(permissions_.denied)
                            saveFilePermissions(f, permissions, () => {
                                setPermissions(++index)
                            }, err => { console.log("---------------> ", err); errors[f.getPath()] = err; setPermissions(++index) })

                        }
                    })
            })
        }

        // start setting permissions.
        let index = 0;
        if (files.length > 0) {
            setPermissions(index)
        }

    }

    showVideoInfo(video) {
        let uuid = randomUUID()
        let html = `
        <paper-card id="video-info-box-dialog-${uuid}" style="background: var(--surface-color); border-top: 1px solid var(--surface-color); border-left: 1px solid var(--surface-color); z-index:1001">
            <globular-informations-manager id="video-info-box"></globular-informations-manager>
        </paper-card>
        `
        let videoInfoBox = document.getElementById("video-info-box")


        if (videoInfoBox == undefined) {
            let range = document.createRange()
            document.body.appendChild(range.createContextualFragment(html))
            videoInfoBox = document.getElementById("video-info-box")
            let parent = document.getElementById("video-info-box-dialog-" + uuid)
            parent.style.position = "fixed"
            parent.style.top = "75px"
            parent.style.left = "50%"
            parent.style.transform = "translate(-50%)"
            videoInfoBox.onclose = () => {
                parent.parentNode.removeChild(parent)
            }
        }
        videoInfoBox.setVideosInformation([video])
    }

    showTitleInfo(title) {
        let uuid = randomUUID()
        let html = `
        <paper-card id="video-info-box-dialog-${uuid}" style="background: var(--surface-color); border-top: 1px solid var(--surface-color); border-left: 1px solid var(--surface-color); z-index: 1001">
            <globular-informations-manager id="title-info-box"></globular-informations-manager>
        </paper-card>
        `
        let titleInfoBox = document.getElementById("title-info-box")
        if (titleInfoBox == undefined) {
            let range = document.createRange()
            document.body.appendChild(range.createContextualFragment(html))
            titleInfoBox = document.getElementById("title-info-box")
            let parent = document.getElementById("video-info-box-dialog-" + uuid)
            parent.style.position = "fixed"
            parent.style.top = "75px"
            parent.style.left = "50%"
            parent.style.transform = "translate(-50%)"

            titleInfoBox.onclose = () => {
                parent.parentNode.removeChild(parent)
            }
        }
        titleInfoBox.setTitlesInformation([title])
    }


    show() {
        let fileExplorer = this.view._file_explorer_;
        let globule = fileExplorer.globule

        globule.eventHub.publish("__show_share_wizard__", {"file_explorer_id": fileExplorer.id, "wizard": this}, true)
    }

    close() {
        if(this.onclose){
            this.onclose()
        }
        this.parentElement.removeChild(this)
    }
}

customElements.define('globular-share-resource-wizard', ShareResourceWizard)
