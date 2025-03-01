import '@polymer/iron-icons/communication-icons';
import { fireResize } from '../utility';
import { Backend, displayError } from '../../backend/backend';
import { AccountController } from '../../backend/account';
import { Dialog } from "../dialog";

// Configuration for the WebRTC connection
let connectionConfig = {
    'iceServers': [{
        'urls': 'stun:stun.stunprotocol.org:3478'
    }, {
        'urls': 'stun:stun.l.google.com:19302'
    }],
    sdpSemantics: 'unified-plan'
};

const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};

/**
 * Video conversation component using WebRTC.
 */
export class VideoConversation extends HTMLElement {
    constructor(conversationUuid, domain) {
        super();

        // Store conversation details
        this.conversationUuid = conversationUuid;
        this.domain = domain;
        this.eventHub = Backend.getGlobule(this.domain).eventHub;

        // Initialize variables
        this.localStream = null;
        this.pendingCanditates = [];
        this.listeners = {};
        this.connections = {};

        // Set up the shadow DOM
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                /* Styles for the video conversation layout */
                #container { min-width: 300px; min-height: 300px; }
                .header { display: flex; align-items: center; color: var(--palette-text-accent); background-color: var(--palette-primary-accent); }
                .header span { flex-grow: 1; text-align: center; font-size: 1.1rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                #local-video { width: 200px; position: absolute; bottom: 0px; right: 0px; }
                .peers-video { display: flex; position: relative; width: 100%; height: 100%; }
                .peers-video video { width: 100%; height: auto; }
                #tool-bar { display: flex; }
                #start-share-screen, #stop-share-screen { display: none; }
                #title-span { flex-grow: 1; }
                @media (max-width: 500px) {
                    #local-video { width: 100px; position: absolute; bottom: 0px; right: 0px; }
                    #container { display: flex; flex-direction: column; top: 0px; left: 0px; width: 100vw; }
                    video { max-height: 40vh; background-color: black; }
                }
            </style>
            <globular-dialog id="container" class="no-select" is-moveable="true" is-maximizeable="true" is-resizeable="true" show-icon="true">
                <paper-icon-button id="video-options-btn" slot="header" icon="icons:arrow-drop-down" style="margin-left: 20px; min-width: 40px; --iron-icon-fill-color: var(--palette-text-accent);"></paper-icon-button>
                <span id="title-span" slot="title"></span>
                <paper-icon-button id="start-share-screen" slot="header" icon="communication:screen-share"></paper-icon-button>
                <div class="peers-video">
                    <div id="local-video-div"></div>
                </div>
            </globular-dialog>
        `;

        // Initialize UI elements
        this.peersVideo = this.shadowRoot.querySelector(".peers-video");
        let container = this.shadowRoot.querySelector("#container");

        container.onclose = () => {
            Backend.publish(`leave_conversation_${conversationUuid}_evt`, JSON.stringify({ "conversationUuid": conversationUuid, "participants": [], "participant": AccountController.account.getId() }), false);
        };

        let optionsBtn = this.shadowRoot.querySelector("#video-options-btn");
        optionsBtn.onclick = () => {
            let optionsPanel = this.shadowRoot.querySelector("#options-panel");
            if (!optionsPanel) {
                this.createOptionsPanel();
            } else {
                optionsPanel.style.display = optionsPanel.style.display === "none" ? "" : "none";
            }
        };

        this.startShareScreenBtn = this.shadowRoot.querySelector("#start-share-screen");
        this.startShareScreenBtn.onclick = () => {
            this.initScreenCaptureStream(track => {
                for (let id in this.connections) {
                    this.connections[id].getSenders().forEach(sender => {
                        if (sender.track.kind === 'video') {
                            sender.replaceTrack(track);
                        }
                    });
                }
            }, err => {
                displayError(err, 3000);
            });
        };

        // Set up event listeners for WebRTC signaling
        this.setupEventListeners();
    }

    /**
     * Create the options panel for video settings.
     */
    createOptionsPanel() {
        let html = `
            <style>
                #options-panel { display: flex; flex-direction: column; background-color: var(--palette-background-paper); color: var(--palette-text-primary); position: absolute; top: 0px; left: 0px; font-size: 1rem; }
                #options-div { display: flex; flex-direction: column; }
                .table-row { display: flex; font-size: 1.1rem; padding: 5px; }
                .option { padding: 5px; }
                .label { padding: 5px; min-width: 200px; }
                paper-toggle-button { --paper-toggle-button-label-color: var(--palette-text-primary); }
                paper-toggle-button[checked] { --paper-toggle-button-label-color: var(--palette-text-accent); }
            </style>
            <paper-card id="options-panel">
                <div id="options-div">
                    <div class="table-row">
                        <div class="label">Local video</div>
                        <paper-toggle-button id="local-video-toggle" class="option" checked>Visible</paper-toggle-button>
                    </div>
                    <div class="table-row">
                        <div class="label">Video streaming</div>
                        <paper-toggle-button id="video-toggle" class="option" checked>Enable</paper-toggle-button>
                    </div>
                    <div class="table-row">
                        <div class="label">Audio streaming</div>
                        <paper-toggle-button id="audio-toggle" class="option" checked>Enable</paper-toggle-button>
                    </div>
                </div>
                <div style="display: flex; width: 100%; justify-content: flex-end;">
                    <paper-button id="close-btn">Close</paper-button>
                </div>
            </paper-card>
        `;

        let range = document.createRange();
        this.shadowRoot.querySelector(".peers-video").appendChild(range.createContextualFragment(html));

        let optionsPanel = this.shadowRoot.querySelector("#options-panel");
        let hideShowLocalVideoToggle = this.shadowRoot.querySelector("#local-video-toggle");
        hideShowLocalVideoToggle._enabled_ = true;
        hideShowLocalVideoToggle.onclick = () => {
            let localVideo = this.shadowRoot.querySelector("#local-video");
            localVideo.style.display = hideShowLocalVideoToggle.checked ? "" : "none";
            hideShowLocalVideoToggle.innerHTML = hideShowLocalVideoToggle.checked ? "Visible" : "Hidden";
            hideShowLocalVideoToggle._enabled_ = hideShowLocalVideoToggle.checked;
        };

        let hideShowVideoToggle = this.shadowRoot.querySelector("#video-toggle");
        hideShowVideoToggle.onclick = () => {
            let localVideo = this.shadowRoot.querySelector("#local-video");
            let stream = localVideo.srcObject;
            let tracks = stream.getTracks();
            tracks.forEach(track => {
                if (track.kind === "video") {
                    track.enabled = hideShowVideoToggle.checked;
                }
            });
            localVideo.style.display = hideShowVideoToggle.checked ? "" : "none";
            hideShowVideoToggle.innerHTML = hideShowVideoToggle.checked ? "Enable" : "Disable";
            hideShowLocalVideoToggle.innerHTML = hideShowLocalVideoToggle.checked ? "Visible" : "Hidden";
            hideShowLocalVideoToggle.checked = hideShowLocalVideoToggle._enabled_;
        };

        let muteUnmuteVideoToggle = this.shadowRoot.querySelector("#audio-toggle");
        muteUnmuteVideoToggle.onclick = () => {
            let localVideo = this.shadowRoot.querySelector("#local-video");
            let stream = localVideo.srcObject;
            let tracks = stream.getTracks();
            tracks.forEach(track => {
                if (track.kind === "audio") {
                    track.enabled = muteUnmuteVideoToggle.checked;
                }
            });
            muteUnmuteVideoToggle.innerHTML = muteUnmuteVideoToggle.checked ? "Enable" : "Muted";
        };

        let closeBtn = this.shadowRoot.querySelector("#close-btn");
        closeBtn.onclick = () => {
            optionsPanel.style.display = "none";
        };
    }

    /**
     * Set up event listeners for WebRTC signaling.
     */
    setupEventListeners() {
        if (!this.listeners[`start_video_conversation_${this.conversationUuid}_evt`]) {
            this.eventHub.subscribe(`start_video_conversation_${this.conversationUuid}_evt`,
                (uuid) => {
                    this.listeners[`start_video_conversation_${this.conversationUuid}_evt`] = uuid;
                },
                (participant) => {
                    console.log("start video conversation: ", participant);
                    if (participant.getId() !== AccountController.account.getId()) {
                        let connectionId = this.conversationUuid + "_" + participant.getId();
                        this.getConnection(connectionId, rtcPeerConnection => {
                            rtcPeerConnection.onnegotiationneeded = () => {
                                rtcPeerConnection.createOffer(offerOptions)
                                    .then(offer => {
                                        rtcPeerConnection.setLocalDescription(offer).then(() => {
                                            Backend.publish(`on_webrtc_offer_${connectionId}_evt`, JSON.stringify({ "offer": offer, "connectionId": this.conversationUuid + "_" + AccountController.account.getId() }), false);
                                        });
                                    })
                                    .catch(err => {
                                        displayError(err, 3000);
                                    });
                            };
                        });
                    }
                }, true, this);
        }

        if (!this.listeners[`leave_conversation_${this.conversationUuid}_evt`]) {
            this.eventHub.subscribe(`leave_conversation_${this.conversationUuid}_evt`,
                (uuid) => {
                    this.listeners[`leave_conversation_${this.conversationUuid}_evt`] = uuid;
                },
                (evt_) => {
                    let evt = JSON.parse(evt_);
                    if (evt.participant === AccountController.account.getId()) {
                        for (let connectionId in this.connections) {
                            if (connectionId.startsWith(this.conversationUuid)) {
                                this.closeConnection(connectionId);
                            }
                        }
                    } else {
                        let connectionId = this.conversationUuid + "_" + evt.participant;
                        if (this.connections[connectionId]) {
                            this.closeConnection(connectionId);
                        }
                    }
                },
                false, this);
        }

        if (!this.listeners[`on_webrtc_offer_${this.conversationUuid + "_" + AccountController.account.getId()}_evt`]) {
            this.eventHub.subscribe(`on_webrtc_offer_${this.conversationUuid + "_" + AccountController.account.getId()}_evt`,
                (uuid) => {
                    this.listeners[`on_webrtc_offer_${this.conversationUuid + "_" + AccountController.account.getId()}_evt`] = uuid;
                },
                (evt) => {
                    let event = JSON.parse(evt);
                    let connectionId = event.connectionId;
                    this.getConnection(connectionId, rtcPeerConnection => {
                        rtcPeerConnection.setRemoteDescription(event.offer).then(() => {
                            while (this.pendingCanditates.length > 0) {
                                rtcPeerConnection.addIceCandidate(this.pendingCanditates.pop()).catch(e => {
                                    console.error(e);
                                });
                            }
                            rtcPeerConnection.createAnswer()
                                .then(answer => {
                                    rtcPeerConnection.setLocalDescription(answer).then(() => {
                                        Backend.publish(`on_webrtc_answer_${connectionId}_evt`, JSON.stringify({ "answer": answer, "connectionId": this.conversationUuid + "_" + AccountController.account.getId() }), false);
                                    });
                                })
                                .catch(err => {
                                    displayError(err, 3000);
                                });
                        }, err => {
                            displayError(err, 3000);
                        });
                    });
                }, false, this);
        }

        if (!this.listeners[`on_webrtc_answer_${this.conversationUuid + "_" + AccountController.account.getId()}_evt`]) {
            this.eventHub.subscribe(`on_webrtc_answer_${this.conversationUuid + "_" + AccountController.account.getId()}_evt`,
                (uuid) => {
                    this.listeners[`on_webrtc_answer_${this.conversationUuid + "_" + AccountController.account.getId()}_evt`] = uuid;
                },
                (evt) => {
                    let event = JSON.parse(evt);
                    let rtcPeerConnection = this.connections[event.connectionId];
                    rtcPeerConnection.setRemoteDescription(event.answer);
                }, false, this);
        }

        if (!this.listeners[`on_webrtc_candidate_${this.conversationUuid + "_" + AccountController.account.getId()}_evt`]) {
            this.eventHub.subscribe(`on_webrtc_candidate_${this.conversationUuid + "_" + AccountController.account.getId()}_evt`,
                (uuid) => {
                    this.listeners[`on_webrtc_candidate_${this.conversationUuid + "_" + AccountController.account.getId()}_evt`] = uuid;
                },
                (event) => {
                    let evt = JSON.parse(event);
                    this.getConnection(evt.connectionId, rtcPeerConnection => {
                        let icecandidate = new RTCIceCandidate(evt.candidate);
                        if (rtcPeerConnection.remoteDescription) {
                            rtcPeerConnection.addIceCandidate(icecandidate);
                        } else {
                            this.pendingCanditates.push(icecandidate);
                        }
                    });
                }, false, this);
        }
    }

    /**
     * Close the WebRTC connection and clean up resources.
     */
    closeConnection(connectionId) {
        console.log("close connection: ", connectionId);
        let peerVideo = this.peersVideo.querySelector("#_" + connectionId + "_video");
        if (peerVideo) {
            this.peersVideo.removeChild(peerVideo);
        }

        let localVideo = this.shadowRoot.querySelector("#local-video");
        if (localVideo) {
            let stream = localVideo.srcObject;
            let tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            localVideo.srcObject = null;
            localVideo.parentNode.removeChild(localVideo);
        }

        this.connections[connectionId].close();
        delete this.connections[connectionId];

        if (Object.keys(this.connections).length === 0) {
            this.startShareScreenBtn.style.display = "none";
            this.parentNode.removeChild(this);
        }

        Backend.publish(`video_conversation_close_${connectionId}_evt`, {}, false);
    }

    /**
     * Initialize or retrieve an existing WebRTC connection.
     */
    getConnection(connectionId, callback, onconnected) {
        let rtcPeerConnection = this.connections[connectionId];
        if (!rtcPeerConnection) {
            rtcPeerConnection = new RTCPeerConnection(connectionConfig);
            this.connections[connectionId] = rtcPeerConnection;

            rtcPeerConnection.ontrack = evt => {
                this.initRemoteVideoStream(connectionId, evt);
            };

            this.initLocalVideoStream(stream => {
                this.localStream = stream;

                rtcPeerConnection.onicecandidate = evt => {
                    if (evt.candidate) {
                        Backend.publish(`on_webrtc_candidate_${connectionId}_evt`, JSON.stringify({ "candidate": evt.candidate.toJSON(), "connectionId": this.conversationUuid + "_" + AccountController.account.getId() }), false);
                    }
                };

                stream.getTracks().forEach(track => {
                    rtcPeerConnection.addTrack(track, stream);
                });

                rtcPeerConnection.oniceconnectionstatechange = event => {
                    switch (rtcPeerConnection.iceConnectionState) {
                        case "connected":
                            if (onconnected) {
                                onconnected(rtcPeerConnection);
                            }
                            Backend.publish(`video_conversation_open_${connectionId}_evt`, {}, false);
                            break;
                        case "disconnected":
                        case "failed":
                        case "closed":
                            this.closeConnection(connectionId);
                            break;
                    }
                };

                if (callback) {
                    callback(rtcPeerConnection);
                }
            }, err => {
                displayError(err, 3000);
            });
        } else {
            callback(rtcPeerConnection);
        }
    }

    /**
     * Initialize screen capture stream for sharing.
     */
    initScreenCaptureStream(callback, errorCallback) {
        navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(stream => {
            const screenTrack = stream.getTracks()[0];
            this.startShareScreenBtn.style.display = "none";

            screenTrack.onended = () => {
                callback(this.localStream.getTracks()[1]);
                this.startShareScreenBtn.style.display = "block";
            };
            callback(screenTrack);
        }).catch(err => {
            errorCallback(err);
        });
    }

    /**
     * Initialize the local video stream.
     */
    initLocalVideoStream(callback, errorCallback) {
        let localVideo = this.shadowRoot.getElementById("local-video");

        if (!localVideo) {
            localVideo = document.createElement("video");
            localVideo.id = "local-video";
            this.shadowRoot.querySelector("#local-video-div").appendChild(localVideo);
        }

        localVideo.muted = true;
        localVideo.volume = 0;
        this.startShareScreenBtn.style.display = "block";

        navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            .then(stream => {
                if ("srcObject" in localVideo) {
                    localVideo.srcObject = stream;
                } else {
                    localVideo.src = window.URL.createObjectURL(stream);
                }
                localVideo.onloadedmetadata = () => {
                    localVideo.play();
                    fireResize();
                    callback(stream);
                };
            })
            .catch(err => {
                errorCallback(err);
            });
    }

    /**
     * Initialize the remote video stream.
     */
    initRemoteVideoStream(connectionId, e) {
        let remoteVideo = this.peersVideo.querySelector("#_" + connectionId + "_video");
        if (!remoteVideo) {
            remoteVideo = document.createElement("video");
            remoteVideo.id = "_" + connectionId + "_video";
            remoteVideo.autoplay = true;
            remoteVideo.playsinline = true;
            this.peersVideo.appendChild(remoteVideo);
            remoteVideo.srcObject = new MediaStream();
        }
        remoteVideo.srcObject.addTrack(e.track);
    }
}

customElements.define('globular-video-conversation', VideoConversation);
