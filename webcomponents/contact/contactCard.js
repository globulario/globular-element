import { AccountController } from "../../backend/account";
import { displayMessage } from "../../backend/backend";
import "./acceptDeclineContactBtns.js"

/**
 * Display Contact (account informations)
 */
export class ContactCard extends HTMLElement {

    // Create the applicaiton view.
    constructor(account, contact, actionable = false) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.account = account;
        this.contact = contact;
        this.actionable = actionable
        this.showRingTone = false;

        if (this.hasAttribute("contact")) {
            AccountController.getAccount(this.getAttribute("contact"), (val) => {
                this.contact = val;
            }, (err) => {
                displayMessage(err, 3000)
            })
        }

        if (this.hasAttribute("account")) {
            AccountController.getAccount(this.getAttribute("account"), (val) => {
                this.account = val;
            }, (err) => {
                displayMessage(err, 3000)
                console.log(err)
            })
        }
    }

    // The connection callback.
    connectedCallback() {
        if (this.contact == undefined) {
            return
        }

        let name = this.contact.getName()
        if (name == undefined) {
            name = this.contact.getId()
        }
        if (this.contact.getFirstname().length > 0 && this.contact.getLastname().length > 0) {

            name = this.contact.getFirstname() + " " + this.contact.getLastname()

        }

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
            img {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
            }
    
            .contact-invitation-div {
                transition: background 0.2s ease, padding 0.8s linear;
                background-color: var(--surface-color);
                color: var(--on-surface-color);
                position: relative;
                display: flex;
                flex-direction: column;
            }
    
            .contact-invitation-div.actionable:hover {
                filter: invert(10%);
            }
    
            .contact-header {
                display: flex;
                align-items: center;
                padding: 5px;
            }
    
            .contact-info {
                display: flex;
                flex-direction: column;
                width: 100%;
                font-size: 0.85em;
                padding-left: 8px;
            }
    
            .actions-div {
                display: flex;
                justify-content: flex-end;
            }
    
            globular-session-state, globular-ringtones {
                padding: 8px;
                display: none;
            }
    
            .profile-img {
                display: none;
            }
    
            .profile-icon {
                width: 40px;
                height: 40px;
                --iron-icon-fill-color: var(--palette-action-disabled);
                display: none;
            }
        </style>
        <div class="contact-invitation-div">
            <div class="contact-header"> 
                <img class="profile-img" alt='Profile Picture' src="${this.contact.getProfilepicture()}">
                <iron-icon class="profile-icon" icon="account-circle"></iron-icon>
                <div class="contact-info">
                    <span>${name}</span>
                    <span>${this.contact.getEmail()}</span>
                </div>
            </div>
            <globular-session-state account="${this.contact.getId() + "@" + this.contact.getDomain()}"></globular-session-state>
            <globular-ringtones dir="audio/ringtone" id="${this.contact.getId() + "_" + this.contact.getDomain() + "_ringtone"}" account="${this.contact.getId() + "@" + this.contact.getDomain()}"></globular-ringtones>
            <div class="actions-div">
                <slot></slot>
            </div>
        </div>
    `;

        // Set profile picture visibility dynamically
        const profileImg = this.shadowRoot.querySelector('.profile-img');
        const profileIcon = this.shadowRoot.querySelector('.profile-icon');
        if (this.contact.getProfilepicture().length > 0) {
            profileImg.style.display = "block";
        } else {
            profileIcon.style.display = "block";
        }
        /** only element with actions will have illuminated background... */
        if (this.children.length > 0 || this.actionable) {
            this.shadowRoot.querySelector(".contact-invitation-div").classList.add("actionable")

        }

        if (this.showRingTone) {
            this.shadowRoot.querySelector("globular-ringtones").style.display = "block"
        } else {
            this.shadowRoot.querySelector("globular-ringtones").style.display = "none"
        }

    }

    hideRingtone() {
        this.showRingTone = false
        if (this.shadowRoot.querySelector("globular-ringtones"))
            this.shadowRoot.querySelector("globular-ringtones").style.display = "none"
    }

    showRingtone() {
        this.showRingTone = true
        if (this.shadowRoot.querySelector("globular-ringtones"))
            this.shadowRoot.querySelector("globular-ringtones").style.display = "block"
    }

    // Set the invite button...
    setInviteButton(onInviteConctact) {
        this.innerHtml = ""
        let range = document.createRange()
        this.appendChild(range.createContextualFragment(`<paper-button style="font-size:.85rem; width: 20px; align-self: flex-end;" id="invite_btn">Invite</paper-button>`))
        let inviteBtn = this.querySelector("#invite_btn")
        inviteBtn.onclick = () => {
            if (onInviteConctact != null) {
                onInviteConctact(this.contact)
                inviteBtn.disabled = true // disable the button after invitation
            }
        }
    }

    setDeleteButton(onDeleteContact) {

        let range = document.createRange()
        this.appendChild(range.createContextualFragment(`<paper-button style="font-size:.85rem; width: 20px; align-self: flex-end;" id="delete_btn">Delete</paper-button>`))

        this.querySelector("#delete_btn").onclick = () => {
            if (onDeleteContact != null) {
                onDeleteContact(this.contact)
            }
        }
    }

    setCallButton(onCallContact) {
        let range = document.createRange()
        this.appendChild(range.createContextualFragment(`<paper-button style="font-size:.85rem; width: 20px; align-self: flex-end;" id="call_btn">Call</paper-button>`))

        this.querySelector("#call_btn").onclick = () => {
            if (onCallContact != null) {
                onCallContact(this.contact)
                document.body.click()
            }
        }
    }

    // Set the revoke invitation button.
    setRevokeButton(onRevokeInvitation) {
        this.innerHtml = ""
        let range = document.createRange()
        this.appendChild(range.createContextualFragment(`<paper-button style="font-size:.85rem; width: 20px; align-self: flex-end;" id="revoke_invitation_btn">Revoke</paper-button>`))

        this.querySelector("#revoke_invitation_btn").onclick = () => {
            if (onRevokeInvitation != null) {
                onRevokeInvitation(this.contact)
            }
        }
    }

    // Set the accept/decline button.
    setAcceptDeclineButton(onAcceptInvitation, onDeclineInvitation) {
        this.innerHtml = ""
        let range = document.createRange()
        this.appendChild(range.createContextualFragment(`<globular-accept-decline-contact-btns id="accept_decline_btn"></globular-accept-decline-contact-btns>`))

        this.querySelector("#accept_decline_btn").onaccpect = () => {
            if (onAcceptInvitation != null) {
                onAcceptInvitation(this.contact)
            }
        }

        this.querySelector("#accept_decline_btn").ondecline = () => {
            if (onDeclineInvitation != null) {
                onDeclineInvitation(this.contact)
            }
        }
    }
}

customElements.define('globular-contact-card', ContactCard)