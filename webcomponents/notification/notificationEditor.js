

export class NotificationEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.accounts = {};

        this.shadowRoot.innerHTML = `
        <style>
            #container {
                position: fixed;
                background: var(--palette-background-default); 
                border-top: 1px solid var(--palette-divider);
                border-left: 1px solid var(--palette-divider);
            }
            .header {
                display: flex;
                align-items: center;
                color: var(--palette-text-accent);
                background-color: var(--palette-primary-accent);
            }
            .header span {
                flex-grow: 1;
                text-align: center;
                font-size: 1.1rem;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: calc(100vw - 50px);
            }
            ::-webkit-scrollbar {
                width: 5px;
                height: 5px;
            }
            ::-webkit-scrollbar-track {
                background: var(--palette-background-default);
            }
            ::-webkit-scrollbar-thumb {
                background: var(--palette-divider);
            }
            #content {
                display: flex;
                background: var(--palette-background-paper);
                color: var(--palette-text-primary);
                height: calc(100% - 40px);
                font-size: 1.1rem;
                overflow: hidden;
            }
            globular-subjects-view {
                border-right: 1px solid var(--palette-divider);
                min-width: 250px;
            }
            #sub-content {
                display: flex;
                flex-direction: column;
                width: 100%;
                flex-grow: 1;
            }
            @media (max-width: 500px) {
                #content { flex-direction: column; }
                #sub-content { margin-bottom: 50px; }
            }
        </style>
        <paper-card id="container">
            <div class="header">
                <span id="handle">Notification</span>
                <paper-icon-button id="close-btn" icon="icons:close"></paper-icon-button>
            </div>
            <div id="content">
                <globular-subjects-view></globular-subjects-view>
                <div id="sub-content">
                    <globular-subjects-selected></globular-subjects-selected>
                    <iron-autogrow-textarea id="text-writer-box"></iron-autogrow-textarea>
                    <paper-icon-button id="send-btn" icon="send"></paper-icon-button>
                </div>
            </div>
        </paper-card>`;

        this.container = this.shadowRoot.querySelector("#container");
        this.msgBox = this.shadowRoot.querySelector("#text-writer-box");
        this.sendBtn = this.shadowRoot.querySelector("#send-btn");
        this.sendBtn.onclick = () => this.sendNotification();
        this.shadowRoot.querySelector("#close-btn").onclick = () => this.remove();
        this.container.name = "notification_editor";
        this.setupDraggable();
        this.setupResizable();
        this.setupSubjects();
    }

    sendNotification() {
        this.getAccounts((accounts) => {
            Object.values(accounts).forEach((account) => {
                const rqst = new resource_pb.CreateNotificationRqst();
                const notification = new resource_pb.Notification();
                notification.setDate(Math.floor(Date.now() / 1000));
                notification.setId(randomUUID());
                notification.setNotificationType(resource_pb.NotificationType.USER_NOTIFICATION);
                notification.setMessage(this.msgBox.value);
                notification.setSender(`${Application.account.id}@${Application.account.domain}`);
                notification.setRecipient(`${account.id}@${account.domain}`);
                notification.setMac(Model.getGlobule(account.domain).config.Mac);
                rqst.setNotification(notification);

                const globule = Model.getGlobule(account.domain);
                generatePeerToken(globule, (token) => {
                    globule.resourceService.createNotification(rqst, {
                        token,
                        application: Model.application,
                        domain: globule.domain,
                        address: Model.address,
                    }).then(() => {
                        const notificationEvent = {
                            id: notification.getId(),
                            date: new Date(),
                            sender: notification.getSender(),
                            recipient: notification.getRecipient(),
                            text: notification.getMessage(),
                            type: 0,
                            mac: Model.getGlobule(account.domain).config.Mac,
                        };
                        globule.eventHub.publish(`${account.id}@${account.domain}_notification_event`, JSON.stringify(notificationEvent), false);
                    }).catch((err) => ApplicationView.displayMessage(err, 3000));
                });
            });
            ApplicationView.displayMessage(`<div style="display: flex;"><iron-icon icon="send"></iron-icon><span style="margin-left: 20px;">Notification was sent...</span></div>`, 3000);
            this.remove();
        });
    }

    getAccounts(callback) {
        let accounts = {};
        this.selectedSubjects.getAccounts().forEach((a) => accounts[a.id] = a);
        const groups = this.selectedSubjects.getGroups();
        if (groups.length > 0) {
            let pending = groups.length;
            groups.forEach((g) => {
                g.members.forEach((m) => {
                    Account.getAccount(m, (a) => {
                        accounts[a.id] = a;
                        if (--pending === 0) callback(accounts);
                    }, () => {
                        if (--pending === 0) callback(accounts);
                    });
                });
            });
        } else {
            callback(accounts);
        }
    }

    setupDraggable() {
        setMoveable(this.shadowRoot.querySelector("#handle"), this.container, () => { }, this, 64);
    }

    setupResizable() {
        setResizeable(this.container, (width, height) => {
            height = Math.max(height, 400);
            width = Math.max(width, 600);
            localStorage.setItem("__notification_editor_dimension__", JSON.stringify({ width, height }));
            this.container.style.width = width + "px";
            this.container.style.height = height + "px";
        });
    }

    setupSubjects() {
        const subjectsView = this.shadowRoot.querySelector("globular-subjects-view");
        this.selectedSubjects = this.shadowRoot.querySelector("globular-subjects-selected");
        subjectsView.on_account_click = (accountDiv, account) => this.selectedSubjects.appendAccount(accountDiv);
        subjectsView.on_group_click = (groupDiv, group) => this.selectedSubjects.appendGroup(groupDiv);
    }
}

customElements.define('globular-notification-editor', NotificationEditor);
