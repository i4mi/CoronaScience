import moment from 'moment';
import { Questionnaire, QuestionnaireResponse, QuestionnaireResponseStatus, QuestionnaireResponseItem, QuestionnaireItemType,
         Resource, ValueSet, QuestionnaireItem, Reference, QuestionnaireResponseItemAnswer, Extension, QuestionnaireItemAnswerOption, code} from "@i4mi/fhir_r4";
import IQuestion, { IAnswerOption } from "./IQuestion";
import { QuestionnaireType } from './QuestionnaireDataStore';
import { PLZ } from "../../resources/static/plz";
import { QUESTIONNAIRERESPONSE_CODING_EXTENSION, QUESTIONNAIRE_ITEM_CONTROL_EXTENSION_SYSTEM, QUESTIONNAIRE_ITEM_CONTROL_EXTENSION,
         QUESTIONNAIRE_PLZ_LOCAL_VALUESET, QUESTIONNAIRE_PLZ_CODING_SYSTEM, QUESTIONNAIRE_CANTON_CODING_SYSTEM} from "../../resources/static/codings";

const UNSELECT_OTHERS_EXTENSION = "http://midata.coop/extensions/valueset-unselect-others";

export default class QuestionnaireData {
    // the FHIR resources we work on
    fhirQuestionnaire: Questionnaire;
    valueSets: {[url: string]: ValueSet};
    type : QuestionnaireType ;
    // the data we work with
    items: IQuestion[];
    lastRestored: string | undefined;

    constructor(_questionnaire: Questionnaire, _questionnaireType : QuestionnaireType = QuestionnaireType.RECURRING_QUESTIONS, _valueSets?: {[url: string]: ValueSet}, _items?: IQuestion[]){
        this.fhirQuestionnaire = _questionnaire;
        this.type = _questionnaireType

        this.items = new Array<IQuestion>();

        if(_valueSets) {
            this.valueSets = _valueSets;
        } else {
            // process contained valuesets
            // TODO: prepare for not contained valuesets
            this.valueSets = {};

            this.fhirQuestionnaire.contained?.forEach((resource: Resource) => {
                if(resource.resourceType === 'ValueSet') {
                    const valueSet = resource as ValueSet;
                    if(valueSet.id) {
                        this.valueSets[valueSet.id] = valueSet;
                    }
                }
            });
        }

        if(_items) {
            this.items = _items;
        } else {
            this.items = new Array<IQuestion>();
            this.resetResponse();
        }
    }

    /**
     * Resets the response to the questionnaire
     **/
    resetResponse() {
        if (this.items.length > 0) {
            this.items = new Array<IQuestion>();
        }

        let questionsDependencies: {id: string, reference?: IQuestion, answer: any}[] = []; // helper array for dependingQuestions

        this.fhirQuestionnaire.item?.forEach((item) => {
            // recursively process items
            let currentQuestion = this.mapQuestionnaireItemToIQuestion(item);

            let dependingToQuestions = this.linkDependingQuestions(item, currentQuestion);

            if(dependingToQuestions.length > 0){
                questionsDependencies = questionsDependencies.concat(dependingToQuestions);
            }

            this.items.push(currentQuestion);
        });

        // now we stepped through all the items and the helper array is complete, we can add depending questions to their determinators
        questionsDependencies.forEach((question) => {
            const determinator = this.findQuestionById(question.id, this.items);
            determinator?.dependingQuestions.push({
                dependingQuestion: question.reference,
                answer: question.answer
            })
        });
    }

    /**
     * Returns the questions array.
     **/
    getQuestions(): IQuestion[] {
        return this.items;
    }

    /**
     * Returns the questionnaire title in a given language.
     * @param _language the language code of the wanted language
     **/
    getQuestionnaireTitle(_language: string): string | undefined {
        if(this.fhirQuestionnaire._title?.extension) {
            return this.getTranslationsFromExtension(this.fhirQuestionnaire._title as {extension: Array<{extension: Array<any>}>})[_language]
        } else {
            return undefined;
        }
    }

