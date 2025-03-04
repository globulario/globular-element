import { Account, Contact, GetAccountsRqst, GetSessionRequest, GetSessionResponse, NotificationType, RegisterAccountRqst, RegisterAccountRsp, Session, SessionState, SetAccountContactRqst, SetAccountContactRsp, UpdateSessionRequest, UpdateSessionResponse } from "globular-web-client/resource/resource_pb";
import { Backend, displayError, displayMessage, generatePeerToken } from "./backend";
import { Globular } from "globular-web-client";
import { AuthenticateRqst } from "globular-web-client/authentication/authentication_pb";
import jwt from 'jwt-decode';
import { GetSubjectAvailableSpaceRqst, SubjectType } from "globular-web-client/rbac/rbac_pb";
import { Connection, FindOneRqst, CreateConnectionRqst, ReplaceOneRsp, FindRqst, FindResp } from "globular-web-client/persistence/persistence_pb";
import { NotificationController } from "./notification";
import { mergeTypedArrays, uint8arrayToStringMethod } from "../Utility";


document.addEventListener("backend-ready", () => {



    // Invite contact event.
    Backend.eventHub.subscribe(
        "invite_contact_event_",
        (uuid: string) => {
        },
        (contact: Account) => {
            // Here I will try to login the user.
            AccountController.onInviteContact(contact);
        },
        true, this
    );


    // Revoke contact invitation.
    Backend.eventHub.subscribe(
        "revoke_contact_invitation_event_",
        (uuid: string) => {
        },
        (contact: Account) => {
            // Here I will try to login the user.
            AccountController.onRevokeContactInvitation(contact);
        },
        true, this
    );


    // Accept contact invitation
    Backend.eventHub.subscribe(
        "accept_contact_invitation_event_",
        (uuid: string) => {
        },
        (contact: Account) => {
            // Here I will try to login the user.
            AccountController.onAcceptContactInvitation(contact);
        },
        true, this
    );


    // Decline contact invitation
    Backend.eventHub.subscribe(
        "decline_contact_invitation_event_",
        (uuid: string) => {
        },
        (contact: Account) => {
            // Here I will try to login the user.
            AccountController.onDeclineContactInvitation(contact);
        },
        true, this
    );


    // Decline contact invitation
    Backend.eventHub.subscribe(
        "delete_contact_event_",
        (uuid: string) => {
        },
        (contact: Account) => {
            // Here I will try to login the user.
            AccountController.onDeleteContact(contact);
        },
        true, this
    );

});


export class AccountController {

    // By default the account will be the guest account.
    private static __account__: Account;

    private static __accounts__: any = {};

    // Get the account.
    static get account() {

        // If the account is not set, then create a new account.
        if (AccountController.__account__ == null) {
            AccountController.__account__ = new Account();

            // first check if a token is available in the local storage
            let token = localStorage.getItem("user_token");

            if (token != null) {
                let decoded = jwt(token);
                let id = (<any>decoded).id;
                let userName = (<any>decoded).username;
                let email = (<any>decoded).email;
                let domain = (<any>decoded).user_domain;

                AccountController.__account__.setId(id);
                AccountController.__account__.setName(userName);
                AccountController.__account__.setEmail(email);
                AccountController.__account__.setDomain(domain);
                // init the 
                AccountController.getAccount(id, (account) => {
                    AccountController.__account__ = account;
                }, err => console.log(err))

            } else {
                // Set the account to be the sa account.
                AccountController.__account__.setId("sa");
                AccountController.__account__.setName("sa");

                let domain = Backend.globular.domain;
                if (domain != null) {
                    AccountController.__account__.setDomain(domain);
                }
            }

        }

        return AccountController.__account__;
    }

    // Set the account.
    static set account(account: Account) {
        AccountController.__account__ = account;
    }


