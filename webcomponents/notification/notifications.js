import { Backend, displayError, displayMessage, generatePeerToken } from "../../backend/backend";
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-icons/social-icons.js';

import { ClearNotificationsByTypeRqst, Notification, NotificationType } from "globular-web-client/resource/resource_pb";
import { AccountController } from "../../backend/account";
import { NotificationEditor } from "./notificationEditor";
import { NotificationController } from "../../backend/notification";
/**
 * @fileoverview This file contains the Notifications class.
 */
export class NotificationsPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
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

        #notifications {
          display: flex;
          flex-direction: column;
          position: absolute;
          top: 70px;
          right: 10px;
          z-index: 1000;

        }

        #notification-create-btn {
          flex-grow: 1;
        }

        #application-notifications #user-notifications {
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          min-width: 375px;
          position: relative;
          font-size: 12pt;
          align-items: center;
          padding: .5rem;
          background-color: var(--surface-color);
          color: var(--on-surface-color);
        }

        .header paper-icon-button {
          min-width: 40px;
        }

        .header:hover {
          cursor: pointer;
        }

        .body {
          min-width: 375px;
          min-height: 100px;
          max-height: 30rem;
          overflow-y: auto;
        }

        .btn_div {
          display: flex;
          flex-grow: 1;
          justify-content: flex-end;
        }

        .btn_ {
          position: relative;
        }

        .btn_:hover {
          cursor: pointer;
        }

        iron-collapse {
          border-bottom: 1px solid var(--palette-action-disabled);
          border-top: 1px solid var(--palette-action-disabled);
        }

        .notification_panel {
          display: flex;
          padding: .75rem;
          font-size: 12pt;
          transition: background 0.2s ease, padding 0.8s linear;
          background-color: var(--surface-color);
          color: var(--on-surface-color);
          border-bottom: 1px solid var(--palette-action-disabled);
        }

        .notification_panel img {
          height: 48px;
          width: 48px;
          border-radius: 24px;
          filter: invert(0%);
        }

        .notification_panel:hover {
          filter: invert(10%);
        }

        #user-notifications-btn {
          display: flex;
          position: relative;
        }

        #user-notifications-btn span {
          flex-grow: 1;
        }

        #content {
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        paper-button {
          font-size: .85rem;
          font-weight: 350;
        }

        @media (max-width: 500px) {
          #content {
            width: calc(100vw - 20px);
            margin-top: 10px;
          }

          .header {
            min-width: 0px;
            width: calc(100vw - 20px);
            padding: 0px;
          }

          .notification-label, .btn_ {
            padding: .5rem;
          }

          .body {
            min-width: 0px;
            max-height: calc(100vh - 160px);
          }
        }
      </style>
      <paper-card id="notifications" >
        <div id="content">
          <div class="header" style="border-bottom: 1px solid var(--palette-action-disabled);">
            <div class="notification-label">Notifications</div>
            <div class="btn_div">
              <div class="btn_">
                <iron-icon id="notification-create-btn" icon="icons:add"></iron-icon>
                <paper-ripple class="circle" recenters></paper-ripple>
              </div>
            </div>
          </div>

          <div id="application-notifications" style="display: none;">
            <div class="header" id="application-notifications-btn">
              <span class="notification-label">Application</span>
              <paper-ripple recenters></paper-ripple>
            </div>
            <iron-collapse id="application-notifications-collapse" opened="[[opened]]">
              <div id="application-notifications-panel" class="body"></div>
            </iron-collapse>
          </div>

          <div id="user-notifications" style="display: none;">
            <div class="header" id="user-notifications-btn">
              <span class="notification-label">User</span>
              <paper-button id="clear-user-notifications-btn">Clear</paper-button>
              <paper-ripple recenters></paper-ripple>
            </div>
            <iron-collapse id="user-notifications-collapse" style="">
              <div id="user-notifications-panel" class="body"></div>
            </iron-collapse>
          </div>
        </div>
      </paper-card>
    `;

    this.shadowRoot.querySelector("#clear-user-notifications-btn").addEventListener('click', (evt) => {
      evt.stopPropagation();

      let toast = displayMessage(
        `
        <style>
          #yes-no-notification-delete-box {
            display: flex;
            flex-direction: column;
          }

          #yes-no-notification-delete-box globular-notification-card {
            padding-bottom: 10px;
          }

          #yes-no-notification-delete-box div {
            display: flex;
            padding-bottom: 10px;
          }
        </style>
        <div id="yes-no-notification-delete-box">
          <div>You're about to delete all user notifications</div>
          <div>Is this what you want to do?</div>
          <div style="justify-content: flex-end;">
            <paper-button raised id="yes-delete-notification">Yes</paper-button>
            <paper-button raised id="no-delete-notification">No</paper-button>
          </div>
        </div>
        `,
        15000 // 15 sec...
      );

      let yesBtn = toast.toastElement.querySelector("#yes-delete-notification");
      let noBtn = toast.toastElement.querySelector("#no-delete-notification");

      yesBtn.addEventListener('click', () => {
        let rqst = new ClearNotificationsByTypeRqst();
        rqst.setNotificationType(NotificationType.USER_NOTIFICATION);
        rqst.setRecipient(AccountController.account.getId() + "@" + AccountController.account.getDomain());

        let globule = Backend.getGlobule(AccountController.account.getDomain());
        generatePeerToken(globule, token => {
          globule.resourceService.clearNotificationsByType(rqst, {
            token: token,
            domain: globule.domain,
            address: Backend.address
          }).then((rsp) => {
            displayMessage(
              "<iron-icon icon='icons:delete' style='margin-right: 10px;'></iron-icon><div>All user notifications were removed</div>",
              3000
            );
          }).catch(err => displayError(err, 3000));
        });

        toast.hideToast();
      });

      noBtn.addEventListener('click', () => {
        toast.hideToast();
      });
    });

    this.applicationNotificationsDiv = this.shadowRoot.getElementById("application-notifications");
    this.userNotificationsDiv = this.shadowRoot.getElementById("user-notifications");
    this.userNotificationsBtn = this.shadowRoot.getElementById("user-notifications-btn");
    this.applicationNotificationBtn = this.shadowRoot.getElementById("application-notifications-btn");
    this.userNotificationsCollapse = this.shadowRoot.getElementById("user-notifications-collapse");
    this.applicationNotificationsCollapse = this.shadowRoot.getElementById("application-notifications-collapse");
    this.applicationNotificationsPanel = this.shadowRoot.getElementById("application-notifications-panel");
    this.userNotificationsPanel = this.shadowRoot.getElementById("user-notifications-panel");
    this.notificationCreateBtn = this.shadowRoot.getElementById("notification-create-btn");

    this.notificationCreateBtn.addEventListener('click', () => {
      let notificationEditor = new NotificationEditor();
      document.body.appendChild(notificationEditor);
      this.shadowRoot.appendChild(this.getMenuDiv());
    });

    this.userNotificationsBtn.addEventListener('click', () => {
      this.userNotificationsCollapse.toggle();
      if (this.applicationNotificationsCollapse.opened) {
        this.applicationNotificationsCollapse.toggle();
      }
      this.userNotificationsBtn.style.borderTop = this.userNotificationsCollapse.opened ? "1px solid var(--palette-action-disabled)" : "";
    });

    this.applicationNotificationBtn.addEventListener('click', () => {
      this.applicationNotificationsCollapse.toggle();
      if (this.userNotificationsCollapse.opened) {
        this.userNotificationsCollapse.toggle();
      }
      this.userNotificationsBtn.style.borderTop = this.userNotificationsCollapse.opened ? "1px solid var(--palette-action-disabled)" : "";
    });

  }

  init() {
    Backend.eventHub.subscribe("logout_event",
      (uuid) => { },
      (account) => {
        this.clearUserNotifications();
        Backend.eventHub.unSubscribe(account.getId() + "@" + account.getDomain() + "_notification_event", this.account_notification_listener);
      }, true, this);

    Backend.eventHub.subscribe("set_application_notifications_event",
      (uuid) => { },
      (notifications) => {
        this.setApplicationNofications(notifications);
      }, true, this);

    Backend.eventHub.subscribe("set_user_notifications_event",
      (uuid) => { },
      (notifications) => {
        this.setUserNofications(notifications);
      }, true, this);

    Backend.eventHub.subscribe(Backend.application + "_notification_event",
      (uuid) => { },
      (evt) => {
        let notification = Notification.deserializeBinary(Uint8Array.from(evt.split(",")));
        this.appendNofication(this.applicationNotificationsPanel, notification);
        if (!this.applicationNotificationsCollapse.opened) {
          this.applicationNotificationsCollapse.toggle();
        }
      }, false, this);

    Backend.getGlobule(AccountController.account.getDomain()).eventHub.subscribe(AccountController.account.getId() + "@" + AccountController.account.getDomain() + "_notification_event",
      (uuid) => {
        this.account_notification_listener = uuid;
      },
      (evt) => {
        let notification = Notification.deserializeBinary(Uint8Array.from(evt.split(",")));
        this.appendNofication(this.userNotificationsPanel, notification);
        if (!this.userNotificationsCollapse.opened) {
          this.userNotificationsCollapse.toggle();
        }
      }, false);

    Backend.getGlobule(AccountController.account.getDomain()).eventHub.subscribe(AccountController.account.getId() + "@" + AccountController.account.getDomain() + "_clear_user_notifications_evt",
      (uuid) => { },
      (evt) => {
        this.userNotificationsPanel.innerHTML = "";
        this.userNotificationsDiv.style.display = "none";
      }, false);



    NotificationController.initNotifications();
  }

  setUserNofications(notifications) {
    for (let notification of notifications) {
      this.appendNofication(this.userNotificationsPanel, notification);
    }
    if (notifications.length > 0) {
      this.userNotificationsCollapse.toggle();
    }
  }

  clearUserNotifications() {
    this.userNotificationsPanel.innerHTML = "";
  }

  setApplicationNofications(notifications) {
    for (let notification of notifications) {
      this.appendNofication(this.applicationNotificationsPanel, notification);
    }
    if (notifications.length > 0) {
      this.applicationNotificationsCollapse.toggle();
    }
  }

  clearApplicationNotifications() {
    this.applicationNotificationsPanel.innerHTML = "";
  }

  appendNofication(parent, notification) {
    let html = `
      <div id="div_${notification.getId()}" class="notification_panel">
        <div id="div_${notification.getId()}_close_btn" style="position: absolute; top: 5px; right: 5px; display: none;">
          <div style="position: relative;">
            <iron-icon icon="close" style="--iron-icon-fill-color:var(--palette-text-primary);"></iron-icon>
            <paper-ripple class="circle" recenters></paper-ripple>
          </div>
        </div>
        <div id="div_${notification.getId()}_recipient" style="display: flex; flex-direction: column; padding: 5px; align-items: center;">
          <img id="div_${notification.getId()}_img"></img>
          <iron-icon id="div_${notification.getId()}_ico" icon="account-circle"></iron-icon>
          <span id="div_${notification.getId()}_span" style="font-size: 10pt;"></span>
          <div id="div_${notification.getId()}_date" class="notification_date" style="font-size: 10pt;"></div>
        </div>
        <div style="display: flex; flex-direction: column; padding:5px; flex-grow: 1;">
          <div id="div_${notification.getId()}_text" style="flex-grow: 1; display: flex;">${notification.getMessage()}</div>
        </div>
      </div>
    `;

    let range = document.createRange();
    parent.insertBefore(range.createContextualFragment(html), parent.firstChild);

    let notificationDiv = this.shadowRoot.getElementById(`div_${notification.getId()}`);
    notificationDiv.notification = notification;

    let closeBtn = this.shadowRoot.getElementById(`div_${notification.getId()}_close_btn`);
    closeBtn.addEventListener('click', () => {
      Backend.publish("delete_notification_event_", notification, true);
      if (this.onclose != undefined) {
        this.onclose(notification);
      }
    });

    notificationDiv.addEventListener('mouseover', () => {
      notificationDiv.style.cursor = "pointer";
      if (notification._type == 0) {
        closeBtn.style.display = "block";
      }
    });

    notificationDiv.addEventListener('mouseleave', () => {
      notificationDiv.style.backgroundColor = "";
      notificationDiv.style.cursor = "default";
      if (notification._type == 0) {
        closeBtn.style.display = "none";
      }
    });

    notificationDiv.style.display = "flex";
    notificationDiv.style.position = "relative";
    notificationDiv.style.padding = ".75rem";
    let date_div = this.shadowRoot.getElementById(`div_${notification.getId()}_date`);

    setInterval(() => {
      let date = new Date(notification.getDate() * 1000);
      let now = new Date();
      let delay = Math.floor((now.getTime() - date.getTime()) / 1000);

      date_div.date = date;

      if (delay < 60) {
        date_div.innerHTML = delay + " seconds ago";
      } else if (delay < 60 * 60) {
        date_div.innerHTML = Math.floor(delay / 60) + " minutes ago";
      } else if (delay < 60 * 60 * 24) {
        date_div.innerHTML = Math.floor(delay / (60 * 60)) + " hours ago";
      } else {
        date_div.innerHTML = Math.floor(delay / (60 * 60 * 24)) + " days ago";
      }
    }, 1000);

    let notifications_read_date = 0;
    if (localStorage.getItem("notifications_read_date") != undefined) {
      notifications_read_date = parseInt(localStorage.getItem("notifications_read_date"));
    }

    let displayNotification = false;

    if (notification.getDate() * 1000 > notifications_read_date) {
      notificationDiv.classList.add("new_notification");
      displayNotification = true;
      let evt = new CustomEvent("new-notification", { detail: notification });
      document.dispatchEvent(evt);
    } else {
      // I will hide the bagde if the notification is not new.
      notificationDiv.classList.remove("new_notification");

    }

    if (notification.getNotificationType() == NotificationType.APPLICATION_NOTIFICATION) {
      this.applicationNotificationsDiv.style.display = "";
      let application = JSON.parse(notification.getSender());
      let img = this.shadowRoot.getElementById(`div_${notification.getId()}_img`);
      let ico = this.shadowRoot.getElementById(`div_${notification.getId()}_ico`);
      img.src = application.icon;
      img.style.borderRadius = "0px";
      img.style.width = "24px";
      img.style.height = "24px";
      ico.style.display = "none";

      // I will clone the notification div and append it to the toast.
      let notificationDiv_ = notificationDiv.cloneNode(true);
      notificationDiv_.style.marginTop = "5px";

      if (displayNotification) {

        let toast = displayMessage(notificationDiv_.outerHTML, 15000);

        let div = toast.toastElement.querySelector(`#div_${notification.getId()}_text`);
        div.style.maxHeight = "350px";
        div.style.overflowY = "auto";
        div.style.minWidth = "200px";
        div.style.maxWidth = "320px";
        div.style.marginLeft = "10px";
        div.style.marginRight = "30px";
        div.style.overflowY = "auto";
        let closeBtn = toast.toastElement.querySelector(`#div_${notification.getId()}_close_btn`);
        closeBtn.style.right = "-5px";
        closeBtn.style.top = "-5px";
        closeBtn.style.display = "block";
        closeBtn.addEventListener('click', () => {
          if (this.onclose != undefined) {
            this.onclose(notification);
          }
          toast.hideToast();
        });

      }
    } else if (notification.getNotificationType() == NotificationType.USER_NOTIFICATION) {
      this.userNotificationsDiv.style.display = "";
      let img = this.shadowRoot.getElementById(`div_${notification.getId()}_img`);
      let ico = this.shadowRoot.getElementById(`div_${notification.getId()}_ico`);
      let span = this.shadowRoot.getElementById(`div_${notification.getId()}_span`);
      AccountController.getAccount(notification.getSender(), (account) => {
        if (account.getProfilepicture() != "") {
          img.style.display = "block";
          ico.style.display = "none";
          img.src = account.getProfilepicture();
          img.style.maxWidth = "64px";
          img.style.maxHeight = "64px";
          img.style.borderRadius = "32px";
        } else {
          img.style.display = "none";
          ico.style.display = "block";
        }

        let name = account.getName();
        if (account.getFirstname() != "" && account.getLastname() != "") {
          name = account.getFirstname() + " " + account.getLastname();
        }

        span.innerHTML = name;
        let deleteNotificationListener;

        if (displayNotification) {
          let notificationDiv_ = notificationDiv.cloneNode(true);
          notificationDiv_.style.marginTop = "5px";

          let toast = displayMessage(notificationDiv_.outerHTML, 10000);

          let div = toast.toastElement.querySelector(`#div_${notification.getId()}_text`);
          div.style.minWidth = "200px";
          div.style.maxWidth = "320px";
          div.style.marginLeft = "10px";
          div.style.marginRight = "30px";
          div.style.maxHeight = "350px";
          div.style.overflowY = "auto";
          let closeBtn = toast.toastElement.querySelector(`#div_${notification.getId()}_close_btn`);
          closeBtn.style.display = "block";
          closeBtn.style.position = "absolute";
          closeBtn.right = "-5px";
          closeBtn.top = "-5px";
          closeBtn.addEventListener('click', () => {
            Backend.publish("delete_notification_event_", notification, true);
            if (this.onclose != undefined) {
              this.onclose(notification);
            }
            toast.hideToast();
          });
        }

        Backend.getGlobule(notification.mac).eventHub.subscribe(
          notification.getId() + "_delete_notification_event",
          (uuid) => {
            deleteNotificationListener = uuid;
          },
          (evt) => {
            let notification = Notification.deserializeBinary(Uint8Array.from(evt.split(",")));
            let parent = notificationDiv.parentNode;
            parent.removeChild(notificationDiv);

            Backend.eventHub.unSubscribe(notification.getId() + "_delete_notification_event", deleteNotificationListener);
            if (this.userNotificationsPanel.children.length == 0 && this.applicationNotificationsPanel.children.length == 0) {
              this.getIcon().icon = "social:notifications-none";
            }

            if (this.userNotificationsPanel.children.length == 0) {
              this.userNotificationsDiv.style.display = "none";
            }
          },
          false, this
        );
      }, err => {
        displayMessage(err, 3000);
        console.log(err);
      });
    }
  }
}

