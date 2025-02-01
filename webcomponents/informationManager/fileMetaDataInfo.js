
/**
 * That panel will display the file Metadata information.
 */
export class FileMetaDataInfo extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
            #container{
                display: table;
                flex-grow: 1; 
                border-collapse: collapse;
                width: 100%;
            }

            .label{
                display: table-cell;
            }

            .value{
                display: table-cell;
            }

        </style>
        <div id="container">
            <div style="display: flex;  border-bottom: 1px solid var(--palette-divider);  margin-bottom: 10px; align-items: center;">
                <paper-icon-button id="collapse-btn"  icon="unfold-less" --iron-icon-fill-color:var(--primary-text-color);"></paper-icon-button>
                <div id="header-text" class="label" style="flex-grow: 1;"></div>
            </div>
            <iron-collapse class="" id="collapse-panel">
                <slot></slot>
            </iron-collapse>
        </div>
        `
        // give the focus to the input.
        let container = this.shadowRoot.querySelector("#container")
        let collapse_btn = container.querySelector("#collapse-btn")

        let collapse_panel = container.querySelector("#collapse-panel")
        collapse_btn.onclick = () => {
            if (!collapse_panel.opened) {
                collapse_btn.icon = "unfold-more"
            } else {
                collapse_btn.icon = "unfold-less"
            }
            collapse_panel.toggle();
        }

    }

    // Call search event.
    setMetadata(metadata) {

        this.shadowRoot.querySelector("#header-text").innerHTML = `(${Object.keys(metadata).length})`
        let range = document.createRange()
        for (var id in metadata) {
            let value = metadata[id]
            let label = id.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            let result = {}
            let html = `
                <div  style="display: table-row; padding-top: 5px; padding-bottom: 5px; border-bottom: 1px solid var(--palette-divider); width:100%;">
                    <div class="label" style="display: table-cell; min-width: 200px;">${label}</div>
                    <div id="${id}" class="value" style="display: table-cell; width: 100%;"></div>
                </div>
            `

            if (id == "Comment") {
                // the comment is use to store video metadata...
                try {
                    if (typeof value === 'string') {
                        result = JSON.parse(atob(value))
                    } else {
                        result = JSON.parse(atob(value.stringValue))
                    }
                } catch (e) {
                    console.log(e)
                }

                if(result["Description"]){
                    value = result["Description"]
                }
            }

            this.appendChild(range.createContextualFragment(html))
            let div = this.querySelector(`#${id}`)
            this.setValue(div, value)
        }
    }

    // display the value.
    setValue(div, value) {
        div.innerHTML = value
    }
}

customElements.define('globular-file-metadata-info', FileMetaDataInfo)
