export class GlobularSubjectsSelected extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
    }

    // The connection callback.
    connectedCallback() {

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

            #container{
                display: flex;
                flex-direction: column;
            }

            .infos {
                margin: 2px;
                padding: 4px;
                display: flex;
                flex-direction: column;
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
            }

            .infos span{
                font-size: 1rem;
            }

            .infos:hover{
                -webkit-filter: invert(10%);
                filter: invert(10%);
                cursor: pointer;
            }


            .group-members .infos{
                flex-direction: column;
            }

            .group-members .infos:hover{
                -webkit-filter: invert(0%);
                filter: invert(0%);
                cursor: default;
            }

            .group-members .infos img{
                max-height: 32px;
                max-width: 32px;
                border-radius: 16px;
            }


        </style>
        <div id="container">
            <div style="display: flex; flex-direction: column;">
                <span>Choose who to share with...</span>
                <div id="accounts-div" style="display: flex; flex-wrap: wrap; margin-top: 20px;"></div>
                <div id="groups-div" style="display: flex; flex-wrap: wrap; margin-top: 20px;"></div>
            </div>
        </div>
        `
        // give the focus to the input.
        let container = this.shadowRoot.querySelector("#container")

    }

    // Call search event.
    appendAccount(accountDiv) {
        this.shadowRoot.querySelector("#accounts-div").appendChild(accountDiv)
    }

    // Return the list of accounts.
    getAccounts() {
        let accounts = []
        for (var i = 0; i < this.shadowRoot.querySelector("#accounts-div").children.length; i++) {
            let accountDiv = this.shadowRoot.querySelector("#accounts-div").children[i]
            accounts.push(accountDiv.account)
        }

        return accounts;
    }

    // Return the list of groups
    getGroups() {
        let groups = []
        for (var i = 0; i < this.shadowRoot.querySelector("#groups-div").children.length; i++) {
            let groupDiv = this.shadowRoot.querySelector("#groups-div").children[i]
            groups.push(groupDiv.group)
        }

        return groups;
    }

    appendGroup(groupDiv) {
        this.shadowRoot.querySelector("#groups-div").appendChild(groupDiv)
    }
}

customElements.define('globular-subjects-selected', GlobularSubjectsSelected)

