import getUuidByString from "uuid-by-string";
import { AccountController } from "../../backend/account";
import { Backend, displayError } from "../../backend/backend";
import { ContactCard } from "./contactCard";

/**
 * Received contact invitations.
 */
export class ReceivedContactInvitations extends HTMLElement {

    // Create the applicaiton view.
    constructor(account, onAcceptContact, onDeclineContact) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.account = account;
        this.onAcceptContact = onAcceptContact;
        this.onDeclineContact = onDeclineContact;

        let domain = Backend.domain
        if (account.session) {
            domain = account.getDomain()
        }

        let globule = Backend.getGlobule(domain) // connect to the local event hub...

        globule.eventHub.subscribe("received_" + account.getId() + "@" + account.getDomain() + "_evt",
            (uuid) => { },
            (evt) => {
                let invitation = JSON.parse(evt);
                AccountController.getAccount(invitation._id,
                    (contact) => {
                        this.appendContact(contact);
                    },
                    err => {
                        displayError(err, 3000)
                        console.log(err)
                    })
            },
            false, this)

        globule.eventHub.subscribe("revoked_" + account.getId() + "@" + account.getId() + "_evt",
            (uuid) => { },
            (evt) => {
                let invitation = JSON.parse(evt);
                Account.getAccount(invitation._id,
                    (contact) => {
                        this.removeContact(contact);
                    },
                    err => {
                        displayError(err, 3000)
                        console.log(err)
                    })
            },
            false, this)

        globule.eventHub.subscribe("declined_" + account.getId() + "@" + account.getDomain() + "_evt",
            (uuid) => { },
            (evt) => {
                let invitation = JSON.parse(evt);
                AccountController.getAccount(invitation._id,
                    (contact) => {
                        this.removeContact(contact);
                    },
                    err => {
                        displayError(err, 3000)
                        console.log(err)
                    })
            },
            false, this)

        globule.eventHub.subscribe("accepted_" + account.getId() + "@" + account.getDomain() + "_evt",
            (uuid) => { },
            (evt) => {
                let invitation = JSON.parse(evt);
                AccountController.getAccount(invitation._id,
                    (contact) => {
                        this.removeContact(contact);
                    },
                    err => {
                        displayError(err, 3000)
                        console.log(err)
                    })
            },
            false, this)

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
        // So here I will get the list of sent invitation for the account.
        AccountController.getContacts(this.account, `{"status":"received"}`, (invitations) => {

            for (var i = 0; i < invitations.length; i++) {
                AccountController.getAccount(invitations[i]._id,
                    (contact) => {
                        this.appendContact(contact);
                    },
                    err => {
                        displayError(err, 3000)
                        console.log(err)
                    })
            }
        }, err => {
            displayError(err, 3000)
        })
    }

    // The connection callback.
    connectedCallback() {

    }

    appendContact(contact) {

        let id = "_" + getUuidByString(contact.getId() + "@" + contact.getDomain() + "_pending_invitation")
        if (this.querySelector("#" + id) != undefined) {
            return;
        }
        let card = new ContactCard(this.account, contact)

        card.id = id
        card.setAcceptDeclineButton(this.onAcceptContact, this.onDeclineContact)
        this.appendChild(card)
    }

    removeContact(contact) {
        // simply remove it.
        let id = "_" + getUuidByString(contact.getId() + "@" + contact.getDomain() + "_pending_invitation")
        let card = this.querySelector("#" + id)
        if (card != undefined) {
            this.removeChild(card)
        }
    }
}

customElements.define('globular-received-contact-invitations', ReceivedContactInvitations)
