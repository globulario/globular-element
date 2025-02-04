
import { ClearAllNotificationsRqst, CreateNotificationRqst, DeleteNotificationRqst, GetNotificationsRqst, GetNotificationsRsp, Notification, NotificationType } from "globular-web-client/resource/resource_pb";
import { Backend, displayError, generatePeerToken } from "./backend";

/**
 * The notification controller is used to send and receive notifications.
 */
export class NotificationController {
    constructor() {
        this.initNotifications();
    }
    /**
      * Initialyse the user and application notifications
      */
    private initNotifications() {
        // Initialyse application notifications.
        this.getNotifications(
            NotificationType.APPLICATION_NOTIFICATION,
            (notifications: Array<Notification>) => {
                Backend.globular.eventHub.publish(
                    "set_application_notifications_event",
                    notifications,
                    true
                );
            },
            (err: any) => {
                displayError(err, 4000);
            }
        );

        this.getNotifications(
            NotificationType.USER_NOTIFICATION,
            (notifications: Array<Notification>) => {
                Backend.globular.eventHub.publish(
                    "set_user_notifications_event",
                    notifications,
                    true
                );
            },
            (err: any) => {
                displayError(err, 4000);
            }
        );
    }

    /**
     * Send application notifications.
     * @param notification The notification can contain html text.
     */
    static sendNotifications(
        id: string,
        recipient: string,
        text: string,
        type: NotificationType,
        callback: () => void,
        onError: (err: any) => void
    ) {
        // first of all I will save the notificaiton.
        let rqst = new CreateNotificationRqst

        // init the notification infos.
        let notification_ = new Notification
        notification_.setId(id)
        notification_.setDate(Math.floor(Date.now() / 1000))
        notification_.setMessage(text)
        notification_.setRecipient(recipient)
        if (type == NotificationType.APPLICATION_NOTIFICATION) {
            let application = window.localStorage.getItem("application")
            if (application == null) {
                onError("The application is not defined")
                return
            }
            notification_.setSender(application)
            notification_.setNotificationType(NotificationType.APPLICATION_NOTIFICATION)
        } else {

            notification_.setNotificationType(NotificationType.USER_NOTIFICATION)
            let user_name = window.localStorage.getItem("user_name")
            if (user_name == null) {
                onError("no user defined")
                return
            }

            let user_domain = window.localStorage.getItem("user_domain")
            if (user_domain == null) {
                onError("no user domain defined")
                return
            }

            let sender = user_name + "@" + user_domain
            notification_.setSender(sender)

            let mac = Backend.globular.config.Mac
            if (mac == null) {
                onError("no mac defined")
                return
            }

            notification_.setMac(mac)

        }

        rqst.setNotification(notification_)
        let globule = Backend.getGlobule(recipient.split("@")[1])
        if (globule == null) {
            onError("The domain is not defined")
            return
        }

        generatePeerToken(globule, token => {

            if (globule.resourceService == null) {
                onError("The resource service is not defined")
                return
            }

            globule.resourceService
                .createNotification(rqst, {
                    token: token,
                    domain: globule.domain
                })
                .then(() => {

                    // Here I will throw a network event...
                    // Publish the notification
                    Backend.publish(
                        recipient + "_notification_event",
                        notification_.serializeBinary(),
                        false
                    );
                    if (callback != undefined) {
                        callback();
                    }
                })
                .catch((err: any) => {
                    onError(err);
                });
        }, err => onError(err))
    }

