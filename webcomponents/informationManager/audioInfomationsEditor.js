/**
 * Modify Audio Informations
 */
export class AudioInfoEditor extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor(audio, audioInfosDisplay) {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        let imageUrl = "" // in case the video dosent contain any poster info...
        if (audio.getPoster())
            imageUrl = audio.getPoster().getContenturl()

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container {
                display: flex;
                margin-top: 15px;
                margin-bottom: 15px;
            }

            .action-div{
                display: flex;
                justify-content: end;
                border-top: 2px solid;AudioInfoEditor
                border-color: var(--palette-divider);
            }

            .button-div{
                display: table-cell;
                vertical-align: top;
            }

            .label{
                font-size: 1rem;
                padding-right: 10px;
                min-width: 150px;
            }

            div, paper-input, iron-autogrow-textarea {
                font-size: 1rem;
            }

            paper-button {AudioInfoEditor
                font-size: 1rem;
            }

            a {
                color: var(--palette-divider);
            }

            select {
                background: var(--surface-color); 
                color: var(--palette-text-accent);
                border:0px;
                outline:0px;
            }

        </style>
        <div id="container">
            <div style="display: flex; flex-direction: column; justify-content: flex-start;  margin-left: 15px;">
                <div style="display: flex; flex-direction: column; margin: 5px;">
                    <globular-image-selector label="cover" url="${imageUrl}"></globular-image-selector>
                </div>
                
            </div>

            <div style="display: flex; flex-direction: column; width: 100%;">

                <div style="display: table; flex-grow: 1; margin-left: 20px; border-collapse: collapse; margin-top: 20px; margin-bottom: 10px;">
                    <div style="display: table-row; border-bottom: 1px solid var(--palette-divider)" >
                        <div class="label" style="display: table-cell; font-weight: 450; border-bottom: 1px solid var(--palette-divider)">Audio Informations</div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Id:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-id-div">${audio.getId()}</div>
                        <paper-input style="display: none; width: 100%;" value="${audio.getId()}" id="audio-id-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-id-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>


                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Url:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-url-div">${audio.getUrl()}</div>
                        <paper-input style="display: none; width: 100%;" value="${audio.getUrl()}" id="audio-url-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-url-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Title:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-title-div">${audio.getTitle()}</div>
                        <paper-input style="display: none; width: 100%;" value="${audio.getTitle()}" id="audio-title-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-title-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Artist:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-artist-div">${audio.getArtist()}</div>
                        <paper-input style="display: none; width: 100%;" value="${audio.getArtist()}" id="audio-artist-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-artist-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Album Artist:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-album-artist-div">${audio.getAlbumartist()}</div>
                        <paper-input style="display: none; width: 100%;" value="${audio.getAlbumartist()}" id="audio-album-artist-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-album-artist-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Composer:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-composer-div">${audio.getComposer()}</div>
                        <paper-input style="display: none; width: 100%;" value="${audio.getComposer()}" id="audio-composer-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-composer-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Album:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-album-div">${audio.getAlbum()}</div>
                        <paper-input style="display: none; width: 100%;" value="${audio.getAlbum()}" id="audio-album-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-album-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; vertical-align: top;">Comment:</div>
                        <div id="audio-comment-div" style="display: table-cell;width: 100%; padding-bottom: 10px;" >${audio.getComment()}</div>
                        <iron-autogrow-textarea id="audio-comment-input"  style="display: none; border: none; width: 100%;" value="${audio.getComment()}"></iron-autogrow-textarea>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-comment-btn" style="vertical-align: top;" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450; vertical-align: top;">Lyrics:</div>
                        <div id="audio-lyrics-div" style="display: table-cell;width: 100%; padding-bottom: 10px;" >${audio.getLyrics()}</div>
                        <iron-autogrow-textarea id="audio-lyrics-input"  style="display: none; border: none; width: 100%;" value="${audio.getLyrics()}"></iron-autogrow-textarea>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-lyrics-btn" style="vertical-align: top;" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;" id="audio-year-row">
                        <div class="label" style="display: table-cell; font-weight: 450; ">Year:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-year-div">${audio.getYear()}</div>
                        <paper-input style="display: none; width: 100%;" type="number" value="${audio.getYear()}" id="audio-year-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-year-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;" id="audio-disc-number-row">
                        <div class="label" style="display: table-cell; font-weight: 450;">Disc Number:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-disc-number-div">${audio.getDiscnumber()}</div>
                        <paper-input style="display: none; width: 100%;" type="number" value="${audio.getDiscnumber()}" id="audio-disc-number-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-disc-number-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;" id="audio-disc-total-row">
                        <div class="label" style="display: table-cell; font-weight: 450;">Disc Total:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-disc-total-div">${audio.getDisctotal()}</div>
                        <paper-input style="display: none; width: 100%;" type="number" value="${audio.getDisctotal()}" id="audio-disc-total-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-disc-total-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;" id="audio-track-number-row">
                        <div class="label" style="display: table-cell; font-weight: 450;">Track Number:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-track-number-div">${audio.getTracknumber()}</div>
                        <paper-input style="display: none; width: 100%;" type="number" value="${audio.getTracknumber()}" id="audio-track-number-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-track-number-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;" id="audio-track-total-row">
                        <div class="label" style="display: table-cell; font-weight: 450;">Track Total:</div>
                        <div style="display: table-cell; width: 100%;"  id="audio-track-total-div">${audio.getTracktotal()}</div>
                        <paper-input style="display: none; width: 100%;" type="number" value="${audio.getTracktotal()}" id="audio-track-total-input" no-label-float></paper-input>
                        <div class="button-div">
                            <paper-icon-button id="edit-audio-track-total-btn" icon="image:edit"></paper-icon-button>
                        </div>
                    </div>

