import getUuidByString from "uuid-by-string"


function getPersonById(globule, indexPath, id, callback, errorCallback) {

    generatePeerToken(globule, token => {
        let rqst = new GetPersonByIdRequest
        rqst.setIndexpath(indexPath)
        rqst.setPersonid(id)

        globule.titleService.getPersonById(rqst, { domain: globule.domain, token: token })
            .then(rsp => {
                callback(rsp.getPerson())
            }).catch(err => {
                errorCallback(err)
            })
    })
}

/**
 * Retreive a list of person, Actor's, Writer's, Director's, Casting
 * @param {*} query 
 * @param {*} indexpath 
 * @param {*} callback 
 */
export function searchPersons(query, indexpath, callback) {

    let index = 0
    let globules = Backend.getGlobules()
    let persons = []

    let __searchPerson__ = (index) => {
        let globule = globules[index]
        index++

        generatePeerToken(globule, token => {

            // so here I will search for given person...
            let rqst = new SearchPersonsRequest
            rqst.setIndexpath(indexpath)
            rqst.setQuery(query)
            rqst.setOffset(0)
            rqst.setSize(1000)

            let stream = globule.titleService.searchPersons(rqst, { domain: globule.domain, token: token })
            stream.on("data", (rsp) => {
                if (rsp.hasHit()) {
                    let hit = rsp.getHit()
                    persons.push(hit.getPerson())
                }
            });

            stream.on("status", (status) => {
                if (status.code == 0) {
                    // Here I will sort the episodes by seasons and episodes.
                    persons = persons.sort((a, b) => {
                        if (a.getFullname() === b.getFullname()) {
                            // Price is only important when cities are the same
                            return a.getFullname() - b.getFullname();
                        }
                        return a.getFullname() - b.getFullname();
                    })

                    persons = [...new Map(persons.map(v => [v.getId(), v])).values()]

                    persons.forEach(p => {
                        p.globule = globule
                    })

                    callback(persons)

                } else {
                    displayError(status.details, 3000)
                }
            });
        })

    }


    if (globules.length > 0) {
        __searchPerson__(index)
    } else {
        callback([])
    }

}


/**
 * Search existing person infos...
 */
export class SearchPersonInput extends HTMLElement {
    // attributes.


    // Create the applicaiton view.
    constructor() {

        super()

        this.indexPath = this.getAttribute("indexpath")
        this.titleInfo = null

        // Set the shadow dom.
        this.attachShadow({ mode: 'open' });

        // Innitialisation of the layout.
        this.shadowRoot.innerHTML = `
        <style>
           
            #container{
                display: flex;
                flex-direction: column;
                background-color: var(--surface-color);
                color: var(--primary-text-color);
            }

            paper-input {
                margin-left: 5px;
            }

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

            .search-results{
                background-color: var(--surface-color);
                color: var(--primary-text-color);
                max-height: 300px;
                padding: 10px;
                overflow-y: auto;
                align-items: center;
                justify-content: center;
            }

            iron-icon{
                height: 18px;
                margin-right: 5px;
            }

            iron-icon:hover{
                cursor: pointer;
            }

        </style>

        <div id="container">
            <div style="display: flex; align-items: center; min-width: 240px; padding: 5px;">
                <iron-icon icon="icons:search"></iron-icon>
                <paper-input no-label-float></paper-input>
            </div>

            <div class="search-results"> </div>

        </div>

        `
        // give the focus to the input.
        let input = this.shadowRoot.querySelector("paper-input")
        setTimeout(() => {
            input.focus()
            input.inputElement.inputElement.select()
        }, 100)

        input.onkeyup = (evt) => {
            if (evt.key == "Enter") {
                this.shadowRoot.querySelector(".search-results").innerHTML = ""

                if (evt.target.value.length >= 3) {
                    console.log("search for: ", evt.target.value)
                    searchPersons(evt.target.value, this.indexPath, persons => {
                        if (persons.length > 0) {


                            let range = document.createRange()

                            persons.forEach(p => {

                                let uuid = "_" + getUuidByString(p.getId())

                                let html = `
                                <div id="${uuid}-div" style="display: flex; min-width: 240px; align-items: center; border-bottom: 1px solid var(--palette-divider); padding-bottom: 10px; margin-bottom: 10px;">
                                    <img style="height: 55px; width: 55px; border-radius: 27.5px;" src="${p.getPicture()}"></img>
                                    <div style="display: flex; flex-direction: column; width: 100%;">
                                        <span style="flex-grow: 1; font-size: 1.2rem; margin-left: 10px; justify-self: flex-start;">${p.getFullname()}</span>
                                        <div style="display: flex; justify-content: flex-end;">
                                            <iron-icon id="${uuid}-edit-btn" icon="image:edit" title="edit person informations"></iron-icon>
                                            <iron-icon id="${uuid}-add-btn" icon="icons:add" title="add to the casting"></iron-icon>
                                        </div>
                                    </div>
                                </div>
                                `

                                let div = this.querySelector(`#${uuid}-div`)
                                if (!div) {
                                    this.shadowRoot.querySelector(".search-results").appendChild(range.createContextualFragment(html));
                                    div = this.querySelector(`#${uuid}-div`)

                                    // Now the action...
                                    let editBtn = this.shadowRoot.querySelector(`#${uuid}-edit-btn`)
                                    editBtn.onclick = () => {
                                        this.editPerson(p)
                                    }

                                    let addBtn = this.shadowRoot.querySelector(`#${uuid}-add-btn`)
                                    addBtn.onclick = () => {
                                        this.addPerson(p)
                                    }
                                }
                            })
                        }
                    })


                } else {
                    displaySuccess("search value must be longer thant 3 character", 3500)
                }

            } else if (evt.key == "Escape") {
                if (this.onclose) {
                    this.shadowRoot.querySelector(".search-results").innerHTML = ""

                    this.onclose()

                }
            }
        }

    }

    editPerson(p) {
        if (this.oneditperson != null) {
            this.oneditperson(p)
        }
    }

    addPerson(person) {
        if (this.onaddcasting) {
            this.onaddcasting(person)
        }
    }
}

customElements.define('globular-search-person-input', SearchPersonInput)
