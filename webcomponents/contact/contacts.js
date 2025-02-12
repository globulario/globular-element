
/**
 * The list of contacts.
 */
export class Contacts extends Menu {
    // attributes.

    // Create the contact view.
    constructor() {
        super("Contacts", "social:people", "Contacts")

        // The logged account.
        this.account = null;

        this.inviteContactInput = null;

        // Here is the class members.
        this.onInviteConctact = null;

        // Revoke contact invitation
        this.onRevokeContact = null;

        // Accept contact invitation
        this.onAcceptContact = null;

        // Decline contact invitation
        this.onDeclineContact = null;

        // Delecte contact
        this.onDeleteContact = null;

        this.width = 350;
        if (this.hasAttribute("width")) {
            this.width = parseInt(this.getAttribute("width"));
        }

        this.height = 550;
        if (this.hasAttribute("height")) {
            this.height = parseInt(this.getAttribute("height"));
        }
    }

    // Init the contact at login time.
    init(account) {

        this.account = account;
        let html = `
            <style>
               
                #Contacts-div {
                    display: flex;
                    flex-wrap: wrap;
                    height: 100%;
                    flex-direction: column;
                    overflow: hidden;
                }

                #Contacts_menu_div{
                    overflow: auto;
                    height: ${this.height}px;
                    max-height: 70vh;
                    overflow-y: auto;
                }

                #title{
                    display: none; 
                    justify-content: center;
                }


                #Contacts-list{
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

                /* Need to position the badge to look like a text superscript */
                paper-tab {
                  padding-right: 25px;
                }

                paper-tabs{                  
                    /* custom CSS property */
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

                paper-card{
                    background-color: var(--palette-background-paper);
                    color: var(--palette-text-primary);
                    padding: 10px;
                }
          
                paper-card h1 {
                    font-size: 1.65rem;
                    margin: 0px;
                    margin-bottom: 10px;
                }
                
                @media (min-width: 500px) {
                    paper-tabs {
                        min-width: 450px;
                    }
                }

                
                @media (max-width: 500px) {

                    #Contacts_menu_div{
                        margin-top: 5px;
                        height: calc(100vh - 100px);
                        max-height: calc(100vh - 100px);
                    }

                    #Contacts-list{
                        width: calc(100vw - 32px);
                        padding-bottom: 50px;
                    }

                    #title{
                        display: flex; 
                    }

                    paper-tabs {
                        font-size: .95rem;
                    }
                }

            </style>
            <div id="Contacts-div">
                <div id="header" style="width: 100%;">

                    <div id="title">
                        <h1 style="flex-grow: 1;">Contact's</h1>
                        <paper-icon-button id="close-btn" icon="icons:close" role="button" tabindex="0" aria-disabled="false"></paper-icon-button>
                    </div>
        
                    <globular-autocomplete type="email" label="Search Contact" id="invite-contact-input" width="${this.width - 10}" style="flex-grow: 1;"></globular-autocomplete>
                    <paper-tabs selected="0">
                        <paper-tab id="contacts-tab">
                            <span id="contacts-label">Contacts</span>
                            <paper-badge style="display: none;" for="contacts-label"></paper-badge>
                        </paper-tab>
                        <paper-tab id="sent-contact-invitations-tab">
                            <span id="sent-contact-invitations-label">Sent Invitations</span>
                            <paper-badge style="display: none;" for="sent-contact-invitations-label"></paper-badge>
                        </paper-tab>
                        <paper-tab id="received-contact-invitations-tab">
                            <span id="received-contact-invitations-label">Received Invitations</span>
                            <paper-badge style="display: none;" for="received-contact-invitations-label"></paper-badge>
                        </paper-tab>
                    </paper-tabs>
                </div>
                <div id="Contacts-list">

                </div>
            </div>
        `

        let range = document.createRange()
        this.getMenuDiv().innerHTML = "" // remove existing elements.
        this.getMenuDiv().appendChild(range.createContextualFragment(html));

        this.getMenuDiv().querySelector("#close-btn").onclick = () => {
            this.getMenuDiv().parentNode.removeChild(this.getMenuDiv())
        }

        this.shadowRoot.appendChild(this.getMenuDiv())


        // Action's
        let contactLst = this.shadowRoot.getElementById("Contacts-list")
        let contactsTab = this.shadowRoot.getElementById("contacts-tab")
        let sentContactInvitationsTab = this.shadowRoot.getElementById("sent-contact-invitations-tab")
        let receivedContactInvitationsTab = this.shadowRoot.getElementById("received-contact-invitations-tab")

        // The invite contact action.
        this.inviteContactInput = this.shadowRoot.getElementById("invite-contact-input")
        this.inviteContactInput.onkeyup = () => {
            let val = this.inviteContactInput.getValue();
            if (val.length >= 3) {
                this.findAccountByEmail(val)
            } else {
                this.inviteContactInput.clear()
            }
        }

        // That function must return the div that display the value that we want.
        this.inviteContactInput.displayValue = (contact) => {

            let card = new ContactCard(account, contact, true);

            // Here depending if the contact is in contact list, in received invitation list or in sent invitation
            // list displayed action will be different.
            Account.getContacts(account, "{}",
                (contacts) => {

                    const info = contacts.find(obj => {
                        return obj._id === contact.name;
                    })

                    if (contact._id != this.account._id) {
                        if (info == undefined) {
                            card.setInviteButton((contact) => {
                                this.onInviteConctact(contact);
                                this.inviteContactInput.clear();
                            })
                        } else if (info.status == "sent") {
                            // Here I will display the revoke invitation button.
                            card.setRevokeButton(this.onRevokeContact)
                        } else if (info.status == "received") {
                            // Here I will display the accept/decline button.
                            card.setAcceptDeclineButton(this.onAcceptContact, this.onDeclineContact)
                        } else if (info.status == "revoked" || info.status == "deleted") {
                            // Here I will display the accept/decline button.
                            card.setInviteButton((contact) => {
                                this.onInviteConctact(contact);
                                this.inviteContactInput.clear();
                            })
                        } else if (info.status == "accepted") {
                            // Here I will display the revoke invitation button.
                            card.setDeleteButton(this.onDeleteContact)
                        }
                    }
                },
                () => {
                    card.setInviteButton((contact) => {
                        this.onInviteConctact(contact);
                        this.inviteContactInput.clear();
                    })
                })


            return card
        }

        let contactList = new ContactList(account, this.onDeleteContact, contactsTab.children[1])
        contactLst.appendChild(contactList)

        let sentContactInvitations = new SentContactInvitations(account, this.onRevokeContact, sentContactInvitationsTab.children[1]);
        contactLst.appendChild(sentContactInvitations)


        let receivedContactInvitations = new ReceivedContactInvitations(account, this.onAcceptContact, this.onDeclineContact, receivedContactInvitationsTab.children[1]);
        contactLst.appendChild(receivedContactInvitations)


        contactsTab.onclick = () => {
            contactList.style.display = "block"
            receivedContactInvitations.style.display = "none"
            sentContactInvitations.style.display = "none"
        }

        sentContactInvitationsTab.onclick = () => {
            contactList.style.display = "none"
            receivedContactInvitations.style.display = "none"
            sentContactInvitations.style.display = "block"
        }

        receivedContactInvitationsTab.onclick = () => {
            contactList.style.display = "none"
            receivedContactInvitations.style.display = "block"
            sentContactInvitations.style.display = "none"
        }

        // set active.
        contactsTab.click();
        window.dispatchEvent(new Event('resize'));

        // Get the list of all accounts (mab).
        if (this.getMenuDiv().parentNode)
            this.getMenuDiv().parentNode.removeChild(this.getMenuDiv())
    }

    findAccountByEmail(email) {

        Account.getAccounts(`{"email":{"$regex": "${email}", "$options": "im"}}`, (accounts) => {
            accounts = accounts.filter((obj) => {
                return obj.id !== this.account.id;
            });
            // set the getValues function that will return the list to be use as filter.
            if (this.inviteContactInput != undefined) {
                this.inviteContactInput.setValues(accounts)
            }

        }, (err) => {
            //callback([])
            ApplicationView.displayMessage(err, 3000)
        })
    }

}

customElements.define('globular-contacts-menu', Contacts)