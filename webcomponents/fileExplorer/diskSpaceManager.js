import { GetThumbnailsRequest } from "globular-web-client/file/file_pb";
import { TargetsRequest } from "globular-web-client/monitoring/monitoring_pb";
import { GetSubjectAllocatedSpaceRqst, GetSubjectAvailableSpaceRqst, SetSubjectAllocatedSpaceRqst, SubjectType } from "globular-web-client/rbac/rbac_pb";
import { Backend } from "../../backend/backend";
import { getCoords, getFileSizeString} from "../utility";


/**
 * Manage account dist space.
 */
export class DiskSpaceManager extends HTMLElement {
  // attributes.

  // Create the applicaiton view.
  constructor() {
    super()

    this.allocated_space = 0;
    this.available_space = 0;
    this.account = null;
    this.globule = Backend.globular;

    // Set the shadow dom.
    this.attachShadow({ mode: 'open' });
    // Innitialisation of the layout.
    this.shadowRoot.innerHTML = `
    <style>
       
        #container{
          display: flex;
          flex-direction: column;
          position: relative;
          font-size: 1rem;
        }

        #error-message-div{
          display: none;
          text-decoration: underline;
          color: var(--palette-error-main);
        }

        #error-message-div:hover{
          cursor: pointer;
        }

        paper-card{
          background-color: var(--surface-color);
          color: var(--primary-text-color);
        }

    </style>
    <div id="container">
        <div id="disk-space-div" style="display: flex; flex-direction: column;">
          <div id="disk-space-usage-div" style="display: flex; font-size: .85rem">
            <span id="used-space-span">${getFileSizeString(this.allocated_space - this.available_space)}</span> / <span  id="allocated-space-span">${getFileSizeString(this.allocated_space)}</span>
          </div>
          <div id="error-message-div"></div>
          <paper-progress value="${this.allocated_space - this.available_space}" min="0" max="${this.allocated_space}"></paper-progress>
        </div>
        <paper-tooltip for="disk-space-div" role="tooltip" tabindex="-1">no space allocated for ${this.getAttribute("")}</paper-tooltip>
    </div>
    `

    // give the focus to the input.
    this.tooltip = this.shadowRoot.querySelector("paper-tooltip")
    this.diskUsageDiv = this.shadowRoot.querySelector("#disk-space-usage-div")
    this.allocatedSpaceSpan = this.shadowRoot.querySelector("#allocated-space-span")
    this.usedSpaceSpan = this.shadowRoot.querySelector("#used-space-span")
    this.errorMessageDiv = this.shadowRoot.querySelector("#error-message-div")
    this.progressBar = this.shadowRoot.querySelector("paper-progress")

    if (this.hasAttribute("editable")) {
      if (this.getAttribute("editable") == "true") {
        this.allocatedSpaceSpan.onclick = this.errorMessageDiv.onclick = () => {
          this.displayAllocatedSpaceInputBox()
        }

        this.allocatedSpaceSpan.onmouseover = () => {
          this.style.cursor = "pointer"
        }

        this.allocatedSpaceSpan.onmouseleave = () => {
          this.style.cusor = "default"
        }

        this.allocatedSpaceSpan.style.textDecoration = "underline"
      }
    }

  }

  // The connection callback.
  connectedCallback() {

    this.refresh()

  }

  // display the allocate space input box.
  displayAllocatedSpaceInputBox() {
    let inputBox = document.body.querySelector("#allocated-space-box")
    if (inputBox) {
      return
    }

    let html = `
      <paper-card id="allocated-space-box" style="position: absolute; z-index: 100; display: flex; flex-direction: column; padding-left: 10px; padding-right: 10px; background-color: var(--surface-color); color: var(--primary-text-color);">
        <paper-input id="allocated-space-input" type="number" step="1" min="0" label="Allocated Space (GB)"></paper-input>
        <div style="display: flex; width: 100%; justify-content: flex-end;">
          <paper-button id="set-space-btn" style="font-size: 1rem;">
            Allocate
          </paper-button>
          <paper-button id="cancel-btn" style="font-size: 1rem;">
            Cancel
          </paper-button>
        </div>
      </paper-card>
    `

    let range = document.createRange()
    document.body.appendChild(range.createContextualFragment(html))

    inputBox = document.body.querySelector("#allocated-space-box")
    let coord = getCoords(this)
    inputBox.style.top = coord.top + 40  + "px"
    inputBox.style.left = coord.left + "px"

    let input = document.body.querySelector("#allocated-space-input")
    input.value = this.allocated_space / 1073741824

    // simply remove the input box
    document.body.querySelector("#cancel-btn").onclick = () => {
      inputBox.parentNode.removeChild(inputBox)
    }

    // set the new allocated space.
    document.body.querySelector("#set-space-btn").onclick = () => {

      let rqst = new SetSubjectAllocatedSpaceRqst
      if (this.hasAttribute("account")) {
        let accountId = this.account.getId() + "@" + this.account.getDomain()
        rqst.setSubject(accountId)
        rqst.setType(SubjectType.ACCOUNT)
      } else if (this.hasAttribute("application")) {
        rqst.setSubject(this.getAttribute("application"))
        rqst.setType(SubjectType.APPLICATION)
      }

      let space = parseInt(input.value) * 1073741824;
      rqst.setAllocatedSpace(space)
      let token = localStorage.getItem("user_token")

      // call persist data
      this.globule.rbacService
        .setSubjectAllocatedSpace(rqst, {
          token: token,
          domain: this.globule.domain
        })
        .then((rsp) => {
          // Here I will return the value with it
          this.allocated_space = space
          this.setAllocatedSpace() // refresh the value.
        })
        .catch((err) => {
          console.log(err)
          displayError(err, 3000)
        });

        inputBox.parentNode.removeChild(inputBox)
    }

    setTimeout(() => {
      input.focus()
      input.inputElement.inputElement.select()
    }, 100)

  }

