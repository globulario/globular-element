import { Backend, displayError, displayMessage } from "../../backend/backend"
import { AccountController } from "../../backend/account";
import { GetResourcePermissionsRqst, Permission, Permissions, SetResourcePermissionsRqst } from "globular-web-client/rbac/rbac_pb";
import { PermissionPanel } from "./permissionPanel.js";
import { PermissionsViewer } from "./permissionsViewer.js";

export class PermissionsManager extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()

        // The active globule
        this.globule = Backend.globular

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // the active permissions.
        this.permissions = null

        // the active path.
        this.path = ""

        // The listener
        this.savePermissionListener = ""

        // Keep the list of possible permissions.
        this.permissionsNames = ["read", "write", "delete"]

        this.onclose = null

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container{
                display: flex;
                flex-direction: column;
                padding: 8px;
                /*background-color: var(--surface-color);*/
            }

            #header {
                display: flex;
            }

            .title{
                align-items: center;
                display: flex;
                flex-grow: 1;
                font-weight: 400;
                color: var(--palette-text-secondary);
                border-bottom: 2px solid;
                border-color: var(--palette-divider);
            }

            .permissions{
                padding: 10px;
            }

            ::slotted(globular-permissions-viewer){
                padding-bottom: 20px; 
                padding-right: 40px;
            }

        </style>
        <div id="container">
            <div id="header">
                <div id="path" class="title"> </div>
                <paper-icon-button icon="close"></paper-icon-button>
                
            </div>
            <slot name="permission-viewer"></slot>
            <div style="padding-right: 40px;">
                <div  class="title">
                <div style="display: flex; width: 32px; height: 32px; justify-content: center; align-items: center;position: relative;">
                    <iron-icon  id="owner-collapse-btn"  icon="unfold-less" --iron-icon-fill-color:var(--primary-text-color);"></iron-icon>
                    <paper-ripple class="circle" recenters=""></paper-ripple>
                </div>
                    Owner(s)
                </div>
                <iron-collapse class="permissions" id="owner">
                    <slot name="owner"> </slot>
                </iron-collapse>
            </div>
            <div>
                <div style="display: flex; position: relative;">
                    <div class="title" style="flex-grow: 1;">
                    <div style="display: flex; width: 32px; height: 32px; justify-content: center; align-items: center;position: relative;">
                        <iron-icon  id="allowed-collapse-btn"  icon="unfold-less" --iron-icon-fill-color:var(--primary-text-color);"></iron-icon>
                        <paper-ripple class="circle" recenters=""></paper-ripple>
                    </div>
                        Allowed(s)
                    </div>
                    <paper-icon-button  id="add-allowed-btn" icon="icons:add"></paper-icon-button>
                </div>
                <iron-collapse class="permissions" id="allowed">
                    <slot name="allowed"> </slot>
                </iron-collapse>
            </div>
            <div>
                <div style="display: flex; position: relative;">
                    <div class="title" style="flex-grow: 1;">
                    <div style="display: flex; width: 32px; height: 32px; justify-content: center; align-items: center;position: relative;">
                        <iron-icon  id="denied-collapse-btn"  icon="unfold-less" --iron-icon-fill-color:var(--primary-text-color);"></iron-icon>
                        <paper-ripple class="circle" recenters=""></paper-ripple>
                    </div>
                        Denied(s)
                    </div>
                    <paper-icon-button id="add-denied-btn" icon="icons:add"></paper-icon-button>
                </div>
                <iron-collapse class="permissions" id="denied">
                    <slot name="denied"> </slot>
                </iron-collapse>
            </div>
        </div>
        `

        // give the focus to the input.
        this.container = this.shadowRoot.querySelector("#container")


        this.pathDiv = this.shadowRoot.querySelector("#path")
        this.style.overflowY = "auto"

        // The tree sections.
        this.owners = this.shadowRoot.querySelector("#owner")
        this.alloweds = this.shadowRoot.querySelector("#allowed")
        this.denieds = this.shadowRoot.querySelector("#denied")

        // Now the collapse panels...
        this.owners_collapse_btn = this.shadowRoot.querySelector("#owner-collapse-btn")
        this.owners_collapse_btn.onclick = () => {
            if (!this.owners.opened) {
                this.owners_collapse_btn.icon = "unfold-more"
            } else {
                this.owners_collapse_btn.icon = "unfold-less"
            }
            this.owners.toggle();
        }

        this.alloweds_collapse_btn = this.shadowRoot.querySelector("#allowed-collapse-btn")
        this.alloweds_collapse_btn.onclick = () => {
            if (!this.alloweds.opened) {
                this.alloweds_collapse_btn.icon = "unfold-more"
            } else {
                this.alloweds_collapse_btn.icon = "unfold-less"
            }
            this.alloweds.toggle();
        }

        this.denieds_collapse_btn = this.shadowRoot.querySelector("#denied-collapse-btn")
        this.denieds_collapse_btn.onclick = () => {
            if (!this.denieds.opened) {
                this.denieds_collapse_btn.icon = "unfold-more"
            } else {
                this.denieds_collapse_btn.icon = "unfold-less"
            }
            this.denieds.toggle();
        }

        this.addDeniedBtn = this.shadowRoot.querySelector("#add-denied-btn")
        this.addDeniedBtn.onclick = () => {
            this.addPermission(this.addDeniedBtn, "denied")
        }

        this.addAllowedBtn = this.shadowRoot.querySelector("#add-allowed-btn")
        this.addAllowedBtn.onclick = () => {
            this.addPermission(this.addAllowedBtn, "allowed")
        }


        // The close button...
        let closeButton = this.shadowRoot.querySelector("paper-icon-button")
        closeButton.onclick = () => {
            if(this.onclose){
                this.onclose()
            }
            // remove it from it parent.
            this.parentNode.removeChild(this)
        }

    }

    hideHeader() {
        this.shadowRoot.querySelector("#header").style.display = "none"
    }

    showHeader() {
        this.shadowRoot.querySelector("#header").style.display = ""
    }

    // Add the list of available permissions.
    addPermission(parent, type) {

        let addPermissionPanel = parent.parentNode.querySelector("#add-permission-panel")

        if (addPermissionPanel == null && this.permissionsNames.length > 0) {
            let html = `
            <style>
               
                #add-permission-panel{
                    position: absolute;
                    right: 20px;
                    top: ${parent.offsetTop + 20}px;
                    z-index: 100;
                    background-color: var(--surface-color);
                    color: var(--primary-text-color);
                }

                .card-content{
                    overflow-y: auto;
                    min-width: 200px;
                }

                paper-card{
                    background-color: var(--surface-color);
                    color: var(--primary-text-color);
                }

            </style>
            <paper-card id="add-permission-panel">
                <div style="display: flex; align-items: center;">
                    <div style="flex-grow: 1; padding: 5px;">
                        Add Permission
                    </div>
                    <paper-icon-button id="cancel-btn" icon="close"></paper-icon-button>
                </div>
                <div class="card-content">
                    <paper-radio-group>
                    </paper-radio-group>
                </div>
            </paper-card>
            `

            // Add the fragment.
            parent.parentNode.appendChild(document.createRange().createContextualFragment(html))

            let buttonGroup = parent.parentNode.querySelector("paper-radio-group")
            this.permissionsNames.sort()
            this.permissionsNames.forEach(p => {
                let radioBtn = document.createElement("paper-radio-button")
                radioBtn.name = p
                radioBtn.innerHTML = p
                buttonGroup.appendChild(radioBtn)
                radioBtn.onclick = () => {
                    this.createPermission(p, type)
                    let popup = parent.parentNode.querySelector("paper-card")
                    popup.parentNode.removeChild(popup)
                }
            })

            // Remove the popup...
            parent.parentNode.querySelector("#cancel-btn").onclick = () => {
                let popup = parent.parentNode.querySelector("paper-card")
                popup.parentNode.removeChild(popup)
            }
        }
    }

    // Create the permission.
    createPermission(name, type) {
        // So here I will try to find if the permission already exist in the interface.
        let id = "permission_" + name + "_" + type + "_panel"
        let panel = this.querySelector("#" + id)
        if (panel == null) {
            // create the panel.
            panel = new PermissionPanel(this)

            panel.setAttribute("id", id)
            let permission = new Permission
            permission.setName(name)
            panel.setPermission(permission)

            // set the permission in the permissions object.
            if (type == "allowed") {
                this.permissions.getAllowedList().push(permission)
                panel.slot = "allowed"

            } else if (type == "denied") {
                this.permissions.getDeniedList().push(permission)
                panel.slot = "denied"
            }

            this.appendChild(panel)

        } else {
            displayMessage("Permission " + name + " already exist", 3000)
        }

        if (type == "allowed") {
            // display the panel
            if (!this.alloweds.opened) {
                this.alloweds.toggle()
            }
        } else if (type == "denied") {
            if (!this.denieds.opened) {
                this.denieds.toggle()
            }
        }
    }

    // Save permissions
    savePermissions(callback) {
        let rqst = new SetResourcePermissionsRqst


        console.log("saving permissions", this.permissions)
        rqst.setPermissions(this.permissions)
        rqst.setPath(this.path)

        if (!this.permissions.getResourceType()) {
            this.permissions.setResourceType("file")
        }

        rqst.setResourcetype(this.permissions.getResourceType())

        this.globule.rbacService.setResourcePermissions(rqst, {
            token: localStorage.getItem("user_token"),
            domain: this.globule.domain
        }).then(rsp => {
            // reload the interface.
            this.setPath(this.path)

            Backend.publish(AccountController.account.getId() + "_change_permission_event", {}, false)
            if (callback) {
                callback()
            }
            
        }).catch(err => {
            displayError(err, 3000);
            this.setPath(this.path)
            // force reload the interfce...
        })
    }

    setPermissions(permissions) {
        if (permissions == null) {
            console.log("permissions is null")
            return;
        }

        this.permissions = permissions

        // clear the panel values.
        this.pathDiv.innerHTML = this.path;
        this.innerHTML = ""

        // set the permssion viewer
        this.permissionsViewer = new PermissionsViewer(["read", "write", "delete", "owner"])
        this.permissionsViewer.slot = "permission-viewer"
        this.permissionsViewer.setPermissions(this.permissions)
        this.permissionsViewer.permissionManager = this;
        this.appendChild(this.permissionsViewer)

        // Here I will display the owner's
        let ownersPermissionPanel = new PermissionPanel(this)
        ownersPermissionPanel.id = "permission_owners_panel"


        ownersPermissionPanel.setPermission(this.permissions.getOwners(), true)
        ownersPermissionPanel.slot = "owner"
        this.appendChild(ownersPermissionPanel)

        // The list of denied and allowed permissions.
        this.permissions.getAllowedList().forEach(p => {
            let panel = new PermissionPanel(this)
            panel.id = "permission_" + p.getName() + "_allowed_panel"
            panel.slot = "allowed"
            panel.setPermission(p)
            this.appendChild(panel)
        })

        this.permissions.getDeniedList().forEach(p => {
            let panel = new PermissionPanel(this)
            panel.id = "permission_" + p.getName() + "_denied_panel"
            panel.slot = "denied"
            panel.setPermission(p)
            this.appendChild(panel)
        })
    }

    // retreive the permissions from the backeend and set it in the interface.
    setPath(path) {
        // Keep the path in memory
        this.path = path;

        // So here I will get the actual permissions.
        let rqst = new GetResourcePermissionsRqst
        rqst.setPath(path)

        this.globule.rbacService.getResourcePermissions(rqst, {
        }).then(rsp => {
            let permissions = rsp.getPermissions()
            this.setPermissions(permissions)
        }).catch(err => {
            // displayError(err, 3000);
            let permissions = new Permissions
            permissions.setPath(path)
            let owners = new Permission
            owners.setName("owner")
            permissions.setOwners(owners)
            this.setPermissions(permissions)

        })
    }

    // Set the resource type.
    setResourceType(resource_type) {
        if (this.permissions) {
            this.permissions.setResourceType(resource_type)
        }
    }
}

customElements.define('globular-permissions-manager', PermissionsManager)
