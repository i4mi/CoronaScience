import Action from '../helpers/Action';
import { UPDATE_USER_AUTHENTICATION, UserAuthenticationData, LOGOUT_AUTHENTICATE_USER, ADD_RESOURCE, ADD_RESOURCE_TO_SYNCHRONIZE, RESOURCE_SENT } from './reducer';
import { Resource, Bundle, Observation, QuestionnaireResponse } from '@i4mi/fhir_r4';
import { store } from '..';
import AsyncStorage from '@react-native-community/async-storage';
import { ALL_RESOURCES_SENT } from '../midataService/reducer'
import { STORAGE } from '../../containers/App';
import moment from 'moment';

export function authenticateUser(dispatch, accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) {
    var actionData: UserAuthenticationData = {
        accessToken,
        accessTokenExpirationDate,
        refreshToken,
        server
    };
    dispatch(new Action(UPDATE_USER_AUTHENTICATION, actionData).getObjectAction());
}

/*
* Add/Send/save a FHIR resource on a FHIR Server (MIDATA on our case)
* make a simple HTTP POST
*/
export function addResource(dispatch, resource: Resource) {
    dispatch(new Action(ADD_RESOURCE, resource).getObjectAction());
}

/*
* Synchronize/Add/Send/save a FHIR resource on a FHIR Server (MIDATA on our case)
* check if this resource exist on the FHIR server. If no, we will add the resource.
* if we found the same resource, we check if the given version is the newest.
*/
export function synchronizeResource(dispatch, resource: Resource) {
    dispatch(new Action(ADD_RESOURCE_TO_SYNCHRONIZE, resource).getObjectAction());
}

export function logoutUser(dispatch) {
    try {
        // The item ASK_NOTIFICATIONS_PERMISSION must not be removed, since the app may only ask for notification permission once,
        // regardless if a new user logs in.
        AsyncStorage.removeItem(STORAGE.SHOULD_DISPLAY_INTRO);
        AsyncStorage.removeItem(STORAGE.INTRO_SKIPPED);
        AsyncStorage.removeItem(STORAGE.INTRO_DATE);
        AsyncStorage.removeItem(STORAGE.LAST_HEALTH_STATUS_UPDATE);
        AsyncStorage.removeItem(STORAGE.QUESTION_OF_THE_DAY_ANSWERED);
    } catch (e) {
        // saving error
    }
    dispatch(new Action(LOGOUT_AUTHENTICATE_USER).getObjectAction());
}

export async function uploadPendingResources(dispatch) {
    let resources = ((store.getState()) as any).MiDataServiceStore.pendingResources;
    let resourcesToUpload = new Array();
    resources.forEach(async (resource: {resource : Resource, isUploading : boolean, mustBeSynchronized : boolean}) => {
        if( !resource.isUploading ){
            resource.isUploading = true;
            await resourcesToUpload.push(await uploadResource(resource, dispatch));
        }
    });
    //((store.getState()) as any).MiDataServiceStore.pendingUpload = resourcesToUpload.length;

    return await Promise.all(resourcesToUpload).then(() => {
        dispatch({
            type: ALL_RESOURCES_SENT,
        });
    });
}

export async function uploadResource(_jobItem: {resource : Resource, isUploading : boolean, mustBeSynchronized : boolean}, dispatch) {
    let endPoint = '/fhir';

    // TODO: can a bundle be synchonized?

    // determine the endPoint based on resource type
    if( _jobItem.resource.resourceType !== 'Bundle'){ 
        endPoint += '/' + _jobItem.resource.resourceType;
    }

    let MIDATAStore = ((store.getState()) as any).MiDataServiceStore;

    if(!_jobItem.mustBeSynchronized){
        // TODO : try/catch when user's token no more valid!
        await MIDATAStore.fetch( endPoint, 'POST', JSON.stringify(_jobItem.resource) ).then((bundle : Bundle) => {
            dispatch({
                type: RESOURCE_SENT,
                resource: _jobItem
            });
        }).catch(()=>{
            _jobItem.isUploading = false;
        });
        return Promise.resolve();
    }else{
 
        switch(_jobItem.resource.resourceType){
            case 'Observation':             endPoint = '/fhir/Observation/' + _jobItem.resource.id;
                                            break;
            case 'QuestionnaireResponse':   endPoint = '/fhir/QuestionnaireResponse?questionnaire:below=' + (_jobItem.resource as QuestionnaireResponse).questionnaire?.split('|')[0] + '&_sort=-authored&_count=1'
                                            break;
        }
        
        // TODO : try/catch when user's token no more valid!
        await MIDATAStore.fetch( endPoint, 'GET' ).then(async (bundle : Bundle) => {
            if(!bundle.entry || bundle.entry?.length == 0){
                _jobItem.mustBeSynchronized = false;
                uploadResource( _jobItem, dispatch );
            }else{
                // only considering the first entry.
                // TODO: is it correct?
                const serverResource = bundle.entry[0].resource;
                let mustBeUpdated : boolean = false;

                switch(_jobItem.resource.resourceType){
                    case 'Observation':             mustBeUpdated = moment((serverResource as Observation).effectiveDateTime).isBefore( (_jobItem.resource as Observation).effectiveDateTime );
                                                    break;
                    case 'QuestionnaireResponse':   mustBeUpdated = moment((serverResource as QuestionnaireResponse).authored).isBefore( (_jobItem.resource as QuestionnaireResponse).authored );
                                                    break;
                }

                if( mustBeUpdated ){
                        _jobItem.resource.id = serverResource?.id;

                    if(_jobItem.resource.resourceType == 'Observation'){
                        // TODO : try/catch when user's token no more valid!
                        await MIDATAStore.fetch( endPoint, 'PUT', JSON.stringify(_jobItem.resource) ).then((bundle : Bundle) => {
                            dispatch({
                                type: RESOURCE_SENT,
                                resource: _jobItem
                            });
                        }).catch(()=>{
                            _jobItem.isUploading = false;
                        });
                        return Promise.resolve();

                    }else if(_jobItem.resource.resourceType == 'QuestionnaireResponse'){
                        (_jobItem.resource as QuestionnaireResponse).meta.versionId = (serverResource as QuestionnaireResponse).meta?.versionId;
                        endPoint = '/fhir/QuestionnaireResponse/' + _jobItem.resource.id;
                        
                        // TODO : try/catch when user's token no more valid!
                        await MIDATAStore.fetch( endPoint, 'PUT', JSON.stringify(_jobItem.resource) ).then((bundle : Bundle) => {
                            dispatch({
                                type: RESOURCE_SENT,
                                resource: _jobItem
                            });
                        }).catch(()=>{
                            _jobItem.isUploading = false;
                        });
                        return Promise.resolve();
                    }
                }else{
                    dispatch({
                        type: RESOURCE_SENT,
                        resource: _jobItem
                    });
                }

            }
        }).catch((error) => {
            console.log(error);
            _jobItem.isUploading = false;
        });
        return Promise.resolve();
    }
}