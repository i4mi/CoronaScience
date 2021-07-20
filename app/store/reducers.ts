import { combineReducers } from 'redux';
import MiDataServiceStore from './midataService/reducer';
import UserProfileStore from './userProfile/reducer';
import LocalesHelperStore from './localesHelper/reducer';
import QuestionnaireStore from './questionnaire/reducer';
import StatDataStore from './statData/reducer';

// Combine all reducers :
const store = Object.assign({},
    { MiDataServiceStore },
    { UserProfileStore },
    { LocalesHelperStore },
    { QuestionnaireStore },
    { StatDataStore }
);
export default combineReducers(store);
export type AppStore = typeof store;
