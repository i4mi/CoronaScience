import AsyncStorage from '@react-native-community/async-storage';
import QuestionnaireData from '../model/QuestionnaireData'
import { DEFAULT_RECURRING_QUESTIONS } from '../../resources/static/recurringQuestionnaire';
import { DEFAULT_SITUATION_QUESTIONS } from '../../resources/static/situationQuestionnaire';
import { STORAGE } from '../containers/App';

export default class QuestionnaireDataStore {
    availableQuestionnaire : Array<QuestionnaireData> = new Array<QuestionnaireData>();

    constructor(questionnaireDataStore?: Partial<QuestionnaireDataStore>) {
        if(questionnaireDataStore) {
            if(questionnaireDataStore.availableQuestionnaire != undefined)
                questionnaireDataStore.availableQuestionnaire?.forEach((questionnaire) => {
                   this.addAvailableQuestionnaire(new QuestionnaireData (
                       questionnaire.fhirQuestionnaire,
                       questionnaire.type,
                       questionnaire.valueSets,
                       questionnaire.items));
                });
            } else {
                this.availableQuestionnaire = new Array<QuestionnaireData>();
        }
    }

    //
    // Remnove all answers from the user
    //
    public resetQuestionnaireResponses() : void {
        this.availableQuestionnaire.forEach(questionnaire => {
            questionnaire.resetResponse();
        });
    }

    //
    // Remove any cached Questionnaire
    //
    public clearAvailableQuestionnaire(): void {
        this.availableQuestionnaire = new Array<QuestionnaireData>();
    }

    public addAvailableQuestionnaire( _questionnaireData : QuestionnaireData ) : void {
        let index = this.availableQuestionnaire.findIndex((questionnaire: QuestionnaireData) => questionnaire.type === _questionnaireData.type);
        if(index !== -1){
            if(_questionnaireData.type === QuestionnaireType.QUESTION_OF_THE_DAY){
                if(_questionnaireData.fhirQuestionnaire.name != this.availableQuestionnaire[index].fhirQuestionnaire.name) {
                    // A new question of the day is available. Remove the answer state QUESTION_OF_THE_DAY_ANSWERED in the local storage.
                    // Important: do not set the state to 'false', because this means that the question is unanswered. But in fact, we don't now yet,
                    // so a check on MIDATA is required to get the correct state (see Dashboard.checkIfQuestionOfTheDayIsAnswered).
                    // Notice: only the questionnaire's name is checked, not the version. When a previous version of the questionnaire
                    // has been answered, the new version will not be displayed.
                    AsyncStorage.removeItem(STORAGE.QUESTION_OF_THE_DAY_ANSWERED);
                }
            }
            this.availableQuestionnaire[index] = _questionnaireData;
        }else{
            this.availableQuestionnaire.push(_questionnaireData);
        }
    }

    public getQuestionnaire(_type: QuestionnaireType): QuestionnaireData | undefined {
        const questionnaire = this.availableQuestionnaire.find( (questionnaireData) => {
            return questionnaireData.type === _type;
        });

        if (questionnaire) {
            return questionnaire;
        } else {
            switch (_type) {
                case QuestionnaireType.RECURRING_QUESTIONS: return new QuestionnaireData(DEFAULT_RECURRING_QUESTIONS);
                case QuestionnaireType.SITUATION_QUESTIONS: return new QuestionnaireData(DEFAULT_SITUATION_QUESTIONS);
                default: return undefined;
            }
        }
    }
}

export enum QuestionnaireType{
    RECURRING_QUESTIONS = 'recurring-questions',
    SITUATION_QUESTIONS = 'situation-questions',
    QUESTION_OF_THE_DAY = 'question-of-the-day'
}
