import Action from '../helpers/Action';
import { UPDATE_LOCALE_LANGUAGE, LocalHelperData } from './reducer';

export function updateAppLanguage(dispatch, lang: LocalHelperData) {
    dispatch(new Action(UPDATE_LOCALE_LANGUAGE, lang).getObjectAction());
}
