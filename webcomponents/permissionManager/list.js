import getUuidByString from "uuid-by-string"
import { AccountController } from "../../backend/account"
import { ApplicationController } from "../../backend/applications"
import { PeerController } from "../../backend/peer"
import { SearchableList } from "../list.js"
import { Backend } from "../../backend/backend"
import { Autocomplete } from "../autocomplete.js"
import { getAllGroups, getAllRoles } from "globular-web-client/api.js"
import { OrganizationController } from "../../backend/organization"
import { v4 as uuidv4 } from "uuid";
/**
 * Searchable Account list
 */
export class SearchableAccountList extends SearchableList {
    // attributes.

    // Create the applicaiton view.
    constructor(title, list, ondeleteaccount, onaddaccount) {


        // the onadd handler
        let onadd = (accounts) => {
            // Now the user list...
            AccountController.getAccounts("{}", false, (allAccounts) => {

                accounts.forEach(a => {
                    // remove all existing items.
                    allAccounts = allAccounts.filter(el => el.getId() !== a.getId())
                })

                // Now I will display the list of available account to add to the role...
                let html = `
                <style>
                   
                    #add-list-user-panel{
                        position: absolute;
                        left: 0px;
                        z-index: 1;
                        background-color: var(--surface-color);
                    }

                    .card-content{
                        overflow-y: auto;
                        min-width: 400px;
                    }

                    paper-card{
                        background-color: var(--surface-color);
                        color: var(--palette-text-primary);
                    }

                </style>
                <paper-card id="add-list-user-panel">
                    <div style="display: flex; align-items: center;">
                        <div style="flex-grow: 1; padding: 5px;">
                            Add Account
                        </div>
                        <paper-icon-button id="cancel-btn" icon="close"></paper-icon-button>
                    </div>
                    <div class="card-content">
                        <globular-autocomplete type="email" label="Search Account" id="add_account_input" width="${this.width - 10}" style="flex-grow: 1;"></globular-autocomplete>
                    </div>
                </paper-card>
                `
                let headerDiv = this.shadowRoot.querySelector("#header-div")
                let panel = headerDiv.querySelector("#add-list-user-panel")

                if (panel == undefined) {
                    headerDiv.appendChild(document.createRange().createContextualFragment(html))
                    panel = headerDiv.querySelector("#add-list-user-panel")
                    panel.style.top = (headerDiv.offsetHeight / 2) + 14 + "px";
                    let closeBtn = panel.querySelector("#cancel-btn")
                    closeBtn.onclick = () => {
                        panel.parentNode.removeChild(panel)
                    }

                    // The invite contact action.
                    let addAccountInput = this.shadowRoot.getElementById("add_account_input")
                    addAccountInput.focus()
                    addAccountInput.onkeyup = () => {
                        let val = addAccountInput.getValue();
                        if (val.length >= 2) {
                            let values = []
                            allAccounts.forEach(a => {
                                if (a.getName().toUpperCase().indexOf(val.toUpperCase()) != -1 || a.getEmail().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(a)
                                }
                            })
                            addAccountInput.setValues(values)
                        } else {
                            addAccountInput.clear()
                        }
                    }


                    // That function must return the div that display the value that we want.
                    addAccountInput.displayValue = (a) => {
                        // display the account...
                        let div = this.createAccountDiv(a)
                        div.children[0].style.width = "auto"
                        let addBtn = div.querySelector("paper-icon-button")
                        addBtn.icon = "add"
                        addBtn.onclick = () => {

                            // remove the account form the list off available choice.
                            allAccounts = allAccounts.filter(a_ => a_ !== a)

                            addAccountInput.clear()

                            // set values without the account
                            let values = []
                            let val = addAccountInput.getValue();
                            allAccounts.forEach(a => {
                                if (a.getName().toUpperCase().indexOf(val.toUpperCase()) != -1 || a.getEmail().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(a)
                                }
                            })

                            addAccountInput.setValues(values)

                            // Here I will set the account role...
                            if (this.onadditem != null) {
                                this.onadditem(a)
                            }

                        }
                        return div
                    }
                }


            })
        }

        super(title, list, ondeleteaccount, onaddaccount, onadd)

    }


