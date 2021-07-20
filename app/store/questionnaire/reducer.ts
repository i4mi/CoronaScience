import { createReducer } from '../helpers/reducerCreator';
import { REHYDRATE } from 'redux-persist';
import QuestionnaireDataStore, { QuestionnaireType } from '../../model/QuestionnaireDataStore';
import QuestionnaireData from '../../model/QuestionnaireData'
import { LOGOUT_AUTHENTICATE_USER, UPDATE_USER_PROFILE } from '../userProfile/reducer';

export const ADD_QUESTIONNAIRE = 'questionnaireDataStore/ADD_QUESTIONNAIRE';

// Definition of actions listeners
const QuestionnaireStore = createReducer(new QuestionnaireDataStore(), {
  [REHYDRATE](state: QuestionnaireDataStore, action) {
    let newState = state;
    if (action.payload && action.payload.QuestionnaireStore) {
      newState = new QuestionnaireDataStore(action.payload.QuestionnaireStore);
      if (action.payload.UserProfileStore.profileQuestionnaireReponse?.authored) {
        newState.getQuestionnaire( QuestionnaireType.SITUATION_QUESTIONS )?.restoreAnswersFromQuestionnaireResponse(action.payload.UserProfileStore.profileQuestionnaireReponse);
      }
    }
    return newState;
  },
  [ADD_QUESTIONNAIRE](state: QuestionnaireDataStore, action) {
    let newState = new QuestionnaireDataStore(state);
    let newValues: QuestionnaireData = action.data;
    newState.addAvailableQuestionnaire( newValues );
    return newState;
  },
  [LOGOUT_AUTHENTICATE_USER](state: QuestionnaireDataStore, action) {
    let newState = new QuestionnaireDataStore(state);
    newState.resetQuestionnaireResponses();
    return newState;
  },
  [UPDATE_USER_PROFILE](state: QuestionnaireDataStore, action) {
    let newState = new QuestionnaireDataStore(state);
    if (action.data.profileQuestionnaireReponse?.authored) {
      state.getQuestionnaire( QuestionnaireType.SITUATION_QUESTIONS )?.restoreAnswersFromQuestionnaireResponse(action.data.profileQuestionnaireReponse);
    }
    return newState;
  }
});

export default QuestionnaireStore;
