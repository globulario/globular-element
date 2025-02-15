import { AccountController } from "../../backend/account";
import { Backend, displayMessage } from "../../backend/backend";
import { ContactList } from "./contactList";
import { ContactCard } from "./contactCard";
import { SentContactInvitations } from "./sentContactInvitations";
import { ReceivedContactInvitations } from "./receivedContactInvitations";

import "@polymer/iron-icons/iron-icons.js";

// the social icons
import "@polymer/iron-icons/social-icons.js";
import { Search } from "brace";
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

    paper-tab {
        padding-right: 25px;
    }

    paper-tabs {
        --paper-tabs-selection-bar-color: var(--palette-primary-main);
        color: var(--palette-text-primary);
        --paper-tab-ink: var(--palette-action-disabled);
    }

    paper-tab paper-badge {
        --paper-badge-background: var(--palette-warning-main);
        --paper-badge-width: 16px;
        --paper-badge-height: 16px;
        --paper-badge-margin-left: 10px;
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
        display: none;
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
                <span>Contacts</span>
                <paper-badge style="display: none;" for="contacts-label"></paper-badge>
                <iron-icon id="contacts-icon" icon="icons:expand-more"></iron-icon>
            </div>
            <iron-collapse id="contacts-collapse" class="subitems">
                <slot name="contacts-content"></slot>
            </iron-collapse>

            <div id="sent-invitations" class="collapsible-container" for="sent-invitations-collapse">
                <iron-icon icon="icons:send"></iron-icon>
                <span>Sent Invitations</span>
                <paper-badge style="display: none;" for="sent-contact-invitations-label"></paper-badge>
                <iron-icon id="sent-invitations-icon" icon="icons:expand-more"></iron-icon>
            </div>
            <iron-collapse id="sent-invitations-collapse" class="subitems">
                <slot name="sent-invitations-content"></slot>
            </iron-collapse>

            <div id="received-invitations" class="collapsible-container" for="received-invitations-collapse">
                <iron-icon icon="icons:inbox"></iron-icon>
                <span>Received Invitations</span>
                 <paper-badge style="display: none;" for="received-contact-invitations-label"></paper-badge>
                <iron-icon id="received-invitations-icon" icon="icons:expand-more"></iron-icon>
            </div>
            <iron-collapse id="received-invitations-collapse" class="subitems">
                <slot name="received-invitations-content"></slot>
            </iron-collapse>
        </div>
    </div>
    <div id="Contacts-list"></div>
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
                    collapse.hide()
                    icon.setAttribute("icon", "icons:expand-more")
                } else {
                    collapse.show()
                    icon.setAttribute("icon", "icons:expand-less")
                }
            }
        })


        // subscribe to the backend ready event.
        document.addEventListener("backend-ready", (globule) => {
            if(AccountController.__account__ != null){
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

        this.account = account;

        // Action's
        let contactLst = this.shadowRoot.getElementById("Contacts-list")
        let sentContactInvitationBadge = this.shadowRoot.querySelector('paper-badge[for="sent-contact-invitations-label"]');
        let receivedContactInvitationBadge = this.shadowRoot.querySelector('paper-badge[for="received-contact-invitations-label"]');
        let contactsBadge = this.shadowRoot.querySelector('paper-badge[for="contacts-label"]');

        let addContactBtn = this.shadowRoot.getElementById("add-contact-btn")
        addContactBtn.onclick = () => {
            let searchContact = document.querySelector("globular-search-contact")
            if(searchContact != null){
                return; /** Nothing here. */
            }

            searchContact = new SearchContact()
            document.body.appendChild(searchContact)    
        }

        let contactList = new ContactList(account, this.onDeleteContact, contactsBadge)
        contactLst.appendChild(contactList)

        let sentContactInvitations = new SentContactInvitations(account, this.onRevokeContact, sentContactInvitationBadge);
        contactLst.appendChild(sentContactInvitations)

        let receivedContactInvitations = new ReceivedContactInvitations(account, this.onAcceptContact, this.onDeclineContact, receivedContactInvitationBadge);
        contactLst.appendChild(receivedContactInvitations)

    }

    findAccountByEmail(email) {

        AccountController.getAccounts(`{"email":{"$regex": "${email}", "$options": "im"}}`, (accounts) => {
            accounts = accounts.filter((obj) => {
                return obj.id !== this.account.id;
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


    // On invite contact action.
    onInviteConctact = (contact) => {
        // Display the message to the user.
        displayMessage(
            "<iron-icon icon='send' style='margin-right: 10px;'></iron-icon><div>Invitation was sent to " +
            contact.email +
            "</div>",
            3000
        );

        // So here I will create a notification.
        Backend.eventHub.publish("invite_contact_event_", contact, true);
    };

    // On revoke contact invitation action.
    onRevokeContact = (contact) => {

        displayMessage(
            "<iron-icon icon='send' style='margin-right: 10px;'></iron-icon><div>Invitation to " +
            contact.getEmail() +
            " was revoked!</div>",
            3000
        );

        Backend.eventHub.publish("revoke_contact_invitation_event_", contact, true);

    }

    // On accept contact invitation
    onAcceptContact = (contact) => {
        displayMessage(
            "<iron-icon icon='send' style='margin-right: 10px;'></iron-icon><div>Invitation from " +
            contact.getEmail() +
            " was accepted!</div>",
            3000
        );

        Backend.eventHub.publish("accept_contact_invitation_event_", contact, true);
    }

    // Decline contact invitation
    onDeclineContact = (contact) => {
        displayMessage(
            "<iron-icon icon='send' style='margin-right: 10px;'></iron-icon><div>Invitation from " +
            contact.getEmail() +
            " was declined!</div>",
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
            toast.dismiss();

            displayMessage(
                "<iron-icon icon='send' style='margin-right: 10px;'></iron-icon><div>Contact " +
                contact.getEmail() +
                " was remove from your contacts!</div>",
                3000
            );

            Backend.eventHub.publish("delete_contact_event_", contact, true);

        }

        noBtn.onclick = () => {
            toast.dismiss();
        }
    }


}

customElements.define('globular-contacts-menu', Contacts)