    createAccountDiv(account) {
        let uuid = "_" + getUuidByString(account.getId());
        let name = account.getName()
        if(account.getFirstname().length > 0 && account.getLastname().length > 0){
            name = account.getFirstname() + " " + account.getLastname()
        }

        let html = `
        <style>
        </style>
        <div id="${uuid}" class="item-div" style="">
            <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                <img style="width: 40px; height: 40px; border-radius: 50%; display: ${account.getProfilepicture().length == 0 ? "none" : "block"};" src="${account.getProfilepicture()}"></img>
                <iron-icon icon="account-circle" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display: ${account.getProfilepicture().length != 0 ? "none" : "block"};"></iron-icon>
                <div style="display: flex; flex-direction: column; width:200px; font-size: .85em; padding-left: 8px; flex-grow: 1;">
                    <span>${name}</span>
                </div>
                <paper-icon-button icon="delete" id="${account.getId()}_btn"></paper-icon-button>
            </div>
            
        </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    // Remove an accout from the list.
    removeItem(a) {
        this.list = this.list.filter(el => el.getId() !== a.getId())
    }

    displayItem(a) {
        let div = this.createAccountDiv(a)
        let deleteBtn = div.querySelector("paper-icon-button")
        deleteBtn.icon = "delete"

        if (this.ondeleteitem != undefined) {
            deleteBtn.onclick = () => {
                // remove the div...
                div.parentNode.removeChild(div)
                this.ondeleteitem(a)
            }
        } else {
            deleteBtn.style.display = "none"
        }

        return div
    }

    // That function can be overide, assume a string by default
    filter(account) {
        return account.getName().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1 || account.getEmail().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1
    }

    // The sort items function
    sortItems() {
        // Sort account...
        return this.list.sort((a, b) => (a.getName() > b.getName()) ? 1 : -1)
    }
}

customElements.define('globular-searchable-account-list', SearchableAccountList)



/**
 * Searchable Application list
 */
export class SearchableApplicationList extends SearchableList {
    // attributes.

    // Create the applicaiton view.
    constructor(title, list, ondeleteapplication, onaddapplication) {

        // the onadd handler
        let onadd = (applications) => {
            // Now the user list...
            ApplicationController.getAllApplicationInfo((allApplications) => {

                applications.forEach(a => {
                    // remove all existing items.
                    allApplications = allApplications.filter(el => el.getId() !== a.getId())
                })

                // Now I will display the list of available account to add to the role...
                let html = `
                <style>
                   
                    #add-list-application-panel{
                        position: absolute;
                        left: 0px;
                        z-index: 1;
                        background-color: var(--surface-color);
                    }

                    .card-content{
                        overflow-y: auto;
                        min-width: 400px;
                    }

                    paper-card{
                        background-color: var(--surface-color);
                        color: var(--palette-text-primary);
                    }