    /**
     * Processes a QuestionnaireResponse and parses the given answers to the local iQuestion array
     * @param _fhirResponse a QuestionnaireResponse that matches the Questionnaire
     * @throws an error if the questionnaire response is not matching the questionnaire
     **/
    restoreAnswersFromQuestionnaireResponse(_fhirResponse: QuestionnaireResponse): void {
        // only restore, if it is not already up to date
        if(this.lastRestored == undefined || moment(this.lastRestored).isBefore(_fhirResponse.authored)){
            this.lastRestored = _fhirResponse.authored;
            const questionnaireUrl = _fhirResponse.questionnaire?.split('|')[0];
            if(questionnaireUrl !== this.fhirQuestionnaire.url?.split('|')[0]) {
                throw new Error('Invalid argument: QuestionnaireResponse does not match Questionnaire!');
            }
            _fhirResponse.item?.forEach((answerItem) => {
                const item = this.findQuestionById(answerItem.linkId, this.items);
                if(item){
                    item.selectedAnswers = [];
                    if(item.answerOptions && item.answerOptions.length > 0) {
                        answerItem.answer?.forEach((answer) => {
                            const answerAsAnswerOption = item.answerOptions.find((answerOption) => {
                                if(answer.valueCoding){
                                    return answer.valueCoding.system === answerOption.code.valueCoding?.system
                                        ? answer.valueCoding.code === answerOption.code.valueCoding.code
                                        : false
                                } else if(answer.valueString) {
                                    return answer.valueString = answerOption.code.valueString;
                                } else if(answer.valueInteger) {
                                    return answer.valueInteger = answerOption.code.valueInteger;
                                } else {
                                    //TODO: other answer types
                                    console.warn('Answer has unknown type', answer);
                                    return false;
                                }
                            });
                            if(answerAsAnswerOption) {
                                item.selectedAnswers.push(answerAsAnswerOption.code);
                            }
                        });
                    } else if(item.type === 'integer' && answerItem.answer && answerItem.answer.length > 0) {
                        item.selectedAnswers.push(answerItem.answer[0])
                    }

                } else {
                    console.warn('Item with linkId ' + answerItem.linkId + ' was found in QuestionnaireResponse, but does not exist in Questionnaire.');
                }
            })
        } 
    }

    /**
     * Gets the QuestionnaireResponse resource with all the currently set answers.
     * @param _language the shorthand for the language the QuestionnaireResponse should be in
     * @param _patient? a Reference to the FHIR Patient who filled out the Questionnaire
     * @param _date?    the date when the Questionnaire was filled out (current date by default)
     * @returns         a QuestionnaireResponse FHIR resource containing all the answers the user gave
     * @throws          an error if the QuestionnaireResponse is not valid for the corresponding
     *                  Questionnaire, e.g. when a required answer is missing
     **/
    getQuestionnaireResponse(_language: string, _patient?: Reference, _date?: Date): QuestionnaireResponse {
        return {
            status: this.isResponseComplete() ? QuestionnaireResponseStatus.COMPLETED : QuestionnaireResponseStatus.IN_PROGRESS,
            resourceType: 'QuestionnaireResponse',
            extension: QUESTIONNAIRERESPONSE_CODING_EXTENSION,
            questionnaire: this.getQuestionnaireURLwithVersion(),
            authored: _date ? _date.toISOString() : new Date().toISOString(),
            source: _patient ? _patient : undefined,
            meta: {},
            item: this.mapIQuestionToQuestionnaireResponseItem(this.items, new Array<QuestionnaireResponseItem>(), _language)
        }
    }

    /**
     * Returns the questionnaire URL with version number in FHIR canonical format.
     * @return a canonical questionnaire URL
     **/
    getQuestionnaireURLwithVersion(): string {
        return this.fhirQuestionnaire.url + ( this.fhirQuestionnaire.version
                                                ? ('|'+  this.fhirQuestionnaire.version)
                                                : ''
                                            );
    }

    /**
     * Checks a QuestionnaireResponse for completeness.
     * @param   onlyRequired optional parameter, to specify if only questions with
                             the required attribute need to be answered or all questions;
                             default value is: false
     * @returns true if all questions are answered
     *          false if at least one answer is not answered
     */
    isResponseComplete(onlyRequired?: boolean): boolean {
        onlyRequired = onlyRequired === true ? true : false;
        return this.recursivelyCheckCompleteness(this.items, onlyRequired);
    }

    private recursivelyCheckCompleteness(_question: IQuestion[], _onlyRequired: boolean): boolean {
        var isComplete = true;
        _question.forEach((question) => {
            if (question.type === 'group' && question.subItems) {
                isComplete = isComplete
                                ? this.recursivelyCheckCompleteness(question.subItems, _onlyRequired)
                                : false;
            } else if (question.readOnly) {
                // do nothing
            } else {
                if(question.required || !_onlyRequired) {
                    isComplete = isComplete
                                    ? question.selectedAnswers && question.selectedAnswers.length > 0
                                    : false;
                }
            }
            // after the first item is not complete, we don't have to look any further
            if(!isComplete) return false;
        });
        return isComplete;
    }

