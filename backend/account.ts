import { Account, GetAccountsRqst, GetSessionRequest, GetSessionResponse, Session, SessionState, UpdateSessionRequest, UpdateSessionResponse } from "globular-web-client/resource/resource_pb";
import { Backend, displayError, displayMessage, generatePeerToken } from "./backend";
import { Globular } from "globular-web-client";
import { AuthenticateRqst } from "globular-web-client/authentication/authentication_pb";
import jwt from 'jwt-decode';
import { GetSubjectAvailableSpaceRqst, SubjectType } from "globular-web-client/rbac/rbac_pb";
import { Connection, FindOneRqst, CreateConnectionRqst } from "globular-web-client/persistence/persistence_pb";
import { on } from "process";
import { ApplicationController } from "./applications";

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
    static getAccounts(globule: Globular, query: string, callback: (accounts: Array<Account>) => void, errorCallback: (err: any) => void) {

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
                    if (query == "{}") {
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
                    initAccountData();

                } else {
                    // In case of error I will return an empty array
                    errorCallback(status.details)
                }
            });
        }, errorCallback)
    }

    static getSession(account: Account, callback: () => void, errorCallback: (err: any) => void) {

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
                    callback()

                }).catch(errorCallback);
        }, errorCallback);


    }

    /**
     * 
     * @param account 
     * @param initCallback 
     * @param errorCallback 
     */
    static initSession(account: Account, successCallback: () => void, errorCallback: (err: any) => void) {
        generatePeerToken(Backend.globular, token => {
            let accountId = account.getId() + "@" + account.getDomain()
            let globule = Backend.getGlobule(account.getDomain())

            AccountController.getSession(account, () => {

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
                            successCallback()
                        })
                        .catch((err) => {
                            errorCallback(err);
                        });
                } else {
                    successCallback()
                }

                // So here I will lisen on session change event and keep this object with it.
                globule.eventHub.subscribe(`session_state_${account.getId() + "@" + account.getDomain()}_change_event`,
                    (uuid: string) => {
                        /** nothing special here... */
                    },
                    (evt: String) => {
                        let session = Session.deserializeBinary(Uint8Array.from(evt.split(",")))
                        console.log("Session state changed", session)
                        // update the session state from the network.
                        //this.state_ = obj.state;
                        //this.lastStateTime = new Date(obj.lastStateTime * 1000); // a number to date

                    }, false, this)

                Backend.eventHub.subscribe(`__session_state_${account.getId() + "@" + account.getDomain()}_change_event__`,
                    (uuid: string) => {
                        /** nothing special here... */
                    },
                    (evt: String) => {
                        let session = Session.deserializeBinary(Uint8Array.from(evt.split(",")))
                        console.log("Session state changed", session)

                        // Set the object state from the object and save it...
                        //this.state_ = obj.state;
                        //this.lastStateTime = obj.lastStateTime; // already a date


                    }, true, this)

            }, errorCallback)
        }, errorCallback)

    }

    // Save session state in the databese.
    static saveSession(onSave: () => void, onError: (err: any) => void) {
        let rqst = new UpdateSessionRequest;
        let session = (this.account as any).session;

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
        session.setExpireAt(Math.round(token_expired))

        rqst.setSession(session)

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
                    globule.eventHub.publish(`session_state_${session.getAccountid()}_change_event`, session.serializeBinary(), false)
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
        if (id.length == 0) {
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
            let session = (AccountController.account as any).session as Session;
            session.setState(SessionState.OFFLINE);
            
            AccountController.saveSession(() => {
                displayMessage(`Bye Bye ${AccountController.account.getId()}!`, 3000)
                Backend.getGlobule(AccountController.account.getDomain()).eventHub.publish(`session_state_${session.getAccountid()}_change_event`, session.serializeBinary(), false)
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
            window.location.reload();
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
                // callback(token);
                AccountController.getAccount(id, (account) => {
                    AccountController.__account__ = account;
                    callback(token)

                    // set the session state to connected
                    let session = (this.account as any).session as Session;
                    session.setState(SessionState.ONLINE);
                    session.setLastStateTime(Math.round(new Date().getTime() / 1000));

                    AccountController.saveSession(() => {
                        displayMessage("Welcome " + userName, 3000)
                        Backend.getGlobule(userDomain).eventHub.publish(`session_state_${session.getAccountid()}_change_event`, session.serializeBinary(), false)
                    }, errorCallback)

                }, errorCallback)
            })

        }).catch((err) => {
            errorCallback(err);
        });
    }

}