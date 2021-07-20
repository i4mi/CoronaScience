import { AppStore } from '../reducers';
import { ALL_RESOURCES_SENT, UPDATE_USER_AUTHENTICATION } from '../midataService/reducer'
import { logoutUser } from '../midataService/actions'
import UserProfile from "../../model/UserProfile";
import { updateUserProfile } from "../../store/userProfile/actions";
import { Observation, ObservationStatus } from '@i4mi/fhir_r4';
import { UPDATE_USER_PROFILE } from '../userProfile/reducer';

export const checkAgeGroupMiddleWare = (store : AppStore) => next => action => {

    switch( action.type ){
      case ALL_RESOURCES_SENT :
                                  store.getState().MiDataServiceStore.getUserProfile().then((userProfile : UserProfile) => {
                                    store.getState().UserProfileStore.updateProfile(userProfile);
                                    store.getState().MiDataServiceStore.checkAgeGroup(userProfile.patientData).then(( ageGroup : Observation | undefined ) => {
                                      if( ageGroup !== undefined)
                                        store.getState().UserProfileStore.setAgeGroup(ageGroup);
                                    });
                                  });
                                  next(action);
                                  break;

      case UPDATE_USER_AUTHENTICATION :
                                  next(action);

                                  store.getState().MiDataServiceStore.getUserProfile().then((userProfile : UserProfile) => {
                                    store.getState().MiDataServiceStore.checkAgeGroup(userProfile.patientData).then(( ageGroup : Observation | undefined ) => {
                                      if(ageGroup !== undefined) {
                                        userProfile.setAgeGroup(ageGroup);
                                      }
                                      updateUserProfile(next, userProfile);
                                    })
                                    .catch(() => {
                                      updateUserProfile(next, userProfile);
                                    });
                                  }).catch(() => {
                                    logoutUser( next );
                                  });
                                  break;
      case UPDATE_USER_PROFILE :
                                  next(action);
                                  store.getState().MiDataServiceStore.getUserProfile().then((userProfile : UserProfile) => {
                                    if (userProfile.getAgeGroup().status === ObservationStatus.UNKNOWN) {
                                      store.getState().MiDataServiceStore.checkAgeGroup(userProfile.patientData).then(( ageGroup : Observation | undefined ) => {
                                        if(ageGroup !== undefined) {
                                          userProfile.setAgeGroup(ageGroup);
                                        }
                                        updateUserProfile(next, userProfile);
                                      })
                                      .catch(() => {
                                        updateUserProfile(next, userProfile);
                                      });
                                    }
                                  }).catch(() => {
                                    logoutUser( next );
                                  });
                                  break;
      default:                    next(action);
                                  break;
    }
}