    // Get all account data from a give globule...
    static getAccounts(query: string, init: boolean, callback: (accounts: Array<Account>) => void, errorCallback: (err: any) => void, globule: Globular = Backend.globular) {

        generatePeerToken(globule, token => {
            let rqst = new GetAccountsRqst
            rqst.setQuery(query)

            if (globule.resourceService == null) {
                errorCallback("Resource service not found")
                return
            }

            let stream = globule.resourceService.getAccounts(rqst, { domain: globule.domain, token: token })
            let accounts_ = new Array<Account>();

            stream.on("data", (rsp) => {
                accounts_ = accounts_.concat(rsp.getAccountsList())
            });

            stream.on("status", (status) => {
                if (status.code == 0) {
                    let accounts = new Array<Account>();

                    if (accounts_.length == 0) {
                        callback(accounts);
                        return;
                    }

                    // In that case I will return the list of account without init ther data
                    if (init == false) {
                        accounts_.forEach(a_ => {
                            if (AccountController.__accounts__[a_.getId() + "@" + a_.getDomain()] != undefined) {
                                accounts.push(AccountController.__accounts__[a_.getId() + "@" + a_.getDomain()])
                            } else {
                                accounts.push(a_)
                                AccountController.__accounts__[a_.getId() + "@" + a_.getDomain()] = a_
                            }
                        })
                        callback(accounts)
                        return
                    }

                    let initAccountData = () => {
                        let a_ = accounts_.pop()
                        if (a_ == undefined) {
                            errorCallback(accounts)
                            return
                        }

                        if (AccountController.__accounts__[a_.getId() + "@" + a_.getDomain()] == undefined) {
                            if (accounts_.length > 0) {
                                AccountController.initData(a_, () => {
                                    if (a_ == undefined) {
                                        errorCallback(accounts)
                                        return
                                    }
                                    AccountController.__accounts__[a_.getId() + "@" + a_.getDomain()] = a_
                                    initAccountData()
                                }, errorCallback)
                            } else {
                                AccountController.initData(a_,
                                    () => {
                                        if (a_ == undefined) {
                                            errorCallback(accounts)
                                            return
                                        }
                                        AccountController.__accounts__[a_.getId() + "@" + a_.getDomain()] = a_
                                        callback(accounts)
                                    }, errorCallback)
                            }

                        } else {
                            AccountController.__accounts__[a_.getId() + "@" + a_.getDomain()] = a_
                            if (accounts_.length > 0) {
                                initAccountData()
                            } else {
                                callback(accounts)
                            }
                        }


                    }

                    // intialyse the account data.
                    if (init == true)
                        initAccountData();

                } else {
                    // In case of error I will return an empty array
                    errorCallback(status.details)
                }
            });
        }, errorCallback)
    }

    static getSession(account: Account, callback: (session: Session) => void, errorCallback: (err: any) => void) {

        // In that case I will get the values from the database...
        let rqst = new GetSessionRequest
        rqst.setAccountid(account.getId() + "@" + account.getDomain())

        let globule = Backend.getGlobule(account.getDomain())
        if (globule == null) {
            return
        }

        generatePeerToken(globule, token => {
            if (globule.resourceService == null) {
                errorCallback("Resource service not found")
                return
            }
            // call persist data
            globule.resourceService
                .getSession(rqst, {
                    token: token,
                    domain: globule.domain
                })
                .then((rsp: GetSessionResponse) => {
                    // get the response
                    let lastDomain = globule.domain
                    let lastSession = rsp.getSession()

                    if (lastSession == null) {
                        errorCallback("No session found for the account")
                        return
                    }

                    (account as any).session = lastSession

                    callback((account as any).session)

                }).catch(errorCallback);
        }, errorCallback);


    }

