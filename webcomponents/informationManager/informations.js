
import getUuidByString from "uuid-by-string"
import { generatePeerToken, Backend } from '../../backend/backend';
import { GetFileMetadataRequest } from 'globular-web-client/file/file_pb';
import { CreateVideoRequest, DeleteTitleRequest, DeleteVideoRequest, DissociateFileWithTitleRequest, GetTitleFilesRequest, Poster, Person, Publisher, SearchTitlesRequest, SearchPersonsRequest, DeletePersonRequest, GetPersonByIdRequest, CreatePersonRequest, CreateTitleRequest, CreateAudioRequest, UpdateTitleMetadataRequest, UpdateVideoMetadataRequest } from "globular-web-client/title/title_pb";
import { displayError, displayQuestion, displaySuccess, getFileSizeString } from "../utility.js";
import { playVideo } from "../video.js";
import { playAudio } from "../audio.js";
import { EditableStringList } from "../list.js";
//import { readBlogPost } from './BlogPost';
//import { PermissionsManager } from './permissions.js';
import { VideoPreview } from "../fileExplorer/videoPreview.js";

import '@polymer/iron-autogrow-textarea/iron-autogrow-textarea.js';



