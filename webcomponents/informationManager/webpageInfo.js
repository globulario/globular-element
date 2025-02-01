/**
 * Display webpage information.
 */
export class WebpageInfo extends HTMLElement {

    // Create the applicaiton view.
    constructor(webpage) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           

            #container {
                display: flex;
                postion:relative;
                /*background-color: var(--surface-color)*/;
                color: var(--primary-text-color);
            }

            .image-box {
                width: 120px;
                max-height: 120px;
                overflow: hidden;
                height: auto;
                
            }

            .image-box img {
                width: 100%;

                -o-object-fit: cover;
                object-fit: cover;
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
             
            .image-box:hover{
                overflow: auto;
                width: 65%;
                max-height: calc(100vh - 85px);
                position:fixed;
                top: 75px;
                left: calc(-50vw + 50%);
                right: calc(-50vw + 50%);
                margin-left: auto;
                margin-right: auto;
                -webkit-box-shadow: var(--dark-mode-shadow);
                -moz-box-shadow: var(--dark-mode-shadow);
                box-shadow: var(--dark-mode-shadow);
            }

        </style>
        <div id="container">
            <div class="image-box">
                <img src="${webpage.thumbnail}"></img>
            </div>
            <div style="display: table; flex-grow: 1; padding-left: 20px;">
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Id:</div>
                    <div style="display: table-cell;">${webpage._id}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Name:</div>
                    <div style="display: table-cell;">${webpage.name}</div>
                </div>
            </div>
        </div>
        `
    }

}

customElements.define('globular-webpage-info', WebpageInfo)