                    <div style="display: table-row;">
                        <div class="label" style="display: table-cell; font-weight: 450;">Genres:</div>
                        <div id="audio-genres-div" style="display: table-cell; width: 100%;"></div>
                    </div>
                    
                </div>

            </div>
        </div>
        <iron-collapse class="permissions" id="collapse-panel" style="display: flex; flex-direction: column; margin: 5px;">
        </iron-collapse>
        <div class="action-div" style="${this.isShort ? "display: none;" : ""}">
            <paper-button id="edit-permissions-btn" audio="set who can edit this audio informations">Permissions</paper-button>
            <span style="flex-grow: 1;"></span>
            <paper-button id="save-indexation-btn">Save</paper-button>
            <paper-button id="cancel-indexation-btn">Cancel</paper-button>
        </div>
        `

        this.shadowRoot.querySelector("#cancel-indexation-btn").onclick = () => {
            let parent = this.parentNode
            parent.removeChild(this)
            parent.appendChild(audioInfosDisplay)
        }

        // Delete the postser/cover image.
        this.shadowRoot.querySelector("globular-image-selector").ondelete = () => {
            audio.getPoster().setContenturl("")
        }

        // Select new image.
        this.shadowRoot.querySelector("globular-image-selector").onselectimage = (imageUrl) => {
            if (audio.getPoster() == null) {
                let poster = new Poster()
                audio.setPoster(poster)
            }

            audio.getPoster().setContenturl(imageUrl)
        }


        let audioGenresDiv = this.shadowRoot.querySelector("#audio-genres-div")
        let audioGenresList = new EditableStringList(audio.getGenresList())
        audioGenresDiv.appendChild(audioGenresList)

        let editPemissionsBtn = this.shadowRoot.querySelector("#edit-permissions-btn")
        let collapse_panel = this.shadowRoot.querySelector("#collapse-panel")

        this.permissionManager = new PermissionsManager()
        this.permissionManager.permissions = null
        this.permissionManager.globule = audio.globule
        this.permissionManager.setPath(audio.getId())
        this.permissionManager.setResourceType = "audio_info"

        // toggle the collapse panel when the permission manager panel is close.
        this.permissionManager.onclose = () => {
            collapse_panel.toggle();
        }

        // I will display the permission manager.
        editPemissionsBtn.onclick = () => {
            collapse_panel.appendChild(this.permissionManager)
            collapse_panel.toggle();
        }

        // Here I will set the interaction...
        this.shadowRoot.querySelector("#cancel-indexation-btn").onclick = () => {
            let parent = this.parentNode
            parent.removeChild(this)
            parent.appendChild(audioInfosDisplay)
        }

        // Delete the postser/cover image.
        this.shadowRoot.querySelector("globular-image-selector").ondelete = () => {
            audio.getPoster().setContenturl("")
        }

        // Select new image.
        this.shadowRoot.querySelector("globular-image-selector").onselectimage = (imageUrl) => {
            if (audio.getPoster() == null) {
                let poster = new Poster()
                audio.setPoster(poster)
            }
            audio.getPoster().setContenturl(imageUrl)
        }

        // The audio title
        let editAudioTitleBtn = this.shadowRoot.querySelector("#edit-audio-title-btn")
        let audioTitleInput = this.shadowRoot.querySelector("#audio-title-input")
        let audioTitleDiv = this.shadowRoot.querySelector("#audio-title-div")

        editAudioTitleBtn.onclick = () => {
            audioTitleInput.style.display = "table-cell"
            audioTitleDiv.style.display = "none"
            setTimeout(() => {
                audioTitleInput.focus()
                audioTitleInput.inputElement.inputElement.select()
            }, 100)
        }

        audioTitleInput.onblur = () => {
            audioTitleInput.style.display = "none"
            audioTitleDiv.style.display = "table-cell"
            audioTitleDiv.innerHTML = audioTitleInput.value
        }

        // The audio id
        let audioIdBtn = this.shadowRoot.querySelector("#edit-audio-id-btn")
        let audioIdInput = this.shadowRoot.querySelector("#audio-id-input")
        let audioIdDiv = this.shadowRoot.querySelector("#audio-id-div")

        audioIdBtn.onclick = () => {
            audioIdInput.style.display = "table-cell"
            audioIdDiv.style.display = "none"
            setTimeout(() => {
                audioIdInput.focus()
                audioIdInput.inputElement.inputElement.select()
            }, 100)
        }

        // set back to non edit mode.
        audioIdInput.onblur = () => {
            audioIdInput.style.display = "none"
            audioIdDiv.style.display = "table-cell"
            audioIdDiv.innerHTML = audioIdInput.value
        }

        // The audio url
        let audioUrlBtn = this.shadowRoot.querySelector("#edit-audio-url-btn")
        let audioUrlInput = this.shadowRoot.querySelector("#audio-url-input")
        let audioUrlDiv = this.shadowRoot.querySelector("#audio-url-div")

        audioUrlBtn.onclick = () => {
            audioUrlInput.style.display = "table-cell"
            audioUrlDiv.style.display = "none"
            setTimeout(() => {
                audioUrlInput.focus()
                audioUrlInput.inputElement.inputElement.select()
            }, 100)
        }

        // set back to non edit mode.
        audioUrlInput.onblur = () => {
            audioUrlInput.style.display = "none"
            audioUrlDiv.style.display = "table-cell"
            audioUrlDiv.innerHTML = audioUrlInput.value
        }

        // The artist
        let audioArtistBtn = this.shadowRoot.querySelector("#edit-audio-artist-btn")
        let audioArtistInput = this.shadowRoot.querySelector("#audio-artist-input")
        let audioArtistDiv = this.shadowRoot.querySelector("#audio-artist-div")

        audioArtistBtn.onclick = () => {
            audioArtistInput.style.display = "table-cell"
            audioArtistDiv.style.display = "none"
            setTimeout(() => {
                audioArtistInput.focus()
                audioArtistInput.inputElement.inputElement.select()
            }, 100)
        }

        // set back to non edit mode.
        audioArtistInput.onblur = () => {
            audioArtistInput.style.display = "none"
            audioArtistDiv.style.display = "table-cell"
            audioArtistDiv.innerHTML = audioArtistInput.value
        }

        // The composer
        let audioComposerBtn = this.shadowRoot.querySelector("#edit-audio-composer-btn")
        let audioComposerInput = this.shadowRoot.querySelector("#audio-composer-input")
        let audioComposerDiv = this.shadowRoot.querySelector("#audio-composer-div")

        audioComposerBtn.onclick = () => {
            audioComposerInput.style.display = "table-cell"
            audioComposerDiv.style.display = "none"
            setTimeout(() => {
                audioComposerInput.focus()
                audioComposerInput.inputElement.inputElement.select()
            }, 100)
        }

        // set back to non edit mode.
        audioComposerInput.onblur = () => {
            audioComposerInput.style.display = "none"
            audioComposerDiv.style.display = "table-cell"
            audioComposerDiv.innerHTML = audioComposerInput.value
        }

        // The album
        let audioAlbumBtn = this.shadowRoot.querySelector("#edit-audio-album-btn")
        let audioAlbumInput = this.shadowRoot.querySelector("#audio-album-input")
        let audioAlbumDiv = this.shadowRoot.querySelector("#audio-album-div")

        audioAlbumBtn.onclick = () => {
            audioAlbumInput.style.display = "table-cell"
            audioAlbumDiv.style.display = "none"
            setTimeout(() => {
                audioAlbumInput.focus()
                audioAlbumInput.inputElement.inputElement.select()
            }, 100)
        }

        // set back to non edit mode.
        audioAlbumInput.onblur = () => {
            audioAlbumInput.style.display = "none"
            audioAlbumDiv.style.display = "table-cell"
            audioAlbumDiv.innerHTML = audioAlbumInput.value
        }

        // The album artist
        let audioAlbumArtistBtn = this.shadowRoot.querySelector("#edit-audio-album-artist-btn")
        let audioAlbumArtistInput = this.shadowRoot.querySelector("#audio-album-artist-input")
        let audioAlbumArtistDiv = this.shadowRoot.querySelector("#audio-album-artist-div")

        audioAlbumArtistBtn.onclick = () => {
            audioAlbumArtistInput.style.display = "table-cell"
            audioAlbumArtistDiv.style.display = "none"
            setTimeout(() => {
                audioAlbumArtistInput.focus()
                audioAlbumArtistInput.inputElement.inputElement.select()
            }, 100)
        }

        audioAlbumArtistInput.onblur = () => {
            audioAlbumArtistInput.style.display = "none"
            audioAlbumArtistDiv.style.display = "table-cell"
            audioAlbumArtistDiv.innerHTML = audioAlbumArtistInput.value
        }

        // The audio comment
        let editAudioCommentBtn = this.shadowRoot.querySelector("#edit-audio-comment-btn")
        let audioCommentInput = this.shadowRoot.querySelector("#audio-comment-input")
        let audioCommentDiv = this.shadowRoot.querySelector("#audio-comment-div")

        editAudioCommentBtn.onclick = () => {
            audioCommentInput.style.display = "table-cell"
            audioCommentDiv.style.display = "none"
            setTimeout(() => {
                audioCommentInput.focus()
                audioCommentInput.textarea.select()
            }, 100)
        }

        // set back to non edit mode.
        audioCommentInput.onblur = () => {
            audioCommentInput.style.display = "none"
            audioCommentDiv.style.display = "table-cell"
            audioCommentDiv.innerHTML = audioCommentInput.value
        }

        // The audio lyrics
        let editAudioLyricsBtn = this.shadowRoot.querySelector("#edit-audio-lyrics-btn")
        let audioLyricsInput = this.shadowRoot.querySelector("#audio-lyrics-input")
        let audioLyricsDiv = this.shadowRoot.querySelector("#audio-lyrics-div")

        editAudioLyricsBtn.onclick = () => {
            audioLyricsInput.style.display = "table-cell"
            audioLyricsDiv.style.display = "none"
            setTimeout(() => {
                audioLyricsInput.focus()
                audioLyricsInput.textarea.select()
            }, 100)
        }

        // set back to non edit mode.
        audioLyricsInput.onblur = () => {
            audioLyricsInput.style.display = "none"
            audioLyricsDiv.style.display = "table-cell"
            audioLyricsDiv.innerHTML = audioLyricsInput.value
        }


        // The disc number
        let audioDiscNumberBtn = this.shadowRoot.querySelector("#edit-audio-disc-number-btn")
        let audioDiscNumberInput = this.shadowRoot.querySelector("#audio-disc-number-input")
        let audioDiscNumberDiv = this.shadowRoot.querySelector("#audio-disc-number-div")

        audioDiscNumberBtn.onclick = () => {
            audioDiscNumberInput.style.display = "table-cell"
            audioDiscNumberDiv.style.display = "none"
            setTimeout(() => {
                audioDiscNumberInput.focus()
                audioDiscNumberInput.inputElement.inputElement.select()
            }, 100)
        }

        audioDiscNumberInput.onblur = () => {
            audioDiscNumberInput.style.display = "none"
            audioDiscNumberDiv.style.display = "table-cell"
            audioDiscNumberDiv.innerHTML = audioDiscNumberInput.value
        }

        // The disc total
        let audioDiscTotalBtn = this.shadowRoot.querySelector("#edit-audio-disc-total-btn")
        let audioDiscTotalInput = this.shadowRoot.querySelector("#audio-disc-total-input")
        let audioDiscTotalDiv = this.shadowRoot.querySelector("#audio-disc-total-div")

        audioDiscTotalBtn.onclick = () => {
            audioDiscTotalInput.style.display = "table-cell"
            audioDiscTotalDiv.style.display = "none"
            setTimeout(() => {
                audioDiscTotalInput.focus()
                audioDiscTotalInput.inputElement.inputElement.select()
            }, 100)
        }

        // set back to non edit mode.
        audioDiscTotalInput.onblur = () => {
            audioDiscTotalInput.style.display = "none"
            audioDiscTotalDiv.style.display = "table-cell"
            audioDiscTotalDiv.innerHTML = audioDiscTotalInput.value
        }

        // The track number
        let audioTrackNumberBtn = this.shadowRoot.querySelector("#edit-audio-track-number-btn")
        let audioTrackNumberInput = this.shadowRoot.querySelector("#audio-track-number-input")
        let audioTrackNumberDiv = this.shadowRoot.querySelector("#audio-track-number-div")

        audioTrackNumberBtn.onclick = () => {
            audioTrackNumberInput.style.display = "table-cell"
            audioTrackNumberDiv.style.display = "none"
            setTimeout(() => {
                audioTrackNumberInput.focus()
                audioTrackNumberInput.inputElement.inputElement.select()
            }, 100)
        }


        audioTrackNumberInput.onblur = () => {
            audioTrackNumberInput.style.display = "none"
            audioTrackNumberDiv.style.display = "table-cell"
            audioTrackNumberDiv.innerHTML = audioTrackNumberInput.value
        }

        // The track total
        let audioTrackTotalBtn = this.shadowRoot.querySelector("#edit-audio-track-total-btn")
        let audioTrackTotalInput = this.shadowRoot.querySelector("#audio-track-total-input")
        let audioTrackTotalDiv = this.shadowRoot.querySelector("#audio-track-total-div")

        audioTrackTotalBtn.onclick = () => {
            audioTrackTotalInput.style.display = "table-cell"
            audioTrackTotalDiv.style.display = "none"
            setTimeout(() => {
                audioTrackTotalInput.focus()
                audioTrackTotalInput.inputElement.inputElement.select()
            }, 100)
        }

        // set back to non edit mode.
        audioTrackTotalInput.onblur = () => {
            audioTrackTotalInput.style.display = "none"
            audioTrackTotalDiv.style.display = "table-cell"
            audioTrackTotalDiv.innerHTML = audioTrackTotalInput.value
        }

        // The audio year
        let audioYearBtn = this.shadowRoot.querySelector("#edit-audio-year-btn")
        let audioYearInput = this.shadowRoot.querySelector("#audio-year-input")
        let audioYearDiv = this.shadowRoot.querySelector("#audio-year-div")

        audioYearBtn.onclick = () => {
            audioYearInput.style.display = "table-cell"
            audioYearDiv.style.display = "none"
            setTimeout(() => {
                audioYearInput.focus()
                audioYearInput.inputElement.inputElement.select()
            }, 100)
        }

        // set back to non edit mode.
        audioYearInput.onblur = () => {
            audioYearInput.style.display = "none"
            audioYearDiv.style.display = "table-cell"
            audioYearDiv.innerHTML = audioYearInput.value
        }

        // set back the audio.
        this.shadowRoot.querySelector("#save-indexation-btn").onclick = () => {

            // So here I will set back all values...
            audio.setId(audioIdInput.value)
            audio.setUrl(audioUrlInput.value)
            audio.setArtist(audioArtistInput.value)
            audio.setAlbumartist(audioAlbumArtistInput.value)
            audio.setAlbum(audioAlbumInput.value)
            audio.setComment(audioCommentInput.value)
            audio.setComposer(audioComposerInput.value)
            audio.setLyrics(audioLyricsInput.value)
            audio.setGenresList(audioGenresList.getItems())
            audio.setYear(audioYearInput.value)
            audio.setDiscnumber(audioDiscNumberInput.value)
            audio.setDisctotal(audioDiscTotalInput.value)
            audio.setTracknumber(audioTrackNumberInput.value)
            audio.setTracktotal(audioTrackTotalInput.value)

            let globule = audio.globule
            generatePeerToken(globule, token => {
                let rqst = new CreateAudioRequest
                rqst.setAudio(audio)
                rqst.setIndexpath(globule.config.DataPath + "/search/audios")
                globule.titleService.createAudio(rqst, { token: token, domain: globule.domain })
                    .then(rsp => {
                        displaySuccess("audio information for " + audio.getTitle() + " was saved", 3000)
                    }).catch(err => displayError(err, 3000))
            })

            audioInfosDisplay.setAudio(audio)
        }



    }

    // The connection callback.
    connectedCallback() {


    }
}

customElements.define('globular-audio-info-editor', AudioInfoEditor)
