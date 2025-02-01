import { Permission } from "globular-web-client/rbac/rbac_pb";
import { AccountController } from "../../backend/account";
import { displayError } from "../../backend/backend";
import { v4 as uuidv4 } from "uuid";

export class PermissionsViewer extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(permissionsNames) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.permissionsNames = permissionsNames;
        this.permissionsViewer = null

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #subjects-div{
                vertical-align: middle;
                text-aling: center;
            }

            #permissions-div{
                display: table;
                width: 100%;
                vertical-align: middle;
                text-aling: center;
            }

            #permissions-header{
                display: table-row;
                font-size: 1.0rem;
                font-weight: 400;
                color: var(--palette-text-secondary);
                border-bottom: 2 px solid;
                border-color: var(--palette-divider);
                width: 100%;
            }

            #permissions-header div {
                display: table-cell;
            }

            .subject-div{
                vertical-align: middle;
                text-aling: center;
                max-width: 300px;
            }

            .permission-div{
                text-align: center;
                vertical-align: middle;
                text-aling: center;
            }

        </style>

        <div>
            <div id="subjects-div">
            </div>

            <div id="permissions-div">
            </div>

        </div>
        `

        this.subjectsDiv = this.shadowRoot.querySelector("#subjects-div")

        this.permissionsDiv = this.shadowRoot.querySelector("#permissions-div")

    }

    // Set the permission
    setPermission(subjects, name, permission) {

        if (!permission) {
            permission = new Permission
            permission.setName(name)
            permission.setAccountsList([])
            permission.setGroupsList([])
            permission.setApplicationsList([])
            permission.setOrganizationsList([])
        }

        // Accounts
        permission.getAccountsList().forEach(a => {
            let id = a + "_account"
            let subject = subjects[id]
            if (subject == null) {
                subject = {}
                subject.type = "account"
                subject.id = a
                subject.permissions = {}
                subjects[id] = subject
            }

            subject.permissions[permission.getName()] = name

        })

        // Groups
        permission.getGroupsList().forEach(g => {
            let id = g + "_group"
            let subject = subjects[id]

            if (subject == null) {
                subject = {}
                subject.type = "group"
                subject.id = g
                subject.permissions = {}
                subjects[id] = subject
            }

            subject.permissions[permission.getName()] = name
        })

        // Applications
        permission.getApplicationsList().forEach(a => {
            let id = a + "_application"
            let subject = subjects[id]
            if (subject == null) {
                subject = {}
                subject.type = "application"
                subject.id = a
                subject.permissions = {}
                subjects[id] = subject
            }

            subject.permissions[permission.getName()] = name
        })

        // Organizations
        permission.getOrganizationsList().forEach(o => {
            let id = o + "_organization"
            let subject = subjects[id]
            if (subject == null) {
                subject = {}
                subject.type = "organization"
                subject.id = o
                subject.permissions = {}
                subjects[id] = subject
            }

            subject.permissions[permission.getName()] = name
        })

        // Peers
        permission.getPeersList().forEach(p => {
            let id = p + "_peer"
            let subject = subjects[id]
            if (subject == null) {
                subject = {}
                subject.type = "peer"
                subject.id = p
                subject.permissions = {}
                subjects[id] = subject
            }

            subject.permissions[permission.getName()] = name
        })
    }

    createAccountDiv(account) {
        let uuid = "_" + uuidv4();
        let html = `
        <style>
        </style>
        <div id="${uuid}" class="item-div" style="">
            <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                <img style="width: 40px; height: 40px; display: ${account.profile_picture.length == 0 ? "none" : "block"};" src="${account.profile_picture}"></img>
                <iron-icon icon="account-circle" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display: ${account.profile_picture.length != 0 ? "none" : "block"};"></iron-icon>
                <div style="display: flex; flex-direction: column; width:250px; font-size: .85em; padding-left: 8px;">
                    <span>${account.getName()}</span>
                    <span>${account.getEmail()}</span>
                </div>
            </div>
            
        </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    createApplicationDiv(application) {
        if (application == undefined) {
            console.log("application is not defined")
            return
        }
        let uuid = "_" + uuidv4();
        let html = `
        <style>
        </style>
        <div id="${uuid}" class="item-div" style="">
            <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                <img style="width: 40px; height: 40px; display: ${application.getIcon() == undefined ? "none" : "block"};" src="${application.getIcon()}"></img>
                <iron-icon icon="account-circle" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display: ${application.getIcon() != undefined ? "none" : "block"};"></iron-icon>
                <div style="display: flex; flex-direction: column; width:250px; font-size: .85em; padding-left: 8px;">
                    <span>${application.getAlias()}</span>
                    <span>${application.getVersion()}</span>
                </div>
            </div>
            
        </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    createOrganizationDiv(organization) {
        let uuid = "_" + uuidv4();
        let html = `
            <style>
            </style>
            <div id="${uuid}" class="item-div" style="">
                <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                    <iron-icon icon="social:domain" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display:block"};"></iron-icon>
                    <div style="display: flex; flex-direction: column; width:250px; font-size: .85em; padding-left: 8px;">
                        <span>${organization.getId() + "@" + organization.getDomain()}</span>
                    </div>
                </div>
            </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    createPeerDiv(peer) {
        let uuid = "_" + uuidv4();
        let html = `
            <style>
            </style>
            <div id="${uuid}" class="item-div" style="">
                <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                    <iron-icon icon="hardware:computer" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display:block"};"></iron-icon>
                    <div style="display: flex; flex-direction: column; width:250px; font-size: .85em; padding-left: 8px;">
                        <span>${peer.getHostname()+ "." + peer.getDomain()} (${peer.getMac()})</span>
                    </div>
                </div>
            </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    createGroupDiv(group) {
        let uuid = "_" + uuidv4();
        let html = `
        <style>
        </style>
        <div id="${uuid}" class="item-div" style="">
            <div style="display: flex; align-items: center; padding: 5px; width: 100%;"> 
                <iron-icon icon="social:people" style="width: 40px; height: 40px; --iron-icon-fill-color:var(--palette-action-disabled); display:block"};"></iron-icon>
                <div style="display: flex; flex-direction: column; width:250px; font-size: .85em; padding-left: 8px;">
                    <span>${group.id + "@" + group.domain}</span>
                </div>
            </div>
            
        </div>`

        this.shadowRoot.appendChild(document.createRange().createContextualFragment(html))
        let div = this.shadowRoot.getElementById(uuid)
        div.parentNode.removeChild(div)
        return div
    }

    setPermissionCell(row, value, permissions, name, subject) {

        // The delete permission
        let cell = document.createElement("div")
        cell.style.display = "table-cell"
        cell.className = "permission-div"

        let check = document.createElement("iron-icon")
        check.icon = "icons:check"

        let none = document.createElement("iron-icon")
        none.icon = "icons:remove"

        let denied = document.createElement("iron-icon")
        denied.icon = "av:not-interested"

        if (value != undefined) {
            if (value == "allowed") {
                cell.appendChild(check)
            } else if (value == "denied") {
                cell.appendChild(denied)
            } else if (value == "owner") {
                cell.appendChild(check)
            }
        } else {
            cell.appendChild(none)
        }


        check.onmouseover = none.onmouseover = denied.onmouseover = function (evt) {
            this.style.cursor = "pointer"
        }

        check.onmouseleave = none.onmouseleave = denied.onmouseleave = function (evt) {
            this.style.cursor = "default"
        }

        // Here I will append user interaction...
        check.onclick = () => {

            if (name == "owner") {
                // remove the owner from the column...
                let owner_permission = permissions.getOwners()
                if (!owner_permission) {
                    owner_permission = new Permission
                    owner_permission.setName(name)
                    owner_permission.setAccountsList([])
                    owner_permission.setApplicationsList([])
                    owner_permission.setOrganizationsList([])
                    owner_permission.setGroupsList([])
                    permissions.setOwners(owner_permission)
                }

                if (subject.type == "group") {
                    let lst = owner_permission.getGroupsList()
                    lst = lst.filter(g => g != subject.id)
                    owner_permission.setGroupsList(lst)
                } else if (subject.type == "account") {
                    let lst = owner_permission.getAccountsList()
                    lst = lst.filter(a => a != subject.id)
                    owner_permission.setAccountsList(lst)
                } else if (subject.type == "application") {
                    let lst = owner_permission.getApplicationsList()
                    lst = lst.filter(a => a != subject.id)
                    owner_permission.setApplicationsList(lst)
                } else if (subject.type == "organization") {
                    let lst = owner_permission.getOrganizationsList()
                    lst = lst.filter(o => o != subject.id)
                    owner_permission.setOrganizationsList(lst)
                }

                // set the icon...
                cell.appendChild(none)
                if (check.parentNode)
                    check.parentNode.removeChild(check)
            } else {
                // Remove previous allowed permission
                let allowed_permission = permissions.getAllowedList().filter(p_ => p_.getName() == name)[0]
                if (allowed_permission) {
                    // First I will remove the allowed permission.
                    if (subject.type == "group") {
                        let lst = allowed_permission.getGroupsList()
                        lst = lst.filter(g => g != subject.id)
                        allowed_permission.setGroupsList(lst)
                    } else if (subject.type == "account") {
                        let lst = allowed_permission.getAccountsList()
                        lst = lst.filter(a => a != subject.id)
                        allowed_permission.setAccountsList(lst)
                    } else if (subject.type == "application") {
                        let lst = allowed_permission.getApplicationsList()
                        lst = lst.filter(a => a != subject.id)
                        allowed_permission.setApplicationsList(lst)
                    } else if (subject.type == "organization") {
                        let lst = allowed_permission.getOrganizationsList()
                        lst = lst.filter(o => o != subject.id)
                        allowed_permission.setOrganizationsList(lst)
                    }

                }

                // Append in denied...
                let denied_permission = permissions.getDeniedList().filter(p_ => p_.getName() == name)[0]
                if (!denied_permission) {
                    denied_permission = new Permission
                    denied_permission.setName(name)
                    denied_permission.setAccountsList([])
                    denied_permission.setApplicationsList([])
                    denied_permission.setOrganizationsList([])
                    denied_permission.setGroupsList([])
                    let lst = permissions.getDeniedList()
                    lst.push(denied_permission)
                    permissions.getDeniedList(lst)
                }

                if (subject.type == "group") {
                    let lst = denied_permission.getGroupsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    denied_permission.setGroupsList(lst)
                } else if (subject.type == "account") {
                    let lst = denied_permission.getAccountsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    denied_permission.setAccountsList(lst)
                } else if (subject.type == "application") {
                    let lst = denied_permission.getApplicationsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    denied_permission.setApplicationsList(lst)
                } else if (subject.type == "organization") {
                    let lst = denied_permission.getOrganizationsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    denied_permission.setOrgnanizationsPermissions(lst)
                }

                // set the icon...
                cell.appendChild(denied)
                if (check.parentNode)
                    check.parentNode.removeChild(check)
                if (none.parentNode)
                    none.parentNode.removeChild(none)
            }


            this.permissionManager.savePermissions(() => {
                console.log("permission was save!")
            })
        }

        none.onclick = () => {

            if (name == "owner") {
                let owner_permission = permissions.getOwners()
                if (!owner_permission) {
                    owner_permission = new Permission
                    owner_permission.setName(name)
                    owner_permission.setAccountsList([])
                    owner_permission.setApplicationsList([])
                    owner_permission.setOrganizationsList([])
                    owner_permission.setGroupsList([])
                    permissions.setOwners(owner_permission)
                }
                if (subject.type == "group") {
                    let lst = owner_permission.getGroupsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    owner_permission.setGroupsList(lst)
                } else if (subject.type == "account") {
                    let lst = owner_permission.getAccountsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    owner_permission.setAccountsList(lst)
                } else if (subject.type == "application") {
                    let lst = owner_permission.getApplicationsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    owner_permission.setApplicationsList(lst)
                } else if (subject.type == "organization") {
                    let lst = owner_permission.getOrganizationsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    owner_permission.setOrgnanizationsPermissions(lst)
                }

                cell.appendChild(check)
                if (none.parentNode)
                    none.parentNode.removeChild(none)
            } else {

                // if the permission exist in denied...
                let denied_permission = permissions.getDeniedList().filter(p_ => p_.getName() == name)[0]
                if (denied_permission) {
                    if (subject.type == "group") {
                        let lst = denied_permission.getGroupsList()
                        lst = lst.filter(g => g != subject.id)
                        denied_permission.setGroupsList(lst)
                    } else if (subject.type == "account") {
                        let lst = denied_permission.getAccountsList()
                        lst = lst.filter(a => a != subject.id)
                        denied_permission.setAccountsList(lst)
                    } else if (subject.type == "application") {
                        let lst = denied_permission.getApplicationsList()
                        lst = lst.filter(a => a != subject.id)
                        denied_permission.setApplicationsList(lst)
                    } else if (subject.type == "organization") {
                        let lst = denied_permission.getOrganizationsList()
                        lst = lst.filter(o => o != subject.id)
                        denied_permission.setOrganizationsList(lst)
                    }
                }

                let allowed_permission = permissions.getAllowedList().filter(p_ => p_.getName() == name)[0]
                if (!allowed_permission) {
                    if (!allowed_permission) {
                        allowed_permission = new Permission
                        allowed_permission.setName(name)
                        allowed_permission.setAccountsList([])
                        allowed_permission.setApplicationsList([])
                        allowed_permission.setOrganizationsList([])
                        allowed_permission.setGroupsList([])
                        let lst = permissions.getAllowedList()
                        lst.push(allowed_permission)
                        permissions.setAllowedList(lst)
                    }
                }

                if (subject.type == "group") {
                    let lst = allowed_permission.getGroupsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    allowed_permission.setGroupsList(lst)
                } else if (subject.type == "account") {
                    let lst = allowed_permission.getAccountsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    allowed_permission.setAccountsList(lst)
                } else if (subject.type == "application") {
                    let lst = allowed_permission.getApplicationsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    allowed_permission.setApplicationsList(lst)
                } else if (subject.type == "organization") {
                    let lst = allowed_permission.getOrganizationsList()
                    if (lst.filter(s => s == subject.id).length == 0) {
                        lst.push(subject.id)
                    }
                    allowed_permission.setOrgnanizationsPermissions(lst)
                }

                cell.appendChild(check)
                if (none.parentNode)
                    none.parentNode.removeChild(none)
                if (denied.parentNode)
                    denied.parentNode.removeChild(denied)

            }


            this.permissionManager.savePermissions(() => {
                console.log("permission was save!")
            })
        }

        denied.onclick = () => {

            cell.appendChild(none)
            if (check.parentNode)
                check.parentNode.removeChild(check)
            if (denied.parentNode)
                denied.parentNode.removeChild(denied)

            let denied_permission = permissions.getDeniedList().filter(p_ => p_.getName() == name)[0]
            if (denied_permission) {
                if (subject.type == "group") {
                    let lst = denied_permission.getGroupsList()
                    lst = lst.filter(g => g != subject.id)
                    denied_permission.setGroupsList(lst)
                } else if (subject.type == "account") {
                    let lst = denied_permission.getAccountsList()
                    lst = lst.filter(a => a != subject.id)
                    denied_permission.setAccountsList(lst)
                } else if (subject.type == "application") {
                    let lst = denied_permission.getApplicationsList()
                    lst = lst.filter(a => a != subject.id)
                    denied_permission.setApplicationsList(lst)
                } else if (subject.type == "organization") {
                    let lst = denied_permission.getOrganizationsList()
                    lst = lst.filter(o => o != subject.id)
                    denied_permission.setOrganizationsList(lst)
                }
            }

            let allowed_permission = permissions.getAllowedList().filter(p_ => p_.getName() == name)[0]
            if (allowed_permission) {
                // First I will remove the allowed permission.
                if (subject.type == "group") {
                    let lst = allowed_permission.getGroupsList()
                    lst = lst.filter(g => g != subject.id)
                    allowed_permission.setGroupsList(lst)
                } else if (subject.type == "account") {
                    let lst = allowed_permission.getAccountsList()
                    lst = lst.filter(a => a != subject.id)
                    allowed_permission.setAccountsList(lst)
                } else if (subject.type == "application") {
                    let lst = allowed_permission.getApplicationsList()
                    lst = lst.filter(a => a != subject.id)
                    allowed_permission.setApplicationsList(lst)
                } else if (subject.type == "organization") {
                    let lst = allowed_permission.getOrganizationsList()
                    lst = lst.filter(o => o != subject.id)
                    allowed_permission.setOrganizationsList(lst)
                }

            }

            this.permissionManager.savePermissions(() => {
                console.log("permission was save!")
            })
        }

        row.appendChild(cell)
    }

    // Set permission and display it.
    setPermissions(permissions) {

        this.subjectsDiv.innerHTML = ""

        this.permissionsDiv.innerHTML = `
        <div id="permissions-header">
            <div class="subject-div">subject</div>
            <div class="permission-div">read</div>
            <div class="permission-div">write</div>
            <div class="permission-div">delete</div>
            <div class="permission-div">owner</div>
        </div>
        `

        // So here I will transform the values to be display in a table like view.
        let subjects = {}

        // be sure owner permission are set...
        let owner_permission = permissions.getOwners()
        if (!owner_permission) {
            owner_permission = new Permission
            owner_permission.setName("owner")
            owner_permission.setAccountsList([])
            owner_permission.setApplicationsList([])
            owner_permission.setOrganizationsList([])
            owner_permission.setGroupsList([])
            permissions.setOwners(owner_permission)
        }

        // Set the owner permissions.
        this.setPermission(subjects, "owner", owner_permission)

        // Set the denied permissions
        permissions.getDeniedList().forEach(p => this.setPermission(subjects, "denied", p))

        // set the allowed permission.
        permissions.getAllowedList().forEach(p => this.setPermission(subjects, "allowed", p))

        // Now I will display the permission.
        for (var id in subjects) {
            let row = document.createElement("div")
            row.style.display = "table-row"
            let subjectCell = document.createElement("div")
            subjectCell.style.display = "table-cell"
            subjectCell.className = "subject-div"
            row.appendChild(subjectCell)

            let subject = subjects[id]
            if (subject.type == "account") {
                AccountController.getAccount(subject.id, (a) => {
                    let accountDiv = this.createAccountDiv(a)
                    subjectCell.innerHTML = ""
                    subjectCell.appendChild(accountDiv)
                }, e => {
                    displayError(e,3000)
                })
            } else if (subject.type == "application") {
                // Set application div.
                let applicationDiv = this.createApplicationDiv(Application.getApplicationInfo(subject.id))
                subjectCell.innerHTML = ""
                subjectCell.appendChild(applicationDiv)
            } else if (subject.type == "group") {
                Group.getGroup(subject.id, g => {
                    let groupDiv = this.createGroupDiv(g)
                    subjectCell.innerHTML = ""
                    subjectCell.appendChild(groupDiv)
                }, e => displayError(e, 3000))
            } else if (subject.type == "organization") {
                getOrganizationById(subject.id, o => {
                    let organizationDiv = this.createOrganizationDiv(o)
                    subjectCell.innerHTML = ""
                    subjectCell.appendChild(organizationDiv)
                }, e => displayError(e, 3000))
            } else if (subject.type == "peer") {
                getPeerById(subject.id, p => {
                    let peerDiv = this.createPeerDiv(p)
                    subjectCell.innerHTML = ""
                    subjectCell.appendChild(peerDiv)
                }, e => displayError(e, 3000))
            }

            // Now I will set the value for other cells..
            this.permissionsNames.forEach(id => {
                this.setPermissionCell(row, subject.permissions[id], permissions, id, subject)
            })

            this.permissionsDiv.appendChild(row)
        }

    }

}

customElements.define('globular-permissions-viewer', PermissionsViewer)