                </style>
                <paper-card id="add-list-application-panel">
                    <div style="display: flex; align-items: center;">
                        <div style="flex-grow: 1; padding: 5px;">
                            Add Application
                        </div>
                        <paper-icon-button id="cancel-btn" icon="close"></paper-icon-button>
                    </div>
                    <div class="card-content">
                        <globular-autocomplete type="text" label="Search Application" id="add_application_input" width="${this.width - 10}" style="flex-grow: 1;"></globular-autocomplete>
                    </div>
                </paper-card>
                `
                let headerDiv = this.shadowRoot.querySelector("#header-div")
                let panel = headerDiv.querySelector("#add-list-application-panel")

                if (panel == undefined) {
                    headerDiv.appendChild(document.createRange().createContextualFragment(html))
                    panel = headerDiv.querySelector("#add-list-application-panel")
                    panel.style.top = (headerDiv.offsetHeight / 2) + 14 + "px";
                    let closeBtn = panel.querySelector("#cancel-btn")
                    closeBtn.onclick = () => {
                        panel.parentNode.removeChild(panel)
                    }

                    // The invite contact action.
                    let addApplicationInput = this.shadowRoot.getElementById("add_application_input")
                    addApplicationInput.focus()
                    addApplicationInput.onkeyup = () => {
                        let val = addApplicationInput.getValue();
                        if (val.length >= 2) {
                            let values = []
                            allApplications.forEach(a => {
                                if (a.getName().toUpperCase().indexOf(val.toUpperCase()) != -1 || a.getAlias().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(a)
                                }
                            })
                            addApplicationInput.setValues(values)
                        } else {
                            addApplicationInput.clear()
                        }
                    }


                    // That function must return the div that display the value that we want.
                    addApplicationInput.displayValue = (a) => {
                        // display the account...
                        let div = this.createApplicationDiv(a)
                        div.children[0].style.width = "auto"
                        let addBtn = div.querySelector("paper-icon-button")
                        addBtn.icon = "add"
                        addBtn.onclick = () => {

                            // remove the account form the list off available choice.
                            allApplications = allApplications.filter(a_ => a_ !== a)

                            addApplicationInput.clear()

                            // set values without the account
                            let values = []
                            let val = addApplicationInput.getValue();
                            allApplications.forEach(a => {
                                if (a.getName().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(a)
                                }
                            })

                            addApplicationInput.setValues(values)

                            // Here I will set the account role...
                            if (this.onadditem != null) {
                                this.onadditem(a)
                            }

                        }
                        return div
                    }
                }


            })
        }

        super(title, list, ondeleteapplication, onaddapplication, onadd)

    }

    createApplicationDiv(application) {
        let uuid = "_" + uuidv4();
        let html = `
        <style>
        </style>
        <div id="${uuid}" class="item-div" style="">
            <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                <img style="width: 40px; height: 40px; border-radius: 50%; display: ${application.getIcon() == undefined ? "none" : "block"};" src="${application.getIcon()}"></img>
                <iron-icon icon="account-circle" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display: ${application.getIcon() != undefined ? "none" : "block"};"></iron-icon>
                <div style="display: flex; flex-direction: column; width:200px; font-size: .85em; padding-left: 8px; flex-grow: 1;">
                    <span>${application.getAlias() + "@" + application.getDomain()}</span>
                    <span>${application.getVersion()}</span>
                </div>
                <paper-icon-button icon="delete" id="${application.getId()}_btn"></paper-icon-button>
            </div>
            
        </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    // Remove an accout from the list.
    removeItem(a) {
        this.list = this.list.filter(el => el.getId() !== a.getId())
    }

    displayItem(a) {
        let div = this.createApplicationDiv(a)
        let deleteBtn = div.querySelector("paper-icon-button")
        deleteBtn.icon = "delete"

        if (this.ondeleteitem != undefined) {
            deleteBtn.onclick = () => {
                // remove the div...
                div.parentNode.removeChild(div)
                this.ondeleteitem(a)
            }
        } else {
            deleteBtn.style.display = "none"
        }

        return div
    }

    // That function can be overide, assume a string by default
    filter(a) {
        return a.getName().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1 || a.getAlias().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1
    }

    // The sort items function
    sortItems() {
        // Sort account...
        return this.list.sort((a, b) => (a.getName() > b.getName()) ? 1 : -1)
    }
}

customElements.define('globular-searchable-application-list', SearchableApplicationList)

/**
 * Searchable Role list
 */
export class SearchableRoleList extends SearchableList {
    // attributes.

