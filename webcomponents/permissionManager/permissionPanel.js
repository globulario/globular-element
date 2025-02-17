import { randomUUID } from "../utility";
import { OrganizationController } from "../../backend/organization";
import { AccountController } from "../../backend/account";
import { GroupController } from "../../backend/group.ts";
import { Backend } from "../../backend/backend.ts";
import { SearchableGroupList, SearchableAccountList, SearchableApplicationList, SearchablePeerList, SearchableOrganizationList } from "./list.js";
import { ApplicationController } from "../../backend/applications.ts";
import { PeerController } from "../../backend/peer.ts";

export class PermissionPanel extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(permissionManager) {
        super()

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.permissionManager = permissionManager;

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           

            .title{
                flex-grow: 1;
                font-size: 1.2rem;
                font-weight: 400;
                color: var(--palette-text-secondary);
                border-color: var(--palette-divider);
            }

            .members{
                display: flex;
                flex-direction: column;
            }

            .header{
                position: relative;
            }

        </style>
        <div>
            <div class="title">
            </div>
            <div class="members">

            </div>
        </div>
        `

        // test create offer...
    }

    // Set Permission infos...
    setPermission(permission, hideTitle) {

        this.permission = permission;

        if (hideTitle == undefined) {
            this.shadowRoot.querySelector(".title").innerHTML = permission.getName()
        } else {
            this.shadowRoot.querySelector(".title").style.display = "none";
        }

        // Set's account permissions.
        if (permission.getAccountsList().length > 0)
            this.setAccountsPermissions(permission.getAccountsList());
        else
            this.setAccountsPermissions([]);

        // Set's groups permissions
        if (permission.getGroupsList().length > 0)
            this.setGroupsPermissions(permission.getGroupsList());
        else
            this.setGroupsPermissions([]);

        // Set's Applications permissions
        if (permission.getApplicationsList().length > 0)
            this.setApplicationsPermissions(permission.getApplicationsList());
        else
            this.setApplicationsPermissions([]);

        // Set's Orgnanization permissions
        if (permission.getOrganizationsList().length > 0)
            this.setOrgnanizationsPermissions(permission.getOrganizationsList());
        else
            this.setOrgnanizationsPermissions([]);

        // Set's Peer permissions
        if (permission.getPeersList().length > 0)
            this.setPeersPermissions(permission.getPeersList());
        else
            this.setPeersPermissions([]);
    }

    // Create a collapseible panel.
    createCollapsible(title) {
        let uuid = "_" + randomUUID()
        let html = `
        <style>
            .header {
                display: flex;
                align-items: center;
            }

            .title{
                flex-grow: 1;
            }

            iron-icon:hover{
                cursor: pointer;
            }

        </style>
        <div style="padding-left: 10px; width: 100%">
            <div class="header">
                <div style="display: flex; width: 32px; height: 32px; justify-content: center; align-items: center;position: relative;">
                    <iron-icon  id="${uuid}-btn"  icon="unfold-less" --iron-icon-fill-color:var(--primary-text-color);"></iron-icon>
                    <paper-ripple class="circle" recenters=""></paper-ripple>
                </div>
                <span class="title">${title}</span>
            </div>
            <iron-collapse id="${uuid}-collapse-panel"  style="margin: 5px;">
                
            </iron-collapse>
        </div>
        `

        this.shadowRoot.querySelector(".members").appendChild(document.createRange().createContextualFragment(html))
        let content = this.shadowRoot.querySelector(`#${uuid}-collapse-panel`)
        this.hideBtn = this.shadowRoot.querySelector(`#${uuid}-btn`)

