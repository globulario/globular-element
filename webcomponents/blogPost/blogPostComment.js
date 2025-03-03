import { Backend, displayError, generatePeerToken} from "../../backend/backend";
import { BlogEmotions } from "./blogPostEmotion";
import { AddEmojiRequest, Emoji } from "globular-web-client/blog/blog_pb";
import { v4 as uuidv4 } from "uuid";
import { AccountController } from "../../backend/account";
import { Comment, AddCommentRequest } from "globular-web-client/blog/blog_pb";
import { jsonToHtml } from "./blogPost"

// Import the editorjs
import EditorJS from '@editorjs/editorjs';
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
import { Picker } from "emoji-picker-element";

const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
];

function timeSince(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const interval = intervals.find(i => i.seconds < seconds);
    const count = Math.floor(seconds / interval.seconds);
    return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
}

/**
 * Comments
 */
export class BlogComments extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(blog, comment, globule) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
        </style>
        <div id="container" style="padding-left: 20px; border-top: 1px solid var(--palette-divider);">
            <slot name="blog-emotions"> </slot>
            <slot name="blog-comment-editor"></slot>
            <slot name="blog-comments"></slot>
        </div>
        `


        this.globule = globule
        if (!globule) {
            this.globule = Backend.globular
        }

        // The emotions 
        this.emotions = new BlogEmotions(blog, comment, globule)
        this.emotions.slot = "blog-emotions"
        this.appendChild(this.emotions)

        // The comment editior
        this.editor = new BlogCommentEditor(blog, comment, globule)
        this.editor.slot = "blog-comment-editor"
        this.appendChild(this.editor)

        if (comment != undefined) {
            this.setComment(comment, blog)
        }

        if (blog != undefined) {
            this.setBlog(blog)
        }
    }

    setBlog(blog) {
        if (this.blog != undefined) {
            return
        }

        this.blog = blog
        this.editor.setBlog(blog)
        this.emotions.setBlog(blog)

        if (this.comment == undefined) {
            // Here I will connect the event channel for comment.
            Backend.getGlobule(blog.getDomain()).eventHub.subscribe("new_" + this.blog.getUuid() + "_comment_evt",
                uuid => this["new_blog_" + this.blog.getUuid() + "_comment_listener"] = uuid,
                evt => {
                    let comment = Comment.deserializeBinary(Uint8Array.from(evt.split(",")))
                    this.appendComment(comment, blog)
                }, false, this)

            // Display the comment...
            this.blog.getCommentsList().forEach(c => {
                this.appendComment(c, blog)
            })
        }
    }

    setComment(comment, blog) {
        if (this.comment != undefined) {
            return
        }

        this.comment = comment
        this.editor.setComment(comment)
        this.emotions.setComment(comment)

        // Here I will connect the event channel for comment.
        Backend.getGlobule(blog.getDomain()).eventHub.subscribe("new_" + this.comment.getUuid() + "_comment_evt",
            uuid => this["new_" + this.comment.getUuid() + "_comment_listener"] = uuid,
            evt => {
                let comment = Comment.deserializeBinary(Uint8Array.from(evt.split(",")))
                this.appendComment(comment, blog)
            }, false, this)

        // Display the comment...
        this.comment.getCommentsList().forEach(c => {
            this.appendComment(c, blog)
        })

    }

    // Append a new comment into the list of comment.
    appendComment(comment, blog) {

        if (this.comment != null) {
            this.shadowRoot.querySelector("#container").style.borderLeft = "1px solid var(--palette-action-disabled)"
        }

        // append the comment once.
        if (this.querySelector("#_" + comment.getUuid()) != undefined) {
            return
        }

        // So here I will display information about the comment 
        let blogComment = new BlogComment(blog, comment, this.globule)
        blogComment.slot = "blog-comments"
        this.prepend(blogComment)
        blogComment.display()
    }
}

customElements.define('globular-blog-comments', BlogComments)

/**
 * Comments
 */
export class BlogComment extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(blog, comment, globule) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        this.comment = comment;
        this.blog = blog;
        this.id = "_" + comment.getUuid()

        this.globule = globule
        if (!this.globule) {
            this.globule = Backend.globular
        }

        // Innitialisation of the layout.
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
            .container{
                display: flex;
                flex-direction: column;
                padding: 8px 0px 8px 16px;
                overflow: auto;
            }

            #blog-comment-author-id, #blog-comment-time{
                font-size: .85rem;
            }

            #blog-comment-time{
                align-self: flex-end;
                padding-right: 10px;
            }


        </style>
        <div class="container" id="_${comment.getUuid()}">
            <div style="display: flex;">
                <div style="display: flex; flex-direction: column; padding-right: 10px;">
                    <div>
                        <img id="blog-comment-author-blog-post" style="width: 32px; height: 32px; border-radius: 16px; display:none;"></img>
                        <iron-icon id="blog-comment-author-icon"  icon="account-circle" style="width: 34px; height: 34px; --iron-icon-fill-color:var(--palette-action-disabled); display: block;"></iron-icon>
                        
                    </div>
                    <span  id="blog-comment-author-id"></span>
                </div>
                <div id="comment-text-div">
                </div>
            </div>
            <div id="blog-comment-time"></div>
            <slot name="blog-comments"></slot>
            
        </div>
        `

        // The comments container...
        this.blogComments = new BlogComments(blog, comment, this.globule)
        this.blogComments.slot = "blog-comments"
        this.appendChild(this.blogComments)

        // Here I will set the blog various information...
        let authorIdSpan = this.shadowRoot.querySelector("#blog-comment-author-id")
        authorIdSpan.innerHTML = comment.getAccountId()

        AccountController.getAccount(comment.getAccountId(), a => {
            let img = this.shadowRoot.querySelector("#blog-comment-author-blog-post")
            let ico = this.shadowRoot.querySelector("#blog-comment-author-icon")
            if (a.getProfilepicture() != undefined) {
                img.src = a.getProfilepicture()
                img.style.display = "block"
                ico.style.display = "none"
            }

        }, e => {
            console.log(e)
        })

        let timeDiv = this.shadowRoot.querySelector("#blog-comment-time");
        let commentCreationTime = new Date(comment.getCreationtime() * 1000)
        setInterval(() => {
            timeDiv.innerHTML = timeSince(commentCreationTime)
        }, 1000)

    }

    display() {
        let textDiv = this.shadowRoot.querySelector("#comment-text-div")
        textDiv.innerHTML = ""
        textDiv.appendChild(jsonToHtml(JSON.parse(this.comment.getText())))

    }

    editComment() {

    }

}