    /**
     * Recursively iterates through nested IQuestions and extracts the given answers and adds
     * it to a given array as FHIR QuestionnaireResponseItem
     * @param question      an array of (possibly nested) IQuestions
     * @param responseItems the array to fill with the FHIR QuestionnaireResponseItems
     * @returns             the given array
     * @throws              an error if answers are not valid
     **/
    private mapIQuestionToQuestionnaireResponseItem(_question: IQuestion[], _responseItems: QuestionnaireResponseItem[], _language: string): QuestionnaireResponseItem[] {

        _question.forEach((question) => {

            if (question.type === 'group') {
                if (question.subItems) {
                    _responseItems = this.mapIQuestionToQuestionnaireResponseItem(question.subItems, _responseItems, _language);
                } else {
                    throw new Error(`Invalid question set: IQuestion with id ${question.id} is group type, but has no subItems.`);
                }
            } else {
                // some validation
                if (question.required && question.selectedAnswers.length === 0) {
                    throw new Error(`Invalid answer set: IQuestion with id ${question.id} is mandatory, but not answered.`);
                } else if (!question.allowsMultipleAnswers && question.selectedAnswers.length > 1){
                    throw new Error(`Invalid answer set: IQuestion with id ${question.id} allows only one answer, but has more.`);
                } else {
                    const responseItem: QuestionnaireResponseItem = {
                        linkId: question.id,
                        text: question.label[_language],
                        answer: new Array<QuestionnaireResponseItemAnswer>()
                    }
                    question.selectedAnswers.forEach((answer) => {
                        if(answer.valueCoding) {
                            // find translated dispay for answer valueCoding
                            const answerDisplayAllLanguages = question.answerOptions.find((answerOption) => {
                                return answerOption.code.valueCoding?.code === answer.valueCoding?.code
                            })?.answer;
                            // some answer options (e.g. zip code locations) have only one language set
                            const answerDisplay = answerDisplayAllLanguages[_language]
                                                    ? answerDisplayAllLanguages[_language]
                                                    : answerDisplayAllLanguages[Object.keys(answerDisplayAllLanguages)[0]];
                            responseItem.answer?.push({
                                valueCoding: {
                                    system: answer.valueCoding.system,
                                    code: answer.valueCoding.code,
                                    display: answerDisplay,
                                    extension: answer.valueCoding.extension
                                }
                            });
                        } else {
                            responseItem.answer?.push(answer);
                        }
                    });

                    // add to array
                    _responseItems.push(responseItem);
                }
            }
        });
        return _responseItems;
    }

