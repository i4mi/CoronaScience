import Action from '../helpers/Action';
import { UPDATE_USER_PROFILE, UserProfileData } from './reducer';

export function updateUserProfile(dispatch, userProfileInfo: UserProfileData) {
    dispatch(new Action(UPDATE_USER_PROFILE, userProfileInfo).getObjectAction());
}