        this.hideBtn.onclick = () => {
            let button = this.shadowRoot.querySelector(`#${uuid}-btn`)
            if (button && content) {
                if (!content.opened) {
                    button.icon = "unfold-more"
                } else {
                    button.icon = "unfold-less"
                }
                content.toggle();
            }
        }
        // return the collapse panel.
        return this.shadowRoot.querySelector(`#${uuid}-collapse-panel`)
    }

    // The organization permissions
    setPeersPermissions(peers_) {

        let content = this.createCollapsible(`Peers(${peers_.length})`)
        PeerController.getPeers(
            peers => {
                let list = []
                this.permission.getPeersList().forEach(peerId => {
                    let p_ = peers.find(p => p.getMac() === peerId);
                    if (p_ != undefined) {
                        list.push(p_)
                    }
                })

                let peersList = new SearchablePeerList("Peers", list,
                    p => {
                        let index = this.permission.getPeersList().indexOf(p.getMac())
                        if (index != -1) {
                            this.permission.getPeersList().splice(index, 1)
                            this.permissionManager.savePermissions()
                            peersList.removeItem(p)
                        }
                    },
                    p => {
                        let index = this.permission.getPeersList().indexOf(p.getMac())
                        if (index == -1) {
                            this.permission.getPeersList().push(p.getMac())
                            this.permissionManager.savePermissions()
                            peersList.appendItem(p)
                        }
                    })

                // Do not display the title again...
                peersList.hideTitle()
                content.appendChild(peersList)
            }, err => displayError(err, 3000), this.permissionManager.globule)

    }

    // The organization permissions
    setOrgnanizationsPermissions(organizations_) {

        let content = this.createCollapsible(`Organizations(${organizations_.length})`)
        OrganizationController.getAllOrganizations(
            organizations => {
                let list = []
                this.permission.getOrganizationsList().forEach(organizationId => {
                    let o_ = organizations.find(o => o.getId() === organizationId);
                    if (o_ == undefined) {
                        o_ = organizations.find(o => o.getId() + "@" + o.getDomain() === organizationId);
                    }
                    if (o_ != undefined) {
                        list.push(o_)
                    }
                })

                let organizationList = new SearchableOrganizationList("Organizations", list,
                    o => {
                        let index = this.permission.getOrganizationsList().indexOf(o.getId())
                        if (index == -1) {
                            index = this.permission.getOrganizationsList().indexOf(o.getId() + "@" + o.getDomain())
                        }
                        if (index != -1) {
                            this.permission.getOrganizationsList().splice(index, 1)
                            this.permissionManager.savePermissions()
                            organizationList.removeItem(o)
                        }
                    },
                    o => {
                        let index = this.permission.getOrganizationsList().indexOf(o.getId())
                        if (index == -1) {
                            index = this.permission.getOrganizationsList().indexOf(o.getId() + "@" + o.getDomain())
                        }
                        if (index == -1) {
                            this.permission.getOrganizationsList().push(o.getId() + "@" + o.getDomain())
                            this.permissionManager.savePermissions()
                            organizationList.appendItem(o)
                        }
                    })

                // Do not display the title again...
                organizationList.hideTitle()
                content.appendChild(organizationList)
            }, err => displayError(err, 3000), this.permissionManager.globule)

    }

    // The group permissions
    setApplicationsPermissions(applications_) {

        let content = this.createCollapsible(`Applications(${applications_.length})`)
        ApplicationController.getAllApplicationInfo(
            applications => {
                // I will get the account object whit the given id.
                let list = []

                this.permission.getApplicationsList().forEach(applicationId => {
                    let a_ = applications.find(a => a.getId() + "@" + a.getDomain() === applicationId);
                    if (a_ == undefined) {
                        a_ = applications.find(a => a.getId() === applicationId);
                    }
                    if (a_ != undefined) {
                        list.push(a_)
                    }
                })

                let applicationList = new SearchableApplicationList("Applications", list,
                    a => {
                        let index = this.permission.getApplicationsList().indexOf(a.getId())
                        if (index == -1) {
                            index = this.permission.getApplicationsList().indexOf(a.getId() + "@" + a.getDomain())
                        }
                        if (index != -1) {
                            this.permission.getApplicationsList().splice(index, 1)
                            this.permissionManager.savePermissions()
                            applicationList.removeItem(a)
                        }
                    },
                    a => {
                        let index = this.permission.getApplicationsList().indexOf(a.getId())
                        if (index == -1) {
                            index = this.permission.getApplicationsList().indexOf(a.getId() + "@" + a.getDomain())
                        }
                        if (index == -1) {
                            this.permission.getApplicationsList().push(a.getId() + "@" + a.getDomain())
                            this.permissionManager.savePermissions()
                            applicationList.appendItem(a)
                        }
                    })

                // Do not display the title again...
                applicationList.hideTitle()
                content.appendChild(applicationList)

            }, err => displayError(err, 3000), this.permissionManager.globule)

    }

    // The group permissions
    setGroupsPermissions(groups_) {

        let content = this.createCollapsible(`Groups(${groups_.length})`)

        GroupController.getGroups(this.permissionManager.globule,
            groups => {
                // I will get the account object whit the given id.
                let list = []

                this.permission.getGroupsList().forEach(groupId => {

                    let g_ = groups.find(g => g.getId() === groupId);
                    if (g_ == undefined) {
                        g_ = groups.find(g => g.getId() + "@" + g.getDomain() === groupId);
                    }

                    if (g_ != undefined) {
                        list.push(g_)
                    }

                })

                let groupsList = new SearchableGroupList("Groups", list,
                    g => {
                        let index = this.permission.getGroupsList().indexOf(g.getId())
                        if (index == -1) {
                            index = this.permission.getGroupsList().indexOf(g.getId() + "@" + g.getDomain())
                        }
                        if (index != -1) {
                            this.permission.getGroupsList().splice(index, 1)
                            this.permissionManager.savePermissions()
                            groupsList.removeItem(g)
                        }
                    },
                    g => {
                        let index = this.permission.getGroupsList().indexOf(g.getId())
                        if (index == -1) {
                            index = this.permission.getGroupsList().indexOf(g.getId() + "@" + g.getDomain())
                        }
                        if (index == -1) {
                            this.permission.getGroupsList().push(g.getId() + "@" + g.getDomain())
                            this.permissionManager.savePermissions()
                            groupsList.appendItem(g)
                        }
                    })

                // Do not display the title again...
                groupsList.hideTitle()
                content.appendChild(groupsList)

            }), err => displayError(err, 3000);

    }

    // Each permission can be set for applications, peers, accounts, groups or organizations
    setAccountsPermissions(accounts_) {

        let content = this.createCollapsible(`Account(${accounts_.length})`)

        // Here I will set the content of the collapse panel.
        // Now the account list.
        AccountController.getAccounts("{}", false,
            accounts => {

                // I will get the account object whit the given id.
                let list = []
                accounts_.forEach(accountId => {
                    let a_ = accounts.find(a => a.getId() + "@" + a.getDomain() === accountId);
                    if (a_ == undefined) {
                        a_ = accounts.find(a => a.getId() === accountId);
                    }

                    if (a_ != undefined) {
                        list.push(a_)
                    }
                })

                let accountsList = new SearchableAccountList("Accounts", list,
                    a => {
                        let index = this.permission.getAccountsList().indexOf(a.getId())
                        if (index == -1) {
                            index = this.permission.getAccountsList().indexOf(a.getId() + "@" + a.getDomain())
                        }
                        if (index != -1) {
                            this.permission.getAccountsList().splice(index, 1)
                            this.permissionManager.savePermissions()
                            accountsList.removeItem(a)
                        }
                    },
                    a => {
                        let index = this.permission.getAccountsList().indexOf(a.getId())
                        if (index == -1) {
                            index = this.permission.getAccountsList().indexOf(a.getId() + "@" + a.getDomain())
                        }
                        if (index == -1) {
                            this.permission.getAccountsList().push(a.getId() + "@" + a.getDomain())
                            this.permissionManager.savePermissions()
                            accountsList.appendItem(a)
                        }
                    })

                // Do not display the title again...
                accountsList.hideTitle()

                content.appendChild(accountsList)
            }, err => {
                displayError(err, 3000);
            })

    }

}

customElements.define('globular-permission-panel', PermissionPanel)