    // Create the applicaiton view.
    constructor(title, list, ondeleterole, onaddrole) {

        // the onadd handler
        let onadd = (roles) => {
            // Now the user list...
            getAllRoles(Backend.globular, (allRoles) => {
                roles.forEach(r => {
                    // remove all existing items.
                    allRoles = allRoles.filter(el => el.getId() !== r.getId())
                })

                // Now I will display the list of available account to add to the role...
                let html = `
                <style>
                   
                    #add-list-role-panel{
                        position: absolute;
                        left: 0px;
                        z-index: 1;
                        background-color: var(--surface-color);
                    }

                    .card-content{
                        overflow-y: auto;
                        min-width: 400px;
                    }

                    paper-card{
                        background-color: var(--surface-color);
                        color: var(--palette-text-primary);
                    }

                </style>
                <paper-card id="add-list-role-panel">
                    <div style="display: flex; align-items: center;">
                        <div style="flex-grow: 1; padding: 5px;">
                            Add Role
                        </div>
                        <paper-icon-button id="cancel-btn" icon="close"></paper-icon-button>
                    </div>
                    <div class="card-content">
                        <globular-autocomplete type="text" label="Search Role" id="add_role_input" width="${this.width - 10}" style="flex-grow: 1;"></globular-autocomplete>
                    </div>
                </paper-card>
                `

                let headerDiv = this.shadowRoot.querySelector("#header-div")
                let panel = headerDiv.querySelector("#add-list-role-panel")

                if (panel == undefined) {
                    headerDiv.appendChild(document.createRange().createContextualFragment(html))
                    panel = headerDiv.querySelector("#add-list-role-panel")
                    panel.style.top = (headerDiv.offsetHeight / 2) + 14 + "px";
                    let closeBtn = panel.querySelector("#cancel-btn")
                    closeBtn.onclick = () => {
                        panel.parentNode.removeChild(panel)
                    }

                    // The invite contact action.
                    let addRoleInput = this.shadowRoot.getElementById("add_role_input")
                    addRoleInput.focus()
                    addRoleInput.onkeyup = () => {
                        let val = addRoleInput.getValue();
                        if (val.length >= 2) {
                            let values = []
                            allRoles.forEach(r => {
                                if (r.getName().toUpperCase().indexOf(val.toUpperCase()) != -1 || r.getId().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(r)
                                }
                            })
                            addRoleInput.setValues(values)
                        } else {
                            addRoleInput.clear()
                        }
                    }


                    // That function must return the div that display the value that we want.
                    addRoleInput.displayValue = (r) => {
                        // display the account...
                        let div = this.createRoleDiv(r)
                        div.children[0].style.width = "auto"
                        let addBtn = div.querySelector("paper-icon-button")
                        addBtn.icon = "add"
                        addBtn.onclick = () => {

                            // remove the account form the list off available choice.
                            allRoles = allRoles.filter(r_ => r_ !== r)
                            addRoleInput.clear()

                            // set values without the account
                            let values = []
                            let val = addRoleInput.getValue();
                            allRoles.forEach(r => {
                                if (r.getName().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(r)
                                }
                            })

                            addRoleInput.setValues(values)

                            // Here I will set the account role...
                            if (this.onadditem != null) {
                                this.onadditem(r)
                            }

                        }
                        return div
                    }
                }
            })
        }

        super(title, list, ondeleterole, onaddrole, onadd)

    }

