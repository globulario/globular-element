import { Backend } from "../../backend/backend";
import { readBlogPost } from "../blogPost/blogPost";

/**
 * Display basic blog informations.
 */
export class BlogPostInfo extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(blogPost, short, globule) {
        super()

        // Keep the blogPost source...
        this.globule = globule
        this.blogPost = blogPost

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        let creationTime = new Date(blogPost.getCreationtime() * 1000)
        let status = "Draft"
        if (blogPost.getStatus() == 1) {
            status = "Published"
        } else if (blogPost.getStatus() == 2) {
            status = "Archived"
        }


        if (short != undefined) {
            if (short == true) {
                this.setAttribute("short", "true")
            } else {
                this.setAttribute("short", "false")
            }
        } else {
            this.setAttribute("short", "false")
        }

        // Now if the thumbnail is not empty...
        let thumbnail = blogPost.getThumbnail()

        // Innitialisation of the layout.
        if (this.getAttribute("short") == "true") {
            this.shadowRoot.innerHTML = `
            <style>
               
                #container {
                    /*background-color: var(--surface-color);*/
                    color: var(--primary-text-color);
                }

                .blog-post-card {
                    display: flex;
                    flex-direction: column;

                    border-radius: 3.5px;
                    border: 1px solid var(--palette-divider);
                    width: 320px;
                    margin: 10px;
                    height: 285px;
                    margin: 10px;
                    overflow: hidden;
                }

                .blog-post-card:hover{
                    box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
                    cursor: pointer;
                }
    

                .blog-post-card img{
                    align-self: center;
                }

                .blog-post-card div{
                    display: block;
                    padding: 5px;
                }

                img{
                    border-top-left-radius: 3.5px;
                    border-top-right-radius: 3.5px;
                    object-fit: cover;
                    width: 500px;
                    position: absolute;
                    top: -10px;
                    left: -10px;

                }

                .blog-title{
                    font-weight: 400;
                    font-size: 18px;
                    line-height: 24px;
                    font-weight: bold;
                }

                .blog-subtitle{
                    font-weight: 400;
                    line-height: 24px;
                    font-size: 16px;
                }

                .blog-author {
                    font-weight: bold;
                }

                .blog-author, .blog-creation-date{
                    line-height: 16px;
                    font-size: 12px;
                }

                .image-box {
                    position: relative;
                    margin: auto;
                    overflow: hidden;
                    width: 100%;
                    height:50%;
                }

                .image-box img {
                    max-width: 100%;
                    transition: all 0.3s;
                    display: block;
                    height: auto;
                    transform: scale(1.05);
                }

                #thumbnail_img {
                    height: 100% !important;
                    min-width: 100%;
                    object-fit: cover;
                    width: 128px; 
                    padding-left: 10px; 
                    padding-top: 10px
                }
    
            </style>
            <div id="container" class="blog-post-card">
                <div class="image-box">
                    <img  id="thumbnail_img" style="display:${thumbnail.length == 0 ? "none" : "block"};" src="${thumbnail}"></img>
                </div>
                <span style="flex-grow: 1;"></span>
                <div id="title_div" class="blog-title">${blogPost.getTitle()}</div>
                <div id="sub_title_div" class="blog-subtitle">${blogPost.getSubtitle()}</div>
                <div style="display: flex;">
                    <div id="author_div" class="blog-author" style="flex-grow: 1;">${blogPost.getAuthor()}</div>
                    <div id="creation_time_div" class="blog-creation-date">${creationTime.toLocaleDateString()}</div>
                </div>
            </div>
            `

            this.shadowRoot.querySelector("#container").onmouseover = () => {
                this.shadowRoot.querySelector("img").style.transform = "scale(1)"
            }

            this.shadowRoot.querySelector("#container").onmouseout = () => {
                this.shadowRoot.querySelector("img").style.transform = ""
            }

        } else {
            this.shadowRoot.innerHTML = `
            <style>
               
                #container {
                    display: flex;
                    /*background-color: var(--surface-color);*/
                    color: var(--primary-text-color);
                    user-select: none;
                }
    
                #thumbnail_img {
                    height: 100% !important;
                    min-width: 100%;
                    object-fit: cover;
                    width: 128px; 
                    padding-left: 10px; 
                    padding-top: 10px
                }
            </style>
            <div id="container">
                <div>
                   <img id="thumbnail_img" style="display:${thumbnail.length == 0 ? "none" : "block"};" src="${thumbnail}"></img>
                </div>
                <div style="display: table; flex-grow: 1; padding-left: 20px;">
                    <div style="display: table-row;">
                        <div style="display: table-cell; font-weight: 450;">Id:</div>
                        <div style="display: table-cell;">${blogPost.getUuid()}</div>
                    </div>
                    <div style="display: table-row;">
                        <div style="display: table-cell; font-weight: 450;">Title:</div>
                        <div id="title_div" style="display: table-cell;">${blogPost.getTitle()}</div>
                    </div>
                    <div style="display: table-row;">
                        <div style="display: table-cell; font-weight: 450;">subtitle:</div>
                        <div id="sub_title_div" style="display: table-cell;">${blogPost.getSubtitle()}</div>
                    </div>
                    <div style="display: table-row;">
                        <div style="display: table-cell; font-weight: 450;">Author:</div>
                        <div id="author_div" style="display: table-cell;">${blogPost.getAuthor()}</div>
                    </div>
                    <div style="display: table-row;">
                        <div style="display: table-cell; font-weight: 450;">Status:</div>
                        <div style="display: table-cell;">${status}</div>
                    </div>
                    <div style="display: table-row;">
                        <div style="display: table-cell; font-weight: 450;">Language:</div>
                        <div style="display: table-cell;">${blogPost.getLanguage()}</div>
                    </div>
                    <div style="display: table-row;">
                        <div style="display: table-cell; font-weight: 450;">Date:</div>
                        <div id="creation_time_div" style="display: table-cell;">${creationTime.toLocaleDateString()}</div>
                    </div>
    
                    <div style="display: table-row;">
                        <div style="display: table-cell; font-weight: 450;">Keywords:</div>
                        <div style="display: table-cell;">${listToString(blogPost.getKeywordsList())}</div>
                    </div>
                </div>
            </div>
            `
        }


