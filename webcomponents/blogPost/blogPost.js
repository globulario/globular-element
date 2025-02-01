import { CreateBlogPostRequest, DeleteBlogPostRequest, GetBlogPostsRequest, SaveBlogPostRequest } from "globular-web-client/blog/blog_pb";
import { AccountController } from "../../backend/account";
import { Backend, displayMessage, displayError, generatePeerToken } from "../../backend/backend";
import { BlogComments } from "./blogPostComment.js";
import { v4 as uuidv4 } from 'uuid';
import '@polymer/iron-icons/communication-icons'
import '@polymer/iron-icons/editor-icons'

// Import the editorjs
import EditorJS from '@editorjs/editorjs';
import * as edjsHTML from 'editorjs-html';
import RawTool from '@editorjs/raw';
import Header from '@editorjs/header';
import Delimiter from '@editorjs/delimiter';
import Embed from '@editorjs/embed';
import Table from '@editorjs/table'
import Quote from '@editorjs/quote'
import SimpleImage from '@editorjs/simple-image'
import NestedList from '@editorjs/nested-list';
import Checklist from '@editorjs/checklist';
import Paragraph from 'editorjs-paragraph-with-alignment'
import CodeTool from '@editorjs/code'
import Underline from '@editorjs/underline';
import DragDrop from 'editorjs-drag-drop';
import Undo from 'editorjs-undo';
import FileDropZoneTool from "./fileDropZone.js";



const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
];

// Get the image default size...
function getMeta(url, callback) {
    const img = new Image();
    img.addEventListener("load", () => {
        callback({ width: img.naturalWidth, height: img.naturalHeight });
    });
    img.src = url;
}

// generate html from json data
export function jsonToHtml(data) {

    // So here I will get the plain html from the output json data.
    function filesParser(block) {
        let jsonStr = JSON.stringify(block.data.files)
        return `<globular-file-drop-zone files='${btoa(jsonStr)}'>  </globular-file-drop-zone>`;
    }

    const edjsParser = edjsHTML({ files: filesParser });

    let elements = edjsParser.parse(data);
    let html = ""
    elements.forEach(e => {
        html += e
    });

    var div = document.createElement('div');
    div.className = "blog-read-div"
    div.slot = "read-only-blog-content"
    div.innerHTML = html.trim();

    // Now I will set image height.
    let images = div.querySelectorAll("img")
    images.forEach(img => {
        getMeta(img.src, meta => {
            if (meta.width < div.offsetWidth && meta.height < div.offsetHeight) {
                img.style.width = meta.width + "px"
                img.style.height = meta.height + "px"
            }
        })

    })

    return div
}


/**
 * Here I will create the image from the data url.
 * @param {*} url 
 * @param {*} callback 
 */
function getImageFile(url, callback) {
    var image = new Image();
    image.crossOrigin = 'Anonymous';
    image.onload = function () {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.height = this.naturalHeight;
        canvas.width = this.naturalWidth;
        context.drawImage(this, 0, 0);
        var dataURL = canvas.toDataURL('image/jpeg');
        let img = new Image()
        img.src = dataURL
        callback(img)
    };
    image.src = url;
}

/**
 * Create a thumbnail from an url. The url can from from img.src...
 * @param {*} src The image url
 * @param {*} w The width of the thumnail
 * @param {*} callback The callback to be call
 */
export function createThumbmail(src, w, callback) {
    getImageFile(src, (img) => {
        if (img.width > w) {
            var oc = document.createElement('canvas'), octx = oc.getContext('2d');
            oc.width = img.width;
            oc.height = img.height;
            octx.drawImage(img, 0, 0);
            if (img.width > img.height) {
                oc.height = (img.height / img.width) * w;
                oc.width = w;
            } else {
                oc.width = (img.width / img.height) * w;
                oc.height = w;
            }
            octx.drawImage(oc, 0, 0, oc.width, oc.height);
            octx.drawImage(img, 0, 0, oc.width, oc.height);
            callback(oc.toDataURL());
        } else {
            callback(img.src);
        }

    })
}

export function createThumbmailFromImage(img, w, callback) {
    createThumbmail(img.src, w, callback)
}

