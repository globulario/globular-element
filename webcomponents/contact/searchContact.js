import { AccountController } from "../../backend/account";
import { displayError } from "../../backend/backend";
import { ContactCard } from "./contactCard";

export class SearchContact extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.results = [];

        // Here is the class members.
        this.onInviteContact = null;

        // Revoke contact invitation
        this.onRevokeContact = null;

        // Accept contact invitation
        this.onAcceptContact = null;

        // Decline contact invitation
        this.onDeclineContact = null;

        // Delecte contact
        this.onDeleteContact = null;
    }

    connectedCallback() {
        this.render();
        // Close modal functionality
        this.shadowRoot.querySelector("#close-btn").addEventListener("click", () => {
            this.remove();
        });

        // Search functionality
        const searchInput = this.shadowRoot.querySelector("#search_input");
        const resultsDiv = this.shadowRoot.querySelector("#results");

        // I will handle the search input change event and test if the search input value is at least 3 characters long.
        searchInput.addEventListener("input", this.handleSearch.bind(this));
    }

    async handleSearch(event) {
        const query = event.target.value.trim();
        if (query.length < 3) {
            this.results = [];
            this.renderResults();
            return;
        }

        // Simulating API call
        this.results = await this.fetchAccounts(query);
        console.log(this.results);

        this.renderResults();
    }

    async fetchAccounts(query) {
        return new Promise((resolve, reject) => {
            AccountController.getAccounts(`{"email":{"$regex": "${query}", "$options": "im"}}`, false, (accounts) => {
                // Filter out the current user
                const filteredAccounts = accounts.filter(obj => obj.getId() !== AccountController.account.getId());
                resolve(filteredAccounts); // Properly resolve the promise with filtered accounts
            }, (err) => {
                console.log("Error: ", err);
                displayError(err, 3000);
                reject(err); // Properly reject the promise on error
            });
        });
    }

    renderResults() {
        const resultsContainer = this.shadowRoot.querySelector("#results");
        resultsContainer.innerHTML = "";
        this.results.forEach(contact => {
            const card = new ContactCard(AccountController.account, contact, true);
            AccountController.getContacts(AccountController.account, "{}",
                (contacts) => {
                    const info = contacts.find(obj => {
                        return obj._id === contact.getId() + "@" + contact.getDomain();
                    })

                    if (contact.getId() != AccountController.account.getId()) {
                        if (info == undefined) {
                            card.setInviteButton((contact) => {
                                this.onInviteContact(contact);
                            })
                        } else if (info.status == "sent") {
                            // Here I will display the revoke invitation button.
                            card.setRevokeButton(()=>{this.onRevokeContact(contact); card.parentNode.removeChild(card);})
                        } else if (info.status == "received") {
                            // Here I will display the accept/decline button.
                            card.setAcceptDeclineButton(this.onAcceptContact, this.onDeclineContact)
                        } else if (info.status == "revoked" || info.status == "deleted") {
                            // Here I will display the accept/decline button.
                            card.setInviteButton((contact) => {
                                this.onInviteContact(contact);
                            })
                        } else if (info.status == "accepted") {
                            // Here I will display the revoke invitation button.
                            card.setDeleteButton(this.onDeleteContact)
                        }
                    }
                },
                () => {
                    card.setInviteButton((contact) => {
                        this.onInviteContact(contact);
                        this.inviteContactInput.clear();
                    })
                })
 
            resultsContainer.appendChild(card);
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: block;
                font-family: Arial, sans-serif;
            }
    
            .modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--surface-color, white);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                padding: 16px;
                border-radius: 8px;
                min-width: 350px;
                max-width: 90%;
            }
    
            #search-bar {
                display: flex;
                align-items: center;
                border-radius: 20px;
                height: 38px;
                border: 1px solid var(--palette-divider, #ccc);
                background: var(--surface-color, #f9f9f9);
                color: var(--on-surface-color, #333);
                padding-left: 10px;
                padding-right: 10px;

            }
    
            input {
                flex: 1;
                border: none;
                background: transparent;
                color: var(--on-surface-color, #000);
                font-size: 1rem;
                margin-left: 4px;
                margin-right: 4px;
            }
    
            input:focus {
                outline: none;
            }
    
            input::placeholder {
                color: var(--suface-color, #666);
            }
    
            iron-icon {
                cursor: pointer;
                
            }
    
            #results {
                margin-top: 16px;
                min-height: 200px;
                max-height: 500px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: flex-start;
                color: var(--on-surface-color, #666);
                font-size: 1rem;
            }
    
            .hidden {
                display: none;
                color: var(--disabled-color, #666);
            }
    
        </style>
    
        <div class="modal">
            <div id="search-bar">
                <iron-icon id="search_icon" icon="search" style="--iron-icon-fill-color: var(--palette-text-accent);"></iron-icon>
                <input id="search_input" placeholder="Search" type="text">
                <iron-icon id="close-btn" icon="close"></iron-icon>
            </div>
            <div id="results" class="hidden">No search results</div>
        </div>
    `;

    }
}

customElements.define("globular-search-contact", SearchContact);