    // The div that display the role.
    createRoleDiv(role) {
        let uuid = "_" + uuidv4();
        let html = `
        <style>
        </style>
        <div id="${uuid}" class="item-div" style="">
            <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                <iron-icon icon="notification:enhanced-encryption" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display:block"};"></iron-icon>
                <div style="display: flex; flex-direction: column; width:200px; font-size: .85em; padding-left: 8px; flex-grow: 1;">
                    <span>${role.getId() + "@" + role.getDomain()}</span>
                </div>
                <paper-icon-button icon="delete" id="${role.getId()}_btn"></paper-icon-button>
            </div>
            
        </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    // Remove an accout from the list.
    removeItem(r) {
        this.list = this.list.filter(el => el.getId() !== r.getId())
    }

    displayItem(a) {
        let div = this.createRoleDiv(a)
        let deleteBtn = div.querySelector("paper-icon-button")
        deleteBtn.icon = "delete"

        if (this.ondeleteitem != undefined) {
            deleteBtn.onclick = () => {
                // remove the div...
                div.parentNode.removeChild(div)
                this.ondeleteitem(a)
            }
        } else {
            deleteBtn.style.display = "none"
        }

        return div
    }

    // That function can be overide, assume a string by default
    filter(r) {
        return r.getName().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1 || r.getName().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1
    }

    // The sort items function
    sortItems() {
        // Sort account...
        return this.list.sort((a, b) => (a.getName() > b.getName()) ? 1 : -1)
    }
}

customElements.define('globular-searchable-role-list', SearchableRoleList)

/**
 * Searchable Group list
 */
export class SearchableGroupList extends SearchableList {
    // attributes.

    // Create the applicaiton view.
    constructor(title, list, ondeletegroup, onaddgroup) {

        // the onadd handler
        let onadd = (groups) => {
            // Now the user list...
            getAllGroups(Backend.globular, (allGroups) => {
                groups.forEach(g => {
                    // remove all existing items.
                    allGroups = allGroups.filter(el => el.getId() !== g.getId())
                })

                let html = `
                <style>
                   
                    #add-list-group-panel{
                        position: absolute;
                        left: 0px;
                        z-index: 1;
                        background-color: var(--surface-color);
                    }

                    .card-content{
                        overflow-y: auto;
                        min-width: 400px;
                    }

                    paper-card{
                        background-color: var(--surface-color);
                        color: var(--palette-text-primary);
                    }

                </style>
                <paper-card id="add-list-group-panel">
                    <div style="display: flex; align-items: center;">
                        <div style="flex-grow: 1; padding: 5px;">
                            Add Group
                        </div>
                        <paper-icon-button id="cancel-btn" icon="close"></paper-icon-button>
                    </div>
                    <div class="card-content">
                        <globular-autocomplete type="text" label="Search Group" id="add_group_input" width="${this.width - 10}" style="flex-grow: 1;"></globular-autocomplete>
                    </div>
                </paper-card>
                `

                let headerDiv = this.shadowRoot.querySelector("#header-div")
                let panel = headerDiv.querySelector("#add-list-group-panel")

                if (panel == undefined) {
                    headerDiv.appendChild(document.createRange().createContextualFragment(html))
                    panel = headerDiv.querySelector("#add-list-group-panel")
                    panel.style.top = (headerDiv.offsetHeight / 2) + 14 + "px";
                    let closeBtn = panel.querySelector("#cancel-btn")
                    closeBtn.onclick = () => {
                        panel.parentNode.removeChild(panel)
                    }

                    // The invite contact action.
                    let addGroupInput = this.shadowRoot.getElementById("add_group_input")
                    addGroupInput.focus()
                    addGroupInput.onkeyup = () => {
                        let val = addGroupInput.getValue();
                        if (val.length >= 2) {
                            let values = []
                            allGroups.forEach(g => {
                                if (g.getName().toUpperCase().indexOf(val.toUpperCase()) != -1 || g.getId().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(g)
                                }
                            })
                            addGroupInput.setValues(values)
                        } else {
                            addGroupInput.clear()
                        }
                    }


                    // That function must return the div that display the value that we want.
                    addGroupInput.displayValue = (g) => {
                        // display the account...
                        let div = this.createGroupDiv(g)
                        div.children[0].style.width = "auto"
                        let addBtn = div.querySelector("paper-icon-button")
                        addBtn.icon = "add"
                        addBtn.onclick = () => {

                            // remove the account form the list off available choice.
                            allGroups = allGroups.filter(g_ => g_ !== g)

                            addGroupInput.clear()

                            // set values without the account
                            let values = []
                            let val = addGroupInput.getValue();
                            allGroups.forEach(g => {
                                if (g.getName().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(g)
                                }
                            })

                            addGroupInput.setValues(values)

                            // Here I will set the account role...
                            if (this.onadditem != null) {
                                this.onadditem(g)
                            }

                        }
                        return div
                    }
                }
            })
        }

        super(title, list, ondeletegroup, onaddgroup, onadd)

    }

    // The div that display the role.
    createGroupDiv(group) {
        let uuid = "_" + uuidv4();
        let html = `
        <style>
        </style>
        <div id="${uuid}" class="item-div" style="">
            <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                <iron-icon icon="social:people" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display:block"};"></iron-icon>
                <div style="display: flex; flex-direction: column; width:200px; font-size: .85em; padding-left: 8px; flex-grow: 1;">
                    <span>${group.getId() + "@" + group.getDomain()}</span>
                </div>
                <paper-icon-button icon="delete" id="${group.getId()}_btn"></paper-icon-button>
            </div>
            
