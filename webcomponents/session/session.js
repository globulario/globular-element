
import "@polymer/iron-icons/device-icons";
import "@polymer/iron-icon/iron-icon.js";
import '@polymer/paper-toggle-button/paper-toggle-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';

import { v4 as uuidv4 } from "uuid";
import { Backend, displayError, generatePeerToken } from "../../backend/backend";
import { AccountController } from "../../backend/account";
import { SessionState } from "globular-web-client/resource/resource_pb";


// This variables are for the active user.
let accountId = ""
let away = false; // does not want to be see
let timeout = null; // use it to make the event less anoying...
let sessionTime = null;

// When the applicaiton lost focus away state will be set to the logged user.
document.addEventListener('visibilitychange', function () {
    if (accountId.length > 0) {
        if (document.visibilityState == 'hidden' && !away) {
            timeout = setTimeout(() => {
                AccountController.getAccount(accountId, a => {
                    let session = a.session
                    session.setLastStateTime(Math.round(new Date().getTime() / 1000));
                    session.setState(SessionState.AWAY)
                    AccountController.saveSession(() => {
                        away = true;
                    }, err => console.log(err))
                }, err => console.log(err))

            }, 30 * 1000)
        } else if (document.visibilityState == 'visible' && away) {

            AccountController.getAccount(accountId, a => {
                let session = a.session
                session.setLastStateTime(Math.round(sessionTime))
                session.setState(SessionState.ONLINE)
                AccountController.saveSession(() => {
                    away = false;
                }, err => console.log(err))

                if (timeout != undefined) {
                    clearTimeout(timeout)
                }
            }, err => console.log(err))


        }
    }
});

window.addEventListener('beforeunload', function (e) {
    // the absence of a returnValue property on the event will guarantee the browser unload happens
    AccountController.getAccount(accountId, a => {
        let session = a.session
        session.setLastStateTime(Math.round(new Date().getTime() / 1000));
        session.setState(SessionState.OFFLINE)
        AccountController.saveSession(() => {
            away = false;
        }, err => console.log(err))

    }, err => console.log(err))
    delete e['returnValue'];
});

/**
 * Display the session state of a particular accout...
 */
export class SessionStatePanel extends HTMLElement {

    // Create the applicaiton view.
    constructor(account) {
        super()

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.account = account;
        this.interval = null;
        let sessionStateId = "_" + uuidv4();
        let sessionTimerId = "_" + uuidv4();
        this.sessionChangeListener = ""

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            .session-state-panel{
                display: flex;
                flex-direction: row;
                background-color: var(--palette-background-paper);
                color: var(--palette-text-primary);
                --iron-icon-fill-color: var(--palette-text-primary);
                align-items: center;
                font-size: .85rem;
            }

            .session-state-panel span{
                padding-left: 10px;
                color: var(--palette-text-accent);
            }

            #session-state-timer{
                flex-grow: 1;
            }

            .session-state-panel paper-toggle-button{
                padding-left: 16px;
                font-size: .85rem;
            }

            paper-toggle-button {
                --paper-toggle-button-label-color: var(--palette-text-accent);
            }

            paper-card h1 {
                font-size: 1.65rem;
            }

