import { Call, CreateNotificationRqst, NotificationType, SetCallRqst } from "globular-web-client/resource/resource_pb";
import { AccountController } from "../../backend/account";
import { Backend, displayMessage, generatePeerToken, getUrl } from "../../backend/backend";
import { VideoConversation } from "../videoCall/videoConversation";
import getUuidByString from "uuid-by-string";

/**
 * The contact list.
 */
export class ContactList extends HTMLElement {

    // Create the applicaiton view.
    constructor(account, onDeleteContact, badge) {
        super()

        this.badge = badge;

        // Keep contact card in memory...
        this.cards = {}

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.account = account;
        this.onDeleteContact = onDeleteContact;
        let globule = Backend.getGlobule(account.getDomain())

        globule.eventHub.subscribe("accepted_" + account.getId() + "@" + account.getDomain() + "_evt",
            (uuid) => { },
            (evt) => {
                let invitation = JSON.parse(evt);
                AccountController.getAccount(invitation.getId(),
                    (contact) => {
                        if (invitation.getProfilepicture())
                            contact.setProfilepicture(invitation.getProfilepicture())
                        contact.ringtone = invitation.getRingtone()
                        this.appendContact(contact);
                    },
                    err => {
                        displayError(err, 3000)
                        console.log(err)
                    })
            },
            false, this)

        globule.eventHub.subscribe("deleted_" + account.getId() + "@" + account.getDomain() + "_evt",
            (uuid) => { },
            (evt) => {
                let invitation = JSON.parse(evt);
                AccountController.getAccount(invitation.getId(),
                    (contact) => {
                        this.removeContact(contact);
                    },
                    err => {
                        displayError(err, 3000)
                        console.log(err)
                    })
            },
            false, this)

        // calling events...
        globule.eventHub.subscribe("calling_" + account.getId() + "@" + account.getDomain() + "_evt", uuid => { }, evt => {

            // The contact has answer the call!
            let call = Call.deserializeBinary(Uint8Array.from(evt.split(",")))

            AccountController.getAccount(call.getCaller(), caller => {
                AccountController.getAccount(call.getCallee(), callee => {

                    let globule = Backend.getGlobule(callee.getDomain())

                    generatePeerToken(globule, token => {
                        let url = getUrl(globule)

                        // so here I will found the caller ringtone...
                        let path = caller.getRingtone()
                        path = path.replace(globule.config.WebRoot, "")

                        path.split("/").forEach(item => {
                            item = item.trim()
                            if (item.length > 0) {
                                url += "/" + encodeURIComponent(item)
                            }
                        })

                        url += "&token=" + token

                        let audio = new Audio(url)
                        audio.setAttribute("loop", "true")
                        audio.setAttribute("autoplay", "true")

                        // So now I will display the interface the user to ask...
                        // So here I will get the information from imdb and propose to assciate it with the file.
                        let toast = displayMessage(`
                        <style>
                           
                            #select-media-dialog{
                                display: flex; flex-direction: column; 
                                justify-content: center; 
                                width: 100%;
                            }

                            paper-icon-button {
                                width: 40px;
                                height: 40px;
                                border-radius: 50%;
                            }

                            #call-img{
                                width: 185.31px; 
                                height: 100%; 
                                align-self: center; 
                                justify-self: center;
                                padding-top: 10px; 
                                padding-bottom: 15px;
                            }
                              
                        </style>
                        <div id="select-media-dialog">
                            <div>Incomming Call from</div>
                            <img style="width: 185.31px; height: 100%; align-self: center; padding-top: 10px; padding-bottom: 15px;" src="${caller.getProfilepicture()}"> </img>
                            <div style="display: flex; justify-content: center; align-items: center;">
                                <span style="max-width: 300px; font-size: 1.5rem; margin-right: 16px;">${caller.getName()}</span>
                                <paper-icon-button id="ok-button" style="background-color: green; margin-right: 16px;" icon="communication:call"></paper-icon-button>
                                <paper-icon-button id="cancel-button"  style="background-color: red;" icon="communication:call-end">Dismiss</paper-button>
                            </div>
                        </div>
                        `)


                        let timeout = setTimeout(() => {
                            audio.pause()
                            if (toast) {
                                toast.dismiss();
                            }

                            Backend.getGlobule(caller.getDomain()).eventHub.publish(call.getUuid() + "_miss_call_evt", call.serializeBinary(), false)
                            if (caller.getDomain() != callee.getDomain())
                                Backend.getGlobule(callee.getDomain()).eventHub.publish(call.getUuid() + "_miss_call_evt", call.serializeBinary(), false)

                        }, 30 * 1000)

                        let cancelBtn = toast.el.querySelector("#cancel-button")
                        cancelBtn.onclick = () => {
                            toast.dismiss();
                            audio.pause()
                            clearTimeout(timeout)

                            // Here I will send miss call event...
                            Backend.getGlobule(caller.getDomain()).eventHub.publish(call.getUuid() + "_miss_call_evt", call.serializeBinary(), false)
                            if (caller.getDomain() != callee.getDomain())
                                Backend.getGlobule(callee.getDomain()).eventHub.publish(call.getUuid() + "_miss_call_evt", call.serializeBinary(), false)

                        }

                        let okBtn = toast.el.querySelector("#ok-button")
                        okBtn.onclick = () => {

                            toast.dismiss();
                            audio.pause()
                            clearTimeout(timeout)

                            // The contact has answer the call!
                            let videoConversation = new VideoConversation(call.getUuid(), caller.getDomain())

                            // append it to the workspace.
                            document.appendChild(videoConversation)

                            Backend.getGlobule(caller.getDomain()).eventHub.publish(call.getUuid() + "_answering_call_evt", call.serializeBinary(), false)
                            if (callee.getDomain() != caller.getDomain()) {
                                Backend.getGlobule(callee.getDomain()).eventHub.publish(call.getUuid() + "_answering_call_evt", call.serializeBinary(), false)
                            }
                        }

                        // Here the call was miss...
                        Backend.getGlobule(caller.getDomain()).eventHub.subscribe(call.getUuid() + "_miss_call_evt", uuid => { }, evt => {

                            clearTimeout(timeout)

                            // The contact has answer the call!
                            audio.pause()
                            toast.dismiss();
                        }, false)
                    }, err => ApplicationView.displayMessage(err, 3000))



                })

            }, err => ApplicationView.displayMessage(err, 3000))
        }, false)


        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            .contact-invitations-list{
                display: flex;
                flex-direction: column;
            }

            .contact-invitations-list globular-contact-card{
                border-bottom: 1px solid var(--palette-divider);
            }
        </style>
        <div class="contact-invitations-list">
            <slot></slot>
        </div>
        `
        // if the peer is not connected when the user is log in the contact card will not be displayed...
        Backend.eventHub.subscribe("update_peers_evt_", uuid => { }, peer => {
            AccountController.getContacts(this.account, `{"status":"accepted"}`, (invitations) => {
                for (var i = 0; i < invitations.length; i++) {
                    let invitation = invitations[i]
                    AccountController.getAccount(invitation._id,
                        (contact) => {
                            if (invitation.getProfilepicture())
                                contact.setProfilepicture(invitation.getProfilepicture())
                            contact.ringtone = invitation.getRingtone()
                            this.appendContact(contact);
                        },
                        err => {
                            ApplicationView.displayMessage(err, 3000)
                            console.log(err)
                        })
                }
            }, err => {
                ApplicationView.displayMessage(err, 3000);
            })
        }, true)

        Model.eventHub.subscribe("stop_peer_evt_", uuid => { },
            peer => {
                Model.eventHub.publish("remove_contact_card_" + peer.getDomain() + "." + peer.getDomain() + "_evt_", {}, true)
            }, true)

        // So here I will get the list of sent invitation for the account.
        AccountController.getContacts(this.account, `{"status":"accepted"}`, (invitations) => {

            for (var i = 0; i < invitations.length; i++) {
                let invitation = invitations[i]
                AccountController.getAccount(invitation.getId(),
                    (contact) => {
                        if (invitation.getProfilepicture())
                            contact.setProfilepicture(invitation.getProfilepicture())
                        contact.ringtone = invitation.getRingtone()
                        this.appendContact(contact);
                    },
                    err => {
                        displayError(err, 3000)
                        console.log(err)
                    })
            }
        }, err => {
            displayError(err, 3000);
        })

    }

    getContactCard(contact) {
        let id = "_" + getUuidByString(contact.getId() + "@" + contact.getDomain() + "_accepted_invitation")
        let card = this.querySelector("#" + id)
        return card;
    }

    appendContact(contact) {

        let id = "_" + getUuidByString(contact.getId() + "@" + contact.getDomain() + "_accepted_invitation")
        if (this.querySelector("#" + id) != undefined) {
            return
        }

        this.innerHtml = ""

        let card = new ContactCard(this.account, contact)
        card.id = id

        card.setCallButton(this.onCallContact)

        card.setDeleteButton(this.onDeleteContact)
        card.showRingtone()
        this.appendChild(card)

        this.badge.label = this.children.length
        this.badge.style.display = "block"

        // if the globule is disconnected I will remove the contact...
        Model.eventHub.subscribe("remove_contact_card_" + contact.getDomain() + "_evt_", uuid => { }, evt => {
            if (card.parentNode) {
                card.parentNode.removeChild(card)
            }
        }, true)
    }

    removeContact(contact) {
        // simply remove it.
        let id = "_" + getUuidByString(contact.getId() + "@" + contact.getDomain() + "_accepted_invitation")

        let card = this.querySelector("#" + id)
        if (card != undefined) {
            this.removeChild(card)
            this.badge.label = this.children.length
            if (this.children.length == 0) {
                this.badge.style.display = "none"
            }
        }
    }

    onCallContact(contact) {

        let call = new Call()
        call.setUuid(randomUUID())
        call.setCallee(contact.getId() + "@" + contact.getDomain())
        call.setCaller(AccountController.account.getId() + "@" + AccountController.account.getDomain())
        call.setStarttime(Math.floor(Date.now() / 1000)) // set unix timestamp...
        call.setEndtime(-1)
        let rqst = new SetCallRqst
        rqst.setCall(call)

        // Set value on the callee...
        let globule = Backend.getGlobule(AccountController.account.getDomain())
        generatePeerToken(globule, token => {
            globule.resourceService.setCall(rqst, { domain: globule.domain, token: token })
                .then(rsp => {
                    AccountController.getAccount(call.getCaller(), caller => {
                        AccountController.getAccount(call.getCallee(), callee => {

                            let url = getUrl(globule)

                            // so here I will found the caller ringtone...
                            let path = callee.ringtone
                            path = path.replace(globule.config.WebRoot, "")

                            path.split("/").forEach(item => {
                                item = item.trim()
                                if (item.length > 0) {
                                    url += "/" + encodeURIComponent(item)
                                }
                            })

                            if (localStorage.getItem("user_token") != undefined) {
                                url += "?token=" + token
                            }

                            let audio = new Audio(url)
                            audio.setAttribute("loop", "true")
                            audio.setAttribute("autoplay", "true")

                            // So now I will display the interface the user to ask...
                            // So here I will get the information from imdb and propose to assciate it with the file.
                            let toast = displayMessage(`
                            <style>
                            
                                paper-icon-button {
                                    width: 40px;
                                    height: 40px;
                                    border-radius: 50%;
                                }

                            </style>
                            <div id="select-media-dialog">
                                <div>Outgoing Call to </div>
                                <div style="display: flex; flex-direction: column; justify-content: center;">
                                    <img style="width: 185.31px; align-self: center; padding-top: 10px; padding-bottom: 15px;" src="${callee.getProfilepicture()}"> </img>
                                </div>
                                <span style="max-width: 300px; font-size: 1.5rem;">${callee.getName()}</span>
                                <div style="display: flex; justify-content: flex-end;">
                                    <paper-icon-button id="cancel-button" style="background-color: red " icon="communication:call-end"></paper-icon-button>
                                </div>
                            </div>
                            `)

                            // set timeout...
                            let timeout = setTimeout(() => {
                                audio.pause()
                                toast.dismiss();
                                Backend.getGlobule(caller.getDomain()).eventHub.publish(call.getUuid() + "_miss_call_evt", call.serializeBinary(), false)
                                if (caller.getDomain() != callee.getDomain())
                                    Backend.getGlobule(callee.getDomain()).eventHub.publish(call.getUuid() + "_miss_call_evt", call.serializeBinary(), false)

                            }, 30 * 1000)

                            let cancelBtn = toast.el.querySelector("#cancel-button")
                            cancelBtn.onclick = () => {
                                toast.dismiss();
                                audio.pause()
                                clearTimeout(timeout)

                                // Here I will send miss call event...
                                Backend.getGlobule(caller.getDomain()).eventHub.publish(call.getUuid() + "_miss_call_evt", call.serializeBinary(), false)
                                if (caller.getDomain() != callee.getDomain())
                                    Backend.getGlobule(callee.getDomain()).eventHub.publish(call.getUuid() + "_miss_call_evt", call.serializeBinary(), false)
                            }

                            // Here the call succeed...
                            Backend.getGlobule(contact.getDomain()).eventHub.subscribe(call.getUuid() + "_answering_call_evt", uuid => { }, evt => {
                                // The contact has answer the call!
                                audio.pause()
                                toast.dismiss();
                                clearTimeout(timeout)


                                let call = Call.deserializeBinary(Uint8Array.from(evt.split(",")))

                                // The contact has answer the call!
                                let videoConversation = new VideoConversation(call.getUuid(), AccountController.account.getDomain())

                                // append it to the workspace.
                                document.appendChild(videoConversation)


                                // start the video conversation.
                                globule.eventHub.publish("start_video_conversation_" + call.getUuid() + "_evt", contact, true)

                            }, false)

                            // Here the call was miss...
                            Backend.getGlobule(contact.getDomain()).eventHub.subscribe(call.getUuid() + "_miss_call_evt", uuid => { }, evt => {

                                // The contact has answer the call!
                                audio.pause()
                                toast.dismiss();
                                clearTimeout(timeout)

                                generatePeerToken(Backend.getGlobule(contact.getDomain()), token => {
                                    let rqst = new CreateNotificationRqst
                                    let notification = new Notification
                                    notification.setDate(parseInt(Date.now() / 1000)) // Set the unix time stamp...
                                    notification.setId(call.getUuid())
                                    notification.setRecipient(contact.getId() + "@" + contact.getDomain())
                                    notification.setSender(AccountController.account.getId() + "@" + AccountController.account.getDomain())
                                    notification.setNotificationType(NotificationType.USER_NOTIFICATION)
                                    notification.setMac(Backend.getGlobule(contact.getDomain()).config.Mac)

                                    let date = new Date()
                                    let msg = `
                                    <div style="display: flex; flex-direction: column; padding: 16px;">
                                        <div>
                                            ${date.toLocaleString()}
                                        </div>
                                        <div>
                                            Missed call from ${AccountController.account.getName()}
                                        </div>
                                    </div>
                                    `

                                    notification.setMessage(msg)
                                    rqst.setNotification(notification)

                                    // Create the notification...
                                    Backend.getGlobule(contact.getDomain()).resourceService.createNotification(rqst, {
                                        token: token,
                                        domain: Backend.domain
                                    }).then((rsp) => {
                                        /** nothing here... */
                                        // use the ts class to send notification...
                                        let notification_ = new Notification()
                                        notification_.id = notification.getId()
                                        notification_.date = date
                                        notification_.sender = notification.getSender()
                                        notification_.recipient = notification.getRecipient()
                                        notification_.text = notification.getMessage()
                                        notification_.type = 0

                                        // Send notification...
                                        Backend.getGlobule(contact.getDomain()).eventHub.publish(contact.getId() + "@" + contact.getDomain() + "_notification_event", notification_.toString(), false)
                                    }).catch(err => {
                                        ApplicationView.displayMessage(err, 3000);
                                        console.log(err)
                                    })


                                    Model.eventHub.publish("calling_" + contact.getId() + "@" + contact.getDomain() + "_evt", call, true)
                                })

                            }, false)

                            // so here I will play the audio of the contact util it respond or the delay was done...
                            Backend.getGlobule(contact.getDomain()).eventHub.publish("calling_" + contact.getId() + "@" + contact.getDomain() + "_evt", call.serializeBinary(), false)

                        })



                    }, err => ApplicationView.displayMessage(err, 3000))

                }, err => ApplicationView.displayMessage(err, 3000))

            if (contact.getDomain() != AccountController.account.getDomain()) {
                let globule = Backend.getGlobule(contact.getDomain())
                generatePeerToken(globule, token => {
                    globule.resourceService.setCall(rqst, { domain: globule.domain, token: token })
                }, err => ApplicationView.displayMessage(err, 3000))
            }
        })

    }

}

customElements.define('globular-contact-list', ContactList)
