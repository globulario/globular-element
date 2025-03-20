import { GetSharedResourceRqst, RemoveSubjectFromShareRqst, SubjectType } from "globular-web-client/rbac/rbac_pb";
import { AccountController } from "../../backend/account";
import { Backend, displayError, displayMessage, generatePeerToken } from "../../backend/backend";
import getUuidByString from "uuid-by-string"
import { Account, Group } from "globular-web-client/resource/resource_pb";
import { FileController } from "../../backend/file";
import { Link } from "../link";

/**
 * That panel display resource share with a given subject (account, group, organization etc.)
 */
export class SharedResources extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(subject) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // the file explorer.
        this._file_explorer_ = null;


        this.subject = subject

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
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
         
            #container{
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            .resource-share-div{
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
            }

            #you-share-with-div{
                display: flex;
                flex-wrap: wrap;
                margin-top: 10px;
            }

            #share-with-you-div{
                display: flex;
                flex-wrap: wrap;
                margin-top: 10px;
            }

            globular-link{
                margin-left: 15px;
            }

            /* Need to position the badge to look like a text superscript */
            paper-tab {
              padding-right: 25px;
            }

            paper-tabs{                  
                /* custom CSS property */
                --paper-tabs-selection-bar-color: var(--primary-color); 
                color: var(--primary-text-color);
                --paper-tab-ink: var(--palette-action-disabled);
            }

            paper-tab paper-badge {
                --paper-badge-background: var(--palette-warning-main);
                --paper-badge-width: 16px;
                --paper-badge-height: 16px;
                --paper-badge-margin-left: 10px;
            }

            @media(max-width: 500px){
                #container{
                    width: 100vw - 10px);
                    margin: 0px;
                }

                .resource-share-div {
                    margin: 0px;
                    width: calc(100vw - 10px);
                    
                }

            }

        </style>
        <div id="container">
            <paper-tabs selected="0">
                <paper-tab id="share-with-you"">
                    Share with you
                </paper-tab>
                <paper-tab id="you-share-with">
                    You share with
                </paper-tab>
            </paper-tabs>

            <div class="resource-share-div">
                <div id="scroll-container" style="position: absolute; overflow-y: auto; top:0px; left:0px; right: 0px; bottom: 0px;">
                    <div id="share-with-you-div"></div>
                    <div id="you-share-with-div" style="display: none;"></div>
                </div>
                
            </div>

        </div>
        `
        // give the focus to the input.
        let scrollContainer = this.shadowRoot.querySelector("#scroll-container")
        scrollContainer.onscroll = () => {
            if (scrollContainer.scrollTop == 0) {
                scrollContainer.style.boxShadow = ""
                scrollContainer.style.borderTop = ""
            } else {
                scrollContainer.style.boxShadow = "inset 0px 5px 6px -3px rgb(0 0 0 / 40%)"
                scrollContainer.style.borderTop = "1px solid var(--palette-divider)"
            }
        }



    }

    connectedCallback() {

        // get resources share with a given account...
        let youShareWithDiv = this.shadowRoot.querySelector("#you-share-with-div")
        youShareWithDiv.innerHTML = ""

        let shareWithYouDiv = this.shadowRoot.querySelector("#share-with-you-div")
        shareWithYouDiv.innerHTML = ""

        this.shadowRoot.querySelector("#share-with-you").onclick = () => {
            youShareWithDiv.style.display = "none"
            shareWithYouDiv.style.display = "flex"
        }


        this.shadowRoot.querySelector("#you-share-with").onclick = () => {
            youShareWithDiv.style.display = "flex"
            shareWithYouDiv.style.display = "none"
        }

        // The logged user... ( 'you' in the context of a session)
        this.getSharedResources(AccountController.account, this.subject, resources => {
            this.displaySharedResources(youShareWithDiv, resources, this.subject, true)
            this.getSharedResources(this.subject, AccountController.account, resources => {
                this.displaySharedResources(shareWithYouDiv, resources, this.subject, false)
            })
        })
    }

    displaySharedResources(div, resources, subject, deleteable) {

        let range = document.createRange()
        let displayLink = () => {
            let r = resources.pop()
            let globule = Backend.getGlobule(r.getDomain())
            FileController.getFile(globule, r.getPath(), 100, 64, file => {
                let id = "_" + getUuidByString(file.getPath())

                // so here I will determine if I display the deleteable icon...
                let deleteable_ = deleteable
                if (deleteable) {
                    // Here I will make sure that the delete button has an effect on the share.
                    // for exemple is the permission is at group level i will not display delete
                    // button at accout level even if the resource appear in the list. To remove the
                    // resource the user must remove group permission on it.
                    if (subject instanceof Account) {
                        deleteable_ = r.getAccountsList().indexOf(subject.getId() + "@" + subject.getDomain()) != -1
                    } else if (subject instanceof Group) {
                        deleteable_ = r.getGroupsList().indexOf(subject.getId() + "@" + subject.getDomain()) != -1
                    } else if (subject instanceof Application) {
                        deleteable_ = r.getApplicationList().indexOf(subject.getId() + "@" + subject.getDomain()) != -1
                    } else if (subject instanceof Organization) {
                        deleteable_ = r.getOrganizationList().indexOf(subject.getId() + "@" + subject.getDomain()) != -1
                    }
                }

                let alias = ""
                if (file.videos) {
                    alias = file.videos[0].getDescription()
                } else if (file.titles) {
                    alias = file.titles[0].getName()
                } else if (file.audios) {
                    alias = file.audio[0].getTitle()
                }



                let html = `<globular-link alias="${alias}" mime="${file.getMime()}" id="${id}" ${deleteable_ ? "deleteable" : ""} path="${file.getPath()}" thumbnail="${file.getThumbnail()}" domain="${globule.domain}"></globular-link>`
                div.appendChild(range.createContextualFragment(html))
                if (resources.length > 0) {
                    displayLink();
                }

                let lnk = div.querySelector(`#${id}`)
                lnk._file_explorer_ = this._file_explorer_
                
                lnk.ondelete = () => {

                    // so now I will remove share resource.
                    let rqst = new RemoveSubjectFromShareRqst

                    rqst.setDomain(globule.domain)
                    rqst.setPath(file.getPath())

                    if (subject instanceof Account) {
                        rqst.setType(SubjectType.ACCOUNT)
                    } else if (subject instanceof Group) {
                        rqst.setType(SubjectType.GROUP)
                    } else if (subject instanceof Application) {
                        rqst.setType(SubjectType.APPLICATION)
                    } else if (subject instanceof Organization) {
                        rqst.setType(SubjectType.ORGANIZATION)
                    }

                    // set the subject domain.
                    rqst.setSubject(subject.getId() + "@" + subject.getDomain())
                    generatePeerToken(globule, token => {
                        globule.rbacService.removeSubjectFromShare(rqst, { domain: globule.domain, token: token })
                            .then(
                                // Display message...
                                displayMessage("Subject " + subject.getId() + " was removed from shared of " + file.getPath(), 3000)

                            ).catch(err => displayError(err))
                    })


                }

            }, err => {
                console.log(err);
                if (resources.length > 0) {
                    displayLink()
                }
            })
        }

        if (resources.length > 0) {
            displayLink()
        }
    }

    // Return the list of resource for a given subject.
    // Return the list of resources for a given subject.
    getSharedResources(share_by, share_with, callback) {
        if (share_by == null || share_with == null) {
            return;
        }

        let globules = Backend.getGlobules();
        let resources = [];

        let getSharedResource_ = () => {
            let globule = globules.pop();
            let rqst = new GetSharedResourceRqst();

            // Determine if share_with is an account or a group.
            let isAccount = share_with instanceof Account; // Assuming Account is a class

            if (isAccount) {
                rqst.setType(SubjectType.ACCOUNT);
            } else {
                rqst.setType(SubjectType.GROUP);
            }

            rqst.setSubject(share_with.getId() + "@" + share_with.getDomain());
            rqst.setOwner(share_by.getId() + "@" + share_by.getDomain());

            // Get file shared by account.
            globule.rbacService.getSharedResource(rqst, { domain: globule.domain})
                .then(rsp => {
                    resources = resources.concat(rsp.getSharedresourceList());
                    if (globules.length === 0) {
                        callback(resources);
                    } else {
                        getSharedResource_();
                    }
                }).catch(err => {
                    console.error("Error fetching shared resources:", err);
                    if (globules.length === 0) {
                        callback(resources);
                    } else {
                        getSharedResource_();
                    }
                });
        };

        if (globules.length > 0) {
            getSharedResource_();
        }
    }

}

customElements.define('globular-shared-resources', SharedResources)
