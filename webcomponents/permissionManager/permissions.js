import { getOrganizationById } from "./Organization";
import { Group } from "../Group";
import '@polymer/iron-icons/av-icons'
import '@polymer/iron-icons/editor-icons'
import { GetApplicationsRqst, GetPackagesDescriptorRequest, Application } from "globular-web-client/resource/resource_pb";
import { ApplicationInfo, BlogPostInfo, ConversationInfo, DomainInfo, FileInfo, GroupInfo, OrganizationInfo, PackageInfo, RoleInfo, WebpageInfo } from "./Informations";
import { GetConversationRequest } from "globular-web-client/conversation/conversation_pb";
import { getRoleById } from "./Role";
import { GetBlogPostsRequest } from "globular-web-client/blog/blog_pb";
import { FindOneRqst } from "globular-web-client/persistence/persistence_pb";
import { AccountController } from "../../backend/account";

/**
 * Return web page
 */
function getWebpage(id, callback, errorCallback) {
    const collection = "WebPages";

    // save the user_data
    let rqst = new FindOneRqst();
    let db = Model.application + "_db";

    // set the connection infos,
    rqst.setId(Model.application);
    rqst.setDatabase(db);
    rqst.setCollection(collection)
    rqst.setQuery(`{"_id":"${id}"}`)

    // So here I will set the address from the address found in the token and not 
    // the address of the client itself.
    let token = localStorage.getItem("user_token")
    let domain = AccountController.account.getDomain()

    // call persist data
    Model.getGlobule(domain).persistenceService
        .findOne(rqst, {
            token: token,
            application: Model.application,
            domain: domain
        })
        .then(rsp => {
            // Here I will return the value with it
            let webPage = rsp.getResult().toJavaScript();

            // the path that point to the resource
            webPage.getPath = () => {
                return webPage._id
            }

            // The brief description.
            webPage.getHeaderText = () => {
                return webPage.name
            }

            // return file information panel...
            webPage.getInfo = () => {
                return new WebpageInfo(webPage)
            }

            callback(webPage);
        })
        .catch(errorCallback);
}

/**
 * Return application info.
 */
function getApplication(id, callback, errorCallback) {

    let rqst = new GetApplicationsRqst

    let address = Model.address; // default domain
    let path = id
    if (id.indexOf("@") != -1) {
        address = id.split("@")[1] // take the domain given with the id.
        id = id.split("@")[0]
    }

    rqst.setQuery(`{"_id":"${id}"}`)

    let globule = Model.getGlobule(address)
    let stream = globule.resourceService.getApplications(rqst, { domain: globule.domain, token: localStorage.getItem("user_token") })
    let applications = [];

    stream.on("data", (rsp) => {
        applications = applications.concat(rsp.getApplicationsList());
    });

    stream.on("status", (status) => {
        if (status.code == 0) {
            let applicaiton = applications[0]

            // the path that point to the resource
            applicaiton.getPath = () => {
                return path
            }

            // The brief description.
            applicaiton.getHeaderText = () => {
                return applicaiton.getAlias() + " " + applicaiton.getVersion()
            }

            // return file information panel...
            applicaiton.getInfo = () => {
                return new ApplicationInfo(applicaiton)
            }

            callback(applicaiton);
        } else {
            errorCallback(status.details)
        }
    })
}

/**
 * Return blog info.
 */
function getBlog(id, callback, errorCallback) {

    let address = Model.address; // default domain
    if (id.indexOf("@") != -1) {
        address = id.split("@")[1] // take the domain given with the id.
        id = id.split("@")[0]
    }

    let rqst = new GetBlogPostsRequest
    rqst.setUuidsList([id])

    let globule = Model.getGlobule(address)
    let stream = globule.blogService.getBlogPosts(rqst, { domain: globule.domain, token: localStorage.getItem("user_token") })
    let blogPosts = [];

    stream.on("data", (rsp) => {
        blogPosts.push(rsp.getBlogPost())
    });

    stream.on("status", (status) => {
        if (status.code == 0) {
            const b = blogPosts[0]
            b.getPath = () => {
                return id
            }

            // The brief description.
            b.getHeaderText = () => {
                return blogPosts[0].getTitle() + "</br><span style=\"font-style: italic; padding-right: 5px\">written by</span>" + b.getAuthor()
            }

            // return file information panel...
            b.getInfo = () => {
                return new BlogPostInfo(blogPosts[0])
            }

            callback(b);
        } else {
            errorCallback(status.details)
        }
    })
}

