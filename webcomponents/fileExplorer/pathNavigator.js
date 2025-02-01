import { Backend } from "../../backend/backend";
import { FileController } from "../../backend/file";
import { AccountController } from "../../backend/account";

export class PathNavigator extends HTMLElement {
    constructor() {
        super()
        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // the main div.
        this.div = undefined

        // The active explorer path.
        this.path = undefined

        // The function will be call in case of error.
        this.onerror = err => displayError(err, 3000);

        // List of listeners...
        this.navigationListener = ""

        // The file explorer.
        this._file_explorer_ = undefined

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
            <style>
               

                #path-navigator-box{
                    flex-grow: 1;
                    background-color: var(--surface-color);
                    color: var(--primary-text-color);
                    display: flex;
                    align-items: center;
                    user-select: none;
                    flex-wrap: wrap;
                    padding: 0px 5px 0px 5px;
                    margin-right: 10px;
                }

                .path-navigator-box-span{
                    display: inherit;
                    max-width: 350px;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    user-select: none;
                }


            </style>

            <div id="path-navigator-box">
            </div>
            `

        this.div = this.shadowRoot.querySelector("#path-navigator-box")
    }

    init() {

        // The the path
        Backend.eventHub.subscribe("__set_dir_event__",
            (uuid) => {
                /** Nothin here. */
            },
            (evt) => {
                if (this._file_explorer_.id == evt.file_explorer_id) {
                    this.setDir(evt.dir)
                }
            }, true, this
        )
    }


    // Set the directory.
    setDir(dir) {
        if (!dir) {
            return
        }

        if(!FileController.validateDirAccess(dir)){
            return
        }

        if (dir._mime == "stream.hls") {
            // Here I will simply return...
            return
        }

        let values = dir.getPath().split("/")

        // remove empty array...
        values = values.filter(element => {
            return element !== '';
        });

        // Clear actual values.
        this.div.innerHTML = "";
        this.path = dir.getPath();

        let index = 0;

        let path_ = ""

        for (const dir of values) {

            let titleDiv = document.createElement("div")
            titleDiv.style.display = "flex"
            titleDiv.style.position = "relative"

            let title = document.createElement("span")
            title.className = "path-navigator-box-span"
            title.style.display = "inline"
            if (dir.length > 20) {
                title.title = dir
            }

            title.innerHTML = dir

            if (dir.startsWith(AccountController.account.getId())) {
                title.innerHTML = dir.replace(AccountController.account.getId(), AccountController.account.getName())
            }

            // if the directory path sart with / ...
            if (index == 0) {
                if (this.path.startsWith("/")) {
                    path_ = "/" + dir
                } else {
                    path_ = dir
                }
            } else {
                path_ += "/" + dir
            }


            titleDiv.appendChild(title)
            let path__ = path_

            let directoriesDiv = null
            if (index < values.length - 1) {
                // Here I will also append a button to go to a given path.
                let btn = document.createElement("iron-icon")
                btn.style.position = "relative"
                btn.icon = "icons:chevron-right"
                titleDiv.appendChild(btn)

                // Display the list of all subdirectories...
                btn.onclick = (evt) => {
                    evt.stopPropagation()
                    if (btn.icon == "icons:expand-more") {
                        directoriesDiv.style.display = "none"
                        btn.icon = "icons:chevron-right"
                        return
                    }

                    btn.icon = "icons:expand-more"

                    if (directoriesDiv != null) {
                        directoriesDiv.style.display = "flex"
                        return
                    }


                    // Create the div that will contain the list of sub-directories.
                    directoriesDiv = document.createElement("paper-card")
                    directoriesDiv.className = "directories-selector"
                    directoriesDiv.style.display = "flex"
                    directoriesDiv.style.flexDirection = "column"
                    directoriesDiv.style.position = "absolute"
                    directoriesDiv.style.padding = "5px"
                    directoriesDiv.style.zIndex = "1000";
                    directoriesDiv.style.top = title.offsetHeight + "px"
                    directoriesDiv.style.right = "0px"
                    directoriesDiv.style.backgroundColor = "var(--surface-color)"
                    directoriesDiv.style.color = "var(--primary-text-color)"

                    FileController.readDir(path__, (dir) => {

                        this._file_explorer_.resume()

                        // Send read dir event.
                        for (let subDir of dir.getFilesList()) {
                            let subDirDiv = document.createElement("div")

                            let subDirSpan = document.createElement("span")
                            subDirSpan.innerHTML = subDir.name;
                            subDirSpan.padding = "4px"
                            subDirDiv.appendChild(subDirSpan)

                            if (subDir.getIsDir()) {
                                directoriesDiv.appendChild(subDirDiv)

                                // Here I will set the span event.
                                subDirSpan.onmouseover = () => {
                                    subDirSpan.style.cursor = "pointer"
                                    subDirSpan.style.setProperty("background-color", "var(--surface-color)")
                                }

                                subDirSpan.onmouseleave = () => {
                                    subDirSpan.style.cursor = "default"
                                    subDirSpan.style.setProperty("background-color", "var(--surface-color)")
                                }

                                subDirSpan.onclick = (evt) => {
                                    evt.stopPropagation()
                                    this._file_explorer_.publishSetDirEvent(subDir.getPath())
                                    directoriesDiv.style.display = "none"
                                    btn.icon = "icons:chevron-right"
                                }

                            }
                        }

                        title.appendChild(directoriesDiv)
                        directoriesDiv.style.right = -1 * (directoriesDiv.offsetWidth - btn.offsetWidth) + "px"

                        directoriesDiv.onmouseleave = () => {
                            directoriesDiv.style.display = "none"
                            if (btn == null) {
                                btn.icon = "icons:chevron-right"
                            }
                        }
                    }, err => { console.log(err); file_explorer_.resume(); }, this._file_explorer_.globule)
                }

                btn.onmouseover = () => {
                    btn.style.cursor = "pointer"
                }

                btn.onmouseleave = () => {
                    btn.style.cursor = "default"
                }
            }

            index++

            title.onmouseover = () => {
                title.style.cursor = "pointer"
                title.style.setProperty("background-color", "var(--surface-color)")
            }

            title.onmouseleave = () => {
                title.style.cursor = "default"
                title.style.setProperty("background-color", "var(--surface-color)")
                if (directoriesDiv != undefined) {
                    directoriesDiv.style.display = "none"
                }
            }

            // Set the current directory to the clicked one.
            title.onclick = (evt) => {
                evt.stopPropagation();
                FileController.readDir(path__, (dir) => {
                    this._file_explorer_.resume()
                    // Send read dir event.
                    this._file_explorer_.publishSetDirEvent(dir.getPath())
                }, err => { this._file_explorer_.resume(); console.log(err); }, this._file_explorer_.globule)
            }

            this.div.appendChild(titleDiv)
        }

    }

}

customElements.define('globular-path-navigator', PathNavigator)
