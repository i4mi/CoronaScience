import React, { Component } from 'react';
import { connect } from 'react-redux';
import { AppStore } from 'app/store/reducers';
import LocalesHelper  from '../locales';
import IQuestion, { IAnswerOption } from 'app/model/IQuestion';
import {QuestionnaireAccordion} from './QuestionnaireAccordion'


export interface QuestionListStyle {
    itemBackground: {
        active: string,
        inactive: string
    }
    sideBarColor: string
}

/**
 * @param data  the data array with all the questions to be displayed
 **/
interface PropsType {
    questionsData: IQuestion[] | undefined;
    localesHelper: LocalesHelper;
    style: QuestionListStyle;
    onItemHeaderPress?: (item: number, isExpanded: number) => void;
    accordionOptions: {
        // should the accordion skip to the next question when an answer is given? (default: false)
        autoSkip?: boolean,
        // should the sidebar with mouth icon be displayed? (default: true)
        showSideBar?: boolean,
        // should the selected answers be displayed in the header, when question is collapsed? (default: false)
        showAnswersInHeader?: boolean,
        // should multiple choice answers with unselect-others element be displayed in two colums (default: false)
        showMultipleChoiceInTwoColumns?: boolean,
        // should the expand / collapsed icon on the left side be displayed? (default: true)
        showExpandIcon?: boolean,
        // which item should be expanded when the accordion is first shown (-1 for no expanded item) (default: 0)
        defaultExpandedItem?: number,
        // should the dashes between the items be displayed or not (default: true)
        showDashes?: boolean,
        // expands a given item and disables item expansion by clicking its header. set to -1 to force close all items,
        // set to undefined for normal expand behaviour (default: undefined)
        forceExpandItem?: number
    };
}

/**
 * QuestionList renders a list of Questions as specified in an array
 */
class QuestionList extends Component<PropsType> {

    constructor(props: PropsType) {
        super(props);
    }

    /**
     * Updates the selected answer(s) of a question: adds the answer if it's not already selected
     * and removes it, if it was selected.
     * @param _question     the IQuestion to which the answer belongs
     * @param _answer       the selected / unselected QuestionnaireItemAnswerOption
     **/
    updateQuestionAnswers(_question: IQuestion, _answer: IAnswerOption | undefined): void {
        if(_answer === undefined
           || (_question.type === 'integer' && _answer.code.valueInteger == '')
           || (_question.type === 'string' && _answer.code.valueString == '')) {
            _question.dontWantToAnswer = true;
            this.resetQuestionAnswers(_question);
            return;
        }

        _question.dontWantToAnswer = false;

        const indexOfAnswer = _question.selectedAnswers.indexOf(_answer.code);
        if (_question.allowsMultipleAnswers) {
            // check if item is already selected
            if (indexOfAnswer >= 0) { // answer is already selected
                _question.selectedAnswers.splice(indexOfAnswer,1) // remove answer
            } else {
                // if not already selected, we select it now
                _question.selectedAnswers.push(_answer.code);

                // and disable other answers when necessary
                if(_answer.disableOtherAnswers) {
                    _answer.disableOtherAnswers.forEach((otherAnswer) => {
                        const indexOfOtherAnswer = _question.selectedAnswers.findIndex(( selectedAnswer ) => {
                            return selectedAnswer.valueCoding.code === otherAnswer
                        });
                        if (indexOfOtherAnswer >= 0) { // otherAnswer is selected
                            _question.selectedAnswers.splice(indexOfOtherAnswer,1) // remove otherAnswer)
                        } // no else needed, because we don't have to unselect already unselected answers
                    })
                }
            }
        } else {
            if (indexOfAnswer < 0) {
                _question.selectedAnswers[0] = _answer.code;
            }
        }

        // update depending questions
        _question.dependingQuestions.forEach((dependingQuestion) => {
            if(dependingQuestion.answer.valueCoding?.code === _answer.code.valueCoding?.code && indexOfAnswer < 0) {
                dependingQuestion.dependingQuestion.isEnabled = true;
            } else {
                dependingQuestion.dependingQuestion.isEnabled = false;
            }
        });

        this.forceUpdate();
    }

    /**
     * Resets all the selected answers of a IQuestion.
     **/
    resetQuestionAnswers(_question: IQuestion) {
        _question.selectedAnswers.splice(0,_question.selectedAnswers.length);
        _question.dependingQuestions.forEach((dependingQuestion) => {
            dependingQuestion.dependingQuestion.isEnabled = false;

        });
        this.forceUpdate();
    }

    render() {
        const accordionOptions =
        {
            autoSkip: this.props.accordionOptions?.hasOwnProperty('autoSkip') ? this.props.accordionOptions.autoSkip : false,
            showSideBar: this.props.accordionOptions?.hasOwnProperty('showSideBar') ? this.props.accordionOptions.showSideBar : true,
            showAnswersInHeader: this.props.accordionOptions?.hasOwnProperty('showAnswersInHeader') ? this.props.accordionOptions.showAnswersInHeader : false,
            showMultipleChoiceInTwoColumns: this.props.accordionOptions?.hasOwnProperty('showMultipleChoiceInTwoColumns') ? this.props.accordionOptions.showMultipleChoiceInTwoColumns : false,
            showExpandIcon: this.props.accordionOptions?.hasOwnProperty('showExpandIcon') ? this.props.accordionOptions.showExpandIcon : true,
            showDashes: this.props.accordionOptions?.hasOwnProperty('showDashes') ? this.props.accordionOptions.showDashes : true,
            forceExpandItem: this.props.accordionOptions.forceExpandItem
        }
        return (
            <QuestionnaireAccordion dataArray={this.props.questionsData?.filter((question) => { return question.isEnabled })}
                        contentStyle={this.props.style}
                        options={accordionOptions}
                        lang={this.props.localesHelper.getCurrentLanguage()}
                        onResponsePress={this.updateQuestionAnswers.bind(this)}
                        onItemHeaderPress={this.props.onItemHeaderPress}
                        multipleChoiceLabel={this.props.localesHelper.localeString('common.multipleChoice')}
                        invalidAnswerLabel={this.props.localesHelper.localeString('common.invalidAnswer')}
                        expanded={this.props.accordionOptions?.hasOwnProperty('defaultExpandedItem')
                                                                    ? this.props.accordionOptions.defaultExpandedItem && this.props.accordionOptions.defaultExpandedItem < 0
                                                                        ? undefined
                                                                        : this.props.accordionOptions.defaultExpandedItem
                                                                    : 0}
            />
        );
    }
}

function mapStateToProps(state: AppStore) {
  return {
      localesHelper: state.LocalesHelperStore
  };
}

function mapDispatchToProps(dispatch: any) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(QuestionList);