customElements.define('globular-blog-comment', BlogComment)

/**
 * Comments
 */
export class BlogCommentEditor extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(blog, comment, globule) {
        super()

        this.blog = blog
        this.comment = comment
        this.globule = globule
        if (!this.globule) {
            this.globule = Backend.globular
        }

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           

            .add-comment-btn{
                transition: all 1s ease,padding 0.8s linear;
                display: flex;
                align-items: baseline;
                color: var(--palette-action-disabled);
                position: relative;
            }

            .add-comment-btn:hover{
                cursor: pointer;
            }

        </style>
        <div style="display: flex; flex-direction: column; position: relative;">
            <div class="add-comment-btn" style="display: flex;">
                <div style="border-bottom: 1px solid var(--palette-action-disabled); min-width: 200px; margin-right: 5px; text-align: left;">
                    <iron-icon  style="width: 16px; height: 16px; --iron-icon-fill-color:var(--palette-action-disabled);" icon="add"></iron-icon>
                    <span>add comment</span> 
                    <paper-ripple recenters></paper-ripple>
                </div>
                <div>
                    <paper-icon-button id="collapse-btn" icon="editor:insert-emoticon" style="--iron-icon-fill-color:var(--palette-action-disabled);"></paper-icon-button>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; width: 100%;">
                <slot name="edit-comment-content"></slot>
                <iron-collapse id="collapse-panel" style="display: flex; flex-direction: column;">
                    <emoji-picker></emoji-picker>
                </iron-collapse>
                <div id="edit-comment-content" style="display: none; width: 100%; justify-content: end;">
                    <paper-button id="cancel-blog-comment">Cancel</paper-button>
                    <paper-button id="publish-blog-comment">Publish</paper-button>
                </div>
            </div>
        </div>

