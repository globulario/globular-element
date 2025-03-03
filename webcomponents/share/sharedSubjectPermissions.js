import { Permission } from "globular-web-client/rbac/rbac_pb"
import { Account, Group } from "globular-web-client/resource/resource_pb"
import getUuidByString from "uuid-by-string"


/**
 * Set shared subject permission...
 */
export class SharedSubjectsPermissions extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {

        super()

        this.accounts = []

        this.groups = []

        this.applications = []

        this.organizations = []


        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
    }

    // The connection callback.
    connectedCallback() {

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #permissions{
                display: table;
                width: 100%;
            }

            .subject-div{
                padding-left: 10px;
                width: 100%;
                display: flex;
                flex-direction: column;
                padding-bottom: 10px;
                margin-bottom: 10px;
                border-bottom: 1px solid var(--palette-divider);
            }

            #permissions-header {
                display: table-row;
                font-size: 1.0rem;
                font-weight: 400;
                color: var(--palette-text-secondary);
                border-bottom: 2 px solid;
                border-color: var(--palette-divider);
                width: 100%;
            }

            .infos {
                margin: 2px;
                padding: 4px;
                display: flex;
                border-radius: 4px;
                align-items: center;
                transition: background 0.2s ease,padding 0.8s linear;
                background-color: var(--surface-color);
                color: var(--primary-text-color);
            }
            
            .infos img{
                max-height: 32px;
                max-width: 32px;
                border-radius: 16px;
            }

            .infos span{
                font-size: 1rem;
            }

            #organizations-tab {
                display: none;
            }

        </style>
        <div id="container" style="display: flex; flex-direction: column;">
            <div class="title">Set subject's permissions... </div>
            <div id="permissions" style="margin-top: 20px;">
                <div id="permissions-header" style="display: table-row;">
                    <div style="display: table-cell;">
                        Subject
                    </div>
                    <div style="display: table-cell;">
                        Read
                    </div>
                    <div style="display: table-cell;">
                        Write
                    </div>
                    <div style="display: table-cell;">
                        Delete
                    </div>
                </div>
            </div>
        </div>
        `
        // give the focus to the input.


    }

    // Call search event.
    setAccounts(accounts) {
        this.accounts = accounts;

        this.refresh()
    }

    setGroups(groups) {
        this.groups = groups;

        this.refresh()
    }

    // Refresh the permission selector.
    refresh() {
        let permissions = this.shadowRoot.querySelector("#permissions")
        for (var i = 1; i < permissions.children.length; i++) {
            permissions.children[i].style.display = "none"
        }

        let range = document.createRange()

        let setSubjectRow = (s) => {
            let name = s.getName()
            if(s.getFirstname().length > 0 && s.getLastname().length > 0){
                name = s.getFirstname() + " " + s.getLastname()
            }
            let uuid = "_" + getUuidByString(s.getId() + "@" + s.getDomain())
            let html = `
            <style>
                iron-icon:hover{
                    cursor: pointer;
                }

                .cell {
                    display: table-cell; 
                    vertical-align: middle;
                    border-bottom: 1px solid var(--palette-divider);

                }
                .cell iron-icon {
                    fill: var(--primary-text-color);
                }

                img, #group-icon{
                    margin-right: 10px;
                }

            </style>
            <div class="subject-permissions-row" style="display: table-row;" id="${uuid}_row">
                <div class="cell">
                    <div id="${uuid}" class="infos">
                        <img> </img>
                        <iron-icon id="group-icon"></iron-icon>
                        <span>${name}</span>
                    </div>
                </div>
                <div class="cell">
                    <iron-icon class="permission-icon" name="read" icon="icons:check" id="${uuid}_read"></iron-icon>
                </div>
                <div class="cell">
                    <iron-icon class="permission-icon" name="write" icon="icons:remove" id="${uuid}_write"></iron-icon>
                </div>
                <div class="cell">
                    <iron-icon class="permission-icon" name="delete" icon="icons:remove"  id="${uuid}_delete"></iron-icon>
                </div>
            </div>
            `
            // set user permissions.
            if (!permissions.querySelector("#" + uuid)) {
                permissions.appendChild(range.createContextualFragment(html))

                // so here I will set the action...
                let icons = permissions.querySelectorAll(".permission-icon")
                for (var i = 0; i < icons.length; i++) {
                    let icon = icons[i]
                    icon.onclick = () => {
                        if (icon.getAttribute("icon") == "icons:check") {
                            icon.setAttribute("icon", "icons:block")
                        } else if (icon.getAttribute("icon") == "icons:remove") {
                            icon.setAttribute("icon", "icons:check")
                        } else if (icon.getAttribute("icon") == "icons:block") {
                            icon.setAttribute("icon", "icons:remove")
                        }
                    }
                }

            }

            // set display...
            let row = permissions.querySelector("#" + uuid + "_row")
            row.subject = s
            row.style.display = "table-row"
            if (s.getProfilepicture()) {
                row.querySelector("img").src = s.getProfilepicture()
                row.querySelector("#group-icon").style.display = "none"
            } else {
                row.querySelector("img").style.display = "none"
                row.querySelector("#group-icon").icon = "social:people"
            }

        }

        // create row for accounts...
        this.accounts.forEach(a => {
            setSubjectRow(a)
        })

        // create row for groups...
        this.groups.forEach(g => {
            setSubjectRow(g)
        })

    }

    // extract permission infos from the interface.
    getPermissions() {
        let permissions = { allowed: [], denied: [] }
        let permissionsDiv = this.shadowRoot.querySelector("#permissions")
        let rows = permissionsDiv.querySelectorAll(".subject-permissions-row")

        let allowed_read_permission = new Permission
        allowed_read_permission.setName("read")
        permissions.allowed.push(allowed_read_permission)

        let allowed_write_permission = new Permission
        allowed_write_permission.setName("write")
        permissions.allowed.push(allowed_write_permission)

        let allowed_delete_permission = new Permission
        allowed_delete_permission.setName("delete")
        permissions.allowed.push(allowed_delete_permission)

        let denied_read_permission = new Permission
        denied_read_permission.setName("read")
        permissions.denied.push(denied_read_permission)

        let denied_write_permission = new Permission
        denied_write_permission.setName("write")
        permissions.denied.push(denied_write_permission)

        let denied_delete_permission = new Permission
        denied_delete_permission.setName("delete")
        permissions.denied.push(denied_delete_permission)


        for (var i = 0; i < rows.length; i++) {
            let row = rows[i]
            let icons = row.querySelectorAll(".permission-icon")

            /** The read permission */
            if (icons[0].icon == "icons:check") {
                if (row.subject instanceof Account) {
                    let accountId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = allowed_read_permission.getAccountsList()
                    lst.push(accountId)
                    allowed_read_permission.setAccountsList(lst)
                } else if (row.subject instanceof Group) {
                    let groupId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = allowed_read_permission.getGroupsList()
                    lst.push(groupId)
                    allowed_read_permission.setGroupsList(lst)
                }
            } else if (icons[0].icon == "icons:block") {
                if (row.subject instanceof Account) {
                    let accountId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = denied_read_permission.getAccountsList()
                    lst.push(accountId)
                    denied_read_permission.setAccountsList(lst)
                } else if (row.subject instanceof Group) {
                    let groupId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = denied_read_permission.getGroupsList()
                    lst.push(groupId)
                    denied_read_permission.setGroupsList(lst)
                }
            }

            /** The write permission */
            if (icons[1].icon == "icons:check") {
                if (row.subject instanceof Account) {
                    let accountId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = allowed_write_permission.getAccountsList()
                    lst.push(accountId)
                    allowed_write_permission.setAccountsList(lst)
                } else if (row.subject instanceof Group) {
                    let groupId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = allowed_write_permission.getGroupsList()
                    lst.push(groupId)
                    allowed_write_permission.setGroupsList(lst)
                }
            } else if (icons[1].icon == "icons:block") {
                if (row.subject instanceof Account) {
                    let accountId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = denied_write_permission.getAccountsList()
                    lst.push(accountId)
                    denied_write_permission.setAccountsList(lst)
                } else if (row.subject instanceof Group) {
                    let groupId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = denied_write_permission.getGroupsList()
                    lst.push(groupId)
                    denied_write_permission.setGroupsList(lst)
                }
            }

            /** The delete permission */
            if (icons[2].icon == "icons:check") {
                if (row.subject instanceof Account) {
                    let accountId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = allowed_delete_permission.getAccountsList()
                    lst.push(accountId)
                    allowed_delete_permission.setAccountsList(lst)
                } else if (row.subject instanceof Group) {
                    let groupId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = allowed_delete_permission.getGroupsList()
                    lst.push(groupId)
                    allowed_delete_permission.setGroupsList(lst)
                }
            } else if (icons[2].icon == "icons:block") {
                if (row.subject instanceof Account) {
                    let accountId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = denied_delete_permission.getAccountsList()
                    lst.push(accountId)
                    denied_delete_permission.setAccountsList(lst)
                } else if (row.subject instanceof Group) {
                    let groupId = row.subject.getId() + "@" + row.subject.getDomain()
                    let lst = denied_delete_permission.getGroupsList()
                    lst.push(groupId)
                    denied_delete_permission.setGroupsList(lst)
                }
            }
        }

        return permissions;
    }

}

customElements.define('globular-shared-subjects-permissions', SharedSubjectsPermissions)