    /**
     *  Retreive the list of nofitications
     * @param callback The success callback with the list of notifications.
     * @param errorCallback The error callback with the error message.
     */
    getNotifications(
        type: NotificationType,
        callback: (notifications: Array<Notification>) => void,
        errorCallback: (err: any) => void
    ) {

        let user_domain = window.localStorage.getItem("user_domain")
        if (user_domain == null) {
            errorCallback("No user domain defined")
            return
        }

        let user_name = window.localStorage.getItem("user_name")
        if (user_name == null) {
            errorCallback("No user name defined")
            return
        }

        let user = user_name + "@" + user_domain

        let globule = Backend.getGlobule(user_domain)
        if (globule == null) {
            errorCallback("The domain is not defined")
            return
        }

        generatePeerToken(globule, token => {
            // So here I will get the list of notification for the given type.
            let rqst = new GetNotificationsRqst
            let application = window.localStorage.getItem("application")
            if (application == null) {
                errorCallback("The application is not defined")
                return
            }

            if (type == NotificationType.APPLICATION_NOTIFICATION) {
                rqst.setRecipient(application)
            } else {
                rqst.setRecipient(user)
            }

            if (globule.resourceService == null) {
                errorCallback("The resource service is not defined")
                return
            }

            let stream = globule.resourceService.getNotifications(rqst, {
                token: token,
                domain: Backend.domain
            });

            let notifications = new Array<Notification>();

            stream.on("data", (rsp: GetNotificationsRsp) => {
                notifications = notifications.concat(rsp.getNotificationsList())
            });

            stream.on("status", (status) => {
                if (status.code == 0) {
                    callback(notifications);
                } else {
                    // In case of error I will return an empty array
                    callback([]);
                }
            });

        }, err => displayError(err, 3000))

    }

    /**
     * Remove a notification.
     * @param notification The notification to remove.
     */
    removeNotification(notification: Notification) {

        let rqst = new DeleteNotificationRqst
        let globule = Backend.globular
        if (notification.getNotificationType() == NotificationType.USER_NOTIFICATION) {
            let user_domain = window.localStorage.getItem("user_domain")
            if (user_domain == null) {
                displayError("No user domain defined", 4000)
                return
            }
            globule = Backend.getGlobule(user_domain)
        }

        if (globule == null) {
            displayError("The domain is not defined", 4000)
            return
        }


        rqst.setId(notification.getId())
        rqst.setRecipient(notification.getRecipient())

        generatePeerToken(globule, token => {

            if (globule.resourceService == null) {
                displayError("The resource service is not defined", 4000)
                return
            }

            globule.resourceService
                .deleteNotification(rqst, {
                    token: token,
                    domain: globule.domain
                })
                .then(() => {
                    // The notification is not deleted so I will send network event to remove it from
                    // the display.
                    Backend.publish(
                        notification.getId() + "_delete_notification_event",
                        notification.serializeBinary(),
                        false
                    );
                })
                .catch((err: any) => {
                    displayError(err, 4000);
                });
        }, err => displayError(err, 3000))

    }

    /**
     * Remove all notification.
     */
    clearNotifications(type: NotificationType) {
        let user_domain = window.localStorage.getItem("user_domain")
        if (user_domain == null) {
            displayError("No user domain defined", 4000)
            return
        }

        let user_name = window.localStorage.getItem("user_name")
        if (user_name == null) {
            displayError("No user name defined", 4000)
            return
        }

        let user = user_name + "@" + user_domain

        let globule = Backend.getGlobule(user_domain)
        if (globule == null) {
            displayError("The domain is not defined", 4000)
            return
        }

        generatePeerToken(globule, token => {
            // So here I will get the list of notification for the given type.
            let rqst = new ClearAllNotificationsRqst
            let application = window.localStorage.getItem("application")
            if (application == null) {
                displayError("The application is not defined", 4000)
                return
            }

            if (type == NotificationType.APPLICATION_NOTIFICATION) {
                rqst.setRecipient(application)
            } else {
                rqst.setRecipient(user)
            }

            if (globule.resourceService == null) {
                displayError("The resource service is not defined", 4000)
                return
            }

            globule.resourceService
                .clearAllNotifications(rqst, {
                    token: token,
                    domain: Backend.domain
                })
                .then(() => {
                    // The notification is not deleted so I will send network event to remove it from
                    // the display.
                    Backend.publish(
                        user + "_clear_notification_event",
                        "",
                        false
                    );
                })
                .catch((err: any) => {
                    displayError(err, 4000);
                });

        }, err => displayError(err, 3000))
    }

}