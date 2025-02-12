// Using Polymer instead of Materialize for the layout due to better shadow DOM compatibility.
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import { Backend, displayError, displayMessage, generatePeerToken, getUrl } from '../../backend/backend';
import { AccountController } from '../../backend/account';
import { NotificationController } from '../../backend/notification';

// Load Google Identity Services (GIS) script
function loadGoogleScript(callback) {
    // Load Google Identity Services (GIS) script
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    document.head.appendChild(gisScript);

    // Load Google Platform Library (for `gapi.auth2`)
    const gapiScript = document.createElement('script');
    gapiScript.src = "https://apis.google.com/js/platform.js";
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
        gapi.load('auth2', () => {
            gapi.auth2.init({
                client_id: Backend.globular.config.OAuth2_ClientId,
                cookiepolicy: 'single_host_origin',
                plugin_name: 'globular' //any name can be used
            }).then(callback);
        });
    };
    document.head.appendChild(gapiScript);
}

function signInWithGoogle() {
    const client = google.accounts.oauth2.initCodeClient({
        client_id: Backend.globular.config.OAuth2_ClientId,
        scope: "https://www.googleapis.com/auth/userinfo.email profile openid https://www.googleapis.com/auth/userinfo.profile",
        ux_mode: "popup",  // Use "redirect" if you want a full-page redirect
        callback: response => {
            if (response.code) {
                console.log("Authorization Code:", response.code);

                // Send auth code to backend to exchange for access_token
                fetch( Backend.globular.config.OAuth2_RedirectUri + "?code=" + response.code)
                    .then(res => res.json())
                    .then(data => {
                        // So here I register the user with the backend, or login if the user already exists
                        AccountController.register(data.user.sub, data.user.email, "", data.refresh_token, Backend.domain, (account) => {
                            AccountController.__account__ = account;

                            // dispatch login success event
                            Backend.eventHub.publish("login_success_", account, true);
                        }, (err) => {
                            displayError(err, 3000);
                        }, Backend.globular,  data.user.given_name, data.user.family_name, data.user.picture);
                    })
                    .catch(err => displayError(err, 3000));
            } else {
                console.error("Authorization failed:", response);
            }
        }
    });

    client.requestCode();  // Triggers Google OAuth login popup
}

/**
 * Login box component.
 */
