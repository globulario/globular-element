import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-radio-button/paper-radio-button.js";
import "@polymer/paper-radio-group/paper-radio-group.js";
import { FileController } from "../backend/file";
import { Backend, displayMessage, displayError, generatePeerToken, getUrl } from "../backend/backend";
import getUuidByString from "uuid-by-string";
import { GrapesEditor } from "./grapeJS/grape";
import s from "@editorjs/raw";
import { createDir, deleteDir, deleteFile, readDir, uploadFiles } from "globular-web-client/api";
import { html as beautify } from 'js-beautify';
import prettify from 'html-prettify'
import { MoveRequest } from "globular-web-client/file/file_pb";
import { FileExplorer } from "./fileExplorer/fileExplorer";
import { DeleteDocumentRequest, IndexJsonObjectRequest } from "globular-web-client/search/search_pb";


/**
 * Returns an HTML string for a 404 error page
 * @param {string} url The URL that was not found
 * @returns {string} The HTML string for the 404 error page
 * @example
 * getErrorPage('/pages/home') // Returns an HTML string for a 404 error page
 */
function getErrorPage(url) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>404 - Page Not Found</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding-top: 10px;
      padding-bottom: 10px;
      font-family: 'Roboto', sans-serif;
      background-color: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    .container {
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 100%;
    }

    .icon {
      font-size: 5rem;
      color: #ff7043;
    }

    h1 {
      font-size: 4rem;
      color: #333;
      margin: 20px 0;
    }

    p {
      font-size: 1.2rem;
      color: #555;
      margin-bottom: 20px;
    }

  </style>
</head>
<body>
  <div class="container">
    <span class="material-icons icon">error_outline</span>
    <h1>404</h1>
    </br>
    <p>Oops! Looks like you're lost. The page you are looking for doesn’t exist.</p>
    <p style="font-size: .8em;">${url}</p>
  </div>
