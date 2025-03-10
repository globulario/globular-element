
import { Account, GetGroupsRqst, Group } from "globular-web-client/resource/resource_pb"
import { Backend } from "./backend"
import { Globular } from "globular-web-client";
import { getAllGroups } from "globular-web-client/api";
import { AccountController } from "./account";

export class GroupController {

    // keep the map of all groups by id.
    private static groups: any;

    // Return the list of all groups.
    static getGroups(callback: (callback: Group[]) => void, errorCallback: (err: any) => void, globule: Globular = Backend.globular) {

        getAllGroups(globule, groups => {
            callback(groups)
        }, errorCallback);
    }

    // Retreive a given group.
    static getGroup(id: string, successCallback: (g: Group) => void, errorCallback: (err: any) => void) {
        if (GroupController.groups == undefined) {
            GroupController.groups = {};
        }
        if (GroupController.groups[id] != null) {
            successCallback(GroupController.groups[id])
        } else {

            let globule = Backend.globular
            if (id.indexOf("@") > 0) {
                globule = Backend.getGlobule(id.split("@")[1])
                id = id.split("@")[0]
            }

            if (globule == null) {
                errorCallback("Globule not found")
                return
            }

            if (id == "") {
                errorCallback("Group id is empty")
                return
            }

            if (globule.resourceService == null) {
                errorCallback("Resource service not found")
                return
            }

            let rqst = new GetGroupsRqst
            rqst.setQuery(`{"_id":"${id}"}`)

            let stream = globule.resourceService.getGroups(rqst, { domain: globule.domain })
            let groups_ = new Array<Group>();

            stream.on("data", (rsp) => {
                groups_ = groups_.concat(rsp.getGroupsList())
            });

            stream.on("status", (status) => {
                if (status.code == 0) {

                    // keep in the local map.
                    GroupController.groups[id] = groups_[0]

                    // Here I will connect local event to react with interface element...
                    successCallback(groups_[0])
                } else {
                    errorCallback(status.details)
                }

            });

        }
    }


    static getMembers(id: string, successCallback: (members: Array<Account>) => void, errorCallback: (err: any) => void) {
        GroupController.getGroup(id, group => {
            let membersList = group.getMembersList()
            let members = new Array<Account>() 
            membersList.forEach(member => {
                AccountController.getAccount(member, account => {
                    members.push(account)
                    if (members.length == membersList.length) {
                        successCallback(members)
                    }
                }
                , errorCallback)
            })

        }, errorCallback)
    }
}