        // Now I will subscribe to the blog updated event...
        Backend.getGlobule(blogPost.getDomain()).eventHub.subscribe(blogPost.getUuid() + "_blog_updated_event", uuid => { }, evt => {

            readBlogPost(blogPost.getDomain(), blogPost.getUuid(), b => {
                this.blog = b
                let creationTime = new Date(this.blogPost.getCreationtime() * 1000)
                let thumbnail = this.blog.getThumbnail()
                if (!thumbnail) {
                    thumbnail = ""
                }


                // update fields
                this.shadowRoot.querySelector("#creation_time_div").innerHTML = creationTime.toLocaleDateString()
                this.shadowRoot.querySelector("#sub_title_div").innerHTML = this.blogPost.getSubtitle()
                this.shadowRoot.querySelector("#title_div").innerHTML = this.blogPost.getTitle()
                this.shadowRoot.querySelector("#author_div").innerHTML = this.blogPost.getAuthor()
                if (thumbnail.length > 0) {
                    this.shadowRoot.querySelector("#thumbnail_img").src = thumbnail
                }

            }, err => displayError(err, 3000))


        }, false, this)


        Backend.eventHub.subscribe(blogPost.getUuid() + "_blog_delete_event", uuid => { },
            evt => {
                // simplity remove it from it parent...
                if (this.parentNode)
                    this.parentNode.removeChild(this)
            }, false, this)

    }

    connectedCallback() {

    }

}

customElements.define('globular-blog-post-info', BlogPostInfo)