</body>
</html>
`;
}

class GlobularWebpageManager extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.serverDirectory = '';  // The directory on the server where pages are saved
    this.router = null;
    this.pages = {};
    this.menuItems = [];
    this.index = ""; // The default page

    this.shadowRoot.innerHTML = `
      <style>
      .actions {  
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
      }

      </style>
      <div id="webpage-manager">
        <div id="actions" class="actions">
          <paper-icon-button id="edit-pages"  icon="editor:mode-edit" title="Edit Web Pages"></paper-icon-button>
          <paper-icon-button id="create-page" style="display: none;" icon="add" title="Create Web Page or Directory"></paper-icon-button>
          <paper-icon-button id="open-root-folder" style="display: none;" icon="folder" title="Open pages folders"></paper-icon-button>
          <paper-icon-button id="refresh-pages" icon="refresh"  title="Refresh Web Pages"></paper-icon-button>
        </div>
      </div>
    `;

    if (localStorage.getItem("user_token") == null) {
      this.shadowRoot.querySelector("#actions").style.display = "none";
    }

    let createPageBtn = this.shadowRoot.querySelector('#create-page');
    createPageBtn.addEventListener('click', () => {
      this.createPageOrDir(this.root);
    });

    let openRootFolderBtn = this.shadowRoot.querySelector('#open-root-folder');
    openRootFolderBtn.addEventListener('click', () => {
      let fileExplorer = new FileExplorer();
      document.body.appendChild(fileExplorer);
      fileExplorer.publishSetDirEvent(this.root)
    });

    let refreshPagesBtn = this.shadowRoot.querySelector('#refresh-pages');
    refreshPagesBtn.addEventListener('click', () => {
      this.loadPages(this.root).then(() => {
        // set back the edit mode
        let editMode = editModeBtn.getAttribute('edit-mode') == "true";
        if (!editMode) {
          createPageBtn.style.display = "none";
          openRootFolderBtn.style.display = "none";
          editModeBtn.setAttribute('edit-mode', 'false');
          editModeBtn.style.color = "";
          this.menuItems.forEach((menuItem) => {
            menuItem.removeAttribute('edit-mode');
          });
        } else {
          createPageBtn.style.display = "flex";
          openRootFolderBtn.style.display = "flex";
          refreshPagesBtn.style.display = "flex";
          editModeBtn.setAttribute('edit-mode', 'true');
          editModeBtn.style.color = "var(--paper-green-500)";
          this.menuItems.forEach((menuItem) => {
            menuItem.setAttribute('edit-mode', 'true');
          });
        }
      });
    });

    let editModeBtn = this.shadowRoot.querySelector('#edit-pages')
    editModeBtn.setAttribute('edit-mode', 'false');
    editModeBtn.addEventListener('click', () => {

      let editMode = editModeBtn.getAttribute('edit-mode') == "true";
      if (editMode) {
        createPageBtn.style.display = "none";
        openRootFolderBtn.style.display = "none";
        editModeBtn.setAttribute('edit-mode', 'false');
        editModeBtn.style.color = "";
        this.menuItems.forEach((menuItem) => {
          menuItem.removeAttribute('edit-mode');
        });
      } else {
        createPageBtn.style.display = "flex";
        openRootFolderBtn.style.display = "flex";
        refreshPagesBtn.style.display = "flex";
        editModeBtn.setAttribute('edit-mode', 'true');
        editModeBtn.style.color = "var(--paper-green-500)";
        this.menuItems.forEach((menuItem) => {
          menuItem.setAttribute('edit-mode', 'true');
        });
      }
    });

    // backend-ready custom event listener
    document.addEventListener('backend-ready', (e) => {
      Backend.eventHub.subscribe("login_success_", uuid => { }, (account) => {
        this.shadowRoot.querySelector("#actions").style.display = "flex";
      }, true);

      // Listen for the search result click event
      // Listen for the search result click event
      document.addEventListener("webpage-search-result-clicked", (e) => {
        const { pageId, elementId, elementPath, query } = e.detail;

        let searchResult = document.querySelector("globular-search-results");
        if (searchResult) {
          searchResult.style.display = "none";
        }

        let dynamicWebpage = document.querySelector("globular-dynamic-page");
        if (dynamicWebpage) {
          dynamicWebpage.style.display = "";
        }

        // Set the page content and ensure the iframe loads
        this.setPage(pageId, () => {
          let iframe = dynamicWebpage.iframe;
          if (!iframe) return;

          // Function to execute when the iframe content is ready
          function processIframeContent(iframeDoc) {
            setTimeout(() => {
              let targetElement = iframeDoc.getElementById(elementId);
              if (targetElement) {
                let position = targetElement.getBoundingClientRect();

                // Get the iframe's content div
                let appContentDiv = document.querySelector('div[slot="app-content"]');

                // Scroll smoothly to the element
                appContentDiv.scrollTo({
                  top: position.top + iframe.contentWindow.scrollY - (65 + 10),
                  behavior: "smooth",
                });

                // Remove any previously highlighted text
                let highlighted = iframeDoc.getElementsByClassName("highlighted");
                Array.from(highlighted).forEach((el) => {
                  if (el.lowlight) el.lowlight();
                });

                // **Query Parsing to Extract Words to Highlight**
                let searchTerms = query
                  .split(/\s+/) // Split by whitespace
                  .filter(term => !term.startsWith("-")) // Exclude negative terms
                  .map(term => term.trim()) // Remove any extra spaces
                  .filter(term => term.length > 0); // Remove empty terms

                if (searchTerms.length === 0) return;

                // **Highlight Matching Words**
                let regex = new RegExp(`\\b(${searchTerms.join("|")})\\b`, "gi");
                let text = targetElement.innerHTML;

                text = text.replace(/(<mark class="highlight">|<\/mark>)/gim, ""); // Remove existing highlights
                targetElement.innerHTML = text.replace(regex, '<mark class="highlight">$&</mark>');
                targetElement.classList.add("highlighted");

                // **Function to Remove Highlight When Needed**
                targetElement.lowlight = () => {
                  targetElement.innerHTML = text;
                  targetElement.classList.remove("highlighted");
                  delete targetElement.lowlight;
                };
              }
            }, 500); // Delay to allow page load transition
          }

          // Ensure iframe is fully loaded before trying to access its content
          iframe.addEventListener("load", () => {
            let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc) return;

            // If the document is already loaded, execute immediately
            if (iframeDoc.readyState === "complete") {
              console.log("Iframe document is already loaded.");
              processIframeContent(iframeDoc);
            } else {
              // Wait for DOMContentLoaded inside the iframe
              iframeDoc.addEventListener("DOMContentLoaded", () => {
                console.log("DOMContentLoaded fired inside iframe.");
                processIframeContent(iframeDoc);
              });
            }
          });

          // In case the iframe is already loaded (if setPage was too fast)
          let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc && iframeDoc.readyState === "complete") {
            console.log("Iframe document was already fully loaded.");
            processIframeContent(iframeDoc);
          }
        });
      });

    });


    // add listener for items-change-event event
    document.addEventListener('items-change-event', (e) => {


      let setIndexs = (parent) => {

        let parentPage = this.getPage(parent.getAttribute('path'));

        // from the parent I will set order of ist menu items children
        let menuItems = parent.querySelectorAll(':scope > globular-sidebar-menu-item');
        let index = 0;


        menuItems.forEach((menuItem) => {
          let pageLnk = menuItem.getAttribute('path');
          if (pageLnk) {
            let name = menuItem.getAttribute('name');
            let attributes = parentPage.attributes[name];
            if (attributes) {

              // I will set the index of the menu item
              attributes.index = index;
              menuItem.setAttribute('index', index);

              index++;
            } else {
              console.log("No attributes for ", name)
            }
          } else {
            menuItem.setAttribute('index', menuItems.length - 1);
          }
        });
      }

      let menuItem = e.detail.menuItem;
      let menuItemLnk = menuItem.getAttribute('link');
      let parentLnk = menuItemLnk.substring(0, menuItemLnk.lastIndexOf("/"));
      let parent = document.querySelector(`[link="${parentLnk}"]`);
      if (parent == null && parentLnk == "") {
        parent = document.querySelector(`globular-sidebar-menu`);
      }


      // so the parent has changed
      if (menuItem.parentElement !== parent) {

        // the attributes of the parent has changed
        let oldParentPage = this.getPage(parent.getAttribute('link'));
        let newParentPage = this.getPage(menuItem.parentElement.getAttribute('link'));

        // I will move the attributes from the old parent to the new parent
        newParentPage.attributes[menuItem.getAttribute('name')] = oldParentPage.attributes[menuItem.getAttribute('name')];
        delete oldParentPage.attributes[menuItem.getAttribute('name')];

        // I will set the new link of the page
        let link = menuItem.parentElement.getAttribute('link') + "/" + menuItem.getAttribute('name');
        menuItem.setAttribute('link', link);

        // set the path of the page or directory to move
        let oldPagePath = oldParentPage.path + "/" + menuItem.getAttribute('name');

        let moveFileRqst = new MoveRequest();
        moveFileRqst.setPath(newParentPage.path);
        moveFileRqst.setFilesList([oldPagePath]);

        Backend.globular.fileService.move(moveFileRqst, { token: localStorage.getItem("user_token") })
          .then(() => {
            // I will set the index of the menu items
            setIndexs(parent);
            setIndexs(menuItem.parentElement);
            // I will save the attributes of the parent's
            this.saveAttributes(oldParentPage.path);
            this.saveAttributes(newParentPage.path);
          })
          .catch(err => displayError(err, 3000));

      } else {
        // I will set the index of the menu items
        setIndexs(parent);
        this.saveAttributes(parent.getAttribute('path'));
      }


    });
  }

  connectedCallback() {

    if (this.hasAttribute('root')) {
      this.root = this.getAttribute('root');
    }

    if (this.hasAttribute('index')) {
      this.index = this.getAttribute('index');
    }

  }

  /**
   * Load the pages from the server and display them in the sidebar menu
   * <globular-sidebar-menu-item icon="fa fa-folder" routerLink="/pages" text="Pages">
   *    <globular-sidebar-menu-item icon="fa fa-file" routerLink="/pages/login" text="Login"></globular-sidebar-menu-item>
   *    <globular-sidebar-menu-item icon="fa fa-file" routerLink="/pages/home" text="Home"></globular-sidebar-menu-item>
   *    <globular-sidebar-menu-item icon="fa fa-folder" routerLink="/infos" text="Pages">
   *       <globular-sidebar-menu-item icon="fa fa-file" routerLink="/infos/about" text="About"></globular-sidebar-menu-item>
   *       <globular-sidebar-menu-item icon="fa fa-file" routerLink="/infos/contact" text="Contact"></globular-sidebar-menu-item>
   *    </globular-sidebar-menu-item>
   * </globular-sidebar-menu-item>
   */
  async loadPages(folder = this.root, link = "") {

    // I will take the first 
    this.base = this.router.getAttribute('base'); // the base application url.

    // Clear the pages object
    this.pages = {};
    for (let menuItem of this.menuItems) {
      menuItem.remove();
    }

    const createMenuItem = (name, path, link, isDirectory, attributes = {}) => {

      const menuItem = document.createElement('globular-sidebar-menu-item');
      const icon = attributes.icon || (isDirectory ? 'fa fa-folder' : 'fa fa-file');
      const alias = attributes.alias || name.replace('.html', '');
      const title = attributes.title || alias;
      const index = attributes.index || -1;

      // Set the attributes of the menu item
      menuItem.setAttribute('icon', icon);
      menuItem.setAttribute('routerLink', link);
      menuItem.setAttribute('text', alias);
      menuItem.setAttribute('title', title);
      menuItem.setAttribute('index', index);
      menuItem.setAttribute('link', link); // Store the link in a custom attribute
      menuItem.setAttribute('path', path); // Store the path in a custom attribute
      menuItem.setAttribute('name', name); // Store the name in a custom attribute

      this.menuItems.push(menuItem);

      if (!isDirectory) {
        // Add the config button
        const configButton = document.createElement('iron-icon');
        configButton.setAttribute('icon', 'settings');
        configButton.setAttribute('title', 'Configure');

        configButton.addEventListener('click', (evt) => {
          evt.stopPropagation();
          let parent = path.substring(0, path.lastIndexOf("/"));
          this.configurePage(name, parent, link);
        });

        configButton.slot = 'actions';
        menuItem.appendChild(configButton);

        // Add edit and delete buttons for files
        const editButton = document.createElement('iron-icon');
        editButton.setAttribute('icon', 'editor:mode-edit');
        editButton.setAttribute('title', 'Edit');

        editButton.addEventListener('click', (evt) => {
          evt.stopPropagation();
          this.editPage(path);
        });

        editButton.slot = 'actions';
        menuItem.appendChild(editButton);

        const deleteButton = document.createElement('iron-icon');
        deleteButton.setAttribute('icon', 'delete');
        deleteButton.setAttribute('title', 'Delete');

        deleteButton.addEventListener('click', (evt) => {
          evt.stopPropagation();
          this.deletePage(path, link);
        });

        deleteButton.slot = 'actions';
        menuItem.appendChild(deleteButton);
      } else {
        // Add the config button
        const configButton = document.createElement('iron-icon');
        configButton.setAttribute('icon', 'settings');
        configButton.setAttribute('title', 'Configure');

        configButton.addEventListener('click', (evt) => {
          evt.stopPropagation();

          let parent = path.substring(0, path.lastIndexOf("/"));
          let name = path.split("/").pop();
          let attributes = this.getPage(parent).attributes[name] || {};

          this.configureDir(attributes, path.substring(0, path.lastIndexOf("/")), name);
        });

        configButton.slot = 'actions';
        menuItem.appendChild(configButton);

        // Add create button for directories
        const createButton = document.createElement('iron-icon');
        createButton.setAttribute('icon', 'add');
        createButton.setAttribute('title', 'Create');

        createButton.addEventListener('click', (evt) => {
          evt.stopPropagation();
          this.createPageOrDir(path);
        });

        createButton.slot = 'actions';
        menuItem.appendChild(createButton);

        // Add the delete button
        const deleteButton = document.createElement('iron-icon');
        deleteButton.setAttribute('icon', 'delete');
        deleteButton.setAttribute('title', 'Delete');

        deleteButton.addEventListener('click', (evt) => {
          evt.stopPropagation();
          this.deleteDir(name, path, link);
        });

        deleteButton.slot = 'actions';
        menuItem.appendChild(deleteButton);
      }

      return menuItem;
    };

    const addMenuItems = async (dir, parentLnk, parentElement) => {

      const files = dir.getFilesList();
      const webpages = files.filter(file => {
        const mime = file.getMime();
        return mime === "text/html" || mime.startsWith("text/html") || mime == "inode/directory"; // Add your desired MIME types here
      });

      // attribute of a file or a directory are stored in a file called infos.json in the directory of the file (or directory)
      const attributes = await this.fetchAttributes(dir.getPath());

      let alias = ""
      if (dir.getName() != this.base) {
        alias = attributes.alias || dir.getName().replace('.html', '');
        parentLnk += "/" + alias;
      }

      // Store the page information
      this.pages[dir.getPath()] = { name: folder, path: dir.getPath(), link: parentLnk, isDirectory: true, file: dir, attributes: attributes };

      // Now I will order the files by the index attribute
      webpages.sort((a, b) => {
        if (attributes[a.getName()] && attributes[b.getName()]) {
          let aIndex = attributes[a.getName()].index || 0;
          let bIndex = attributes[b.getName()].index || 0;
          return aIndex - bIndex;
        } else {
          return 0;
        }
      });

      for (const file of webpages) {
        const isDirectory = file.getIsDir();
        const name = file.getName();
        const path = file.getPath();

        // Fetch the parent directory...
        const subAttributes = attributes[name] || {};

        // Here I will set default attributes
        if (!subAttributes.alias) {
          subAttributes.alias = name.replace('.html', '');
        }

        if (!subAttributes.icon) {
          subAttributes.icon = isDirectory ? 'fa fa-folder' : 'fa fa-file';
        }

        if (!subAttributes.index) {
          subAttributes.index = -1;
        }

        // Get the alias from the attributes or use the file name
        const alias = subAttributes.alias || name.replace('.html', '')


        // Store the attributes
        attributes[name] = subAttributes;

        // Remove the webroot part
        let link = parentLnk + "/" + alias;

        // Create the menu item
        const menuItem = createMenuItem(name, path, link, isDirectory, subAttributes);


        // Store the page information
        this.pages[path] = { name, path, link, isDirectory, file, attributes: subAttributes };

        // Recursively add sub-items if it's a directory
        if (isDirectory) {
          await addMenuItems(file, parentLnk, menuItem);
        }

        // Add click event listener to navigate to the page
        if (!isDirectory) {
          menuItem.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default navigation
            event.stopPropagation(); // Stop event propagation
            if (this.router) {
              this.router.navigate([link]); // Trigger Angular routing
            }
            this.setPage(link); // Set the page content
          });
        }
        parentElement.appendChild(menuItem);
      }
    };

    // Wrap the `readDir` function in a Promise
    return new Promise((resolve, reject) => {
      readDir(
        Backend.globule,
        this.root,
        true, // Recursive
        () => {
          /** nothing here... */
        },
        (err) => {
          console.error("Failed to load pages:", err);
          reject(err); // Reject the Promise on error
        },
        async (dir) => {
          this.pages = {};

          // Clear existing menu items if necessary
          while (this.firstChild) {
            this.removeChild(this.firstChild);
          }

          if (this.hasAttribute('root')) {

            this.root = this.getAttribute('root');
            this.parentElement.setAttribute('link', `/${folder}`);
            this.parentElement.setAttribute('path', dir.getPath());

            await addMenuItems(dir, ``, this.parentElement);

          } else {
            // Create the root menu item
            const rootMenuItem = createMenuItem(folder, dir.getPath(), ``, true, {});

            // Generate sub-menu items recursively
            await addMenuItems(dir, ``, rootMenuItem);

            // Append the root menu item to the parent container
            this.appendChild(rootMenuItem);
          }

          if (this.base != undefined) {
            link = link.replace(this.base + "/", "");
          }

          if (this.getPage(link) == undefined) {
            link = this.index;
          }

          if (this.index != undefined) {
            let lnk = this.decodeRepeatedly(link);

            this.router.navigate([lnk]); // Trigger Angular routing
            this.setPage(lnk); // Set the page content
          }

          resolve(); // Resolve the Promise when done
        },
        64,
        64,
        "" // No token
      );
    });
  }

  decodeRepeatedly(input) {
    let decoded = input;
    let previous;

    // Keep decoding until the value stops changing
    do {
      previous = decoded;
      decoded = decodeURIComponent(decoded);
    } while (previous !== decoded);

    return decoded;
  }

  // Get the page object from the path or link
  getPage(path) {
    if (this.pages[path] != undefined) {
      return this.pages[path];
    }

    for (let key in this.pages) {
      if (this.pages[key].link == path) {
        return this.pages[key];
      }
    }

    return this.pages[path];
  }

  // Set the page content
  setPage(lnk, callback) {

    // here I will format the link to be change %20 to space and so on
    lnk = this.decodeRepeatedly(lnk);

    let page = this.getPage(lnk);

    if (page) {
      if (page.isDirectory) {
        return;
      }

      this.getPageContent(page.path, (htmlContent) => {

        // Create a custom event and pass the page content as the event's detail
        const pageSelectEvent = new CustomEvent('pageSelected', {
          detail: {
            path: page.path,
            content: htmlContent
          }
        });

        // Dispatch the event on the document (or a specific element)
        document.dispatchEvent(pageSelectEvent);

        // Execute the callback function if provided
        if (callback) {
          callback();
        }

      }, err => {
        const pageSelectEvent = new CustomEvent('pageSelected', {
          detail: {
            path: page.path,
            content: getErrorPage(err)
          }
        });
        document.dispatchEvent(pageSelectEvent);
      });
    } else {
      console.error(`Page not found for route: ${lnk}`);
      const pageSelectEvent = new CustomEvent('pageSelected', {
        detail: {
          path: lnk,
          content: getErrorPage(`Page not found for route: ${lnk}`)
        }
      });
      document.dispatchEvent(pageSelectEvent);
    }
  }

  editPageAttributes(attributes, dirPath, fileName) {
    // Display the dialog for editing webpage attributes
    let toast = displayMessage(`
    <style>
        #edit-attributes-dialog {
            font-family: 'Roboto', sans-serif;
            font-weight: 300;
        }
        #file-name {
            color: #333;
            font-style: italic;
        }
        .form-group {
            margin-bottom: 10px;
        }
    </style>
    <div id="edit-attributes-dialog">
        <div>
            Editing attributes for: </br>
            <span style="font-style: italic; font-weight: 300;" id="file-name">${dirPath}/${fileName}</span>
        </div>
        </br>
        <div class="form-group">
            <paper-input id="alias-input" label="Alias" value="${attributes.alias || ''}"></paper-input>
        </div>
        <div class="form-group">
            <paper-input id="title-input" label="Title" value="${attributes.title || ''}"></paper-input>
        </div>
        <div class="form-group">
            <paper-input id="icon-input" label="Icon (e.g., fa-file)" value="${attributes.icon || ''}"></paper-input>
        </div>
        <div style="display: flex; justify-content: flex-end;">
            <paper-button id="save-button">Save</paper-button>
            <paper-button id="cancel-button">Cancel</paper-button>
        </div>
    </div>
    `, 60 * 1000);

    // Set focus to the alias input field
    setTimeout(() => {
      toast.toastElement.querySelector('#alias-input').focus();
    }, 100);

    // Handle Cancel button
    let cancelBtn = toast.toastElement.querySelector("#cancel-button");
    cancelBtn.onclick = () => {
      toast.hideToast();
    };

    // Handle Save button
    let saveBtn = toast.toastElement.querySelector("#save-button");
    saveBtn.onclick = () => {

      attributes.alias = toast.toastElement.querySelector("#alias-input").value.trim();
      attributes.icon = toast.toastElement.querySelector("#icon-input").value.trim();
      attributes.title = toast.toastElement.querySelector("#title-input").value.trim();


      // Validate inputs
      if (!attributes.alias || !attributes.icon) {
        displayMessage(`Please provide valid inputs for all fields!`, 3000);
        return;
      }

      // Prepare updated attributes


      // Save attributes to the server
      this.saveAttributes(dirPath, fileName, attributes);

      toast.hideToast();
    };
  }

  async fetchAttributes(dirPath) {
    /** */
    const attributesPath = `${dirPath}/infos.json`;
    try {
      let url = getUrl(Backend.globular) + attributesPath;
      url += "?application=" + this.base;

      const response = await fetch(url);
      const json = await response.json();
      return json;
    } catch (err) {
      console.error(`Failed to fetch attributes from ${attributesPath}:`, err);
    }

    return {}; // Return an empty object if the file doesn't exist or fails to load

  };

  async saveAttributes(dirPath, name, attributes) {

    // Get the page attributes
    let attributes_ = this.getPage(dirPath).attributes || {};
    attributes_ = attributes_ || {};

    if (name) {
      if (attributes == null) {
        delete attributes_[name];
      } else {
        attributes_[name] = attributes;
      }
    }

    // Save the attributes to the server
    const blob = new Blob([JSON.stringify(attributes_)], { type: 'application/json' });
    const file = new File([blob], 'infos.json', { type: 'application/json', lastModified: Date.now() });

    // Upload the file to the server
    uploadFiles(Backend.globular, localStorage.getItem("user_token"), dirPath, [file], () => {
      // displayMessage(`Attributes saved successfully!`, 3000);

      let path = dirPath + "/" + name;
      let menuItem = document.querySelector(`[path="${path}"]`);
      if (menuItem) {
        let attributes = this.getPage(dirPath).attributes[name];
        if (attributes) {
          menuItem.setAttribute('icon', attributes.icon);
          menuItem.setAttribute('title', attributes.title);
          if (attributes.alias != undefined) {
            menuItem.setAttribute('alias', attributes.alias);
            // I will set the path of the page
            let existingLink = menuItem.getAttribute('link');
            let newLink = existingLink.substring(0, existingLink.lastIndexOf("/")) + "/" + attributes.alias;
            menuItem.setAttribute('link', newLink);
          }
        }
      }
    }, (err) => {
      displayMessage(`Failed to save attributes: ${err}`, 3000);
    });

  }

  configurePage(name, path) {

    let attributes = this.getPage(path).attributes[name] || {};
    this.editPageAttributes(attributes, path, name);
  }

  configureDir(attributes, dirPath, fileName) {
    this.editPageAttributes(attributes, dirPath, fileName);
  }

  /**
   * Returns the content of a page from the server
   * @param {*} path 
   * @param {*} callback 
   * @param {*} errorCallback 
   */
  getPageContent(path, callback, errorCallback) {
    // I will try to get the application folder from the address
    async function fetchHTMLContent(url) {
      const response = await fetch(url);
      const htmlText = await response.text();
      return htmlText; // Returns the HTML content as plain text
    }

    let url = getUrl(Backend.globular) + path;

    let application = window.location.pathname.split('/')[1];
    let token = localStorage.getItem("user_token") || "";
    url += "?token=" + token;
    url += "&application=" + application;

    fetchHTMLContent(url).then((htmlContent) => {
      callback(htmlContent);
    }).catch((err) => {
      console.error(`Failed to fetch page content from ${url}:`, err);
    });
  }

  createPageOrDir(dirPath) {
    // Display the dialog for creating a new page or subdirectory
    let toast = displayMessage(`
    <style>
        #create-webpage-dialog {
            font-family: 'Roboto', sans-serif;
            font-weight: 300;
        }
        #file-name {
            color: #333;
            font-style: italic;
        }
        .radio-group {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
    </style>
    <div id="create-webpage-dialog">
        <div>You're about to create a new page or directory in </br><span style="font-style: italic; font-weight: 300;" id="file-name">${dirPath}</span></div>
        </br>
      <paper-radio-group class="radio-group" selected="page-option">
        <paper-radio-button id="page-option" name="page-option">Page</paper-radio-button>
        <paper-radio-button id="dir-option" name="dir-option">Directory</paper-radio-button>
      </paper-radio-group>
        <paper-input id="name-input" label="Enter name" autofocus></paper-input>
        <div style="display: flex; justify-content: flex-end;">
            <paper-button id="ok-button">Ok</paper-button>
            <paper-button id="cancel-button">Cancel</paper-button>
        </div>
    </div>
    `, 60 * 1000);

    setTimeout(() => {
      toast.toastElement.querySelector('#name-input').focus(); // Set focus to the input
    }, 100);

    let cancelBtn = toast.toastElement.querySelector("#cancel-button");
    cancelBtn.onclick = () => {
      toast.hideToast();
    };

    let okBtn = toast.toastElement.querySelector("#ok-button");
    okBtn.onclick = () => {
      let isPage = toast.toastElement.querySelector("#page-option").checked;
      let nameInput = toast.toastElement.querySelector("#name-input").value.trim();

      if (!nameInput) {
        displayMessage(`Please enter a valid name!`, 3000);
        return;
      }

      let fullPath = `${dirPath}/${nameInput}`;

      if (isPage) {
        this.createPage(fullPath);
      } else {
        this.createSubdir(fullPath);
      }

      toast.hideToast();
    };
  }

  createHtmlFile(fileName, htmlContent) {
    // Create a Blob from the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });

    // Create a File object using the Blob
    const file = new File([blob], fileName, { type: 'text/html', lastModified: Date.now() });

    return file; // Return the File object
  }

  // Function to create a page
  createPage(path) {

    generatePeerToken(Backend.globular, (token) => {
      // Replace with actual implementation for creating a page
      // I will create an empty local file

      let fileName = path.split("/").pop();
      path = path.substring(0, path.lastIndexOf("/"));

      // Usage example
      const files = []; // Array to store files
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Example Page</title>
</head>
<body>
   
</body>
</html>
`;

      if (!fileName.endsWith(".html")) {
        fileName += ".html";
      }

      const newFile = this.createHtmlFile(fileName, htmlContent);

      // Append the new file to the files array
      files.push(newFile);

      uploadFiles(Backend.globular, token, path, files, () => {
        displayMessage(`Page <strong>${path + "/" + fileName}</strong> created successfully!`, 3000);

        const link = (path + "/" + fileName).replace(this.root, "")
          .replace('.html', '');

        // Store the page information
        this.pages[path + "/" + fileName] = { name: fileName, path: path + "/" + fileName, isDirectory: false, file: newFile, link: link, attributes: {} };
        this.loadPages(this.root, link);
      },
        (err) => {
          displayMessage(err, 3000);
        });
    });
  }

  // Function to create a subdirectory
  createSubdir(path) {

    generatePeerToken(Backend.globular, (token) => {
      // Replace with actual implementation for creating a directory
      let name = path.split("/").pop();
      path = path.substring(0, path.lastIndexOf("/"));

      createDir(Backend.globular, path, name, () => {
        displayMessage(`Directory <strong>${path}</strong> created successfully!`, 3000);

        // Dispatch a directory creation event
        const dirCreateEvent = new CustomEvent('directoryCreated', {
          detail: {
            path: path
          }
        });
        document.dispatchEvent(dirCreateEvent);

        this.loadPages(this.root);

      }, (err) => {
        displayMessage(err, 3000);
      }, token);
    });
  }


  editPage(path) {

    // Open the page in the editor
    let id = "_code_edtior_" + getUuidByString(path);
    let webPageEditor = document.getElementById(id);
    if (webPageEditor == null) {


      let webPageEditor = new GrapesEditor();
      webPageEditor.id = id;
      webPageEditor.title = path;

      // Set the page content
      this.getPageContent(path, (htmlContent) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // stet the style id.
        let style = doc.querySelector('style');
        if (style == null) {
          style = document.createElement('style');
          doc.head.appendChild(style);
        }
        if (style.id != 'page-style') {
          style.id = 'page-style';
        }

        // Set the page style and script
        webPageEditor.onload = async (iframeDoc) => {

          // I will load external styles
          const styles = Array.from(doc.head.querySelectorAll('link[rel="stylesheet"]'));

          for (const style of styles) {
            // remove the style from the document
            const link = iframeDoc.createElement('link');
            link.rel = 'stylesheet';
            // Set the href attribute
            const href = style.getAttribute('href');
            if (href) {
              link.href = href; // Absolute path
              // Append the link to the iframe's head
              iframeDoc.head.appendChild(link);
            }
          }

          // Select all scripts in the document
          const scripts = Array.from(doc.head.querySelectorAll('script'));

          // Function to load a single script and return a promise
          const loadScript = (script) => {
            return new Promise((resolve, reject) => {
              const scriptElement = iframeDoc.createElement('script');
              scriptElement.onload = () => {
                resolve(); // Resolve the promise when the script is loaded
              };
              scriptElement.onerror = (e) => {
                console.error('Script failed to load:', scriptElement.src || 'inline script', e);
                reject(e); // Reject the promise if the script fails to load
              };

              // Set the script content or src
              const src = script.getAttribute('src');
              if (src) {
                scriptElement.src = src; // External script
              } else {
                scriptElement.innerHTML = script.innerHTML; // Inline script
              }

              // Append the script to the iframe's head
              iframeDoc.head.appendChild(scriptElement);

            });
          };

          // Iterate through all scripts and load them sequentially
          for (const script of scripts) {
            try {
              await loadScript(script); // Wait for each script to load
            } catch (error) {
              console.error('Error loading script:', error);
            }
          }

        };

        // Remove the style from the document
        doc.head.removeChild(style);

        // intialize the page style
        let pageStyle = style.innerHTML

        // Load content into the Grapes.js editor
        webPageEditor.onready = () => {
          webPageEditor.loadContent(doc.body.innerHTML, pageStyle || '');
        }

        // Handle save event
        // Include js-beautify in your project or import it if using a module bundler
        webPageEditor.onsave = (html, css, scripts, links) => {

          // First I will remove existing styles and scripts from the document
          let scripts_ = doc.head.querySelectorAll('script');
          for (let i = 0; i < scripts_.length; i++) {
            doc.head.removeChild(scripts_[i]);
          }

          // Remove existing links from the document
          let links_ = doc.head.querySelectorAll('link');
          for (let i = 0; i < links_.length; i++) {
            doc.head.removeChild(links_[i]);
          }

          // Extract the full <head> section
          const headContent = doc.head.innerHTML;

          let scriptsContent = '';
          for (const script of scripts) {
            scriptsContent += script.outerHTML;
          }

          let linksContent = '';
          for (const link of links) {
            linksContent += link.outerHTML;
          }

          // Regenerate the HTML content with proper structure
          let regeneratedHtmlContent = `
<!DOCTYPE html>
<html lang="${doc.documentElement.lang || 'en'}">
  <head>
    ${headContent}
    ${linksContent}
    <style id="page-style">
      ${css}
    </style>
    ${scriptsContent}
  </head>
  ${html}
</html>
`;

          // Remove excessive empty lines from the regenerated content
          regeneratedHtmlContent = prettify(regeneratedHtmlContent);

          // Prettify the HTML before saving
          const prettyHtml = beautify(regeneratedHtmlContent, {
            indent_size: 2,
            space_in_empty_paren: false,
            wrap_line_length: 80,
          });

          // Save the prettified HTML
          generatePeerToken(Backend.globular, (token) => {
            this.saveHtmlPage(
              Backend.globular,
              token,
              path,
              prettyHtml,
              () => {
                displayMessage(`
                    <span style="display: flex; align-items: center; gap: 8px;">
                      <i class="fa fa-check-circle" style="color: green;"></i> 
                      Page <strong>${path}</strong> saved successfully!
                    </span>`, 3000);

                const pageSelectEvent = new CustomEvent('pageSelected', {
                  detail: {
                    path: path,
                    content: prettyHtml,
                  },
                });
                document.dispatchEvent(pageSelectEvent);

                let name = path.split("/").pop();
                this.saveSearchIndex(path, name, prettyHtml,
                  () => {
                    /** nothing to do here... */
                  }, err => {
                    displayError(err, 3000);
                  });


              },
              (error) => {
                console.error("Failed to upload HTML page:", error);
              },
              (progress) => {
                console.log("Upload progress:", progress.loaded / progress.total * 100 + "%");
              },
              (abort) => {
                console.warn("Upload aborted:", abort);
              }
            );
          }, (err) => {
            console.error(err);
          });
        };

        document.body.appendChild(webPageEditor);

        // Create a new div element and that will trigger the initialization of the editor
        let div = document.createElement('div');
        div.slot = "editor";
        webPageEditor.appendChild(div);

      }, (err) => {
        console.error(err);
      });
    };

  }

  deletePage(path, link) {

    // So here I will get the information from imdb and propose to assciate it with the file.
    let toast = displayMessage(`
    <style>
        #delete-webpage-dialog {
           font-family: 'Roboto', sans-serif;
           font-weight: 300;
        }
        #file-path {
            color: #333;
            font-style: italic;
        }
        #file-name {
            color: #333;
            font-style: italic;
        }
            
    </style>
    <div id="delete-webpage-dialog">
        <div>Your about to delete webpage </div>
        <div> <span style="font-style: italic; font-weight: 300;" id="file-path">${path}</span></div>
        <div>Is that what you want to do? </div>
        <span style="height: 20px;"></span>
        <div style="display: flex; justify-content: flex-end;">
            <paper-button id="ok-button">Ok</paper-button>
            <paper-button id="cancel-button">Cancel</paper-button>
        </div>
    </div>
    `, 60 * 1000)


    let cancelBtn = toast.toastElement.querySelector("#cancel-button")
    cancelBtn.onclick = () => {
      toast.hideToast();
    }

    let okBtn = toast.toastElement.querySelector("#ok-button")
    okBtn.onclick = () => {

      // Delete the file
      generatePeerToken(Backend.globular, (token) => {
        deleteFile(Backend.globular, path, () => {

          displayMessage(`
            <span style="display: flex; align-items: center; gap: 8px;">
              <i class="fa fa-check-circle" style="color: green;"></i> 
              Page <strong>${path}</strong> deleted successfully!
            </span>`, 3000);



          // Remove the page from the menu
          let menuItem = document.querySelector(`[path="${path}"]`);
          if (menuItem) {
            menuItem.remove();
          }

          // Dispatch a page delete event
          /*const pageDeleteEvent = new CustomEvent('pageError', {
            detail: {
              path: path,
              content: getErrorPage(err)
            }
          });

          document.dispatchEvent(pageDeleteEvent);*/

          let parent = path.substring(0, path.lastIndexOf("/"));
          let fileName = path.split("/").pop();
          this.saveAttributes(parent, fileName, null);

        }, (err) => { displayMessage(err) }, token);
      });

      toast.hideToast();
    }


  }

  deleteDir(name, path, link) {

    // So here I will get the information from imdb and propose to assciate it with the file.
    let toast = displayMessage(`
          <style>
              #delete-webpages-dialog {
                 font-family: 'Roboto', sans-serif;
                 font-weight: 300;
              }
              #file-path {
                  color: #333;
                  font-style: italic;
              }
              #file-name {
                  color: #333;
                  font-style: italic;
              }
                  
          </style>
          <div id="delete-webpages-dialog">
              <div>Your about to delete folder containing webpages at path</div>
              <div> <span style="font-style: italic; font-weight: 300;" id="file-path">${path}</span></div>
              <div>Is that what you want to do? </div>
              <span style="height: 20px;"></span>
              <div style="display: flex; justify-content: flex-end;">
                  <paper-button id="ok-button">Ok</paper-button>
                  <paper-button id="cancel-button">Cancel</paper-button>
              </div>
          </div>
          `, 60 * 1000)

    let cancelBtn = toast.toastElement.querySelector("#cancel-button")
    cancelBtn.onclick = () => {
      toast.hideToast();
    }

    let okBtn = toast.toastElement.querySelector("#ok-button")
    okBtn.onclick = () => {
      // Delete the file
      generatePeerToken(Backend.globular, (token) => {
        deleteDir(Backend.globular, path, () => {

          displayMessage(`
                  <span style="display: flex; align-items: center; gap: 8px;">
                    <i class="fa fa-check-circle" style="color: green;"></i> 
                    Page <strong>${path}</strong> deleted successfully!
                  </span>`, 3000);


          // Remove the page from the menu
          let menuItem = document.querySelector(`[path="${path}"]`);
          if (menuItem) {
            menuItem.remove();
          }

          // Dispatch a page delete event
          /*const pageDeleteEvent = new CustomEvent('pageError', {
            detail: {
              path: path,
              content: getErrorPage(err)
            }
          });
 
          document.dispatchEvent(pageDeleteEvent);*/

          let parent = path.substring(0, path.lastIndexOf("/"));

          // get existing attributes
          this.saveAttributes(parent, name, null);

        }, (err) => { displayMessage(err) }, token);
      });

      toast.hideToast();
    }
  }

  saveHtmlPage(globule, token, path, htmlContent, completeHandler, errorHandler, progressHandler, abortHandler) {
    // Create a Blob from the HTML content
    const blob = new Blob([htmlContent], { type: "text/html" });
    const fileName = path.split("/").pop(); // Extract the file name from the path
    const file = new File([blob], fileName, { type: "text/html" });

    // Determine the directory to save the file
    const directoryPath = path.substring(0, path.lastIndexOf("/"));

    // Call the uploadFiles function with the generated file
    return uploadFiles(
      globule,
      token,
      directoryPath,
      [file], // Pass the file in an array
      completeHandler,
      errorHandler,
      progressHandler,
      abortHandler
    );
  }

  /**
   * Remove the search index of a element with a given id.
   * @param {*} id The element id
   * @param {*} callback The remove callback
   * @param {*} errorCallback The error callback
   */
  removeSearchIndex(id, callback, errorCallback) {
    let router = document.querySelector('globular-router')
    let application = router.getAttribute('base')
    let rqst = new DeleteDocumentRequest()
    rqst.setPath(Backend.globular.config.DataPath + "/search/applications/" + application)
    rqst.setId(id)

    // So here I will set the address from the address found in the token and not 
    // the address of the client itself.
    let token = localStorage.getItem("user_token")
    let domain = Backend.globular.domain

    // call persist data
    Backend.getGlobule(domain).searchService.deleteDocument(rqst,
      {
        token: token,
        application: Model.application,
        domain: domain
      }
    ).then(() => {
      callback(this)
    }).catch(err => {
      errorCallback(err)
    })

  }

  // Save the search index.
  async saveSearchIndex(pageId, pageName, htmlString, callback, errorCallback) {
    try {
      // Parse the HTML string into a document
      let parser = new DOMParser();
      let doc = parser.parseFromString(htmlString, "text/html");

      function getDataElements(element, path = "body") {
        let dataElements = [];

        if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) {
          return dataElements;
        }

        let textContent = element.textContent.trim();
        let currentPath = path + (element.id ? `#${element.id}` : ` > ${element.tagName.toLowerCase()}`);

        if (textContent.length > 0) {
          dataElements.push({
            Id: element.id || crypto.randomUUID(),
            PageId: pageId,
            PageName: pageName,
            Text: textContent,
            Tag: element.tagName.toLowerCase(),
            Path: currentPath, // Ensuring this is properly defined
            Attributes: Array.from(element.attributes).reduce((attrs, attr) => {
              attrs[attr.name] = attr.value;
              return attrs;
            }, {})
          });
        }

        Array.from(element.children).forEach(child => {
          dataElements = dataElements.concat(getDataElements(child, currentPath));
        });

        return dataElements;
      }
      let dataElements = getDataElements(doc.body);

      // Retrieve app info
      let router = document.querySelector('globular-router');
      let application = router.getAttribute('base');
      let token = localStorage.getItem("user_token");
      let domain = Backend.globular.domain;

      // Index the extracted elements
      let promises = dataElements.map(e => {
        let rqst = new IndexJsonObjectRequest();
        rqst.setPath(`${Backend.globular.config.DataPath}/search/applications/${application}`);
        rqst.setJsonstr(JSON.stringify(e));
        rqst.setLanguage("en");
        rqst.setId("Id");
        rqst.setIndexsList(["PageId", "Id", "Text"]);

        return Backend.getGlobule(domain).searchService
          .indexJsonObject(rqst, { token, application, domain });
      });

      await Promise.all(promises);
      if (callback) {
        callback();
      }

    } catch (err) {
      if (errorCallback) {
        errorCallback(err);
      }
    }
  }


}

customElements.define('globular-webpage-manager', GlobularWebpageManager);
