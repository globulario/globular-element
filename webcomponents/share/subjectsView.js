import getUuidByString from "uuid-by-string"
import { AccountController } from "../../backend/account";


/**
 * Display suject (user's, group's, organization's, application's) in accordeon panel...
 */
export class GlobularSubjectsView extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // The event listener...
        this.on_accounts_change = null
        this.on_groups_change = null
        this.on_account_click = null
        this.on_group_click = null
        this.on_application_click = null
        this.on_organization_click = null

        // set the account...
        this.account = AccountController.account

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #subjects-div{
                display: flex;
                flex-direction: column;
                margin-right: 25px;
            }

            .vertical-tabs {
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            .vertical-tab {
                display: flex;
                flex-direction: column;
                position: relative;
            }

            .vertical-tab span{
                position: relative;
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

            .active.infos {
                border: 1px solid #2196f3;
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
                max-height: 64px;
                max-width: 64px;
                border-radius: 32px;
                margin-right: 10px;
            }

            .infos iron-icon{
                height: 32px;
                width: 32px;
            }

            .infos span{
                font-size: 1rem;
                
            }

            .infos:hover{
                -webkit-filter: invert(10%);
                filter: invert(10%);
                cursor: pointer;
            }

            .selector:hover {
                cursor: pointer;
            }

            .selector {
                text-decoration: underline;
                padding: 2px;
                margin-right: 5px;
            } 

            .counter{
                font-size: 1rem;
            }

            .group-members {
                display: flex; 
                flex-wrap: wrap;
            }

            .group-members .infos{
                flex-direction: column;
            }

            .group-members .infos:hover{
                -webkit-filter: invert(0%);
                filter: invert(0%);
                cursor: default;
                cursor: pointer;
            }

            .group-members .infos img{
                max-height: 32px;
                max-width: 32px;
                border-radius: 16px;
            }

            .vertical-tabs {
                font-size: 1rem;
            }

            .selectors{
                display: flex;
                flex-direction: column;
                position: relative;
            }

            #organizations-tab {
                display: none;
            }

            #applications-tab{
                display: none;
            }

            ::-webkit-scrollbar {
                width: 5px;
                height: 5px;
            }
                
            ::-webkit-scrollbar-track {
                background: var(--surface-color);
            }
            
            ::-webkit-scrollbar-thumb {
                background: var(--palette-divider); 
            }
         

            @media (max-width: 500px) {
                #subjects-div {
                    margin-right: 5px;
                    /*max-width: 130px;*/
                }

                .subject-div{
                    padding-left: 0px;
                    flex-direction: row;
                    overflow-x: auto;
                }

                .infos{
                    flex-direction: column;
                    border: 1px solid var(--palette-divider);
                }

                .Contacts_icon{
                    display: none;
                }

                .group-members{
                    max-width: 125px;
                    overflow-x: auto;
                    flex-wrap: nowrap;
                }

                .selectors{
                    flex-direction: row;
                }
            }
        </style>
        
        <div id="subjects-div">
            <div class="vertical-tabs">
                <div class="selectors">
                    <span class="selector" id="accounts-selector" style="display: none;">
                        Account's <span class="counter" id="accounts-counter"></span>
                        <paper-ripple recenters=""></paper-ripple>
                    </span>
                    <span class="selector" id="groups-selector" style="display: none;">
                        Group's <span class="counter" id="groups-counter"></span>
                        <paper-ripple recenters=""></paper-ripple>
                    </span>
                    <span class="selector" id="organizations-selector" style="display: none;">
                        Organization's <span class="counter" id="organizations-counter"></span>
                        <paper-ripple  recenters=""></paper-ripple>
                    </span>
                    <span class="selector" id="applications-selector" style="display: none;">
                        Application's  <span class="counter" id="applications-counter"></span>
                        <paper-ripple  recenters=""></paper-ripple>
                    </span>
                </div>
                <div class="vertical-tab" id="accounts-tab">
                    <iron-collapse  id="accounts-collapse-panel" style="display: flex; flex-direction: column; width: 100%;">
                        <div class="subject-div" id="accounts-div">
                        </div>
                    </iron-collapse>
                </div>
                <div class="vertical-tab" id="groups-tab">
                    <iron-collapse id="groups-collapse-panel" style="display: flex; flex-direction: column; width: 100%;">
                        <div class="subject-div" id="groups-div">
                        </div>
                    </iron-collapse>
                </div>
                <div class="vertical-tab" id="organizations-tab">
                    <iron-collapse id="organizations-collapse-panel" style="display: flex; flex-direction: column; width: 100%;">
                        <div class="subject-div" id="organizations-div">
                        </div>
                    </iron-collapse>
                </div>
                <div class="vertical-tab" id="applications-tab">
                    <iron-collapse id="applications-collapse-panel" style="display: flex; flex-direction: column; width: 100%;">
                        <div class="subject-div" id="applications-div">
                        </div>
                    </iron-collapse>
                </div>
            </div>
        </div>
        `

        // Vertical tabs... (accordeon...)
        let accountsSelector = this.shadowRoot.querySelector("#accounts-selector")
        let accountsCount = this.shadowRoot.querySelector("#accounts-counter")
        let accountsDiv = this.shadowRoot.querySelector("#accounts-div")

        let groupsSelector = this.shadowRoot.querySelector("#groups-selector")
        let groupsCount = this.shadowRoot.querySelector("#groups-counter")
        let groupsDiv = this.shadowRoot.querySelector("#groups-div")

        let organizationsSelector = this.shadowRoot.querySelector("#organizations-selector")
        let organizationsCount = this.shadowRoot.querySelector("#organizations-counter")
        let organizationsDiv = this.shadowRoot.querySelector("#organizations-div")

        let applicationsSelector = this.shadowRoot.querySelector("#applications-selector")
        let applicationsCount = this.shadowRoot.querySelector("#applications-counter")
        let applicationsDiv = this.shadowRoot.querySelector("#applications-div")


        // Get collapse panel...
        let accounts_collapse_panel = this.shadowRoot.querySelector("#accounts-collapse-panel")
        let groups_collapse_panel = this.shadowRoot.querySelector("#groups-collapse-panel")
        let organizations_collapse_panel = this.shadowRoot.querySelector("#organizations-collapse-panel")
        let applications_collapse_panel = this.shadowRoot.querySelector("#applications-collapse-panel")

        // So here I will change the layout depending of the size.
        window.addEventListener('resize', () => {
            // set the postion to 0, 0
            let w = ApplicationView.layout.width();
            let accountsTab = this.shadowRoot.querySelector("#accounts-tab")
            let groupsTab = this.shadowRoot.querySelector("#groups-tab")
            let organizationsTab = this.shadowRoot.querySelector("#organizations-tab")
            let applicationTab = this.shadowRoot.querySelector("#applications-tab")
            let selectorsDiv = this.shadowRoot.querySelector(".selectors")

            if (w <= 500 ) {
                selectorsDiv.appendChild(accountsSelector)
                selectorsDiv.appendChild(groupsSelector)
                selectorsDiv.appendChild(organizationsSelector)
                selectorsDiv.appendChild(applicationsSelector)
            } else {
                accountsTab.insertBefore(accountsSelector, accountsTab.firstChild)
                groupsTab.insertBefore(groupsSelector, groupsTab.firstChild)
                organizationsTab.insertBefore(organizationsSelector, organizationsTab.firstChild)
                applicationTab.insertBefore(applicationsSelector, applicationTab.firstChild)
            }
        })

        accountsSelector.onclick = () => {
            accounts_collapse_panel.toggle();
            if (organizations_collapse_panel.opened) {
                organizations_collapse_panel.toggle()
            }
            if (applications_collapse_panel.opened) {
                applications_collapse_panel.toggle()
            }
            if (groups_collapse_panel.opened) {
                groups_collapse_panel.toggle()
            }
        }

        groupsSelector.onclick = () => {
            groups_collapse_panel.toggle();
            if (organizations_collapse_panel.opened) {
                organizations_collapse_panel.toggle()
            }
            if (applications_collapse_panel.opened) {
                applications_collapse_panel.toggle()
            }
            if (accounts_collapse_panel.opened) {
                accounts_collapse_panel.toggle()
            }
        }

        applicationsSelector.onclick = () => {
            applications_collapse_panel.toggle();
            if (organizations_collapse_panel.opened) {
                organizations_collapse_panel.toggle()
            }
            if (accounts_collapse_panel.opened) {
                accounts_collapse_panel.toggle()
            }
            if (groups_collapse_panel.opened) {
                groups_collapse_panel.toggle()
            }
        }

        organizationsSelector.onclick = () => {
            organizations_collapse_panel.toggle();
            if (accounts_collapse_panel.opened) {
                accounts_collapse_panel.toggle()
            }
            if (applications_collapse_panel.opened) {
                applications_collapse_panel.toggle()
            }
            if (groups_collapse_panel.opened) {
                groups_collapse_panel.toggle()
            }
        }

        // So here I will initialyse the list of accounts...
        Account.getAccounts("{}", accounts => {
            let range = document.createRange()
            let count = 0

            accounts.forEach(a => {
                accountsSelector.style.display = ""
                if (a.id != "sa" && a.id != this.account.getId()) {
                    let uuid = "_" + getUuidByString(a.id + "@" + a.domain)
                    let html = `
                        <div id="${uuid}" class="infos">
                            <img style="width: 32px; height: 32px; display: ${a.profile_picture.length == 0 ? "none" : "block"};" src="${a.profile_picture}"></img>
                            <iron-icon icon="account-circle" style="width: 32px; height: 32px; --iron-icon-fill-color:var(--palette-action-disabled); display: ${a.profile_picture.length > 0 ? "none" : "block"};"></iron-icon>
                            <span>${a.id}</span>
                        </div>
                        `
                    let fragment = range.createContextualFragment(html)
                    accountsDiv.appendChild(fragment)

                    let accountDiv = accountsDiv.querySelector(`#${uuid}`)
                    accountDiv.onclick = () => {
                        // So here I will remove all active....
                        let infos = this.shadowRoot.querySelectorAll(".infos")
                        for (var i = 0; i < infos.length; i++) {
                            infos[i].classList.remove("active")
                        }

                        accountDiv.classList.add("active")

                        if (this.on_account_click) {
                            // return the account and the div.
                            if (this.on_account_click) {
                                if (accountsDiv.querySelector(`#${uuid}`)) {
                                    this.on_account_click(accountDiv, a)
                                    accountsCount.innerHTML = `(${accountsDiv.children.length})`
                                } else {
                                    // Here the div was remove from the list and so I will simply put it back...
                                    accountsDiv.appendChild(accountDiv)
                                    accountsCount.innerHTML = `(${accountsDiv.children.length})`
                                }

                                // fire the account change event...
                                if (this.on_accounts_change) {
                                    this.on_accounts_change()
                                }
                            }
                        }
                    }

                    count++
                }
            })

            accountsCount.innerHTML = `(${count})`

            accountsSelector.click() // display list of account'(s)


        }, err => {displayMessage("fail to retreive accounts with error: ", err); console.log("1666---------->", err)})

        // Now the groups.
        Group.getGroups(groups => {
            let range = document.createRange()
            groupsCount.innerHTML = `(${groups.length})`
            // init groups...
            let getGroup = (index) => {
                let g = groups[index]
                if (g) {
                    groupsSelector.style.display = ""
                    let group_uuid = "_" + getUuidByString(g.id + "@" + g.domain)
                    let html = `
                        <div id="${group_uuid}" class="infos" style="flex-direction: column;">
                            <div style="display: flex; align-self: flex-start; align-items: center;">
                                <iron-icon class="Contacts_icon" icon="social:people" style="padding-right: 10px;"></iron-icon>
                                <div style="display: flex; flex-direction: column;">
                                    <span>${g.getName()}</span>
                                    <span style="font-size: .85rem;">${g.getDomain()}</span>
                                </div>
                            </div>
                        `

                    g.getMembers(members => {
                        html += `<div class="group-members" style="display: flex;">`
                        members.forEach(a => {
                            let uuid = "_" + getUuidByString(a.getId() + "@" + a.getDomain())
                            html += `
                            <div id="${uuid}" class="infos">
                                <img style="width: 32px; height: 32px; display: ${a.profile_picture.length == 0 ? "none" : "block"};" src="${a.profile_picture}"></img>
                                <iron-icon icon="account-circle" style="width: 32px; height: 32px; --iron-icon-fill-color:var(--palette-action-disabled); display: ${a.profile_picture.length > 0 ? "none" : "block"};"></iron-icon>
                                <span>${a.name}</span>
                            </div>
                            `
                        })

                        html += "</div>"
                        html += "</div>"

                        groupsDiv.appendChild(range.createContextualFragment(html))

                        let groupDiv = groupsDiv.querySelector("#" + group_uuid)

                        groupDiv.onclick = (evt) => {

                            evt.stopPropagation()

                            let infos = this.shadowRoot.querySelectorAll(".infos")
                            for (var i = 0; i < infos.length; i++) {
                                infos[i].classList.remove("active")
                            }

                            groupDiv.classList.add("active")

                            if (this.on_group_click) {
                                if (groupsDiv.querySelector(`#${group_uuid}`)) {
                                    this.on_group_click(groupDiv, g)
                                    groupsCount.innerHTML = `(${groupsDiv.children.length})`
                                } else {
                                    // Here the div was remove from the list and so I will simply put it back...
                                    groupsDiv.appendChild(groupDiv)
                                    groupsCount.innerHTML = `(${groupsDiv.children.length})`
                                }
                            }
                            // fire the account change event...
                            if (this.on_groups_change) {
                                this.on_groups_change()
                            }
                        }

                        index++
                        if (index < groups.length) {
                            getGroup(index)
                        }

                    })
                }
            }

            let index = 0;
            getGroup(index)
        }, err => displayError(err, 3000);)

        // TODO the applications and the organizations
        fireResize()
    }

}

customElements.define('globular-subjects-view', GlobularSubjectsView)