customElements.define('globular-notifications-panel', NotificationsPanel);

class NotificationMenu extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.unreadCount = 0;
  }

  connectedCallback() {
    this.render();
    this.addEventListener('click', this.onClick);
    this.style.display = "none";


    this.notificationCount = this.shadowRoot.querySelector('.badge');

    // listen to custom event new-notification
    document.addEventListener("new-notification", (evt) => {
      this.unreadCount++;
      this.notificationCount = this.shadowRoot.querySelector('.badge');
      if(this.notificationCount == null) {
        return;
      }

      this.notificationCount.textContent = this.unreadCount;
      this.notificationCount.style.display = "flex";

    });

    // init on custom event backend-ready...
    document.addEventListener("backend-ready", () => {
      // make sure the notifications panel is not already
      // initialized.
      if (this.notificationsPanel != null) {
        return;
      }

      // Subscribe to the login success event.
      Backend.eventHub.subscribe("login_success_", uuid => { }, (account) => {
        this.style.display = "block";
        if (this.notificationsPanel != null) {
          return;
        }

        // Initialize the notifications panel.
        this.notificationsPanel = new NotificationsPanel();

        // Initialize the notifications panel.
        this.notificationsPanel.init();

        // get the new_notification class and count the number of notifications.
        let new_notifications = document.querySelectorAll(".new_notification");
        this.unreadCount = new_notifications.length;
        this.notificationCount = this.shadowRoot.querySelector('.badge');
        this.notificationCount.textContent = this.unreadCount;

        if (this.unreadCount > 0) {
          this.notificationCount.display = "block";
        }

      }, true);

      // Subscribe to the logout event.
      Backend.eventHub.subscribe("logout_event", uuid => { }, (account) => {
        this.style.display = "none";
        this.notificationsPanel = null;
      }, true);

    });

    this.render();

  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
          :host {
              display: inline-flex;
              align-items: center;
              position: relative;
          }
  
          .badge {
              position: absolute;
              top: -6px;
              left: 22px;
              background-color: red;
              color: white;
              border-radius: 50%;
              width: 20px; /* Adjust the width as needed */
              height: 20px; /* Adjust the height as needed */
              font-size: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid var(--primary-color);
          }

          div:hover {
           cursor: pointer;
          }
           
      </style>
      <div>
        <iron-icon icon="social:notifications-none"></iron-icon>
        <span style="display: none;" class="badge">${this.unreadCount}</span>
      </div>
  `;
  }

  static get observedAttributes() {
    return ['unread-count'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'unread-count') {
      this.unreadCount = parseInt(newValue, 10) || 0;
      this.shadowRoot.querySelector('.badge').textContent = this.unreadCount;
    }
  }

  onClick() {
    if (this.notificationCount) {
      if (this.notificationCount.parentNode) {
        this.notificationCount.parentNode.removeChild(this.notificationCount);
        this.notificationCount = undefined;
      }
    }

    const isHidden = this.notificationsPanel.parentNode === null;
    if (isHidden) {
      document.body.appendChild(this.notificationsPanel);
    } else {
      document.body.removeChild(this.notificationsPanel);
      return;
    }

    const now = new Date();
    const dateTimeDivs = this.notificationsPanel.shadowRoot.querySelectorAll(".notification_date");
    if (dateTimeDivs.length > 0) {
      dateTimeDivs.forEach(div => {
        const date = div.date;
        const delay = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (delay < 60) {
          div.innerHTML = `${delay} seconds ago`;
        } else if (delay < 60 * 60) {
          div.innerHTML = `${Math.floor(delay / 60)} minutes ago`;
        } else if (delay < 60 * 60 * 24) {
          div.innerHTML = `${Math.floor(delay / (60 * 60))} hours ago`;
        } else {
          div.innerHTML = `${Math.floor(delay / (60 * 60 * 24))} days ago`;
        }
      });

      localStorage.setItem("notifications_read_date", now.getTime().toString());
    }


  }

}

customElements.define('globular-notification-menu', NotificationMenu);



