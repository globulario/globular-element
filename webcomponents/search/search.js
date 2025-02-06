import { SearchTitlesRequest } from "globular-web-client/title/title_pb"
import { Backend, displayMessage, getUrl } from "../../backend/backend"
import { playVideo } from "../video"
import { SearchBlogPostsRequest } from "globular-web-client/blog/blog_pb"
import { SearchDocumentsRequest } from "globular-web-client/search/search_pb"
import getUuidByString from "uuid-by-string"

// Keep in memory to speed up....
var images = {}
var titles = {}
const MAX_RESULTS = 150

export function getCoverDataUrl(callback, videoId, videoUrl, videoPath, globule = Backend.globular) {

    // set the url for the image.
    let url = getUrl(globule)

    // set the api call
    url += "/get_video_cover_data_url"

    // Set url query parameter.
    url += "?domain=" + globule.domain
    url += "&id=" + videoId
    url += "&url=" + videoUrl
    url += "&path=" + videoPath

    if (images[url] != null) {
        callback(images[url])
        return
    }

    var xhr = new XMLHttpRequest();
    xhr.timeout = 1500
    xhr.open('GET', url, true);
    xhr.setRequestHeader("domain", globule.domain);

    // Set responseType to 'arraybuffer', we want raw binary data buffer
    xhr.responseType = 'text';
    xhr.onload = (rsp) => {
        if (rsp.currentTarget.status == 200) {
            images[url] = rsp.currentTarget.response
            callback(rsp.currentTarget.response)
        } else {
            console.log("fail to create thumbnail ", videoId, videoUrl, videoPath)
        }
    };

    xhr.send();
}

// That function will be use to asscociate file with imdb information.
export function getImdbInfo(id, callback, errorcallback, globule) {

    if (titles[id]) {
        if (titles[id].ID) {
            callback(titles[id])
        } else {
            titles[id].callbacks.push(callback)
        }
        return
    }

    titles[id] = {}
    titles[id].callbacks = []
    titles[id].callbacks.push(callback)

    let url = getUrl(globule)
    url += "/imdb_title?id=" + id

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.timeout = 10 * 1000
    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && (this.status == 201 || this.status == 200)) {
            var obj = JSON.parse(this.responseText);
            while (titles[obj.ID].callbacks.length > 0) {
                let callback = titles[obj.ID].callbacks.pop()
                callback(obj)
            }

            titles[obj.ID] = obj
            // Now I will 

        } else if (this.readyState == 4) {
            errorcallback("fail to get info from query " + url + " status " + this.status)
        }
    };

    xmlhttp.open("GET", url, true);
    xmlhttp.setRequestHeader("domain", globule.domain);

    xmlhttp.send();
}