export function readBlogPost(domain, uuid, callback, errorCallback) {
    let globule = Backend.getGlobule(domain)
    generatePeerToken(globule, token => {
        let rqst = new GetBlogPostsRequest
        rqst.setUuidsList([uuid])

        let stream = globule.blogService.getBlogPosts(rqst, { domain: globule.domain, token: token });
        let blogs = []

        stream.on("data", (rsp) => {
            blogs.push(rsp.getBlogPost())
        });

        stream.on("status", (status) => {
            if (status.code == 0) {
                callback(blogs[0])
            } else {
                callback([])
            }
        })
    }, errorCallback)
}


export class BlogPostElement extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(blog, globule) {
        super()

        this.globule = globule
        if (!globule) {
            this.globule = Backend.globular
        }

        this.blog = blog
        if (blog != undefined) {
            this.id = "_" + blog.getUuid()
        }

        // The close event listener.
        this.onclose = null

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           

            #container div {
                display: flex;
                justify-content: center;
                margin-bottom: 10px;
                margin-top: 10px;
            }

            .blog-post-editor-div{
                display: flex;
                flex-direction: column;
                width: 100%;
            }

            .blog-post-title-div {
                display: flex;
                border-bottom: 1px solid var(--palette-action-disabled);
                background-color: var(--surface-color);
                padding: 4px;
                padding-left: 16px;
                align-items: center;
                justify-content: flex-end;
                /* Ensure it stays visible when scrolling */
                position: sticky;
                top: 0; /* Stick to the top of the parent div */
                background-color: var(--surface-color); /* Prevent content bleeding */
                z-index: 10; /* Make sure it stays above other content */
            }

            .blog-editor-title {
                flex-grow: 1;
                color: var(--palette-action-disabled);
                text-align: left;
                padding: 8px;
            }

            .blog-reader-title{
                flex-grow: 1;
                text-align: left;
                margin-left: 16px;
                padding: 8px;
            }
            
            .blog-options-panel{
                position: absolute;
                right: 50px;
                top: 40px;
                z-index: 100;
                background-color: var(--surface-color);
            }

            .blog-options-panel .card-content{
                min-width: 400px;
                padding: 0px 10px 0px 10px;
                display: flex;
                flex-direction: column;

            }

            .blog-actions{
                display: flex;
                border-top: 1px solid var(--palette-action-disabled);
                align-items: center;
            }

            globular-string-list-setting {
                padding-left: 0px;
                padding-rigth: 0px;
            }

            .blog-post-reader-div{
                position: relative;
                max-width: 650px;
                margin: 0 auto;
                -webkit-transition: background-color .15s ease;
                transition: background-color .15s ease;
            }

            #close-btn{
                position: absolute;
                top: 0px;
                right: 0px;
                z-index: 100;
            }

            paper-card{
                background-color: var(--surface-color);
                color: var(--palette-text-primary);
                font-size: 1rem;
                border-left: 1px solid var(--palette-divider); 
                border-right: 1px solid var(--palette-divider);
                border-top: 1px solid var(--palette-divider);
            }

            paper-radio-button {
                --paper-radio-button-checked-color: var(--palette-primary-main);
                --paper-radio-button-checked-ink-color: var(--palette-primary-main);
                --paper-radio-button-unchecked-color: var(--palette-action-disabled);
                --paper-radio-button-unchecked-ink-color: var(--palette-action-disabled);
                --paper-radio-button-label-color: var(--palette-action-disabled);
             }
             
             paper-radio-button[checked] {
                --paper-radio-button-label-color: var(--palette-text-accent);
             }
             
             @media (max-width: 500px) {
                #container {
                    width: calc(100vw - 20px);
                }
                .blog-post-editor-div, .blog-post-reader-div {
                    width: calc(100vw - 20px);
                    position: relative;
                }

                .blog-post-title-div{
                    width: 100%;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: flex-end;
                    padding: 0px;
                }

                .actions-div{
                    position: absolute;
                    top: 0px;
                    right: 0px;
                }

                .blog-actions{
                    flex-direction: column;
                }

                .blog-actions paper-radio-group{
                    align-self: flex-start;
                }

                .blog-actions div{
                    align-self: flex-end;
                }

                .blog-reader-title, .blog-read-div{
                    padding: 5px;
                    margin: 0px;
                    width: calc(100vw - 20px);
                }

                .blog-read-div img{
                    width: calc(100vw - 20px);
                }

                #collapse-panel{
                    overflow-y: auto;
                }
             }
        </style>

        <div style="display: flex; flex-direction: column; width: 100%; margin-bottom: 100px;">
            <div class="blog-post-editor-div" >
                <div class="blog-post-title-div">
                    <div class="actions-div" style="display: flex;">
                        <paper-icon-button name="publish-blog" title="save the blog" icon="icons:save"></paper-icon-button>
                        <paper-icon-button name="blog-editor-delete-btn" title="delete blog" icon="icons:delete" ></paper-icon-button>
                        <paper-icon-button id="exit-editor-btn" title="exit edit mode" icon="icons:exit-to-app"></paper-icon-button>
                        <paper-icon-button icon="icons:more-vert" title="more options" id="blog-editor-menu-btn"></paper-icon-button>
                        <paper-icon-button id="close-editor-btn" title="exit" icon="icons:close"></paper-icon-button>
                    </div>
                </div>
                <div id="collapse-panel" style="display: flex; flex-direction: column;">
                    <paper-card id="blog-editor-options-panel" class="blog-options-panel" style="display: none;">
                        <div style="display: flex; flex-direction: column; margin: 5px;">
                            <globular-image-selector label="cover" url=""> </globular-image-selector>
                        </div>
                        <div class="card-content" style="background-color: transparent;">
                            <paper-input id="blog-title-input" label="title"></paper-input>
                            <paper-input id="blog-subtitle-input" label="subtitle"></paper-input>
                            <globular-editable-string-list id="keywords-list" name="keywords" description="keywords will be use by the search engine to retreive your blog."></globular-editable-string-list>
                        </div>
                        <div style="display: flex;">
                            <div class="blog-actions" style="background-color: transparent; flex-grow: 1;">
                                <paper-radio-group selected="draft" style="flex-grow: 1;  text-align: left; font-size: 1rem;">
                                    <paper-radio-button name="draft">draft</paper-radio-button>
                                    <paper-radio-button name="published">published</paper-radio-button>
                                    <paper-radio-button name="archived">archived</paper-radio-button>
                                </paper-radio-group>
                            </div>
                        </div>
                    </paper-card>

                    <slot  id="edit-blog-content" name="edit-blog-content"></slot>
                </div>

            </div>

            <div class="blog-post-reader-div" >
                <div id="title" class="blog-post-title-div">
                    <div style="display: flex; flex-direction: column; padding-left: 5px;">
                        <div>
                            <img id="blog-reader-author-blog-post" style="width: 32px; height: 32px; border-radius: 16px; display:none;"></img>
                            <iron-icon id="blog-reader-author-icon"  icon="account-circle" style="width: 34px; height: 34px; --iron-icon-fill-color:var(--palette-action-disabled); display: block;"></iron-icon>
                        </div>
                        <span  id="blog-reader-author-id"></span>
                    </div>
                    <h2 class="blog-reader-title"></h2>
                    <div class="actions-div" style="display: flex;">
                        <paper-icon-button id="blog-reader-edit-btn" icon="editor:mode-edit"></paper-icon-button>
                        <paper-icon-button id="close-reader-btn" icon="icons:close"></paper-icon-button>
                    </div>
                </div>

                <slot id="read-only-blog-content" name="read-only-blog-content"></slot>
                <slot name="blog-comments"></slot>
                
            </div>
        </div>
        `

        // The comments container...
        this.blogComments = new BlogComments(blog, null, globule)
        this.blogComments.slot = "blog-comments"
        this.appendChild(this.blogComments)

        if (blog != null) {
            if (blog.getStatus() == 0) {
                this.shadowRoot.querySelector("paper-radio-group").selected = "draft"
            } else if (blog.getStatus() == 1) {
                this.shadowRoot.querySelector("paper-radio-group").selected = "published"
            } else if (blog.getStatus() == 2) {
                this.shadowRoot.querySelector("paper-radio-group").selected = "archived"
            }

            if (blog.getThumbnail().length > 0) {
                this.shadowRoot.querySelector("globular-image-selector").setImageUrl(blog.getThumbnail())
            }

            this.shadowRoot.querySelector("globular-image-selector").ondelete = () => {
                blog.setThumbnail("")
            }

            this.shadowRoot.querySelector("globular-image-selector").onselectimage = (dataUrl) => {
                this.blog.setThumbnail(dataUrl)
            }
        }

        this.shadowRoot.querySelector("#close-reader-btn").onclick = () => {
            if (this.onclose != undefined) {
                this.onclose()
            }
        }

        this.shadowRoot.querySelector("#close-editor-btn").onclick = () => {
            if (this.onclose != undefined) {
                this.onclose()
            }
        }

        this.shadowRoot.querySelector("#exit-editor-btn").onclick = () => {
            this.read(() => {
                displayMessage("exit edit mode", 3000)
            })
        }


        // publish the blog...
        let publishBtns = this.shadowRoot.querySelectorAll(`[name="publish-blog"]`)
        for (var i = 0; i < publishBtns.length; i++) {
            publishBtns[i].onclick = () => {
                this.publish()
            }
        }

        // Delete the blog...
        let deleteBtns = this.shadowRoot.querySelectorAll(`[name="blog-editor-delete-btn"]`)
        for (var i = 0; i < deleteBtns.length; i++) {
            deleteBtns[i].onclick = () => {
                let toast = displayMessage(
                    `
                <style>
                
                #yes-no-blog-post-delete-box{
                    display: flex;
                    flex-direction: column;
                }

                #yes-no-blog-post-delete-box globular-blog-post-card{
                    padding-bottom: 10px;
                }

                #yes-no-blog-post-delete-box div{
                    display: flex;
                    padding-bottom: 10px;
                }

                </style>
                <div id="yes-no-blog-post-delete-box">
                <div>Your about to delete blog post</div>
                <img style="max-height: 256px; object-fit: contain; width: 100%;" src="${this.blog.getThumbnail()}"></img>
                <span style="font-size: 1.1rem;">${this.blog.getTitle()}</span>
                <div>Is it what you want to do? </div>
                <div style="justify-content: flex-end;">
                    <paper-button raised id="yes-delete-blog-post">Yes</paper-button>
                    <paper-button raised id="no-delete-blog-post">No</paper-button>
                </div>
                </div>
                `,
                    60 * 1000 // 60 sec...
                );

                let yesBtn = toast.toastElement.querySelector("#yes-delete-blog-post")
                let noBtn = toast.toastElement.querySelector("#no-delete-blog-post")

                // On yes
                yesBtn.onclick = () => {

                    let rqst = new DeleteBlogPostRequest
                    rqst.setUuid(this.blog.getUuid())
                    let globule = this.globule
                    rqst.setIndexpath(globule.config.DataPath + "/search/blogPosts")

                    // Delete the blog...
                    generatePeerToken(globule, token => {
                        globule.blogService.deleteBlogPost(rqst, { domain: globule.domain, token: token })
                            .then(rsp => {
                                Backend.getGlobule(this.blog.getDomain()).eventHub.publish(this.blog.getUuid() + "_blog_delete_event", {}, false)
                                Backend.eventHub.publish("_blog_delete_event_", this.blog.getUuid(), true)

                                displayMessage(
                                    `<div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 1.1rem;">${this.blog.getTitle()}</span>
                                    <span>was deleted...</span>
                                 </div>`,
                                    3000
                                );
                            })
                            .catch(e => displayMessage(e, 3000))
                    }, err => displayMessage(err, 3000))

                    toast.hideToast();
                }

                noBtn.onclick = () => {
                    toast.hideToast();
                }
            }
        }

        // do not close the panel...
        this.shadowRoot.querySelector("#blog-editor-options-panel").onclick = (evt) => {
            evt.stopPropagation()
        }


        // Display the option panel.
        this.shadowRoot.querySelector("#blog-editor-menu-btn").onclick = (evt) => {
            evt.stopPropagation()

            let optionPanel = this.shadowRoot.querySelector("#blog-editor-options-panel")
            if (optionPanel.style.display == "") {
                optionPanel.style.display = "none";
            } else {
                optionPanel.style.display = "";
                optionPanel.style.top = optionPanel.parentNode.offsetHeigt / 2 + "px"
            }

            if (this.titleInput.value) {
                if (this.titleInput.value.length > 0) {
                    this.titleSpan.innerHTML = this.titleInput.value;
                    this.titleSpan.style.color = "var(--palette-text-primary)"
                }
            }
        }

        // The editor values.
        this.titleSpan = this.shadowRoot.querySelector(".blog-reader-title")
        this.titleInput = this.shadowRoot.querySelector("#blog-title-input")
        this.subtitleInput = this.shadowRoot.querySelector("#blog-subtitle-input")
        this.keywordsEditList = this.shadowRoot.querySelector("#keywords-list")

        // switch to edit mode...
        this.shadowRoot.querySelector("#blog-reader-edit-btn").onclick = () => {
            this.edit(() => {
                this.setAttribute("editable", "true")
                displayMessage("you'r in edit mode, click save to exit...", 3000)
            })
        }

        // set the blog.
        if (blog != undefined) {
            this.setBlog(blog)
            this.read(() => {
                // set back values.
                this.titleSpan.innerHTML = this.blog.getTitle()
                this.titleInput.value = this.blog.getTitle()
                this.subtitleInput.value = this.blog.getSubtitle()
                this.keywordsEditList.setValues(this.blog.getKeywordsList())
            })
        }
    }

    // Connection callback
    connectedCallback() {
        // If the blog editor is set to true...
        if (this.getAttribute("editable") != undefined) {
            if (this.getAttribute("editable") == "true") {
                this.edit(() => {

                })
            }
        }
    }

    // Set the blog...
    setBlog(blog) {
        this.blog = blog;

        if (this.blog.getThumbnail().length > 0) {
            this.shadowRoot.querySelector("globular-image-selector").setImageUrl(blog.getThumbnail())
        }


        this.shadowRoot.querySelector("globular-image-selector").ondelete = () => {
            blog.setThumbnail("")
        }

        this.shadowRoot.querySelector("globular-image-selector").onselectimage = (dataUrl) => {
            this.blog.setThumbnail(dataUrl)
        }


        this.blogComments.setBlog(blog)

        if (this.blog.getAuthor() != AccountController.account.getId() + "@" + AccountController.account.getDomain()) {
            let editBtn = this.shadowRoot.querySelector("#blog-reader-edit-btn")
            editBtn.parentNode.removeChild(editBtn)
        }

        if (this.updateListener == undefined) {

            Backend.getGlobule(this.blog.getDomain()).eventHub.subscribe(this.blog.getUuid() + "_blog_updated_event", uuid => this.updateListener = uuid, evt => {
                readBlogPost(this.blog.getDomain(), this.blog.getUuid(), b => {
                    this.blog = b
                    let isEditable = this.getAttribute("editable")
                    if (isEditable == undefined) {
                        isEditable = false
                    } else {
                        if (this.getAttribute("editable") == "true") {
                            isEditable = true
                        } else {
                            isEditable = false
                        }
                    }

                    if (isEditable) {
                        this.edit(() => {
                            this.titleSpan.innerHTML = this.blog.getTitle()
                            this.titleInput.value = this.blog.getTitle()
                            this.subtitleInput.value = this.blog.getSubtitle()
                            this.keywordsEditList.setValues(this.blog.getKeywordsList())
                        })
                    } else {
                        this.read(() => {
                            // set back values.
                            this.titleSpan.innerHTML = this.blog.getTitle()
                            this.titleInput.value = this.blog.getTitle()
                            this.subtitleInput.value = this.blog.getSubtitle()
                            this.keywordsEditList.setValues(this.blog.getKeywordsList())
                        })
                    }
                }, err => displayError(err, 3000))



            }, false, this)
        }

        if (this.deleteListener == undefined) {
            Backend.getGlobule(this.blog.getDomain()).eventHub.subscribe(this.blog.getUuid() + "_blog_delete_event", uuid => this.deleteListener = uuid,
                evt => {
                    // simplity remove it from it parent...
                    if (this.parentNode)
                        this.parentNode.removeChild(this)

                    if (this.onclose) {
                        this.onclose()
                    }
                }, false, this)
        }

        // Here I will set the blog various information...
        let authorIdSpan = this.shadowRoot.querySelector("#blog-reader-author-id")
        authorIdSpan.innerHTML = blog.getAuthor()

        AccountController.getAccount(blog.getAuthor(), a => {
            let img = this.shadowRoot.querySelector("#blog-reader-author-blog-post")
            let ico = this.shadowRoot.querySelector("#blog-reader-author-icon")
            if (a.profile_picture != undefined) {
                img.src = a.profile_picture
                img.style.display = "block"
                ico.style.display = "none"
            }

        }, e => {
            console.log(e)
        })

        this.shadowRoot.querySelector(".blog-reader-title").innerHTML = blog.getTitle()
        this.titleSpan.innerHTML = blog.getTitle()
        this.titleInput.value = blog.getTitle()
        this.subtitleInput.value = blog.getSubtitle()
        this.keywordsEditList.setValues(blog.getKeywordsList())
    }

    getThumbnail(width, callback) {
        // Take the image from the editor...
        let dataUrl = this.shadowRoot.querySelector("globular-image-selector").getImageUrl()
        if (dataUrl.endsWith("/")) {
            dataUrl = "" // invalidate the given url...
        }

        if (dataUrl.length > 0) {
            callback(dataUrl)
            return
        }

        // Here I will create image
        let images = this.editorDiv.querySelectorAll("img")

        if (images.length > 0) {
            if (images.length == 1) {
                createThumbmailFromImage(images[0], width, dataUrl => {
                    if (dataUrl.endsWith("/")) {
                        dataUrl = "" // invalidate the given url...
                    }
                    this.shadowRoot.querySelector("globular-image-selector").setImageUrl(dataUrl)
                    callback(dataUrl);
                })
            } else {
                this.shadowRoot.querySelector("globular-image-selector").createMosaic(images, callback)
            }
        } else {
            let galleries = this.editorDiv.querySelectorAll("globular-image-gallery")
            if (galleries.length > 0) {
                // take the first images...
                let images = galleries[0].getImages()

                if (images.length == 1) {
                    createThumbmailFromImage(images[0], width, dataUrl => {
                        if (dataUrl.endsWith("/")) {
                            dataUrl = "" // invalidate the given url...
                        }
                        this.shadowRoot.querySelector("globular-image-selector").setImageUrl(dataUrl)
                        callback(dataUrl);
                        console.log(dataUrl)
                    })
                } else {
                    this.shadowRoot.querySelector("globular-image-selector").createMosaic(images, callback)
                }


            } else {
                let embeddedVideos = this.editorDiv.querySelectorAll("globular-embedded-videos")
                if (embeddedVideos.length > 0) {

                    // get all images from the first embeded video...
                    let images = embeddedVideos[0].getImages()

                    if (images.length == 1) {
                        createThumbmailFromImage(images[0], width, dataUrl => {
                            if (dataUrl.endsWith("/")) {
                                dataUrl = "" // invalidate the given url...
                            }
                            this.shadowRoot.querySelector("globular-image-selector").setImageUrl(dataUrl)
                            callback(dataUrl);
                        })
                    } else {
                        this.shadowRoot.querySelector("globular-image-selector").createMosaic(images, callback)
                    }

                } else {
                    let embeddedAudios = this.editorDiv.querySelectorAll("globular-embedded-audios")
                    if (embeddedAudios.length > 0) {
                        let images = embeddedAudios[0].getImages()

                        // take the first images...
                        if (images.length == 1) {
                            createThumbmailFromImage(images[0], width, dataUrl => {
                                if (dataUrl.endsWith("/")) {
                                    dataUrl = "" // invalidate the given url...
                                }
                                this.shadowRoot.querySelector("globular-image-selector").setImageUrl(dataUrl)
                                callback(dataUrl);
                            })
                        } else {
                            this.shadowRoot.querySelector("globular-image-selector").createMosaic(images, callback)
                        }
                    } else {
                        callback("")
                    }
                }

            }
        }
    }

    /**
     * Display the blog in edit mode.
     * @param {*} callback 
     */
    edit(callback) {

        // Show the paper-card where the blog will be display
        this.shadowRoot.querySelector(".blog-post-editor-div").style.display = ""
        this.shadowRoot.querySelector(".blog-post-reader-div").style.display = "none"

        if (this.editorDiv != null) {
            if (this.blog != null) {
                if (this.blog.getTitle().length > 0) {
                    this.titleSpan.innerHTML = this.blog.getTitle()
                    this.titleInput.value = this.blog.getTitle()
                    this.subtitleInput.value = this.blog.getSubtitle()
                    this.titleSpan.style.color = "var(--palette-text-primary)"
                }
            }
            callback(this.editorDiv)
            return
        }

        this.editorDiv = document.createElement("div")
        this.editorDiv.id = "_" + uuidv4() + "editorjs"
        this.editorDiv.slot = "edit-blog-content"
        this.editorDiv.style = "min-height: 230px;"
        this.appendChild(this.editorDiv)

        let data = {}
        if (this.blog != undefined) {
            data = JSON.parse(this.blog.getText())
            if (this.blog.getTitle().length > 0) {
                this.titleSpan.innerHTML = this.blog.getTitle()
                this.titleInput.value = this.blog.getTitle()
                this.subtitleInput.value = this.blog.getSubtitle()
                this.titleSpan.style.color = "var(--palette-text-primary)"
            }

            if (this.blog.getAuthor() != AccountController.account.getId() + "@" + AccountController.account.getDomain()) {
                displayError("your not allowed to edit ", this.blog.getAuthor(), " post!", 3000)
                return
            }

            this.keywordsEditList.setValues(this.blog.getKeywordsList())
        }

        // Here I will create a new editor...
        const editor = this.editor = new EditorJS({
            holder: this.editorDiv.id,
            autofocus: true,
            /** 
             * Available Tools list. 
             * Pass Tool's class or Settings object for each Tool you want to use 
             * 
             * linkTool: {
                    class: LinkTool,
                    config: {
                        endpoint: 'http://localhost:8008/fetchUrl', // Your backend endpoint for url data fetching
                    }
                },
             */
            tools: {
                header: Header,
                delimiter: Delimiter,
                quote: Quote,
                list: NestedList,
                checklist: {
                    class: Checklist,
                    inlineToolbar: true,
                },
                table: Table,
                paragraph: {
                    class: Paragraph,
                    inlineToolbar: true,
                },
                underline: Underline,
                code: CodeTool,
                raw: RawTool,
                embed: {
                    class: Embed,
                    inlineToolbar: false,
                    config: {
                        services: {
                            youtube: true,
                            coub: true,
                            codepen: true,
                            imgur: true,
                            gfycat: true,
                            twitchvideo: true,
                            vimeo: true,
                            vine: true,
                            twitter: true,
                            instagram: true,
                            aparat: true,
                            facebook: true,
                            pinterest: true,
                        }
                    },
                },
                image: SimpleImage,
                files: FileDropZoneTool
            },
            data: data,
            onReady: () => {
                new Undo({ editor });
                new DragDrop(editor);
            }
        });



        // Move the editor inside the 
        this.editor.isReady
            .then(() => {
                /** Do anything you need after editor initialization */
                this.editorDiv.querySelector(".codex-editor__redactor").style.paddingBottom = "0px";
                this.editorDiv.querySelector(".codex-editor__redactor").style.paddingTop = "60px";
                /** done with the editor initialisation */

                callback()
            })
            .catch((reason) => {
                displayMessage(`Editor.js initialization failed because of ${reason}`, 3000)
            });


    }


    /**
     * Display the blog in read mode.
     * @param {*} callbak 
     */
    read(callback) {
        this.shadowRoot.querySelector(".blog-post-editor-div").style.display = "none"
        this.shadowRoot.querySelector(".blog-post-reader-div").style.display = ""

        // Here I will replace existing elements with new one...
        let elements = this.querySelectorAll(`[slot="read-only-blog-content"]`)
        for (var i = 0; i < elements.length; i++) {
            this.removeChild(elements[i])
        }

        if (this.editor != null) {
            this.editor.save().then((outputData) => {
                let div = jsonToHtml(outputData)
                this.appendChild(div)
                callback()
            })
        } else {
            let div = jsonToHtml(JSON.parse(this.blog.getText()))
            this.appendChild(div)
            callback()
        }
    }

    /**
     * Clear the content of blog read and writh editor
     */
    clear() {
        this.blog = null
        this.removeChild(this.editorDiv);
        this.editorDiv = null;
        this.editor = null;
        this.titleInput.value = ""
        this.subtitleInput.value = ""
        this.keywordsEditList.setValues([])

        // reset the editor.
        this.edit(() => {

        })
    }

    /**
     * Save the blog and publish it...
     */
    publish() {
        this.editor.save().then((outputData) => {
            if (this.blog == null) {
                let globule = this.globule // see if the blog need domain...
                let rqst = new CreateBlogPostRequest
                rqst.setIndexpath(globule.config.DataPath + "/search/blogPosts")
                rqst.setAccountId(AccountController.account.getId() + "@" + AccountController.account.getDomain())
                rqst.setText(JSON.stringify(outputData));
                rqst.setLanguage(navigator.language.split("-")[0])
                rqst.setTitle(this.titleInput.value)
                rqst.setSubtitle(this.subtitleInput.value)
                rqst.setKeywordsList(this.keywordsEditList.getValues())

                // if the title is empty I will set it from the firt h1 found in the text...
                if (this.titleInput.value)
                    if (this.titleInput.value.length == 0) {
                        let h1 = this.editorDiv.querySelectorAll("h1")
                        if (h1.length > 0) {
                            rqst.setTitle(h1[0].innerHTML)
                        }
                    }

                // do the same with subtitle...
                if (this.subtitleInput.value)
                    if (this.subtitleInput.value.length == 0) {
                        let h2 = this.editorDiv.querySelectorAll("h2")
                        if (h2.length > 0) {
                            rqst.setSubtitle(h2[0].innerHTML)
                        }
                    }

                let createBlog = () => {
                    generatePeerToken(globule, token => {
                        globule.blogService.createBlogPost(rqst, { domain: globule.domain, token: token })
                            .then(rsp => {
                                this.blog = rsp.getBlogPost();
                                displayMessage("Your post is published!", 3000)

                                // Publish the event
                                Backend.publish(AccountController.account.getId() + "@" + AccountController.account.getDomain() + "_publish_blog_event", this.blog.serializeBinary(), false)
                                if (this.blog.getThumbnail().length > 0) {
                                    this.shadowRoot.querySelector("globular-image-selector").setImageUrl(this.blog.getThumbnail())
                                }
                            }).catch(err => {
                                displayError(err, 3000)
                            })
                    }, err => displayError(err, 3000))


                }

                if (this.blog) {
                    if (this.blog.getThumbnail().length == 0) {
                        this.getThumbnail(500, dataUrl => { rqst.setThumbnail(dataUrl); createBlog(); })
                    } else {
                        createBlog();
                    }

                } else {
                    this.getThumbnail(500, dataUrl => { rqst.setThumbnail(dataUrl); createBlog(); })
                }

            } else {

                let rqst = new SaveBlogPostRequest
                let globule = this.globule
                rqst.setIndexpath(globule.config.DataPath + "/search/blogPosts")
                this.blog.setText(JSON.stringify(outputData))
                this.blog.setLanguage(navigator.language.split("-")[0])
                this.blog.setTitle(this.titleInput.value)
                this.blog.setSubtitle(this.subtitleInput.value)
                this.blog.setKeywordsList(this.keywordsEditList.getValues())

                // Set the blogpost status...
                if (this.shadowRoot.querySelector("paper-radio-group").selected == "draft") {
                    this.blog.setStatus(0)
                } else if (this.shadowRoot.querySelector("paper-radio-group").selected == "published") {
                    this.blog.setStatus(1)
                } else if (this.shadowRoot.querySelector("paper-radio-group").selected == "archived") {
                    this.blog.setStatus(2)
                }

                // set request parameters
                rqst.setUuid(this.blog.getUuid())
                rqst.setBlogPost(this.blog)

                let saveBlog = () => {
                    generatePeerToken(globule, token => {
                        globule.blogService.saveBlogPost(rqst, { domain: globule.domain, token: token })
                            .then(rsp => {
                                displayMessage("Your post was updated!", 3000)

                                // That function will update the blog...
                                globule.eventHub.publish(this.blog.getUuid() + "_blog_updated_event", this.blog.getUuid(), false)
                                if (this.blog.getThumbnail().length > 0) {
                                    this.shadowRoot.querySelector("globular-image-selector").setImageUrl(this.blog.getThumbnail())
                                }
                            }).catch(err => {
                                displayError(err, 3000)
                            })

                    }, err => displayError(err, 3000))
                }

                // set the thumbnail and save the blog...
                if (this.blog.getThumbnail().length == 0) {
                    this.getThumbnail(500, dataUrl => { this.blog.setThumbnail(dataUrl); saveBlog() })
                } else {
                    saveBlog()
                }

            }

        }).catch((error) => {
            displayError(`saving failed: ${error}`, 3000)
        });
    }
}

customElements.define('globular-blog-post', BlogPostElement)
