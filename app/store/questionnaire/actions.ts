import Action from '../helpers/Action';
import { store } from '../../store'
import { ADD_QUESTIONNAIRE } from './reducer';
import QuestionnaireData from 'app/model/QuestionnaireData';

export function addQuestionnaire(dispatch, questionnaire: QuestionnaireData) {
    dispatch(new Action(ADD_QUESTIONNAIRE, questionnaire).getObjectAction());
}
