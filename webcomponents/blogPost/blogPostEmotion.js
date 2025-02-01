import { Emoji } from "globular-web-client/blog/blog_pb";
import { AccountController } from "../../backend/account";
import { Backend, displayMessage } from "../../backend/backend";
import getUuidByString from "uuid-by-string"

/**
 * Emotion it's all what the life is about after all...
 */
export class BlogEmotions extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(blog, comment) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container{
                display: flex;
            }
        </style>
        <div id="container">
            <slot></slot>
        </div>
        `

        // test create offer...
        this.blog = blog
        this.comment = comment
        this.listeners = {}

        if (this.comment != undefined) {
            // In that case the emotion is related to the comment and not the blog.
            this.setComment(comment)
        } else if (blog != undefined) {
            // The emotion is related to the blog.
            this.setBlog(blog)
        }
    }

    addEmotion(emotion) {
        // Here I will add the emotion into the the panel...
        let emoji = JSON.parse(emotion.getEmoji())
        let uuid = "_" + getUuidByString(emoji.emoji.annotation)
        let emojiDiv = this.querySelector("#" + uuid)

        if (emojiDiv == null) {
            // Here I will create the emoji panel...
            let html = `
            <div id="${uuid}" class="blog-emitions" style="position: relative;">
                ${emoji.unicode}
                <paper-card style="background-color: var(--surface-color); color: var(--palette-text-primary); z-index: 100; display: none; flex-direction: column; position: absolute; top: 30px; left: 15px; width: 200px;">
                    <div class="emotion-title">${emoji.emoji.annotation}</div>
                    <div class="emotion-peoples"> </div>
                </paper-card>
            </div>
            `
            this.appendChild(document.createRange().createContextualFragment(html))
            emojiDiv = this.querySelector("#" + uuid)

            // The list of pepoel who give that emotion
            emojiDiv.accounts = []

            emojiDiv.onmouseenter = () => {
                emojiDiv.querySelector("paper-card").style.display = "flex"
            }

            emojiDiv.onmouseleave = () => {
                emojiDiv.querySelector("paper-card").style.display = "none"
            }
        }

        // Now I will append the account id in the emotion...
        if (emojiDiv.accounts != null) {
            if (emojiDiv.accounts.indexOf(emotion.authorId) == -1) {
                // TODO append the account to the display...
                AccountController.getAccount(emotion.getAccountId(), a => {
                    let pepoleDiv = emojiDiv.querySelector(".emotion-peoples")
                    let span = document.createElement("span")
         
                    uuid = "_" + getUuidByString(emoji.emoji.annotation + a.name)
                    if (pepoleDiv.querySelector("#" + uuid) != undefined) {
                        return
                    }

                    let userName = a.getId()
                    if (a.firstName) {
                        if (a.firstName.length > 0) {
                            userName = a.firstName + " " + a.lastName
                        }
                    }

                    span.id = uuid
                    span.innerHTML = userName
                    pepoleDiv.appendChild(span)

                }, e => { console.log(e) })
            }
        }
    }

    connectedCallback() {

    }

    // If the parent is a blog.
    setBlog(blog) {

        if(this.blog != undefined){
            return
        }

        this.blog = blog
        if (this.comment == undefined) {
            this.blog.getEmotionsList().forEach(emotion => {
                this.addEmotion(emotion)
            })


            let eventId = blog.getUuid() + "_new_emotion_event"
            if (this.listeners[eventId] != undefined) {
                return
            }
    
            this.listeners[eventId] = true
    
            // Now I will connect emotion event...
            Backend.getGlobule(blog.getDomain()).eventHub.subscribe(eventId, uuid => { }, evt => {
                let emotion = Emoji.deserializeBinary(Uint8Array.from(evt.split(",")))

                AccountController.getAccount(emotion.getAccountId(), a => {
                    let userName = a.getId()
                    if (a.firstName) {
                        userName = a.firstName + " " + a.lastName
                    }
                    let emoji = JSON.parse(emotion.getEmoji())
                    console.log("----------> 141")
                    displayMessage(`${userName} put emoji '${emoji.emoji.annotation}' ${emoji.unicode} to your <div style="padding-left: 5px;" onclick="document.getElementById('${blog.getUuid()}').scrollIntoView();">blog</div>`, 3000)
                }, e => {
                    console.log(e)
                })


                this.addEmotion(emotion)
            }, false, this)
        }
    }

    // If the parent is a comment...
    setComment(comment) {

        this.comment = comment
        this.comment.getEmotionsList().forEach(emotion => {
            this.addEmotion(emotion)
        })

        let eventId = comment.getUuid() + "_new_emotion_event"
        if (this.listeners[eventId] != undefined) {
            return
        }

        this.listeners[eventId] = true


        // Now I will connect emotion event...
        Backend.getGlobule(this.blog.getDomain()).eventHub.subscribe(eventId, uuid => { }, evt => {


            let emotion = Emoji.deserializeBinary(Uint8Array.from(evt.split(",")))

            AccountController.getAccount(emotion.getAccountId(), a => {
                let userName = a.getId()
                if (a.firstName) {
                    userName = a.firstName + " " + a.lastName
                }
                let emoji = JSON.parse(emotion.getEmoji())
                
                displayMessage(`${userName} put emoji '${emoji.emoji.annotation}' ${emoji.unicode} to your <div style="padding-left: 5px;" onclick="document.getElementById('${comment.getUuid()}').scrollIntoView();">blog</div>`, 3000)
            }, e => {
                console.log(e)
            })


            this.addEmotion(emotion)
        }, false, this)
    }
}

customElements.define('globular-blog-emotions', BlogEmotions)
