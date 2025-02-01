/**
 * Display basic file informations.
 */
export class GroupInfo extends HTMLElement {

    // Create the applicaiton view.
    constructor(group) {
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
                <iron-icon id="icon" icon="social:people" style="height: 40px; width: 40px; padding-left: 15px;"></iron-icon>
            </div>
            <div style="display: table; flex-grow: 1; padding-left: 20px;">
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Id:</div>
                    <div style="display: table-cell;">${group.id}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Name:</div>
                    <div style="display: table-cell;">${group.name}</div>
                </div>

                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Members:</div>
                    <div style="display: table-cell;">${listToString(group.members)}</div>
                </div>
            </div>
        </div>
        `
    }

}

customElements.define('globular-group-info', GroupInfo)
