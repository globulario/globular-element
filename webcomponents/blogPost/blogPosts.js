import { Backend, displayError, generatePeerToken } from "../../backend/backend";
import { BlogPostElement } from "./blogPost";
import { BlogPostInfo } from "../informationManager/blogPostInfo";
import { AccountController } from "../../backend/account";
import { readBlogPost } from "./blogPost";
import { BlogPost, GetBlogPostsByAuthorsRequest, GetBlogPostsRequest } from "globular-web-client/blog/blog_pb";

/**
 * Display globular blog list.
 */
export class BlogPosts extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(userName) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        if (userName == undefined) {
            if (AccountController.account != undefined) {
                userName = AccountController.account.getId() + "@" + AccountController.account.getDomain()
            } else if (localStorage.getItem("account")) { // get the account from the local storage... 
                userName = localStorage.getItem("user_name") + "@" + localStorage.getItem("user_domain")
            }

        }

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

           

           
            #blog-lst-div {
                height: 100%;
            }

            .blogs{
                display: flex;
                flex-direction: column;
            }

            h2{
                margin-bottom: 4px;
                margin-left: 10px;
                border-bottom: 1px solid var(--palette-divider);
                width: 80%;
            }

            #new-blog-post-btn {
                
            }

            paper-card h1 {
                font-size: 1.65rem;
            }

            .card-content{
                display: flex;
                flex-direction: column;
                margin-bottom: 10px;
                min-width: 728px;
                padding: 0px;
                font-size: 1rem;
              }
      
              @media (max-width: 800px) {
                .card-content{
                  min-width: 580px;
                }
              }
      
              @media (max-width: 500px) {
                .card-content, #blog-lst-div{
                  min-width: calc(100vw - 20px);
                }

                .blogs-div {
                    align-items: center;
                    justify-content: center;
                }
              }
            
        </style>
        <globular-dialog is-moveable="true" is-maximizeable="true" is-resizeable="true" 
            show-icon="true" is-minimizeable="true" id="container" width="800px" height="600px">
            <span id="blog-title" slot="title">Blog(s)</span>
            <slot name="blogs">
                <div id="blog-lst-div">
                    <div class="card-content">
                        <div style="display: flex; border: none;">
                            <div style="display: flex; flex-direction: column; padding-left:10px; flex-grow: 1;">
                                <div style="display: flex; align-items: center;">
                                    <span>new post</span>
                                    <paper-icon-button id="new-blog-post-btn" icon="icons:add" title="Create new Post"></paper-icon-button>
                                </div>
                            </div>
                        </div>
                        <div class="blogs">
                            <h2 id="draft-title">Draft(s)</h2>
                            <div class="blogs-div" style="display: flex; flex-wrap: wrap;">
                                <slot name="draft"></slot>
                            </div>
                        </div>
                        <div class="blogs">
                            <h2 id="published-title">Published(s)</h2>
                            <div class="blogs-div" style="display: flex; flex-wrap: wrap;">
                                <slot name="published"></slot>
                            </div>
                        </div>
                        <div class="blogs">
                            <h2 id="archived-title">Archived(s)</h2>
                            <div class="blogs-div" style="display: flex; flex-wrap: wrap;">
                                <slot name="archived"></slot>
                            </div>
                        </div>
                    </div>
                </div>
            </slot>
            
            <slot name="blog">
            </slot>
            
        </globular-dialog>
        `

        this.listeners = {}

        this.container = this.shadowRoot.querySelector("#container")

        // the list of blogs.
        this.blogsList = this.shadowRoot.querySelector("#blog-lst-div")

        // Display the blog post editor...
        this.shadowRoot.querySelector("#new-blog-post-btn").onclick = () => {
            // Test the blog-post
            let editor = new BlogPostElement()
            editor.setAttribute("editable", "true")
            editor.slot = "blog"

            if(this.querySelector("globular-blog-post") != undefined){
                this.removeChild(this.querySelector("globular-blog-post"))
            }

            this.blogsList.style.display = "none"
            this.appendChild(editor)

            editor.onclose = () => {
                editor.removeAttribute("editable")
                if(editor.parentNode != undefined){
                    editor.parentNode.removeChild(editor)
                }
                this.blogsList.style.display = ""
            }
        }

        // If the blog editor is set to true...
        let authors = []
        AccountController.getAccount(userName,
            account => {
                // Subcribe to my own blog create event...
                Backend.getGlobule(account.getDomain()).eventHub.subscribe(account.getId() + "@" + account.getDomain() + "_publish_blog_event", uuid => this[account.getId() + "@" + account.getDomain() + "_publish_blog_listener"] = uuid,
                    evt => {
                        // Get the date from the event and create the newly
                        this.setBlog(BlogPost.deserializeBinary(Uint8Array.from(evt.split(","))), true)
                    }, false, this)

                authors.push(account.getId() + "@" + account.getDomain())

                this.getBlogs(authors, blogs => {
                    this.setBlogPosts(blogs)
                })
            })
    }

    // Retreive all blog from all connected peers...
    getBlogs(authors, callback) {
        let connections = Array.from(Backend.getGlobules())
        let blogs_ = []

        let _getBlogs_ = () => {
            let globule = connections.pop()
            if (connections.length == 0) {
                this._getBlogs(globule, authors, (blogs) => {
                    blogs_ = blogs_.concat(blogs)
                    blogs_ = blogs_.filter((b0, index, self) =>
                        index === self.findIndex((b1) => (
                            b0.getUuid() === b1.getUuid()
                        ))
                    )

                    if (this.onloaded != undefined)
                        this.onloaded()

                    callback(blogs_)
                })
            } else {
                this._getBlogs(globule, authors, (blogs) => {
                    blogs_ = blogs_.concat(blogs)
                    blogs_ = blogs_.filter((b0, index, self) =>
                        index === self.findIndex((b1) => (
                            b0.getUuid() === b1.getUuid()
                        ))
                    )
                    _getBlogs_() // get the account from the next globule.
                })
            }
        }

        // get account from all register peers.
        _getBlogs_()
    }

    // Get the list of blogs.
    _getBlogs(globule, authors, callback) {

        generatePeerToken(globule, token => {
            let rqst = new GetBlogPostsByAuthorsRequest
            rqst.setAuthorsList(authors)
            rqst.setMax(100)

            let stream = globule.blogService.getBlogPostsByAuthors(rqst, { domain: globule.domain, token: token });
            let blogs = []

            stream.on("data", (rsp) => {
                blogs.push(rsp.getBlogPost())
            });

            stream.on("status", (status) => {
                if (status.code == 0) {
                    callback(blogs)
                } else {
                    callback([])
                }
            })
        }, err => displayError(err, 3000))

    }

    _displayBlog(b) {

        this.blogsList.style.display = "none"
        

        let editor =  new BlogPostElement(b)
        if (this.querySelector("globular-blog-post") != undefined) {
            editor = this.querySelector("globular-blog-post")
            this.removeChild(editor)
        }
       
        editor.slot = "blog"
        this.appendChild(editor)

        editor.onclose = () => {
            editor.removeAttribute("editable")
            if(editor.parentNode != undefined){
                editor.parentNode.removeChild(editor)
            }
            this.blogsList.style.display = ""
        }
    }

    displayBlog(b) {
        console.log("Display blog", b)

        if (b.getText().length > 0) {
            this._displayBlog(b)
        } else {
            let rqst = new GetBlogPostsRequest
            let id = b.blogPost.getUuid()
            rqst.setUuidsList([id])

            let token = localStorage.getItem("user_token")
            let globule = b.globule
            let stream = globule.blogService.getBlogPosts(rqst, { application: Application.application, domain: globule.domain, token: token })

            stream.on("data", (rsp) => {
                b = rsp.getBlogPost()
            });

            stream.on("status", (status) => {
                if (status.code == 0) {
                    Backend.eventHub.publish("_hide_search_results_", null, true)
                    this._displayBlog(b)
                } else {
                    displayError(status.details, 3000)
                }
            })
        }
    }


    setBlog(b) {
        let blogInfo = this.querySelector("#_" + b.getUuid() + "_info")
        if (blogInfo == undefined) {
            blogInfo = new BlogPostInfo(b, true)
            blogInfo.id = "_" + b.getUuid() + "_info"
            console.log("300 Blog info", blogInfo.id)
            blogInfo.onclick = () => {
                this.displayBlog(b)
            }

            this.appendChild(blogInfo)
        }else{
            console.log("Blog already exist")
            blogInfo.setBlog(b)
        }

        if (b.getStatus() == 0) {
            blogInfo.slot = "draft"
        } else if (b.getStatus() == 1) {
            blogInfo.slot = "published"
        } else if (b.getStatus() == 2) {
            blogInfo.slot = "archived"
        }

        // Display the total number of blog...
        this.shadowRoot.querySelector("#blog-title").innerHTML = `Blog(${this.querySelectorAll(`globular-blog-post-info`).length})`

        // Set the section titles.
        this.shadowRoot.querySelector("#draft-title").innerHTML = `Draft(${this.querySelectorAll(`[slot="draft"]`).length})`
        this.shadowRoot.querySelector("#published-title").innerHTML = `Published(${this.querySelectorAll(`[slot="published"]`).length})`
        this.shadowRoot.querySelector("#archived-title").innerHTML = `Archived(${this.querySelectorAll(`[slot="archived"]`).length})`

        // listen for change...
        if (this.listeners[b.getUuid() + "_blog_updated_event_listener"] == undefined) {

            Backend.getGlobule(b.getDomain()).eventHub.subscribe(b.getUuid() + "_blog_updated_event", uuid => {
                this.listeners[b.getUuid() + "_blog_updated_event_listener"] = uuid
            }, evt => {
                // so here I will refresh the blog...
                readBlogPost(b.getDomain(), b.getUuid(), b => {
                    this.setBlog(b)
                }, err => displayError(err, 3000))
            }, false, this)
        }

        Backend.eventHub.subscribe("_blog_delete_event_", uuid => { },
            evt => {
                // The number of blog has change...
                let blogInfo = this.querySelector("#_" + evt + "_info")
                if (blogInfo) {
                    if (blogInfo.parentNode != undefined) {
                        blogInfo.parentNode.removeChild(blogInfo)
                    }
                }

                this.shadowRoot.querySelector("#blog-title").innerHTML = `Blog(${this.querySelectorAll(`globular-blog-post-info`).length})`

                this.shadowRoot.querySelector("#draft-title").innerHTML = `Draft(${this.querySelectorAll(`[slot="draft"]`).length})`
                this.shadowRoot.querySelector("#published-title").innerHTML = `Published(${this.querySelectorAll(`[slot="published"]`).length})`
                this.shadowRoot.querySelector("#archived-title").innerHTML = `Archived(${this.querySelectorAll(`[slot="archived"]`).length})`

            }, true)


    }

    // The list of blogs
    setBlogPosts(blogs) {
        blogs.sort((a, b) => { return b.getCreationtime() - a.getCreationtime() })
        blogs.forEach(b => {
            // This contain the 
            this.setBlog(b)
        })
    }

}

customElements.define('globular-blog-posts', BlogPosts)
