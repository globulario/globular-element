import { AccountController } from "../../backend/account";
import { Backend, displayMessage } from "../../backend/backend";
import { ContactList } from "./contactList";
import { SentContactInvitations } from "./sentContactInvitations";
import { ReceivedContactInvitations } from "./receivedContactInvitations";

import "@polymer/iron-icons/iron-icons.js";

// the social icons
import "@polymer/iron-icons/social-icons.js";
import "@polymer/paper-button/paper-button.js";
import "@polymer/paper-icon-button/paper-icon-button.js";

import { SearchContact } from "./searchContact";


/**
 * The list of contacts.
 */
export class Contacts extends HTMLElement {
    // attributes.

    // Create the contact view.
    constructor() {
        super()

        this.style.display = "none";

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.shadowRoot.innerHTML = `
<style>
    #Contacts-div {
        display: flex;
        flex-wrap: wrap;
        flex-direction: column;
        overflow: hidden;
    }

    #Contacts_menu_div {
        overflow-y: auto;
    }

    #title {
        display: none;
        justify-content: center;
    }
    
    #Contacts-list {
        flex: 1;
        overflow: auto;
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


    paper-card {
        background-color: var(--palette-background-paper);
        color: var(--palette-text-primary);
        padding: 10px;
    }

    #header {
        width: 100%;
    }

    .section-header {
        display: flex;
        font-weight: 550;
        border-top: 1px solid var(--palette-divider);
        align-items: center;
        margin-top: 35px;
        padding-top: 10px;
        padding-bottom: 5px;
        flex-grow: 1;
    }

    .section-title {
        font-size: 1.1em;
        padding-left: 5px;
        flex-grow: 1;
    }

    .collapsible-container {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding-left: 5px;
    }


    .collapsible-container span {
        flex-grow: 1;
        padding: 5px 10px 5px 10px;
    }

    .subitems {
        
    }
</style>

<div id="Contacts-div">
    <div id="header">
        <div class="section-header">
            <div class="section-title" >Contacts</div>
            <paper-icon-button id="add-contact-btn" icon="icons:add" style="cursor: pointer;" title="Add a new contact"></paper-icon-button>
        </div>
        <div>

            <div id="contacts" class="collapsible-container" for="contacts-collapse">
                <iron-icon icon="social:group"></iron-icon>
                <span id="contacts-lst-text">Contacts</span>
                <iron-icon id="contacts-icon" icon="icons:expand-more"></iron-icon>
            </div>
            <iron-collapse id="contacts-collapse" class="subitems">
               
            </iron-collapse>


            <div id="sent-invitations" class="collapsible-container" for="sent-invitations-collapse">
                <iron-icon icon="icons:send"></iron-icon>
                <span id="sent-invitations-text">Sent Invitations</span>
                <iron-icon id="sent-invitations-icon" icon="icons:expand-more"></iron-icon>
            </div>
            <iron-collapse id="sent-invitations-collapse" class="subitems">
                
            </iron-collapse>


            <div id="received-invitations" class="collapsible-container" for="received-invitations-collapse">
                <iron-icon icon="icons:inbox"></iron-icon>
                <span id="received-invitations-text">Received Invitations</span>
                <iron-icon id="received-invitations-icon" icon="icons:expand-more"></iron-icon>
            </div>
            <iron-collapse id="received-invitations-collapse" class="subitems">
                
            </iron-collapse>

        </div>
    </div>
</div>
        `

        // The logged account.
        this.account = null;

        this.inviteContactInput = null;

        let collapseBtn = this.shadowRoot.querySelectorAll("div[for]")
        collapseBtn.forEach((btn) => {
            btn.onclick = () => {
                let collapse = this.shadowRoot.getElementById(btn.getAttribute("for"))
                let icon = this.shadowRoot.getElementById(btn.getAttribute("for").replaceAll("-collapse", "-icon"))
                if (collapse.opened) {
                    icon.setAttribute("icon", "icons:expand-more")
                } else {
                    icon.setAttribute("icon", "icons:expand-less")
                }
                collapse.toggle();
            }
        })


        // subscribe to the backend ready event.
        document.addEventListener("backend-ready", (globule) => {
            if (AccountController.__account__ != null) {
                this.style.display = "block";
                this.setAccount(AccountController.__account__)
            }

            // Subscribe to the login success event.
            Backend.eventHub.subscribe("login_success_", uuid => { }, (account) => {
                this.style.display = "block";
                this.setAccount(account)
            }, true);
        });
    }



