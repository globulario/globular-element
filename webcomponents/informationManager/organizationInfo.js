
/**
 * Display basic organization informations.
 */
export class OrganizationInfo extends HTMLElement {

    // Create the applicaiton view.
    constructor(org) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           

            #container {
                display: flex;
                /*background-color: var(--surface-color);*/
                color: var(--primary-text-color);
            }

        </style>
        <div id="container">
            <div>
                <iron-icon id="icon" icon="social:domain" style="height: 40px; width: 40px; padding-left: 15px;"></iron-icon>
            </div>
            <div style="display: table; flex-grow: 1; padding-left: 20px;">
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Id:</div>
                    <div style="display: table-cell;">${org.getId()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Name:</div>
                    <div style="display: table-cell;">${org.getName()}</div>
                </div>

                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Accounts:</div>
                    <div style="display: table-cell;">${listToString(org.getAccountsList())}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Groups:</div>
                    <div style="display: table-cell;">${listToString(org.getGroupsList())}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Roles:</div>
                    <div style="display: table-cell;">${listToString(org.getRolesList())}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Applications:</div>
                    <div style="display: table-cell;">${listToString(org.getApplicationsList())}</div>
                </div>
            </div>
        </div>
        `
    }

}

customElements.define('globular-organization-info', OrganizationInfo)

