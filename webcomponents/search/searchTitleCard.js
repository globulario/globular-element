import getUuidByString from "uuid-by-string";
import { displayError, displayMessage, getUrl } from "../../backend/backend";
import { GetTitleByIdRequest, GetTitleFilesRequest } from "globular-web-client/title/title_pb";
import { playVideo } from "../video";
import { searchEpisodes } from "../informationManager/titleInfo";
import { getImdbInfo } from "./search";

function playTitleListener(player, title, indexPath) {
    if (!title) {
        return
    }

    searchEpisodes(title.getSerie(), indexPath, (episodes) => {

        let globule = title.globule
        let index = -1;
        episodes.forEach((e, i) => {
            if (e.getId() == title.getId()) {
                index = i;
            }
        });


        index += 1
        let nextEpisode = episodes[index]
        let video = document.getElementsByTagName('video')[0];

        video.onended = () => {
            // exit full screen...
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }

            document.getElementsByTagName('globular-video-player')[0].close();

            if (localStorage.getItem(title.getId())) {
                localStorage.removeItem(title.getId())
            }

            if (index == episodes.length) {
                return
            }

            // So here I will ask to display the next episode...
            let toast = displayMessage(`
                <style>

                    #play-next-dialog{
                        display: flex; 
                        flex-direction: column;
                    }

                </style>
                <div id="play-next-dialog">
                    <div>Play the next episode?</div>
                    <h3 style="font-size: 1.17em; font-weight: bold;">${nextEpisode.getName()}</h3>
                    <div>Season ${nextEpisode.getSeason()} Episode ${nextEpisode.getEpisode()}</div>
                    <img style="max-width: 250px; align-self: center;" src="${nextEpisode.getPoster().getContenturl()}"></img>
                    <p style="max-width: 400px;">${nextEpisode.getDescription()}</p>
                    <div style="display: flex; justify-content: flex-end;">
                        <paper-button id="imdb-lnk-ok-button">Play</paper-button>
                        <paper-button id="imdb-lnk-cancel-button">Close</paper-button>
                    </div>
                </div>
                `)

            toast.toastElement.style.backgroundColor = "var(--palette-background-default)"
            toast.toastElement.style.color = "var(--palette-text-primary)"

            let cancelBtn = toast.toastElement.querySelector("#imdb-lnk-cancel-button")
            cancelBtn.onclick = () => {
               toast.hideToast();
            }

            let okBtn = toast.toastElement.querySelector("#imdb-lnk-ok-button")
            okBtn.onclick = () => {
                let rqst = new GetTitleFilesRequest
                rqst.setTitleid(nextEpisode.getId())
                rqst.setIndexpath(indexPath)
                globule.titleService.getTitleFiles(rqst, { domain: globule.domain })
                .then(rsp => {
                    if (rsp.getFilepathsList().length > 0) {
                        let path = rsp.getFilepathsList().pop()
                        playVideo(path, (player, nextEpisode) => {
                            playTitleListener(player, nextEpisode, indexPath, globule)
                        }, null, null, globule)
                    }
                })
           toast.hideToast();
            }
        };
    })


    if (!player.media) {
        return
    }

    var type = player.media.tagName.toLowerCase(),
        toggle = document.querySelector("[data-plyr='fullscreen']");

    if (type === "video" && toggle) {
        toggle.addEventListener("click", player.toggleFullscreen, false);
    }
    toggle.click()

}