    /**
     * recursively iterates through a possibly nested QuestionnaireItem and maps it to IQuestion objects.
     * @param _FHIRItem the QuestionnaireItem to start with
     * @param _tempDependingQuestions a helper array for keeping track of questions that depends on other
     */
    private mapQuestionnaireItemToIQuestion(_FHIRItem: QuestionnaireItem): IQuestion {
        const question: Partial<IQuestion> = {
            id: _FHIRItem.linkId ? _FHIRItem.linkId : '',
            code: _FHIRItem.code ? _FHIRItem.code[0].code : '', // use the first Coding, the remaining ones are ignored
            required: _FHIRItem.required || false,
            allowsMultipleAnswers: _FHIRItem.repeats,
            answerOptions: new Array<IAnswerOption>(),
            selectedAnswers: Array<QuestionnaireItemAnswerOption>(),
            dependingQuestions: [],
            isEnabled: true,
            readOnly: _FHIRItem.readOnly ? _FHIRItem.readOnly : false
        }

        // detect question type
        switch(_FHIRItem.type){
            case QuestionnaireItemType.GROUP:
            case QuestionnaireItemType.CHOICE:
            case QuestionnaireItemType.INTEGER:
            case QuestionnaireItemType.STRING:
            case QuestionnaireItemType.DATE:    question.type = _FHIRItem.type;
                                                break;

            default:                            console.warn(`QuestionnaireData.ts: Item type ${_FHIRItem.type} is currently not supported.`)
                                                //return undefined; // TODO : check this
        }

        question.label = this.getTranslationsFromExtension(_FHIRItem._text as {extension: Array<{extension: Array<any>}>});


        // first handle group items with subitems
        if (_FHIRItem.type === QuestionnaireItemType.GROUP && _FHIRItem.item) {
            question.subItems = new Array<IQuestion>();

            _FHIRItem.item.forEach((subItem) => {
                question.subItems?.push(this.mapQuestionnaireItemToIQuestion(subItem));
            });

        // handle all other items
        } else {
            // readonly items are easy
            if(_FHIRItem.readOnly) {
                _FHIRItem.answerOption?.forEach((answerOption) => {
                    if(answerOption.valueString) {
                        question.answerOptions.push({
                            answer: {de: 'TODO: parse language answers'},
                            code: {valueString: answerOption.valueString}
                        });
                    } else  {
                        console.warn('Can not handle unknown answerOption type', answerOption)
                    }
                });
                return question as IQuestion;
            }

            if(question.type === 'choice') {
                // check if it has the lookup itemcontrol extension
                if (this.hasExtension(QUESTIONNAIRE_ITEM_CONTROL_EXTENSION, QUESTIONNAIRE_ITEM_CONTROL_EXTENSION_SYSTEM, _FHIRItem)?.code === 'lookup') {
                    question.type = 'lookup-choice';
                }
            }
            // process answer options from ValueSet
            if (_FHIRItem.answerValueSet && _FHIRItem.answerValueSet.indexOf('#') >= 0) { // these are the "contained valuesets"
                let answerOptionsToUnselect = new Array<{disabler: string, toBeDisabled: string | {mustAllOthersBeDisabled: true}}>();
                const answerValueSet = this.valueSets[_FHIRItem.answerValueSet.split('#')[1]];

                if(!answerValueSet) {
                    console.warn('No matching answerValueSet found for ' + _FHIRItem.answerValueSet);
                } else {
                    // check if the valueset has an extension for items unselecting others
                    const unselectOtherExtensions = _FHIRItem.extension?.filter((extension) => {
                        return extension.url === UNSELECT_OTHERS_EXTENSION;
                    }) as Extension[];

                    answerValueSet.compose?.include[0].concept?.forEach((concept) => {
                        // build answerOption objects with translations
                        const answerOption: IAnswerOption = {
                            answer: this.getTranslationsFromDesignation(concept.designation),
                            code: {
                                valueCoding:
                                {
                                    system: answerValueSet.compose?.include[0].system ? answerValueSet.compose.include[0].system : answerValueSet.url,
                                    code: concept.code
                                }
                            }
                        }

                        if (unselectOtherExtensions) {
                            // prepare the unselect-others array when an answeroption unselects other options
                            unselectOtherExtensions.forEach((extension) => {
                                extension = extension.extension[0];
                                if (extension.valueCode === answerOption.code.valueCoding?.code && answerOption.code.valueCoding?.code) {
                                    answerOptionsToUnselect.push({
                                        disabler: answerOption.code.valueCoding?.code,
                                        toBeDisabled: {mustAllOthersBeDisabled: true}
                                    });
                                } else {
                                    if(answerOption.code.valueCoding?.code && extension.valueCode){
                                        answerOptionsToUnselect.push({
                                            disabler: answerOption.code.valueCoding?.code,
                                            toBeDisabled: extension.valueCode
                                        });
                                    }
                                }
                            });
                        }

                        question.answerOptions?.push(answerOption);
                    });
                    // now we know all answerOptions, we can link the dependingAnswers from the temp array
                    answerOptionsToUnselect.forEach((answerPair) => {
                        const disabler = question.answerOptions?.find((answerOption) => {
                            return answerOption.code.valueCoding?.code === answerPair.disabler;
                        });
                        let answersToBeDisabled: Array<code> = new Array<code>();
                        if(answerPair.toBeDisabled.mustAllOthersBeDisabled){
                            // add all but the disabler option to array
                            question.answerOptions?.map((answerOption) => {
                                if(answerOption.code.valueCoding?.code !== answerPair.disabler)
                                    answersToBeDisabled.push(answerOption.code.valueCoding.code)
                            });
                        } else {
                            answersToBeDisabled = new Array<code>();
                            // find the link to the disabled question
                            const disabledQuestion = question.answerOptions?.find((answerOption) => {
                                return answerOption.code.valueCoding?.code === answerPair.toBeDisabled;
                            });
                            if(disabledQuestion) {
                                answersToBeDisabled.push(disabledQuestion.code.valueCoding.code);
                            }
                        }
                        // finally assign the to be disabled questions to the disabler
                        if(disabler) {
                            disabler.disableOtherAnswers = answersToBeDisabled;
                        };
                    });
                }
            } else if(_FHIRItem.answerValueSet === QUESTIONNAIRE_PLZ_LOCAL_VALUESET) {
                PLZ.forEach((city) => {
                    let answerStrings: {[language: string]: string} = {};
                    answerStrings[city.Sprache] = city.PLZ + ' ' + city.Ortschaft;
                    question.answerOptions?.push({
                        answer: answerStrings,
                        code: {
                            valueCoding: {
						        system: QUESTIONNAIRE_PLZ_CODING_SYSTEM,
						        code: city.PLZ.toString(),
						        display: city.Ortschaft,
                                extension: [
                                    {
                                        url: QUESTIONNAIRE_CANTON_CODING_SYSTEM,
                                        extension: [
                                            {
                                                url: 'code',
                                                valueCode: city.Kanton
                                            }
                                        ]
                                    }
                                ]
	                        }
                        }
                    });
                })
            } else if(_FHIRItem.type === 'integer' || _FHIRItem.type === 'string') {
                // TODO: really nothing to do here?
            } else {
                // TODO: implement other answerOptions
                console.warn('QuestionnaireData: Currently only AnswerValueSet or integer supported as answerOptions', _FHIRItem);
            }
        }

        return question as IQuestion;
    }

