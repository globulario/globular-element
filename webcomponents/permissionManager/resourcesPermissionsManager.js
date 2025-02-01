import getUuidByString from "uuid-by-string"
import { Backend } from "../../backend/backend";

/**
 * Manage resource 
 */
export class ResourcesPermissionsManager extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
        </style>

        <div>
            <slot></slot>
        </div>
        `

        // Event received when permissions was deleted
        Backend.eventHub.subscribe("delete_resources_permissions_event",
            uuid => { },
            evt => {
                let permissions = Permissions.deserializeBinary(evt)
                if (this.querySelector(`#${permissions.getResourceType()}-permissions`)) {
                    this.querySelector(`#${permissions.getResourceType()}-permissions`).deletePermissions(permissions)
                }
            }, false)

        // Event received when permissions was deleted
        Backend.eventHub.subscribe("set_resources_permissions_event",
            uuid => { },
            evt => {
                let permissions = Permissions.deserializeBinary(evt)
                if (this.querySelector(`#${permissions.getResourceType()}-permissions`)) {
                    this.querySelector(`#${permissions.getResourceType()}-permissions`).setPermissions(permissions)
                }

            }, false)


    }

    // I will get it when the value are set...
    connectedCallback() {
        this.innerHTML = ""
        // append list of different resources by type.
        this.appendResourcePermissions("application", getApplication)
        this.appendResourcePermissions("blog", getBlog)
        this.appendResourcePermissions("conversation", getConversation)
        this.appendResourcePermissions("domain", getDomain)
        //this.appendResourcePermissions("file", getFile) // to slow when the number of file is high...
        this.appendResourcePermissions("group", getGroup)
        this.appendResourcePermissions("organization", getOrganization)
        this.appendResourcePermissions("package", getPackage)
        this.appendResourcePermissions("role", getRole)
        this.appendResourcePermissions("webpage", getWebpage)
    }

    appendResourcePermissions(typeName, fct) {
        if (!this.querySelector(`#${typeName}-permissions`)) {
            let resourcePermissions = new ResourcesPermissionsType(typeName, fct)
            resourcePermissions.id = typeName + "-permissions"
            this.appendChild(resourcePermissions)
        }
    }

}

customElements.define('globular-resources-permissions-manager', ResourcesPermissionsManager)


/**
 * Display the list of resource for a given type.
 */