        </style>
        <div class="session-state-panel">
            <iron-icon icon="device:access-time" style="padding-left: 8px;"></iron-icon>
            <div style="flex-grow: 1;">
                <span id="${sessionStateId}"></span>
                <span id="${sessionTimerId}"></span>
            </div>
            <paper-toggle-button title="Appear away to other's" noink></paper-toggle-button>
        </div>
        `

        this.ico = this.shadowRoot.querySelector("iron-icon")
        this.away = this.shadowRoot.querySelector("paper-toggle-button")
        this.stateName = this.shadowRoot.querySelector("#" + sessionStateId)
        this.lastStateTime = this.shadowRoot.querySelector("#" + sessionTimerId)
        this.id = "_" + uuidv4();

        // Set the away button...
        if (this.hasAttribute("editable")) {
            this.away.onchange = () => {
                let session = this.account.session

                if (this.away.checked) {
                    // Here I will set the user session...
                    session.setState(SessionState.AWAY)
                    this.stateName.innerHTML = "Away"
                    session.setLastStateTime(Math.round(new Date().getTime() / 1000));
                    away = true;
                } else {
                    session.setState(SessionState.ONLINE)
                    session.setLastStateTime(Math.round(sessionTime))
                    away = false;
                    this.stateName.innerHTML = "Online"
                }

                // local event.
                AccountController.saveSession(() => {
                    //sessionTime = session.getLastStateTime()
                }, (err) => {
                    displayError(err, 3000)
                })
            }
        } else {
            this.away.parentNode.removeChild(this.away);
        }

        // The account can be the actual object or a string...
        if (this.hasAttribute("account")) {
            let accountId = this.getAttribute("account")
            AccountController.getAccount(accountId, (val) => {
                this.account = val;
                this.init();
            }, (err) => {
                displayError(err, 3000)
            })

        }
    }

    /**
     * Initialyse the session panel values.
     */
    init() {
        // if no account was define simply return without init session...
        if (!this.account) {
            setTimeout(() => {
                if (this.hasAttribute("account")) {
                    let accountId = this.getAttribute("account")
                    AccountController.getAccount(accountId, (val) => {
                        this.account = val;
                        this.init();
                    }, (err) => {
                        displayError(err, 3000)
                    })

                }
            }, 1000)
            return
        }

        if (!this.account.session) {
            setTimeout(() => {
                if (this.hasAttribute("account")) {
                    let accountId = this.getAttribute("account")
                    AccountController.getAccount(accountId, (val) => {
                        this.account = val;
                        this.init();
                    }, (err) => {
                        displayError(err, 3000)
                    })

                }
            }, 1000)
            return
        }

        // unsubscribe first.
        if (this.hasAttribute("editable")) {
            sessionTime = this.account.session.getLastStateTime();
        }

        // Start display time at each second...
        this.interval = setInterval(() => {
            this.displayDelay()
        }, 500)

    }

    displayDelay() {
        if (this.account.session == undefined) {
            this.style.display = "none"
            return
        }

        this.style.display = ""
        let lastStateTime = new Date(this.account.session.getLastStateTime() * 1000)
        let state = this.account.session.getState()

        if (state == 0) {
            this.stateName.innerHTML = "Online"
        } else if (state == 1) {
            this.stateName.innerHTML = "Offline"
        } else {
            this.stateName.innerHTML = "Away"
        }

        let delay = Math.floor((Date.now() - lastStateTime.getTime()) / 1000);

        if (delay < 60) {
            this.lastStateTime.innerHTML = delay + " seconds ago"
        } else if (delay < 60 * 60) {
            this.lastStateTime.innerHTML = Math.floor(delay / (60)) + " minutes ago"
        } else if (delay < 60 * 60 * 24) {
            this.lastStateTime.innerHTML = Math.floor(delay / (60 * 60)) + " hours ago"
        } else {
            this.lastStateTime.innerHTML = Math.floor(delay / (60 * 60 * 24)) + " days ago"
        }
    }


    // The connection callback.
    connectedCallback() {
        // When the element is put in the dom.
        this.init();
    }

    // Disconnect the element from the view.
    disconnectedCallback() {
        // it can affect it values.
        if (this.interval != undefined) {
            clearInterval(this.interval);
        }
        if (this.sessionChangeListener.length > 0) {
            if (this.account.session) {
                let session = this.account.session
                session.setLastStateTime(Math.round(new Date().getTime() / 1000));
                session.setState(SessionState.OFFLINE)
                AccountController.saveSession(() => { }, (err) => {
                    displayError(err);
                })

            }
        }
    }
}

customElements.define('globular-session-state', SessionStatePanel);

/**
 * Login/Register functionality.
 */
export class SessionMenu extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.ico = null;
        this.img = null;
        this.accountUpdateListener = null;
        this.account = null;

        document.addEventListener("backend-ready", (evt) => {

            Backend.eventHub.subscribe("login_success_", uuid => { }, (account) => {
                this.style.display = "block"
                this.setAccount(account)
            }, true);

            // Reset the account.
            Backend.eventHub.subscribe("logout_event_",
                (uuid) => { },
                (dataUrl) => {
                    this.account = null;
                    this.resetProfilePicture()
                },
                true, this)

            let token = localStorage.getItem("user_token")
            if (token != undefined) {
                generatePeerToken(Backend.globular,
                    () => {
                        let user_id = localStorage.getItem("user_id")
                        AccountController.getAccount(user_id, (account) => {
                            this.setAccount(account)
                            let session = account.session
                            session.setLastStateTime(Math.round(new Date().getTime() / 1000));
                            session.setState(SessionState.ONLINE)
                            AccountController.saveSession(() => { }, (err) => {
                                displayError(err);
                                localStorage.removeItem("user_token");
                            })
                        }, (err) => {
                            displayError(err);
                            localStorage.removeItem("user_token");
                        })
                    },
                    (err) => {
                        displayError(err);
                        localStorage.removeItem("user_token");
                    })
            } else {
                this.style.display = "none" // hide the element.
            }
        })

    }

    // Set the account information.
    setAccount(account) {
        this.account = account;
        accountId = account.getId() + "@" + account.getDomain();

        let name = account.getName();
        if(account.getFirstname().length > 0 && account.getLastname().length > 0){
            name = account.getFirstname() + " " + account.getLastname();
        }

        // Set the data url.
        Backend.globular.eventHub.subscribe(`__update_account_${account.getId() + "@" + account.getDomain()}_data_evt__`,
            (uuid) => {
                this.accountUpdateListener = uuid;
            },
            (data) => {
                this.setProfilePicture(data.getProfilepicture())
            },
            true, this)

        this.shadowRoot.innerHTML = `
            <style>