        `

        this.collapse_btn = this.shadowRoot.querySelector("#collapse-btn")
        this.collapse_panel = this.shadowRoot.querySelector("#collapse-panel")
        this.editDiv = this.shadowRoot.querySelector("#edit-comment-content")

        this.collapse_btn.onclick = () => {
            if (!this.collapse_panel.opened) {
                this.collapse_btn.icon = "icons:close"
            } else {
                this.collapse_btn.icon = "editor:insert-emoticon"
            }
            this.collapse_panel.toggle();
        }

        let emojiPicker = this.shadowRoot.querySelector("emoji-picker")
        emojiPicker.addEventListener('emoji-click', event => {
            this.collapse_btn.icon = "editor:insert-emoticon"
            this.collapse_panel.toggle();
            generatePeerToken(this.globule, token => {
                let rqst = new AddEmojiRequest
                let emoji = new Emoji
                emoji.setAccountId(AccountController.account.getId() + "@" + AccountController.account.getDomain())
                emoji.setEmoji(JSON.stringify(event.detail))
                emoji.setParent(this.blog.getUuid())
                if (comment != undefined) {
                    emoji.setParent(comment.getUuid())
                }

                rqst.setUuid(this.blog.getUuid())
                rqst.setEmoji(emoji)

                this.globule.blogService.addEmoji(rqst, { domain: this.globule.domain, token: token })
                    .then(rsp => {

                        this.globule.eventHub.publish(emoji.getParent() + "_new_emotion_event", rsp.getEmoji().serializeBinary(), false)
                    })
                    .catch(e => {
                        displayError(e, 3000)
                    })
            }, e => displayError(e, 3000))



        });

        // Set the comment editior
        let addCommentBtn = this.shadowRoot.querySelector(".add-comment-btn")
        this.shadowRoot.querySelector("paper-ripple").ontransitionend = () => {
            addCommentBtn.style.display = "none"
            this.editDiv.style.display = ""
            this.editorDiv = document.createElement("div")
            this.editorDiv.id = "_" + uuidv4() + "editorjs"
            this.editorDiv.slot = "edit-comment-content"
            this.editorDiv.style = "width: 100%;"
            this.appendChild(this.editorDiv)

            let data = {}

            // Here I will create the editor...
            // Here I will create a new editor...
            this.editor = new EditorJS({
                holder: this.editorDiv.id,
                autofocus: true,
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
                },
                data: data
            });

            // Move the editor inside the 
            this.editor.isReady
                .then(() => {
                    /** Do anything you need after editor initialization */
                    this.editorDiv.querySelector(".codex-editor__redactor").style.paddingBottom = "0px";
                    this.shadowRoot.querySelector("#edit-comment-content").style.display = "flex"
                })
                .catch((reason) => {
                    displayError(`Editor.js initialization failed because of ${reason}`, 3000)
                });
        }

        // Publish the comment
        let publishCommentButton = this.shadowRoot.querySelector("#publish-blog-comment")
        publishCommentButton.onclick = () => {
            this.editor.save().then((outputData) => {

                generatePeerToken(this.globule, token => {
                    let rqst = new AddCommentRequest
                    let comment = new Comment
                    rqst.setUuid(this.blog.getUuid())
                    comment.setAccountId(AccountController.account.getId() + "@" + AccountController.account.getDomain())
                    comment.setLanguage(navigator.language.split("-")[0])
                    comment.setText(JSON.stringify(outputData))
                    comment.setParent(this.blog.getUuid())
                    if (this.comment != undefined) {
                        comment.setParent(this.comment.getUuid())
                    }
                    rqst.setComment(comment)

                    this.globule.blogService.addComment(rqst, { domain: this.globule.domain, token: token })
                        .then(rsp => {
                            this.globule.eventHub.publish("new_" + comment.getParent() + "_comment_evt", rsp.getComment().serializeBinary(), false)
                            addCommentBtn.style.display = "flex"
                            this.editDiv.style.display = "none"
                            this.removeChild(this.editorDiv)
                        })
                }, err => displayError(err, 3000))


            })
        }

        let cancelCommentButton = this.shadowRoot.querySelector('#cancel-blog-comment')
        cancelCommentButton.onclick = () => {
            addCommentBtn.style.display = "flex"
            this.collapse_panel.style.display = ""
            this.editDiv.style.display = "none"
            this.removeChild(this.editorDiv)
        }

    }

    connectedCallback() {
    }

    setBlog(blog) {
        this.blog = blog
    }

    setComment(comment) {
        this.comment = comment
    }
}

customElements.define('globular-blog-comment-editor', BlogCommentEditor)

