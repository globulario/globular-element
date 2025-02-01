export class ShareMenu extends Menu {

    // Create the application view.
    constructor() {
        super("share", "social:share", "Share")

        // The panel to manage shared content.
        this.sharePanel = null;

        this.onclick = () => {
            let icon = this.getIconDiv().querySelector("iron-icon")
            icon.style.removeProperty("--iron-icon-fill-color")
            if (this.sharePanel.parentNode == undefined) {
                Backend.eventHub.publish("_display_workspace_content_event_", this.sharePanel, true)
            }

        }

    }

    // Initialyse the share panel.
    init(account) {

        if (this.sharePanel == null) {
            this.account = account;
            // init once...
            this.sharePanel = new SharePanel(account);
        }
    }
}

customElements.define('globular-share-menu', ShareMenu)