    private linkDependingQuestions(_FHIRItem : QuestionnaireItem, _currentQuestion : IQuestion){
        let dependingQuestions = new Array<{id: string, reference: IQuestion | undefined, answer: any}>();

        if( _FHIRItem.type === QuestionnaireItemType.GROUP && _FHIRItem.item){

            _FHIRItem.item.forEach((item, index)=>{
                dependingQuestions = dependingQuestions.concat(this.linkDependingQuestions(item, _currentQuestion.subItems[index]) );
            });
        }

        // prepare helper array for dependent questions
        if (_FHIRItem.enableWhen) {
            _currentQuestion.isEnabled = false;
            _FHIRItem.enableWhen.forEach((determinator) => {
                if(determinator.answerString || determinator.answerCoding){
                    dependingQuestions.push({
                        id: determinator.question,
                        reference: _currentQuestion,
                        answer: determinator.answerCoding ? {valueCoding: determinator.answerCoding} : {valueString: determinator.answerString}
                    });
                } else {
                    // TODO: implement other types when needed
                    console.warn(`QuestionnaireData.ts: Currently only answerCoding and answerString supported for depending questions (Question ${_FHIRItem.linkId})`);
                }
            });
        }
        return dependingQuestions;
    }

    private hasExtension(_extensionURL: string, _extensionSystem: string, _item: QuestionnaireItem): any {
        let returnValue = undefined;
        _item.extension?.forEach((extension) => {
            if(extension.url === _extensionURL) {
                extension.valueCodeableConcept?.coding?.forEach((coding) => {
                    if(coding.system === _extensionSystem) {
                        returnValue = coding;
                    }
                });
                if(extension.valueDuration?.system === _extensionSystem) {
                    returnValue = extension.valueDuration;
                }
            }
        });
        return returnValue;
    }

    /**
     * Recursively searches for a IQuestion by code.
     * @param _code the code of the IQuestion to find
     * @param _data the (nested) array of IQuestion to search in
     */
    findQuestionByCode(_code: string, _data: IQuestion[]): IQuestion | undefined {
        let result: IQuestion | undefined = undefined;
        _data.forEach((question) => {
            if (!result) {
                if(question.subItems) {
                    result = this.findQuestionByCode(_code, question.subItems);
                } else if(question.code === _code) {
                    result = question;
                }
            }
        });
        return result;
    }

    /**
     * Recursively searches for a IQuestion by ID.
     * @param _id the id of the IQuestion to find
     * @param _data the (nested) array of IQuestion to search in
     */
    findQuestionById(_id: string, _data: IQuestion[]): IQuestion | undefined {
        let result: IQuestion | undefined = undefined;
        _data.forEach((question) => {
            if (!result) {
                if(question.subItems) {
                    result = this.findQuestionById(_id, question.subItems);
                } else if(question.id === _id) {
                    result = question;
                }
            }
        });
        return result;
    }

    private getTranslationsFromExtension(languageExtensions: {extension: Array<{extension: Array<any>}>}): {[language: string]: string} {
        let translations: {[language: string]: string} = {};
        Array.prototype.forEach.call(languageExtensions.extension, (extension) => {
            const languageCode = extension.extension.find((extensionItem: { url: string; valueCode: string }) => extensionItem.url === 'lang').valueCode;
            const content = extension.extension.find((extensionItem: { url: string; valueString: string }) => extensionItem.url === 'content').valueString;
            translations[languageCode] = content;
        });
        return translations;
    }

    private getTranslationsFromDesignation(languageDesignations: any): {[language: string]: string} {
        let translations: {[language: string]: string} = {};
        Array.prototype.forEach.call(languageDesignations, (designation: { language: string; value: string; }) => {
            translations[designation.language] = designation.value;
        })
        return translations;
    }
}