        </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    // Remove an accout from the list.
    removeItem(g) {
        this.list = this.list.filter(el => el.getId() !== g.getId())
    }

    displayItem(g) {
        let div = this.createGroupDiv(g)
        let deleteBtn = div.querySelector("paper-icon-button")
        deleteBtn.icon = "delete"

        if (this.ondeleteitem != undefined) {
            deleteBtn.onclick = () => {
                // remove the div...
                div.parentNode.removeChild(div)
                this.ondeleteitem(g)
            }
        } else {
            deleteBtn.style.display = "none"
        }

        return div
    }

    // That function can be overide, assume a string by default
    filter(g) {
        return g.getName().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1 || g.getId().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1
    }

    // The sort items function
    sortItems() {
        // Sort account...
        return this.list.sort((a, b) => (a.getName() > b.getName()) ? 1 : -1)
    }
}

customElements.define('globular-searchable-group-list', SearchableGroupList)



/**
 * Searchable Organization list
 */
export class SearchableOrganizationList extends SearchableList {
    // attributes.

    // Create the applicaiton view.
    constructor(title, list, ondeleteorganization, onaddorganization) {

        // the onadd handler
        let onadd = (organizations) => {
            // Now the user list...
            OrganizationController.getAllOrganizations(allOrganizations => {
                organizations.forEach(o => {
                    // remove all existing items.
                    allOrganizations = allOrganizations.filter(el => el.getId() !== o.getId())
                })

                let html = `
                <style>
                   
                    #add-list-organization-panel{
                        position: absolute;
                        left: 0px;
                        z-index: 1;
                        background-color: var(--surface-color);
                    }

                    .card-content{
                        overflow-y: auto;
                        min-width: 400px;
                    }

                    paper-card{
                        background-color: var(--surface-color);
                        color: var(--palette-text-primary);
                    }

                </style>
                <paper-card id="add-list-organization-panel">
                    <div style="display: flex; align-items: center;">
                        <div style="flex-grow: 1; padding: 5px;">
                            Add Organization
                        </div>
                        <paper-icon-button id="cancel-btn" icon="close"></paper-icon-button>
                    </div>
                    <div class="card-content">
                        <globular-autocomplete type="text" label="Search Group" id="add_organization_input" width="${this.width - 10}" style="flex-grow: 1;"></globular-autocomplete>
                    </div>
                </paper-card>
                `

                let headerDiv = this.shadowRoot.querySelector("#header-div")
                let panel = headerDiv.querySelector("#add-list-organization-panel")

                if (panel == undefined) {
                    headerDiv.appendChild(document.createRange().createContextualFragment(html))
                    panel = headerDiv.querySelector("#add-list-organization-panel")
                    panel.style.top = (headerDiv.offsetHeight / 2) + 14 + "px";
                    let closeBtn = panel.querySelector("#cancel-btn")
                    closeBtn.onclick = () => {
                        panel.parentNode.removeChild(panel)
                    }

                    // The invite contact action.
                    let addOrganizationInput = this.shadowRoot.getElementById("add_organization_input")
                    addOrganizationInput.focus()
                    addOrganizationInput.onkeyup = () => {
                        let val = addOrganizationInput.getValue();
                        if (val.length >= 2) {
                            let values = []
                            allOrganizations.forEach(o => {
                                if (o.getName().toUpperCase().indexOf(val.toUpperCase()) != -1 || o.getId().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(o)
                                }
                            })
                            addOrganizationInput.setValues(values)
                        } else {
                            addOrganizationInput.clear()
                        }
                    }


                    // That function must return the div that display the value that we want.
                    addOrganizationInput.displayValue = (o) => {
                        // display the account...
                        let div = this.createOrganizationDiv(o)
                        div.children[0].style.width = "auto"
                        let addBtn = div.querySelector("paper-icon-button")
                        addBtn.icon = "add"
                        addBtn.onclick = () => {

                            // remove the account form the list off available choice.
                            allOrganizations = allOrganizations.filter(o_ => o_ !== o)

                            addOrganizationInput.clear()

                            // set values without the account
                            let values = []
                            let val = addOrganizationInput.getValue();
                            allOrganizations.forEach(o => {
                                if (o.getName().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(o)
                                }
                            })

                            addOrganizationInput.setValues(values)

                            // Here I will set the account role...
                            if (this.onadditem != null) {
                                this.onadditem(o)
                            }

                        }
                        return div
                    }
                }
            })
        }

        super(title, list, ondeleteorganization, onaddorganization, onadd)

    }