export class LoginBox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <style>
                @import("style.css");

                paper-card {

                    background: var(--surface-color);
                    border-radius: 0.25rem;
                    font-family: Roboto;
                    font-size: 1rem;
                    color: var(--on-surface-color);
                    transform: translate(0px, 0px);
                }
                paper-input iron-icon {
                    margin-right: 10px;
                }
                #login_box {
                    z-index: 1000;
                    min-width: 340px;
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: var(--surface-color);
                    color: var(--on-surface-color);
                }
                .card-title {
                    font-size: 1.25rem;
                    text-transform: uppercase;
                    font-weight: 400;
                    letter-spacing: .25px;
                    position: fixed;
                    top: -50px;
                }
                .card-actions {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    font: 13px / 27px Roboto, Arial, sans-serif;
                }
                .card-content {
                    display: flex;
                    flex-direction: column;
                    padding: 20px;
                }
                paper-input {
                    margin-bottom: 10px;
                    font: 13px / 27px Roboto, Arial, sans-serif;
                }
                #reset-password-lnk {
                    margin-top: 10px;
                    font-size: 0.8rem;
                    align-self: flex-end;
                    cursor: pointer;
                    text-decoration: underline;
                }

                #google-login-btn:hover {
                    cursor: pointer;
                }
            </style>

            <paper-card id="login_box">
                <h2 class="card-title">Login</h2>
                <div class="card-content">
                    <paper-input id="user_input" label="User/Email">
                        <iron-icon icon="account-circle" slot="prefix"></iron-icon>
                    </paper-input>
                    <paper-input id="pwd_input" type="password" label="Password">
                        <iron-icon icon="lock" slot="prefix"></iron-icon>
                    </paper-input>
                    <paper-checkbox id="remember_me">Remember me</paper-checkbox>
                    <span id="reset-password-lnk">Forgot password?</span>

                </div>
                <div class="card-actions">

                    <div id="google-login-btn" title="login with your google account" class="icon-button" style="display: flex; width: 30px; height: 30px; justify-content: center; align-items: center;position: relative;">
                        <img class="devsite-product-logo" 
                            alt="Google Workspace" src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" 
                            // srcset=" https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" 
                            // sizes="64px" loading="lazy">
                        </img>
                        <paper-ripple class="circle" recenters=""></paper-ripple>
                    </div>

                    <span style="flex-grow: 1"></span>
                    <paper-button id="login_btn">Login</paper-button>
                    <paper-button id="cancel_btn">Cancel</paper-button>
                </div>
            </paper-card>
        `;

        this.setupEventListeners();
        loadGoogleScript(() => {

        });
    }

    setupEventListeners() {
        const userInput = this.shadowRoot.getElementById("user_input");
        const passwordInput = this.shadowRoot.getElementById("pwd_input");
        const cancelBtn = this.shadowRoot.getElementById("cancel_btn");
        const loginBtn = this.shadowRoot.getElementById("login_btn");
        const rememberMeBtn = this.shadowRoot.getElementById("remember_me");
        const resetPasswordLink = this.shadowRoot.getElementById("reset-password-lnk");
        const googleLoginBtn = this.shadowRoot.getElementById("google-login-btn");


        setTimeout(() => userInput.focus(), 100);

        cancelBtn.onclick = () => this.removeSelf();
        loginBtn.onclick = (evt) => this.handleLogin(evt, userInput, passwordInput);
        passwordInput.onkeyup = (evt) => { if (evt.key === "Enter") loginBtn.click(); };
        resetPasswordLink.onclick = () => this.handleResetPassword(userInput);


        rememberMeBtn.checked = localStorage.getItem("remember_me") === "true";
        rememberMeBtn.onchange = () => {
            localStorage.setItem("remember_me", rememberMeBtn.checked);
            if (!rememberMeBtn.checked) localStorage.removeItem("remember_me");
        };

        googleLoginBtn.onclick = () => {
            console.log("Initializing Google Sign-In...");

            // This will trigger the sign-in flow
            signInWithGoogle();
            this.parentElement.removeChild(this);
        };

    }


    handleLogin(evt, userInput, passwordInput) {
        evt.stopPropagation();
        this.removeSelf();
        AccountController.authenticate(Backend.globular, userInput.value, passwordInput.value, (token) => {
            // dispatch login success event
            Backend.eventHub.publish("login_success_", AccountController.account, true);


        }, (err) => {
            displayMessage(err, 3000);
        });
    }

    handleResetPassword(userInput) {
        if (userInput.value.length === 0) {
            userInput.focus();
            displayMessage("Please enter your user ID or email and click again", 3500);
            return;
        }

        AccountController.getAccount(userInput.value, (account) => {
            AccountController.getAccount("sa", (sa) => {
                const notification = new Notification(
                    Backend.getGlobule(sa.getDomain()).config.Mac,
                    `${account.getId()}@${account.getDomain()}`,
                    NotificationType.User,
                    `${sa.id}@${sa.domain}`,
                    `
                        <div>
                            <p>
                                User ${account.getName()} (ID: ${account.getId()}@${account.getDomain()}) forgot their password.
                                Can you change it and send the new password to <a href="mailto:${account.getEmail()}">${account.getEmail()}</a>?
                            </p>
                        </div>`
                );

                NotificationController.sendNotifications(
                    notification,
                    () => displayMessage("Notification sent to the system administrator. An email will be sent to you soon.", 15000),
                    (err) => displayError(err, 3000)
                );
            });
        });
    }

    removeSelf() {
        this.parentNode.removeChild(this);
    }
}

customElements.define('globular-login-box', LoginBox);

/**
 * Register box component.
 */
export class RegisterBox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <style>
                @import("style.css");
                
                paper-card {
                    background: var(--surface-color);
                    border-radius: 0.25rem;
                    font-family: Roboto;
                    font-size: 1rem;
                    color: var(--on-surface-color);
                    transform: translate(0px, 0px);
                }
                paper-input iron-icon {
                    margin-right: 10px;
                }
                paper-input {
                    font: 13px / 27px Roboto, Arial, sans-serif;
                }
                #register_box {
                    z-index: 1000;
                    min-width: 340px;
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: var(--surface-color);
                    color: var(--on-surface-color);
                }
                .card-title {
                    font-size: 1.25rem;
                    text-transform: uppercase;
                    font-weight: 400;
                    letter-spacing: .25px;
                    position: fixed;
                    top: -50px;
                }
                .card-actions {
                    display: flex;
                    justify-content: flex-end;
                    font: 13px / 27px Roboto, Arial, sans-serif;
                }

            </style>

            <paper-card id="register_box">
                <h2 class="card-title">Register</h2>
                <div class="card-content">
                    <paper-input id="user_input" label="User">
                        <iron-icon icon="account-circle" slot="prefix"></iron-icon>
                    </paper-input>
                    <paper-input id="email_input" label="Email">
                        <iron-icon icon="mail" slot="prefix"></iron-icon>
                    </paper-input>
                    <paper-input id="pwd_input" type="password" label="Password">
                        <iron-icon icon="lock" slot="prefix"></iron-icon>
                    </paper-input>
                    <paper-input id="retype_pwd_input" type="password" label="Retype Password">
                        <iron-icon icon="lock" slot="prefix"></iron-icon>
                    </paper-input>
                </div>
                <div class="card-actions">
                    <paper-button id="register_btn">Register</paper-button>
                    <paper-button id="cancel_btn">Cancel</paper-button>
                </div>
            </paper-card>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const userInput = this.shadowRoot.getElementById("user_input");
        const emailInput = this.shadowRoot.getElementById("email_input");
        const passwordInput = this.shadowRoot.getElementById("pwd_input");
        const retypePasswordInput = this.shadowRoot.getElementById("retype_pwd_input");
        const cancelBtn = this.shadowRoot.getElementById("cancel_btn");
        const registerBtn = this.shadowRoot.getElementById("register_btn");

        setTimeout(() => userInput.focus(), 100);

        cancelBtn.onclick = () => this.removeSelf();
        registerBtn.onclick = (evt) => this.handleRegister(evt, userInput, emailInput, passwordInput, retypePasswordInput);
    }

    handleRegister(evt, userInput, emailInput, passwordInput, retypePasswordInput) {
        evt.stopPropagation();
        if (passwordInput.value !== retypePasswordInput.value) {
            displayMessage("Passwords do not match", 3000);
            return;
        }

        AccountController.register(userInput.value, emailInput.value, passwordInput.value, retypePasswordInput.value, Backend.domain, (account) => {
            displayMessage("Account created successfully", 3000);
            this.removeSelf();
        }, (err) => {
            displayError(err, 3000);
        }, Backend.globular);
    }

    removeSelf() {
        this.parentNode.removeChild(this);
    }
}

customElements.define('globular-register-box', RegisterBox);


/**
 * Login/Register functionality.
 */
export class Login extends HTMLElement {
    constructor() {

        super();
        this.attachShadow({ mode: 'open' });
        this.loginBox = new LoginBox();
        this.registerBox = new RegisterBox();
    }

    connectedCallback() {
        this.shadowRoot.innerHTML = `
            <style>
                #login_div {
                    display: flex;
                    cursor: pointer;
                }
                #login_div span:hover {
                    cursor: pointer;
                }
                paper-button {
                    font: 13px / 27px Roboto, Arial, sans-serif;
                }
            </style>
            <span id="login_div">
                <paper-button id="register_btn">Register</paper-button>
                <paper-button id="login_btn">Login</paper-button>
            </span>
        `;

        this.shadowRoot.getElementById("login_btn").onclick = () => {
            this.switchBox(this.registerBox);
            // this.getWorkspace().appendChild(this.loginBox);
            document.body.appendChild(this.loginBox);
        };

        this.shadowRoot.getElementById("register_btn").onclick = () => {
            this.switchBox(this.loginBox);
            // this.getWorkspace().appendChild(this.registerBox);
            document.body.appendChild(this.registerBox);
        };

        // I will subscribe to custom dom event backend-ready
        document.addEventListener("backend-ready", (evt) => {

            // Subscribe to login success event
            Backend.eventHub.subscribe("login_success_", uuid => { }, (account) => {
                localStorage.setItem("user_id", account.getId());
                localStorage.setItem("user_email", account.getEmail());
                localStorage.setItem("user_name", account.getName());
                this.style.display = "none"; // Hide the login/register buttons
            }, true);

            if (localStorage.getItem("user_token") !== null) {
                generatePeerToken(Backend.globular, (token) => {
                    this.style.display = "none"; // Hide the login/register buttons
                    localStorage.setItem("user_token", token);
                }, (err) => {
                    console.error(err);
                    localStorage.removeItem("user_token");
                    localStorage.removeItem("user_id");
                    localStorage.removeItem("user_email");
                    localStorage.removeItem("user_name");
                });


            }
        });

    }

    switchBox(boxToRemove) {
        if (boxToRemove.parentNode) {
            boxToRemove.parentNode.removeChild(boxToRemove);
        }
    }

    init() {
        // Initialize event listeners or other actions here
    }
}

customElements.define('globular-login', Login);
