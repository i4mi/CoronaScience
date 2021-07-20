import { createReducer } from '../helpers/reducerCreator';
import MiDataService from './model';
import { REHYDRATE } from 'redux-persist';
import { Resource } from '@i4mi/fhir_r4';
import AsyncStorage from '@react-native-community/async-storage';
import { STORAGE } from '../../containers/App';
import Moment from 'moment';
import Config from 'react-native-config';

export const UPDATE_USER_AUTHENTICATION = 'miDataService/UPDATE_USER_AUTHENTICATION';
export const LOGOUT_AUTHENTICATE_USER = 'miDataService/LOGOUT_AUTHENTICATE_USER';
export const ADD_RESOURCE = 'miDataService/ADD_RESOURCE'
export const ADD_RESOURCE_TO_SYNCHRONIZE = 'miDataService/ADD_RESOURCE_TO_SYNCHRONIZE'
export const RESOURCE_SENT = 'miDataService/RESOURCE_SENT'
export const ALL_RESOURCES_SENT = 'miDataService/ALL_RESOURCES_SENT'
export type UserAuthenticationData = {accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string};

// Definition of actions listeners
const MiDataServiceStore = createReducer(new MiDataService(), {
  [REHYDRATE](state: MiDataService, action) {
      if (action.payload && action.payload.MiDataServiceStore) {
        if(action.payload.MiDataServiceStore.hasOwnProperty('pendingResources') ){
          action.payload.MiDataServiceStore.pendingResources.forEach(item => {
            item.isUploading = false;
          });
        }

        if(!action.payload.MiDataServiceStore.currentSession.hasOwnProperty('server') ){
          action.payload.MiDataServiceStore.currentSession.server = Config.HOST;
        }
        
        return new MiDataService(action.payload.MiDataServiceStore);
      }
      return state;
    },
  [UPDATE_USER_AUTHENTICATION](state: MiDataService, action) {
    let newState = new MiDataService(state);
    let newValues: UserAuthenticationData = action.data;
    newState.authenticateUser(newValues.accessToken, newValues.accessTokenExpirationDate, newValues.refreshToken, newValues.server);

    try {
      const first = [STORAGE.SHOULD_DISPLAY_INTRO, 'false']
      const second = [STORAGE.INTRO_SKIPPED, 'true']
      const third = [STORAGE.INTRO_DATE, Moment().toISOString()]

      AsyncStorage.multiSet([first, second, third])
    } catch (e) {
      // saving error
    }

    return newState;
  },
  [ADD_RESOURCE](state: MiDataService, action) {
    let newState = new MiDataService(state);
    newState.pendingResources.push({ resource: action.data, isUploading: false, mustBeSynchronized: false});
    return newState;
  },
  [ADD_RESOURCE_TO_SYNCHRONIZE](state: MiDataService, action) {
    let newState = new MiDataService(state);
    newState.pendingResources.push({ resource: action.data, isUploading: false, mustBeSynchronized: true});
    return newState;
  },
  [RESOURCE_SENT](state: MiDataService, action) {
    let newState = new MiDataService(state);
    let resource = action.resource.resource as Resource;

    let resourceIndex = newState.pendingResources.findIndex(( item ) => {
      return item.resource == resource
    });

    if (resourceIndex > -1) {
      newState.pendingResources.splice(resourceIndex, 1);
    }
    
    return newState;
  },
  [LOGOUT_AUTHENTICATE_USER](state: MiDataService) {
    let newState = new MiDataService(state);
    console.log('Access token will be deleted');
    newState.logoutUser();
    return newState;
  }
});

export default MiDataServiceStore;