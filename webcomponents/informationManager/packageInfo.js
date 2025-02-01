
/**
 * Display package informations.
 */
export class PackageInfo extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(descriptor) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        let packageType = "Application Package"
        if (descriptor.getType() == 1) {
            packageType = "Service Package"
        }

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
            <div style="display: flex; flex-direction: column; justify-content: flex-start;  padding-left: 15px;">
                <iron-icon id="icon" icon="icons:archive" style="height: 40px; width: 40px;"></iron-icon>
                <span style="font-weight: 450;">${packageType}</span>
            </div>
            <div style="display: table; flex-grow: 1; padding-left: 20px;">
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Id:</div>
                    <div style="display: table-cell;">${descriptor.getId()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Name:</div>
                    <div style="display: table-cell;">${descriptor.getName()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Version:</div>
                    <div style="display: table-cell;">${descriptor.getVersion()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Publisher Id:</div>
                    <div style="display: table-cell;">${descriptor.getPublisherid()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Description:</div>
                    <div style="display: table-cell;">${descriptor.getDescription()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Keywords:</div>
                    <div style="display: table-cell;">${listToString(descriptor.getKeywordsList())}</div>
                </div>
            </div>
        </div>
        `
    }

}

customElements.define('globular-package-info', PackageInfo)