                #close-btn{
                    position: absolute;
                    right: 5px;
                    top: 5px;
                }

                #accout-menu-header{
                    display: flex;
                    flex-direction: column;
                    font-size: 12pt;
                    line-height: 1.6rem;
                    align-items: center;
                    margin-bottom: 16px;
                }

                #account-header-id{
                    font-weight: 500;
                }

                #title{
                display: none; 
                justify-content: center;
                }

                #account_menu_div{
                    position: fixed;
                    top: 70px;
                    right: 5px;
                    min-width: 300px;
                }

                paper-card{
                    border-radius: 8px;
                    position: fixed;
                    top: 65px;
                    right: 5px;
                    min-width: 300px;
                }

                @media (max-width: 700px) {

                    #account_menu_div{
                        margin-top: 25px;
                        height: 100%;

                    }

                    #title{
                        display: flex; 
                    }
                }

                #account-header-id{
                    
                }

                #icon-div iron-icon{
                    padding-right: 10px;
                }

                #profile-picture{
                    width: 32px;
                    height: 32px;
                    border-radius: 16px;
                    border: 1px solid transparent;
                    display: none;
                }

                #profile-picture:hover{
                    cursor: pointer;
                }

                #icon-div iron-icon:hover{
                    cursor: pointer;
                }

                #profile-icon {
                    fill: var(--on-primary-color);
                    width: 32px;
                    height: 32px;
                }

                #profile-icon:hover{
                    cursor: pointer;
                }

                .card-actions{
                    display: flex;
                    justify-content: flex-end;
                    background-color: var(--surface-color);
                    color: var(--on-surface-color);
                }

                paper-card{
                    background-color: var(--surface-color);
                    color: var(--on-surface-color);
                }
        
                paper-button {
                    color: var(--on-surface-color);
                    font-weight: 300;
                }

                .card-content{
                    display: flex;
                    flex-direction: column;
                    background-color: var(--surface-color);
                    color: var(--on-surface-color);
                    position: relative;
                }

                #header h1 {
                    font-size: 1.65rem;
                    margin: 0px;
                    margin-bottom: 10px;
                }

                #profile-picture-big { 
                    height: 100px; 
                    width: 100px; 
                    border-radius: 50px; 
                    display: none;
                }

                #profile-picture-big:hover {
                    cursor: pointer;
                } 

                #profile-icon-big {
                    height: 100px;
                    width: 100px;
                    color: var(--primary-color);
                }
                
                #profile-icon-big:hover {
                    cursor: pointer;
                }

            </style>

            <div>
                <img id="profile-picture" style="display: none;"></img>
                <iron-icon id="profile-icon" icon="account-circle"></iron-icon>
            </div>
  
            <paper-card id="account_menu_div" style="display: none;">
                <div class="card-content">
                    <paper-icon-button id="close-btn" icon="icons:close" role="button" tabindex="0" aria-disabled="false"></paper-icon-button>
                    <div id="accout-menu-header">
                        <div id="icon-div" title="click here to change profile picture">
                            <iron-icon id="profile-icon-big" style="height: 100px; width: 100px; color: var(--primary-color);" icon="account-circle"></iron-icon>
                            <img id="profile-picture-big" style="height: 100px; width: 100px; border-radius: 50px; display: none;"></img>
                        </div>
                        
                        <span id="account-header-id">
                            
                            ${name}
                        </span>
                        <span id="account-header-email">
                            ${account.getEmail()}
                        </span>
                      
                    </div>
                    <globular-session-state account="${name + "@" + account.getDomain()}" editable state="online"></globular-session-state>
                </div>

                <div class="card-actions">
                    <paper-button id="settings_btn" >settings
                    <iron-icon style="padding-left: 5px;" icon="settings"></iron-icon>
                    </paper-button> 
                    <paper-button id="logout_btn" >logout 
                        <iron-icon style="padding-left: 5px;" icon="exit-to-app"></iron-icon> 
                    </paper-button>              
                </div>
            </paper-card>
          `;



          this.shadowRoot.querySelector("#profile-icon-big").onclick = this.shadowRoot.querySelector("#profile-picture-big").onclick = () => {
            console.log("----> click")
        }

        this.shadowRoot.querySelector("#profile-picture").onclick = this.shadowRoot.querySelector("#profile-icon").onclick = () => {
            let accountMenuDiv = this.shadowRoot.querySelector("#account_menu_div")
            const isHidden = accountMenuDiv.style.display === "none";
            if (isHidden) {
                accountMenuDiv.style.display = "block"
            } else {
                accountMenuDiv.style.display = "none"

            }
        }


        this.shadowRoot.querySelector("#close-btn").onclick = () => {
            let accountMenuDiv = this.shadowRoot.querySelector("#account_menu_div")
            accountMenuDiv.style.display = "none"
        }

        // Set the account.
        this.shadowRoot.querySelector("globular-session-state").account = account
        this.shadowRoot.querySelector("globular-session-state").init()


        // The Settings event.
        this.shadowRoot.getElementById("settings_btn").onclick = () => {
            Backend.eventHub.publish("settings_event_", {}, true);
        };
        // The logout event.
        this.shadowRoot.getElementById("logout_btn").onclick = () => {
            AccountController.logout();
        };

        this.img = this.shadowRoot.getElementById("profile-picture");
        this.ico = this.shadowRoot.getElementById("profile-icon");
        this.imgBig = this.shadowRoot.getElementById("profile-picture-big");
        this.icoBig = this.shadowRoot.getElementById("profile-icon-big");

        if (account.getProfilepicture() != undefined) {
            this.setProfilePicture(account.getProfilepicture());
        }

    }

    resetProfilePicture() {
        // reset the display
        this.getIcon().style.display = "block";
        this.getImage().style.display = "none";
        this.getImage().src = "";

        if (this.img != undefined) {
            this.img.src = "";
            this.img.style.display = "none";
        }

        if (this.ico != undefined) {
            this.ico.style.display = "block";
        }
    }

    getIcon() {
        return this.shadowRoot.getElementById("icon-div")
    }

    getImage() {
        return this.shadowRoot.getElementById("profile-picture")
    }



    /**
     * Set the profile picture with the given data url.
     * @param {*} dataUrl
     */
    setProfilePicture(dataUrl) {

        // The account, and data url must be valid.
        if (this.account == null) {
            this.resetProfilePicture()
            return;
        }

        if (dataUrl == undefined) {
            this.resetProfilePicture()
            return
        }

        if (dataUrl.length == 0) {
            this.resetProfilePicture()
            return;
        }

        // Here the account has a profile picture.
        this.icoBig.style.display = this.ico.style.display = "none";
        this.imgBig.style.display = this.img.style.display = "block";
        this.imgBig.src = this.img.src = dataUrl;

        // The profile in the menu.
        if (this.img != undefined) {
            this.img.src = dataUrl;
            this.img.style.display = "block";
        }

        if (this.ico != undefined) {
            this.ico.style.display = "none";
        }
    }
}

customElements.define("globular-session-menu", SessionMenu);