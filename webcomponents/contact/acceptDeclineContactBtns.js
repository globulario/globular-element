/**
 * Accept contact button.
 */
export class AcceptDeclineContactBtns extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        let contact = this.getAttribute("contact");

        this.onaccpect = null;
        this.ondecline = null;


        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
        </style>

        <div style="display: flex;">
            <paper-button id="decline_contact_btn" style="font-size:.85rem; width: 20px;">Decline</paper-button>
            <paper-button id="accept_contact_btn" style="font-size:.85rem; width: 20px;">Accept</paper-button>
        </div>
        `

        let acceptContactBtn = this.shadowRoot.getElementById("accept_contact_btn")
        acceptContactBtn.onclick = () => {
            if (this.onaccpect != undefined) {
                this.onaccpect(contact)
            }
        }

        let declineContactBtn = this.shadowRoot.getElementById("decline_contact_btn")
        declineContactBtn.onclick = () => {
            if (this.ondecline != undefined) {
                this.ondecline(contact);

            }
        }
    }

}

customElements.define('globular-accept-decline-contact-btns', AcceptDeclineContactBtns)