    /**
     * 
     * @param account 
     * @param initCallback 
     * @param errorCallback 
     */
    static initSession(account: Account, successCallback: (session: Session) => void, errorCallback: (err: any) => void) {
        generatePeerToken(Backend.globular, token => {
            let accountId = account.getId() + "@" + account.getDomain()
            let globule = Backend.getGlobule(account.getDomain())

            AccountController.getSession(account, (session: Session) => {

                // load available space for the account on the globule...
                if (account.getId() != "sa") {
                    let rqst = new GetSubjectAvailableSpaceRqst
                    rqst.setSubject(accountId)
                    rqst.setType(SubjectType.ACCOUNT)

                    if (globule.rbacService == null) {
                        errorCallback("RBAC service not found")
                        return
                    }

                    globule.rbacService
                        .getSubjectAvailableSpace(rqst, {
                            token: token,
                            domain: globule.domain
                        })
                        .then((rsp) => {
                            successCallback(session)
                        })
                        .catch((err) => {
                            errorCallback(err);
                        });
                } else {
                    successCallback(session)
                }

                // So here I will lisen on session change event and keep this object with it.
                globule.eventHub.subscribe(`session_state_${account.getId() + "@" + account.getDomain()}_change_event`,
                    (uuid: string) => {
                        /** nothing special here... */
                    },
                    (evt: String) => {
                        
                        (account as any).session = Session.deserializeBinary(Uint8Array.from(evt.split(",")))

                        // Here I will ask the user for confirmation before actually delete the contact informations.
                        let getSessionStateColor = (state: SessionState) => {
                            switch (state) {
                                case SessionState.ONLINE:
                                    return "green";
                                case SessionState.OFFLINE:
                                    return "red";
                                case SessionState.AWAY:
                                    return "orange";
                                default:
                                    return "gray";
                            }
                        }

                        let getSessionStateMessage = (state: SessionState, name: String) => {
                            switch (state) {
                                case SessionState.ONLINE:
                                    return `${name} is now online.`;
                                case SessionState.OFFLINE:
                                    return `${name} has gone offline.`;
                                case SessionState.AWAY:
                                    return `${name} is away.`;
                                default:
                                    return "Unknown session state.";
                            }
                        }

                        let state = (account as any).session.getState(); 
                        const color = getSessionStateColor(state);
                        let name = account.getName();
                        if(account.getFirstname() != "" && account.getLastname() != ""){
                            name = account.getFirstname() + " " + account.getLastname();
                        }

                        const message = getSessionStateMessage(state, name);
                        let id = "contact-session-info-toast-" + account.getId() + "@" + account.getDomain();
                        if(document.getElementById(id)){
                            let toastElement = document.getElementById(id) as any;
                            toastElement.remove();
                        }

                        let toast = displayMessage(
                            ` <style>
                                    #contact-session-info-box {
                                      display: flex;
                                      flex-direction: column;
                                      padding: 10px;
                                    }
                                    #contact-session-info-box globular-contact-card {
                                      padding-bottom: 10px;
                                    }
                                    #contact-session-info-box div {
                                      display: flex;
                                      align-items: center;
                                      font-size: 1.2rem;
                                      padding-bottom: 10px;
                                    }
                                    .status-indicator {
                                      width: 12px;
                                      height: 12px;
                                      border-radius: 50%;
                                      background-color: ${color};
                                      margin-right: 10px;
                                    }
                                  </style>
                                  <div id="contact-session-info-box">
                                    <div>
                                      <span class="status-indicator"></span>
                                      ${message}
                                    </div>
                                    <globular-contact-card contact="${account.getId() + "@" + account.getDomain()}"></globular-contact-card>
                                  </div>`,
                            5000 // Display for 5 seconds
                        );

                        if( toast.toastElement)
                            toast.toastElement.id = id



                    }, false, this)

            }, errorCallback)
        }, errorCallback)

    }

    // Save session state in the databese.
    static saveSession(onSave: () => void, onError: (err: any) => void) {
        let rqst = new UpdateSessionRequest;

        let user_token = localStorage.getItem("user_token");
        if (user_token == null) {
            onError("No user token found")
            return
        }

        // I will get the token expiration date.
        let decoded = jwt(user_token);
        let token_expired = (<any>decoded).exp;

        // I will check if the token is still valid
        if (Math.round(new Date().getTime() / 1000) > token_expired) {
            onError("The user token is expired")
            return
        }

        // I will set the session expiration date to the token expiration date.
        (this.account as any).session.setExpireAt(Math.round(token_expired))

        rqst.setSession( (this.account as any).session)

        // TEST if session must be on the user globule or the actual session store.
        let globule = Backend.getGlobule(this.account.getDomain())
        generatePeerToken(globule, token => {

            if (globule.resourceService == null) {
                onError("Resource service not found")
                return
            }

            // call persist data
            globule.resourceService
                .updateSession(rqst, {
                    token: token,
                    domain: this.account.getDomain()
                })
                .then((rsp: UpdateSessionResponse) => {
                    // Here I will return the value with it
                    globule.eventHub.publish(`session_state_${ (this.account as any).session.getAccountid()}_change_event`,  (this.account as any).session.serializeBinary(), false)
                    onSave();
                })
                .catch((err: any) => {
                    if (onError) {
                        onError(err);
                    }

                    console.log("fail to save session", err)
                });
        }, err => console.log(err))

    }