    // Init the contact at login time.
    setAccount(account) {
        if(this.account != null){
            return;
        }

        this.account = account;

        // Action's
        let addContactBtn = this.shadowRoot.getElementById("add-contact-btn")
        addContactBtn.onclick = () => {
            let searchContact = document.querySelector("globular-search-contact")
            if (searchContact != null) {
                return; /** Nothing here. */
            }

            searchContact = new SearchContact()

            // Set the event handlers.
            searchContact.onInviteContact = this.onInviteContact
            searchContact.onRevokeContact = this.onRevokeContact
            searchContact.onAcceptContact = this.onAcceptContact
            searchContact.onDeclineContact = this.onDeclineContact

            document.body.appendChild(searchContact)
        }

        let contacts = this.shadowRoot.getElementById("contacts-collapse")
        contacts.appendChild(new ContactList(account, this.onDeleteContact))

        let sentInvitations = this.shadowRoot.getElementById("sent-invitations-collapse")
        sentInvitations.appendChild(new SentContactInvitations(account, this.onRevokeContact))

        let receivedInvitations = this.shadowRoot.getElementById("received-invitations-collapse")
        receivedInvitations.appendChild(new ReceivedContactInvitations(account, this.onAcceptContact, this.onDeclineContact))

    }

    findAccountByEmail(email) {

        AccountController.getAccounts(`{"email":{"$regex": "${email}", "$options": "im"}}`, false, (accounts) => {
            accounts = accounts.filter((obj) => {
                return obj.getId() !== AccountController.account.getId();
            });

            // set the getValues function that will return the list to be use as filter.
            if (this.inviteContactInput != undefined) {
                this.inviteContactInput.setValues(accounts)
            }

        }, (err) => {
            //callback([])
            displayMessage(err, 3000)
        })
    }

    // Function to create a styled message
    createMessage = (contact, actionText) => {
        return `
        <div style="display: flex; align-items: center; gap: 10px;">
            <img src='${contact.getProfilepicture()}' alt='Profile Picture' style='width: 40px; height: 40px; border-radius: 50%; object-fit: cover;'>
            <div>
                <strong>${contact.getFirstname()} ${contact.getLastname()}</strong><br>
                <small>${contact.getEmail()}</small><br>
                ${actionText}
            </div>
        </div>
    `;
    };

    // On invite contact action
    onInviteContact = (contact) => {
        displayMessage(this.createMessage(contact, "Invitation was sent."), 3000);
        Backend.eventHub.publish("invite_contact_event_", contact, true);
    };

    // On revoke contact invitation action
    onRevokeContact = (contact) => {
        displayMessage(this.createMessage(contact, "Invitation was revoked!"), 3000);
        Backend.eventHub.publish("revoke_contact_invitation_event_", contact, true);
    };

    // On accept contact invitation action
    onAcceptContact = (contact) => {
        displayMessage(this.createMessage(contact, "Invitation was accepted!"), 3000);
        Backend.eventHub.publish("accept_contact_invitation_event_", contact, true);
    };

    // Decline contact invitation
    onDeclineContact = (contact) => {
        displayMessage( this.createMessage(contact, "Invitation was declined!"),
            3000
        );

        Backend.eventHub.publish("decline_contact_invitation_event_", contact, true);
    }

    // Delete contact.
    onDeleteContact = (contact) => {

        // Here I will ask the user for confirmation before actually delete the contact informations.
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
  
              </style>
              <div id="yes-no-contact-delete-box">
                <div>Your about to delete the contact</div>
                <globular-contact-card id="contact-to-delete" contact="${contact.getId() + "@" + contact.getDomain()}"></globular-contact-card>
                <div>Is it what you want to do? </div>
                <div style="justify-content: flex-end;">
                  <paper-button raised id="yes-delete-contact">Yes</paper-button>
                  <paper-button raised id="no-delete-contact">No</paper-button>
                </div>
              </div>
              `,
            15000 // 15 sec...
        );

        let yesBtn = document.querySelector("#yes-delete-contact")
        let noBtn = document.querySelector("#no-delete-contact")

        // On yes
        yesBtn.onclick = () => {
            toast.hideToast();

            displayMessage(
                "<iron-icon icon='send' style='margin-right: 10px;'></iron-icon><div>Contact " +
                contact.getEmail() +
                " was remove from your contacts!</div>",
                3000
            );

            Backend.eventHub.publish("delete_contact_event_", contact, true);

        }

        noBtn.onclick = () => {
            toast.hideToast();
        }
    }


}

customElements.define('globular-contacts-menu', Contacts)