import { SharedResources } from './sharedResources.js'


export class SharePanel extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(account) {
        super()

        // keep local account in memory...
        this.account = account;

        // the file explorer.
        this._file_explorer_ = null;

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container {
                background-color: var(--surface-color);
                font-size: 1.65rem;
                display: flex;
                height: 100%;
                width: 100%;
            }

            #share_div{
                display: flex;
                padding-left: 10px;
                height: calc(100% - 100px);
                flex-grow: 1;
            }

            #share_content_div{
                min-width: 728px;
                max-width: 728px;
                width: 728px;
            }

            #title_div{
                display: flex;
                flex-wrap: wrap;
            }

            h1{
                margin: 0px; 
                margin-left: 10px;
                font-size: 1.25rem;
                flex-grow: 1;
            }

            ::slotted(globular-shared-resources){
                flex-grow: 1;
            }

            paper-card h1 {
                font-size: 1.65rem;
            }

            globular-subjects-view{
                border-right: 1px solid var(--palette-divider);
            }

            .card-content{
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                padding: 0px;
                padding-bottom: 10px;
                font-size: 1rem;
              }
      
              @media (max-width: 500px) {
                .card-content{
                   width: calc(100vw - 10px);
                }

                #share_div{
                    padding: 0px;
                    flex-direction: column;
                    flex-grow: 1;
                }

                #share_content_div{
                    min-width: auto;
                    width: 100%;
                    height: 100%;
                }

                globular-subjects-view{
                    border-right: none;
                }
    

              }

        </style>
        <div id="container">
            <div class="card-content">
                <div style="display: flex; justify-content: center;">
                    <h1 style="flex-grow: 1;">Shared Resources...</h1>
                    <paper-icon-button id="close-btn" icon="icons:close"></paper-icon-button>
                </div>
                <div id="share_div">
                    <globular-subjects-view></globular-subjects-view>
                    <div id="share_content_div">
                        <slot></slot>
                    </div>
                </div>

            </div>
        </div>
        `

        this.onclose = null

        // simply close the watching content...
        this.shadowRoot.querySelector("#close-btn").onclick = () => {
            this.parentNode.removeChild(this)
            if (this.onclose != null) {
                this.onclose()
            }
        }


    }

    connectedCallback() {

        let subjectsView = this.shadowRoot.querySelector("globular-subjects-view")

        // Append account 
        subjectsView.on_account_click = (accountDiv, account) => {
            accountDiv.account = account;

            this.displaySharedResources(account)
        }

        // Append group
        subjectsView.on_group_click = (groupDiv, group) => {
            groupDiv.group = group;
            this.displaySharedResources(group)
        }
    }

    // Display resource shared with a given subject.
    displaySharedResources(subject) {
        this.innerHTML = "" // clear the slot...
        let sharedResources = new SharedResources(subject)
        sharedResources._file_explorer_ = this._file_explorer_
        this.appendChild(sharedResources)
    }

}

customElements.define('globular-share-panel', SharePanel)