    /**
      * Get an account with a given id.
      * @param id The id of the account to retreive
      * @param successCallback Callback when succed
      * @param errorCallback Error Callback.
      */
    public static getAccount(id: string, successCallback: (account: Account) => void, errorCallback: (err: any) => void) {
        if (id == null || id == "") {
            errorCallback("No account id given to getAccount function!")
            return
        }


        let accountId = id
        let domain = Backend.globular.domain

        if (accountId.indexOf("@") == -1) {
            accountId = id + "@" + domain
        } else {
            domain = accountId.split("@")[1]
            id = accountId.split("@")[0]
        }

        if (AccountController.__accounts__[accountId] != null) {
            successCallback(AccountController.__accounts__[accountId]);
            return
        }

        let globule = Backend.getGlobule(domain)
        if (globule == null) {
            errorCallback("Globule not found")
            return
        }

        generatePeerToken(globule, token => {
            let rqst = new GetAccountsRqst
            rqst.setQuery(`{"_id":"${id}"}`); // search by name and not id... the id will be retreived.
            rqst.setOptions(`[{"Projection":{"_id":1, "email":1, "name":1, "groups":1, "organizations":1, "roles":1, "domain":1}}]`);

            if (globule.resourceService == null) {
                errorCallback("Resource service not found")
                return
            }


            let stream = globule.resourceService.getAccounts(rqst, { domain: domain, token: token })
            let data: Account;

            stream.on("data", (rsp) => {
                if (rsp.getAccountsList().length == 0) {
                    errorCallback("no account found with id " + accountId)
                    return
                }
                data = rsp.getAccountsList()[0];
            });

            stream.on("status", (status) => {
                if (status.code == 0) {

                    // Initialyse the data...
                    if (!data) {
                        errorCallback("no account found with id " + accountId)
                        return
                    }

                    AccountController.__accounts__[accountId] = data;

                    AccountController.initSession(data, () => {
                        AccountController.initData(data, (account: Account) => {
                            let user_id = localStorage.getItem("user_id")
                            if (user_id == account.getId()) {
                                AccountController.__account__ = account;
                                let globule = Backend.getGlobule(account.getDomain())
                                globule.eventHub.publish("login_success_", account, true);
                            }
                            successCallback(account)
                        }, errorCallback)

                    }, errorCallback)

                } else {
                    errorCallback(status.details);
                }
            })

        }, err => displayMessage(err, 3000))
    }

    /**
     * Must be called once when the session open.
     * @param account 
     */
    static initData(account: Account, callback: (account: Account) => void, errorCallback: (err: any) => void) {

        let globule = Backend.getGlobule(account.getDomain())
        if (globule == null) {
            errorCallback("Globule not found")
            return
        }

        // Retreive user data... 
        AccountController.readOneUserData(
            `{"_id":"${account.getId()}"}`, // The query is made on the user database and not local_ressource Accounts here so name is name_ here
            account.getName(), // The database to search into 
            globule.domain,
            (data: any) => {

                if (data == null) {
                    errorCallback("no data found for the user")
                    return
                }

                // Set the data in the account object.
                for (let key in data) {
                    (account as any)[key] = data[key]
                }

                callback(account)

            },
            errorCallback
        );
    }


    /**
     * Read user data one result at time.
     */
    private static readOneUserData(
        query: string,
        userName: string,
        userDomain: string,
        successCallback: (results: any) => void,
        errorCallback: (err: any) => void
    ) {

        let rqst = new FindOneRqst();

        // remove unwanted characters
        let id = userName.split("@").join("_").split(".").join("_")
        let db = id + "_db";

        // set the connection id.
        rqst.setId(id);
        rqst.setDatabase(db);

        let collection = "user_data";
        rqst.setCollection(collection);
        rqst.setQuery(query);
        rqst.setOptions("");

        let globule = Backend.getGlobule(userDomain)
        generatePeerToken(globule, token => {

            if (globule.persistenceService == null) {
                errorCallback("Persistence service not found")
                return
            }

            // call persist data
            globule.persistenceService
                .findOne(rqst, {
                    token: token,
                    domain: globule.domain // the domain at the origin of the request.
                })
                .then((rsp: any) => {
                    let data = rsp.getResult().toJavaScript();
                    successCallback(data);
                })
                .catch((err: any) => {
                    if (err.code == 13) {

                        if (AccountController.account == null) {
                            displayMessage("no connections found on the server you need to login", 3000)
                            setTimeout(() => {
                                localStorage.removeItem("remember_me");
                                localStorage.removeItem("user_token");
                                localStorage.removeItem("user_id");
                                localStorage.removeItem("user_name");
                                localStorage.removeItem("user_email");
                                localStorage.removeItem("token_expired");
                                location.reload();
                                return;
                            }, 3000)
                        }

                        if (AccountController.account.getId() == id) {
                            if (err.message.indexOf("no documents in result") != -1) {
                                successCallback({});
                            } else {
                                displayError("no connection found on the server you need to login", 3000)
                                setTimeout(() => {
                                    localStorage.removeItem("remember_me");
                                    localStorage.removeItem("user_token");
                                    localStorage.removeItem("user_id");
                                    localStorage.removeItem("user_name");
                                    localStorage.removeItem("user_email");
                                    localStorage.removeItem("token_expired");
                                    location.reload();
                                    return;
                                }, 3000)
                            }
                        } else {
                            successCallback({});
                        }
                    } else {
                        errorCallback(err);
                    }
                });
        }, err => displayError(err, 3000))


    }

