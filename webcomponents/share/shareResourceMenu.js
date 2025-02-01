import { ShareResourceWizard } from "./shareResourceWizard";

/**
 * create a new permission for a given resource.
 */
export class ShareResourceMenu extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(view) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // the view where the menu is displayed.
        this.view = view;

        this.files = [];

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container{

            }

            #share-resource-btn {
                height: 18px;
            }

            #share-resource-btn:hover{
                cursor: pointer;
            }

        </style>
        <div id="container">
            <iron-icon id="share-resource-btn" icon="social:share">
            </iron-icon>
        </div>
        `
        // give the focus to the input.
        this.shadowRoot.querySelector("#share-resource-btn").onclick = (evt) => {
            evt.stopPropagation();

            this.share()
        }

    }

    setFiles(files) {
        this.files = files;
    }

    share() {
        let shareResourceWizard = new ShareResourceWizard(this.files, this.view);

        shareResourceWizard.show()

    }
}

customElements.define('globular-share-resource-menu', ShareResourceMenu)
