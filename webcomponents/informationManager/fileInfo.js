import { GetFileMetadataRequest } from "globular-web-client/file/file_pb";
import { displayError, getFileSizeString } from "../utility";
import { generatePeerToken } from "../../backend/backend";
import "./fileMetaDataInfo.js"

/**
 * Display basic file informations.
 */
export class FileInfo extends HTMLElement {

    // Create the applicaiton view.
    constructor(file) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        let mime = file.getMime()

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           

            #container {
                display: flex;
                background-color: var(--surface-color);
                color: var(--primary-text-color);
            }

        </style>
        <div id="container">
            <div>
                <img style="max-height: 180px;" src="${file.getThumbnail()}"></img>
            </div>
            <div style="display: table; flex-grow: 1; padding-left: 20px;">
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Name:</div>
                    <div style="display: table-cell;">${file.getName()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Type:</div>
                    <div style="display: table-cell;">${mime}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Location:</div>
                    <div style="display: table-cell;">${file.getPath()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Modified:</div>
                    <div style="display: table-cell;">${file.getModeTime()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Size:</div>
                    <div style="display: table-cell;">${getFileSizeString(file.getSize())}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Checksum:</div>
                    <div style="display: table-cell;">${file.getChecksum()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Metadata:</div>
                    <div style="display: table-cell;">
                        <globular-file-metadata-info></globular-file-metadata-info>
                    </div>
                </div>
            </div>
        </div>
        `

        let metadata_editor = this.shadowRoot.querySelector("globular-file-metadata-info")

        let globule = file.globule
        let rqst = new GetFileMetadataRequest
        rqst.setPath(file.getPath())
        generatePeerToken(globule, token => {
            globule.fileService.getFileMetadata(rqst, { token: token, domain: globule.domain })
                .then(rsp => {

                    metadata_editor.setMetadata(rsp.getResult().toJavaScript())
                })
                .catch(err => displayError(err))
        })

    }


}

customElements.define('globular-file-info', FileInfo)