export class ResourcesPermissionsType extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(resource_type, getResource) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Set the resource type
        this.resource_type = resource_type;

        // The function use to get the actual resource.
        this.getResource = getResource

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            paper-card {
                background-color: var(--surface-color);
                color: var(--primary-text-color);
                font-size: 1rem;
                text-align: left;
                border-radius: 2px;
                width: 100%;
            }

            .card-content {
                min-width: 728px;
                font-size: 1rem;
                padding: 0px;
            }

            @media (max-width: 800px) {
                .card-content{
                  min-width: 580px;
                }
              }
      
              @media (max-width: 600px) {
                .card-content{
                  min-width: 380px;
                }
              }

            #container {
                display: flex;
                flex-direction: column;
                align-items: center;
                border-bottom: 1px solid var(--palette-divider);
            }

            .title {
                flex-grow: 1;
                padding: 10px;
            }

            .title::first-letter {
                text-transform: uppercase;
            }

            .header:hover {
                -webkit-filter: invert(10%);
                filter: invert(10%);
            }
            
            .header {
                display: flex;
                align-items: center;
                width: 100%;
                transition: background 0.2s ease,padding 0.8s linear;
                background-color: var(--surface-color);
            }

            #content {
                margin: 10px;
                display: flex; 
                flex-direction: column;
 
            }

        </style>
       
        <div id="container">
            <paper-card>
                <div class="card-content">
                    <div class="header">
                        <span class="title" style="flex-grow: 1;">
                            ${resource_type + "(s)"}
                        </span>
                        <span id="counter"></span>
                        <div style="display: flex; width: 32px; height: 32px; justify-content: center; align-items: center;position: relative;">
                            <iron-icon id="hide-btn" icon="unfold-less" style="flex-grow: 1; --iron-icon-fill-color:var(--primary-text-color);"></iron-icon>
                            <paper-ripple class="circle" recenters=""></paper-ripple>
                        </div>
                    </div>
                    <iron-collapse id="collapse-panel" style="width: 100%; transition-property: max-height; max-height: 0px; transition-duration: 0s;" role="group" aria-hidden="true" class="iron-collapse-closed">
                        <div id="content" style="">
                            <slot></slot>
                        </div>
                    </iron-collapse>
                </div>
            </paper-card>
        </div>
        
        `

        let togglePanel = this.shadowRoot.querySelector("#collapse-panel")
        this.hideBtn = this.shadowRoot.querySelector("#hide-btn")


        // give the focus to the input.
        this.hideBtn.onclick = () => {
            let button = this.shadowRoot.querySelector("#hide-btn")
            if (button && togglePanel) {
                if (!togglePanel.opened) {
                    button.icon = "unfold-more"
                } else {
                    button.icon = "unfold-less"
                }
                togglePanel.toggle();
            }
        }


        this.getResourcePermissionsByResourceType(permissions => {
            let count = 0
            permissions.forEach(p => {
                if (this.getResource) {
                    this.getResource(p.getPath(), (r) => {
                        let r_ = new ResourcePermissions(r)
                        r_.id = "_" + getUuidByString(p.getPath())
                        this.appendChild(r_)
                        count++
                        this.shadowRoot.querySelector("#counter").innerHTML = count
                    }, err => {
                        console.log(err)
                        // delete the permissions if the resource dosent exist.
                        PermissionManager.deleteResourcePermissions(p.getPath(), ()=>{
                            console.log("resource permissions was deleted!")
                        }, err => displayError(err, 3000))
                    })
                }
            })
        })
    }

    deletePermissions(p) {
        let uuid = "_" + getUuidByString(p.getPath())
        let r_ = this.querySelector("#" + uuid)
        if (r_ != null) {
            r_.parentNode.removeChild(r_)
        }
        this.shadowRoot.querySelector("#counter").innerHTML = this.childElementCount.toString()
    }

    setPermissions(p) {
        let id = "_" + getUuidByString(p.getPath())

        if (this.getResource) {
            this.getResource(p.getPath(), (r) => {
                if (this.querySelector("#" + id)) {
                    this.removeChild(this.querySelector("#" + id))
                }

                let r_ = new ResourcePermissions(r)
                r_.id = id
                this.appendChild(r_)
                this.shadowRoot.querySelector("#counter").innerHTML = this.childElementCount.toString()
            }, err => displayError(err, 3000))
        }


    }

    // Get the list of permission by type...
    getResourcePermissionsByResourceType(callback) {
        let rqst = new GetResourcePermissionsByResourceTypeRqst
        rqst.setResourcetype(this.resource_type)
        let permissions = [];

        let stream = Backend.globular.rbacService.getResourcePermissionsByResourceType(rqst,
            {
                domain: Backend.globular.domain,
                token: localStorage.getItem("user_token")
            });

        // Get the stream and set event on it...
        stream.on("data", (rsp) => {
            permissions = permissions.concat(rsp.getPermissionsList())
        });

        stream.on("status", (status) => {
            if (status.code == 0) {
                callback(permissions)
            } else {
                callback([])
            }
        });
    }

}

customElements.define('globular-resources-permissions-type', ResourcesPermissionsType)


export class ResourcePermissions extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(resource) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container {
                display: flex;
                flex-direction: column;
                align-items: center;
                /*border-bottom: 1px solid var(--surface-color);*/
            }

            .header:hover {
                -webkit-filter: invert(10%);
                filter: invert(10%);
            }
            
            .header {
                display: flex;
                align-items: center;
                width: 100%;
                transition: background 0.2s ease,padding 0.8s linear;
                background-color: var(--surface-color);
            }

            iron-icon{
                padding: 5px;
            }

            iron-icon:hover{
                cursor: pointer;
            }

            .resource-text {
                text-overflow: ellipsis;
                overflow: hidden; 
                max-width: 584px;
                white-space: nowrap;
            }

            #content {
                display: flex; 
                flex-direction: column;
                margin: 10px;
                background-color: var(--surface-color);
                color: var(--primary-text-color);
            }

        </style>
        <div id="container">
            <div class="header">
                <div style="display: flex; width: 32px; height: 32px; justify-content: center; align-items: center;position: relative;">
                    <iron-icon id="info-btn" icon="icons:info" style="flex-grow: 1; --iron-icon-fill-color:var(--primary-text-color);"></iron-icon>
                    <paper-ripple class="circle" recenters=""></paper-ripple>
                </div>

                <span class="resource-text" style="flex-grow: 1; padding: 5px;">
                    ${resource.getHeaderText()}
                </span>

                <div style="display: flex; width: 32px; height: 32px; justify-content: center; align-items: center;position: relative;">
                    <iron-icon id="edit-btn" icon="editor:mode-edit" style="flex-grow: 1; --iron-icon-fill-color:var(--primary-text-color);"></iron-icon>
                    <paper-ripple class="circle" recenters=""></paper-ripple>
                </div>
                
                <div style="display: flex; width: 32px; height: 32px; justify-content: center; align-items: center;position: relative;">
                    <iron-icon id="delete-btn" icon="delete" style="flex-grow: 1; --iron-icon-fill-color:var(--primary-text-color);"></iron-icon>
                    <paper-ripple class="circle" recenters=""></paper-ripple>
                </div>
            </div>
            <iron-collapse id="info-collapse-panel" style="width: 100%; transition-property: max-height; max-height: 0px; transition-duration: 0s;" role="group" aria-hidden="true" class="iron-collapse-closed">
                <div id="content" style="">
                    <slot name="resource-info"></slot>
                </div>
            </iron-collapse>
            <iron-collapse id="permissions-editor-collapse-panel" style="width: 100%; transition-property: max-height; max-height: 0px; transition-duration: 0s;" role="group" aria-hidden="true" class="iron-collapse-closed">
                <div id="content" style="">
                    <slot name="resource-permissions-editor"></slot>
                </div>
            </iron-collapse>
        </div>
        `

        let infoTogglePanel = this.shadowRoot.querySelector("#info-collapse-panel")
        let info = resource.getInfo()
        info.slot = "resource-info"
        this.appendChild(info)
        this.infoBtn = this.shadowRoot.querySelector("#info-btn")

        // give the focus to the input.
        this.infoBtn.onclick = () => {

            if (infoTogglePanel) {
                if (!infoTogglePanel.opened) {
                    // close
                } else {
                    // open
                }
                infoTogglePanel.toggle();
            }
        }

        let permissionsTogglePanel = this.shadowRoot.querySelector("#permissions-editor-collapse-panel")
        let permissionManager = new PermissionsManager
        permissionManager.hideHeader()
        permissionManager.slot = "resource-permissions-editor"
        this.appendChild(permissionManager)
        permissionManager.setPath(resource.getPath())
        this.editBtn = this.shadowRoot.querySelector("#edit-btn")

        // give the focus to the input.
        this.editBtn.onclick = () => {

            if (permissionsTogglePanel) {
                if (!permissionsTogglePanel.opened) {
                    // close
                } else {
                    // open
                }
                permissionsTogglePanel.toggle();
            }
        }

        let deleteBtn = this.shadowRoot.querySelector("#delete-btn")
        deleteBtn.onclick = () => {
            let toast = displayMessage(`
            <style>
               
            </style>
            <div>
                <div>Your about to delete permission for resource ${resource.getHeaderText()}</div>
                <div>Is it what you want to do? </div>
                <div style="display: flex; justify-content: flex-end;">
                    <paper-button id="ok-button">Ok</paper-button>
                    <paper-button id="cancel-button">Cancel</paper-button>
                </div>
            </div>
            `, 60 * 1000)


            let cancelBtn = toast.toastElement.querySelector("#cancel-button")
            cancelBtn.onclick = () => {
                toast.hideToast();
            }

            let okBtn = toast.toastElement.querySelector("#ok-button")
            okBtn.onclick = () => {
                // So here I will delete the permissions..
                let rqst = new DeleteResourcePermissionsRqst
                rqst.setPath(resource.getPath())
                let globule = Backend.globular
                globule.rbacService.deleteResourcePermissions(rqst, { domain: globule.domain, token: localStorage.getItem("user_token") })
                    .then(rsp => {
                        displayMessage("Permission was removed", 3000)
                        this.parentNode.removeChild(this)
                    }).catch(err => displayError(err, 3000))


                toast.hideToast();
            }
        }

    }

}

customElements.define('globular-resource-permissions', ResourcePermissions)