    /**
     * Close the current session explicitelty.
     */
    static logout() {

        // Send local event.
        if (AccountController.account != undefined) {

            // So here I will set the account session state to onlise.
            (AccountController.account as any).session.setState(SessionState.OFFLINE);

            AccountController.saveSession(() => {

                let name = AccountController.account.getName();
                if (AccountController.account.getFirstname() != "" && AccountController.account.getLastname() != "") {
                    name = AccountController.account.getFirstname() + " " + AccountController.account.getLastname();
                }

                let html = `
                <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: white; padding: 20px; border-radius: 10px;">
    
                    <h4>Bye Bye</h4>
                    <div style="font-size: 1.1rem; font-wegith: 400;"> ${name}!</div>
                    <img src="${AccountController.account.getProfilepicture()}" style="width: 100px; height: auto; border-radius: 50%;"/>
                    <p>See you soon...</p>
                
                </div>
                        `;

                displayMessage(html, 3000)
                Backend.getGlobule(AccountController.account.getDomain()).eventHub.publish(`session_state_${ (AccountController.account as any).session.getAccountid()}_change_event`,  (AccountController.account as any).session.serializeBinary(), false)
            }, err => console.log(err))
        }

        // remove token informations
        localStorage.removeItem("remember_me");
        localStorage.removeItem("user_token");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_email");
        localStorage.removeItem("token_expired");


        setTimeout(() => {
            window.location.href = window.location.origin + window.location.pathname.split('/').slice(0, -1).join('/');
        }, 3000)
    }

    // Authenticate the 'sa' user on the globule...
    static authenticate(globule: Globular, user: string, password: string, callback: (token: string) => void, errorCallback: (err: any) => void) {
        let rqst = new AuthenticateRqst();
        rqst.setName(user);
        rqst.setIssuer(globule.config.Mac)
        rqst.setPassword(password);

        // Check if the authentication service is available
        if (!globule.authenticationService) {
            errorCallback("The authentication service is not available.");
            return;
        }

        globule.authenticationService.authenticate(rqst, {}).then((response) => {
            // Set the token
            const token = response.getToken();

            // save the token in the local storage
            //localStorage.setItem("user_token", token);
            // Here I will set the token in the localstorage.
            let decoded = jwt(token);
            let userName = (<any>decoded).username;
            let email = (<any>decoded).email;
            let id = (<any>decoded).id;
            let address = (<any>decoded).address;
            let userDomain = (<any>decoded).user_domain;


            // here I will save the user token and user_name in the local storage.
            localStorage.setItem("user_token", token);
            localStorage.setItem("token_expired", (<any>decoded).exp);
            localStorage.setItem("user_email", email);
            localStorage.setItem("user_name", userName);
            localStorage.setItem("user_id", id);
            localStorage.setItem("user_domain", userDomain);

            let rqst = new CreateConnectionRqst
            let connectionId = userName.split("@").join("_").split(".").join("_");

            // So here i will open the use database connection.
            let connection = new Connection
            connection.setId(connectionId)
            connection.setUser(connectionId)
            connection.setPassword(password)
            connection.setStore(globule.config.BackendStore)
            connection.setName(id + "_db")
            connection.setPort(globule.config.BackendPort)
            connection.setTimeout(60)
            connection.setHost(address)
            rqst.setConnection(connection)

            if (globule.persistenceService == null) {
                errorCallback("Persistence service not found")
                return
            }

            globule.persistenceService.createConnection(rqst, {
                token: token,
                domain: globule.domain,
                address: address
            }).then(() => {

                AccountController.getAccount(id, (account) => {
                    AccountController.__account__ = account;

                    // set the session state to connected
                    (AccountController.account as any).session.setState(SessionState.ONLINE);
                    (AccountController.account as any).session.setLastStateTime(Math.round(new Date().getTime() / 1000));

                    AccountController.saveSession(() => {
                        displayMessage("Welcome " + userName, 3000)
                        Backend.getGlobule(userDomain).eventHub.publish(`session_state_${ (AccountController.account as any).session.getAccountid()}_change_event`,  (AccountController.account as any).session.serializeBinary(), false)
                    }, errorCallback)


                    callback(token)

                }, errorCallback)
            })

        }).catch((err) => {
            errorCallback(err);
        });
    }

