import { createReducer } from '../helpers/reducerCreator';
import LocalesHelper from '../../locales';
import { REHYDRATE } from 'redux-persist';

export const UPDATE_LOCALE_LANGUAGE = 'localesHelper/UPDATE_LOCALE_LANGUAGE';
export type LocalHelperData = string;

// Definition of actions listeners
const LocalesHelperStore = createReducer(new LocalesHelper(), {
  [REHYDRATE](state: LocalesHelper, action) {
    if (action.payload && action.payload.LocalesHelperStore) {
      return new LocalesHelper(action.payload.LocalesHelperStore);
    }
    return state;
  },
  [UPDATE_LOCALE_LANGUAGE](state: LocalesHelper, action) {
    let newState = new LocalesHelper(state);
    let newLang: string = action.data;
    newState.updateLanguage(newLang);
    return newState;
  }
});

export default LocalesHelperStore;