export class SearchTitleCard extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            .title-card{
                margin: 7.5px; 
                display: flex; 
                height: 380px; 
                width: 256px;
            }

            /* entire container, keeps perspective */
            .flip-container {
                perspective: 1000;
            }
            
            /* flip the pane when hovered */
            .flip-container:hover .flipper, .flip-container.hover .flipper {
                transform: rotateY(180deg);
            }

            .flip-container, .front, .back {
                width: 256px;
                height: 380px;
            }

            /* flip speed goes here */
            .flipper {
                transition: 0.6s;
                transform-style: preserve-3d;
                position: relative;
            }

            /* hide back of pane during swap */
            .front, .back {
                backface-visibility: hidden;
                position: absolute;
                top: 0;
                left: 0;
                text-align: center;

                max-width: 256px;
                max-height: 380px;

                border-radius: 3.5px;
                box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
            }

            /* front pane, placed above back */
            .front {
                z-index: 2;
                /* for firefox 31 */
                transform: rotateY(0deg);
                background-size: cover;
            }

            /* back, initially hidden pane */
            .back {
                transform: rotateY(180deg);
            }

            .series-info{
                display: flex;
                flex-direction: column;
                background-color: rgba(0, 0, 0, 0.65);
                color: #fff;
                user-select: none;
            }

            .series-poster{
                max-width: 256px;
                top: 0px;
            }

        </style>

        <div class="title-card" id="hit-div-mosaic">
            <div class="flip-container" ontouchstart="this.classList.toggle('hover');">
                <div class="flipper">
                    <div id="hit-div-mosaic-front" class="front">
                        <!-- front content -->
                        <div class="series-info">
                            <span style="font-size: 1.4em; font-weight: bold;" id="hit-div-mosaic-series-name"></span>
                            <div>
                                <span style="font-size: 1.1em; font-weight: bold;" id="hit-div-mosaic-episode-name">
                                </span>
                            </div>
                        </div>
                    </div>
                    <div id="back-container" class="back">
                     <globular-search-title-detail id="search-title"></globular-search-title-detail>   
                    </div>
                </div>
            </div>
        </div>
        `
    }

    setTitle(title) {

        let globule = title.globule

        // so here i will use the class list to set genre and type...
        this.classList.add("filterable")
        title.getGenresList().forEach(g => this.classList.add(getUuidByString(g.toLowerCase())))
        this.classList.add(getUuidByString(title.getType().toLowerCase()))

        // now the term..
        if (title.getRating() < 3.5) {
            this.classList.add(getUuidByString("low"))
        } else if (title.getRating() < 7.0) {
            this.classList.add(getUuidByString("medium"))
        } else {
            this.classList.add(getUuidByString("high"))
        }

        // test create offer...
        this.shadowRoot.querySelector(`#search-title`).setTitle(title)
        if (title.getType() == "TVEpisode") {
            // So here I will get the series info If I can found it...
            let seriesInfos = this.shadowRoot.querySelector(`#hit-div-mosaic-episode-name`)
            if (title.getSerie().length > 0) {
                let serieName = this.shadowRoot.querySelector(`#hit-div-mosaic-series-name`)
                let rqst = new GetTitleByIdRequest
                rqst.setTitleid(title.getSerie())
                let indexPath = globule.config.DataPath + "/search/titles"
                rqst.setIndexpath(indexPath)
                globule.titleService.getTitleById(rqst, {  domain: globule.domain, token: localStorage.getItem("user_token") })
                    .then(rsp => {
                        let serie = rsp.getTitle()
                        let url = serie.getPoster().getContenturl()
                        /*toDataURL(url, (dataUrl) => {*/
                        this.shadowRoot.querySelector(`#hit-div-mosaic-front`).style.backgroundImage = `url(${url})`
                        serieName.innerHTML = serie.getName()
                        /*})*/
                    })
                    .catch(err => {
                        // in that case I will try with imdb...
                        getImdbInfo(title.getSerie(), serie => {
                            let url = serie.Poster.ContentURL
                            /*toDataURL(url, (dataUrl) => {*/
                            this.shadowRoot.querySelector(`#hit-div-mosaic-front`).style.backgroundImage = `url(${url})`
                            serieName.innerHTML = serie.Name
                            /*})*/
                        }, err => displayError(err, 3000), globule)
                    })
            }
            seriesInfos.innerHTML = title.getName() + " S" + title.getSeason() + "E" + title.getEpisode()
        } else {
            if (title.getPoster()) {
                let url = title.getPoster().getContenturl()
                /*toDataURL(url, (dataUrl) => {*/
                this.shadowRoot.querySelector(`#hit-div-mosaic-front`).style.backgroundImage = `url(${url})`
                /*})*/
            }
        }

    }

}