    /**
     * Register a new account with the application.
     * @param name The account name
     * @param email The account email
     * @param password The account password
     */
    static register(
        name: string,
        email: string,
        password: string,
        confirmPassord: string,
        domain: string,
        onRegister: (account: Account) => void,
        onError: (err: any) => void,
        globule: Globular = Backend.globular,
        firstName: string = "",
        lastName: string = "",
        profilePicture: string = "",
    ) {
        if (confirmPassord.length == 0) {
            onError("Please confirm your password")
            return
        }

        // Create the register request.
        let rqst = new RegisterAccountRqst();
        rqst.setConfirmPassword(confirmPassord);

        let account = new Account();

        account.setEmail(email);
        account.setName(name);
        account.setId(name)
        account.setDomain(domain)

        // Set the user refresh token.
        if (password.length == 0) {
            account.setRefreshtoken(confirmPassord); // Confirm password is the refresh token in that case.
        } else {
            account.setPassword(password);
        }

        if (firstName != "") {
            account.setFirstname(firstName)
        }

        if (lastName != "") {
            account.setLastname(lastName)
        }

        if (profilePicture != "") {
            account.setProfilepicture(profilePicture)
        }

        rqst.setAccount(account);



        if (globule.resourceService == null) {
            onError("Resource service not found")
            return
        }


        // Register a new account.
        globule.resourceService
            .registerAccount(rqst)
            .then((rsp: RegisterAccountRsp) => {
                // Here I will set the token in the localstorage.
                let token = rsp.getResult();
                let decoded = jwt(token);

                // here I will save the user token and user_name in the local storage.
                localStorage.setItem("user_token", token);
                localStorage.setItem("user_id", (<any>decoded).id);
                localStorage.setItem("user_name", (<any>decoded).username);
                localStorage.setItem("token_expired", (<any>decoded).exp);
                localStorage.setItem("user_email", (<any>decoded).email);
                localStorage.setItem("user_domain", (<any>decoded).user_domain);


                let rqst = new CreateConnectionRqst
                let connectionId = name.split("@").join("_").split(".").join("_");

                let address = (<any>decoded).address;
                let domain = (<any>decoded).domain;

                // So here i will open the use database connection.
                let connection = new Connection
                connection.setId(connectionId)
                connection.setUser(connectionId)
                connection.setPassword(password) // in case of no password set the refresh token as password.
                connection.setStore(globule.config.BackendStore)
                connection.setName(name + "_db")
                connection.setPort(globule.config.BackendPort)
                connection.setTimeout(60)
                connection.setHost(address)
                rqst.setConnection(connection)

                if (globule.persistenceService == null) {
                    onError("Persistence service not found")
                    return
                }

                globule.persistenceService.createConnection(rqst, {
                    token: token,
                    domain: domain,
                    address: address
                }).then(() => {
                    // Callback on login.
                    AccountController.__account__ = account;
                    AccountController.initSession(account, () => {
                        AccountController.initData(account, (account) => {
                            onRegister(account)
                            Backend.eventHub.publish("login_success_", AccountController.account, true);
                        }, (err) => {
                            onRegister(account)
                            Backend.eventHub.publish("login_success_", AccountController.account, true);
                            onError(err);
                        })
                    }, onError)

                }).catch(err => {
                    onError(err);
                })

            })
            .catch((err: any) => {
                onError(err);
            });

        return null;
    }

    ///////////////////////////////////////////////////////////////////
    // Contacts.
    ///////////////////////////////////////////////////////////////////

