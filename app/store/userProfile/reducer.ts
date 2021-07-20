import { createReducer } from '../helpers/reducerCreator';
import { REHYDRATE } from 'redux-persist';
import UserProfile from '../../model/UserProfile';
import { QuestionnaireResponse } from '@i4mi/fhir_r4';
import { ADD_RESOURCE_TO_SYNCHRONIZE } from '../midataService/reducer';

export const UPDATE_USER_PROFILE = 'userProfile/UPDATE_USER_PROFILE';
export const UPDATE_USER_AGE_GROUP = 'userProfile/UPDATE_USER_AGE_GROUP';
export const LOGOUT_AUTHENTICATE_USER = 'miDataService/LOGOUT_AUTHENTICATE_USER';

export type UserProfileData = Partial<UserProfile>;

// Definition of actions listeners
const UserProfileStore = createReducer(new UserProfile(), {
  [REHYDRATE](state: UserProfile, action) {
      if (action.payload && action.payload.UserProfileStore) {
        return new UserProfile(action.payload.UserProfileStore);
      }
      return state;
    },
  [UPDATE_USER_PROFILE](state: UserProfile, action) {
    let newState = new UserProfile(state);
    let newValues: UserProfileData = action.data;
    newState.updateProfile(newValues);
    return newState;
  },
  [ADD_RESOURCE_TO_SYNCHRONIZE](state: UserProfile, action) {
    const resource =  action.data;
    if(resource.resourceType === 'QuestionnaireResponse' && (resource as QuestionnaireResponse).questionnaire.indexOf('coronascience-situation-questions-QS1') > 0) {
        let newState = new UserProfile(state);
        newState.setPersonalSituation(resource);
        return newState;
    }
    return state;
  },
  [LOGOUT_AUTHENTICATE_USER](state: UserProfile, action) {
    let newState = new UserProfile(state);
    newState.resetProfileData();
    return newState;
}
});

export default UserProfileStore;
