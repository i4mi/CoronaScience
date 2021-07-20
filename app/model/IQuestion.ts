import { QuestionnaireItemAnswerOption, code } from '@i4mi/fhir_r4';

export type QuestionType = 'group' | 'choice' | 'date' | 'integer' | 'lookup-choice' | 'string';

export default interface IQuestion {
    id: string; // represents linkId in QuestionnaireItem
    code: string; // represents code[0].code in QuestionnaireItem
    type: QuestionType;
    label: {[language: string]: string};
    answerOptions: IAnswerOption[];
    dependingQuestions:
        {
            dependingQuestion?: IQuestion;
            answer: QuestionnaireItemAnswerOption;
        }[];
    required: boolean; // use required in QuestionnaireItem
    allowsMultipleAnswers: boolean;
    isEnabled: boolean;
    readOnly: boolean;
    selectedAnswers: QuestionnaireItemAnswerOption[];
    subItems?: IQuestion[];
    dontWantToAnswer? : boolean;
    relatedResourceId?: string;
    isInvalid?: boolean;
}

export interface IAnswerOption {
    answer: {[language: string]: string};
    code: QuestionnaireItemAnswerOption;
    disableOtherAnswers?: code[];
}