export function playTitleListener(player, title, indexPath) {
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

// Search over multiple peers...
export function search(query, contexts_, offset) {

    // Connections can contain many time the same address....
    let globules = Backend.getGlobules()

    if (offset == undefined) {
        offset = 0;
    }

    let index = 0

    let search_in_globule = (globules) => {
        let contexts = [...contexts_];

        if (index < globules.length) {

            let g = globules[index]
            index++

            // Search recursively...
            let search_in_context_ = (contexts) => {
                let context = contexts.pop()
                if (context) {
                    let indexPath = g.config.DataPath + "/search/" + context
                    if (context == "blogPosts") {
                        if (contexts.length == 0) {
                            searchBlogPosts(g, query, contexts_, indexPath, offset, MAX_RESULTS, () => {
                                search_in_globule(globules)
                            })
                        } else {
                            searchBlogPosts(g, query, contexts_, indexPath, offset, MAX_RESULTS, () => {
                                search_in_context_(contexts)
                            })
                        }
                    } else if (context == "webPages") {

                        if (contexts.length == 0) {
                            searchWebpageContent(g, query, contexts_, offset, MAX_RESULTS, () => {
                                search_in_globule(globules)
                            })
                        } else {
                            searchWebpageContent(g, query, contexts_, offset, MAX_RESULTS, () => {
                                search_in_context_(contexts)
                            })
                        }
                    } else {

                        if (contexts.length == 0) {
                            searchTitles(g, query, contexts_, indexPath, offset, MAX_RESULTS, () => {
                                search_in_globule(globules)
                            }, null)
                        } else {
                            searchTitles(g, query, contexts_, indexPath, offset, MAX_RESULTS, () => {
                                search_in_context_(contexts)
                            }, null)
                        }
                    }
                }
            }

            // search contexts
            search_in_context_(contexts)
        }
    }

    // start the search
    search_in_globule(globules)
}

/** 
 * Search titles...
 */
function searchTitles(globule, query, contexts, indexPath, offset, max, callback, fields) {

    // This is a simple test...
    let rqst = new SearchTitlesRequest
    rqst.setIndexpath(indexPath)
    rqst.setQuery(query)
    rqst.setOffset(offset)
    rqst.setSize(max)
    if (fields) {
        rqst.setFieldsList(fields)
    }

    let hits = []

    let stream = globule.titleService.searchTitles(rqst, { domain: globule.domain })
    stream.on("data", (rsp) => {
        if (rsp.hasSummary() && !fields) {
            Backend.eventHub.publish("_display_search_results_", {}, true)
            Backend.eventHub.publish("__new_search_event__", { query: query, summary: rsp.getSummary(), contexts: contexts, offset: offset }, true)
        } else if (rsp.hasFacets() && !fields) {
            let uuid = "_" + getUuidByString(query)
            Backend.eventHub.publish(`${uuid}_search_facets_event__`, { facets: rsp.getFacets() }, true)
        } else if (rsp.hasHit()) {
            let hit = rsp.getHit()
            hit.globule = globule // keep track where the hit was found...
            if (hit.hasAudio()) {
                hit.getAudio().globule = globule
            } else if (hit.hasTitle()) {
                hit.getTitle().globule = globule
            } else if (hit.hasVideo()) {
                hit.getVideo().globule = globule
            } else if (hit.hasBlog()) {
                hit.getBlog().globule = globule
            }

            if (!fields) {
                // display the value in the console...
                hit.getSnippetsList().forEach(val => {
                    let uuid = "_" + getUuidByString(query)
                    Backend.eventHub.publish(`${uuid}_search_hit_event__`, { hit: hit, context: indexPath.substring(indexPath.lastIndexOf("/") + 1) }, true)
                })
            } else {
                console.log(globule, hit)
                // keep it
                hits.push(hit)
            }

        }
    });

    stream.on("status", (status) => {
        if (status.code != 0) {
            // In case of error I will return an empty array
            console.log(status.details)
        }

        callback(hits)
    });
}

function searchBlogPosts(globule, query, contexts, indexPath, offset, max, callback) {

    // This is a simple test...
    let rqst = new SearchBlogPostsRequest
    rqst.setIndexpath(indexPath)
    rqst.setQuery(query)
    rqst.setOffset(offset)
    rqst.setSize(max)

    let stream = globule.blogService.searchBlogPosts(rqst, { domain: globule.domain})
    stream.on("data", (rsp) => {

        if (rsp.hasSummary()) {
            Backend.eventHub.publish("_display_search_results_", {}, true)
            Backend.eventHub.publish("__new_search_event__", { query: query, summary: rsp.getSummary(), contexts: contexts, offset: offset }, true)
        } else if (rsp.hasFacets()) {
            let uuid = "_" + getUuidByString(query)
            Backend.eventHub.publish(`${uuid}_search_facets_event__`, { facets: rsp.getFacets() }, true)
        } else if (rsp.hasHit()) {
            let hit = rsp.getHit()
            hit.globule = globule // keep track where the hit was found...
            // display the value in the console...
            hit.getSnippetsList().forEach(val => {
                let uuid = "_" + getUuidByString(query)
                Backend.eventHub.publish(`${uuid}_search_hit_event__`, { hit: hit, context: indexPath.substring(indexPath.lastIndexOf("/") + 1) }, true)
            })
        }
    });

    stream.on("status", (status) => {
        if (status.code != 0) {
            // In case of error I will return an empty array
            console.log(status.details)
        }
        callback()
    });
}

/**
 * Search document...
 * @param {*} query 
 */
export function searchWebpageContent(globule, query, contexts, offset, max, callback) {

    let router = document.querySelector("globular-router")
    let application = router.getAttribute("base")

    // Search over web-content.
    let rqst = new SearchDocumentsRequest
    rqst.setPathsList([globule.config.DataPath + "/search/applications/" + application])
    rqst.setLanguage("en")
    rqst.setFieldsList(["Text"])
    rqst.setOffset(offset)
    rqst.setPagesize(max)
    rqst.setQuery(query)
    let startTime = performance.now()

    let stream = globule.searchService.searchDocuments(rqst, {
        domain: globule.domain, 
        application: application
    })

    let results = []
    stream.on("data", (rsp) => {
        results = results.concat(rsp.getResults().getResultsList())
    });

    stream.on("status", (status) => {
        if (status.code != 0) {
            // In case of error I will return an empty array
            console.log("fail to retreive ", query, status.details)
        } else {
            let took = performance.now() - startTime
            Backend.eventHub.publish("__new_search_event__", { query: query, summary: { getTotal: () => { return results.length }, getTook: () => { return took } }, contexts: contexts, offset: offset }, true)
            Backend.eventHub.publish("display_webpage_search_result_" + query, results, true)
        }

        callback()
    });

}
