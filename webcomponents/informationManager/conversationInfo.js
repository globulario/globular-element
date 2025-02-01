
/**
 * Display basic blog informations.
 */
export class ConversationInfo extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(conversation) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        let creationTime = new Date(conversation.getCreationTime() * 1000)
        let lastMessageTime = new Date(conversation.getLastMessageTime() * 1000)

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           

            #container {
                display: flex;
            }

        </style>
        <div id="container">
            <div>
                <iron-icon id="icon" icon="communication:forum" style="height: 40px; width: 40px; padding-left: 15px;"></iron-icon>
            </div>
            <div style="display: table; flex-grow: 1; padding-left: 20px;">
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Id:</div>
                    <div style="display: table-cell;">${conversation.getUuid()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Name:</div>
                    <div style="display: table-cell;">${conversation.getName()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Creation time:</div>
                    <div style="display: table-cell;">${creationTime.toLocaleString()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Last message time:</div>
                    <div style="display: table-cell;">${lastMessageTime.toLocaleString()}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Keywords:</div>
                    <div style="display: table-cell;">${listToString(conversation.getKeywordsList())}</div>
                </div>
                <div style="display: table-row;">
                    <div style="display: table-cell; font-weight: 450;">Paticipants:</div>
                    <div style="display: table-cell;">${listToString(conversation.getParticipantsList())}</div>
                </div>
            </div>
        </div>
        `
    }

}

customElements.define('globular-conversation-info', ConversationInfo)