    static getContacts(account: Account, query: string, callback: (contacts: Array<any>) => void, errorCallback: (err: any) => void) {

        // Insert the notification in the db.
        let rqst = new FindRqst();

        // set connection infos.
        let id = account.getName().split("@").join("_").split(".").join("_")
        let db = id + "_db";

        rqst.setId(id);
        rqst.setDatabase(db);
        rqst.setCollection("Contacts");
        rqst.setQuery(query);
        let globule = Backend.getGlobule(account.getDomain())

        generatePeerToken(globule, token => {
            if (globule.persistenceService == null) {
                errorCallback("Persistence service not found")
                return
            }

            let stream = globule.persistenceService.find(rqst, {
                token: token,
                domain: globule.domain
            });

            let data: any;
            data = [];

            stream.on("data", (rsp: FindResp) => {
                data = mergeTypedArrays(data, rsp.getData());
            });

            stream.on("status", (status) => {
                if (status.code == 0) {
                    uint8arrayToStringMethod(data, (str: string) => {
                        let contacts = JSON.parse(str);
                        callback(contacts);
                    });
                } else {
                    console.log("fail to retreive contacts with error: ", status.details)
                    // In case of error I will return an empty array
                    callback([]);
                }
            });
        }, errorCallback)
    }

    public static setContact(from: Account, status_from: string, to: Account, status_to: string, successCallback: () => void, errorCallback: (err: any) => void) {

        // So here I will save the contact invitation into pending contact invitation collection...
        let rqst = new SetAccountContactRqst
        rqst.setAccountid(from.getId() + "@" + from.getDomain())

        let contact = new Contact
        contact.setId(to.getId() + "@" + to.getDomain())
        contact.setStatus(status_from)
        contact.setInvitationtime(Math.round(Date.now() / 1000))

        // Test if the ringtone is set for the contact.
        let ringtone = (to as any).ringtone

        // Set optional values...
        if (ringtone)
            contact.setRingtone(ringtone)

        if (to.getProfilepicture())
            contact.setProfilepicture(to.getProfilepicture())

        rqst.setContact(contact)
        let globule = Backend.getGlobule(from.getDomain())


        generatePeerToken(globule, token => {

            if (globule.resourceService == null) {
                errorCallback("Resource service not found")
                return
            }

            globule.resourceService.setAccountContact(rqst, {
                token: token,
                domain: globule.domain
            })
                .then((rsp: SetAccountContactRsp) => {

                    let sentInvitation = `{"_id":"${to.getId() + "@" + to.getDomain()}", "invitationTime":${Math.floor(Date.now() / 1000)}, "status":"${status_from}"}`

                    Backend.getGlobule(from.getDomain()).eventHub.publish(status_from + "_" + from.getId() + "@" + from.getDomain() + "_evt", sentInvitation, false)
                    if (from.getDomain() != to.getDomain()) {
                        Backend.getGlobule(to.getDomain()).eventHub.publish(status_from + "_" + from.getId() + "@" + from.getDomain() + "_evt", sentInvitation, false)
                    }

                    // Here I will return the value with it
                    let rqst = new SetAccountContactRqst
                    rqst.setAccountid(to.getId() + "@" + to.getDomain())

                    let contact = new Contact
                    contact.setId(from.getId() + "@" + from.getDomain())
                    contact.setStatus(status_to)
                    contact.setInvitationtime(Math.round(Date.now() / 1000))
                    rqst.setContact(contact)

                    // So here I will save the contact invitation into pending contact invitation collection...
                    let resourceServiceTo = Backend.getGlobule(to.getDomain()).resourceService
                    if (resourceServiceTo == null) {
                        errorCallback("Resource service not found")
                        return
                    }

                    // call persist data
                    resourceServiceTo
                        .setAccountContact(rqst, {
                            token: token,
                            domain: Backend.domain
                        })
                        .then((rsp: ReplaceOneRsp) => {
                            // Here I will return the value with it
                            let receivedInvitation = `{"_id":"${from.getId() + "@" + from.getDomain()}", "invitationTime":${Math.floor(Date.now() / 1000)}, "status":"${status_to}"}`
                            Backend.getGlobule(from.getDomain()).eventHub.publish(status_to + "_" + to.getId() + "@" + to.getDomain() + "_evt", receivedInvitation, false)
                            if (from.getDomain() != to.getDomain()) {
                                Backend.getGlobule(to.getDomain()).eventHub.publish(status_to + "_" + to.getId() + "@" + to.getDomain() + "_evt", receivedInvitation, false)
                            }
                            successCallback();
                        })
                        .catch(errorCallback);
                }).catch(errorCallback);
        }, errorCallback)


    }