    // The div that display the role.
    createOrganizationDiv(organization) {
        let uuid = "_" + uuidv4();
        let html = `
        <style>
        </style>
        <div id="${uuid}" class="item-div" style="">
            <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                <iron-icon icon="social:domain" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display:block"};"></iron-icon>
                <div style="display: flex; flex-direction: column; width:200px; font-size: .85em; padding-left: 8px; flex-grow: 1;">
                    <span>${organization.getId()+ "@" + organization.getDomain()}</span>
                </div>
                <paper-icon-button icon="delete" id="${organization.getId()}_btn"></paper-icon-button>
            </div>
            
        </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    // Remove an accout from the list.
    removeItem(o) {
        this.list = this.list.filter(el => el.getId() !== o.getId())
    }

    displayItem(o) {
        let div = this.createOrganizationDiv(o)
        let deleteBtn = div.querySelector("paper-icon-button")
        deleteBtn.icon = "delete"

        if (this.ondeleteitem != undefined) {
            deleteBtn.onclick = () => {
                // remove the div...
                div.parentNode.removeChild(div)
                this.ondeleteitem(o)
            }
        } else {
            deleteBtn.style.display = "none"
        }

        return div
    }

    // That function can be overide, assume a string by default
    filter(o) {
        return o.getName().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1 || o.getId().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1
    }

    // The sort items function
    sortItems() {
        // Sort account...
        return this.list.sort((a, b) => (a.getName() > b.getName()) ? 1 : -1)
    }
}

customElements.define('globular-searchable-organization-list', SearchableOrganizationList)


/**
 * Searchable Group list
 */
export class SearchablePeerList extends SearchableList {
    // attributes.

    // Create the applicaiton view.
    constructor(title, list, ondeletepeer, onaddpeer) {

        // the onadd handler
        let onadd = (peers) => {
            // Now the peer list...
            PeerController.getAllPeers(Backend.globular, (allPeers) => {
                peers.forEach(p => {
                    // remove all existing items.
                    allPeers = allPeers.filter(el => el.getMac() !== p.getMac())
                })

                let html = `
                <style>
                   
                    #add-list-peer-panel{
                        position: absolute;
                        left: 0px;
                        z-index: 1;
                        background-color: var(--surface-color);
                    }

                    .card-content{
                        overflow-y: auto;
                        min-width: 400px;
                    }

                    paper-card{
                        background-color: var(--surface-color);
                        color: var(--palette-text-primary);
                    }