customElements.define('globular-search-title-card', SearchTitleCard)

/**
 * Search Detail Title 
 */
export class SearchTitleDetail extends HTMLElement {
    // attributes.

    // Create the applicaiton view.
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });
        this.title_ = null;

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>

            .search-title-detail{
                position: absolute;               
                max-width: 256px;
                max-height: 380px;
                border-radius: 3.5px;
                background-color: var(--surface-color);
                box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
                border: 1px solid var(--palette-action-disabled);
                z-index: 1000;
                bottom: 0px;
                left: 0px;
                right: 0px;
                top: 0px;
                display: flex;
                flex-direction: column;
                
            }

            .search-title-detail:hover{
                box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px, rgba(0, 0, 0, 0.23) 0px 6px 6px;
            }

            .preview{
                max-width: 256px;
                max-height: 130px;
            }

            .season-episodes-lst{
                display: flex;
                flex-direction: column;
                width: 100%;
            }

            #episodes-select-div {
                align-items: center;
            }

            #episodes-select-div select {
                height: 24px;
                margin-left: 5px;
            }

            .title-div{
                position: relative;
            }

            .video-div #title-info-button, #play-video-button, #play-episode-video-button{
                --paper-icon-button-ink-color: white;
                --iron-icon-fill-color: white;
            }


        </style>

        
        <div class="search-title-detail">
            <div class="video-div"  style="position: relative;">
                <div class="title-div"></div>
                <video muted autoplay loop class="preview" id="title-preview"></video>
                <div class="title-interaction-div" style="display: flex; position: absolute; top:0px; right: 10px; left:10px;">
                    <paper-icon-button id="play-video-button" icon="av:play-circle-filled"></paper-icon-button>
                    <span style="flex-grow: 1;"></span>
                    <paper-icon-button id="title-info-button" icon="icons:arrow-drop-down-circle"></paper-icon-button>              
                </div>
            </div>

            <div id="informations-div"  style="position: relative;">
                <globular-informations-manager short></globular-informations-manager>
            </div>
            <div class="season-episodes-lst" style="display:none;">
                <div id="loading-episodes-infos" style="diplay:flex; flex-direction: column; width: 100%;">
                    <span id="progress-message">loading episodes infos wait...</span>
                    <paper-progress indeterminate style="width: 100%;"></paper-progress>
                </div>
                <div id="episodes-select-div" style="position: absolute; bottom: 0px; left: 0px;">
                    <select id="season-select" style="max-width: 80px;"></select>
                    <select id="episode-select" style="max-width: 102px;"></select>
                    <paper-icon-button id="episode-info-button" icon="icons:arrow-drop-down-circle"></paper-icon-button>
                </div>
                <div style="position: relative;">
                    <video autoplay muted loop class="preview" id="epsiode-preview"></video>
                    <div style="position: absolute; top: 0px; right: 10px">
                        <paper-icon-button id="play-episode-video-button" icon="av:play-circle-filled"></paper-icon-button>
                    </div>
                </div>
            </div>
        </div>
        `

        // test create offer...
        this.titleCard = this.shadowRoot.querySelector(".search-title-detail")
        this.titlePreview = this.shadowRoot.querySelector("#title-preview")

        this.titleCard.onmouseover = (evt) => {
            if (episodesLst.style.display != "flex")
                this.titlePreview.play()
        }

        this.titleCard.onmouseleave = (evt) => {
            if (episodesLst.style.display != "flex")
                this.titlePreview.pause()
        }

        this.episodePreview = this.shadowRoot.querySelector("#epsiode-preview")
        let episodesLst = this.shadowRoot.querySelector(".season-episodes-lst")

        episodesLst.onmouseover = (evt) => {
            if (episodesLst.style.display == "flex")
                this.episodePreview.play()
        }

        episodesLst.onmouseleave = (evt) => {
            if (episodesLst.style.display == "flex")
                this.episodePreview.pause()
        }
    }

    connectedCallback() {

        if (this.titlePreview.src.length > 0) {
            return
        }

        let title = this.title_
        let globule = title.globule;
        this.shadowRoot.querySelector("globular-informations-manager").setTitlesInformation([title])

        // Display the episode informations.
        title.onLoadEpisodes = (episodes) => {
            if (this.shadowRoot.querySelector("#loading-episodes-infos").style.display == "none") {
                return // already loaded
            }

            this.shadowRoot.querySelector("#loading-episodes-infos").style.display = "none"
            this.shadowRoot.querySelector(".season-episodes-lst").style.display = "flex"
            this.shadowRoot.querySelector(".video-div").style.display = "none"
            let serieInfoBtn = this.shadowRoot.querySelector("#title-info-button")
            serieInfoBtn.style.position = "absolute"
            serieInfoBtn.style.right = "0px"
            serieInfoBtn.style.bottom = "0px"

            this.shadowRoot.querySelector("#informations-div").appendChild(serieInfoBtn)

            let infos = {}
            episodes.forEach(e => {
                if (!infos[e.getSeason()]) {
                    infos[e.getSeason()] = []
                }
                infos[e.getSeason()].push(e)
            })

            let seasonSelect = this.shadowRoot.querySelector("#season-select")
            let episodeSelect = this.shadowRoot.querySelector("#episode-select")


            let setEpisodeOption = (episode) => {

                let globule = episode.globule
                let rqst = new GetTitleFilesRequest
                rqst.setTitleid(episode.getId())
                let indexPath = globule.config.DataPath + "/search/titles"
                rqst.setIndexpath(indexPath)

                globule.titleService.getTitleFiles(rqst, { domain: globule.domain })
                    .then(rsp => {
                        if (rsp.getFilepathsList().length > 0) {
                            let path = rsp.getFilepathsList().pop()
                            let url = getUrl(globule)

                            let thumbnailPath = path
                            if (thumbnailPath.lastIndexOf(".mp4") != -1 || thumbnailPath.lastIndexOf(".MP4") != -1) {
                                thumbnailPath = thumbnailPath.substring(0, thumbnailPath.lastIndexOf("."))
                            }
                            thumbnailPath = thumbnailPath.substring(0, thumbnailPath.lastIndexOf("/") + 1) + ".hidden" + thumbnailPath.substring(thumbnailPath.lastIndexOf("/")) + "/preview.mp4"

                            thumbnailPath.split("/").forEach(item => {
                                item = item.trim()
                                if (item.length > 0) {
                                    url += "/" + encodeURIComponent(item)
                                }
                            })
                            this.episodePreview.src = url

                            this.shadowRoot.querySelector("#epsiode-preview").onclick = this.shadowRoot.querySelector("#play-episode-video-button").onclick = () => {
                                playVideo(path, (player, episode) => {
                                    playTitleListener(player, episode, indexPath, globule)
                                }, null, episode, episode.globule)
                            }

                            this.shadowRoot.querySelector("#episode-info-button").onclick = () => {
                                this.showTitleInfo(episode)
                            }

                        }
                    }).catch(err => {
                        console.log("No file found with title ", title.getId(), title.getDescription(), err)
                    })
            }


            let setEpisodeOptions = (episodes) => {
                // remove previous choice...
                episodeSelect.innerHTML = ""
                let index = 0
                episodes.forEach(e => {
                    let episodeOpt = document.createElement("option")
                    e.value = e.getEpisode()
                    episodeOpt.innerHTML = "Episode " + e.getEpisode()
                    episodeSelect.appendChild(episodeOpt)
                    episodeOpt.episode = e
                    if (index == 0) {
                        setEpisodeOption(e)
                    }
                    index++
                })
            }

            let index = 0;
            for (var season_number in infos) {
                let seasonOpt = document.createElement("option")
                seasonOpt.value = season_number
                seasonOpt.innerHTML = "Season " + season_number
                seasonSelect.appendChild(seasonOpt)

                if (index == 0) {
                    setEpisodeOptions(infos[season_number])
                }

                // keep in the option itself
                seasonOpt.episodes = infos[season_number]
                index++

            }

            seasonSelect.onchange = (evt) => {
                evt.stopPropagation()
                var opt = seasonSelect.options[seasonSelect.selectedIndex];
                setEpisodeOptions(opt.episodes)
            }

            episodeSelect.onchange = (evt) => {
                evt.stopPropagation()
                var opt = episodeSelect.options[episodeSelect.selectedIndex];
                setEpisodeOption(opt.episode)
            }
        }

        if (this.title_.getType() == "TVSeries") {
            this.shadowRoot.querySelector("#title-preview").style.display = "none"
            this.shadowRoot.querySelector("#play-video-button").style.display = "none"
        } else {
            this.shadowRoot.querySelector("#loading-episodes-infos").style.display = "none"
        }

        this.shadowRoot.querySelector("#title-info-button").onclick = () => {
            this.showTitleInfo(title)
        }

        let url = getUrl(globule)

        // paly only the first file...
        let rqst = new GetTitleFilesRequest
        rqst.setTitleid(title.getId())
        let indexPath = globule.config.DataPath + "/search/titles"
        rqst.setIndexpath(indexPath)

        globule.titleService.getTitleFiles(rqst, { domain: globule.domain })
            .then(rsp => {
                if (rsp.getFilepathsList().length > 0) {
                    let path = rsp.getFilepathsList().pop()

                    let thumbnailPath = path
                    if (thumbnailPath.lastIndexOf(".mp4") != -1 || thumbnailPath.lastIndexOf(".MP4") != -1) {
                        thumbnailPath = thumbnailPath.substring(0, thumbnailPath.lastIndexOf("."))
                    }
                    thumbnailPath = thumbnailPath.substring(0, thumbnailPath.lastIndexOf("/") + 1) + ".hidden" + thumbnailPath.substring(thumbnailPath.lastIndexOf("/")) + "/preview.mp4"

                    thumbnailPath.split("/").forEach(item => {
                        item = item.trim()
                        if (item.length > 0) {
                            url += "/" + encodeURIComponent(item)
                        }
                    })
                    this.titlePreview.src = url

                    this.shadowRoot.querySelector("#title-preview").onclick = this.shadowRoot.querySelector("#play-video-button").onclick = () => {
                        playVideo(path, (player, title) => {
                            playTitleListener(player, title, indexPath, globule)
                        }, null, title, title.globule)
                    }
                } else {
                    console.log("no file are found for title ", title.getId())
                }
            }).catch(err => {
                console.log("-----------------> ", err, globule)
            })

    }


    setTitle(title) {
        this.title_ = title;
    }

    showTitleInfo(title) {
        //let uuid = randomUUID()
        let html = `
        <style>

            paper-card {
                background: var(--palette-background-default);
                border-top: 1px solid var(--surface-color);
                border-left: 1px solid var(--surface-color);
            }
        </style>

        <paper-card>
            <globular-informations-manager id="title-info-box"></globular-informations-manager>
        </paper-card>
        `
        let titleInfoBox = document.getElementById("title-info-box")
        if (titleInfoBox == undefined) {
            let range = document.createRange()
            document.body.appendChild(range.createContextualFragment(html))
            titleInfoBox = document.getElementById("title-info-box")
            titleInfoBox.parentNode.style.position = "fixed"
            titleInfoBox.parentNode.style.top = "75px"
            titleInfoBox.parentNode.style.left = "50%"
            titleInfoBox.parentNode.style.transform = "translate(-50%)"
        }
        titleInfoBox.setTitlesInformation([title])
    }

}

customElements.define('globular-search-title-detail', SearchTitleDetail)