    // Invite a new contact.
    static onInviteContact(contact: Account) {
        // Create the user notification
        let mac = Backend.getGlobule(contact.getDomain()).config.Mac
        let recipient = contact.getId() + "@" + contact.getDomain()
        let message = `<div style="display: flex; flex-direction: column;">
        <p>
            ${AccountController.account.getName()} want to add you as contact.<br>Click the <iron-icon id="Contacts_icon" icon="social:people"></iron-icon> button to accept or decline the invitation.
        </p>
        </div>`

        // Send the notification.
        NotificationController.sendNotifications(recipient, mac, message, NotificationType.USER_NOTIFICATION,
            () => {
                AccountController.setContact(AccountController.account, "sent", contact, "received",
                    () => {
                        // this.displayMessage(, 3000)
                    }, (err: any) => {
                        displayError(err, 3000)
                    })
            },
            (err: any) => {
                displayError(err, 3000);
            }
        );
    }

    // Accept contact.
    static onAcceptContactInvitation(contact: Account) {
        // Create a user notification.
        let mac = Backend.getGlobule(contact.getDomain()).config.Mac
        let recipient = contact.getId() + "@" + contact.getDomain()

        let message = `<div style="display: flex; flex-direction: column;">
            <p>
            ${AccountController.account.getEmail()} accept you as contact.
            <br>Click the <iron-icon id="Contacts_icon" icon="social:people"></iron-icon> button to get more infos.
            </p>
        </div>`


        // Send the notification.
        NotificationController.sendNotifications(recipient, mac, message, NotificationType.USER_NOTIFICATION,
            () => {
                AccountController.setContact(AccountController.account, "accepted", contact, "accepted",
                    () => {
                        // this.displayMessage(, 3000)
                    }, (err: any) => {
                        displayError(err, 3000)
                    })
            },
            (err: any) => {
                displayError(err, 3000);
            }
        );
    }

    // Decline contact invitation.
    static onDeclineContactInvitation(contact: Account) {

        let mac = Backend.getGlobule(contact.getDomain()).config.Mac
        let recipient = contact.getId() + "@" + contact.getDomain()
        let message = `
        <div style="display: flex; flex-direction: column;">
          <p>
            Unfortunately ${AccountController.account.getEmail()} declined your invitation.
            <br>Click the <iron-icon id="Contacts_icon" icon="social:people"></iron-icon> button to get more infos.
          </p>
        </div>`

        // Send the notification.
        NotificationController.sendNotifications(recipient, mac, message, NotificationType.USER_NOTIFICATION,
            () => {
                AccountController.setContact(AccountController.account, "declined", contact, "declined",
                    () => {
                        // this.displayMessage(, 3000)
                    }, (err: any) => {
                        displayError(err, 3000)
                    })
            },
            (err: any) => {
                displayError(err, 3000);
            }
        );
    }

    // Revoke contact invitation.
    static onRevokeContactInvitation(contact: Account) {

        let mac = Backend.getGlobule(contact.getDomain()).config.Mac
        let recipient = contact.getId() + "@" + contact.getDomain()
        let message = `
        <div style="display: flex; flex-direction: column;">
          <p>
            Unfortunately ${AccountController.account.getEmail()} revoke the invitation.
            <br>Click the <iron-icon id="Contacts_icon" icon="social:people"></iron-icon> button to get more infos.
          </p>
        </div>`

        // Send the notification.
        NotificationController.sendNotifications(recipient, mac, message, NotificationType.USER_NOTIFICATION,
            () => {
                AccountController.setContact(AccountController.account, "revoked", contact, "revoked",
                    () => {
                        // this.displayMessage(, 3000)
                    }, (err: any) => {
                        displayError(err, 3000)
                    })
            },
            (err: any) => {
                displayError(err, 3000);
            }
        );
    }

    // Delete contact invitation.
    static onDeleteContact(contact: Account) {

        let mac = Backend.getGlobule(contact.getDomain()).config.Mac
        let recipient = contact.getId() + "@" + contact.getDomain()
        let message = `
      <div style="display: flex; flex-direction: column;">
        <p>
          You and ${AccountController.account.getEmail()} are no more in contact.
          <br>Click the <iron-icon id="Contacts_icon" icon="social:people"></iron-icon> button to get more infos.
        </p>
      </div>`

        // Send the notification.
        NotificationController.sendNotifications(recipient, mac, message, NotificationType.USER_NOTIFICATION,
            () => {
                AccountController.setContact(AccountController.account, "deleted", contact, "deleted",
                    () => {
                        // this.displayMessage(, 3000)
                    }, (err: any) => {
                        displayError(err, 3000)
                    })
            },
            (err: any) => {
                displayError(err, 3000);
            }
        );
    }
}