  setAvailableSpace() {
    this.tooltip.innerHTML = `${getFileSizeString(this.allocated_space - this.available_space)} (${parseFloat(((this.allocated_space - this.available_space) / this.allocated_space) * 100).toFixed(2)}%) used space of ${getFileSizeString(this.allocated_space)} `
    this.errorMessageDiv.style.display = "none"
    this.diskUsageDiv.style.display = "block"
    this.progressBar.style.display = "block"
    this.progressBar.value = this.allocated_space - this.available_space
    this.usedSpaceSpan.innerHTML = getFileSizeString(this.allocated_space - this.available_space)
  }

  // Set the allocated space in displayed by the component
  setAllocatedSpace() {
    this.errorMessageDiv.style.display = "none"
    this.diskUsageDiv.style.display = "block"
    this.progressBar.style.display = "block"
    this.progressBar.setAttribute("max", this.allocated_space)
    this.allocatedSpaceSpan.innerHTML = getFileSizeString(this.allocated_space)
  }

  getAllocatedSpace(id, type, callback, errorCallback) {

    let rqst = new GetSubjectAllocatedSpaceRqst
    rqst.setSubject(id)
    rqst.setType(type)

    let token = localStorage.getItem("user_token")

    // call persist data
    this.globule.rbacService
      .getSubjectAllocatedSpace(rqst, {
        token: token,
        domain: this.globule.domain
      })
      .then((rsp) => {
        // Here I will return the value with it
        this.allocated_space = rsp.getAllocatedSpace()
        callback();
      })
      .catch((err) => {
        console.log("fail to get allocated space for ", id, err)
        errorCallback(err);
      });
  }

  getAvailableSpace(id, type, callback, errorCallback) {
    this.progressBar.setAttribute("indeterminate", "")
    let rqst = new GetSubjectAvailableSpaceRqst
    rqst.setSubject(id)
    rqst.setType(type)

    let token = localStorage.getItem("user_token")

    // call persist data
    this.globule.rbacService
      .getSubjectAvailableSpace(rqst, {
        token: token,
        domain: this.globule.domain
      })
      .then((rsp) => {
        // Here I will return the value with it
        this.available_space = rsp.getAvailableSpace()
        this.progressBar.removeAttribute("indeterminate")
        callback();
      })
      .catch((err) => {
        errorCallback(err);
        if (err.message.indexOf("no space available for") != -1) {
          this.available_space = 0;
          this.progressBar.removeAttribute("indeterminate")
          callback()
        }
      });
  }

  refresh() {
    if(this.account == null){
        return
    }

    if (this.hasAttribute("account")) {
      let accountId = this.account.getId() + "@" + this.account.getDomain()
      if (accountId.startsWith("sa@")) {
        this.style.display = "none"; // nothing to show about sa account
      } else {
        this.getAllocatedSpace(accountId, SubjectType.ACCOUNT,
          () => {
            this.setAllocatedSpace()
            this.getAvailableSpace(accountId, SubjectType.ACCOUNT, () => {
              this.setAvailableSpace()
            }, err => displayError(err, 3000))
          },
          err => {
            console.log(err);
            this.errorMessageDiv.innerHTML = `no space was allocated for user ${this.account.getName()}`
            this.tooltip.innerHTML = `click here to allocate space`
            this.errorMessageDiv.style.display = "block"
            this.diskUsageDiv.style.display = "none"
            this.progressBar.style.display = "none"
          })
      }
    } else if (this.hasAttribute("application")) {

      this.getAllocatedSpace(this.getAttribute("application"), SubjectType.APPLICATION, () => {
        this.setAllocatedSpace()
        this.getAvailableSpace(this.getAttribute("application"), SubjectType.APPLICATION, () => {
          this.setAvailableSpace()
        }, err => displayError(err, 3000))

      },
        err => {

          this.errorMessageDiv.innerHTML = `no space was allocated for application ${this.getAttribute("application")}`
          this.tooltip.innerHTML = `click here to allocate space`
          this.errorMessageDiv.style.display = "block"
          this.diskUsageDiv.style.display = "none"
          this.progressBar.style.display = "none"
        })
    } else {
      console.log("no account or application was found...")
    }
  }

}

customElements.define('globular-disk-space-manager', DiskSpaceManager)