                </style>
                <paper-card id="add-list-peer-panel">
                    <div style="display: flex; align-items: center;">
                        <div style="flex-grow: 1; padding: 5px;">
                            Add Peer
                        </div>
                        <paper-icon-button id="cancel-btn" icon="close"></paper-icon-button>
                    </div>
                    <div class="card-content">
                        <globular-autocomplete type="text" label="Search Peer" id="add_peer_input" width="${this.width - 10}" style="flex-grow: 1;"></globular-autocomplete>
                    </div>
                </paper-card>
                `

                let headerDiv = this.shadowRoot.querySelector("#header-div")
                let panel = headerDiv.querySelector("#add-list-peer-panel")

                if (panel == undefined) {
                    headerDiv.appendChild(document.createRange().createContextualFragment(html))
                    panel = headerDiv.querySelector("#add-list-peer-panel")
                    panel.style.top = (headerDiv.offsetHeight / 2) + 14 + "px";
                    let closeBtn = panel.querySelector("#cancel-btn")
                    closeBtn.onclick = () => {
                        panel.parentNode.removeChild(panel)
                    }

                    // The invite contact action.
                    let addPeerInput = this.shadowRoot.getElementById("add_peer_input")
                    addPeerInput.focus()
                    addPeerInput.onkeyup = () => {
                        let val = addPeerInput.getValue();
                        if (val.length >= 2) {
                            let values = []
                            allPeers.forEach(p => {
                                if (p.getHostname().toUpperCase().indexOf(val.toUpperCase()) != -1 || p.getMac().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(p)
                                }
                            })
                            addPeerInput.setValues(values)
                        } else {
                            addPeerInput.clear()
                        }
                    }


                    // That function must return the div that display the value that we want.
                    addPeerInput.displayValue = (p) => {
                        // display the account...
                        let div = this.createPeerDiv(p)
                        div.children[0].style.width = "auto"
                        let addBtn = div.querySelector("paper-icon-button")
                        addBtn.icon = "add"
                        addBtn.onclick = () => {

                            // remove the account form the list off available choice.
                            allPeers = allPeers.filter(p_ => p_ !== p)

                            addPeerInput.clear()

                            // set values without the account
                            let values = []
                            let val = addPeerInput.getValue();
                            allPeers.forEach(p => {
                                if (p.getName().toUpperCase().indexOf(val.toUpperCase()) != -1) {
                                    values.push(p)
                                }
                            })

                            addPeerInput.setValues(values)

                            // Here I will set the account role...
                            if (this.onadditem != null) {
                                this.onadditem(p)
                            }

                        }
                        return div
                    }
                }
            })
        }

        super(title, list, ondeletepeer, onaddpeer, onadd)

    }

    // The div that display the role.
    createPeerDiv(peer) {
        let uuid = "_" + uuidv4();
        let html = `
        <style>
        </style>
        <div id="${uuid}" class="item-div" style="">
            <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                <iron-icon icon="hardware:computer" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display:block"};"></iron-icon>
                <div style="display: flex; flex-direction: column; width:200px; font-size: .85em; padding-left: 8px; flex-grow: 1;">
                    <span>${peer.getHostname() + "." + peer.getDomain()} (${peer.getMac()})</span>
                </div>
                <paper-icon-button icon="delete" id="${peer.getMac()}_btn"></paper-icon-button>
            </div>
            
        </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    // Remove an accout from the list.
    removeItem(p) {
        this.list = this.list.filter(el => el.getId() !== p.getId())
    }

    displayItem(p) {
        let div = this.createPeerDiv(p)
        let deleteBtn = div.querySelector("paper-icon-button")
        deleteBtn.icon = "delete"

        if (this.ondeleteitem != undefined) {
            deleteBtn.onclick = () => {
                // remove the div...
                div.parentNode.removeChild(div)
                this.ondeleteitem(p)
            }
        } else {
            deleteBtn.style.display = "none"
        }

        return div
    }

    // That function can be overide, assume a string by default
    filter(p) {
        return p.getHostname().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1 || p.getMac().toUpperCase().indexOf(this.filter_.toUpperCase()) != -1
    }

    // The sort items function
    sortItems() {
        // Sort account...
        return this.list.sort((a, b) => (a.getMac() > b.getMac()) ? 1 : -1)
    }
}

customElements.define('globular-searchable-peer-list', SearchablePeerList)