/**
 * Return domain info.
 */
function getDomain(domain, callback, errorCallback) {
    let d = { name: domain }
    // the path that point to the resource
    d.getPath = () => {
        return d.name
    }

    // The brief description.
    d.getHeaderText = () => {
        return d.name
    }

    // return file information panel...
    d.getInfo = () => {

        return new DomainInfo(d)
    }

    // callback
    callback(d)

}

/**
 * Return conversation info.
 */
function getConversation(id, callback, errorCallback) {
    let rqst = new GetConversationRequest
    let address = Model.address; // default domain
    if (id.indexOf("@") != -1) {
        address = id.split("@")[1] // take the domain given with the id.
        id = id.split("@")[0]
    }

    rqst.setId(id)
    let globule = Model.getGlobule(address)

    globule.conversationService.getConversation(rqst, { domain: globule.domain, token: localStorage.getItem("user_token") })
        .then(rsp => {

            let c = rsp.getConversation()
            // the path that point to the resource
            c.getPath = () => {
                return id
            }

            // The brief description.
            c.getHeaderText = () => {
                return c.getName()
            }

            // return file information panel...
            c.getInfo = () => {
                return new ConversationInfo(c)
            }

            callback(c);

        })
        .catch(err => {
            errorCallback(err)
        })
}

/**
 * Return file info.
 */
function getFile(path, callback, errorCallback) {


    File.getFile(Model.globular, path, 100, 64, f => {

        // the path that point to the resource
        f.getPath = () => {
            return f.path
        }

        // The brief description.
        f.getHeaderText = () => {
            return f.path
        }

        // return file information panel...
        f.getInfo = () => {
            return new FileInfo(f)
        }

        callback(f);
    }, errorCallback)
}

/**
 * Return group info.
 */
function getGroup(id, callback, errorCallback) {
    Group.getGroup(id, (g) => {
        g.getPath = () => {
            return id
        }

        // The brief description.
        g.getHeaderText = () => {
            return id //g.name 
        }

        // return file information panel...
        g.getInfo = () => {
            return new GroupInfo(g)
        }

        callback(g)
    }, errorCallback)
}

/**
 * Return organization info.
 */
function getOrganization(id, callback, errorCallback) {
    getOrganizationById(id, o => {

        o.getPath = () => {
            return o.getId()
        }

        // The brief description.
        o.getHeaderText = () => {
            return o.getName()
        }

        // return file information panel...
        o.getInfo = () => {
            return new OrganizationInfo(o)
        }

        callback(o)
    }, errorCallback)
}


/**
 * Return package info.
 */
function getPackage(id, callback, errorCallback) {

    // so here I will split the given path to retreive the actual 
    // package descriptor.
    let infos = id.split("|")
    let publisherid = infos[0]
    let name = infos[1]
    let version = infos[2]
    
    let address = Model.address; // default domain
    if (name.indexOf("@") != -1) {
        address = name.split("@")[1] // take the domain given with the id.
    }

    let rqst = new GetPackagesDescriptorRequest
    let q = `{"$and":[{"name":"${name}"},{"version":"${version}"},{"publisherid":"${publisherid}"}]}`
    console.log("get package with query: " + q)
    
    rqst.setQuery(q);
    let globule = Model.getGlobule(address)

    let stream = globule.resourceService.getPackagesDescriptor(rqst, { application: Application.application, domain: globule.domain, token: localStorage.getItem("user_token") })

    let descriptors = [];

    stream.on("data", (rsp) => {
        descriptors = descriptors.concat(rsp.getResultsList());
    });

    stream.on("status", (status) => {
        if (status.code == 0) {
            let p = descriptors[0]
            // the path that point to the resource
            p.getPath = () => {
                return id
            }

            // The brief description.
            p.getHeaderText = () => {
                return p.getName() + " " + p.getVersion() + " from " + publisherid
            }

            // return file information panel...
            p.getInfo = () => {
                return new PackageInfo(p)
            }

            callback(p);
        } else {
            errorCallback(status.details)
        }
    })

}


/**
 * Return package info.
 */
function getRole(id, callback, errorCallback) {
    getRoleById(id, r => {

        r.getPath = () => {
            return id
        }

        // The brief description.
        r.getHeaderText = () => {
            return r.getName()
        }

        // return file information panel...
        r.getInfo = () => {
            return new RoleInfo(r)
        }

        callback(r)
    }, errorCallback)
}
