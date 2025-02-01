
/**
 * Display basic blog informations.
 */
export class DomainInfo extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(domain) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           

            #container {
                display: flex;
            }

        </style>
        <div id="container">
            <div>
                <iron-icon id="icon" icon="social:domain" style="height: 40px; width: 40px; padding-left: 15px;"></iron-icon>
            </div>
            <div style="display: table; flex-grow: 1; padding-left: 20px;">
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Name:</div>
                    <div style="display: table-cell;">${domain.name}</div>
                </div>
            </div>
        </div>
        `
    }

}

customElements.define('globular-domain-info', DomainInfo)