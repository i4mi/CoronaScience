/* eslint-disable react/no-multi-comp */
/* eslint-disable react/prefer-stateless-function */
import React from 'react';
import { Text } from 'native-base';
import AppStyle, { colors } from '../styles/App.style';
import {
  TouchableWithoutFeedback,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  StyleSheet
} from 'react-native';
import Dash from 'react-native-dash';
import { IAnswerOption } from 'app/model/IQuestion';

// Margin between expand icon and question text
const marginExpandQuestion = 35;

// Size of the radio buttons used for the answer options (rendered as TouchableOpacity)
const radioButtonRadius = 8;
const radioButtonSize = 2 * radioButtonRadius;

// Corrections needed to avoid a white line in the SideBar between two items.
// This is a little magic, but a smarter solution could not be found until now.
const normalCorrection = -1;
const dashCorrection = -2;

class DefaultHeader extends React.Component {

    renderAnswersByItemType() {
        if (this.props.options.showAnswersInHeader) {
            switch(this.props.content.type) {
                case 'choice': return <ChoiceItemContent properties={this.props} displayInHeader={true} />;
                case 'lookup-choice': return <LookupChoiceItemContent properties={this.props} displayInHeader={true} />;
                case 'string': return <StringItemContent properties={this.props} displayInHeader={true} />;
                case 'integer': return <IntegerItemContent properties={this.props} displayInHeader={true} />;
            }
        } else {
            return <></>;
        }
    }

    render(){
        const {
            expanded,
            content,
            onResponsePress,
            headerStyle,
            options,
            lang,
            toggleItem
          } = this.props;

        return (
            <>
            <View style={{flexDirection:'row', backgroundColor: expanded ? headerStyle.itemBackground.active : headerStyle.itemBackground.inactive}}>
                <View style={{flex: 1, flexDirection:'column'}}>
                    { options.showExpandIcon &&
                        <View>
                            <Image style = {{height: 22, width: 22, position: 'absolute', top: 8, left: 5}}
                               source = { expanded
                                            ? require('../../resources/images/questions/itemExpanded.png')
                                            : require('../../resources/images/questions/itemCollapsed.png')
                                        }
                            />
                        </View>
                    }
                    <View style={{flex:1, padding: 8, paddingTop: 10, marginLeft: options.showExpandIcon ? marginExpandQuestion : 0}}>
                        <Text style={AppStyle.textQuestion}>
                            {content.label[lang]}
                        </Text>
                    </View>
                    { !expanded &&
                        <View style={{padding: 8, paddingTop: 0, marginLeft: options.showExpandIcon ? marginExpandQuestion : 0, marginBottom: options.showDashes ? dashCorrection : normalCorrection}}>
                            {this.renderAnswersByItemType()}
                        </View>
                    }
                </View>
                { options.showSideBar &&
                    <View style={{width: 40, backgroundColor: headerStyle.sideBarColor, marginBottom: options.showDashes ? dashCorrection : normalCorrection}}>
                      {!expanded && !content.readOnly && !content.required &&
                      <TouchableWithoutFeedback
                        onPress={ content.dontWantToAnswer
                                    ? toggleItem
                                    : () => { onResponsePress( content, undefined ); }}>
                        <Image style={styles.noAnswerIcon}
                            source={content.dontWantToAnswer ? require('../../resources/images/questions/noAnswerFilled.png') : require('../../resources/images/questions/noAnswer.png')}
                        />
                      </TouchableWithoutFeedback>
                      }
                    </View>
                }
            </View>
            {!expanded && options.showDashes &&
              <Dash style={{width:'100%'}} dashThickness={1} dashLength={1} dashGap={2}/>
            }
            </>
        )
    }
}

class StringItemContent extends React.Component {

    render() {
        const { content } = this.props.properties;
        if(content.readOnly || this.props.displayInHeader) {
            return (
                <>
                { content.answerOptions.map((answerOption: IAnswerOption, index: number) => {
                    return (
                        <View style={{marginRight: 20}} key={content.id + index}>
                            <Text style={AppStyle.textQuestion}>
                                {answerOption.code.valueString}
                            </Text>
                        </View>
                    )
                })}
                </>
            )
        } else if(!this.props.displayInHeader) {
            return (<></>);
        } else {
            return(<Text>TODO: String Item that is not readonly.</Text>)
        }
    }
}

class LookupChoiceItemContent extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            answerList: props.properties.content.answerOptions,
            inputFieldText: props.properties.content.selectedAnswers.length > 0
                ? props.properties.content.selectedAnswers[0].valueCoding.code + ' ' + props.properties.content.selectedAnswers[0].valueCoding.display
                : ''
        }
    }

    handleTextInput(input: string) {
        const { content, onResponsePress } = this.props.properties;

        if(input === '') {
            content.isInvalid = false;
            onResponsePress(content, undefined);
        } else {
            content.isInvalid = true;
            this.setState({
                answerList: content.answerOptions.filter((answerOption: IAnswerOption) => {
                    return answerOption.answer[Object.keys(answerOption.answer)[0]].toLowerCase().indexOf(input.toLowerCase()) > -1;
                })
            });
        }
        this.setState({inputFieldText: input});
    }

    render() {
        const { content, onResponsePress, invalidAnswerLabel } = this.props.properties;

        if (this.props.displayInHeader) {
            if (content.selectedAnswers[0] && content.selectedAnswers[0].valueCoding) {
                this.state = {
                    inputFieldText: content.selectedAnswers[0]
                        ? content.selectedAnswers[0].valueCoding.code + ' ' + content.selectedAnswers[0].valueCoding.display
                        : ''
                }
                return <Text style={AppStyle.textQuestion}> {content.selectedAnswers[0].valueCoding.code + ' ' + content.selectedAnswers[0].valueCoding.display} </Text>
            } else if (this.state.inputFieldText) {
                return <Text style={AppStyle.textQuestion}> {this.state.inputFieldText} </Text>
            } else if(content.isInvalid === true) {
                return <Text style={[AppStyle.textQuestion, {color: colors.warning}]}>{invalidAnswerLabel}</Text>
            } else {
                return <></>
            }
        } else {
            return (
            <KeyboardAvoidingView style={{width: '100%'}} behavior="position">
                <TextInput
                    style={{ fontFamily: AppStyle.textQuestion.fontFamily, borderColor: colors.mediumGray, borderWidth: 1, width: '100%', padding: 5, marginBottom: 10}}
                    onChangeText={this.handleTextInput.bind(this)}
                    multiline={false}
                    autoCompleteType="postal-code"
                    autoCorrect={false}
                    placeholder={this.state.inputFieldText.toString()}
                    autoFocus={true}
                    value={this.state.inputFieldText}
                    clearButtonMode="while-editing"
                    keyboardType="numbers-and-punctuation"
                />
                {  this.state.answerList.length < 20 &&
                    this.state.answerList.map((item, index) => {
                        return (
                            <TouchableWithoutFeedback
                                key={'proposal'+ index}
                                onPress={() => {
                                    this.setState({
                                        answerList: content.answerOptions,
                                        inputFieldText: item.answer[Object.keys(item.answer)[0]]
                                    });
                                    content.isInvalid = false,
                                    onResponsePress( content, item )
                                }}>
                                <Text style={[AppStyle.textQuestion, {marginLeft: 3, height: 25}]}>
                                    {item.answer[Object.keys(item.answer)[0]]}
                                </Text>
                            </TouchableWithoutFeedback>
                        )
                    })
                }
            </KeyboardAvoidingView>
        )
        }
    }
}

class ChoiceItemContent extends React.Component {

    getAnswerOptionBackgroundColor(isSelected: boolean): string {
        return isSelected ? colors.primaryNormal : colors.white;
    }

    render() {
        const { content, lang, onResponsePress, displayNextQuestion, isLast, options, toggleItem, multipleChoiceLabel } = this.props.properties;
        return (
            <View style={{flexDirection: 'column'}}>
                { content.allowsMultipleAnswers && !this.props.displayInHeader &&
                    <Text style={[AppStyle.textHint, {marginBottom: 10}]}>
                        {multipleChoiceLabel}
                    </Text>
                }
                {content.answerOptions.length <= 2
                ?   ( // only two answer options
                    <View style={{flexDirection: 'row'}}>
                        {content.answerOptions.map((answerOption: IAnswerOption, index: number) => {
                            const isSelected = content.selectedAnswers.indexOf(answerOption.code) >= 0;
                            return (
                                <View key={content.id + index}>
                                    { (isSelected || !this.props.displayInHeader) &&
                                        <View style={{flexDirection: 'row', marginRight: 20}}>
                                            <TouchableOpacity style={[styles.radioButton, {
                                                backgroundColor: this.getAnswerOptionBackgroundColor(isSelected),
                                                marginVertical: 2
                                                }]}
                                                onPress={ this.props.displayInHeader
                                                        ? toggleItem
                                                        : () => { onResponsePress( content, answerOption ); !isLast ? displayNextQuestion() : {} }}
                                                activeOpacity={1}
                                                hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
                                            />
                                            <Text style={AppStyle.textQuestion}
                                                onPress={this.props.displayInHeader
                                                        ? toggleItem
                                                        : () => { onResponsePress( content, answerOption ); !isLast ? displayNextQuestion() : {} }}>
                                                {answerOption.answer[lang]}
                                            </Text>
                                        </View>
                                    }
                                </View>
                            );
                        })}
                    </View>
                    )
                : ( content.answerOptions[0].disableOtherAnswers
                    ? ( // more than to answer options, with disable others
                        <>
                            {/* TODO Option showMultipleChoiceInTwoColumns=true does not work anymore, answers are not shown on two columns*/ }
                            { options.showMultipleChoiceInTwoColumns && !this.props.displayInHeader &&
                                <View style={{flex:1}}>
                                    <View style={{flexDirection: 'row', marginRight: 20}}>
                                        <TouchableOpacity style={[styles.radioButton, {
                                            backgroundColor: this.getAnswerOptionBackgroundColor(content.selectedAnswers.indexOf(content.answerOptions[0].code) >= 0),
                                            marginVertical: 5
                                            }]}
                                            activeOpacity={1}
                                            onPress={this.props.displayInHeader
                                                    ? toggleItem
                                                    :() => { onResponsePress( content, content.answerOptions[0] ); !isLast ? displayNextQuestion() : {} }}
                                            hitSlop={{top: 5, bottom: 5, left: 5, right: 5}}
                                        />
                                        <Text style={[AppStyle.textQuestion, {paddingVertical: 3}]}
                                            onPress={this.props.displayInHeader
                                                    ? toggleItem
                                                    :() => { onResponsePress( content, content.answerOptions[0] ); !isLast ? displayNextQuestion() : {} }}>
                                            {content.answerOptions[0].answer[lang]}
                                        </Text>
                                    </View>
                                </View>
                            }
                            <View style={{flex:2}}>
                              {
                              content.answerOptions.slice(options.showMultipleChoiceInTwoColumns ? 1 : 0).map((answerOption: IAnswerOption, index: number) => {
                                  const isSelected = content.selectedAnswers.indexOf(answerOption.code) >= 0;
                                  return (
                                        <View key={content.id + index}>
                                            { (isSelected || (!this.props.displayInHeader)) &&
                                                <View style={{flexDirection: 'row', marginRight: 20}} >
                                                    <TouchableOpacity style={[styles.radioButton, {
                                                        backgroundColor: this.getAnswerOptionBackgroundColor(isSelected),
                                                        marginVertical: 5
                                                        }]}
                                                        activeOpacity={1}
                                                        onPress={this.props.displayInHeader
                                                                ? toggleItem
                                                                :() => { onResponsePress( content, answerOption ); !isLast && !content.allowsMultipleAnswers ? displayNextQuestion() : {} }}
                                                        hitSlop={{top: 5, bottom: 5, left: 5, right: 5}}
                                                    />
                                                    <Text style={[AppStyle.textQuestion, {paddingVertical: 3}]}
                                                        onPress={this.props.displayInHeader
                                                                ? toggleItem
                                                                :() => { onResponsePress( content, answerOption ); !isLast && !content.allowsMultipleAnswers ? displayNextQuestion() : {} }}>
                                                        {answerOption.answer[lang]}
                                                    </Text>
                                                </View>
                                          }
                                        </View>
                                  );
                              })}
                            </View>
                        </>)
                    : ( // more than two answer options, without disable others
                        <View>
                          {
                          content.answerOptions.map((answerOption: IAnswerOption, index: number) => {
                              const isSelected = content.selectedAnswers.indexOf(answerOption.code) >= 0;
                              return (<View key={content.id + index}>
                                    { (isSelected || !this.props.displayInHeader) &&
                                        <View style={{flexDirection: 'row', marginRight: 20}}>
                                            <TouchableOpacity style={[styles.radioButton, {
                                                backgroundColor: this.getAnswerOptionBackgroundColor(isSelected),
                                                marginVertical: 5
                                                }]}
                                                activeOpacity={1}
                                                onPress={this.props.displayInHeader
                                                        ? toggleItem
                                                        :() => { onResponsePress( content, answerOption ); !isLast ? displayNextQuestion() : {} }}
                                                hitSlop={{top: 5, bottom: 5, left: 5, right: 5}}
                                            />
                                            <Text style={[AppStyle.textQuestion, {paddingVertical: 3}]}
                                                onPress={this.props.displayInHeader
                                                        ? toggleItem
                                                        :() => { onResponsePress( content, answerOption ); !isLast ? displayNextQuestion() : {} }}>
                                                {answerOption.answer[lang]}
                                            </Text>
                                        </View>
                                    }
                                </View>
                              );
                          })}
                        </View>
                    )
                )}
            </View>
        )
    }
}

class IntegerItemContent extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            inputFieldText: props.properties.content.selectedAnswers[0]
                ? props.properties.content.selectedAnswers[0].valueInteger
                : ''
        }
    }

    render() {
        const { content, lang, onResponsePress, index, invalidAnswerLabel } = this.props.properties;

        // do quick input validation
        content.isInvalid = Number.isNaN(this.state.inputFieldText);

        if (this.props.displayInHeader) {
            if (content.selectedAnswers[0] && content.selectedAnswers[0].valueInteger) {
                this.state = {
                    inputFieldText: content.selectedAnswers[0]
                        ? content.selectedAnswers[0].valueInteger
                        : ''
                }
                return (
                    <View style={{marginRight: 20}} key={content.id + index}>
                        <Text style={AppStyle.textQuestion}>
                            {content.selectedAnswers[0].valueInteger}
                        </Text>
                    </View>
                )
            } else if (this.state.inputFieldText) {
                return (
                    <View style={{marginRight: 20}} key={content.id + index}>
                        <Text style={AppStyle.textQuestion}>
                            {this.state.inputFieldText}
                        </Text>
                    </View>
                )
            } else if(content.isInvalid === true) {
                return <Text style={[AppStyle.textQuestion, {color: colors.warning}]}>{invalidAnswerLabel}</Text>
            } else {
                return <></>
            }
        } else {
            return(
                <KeyboardAvoidingView style={{width: '100%'}} behavior="position">
                    <TextInput
                        style={{ fontFamily: AppStyle.textQuestion.fontFamily, borderColor: colors.mediumGray, borderWidth: 1, width: '100%', padding: 5, marginBottom: 10}}
                        onChangeText={input => {
                                let _answer: {[language: string]: string} = {};
                                _answer[lang] = input;
                                onResponsePress(content, {
                                    answer:  _answer,
                                    code: {valueInteger: Number(input)}
                                });
                        }}
                        multiline={false}
                        autoCorrect={false}
                        autoFocus={true}
                        placeholder={this.state.inputFieldText ? this.state.inputFieldText.toString() : ''}
                        defaultValue={this.state.inputFieldText ? this.state.inputFieldText.toString() : ''}
                        clearButtonMode="while-editing"
                        keyboardType="number-pad"
                    />
                </KeyboardAvoidingView>
            )
        }
    }
}

class DefaultContent extends React.Component {

    renderItemType() {
        switch(this.props.content.type) {
            case 'choice': return <ChoiceItemContent properties={this.props} />;
            case 'lookup-choice': return <LookupChoiceItemContent properties={this.props} />;
            case 'string': return <StringItemContent properties={this.props} />;
            case 'integer': return <IntegerItemContent properties={this.props} />;
        }
    }

    render() {
        const { content, contentStyle, onResponsePress, displayNextQuestion, isLast, options } = this.props;

        return (
            <>
                <View style={{flexDirection:'row', backgroundColor: contentStyle.itemBackground.active, paddingLeft: options.showExpandIcon ? marginExpandQuestion : 0, marginBottom: options.showDashes ? dashCorrection : normalCorrection}}>
                    <View style={{flex:1, padding: 8, paddingTop: 0, flexDirection:'row'}}>
                        {this.renderItemType()}
                    </View>
                    { options.showSideBar &&
                        <View style={{width: 40, backgroundColor: contentStyle.sideBarColor}}>
                            { !content.readOnly && !content.required &&
                                <TouchableWithoutFeedback
                                    onPress={() => {
                                        onResponsePress( content, undefined );
                                        !isLast ? displayNextQuestion() : {} }}>
                                        <Image style={styles.noAnswerIcon}
                                            source={content.dontWantToAnswer ? require('../../resources/images/questions/noAnswerFilled.png') : require('../../resources/images/questions/noAnswer.png')}                                            
                                        />
                                </TouchableWithoutFeedback>
                            }
                        </View>
                    }
                </View>
                {options.showDashes && <Dash style={{width:'100%'}} dashThickness={1} dashLength={1} dashGap={2}/>}
            </>
        );
    }
}

class AccordionSubItem extends React.Component {

  render() {
    const { children } = this.props;
    return (
      <View >
        {children}
      </View>
    );
  }
}

class AccordionItem extends React.Component {
  toggleItem(){
      if(this.props.options.forceExpandItem == undefined) {// when we force expand from parent component, we don't want to expand by clicking on header
          this.props.onAccordionOpen && !this.props.expanded && this.props.onAccordionOpen(this.props.item, this.props.index);
          this.props.onAccordionClose && this.props.expanded && this.props.onAccordionClose(this.props.item, this.props.index);
          this.props.setSelected(this.props.index);
      }
      if(this.props.onItemHeaderPress !== undefined) {
          // when parent is listening to onItemHeaderPress, trigger this function
          this.props.onItemHeaderPress(this.props.index, this.props.expanded);
      }

  }

  render() {
    const {
      contentStyle,
      expanded,
      expandedIcon,
      expandedIconStyle,
      icon,
      iconStyle,
      index,
      item,
      onAccordionClose,
      onAccordionOpen,
      renderContent,
      renderHeader,
      setSelected,
      lang,
      onResponsePress,
      displayNextQuestion,
      isLast,
      options,
      multipleChoiceLabel,
      invalidAnswerLabel
    } = this.props;

    return (
      <>
        <TouchableWithoutFeedback
          onPress={this.toggleItem.bind(this)}
        >
          <View>
              <DefaultHeader
                expanded={expanded}
                toggleItem={this.toggleItem.bind(this)}
                icon={icon}
                options={options}
                content={item}
                lang={lang}
                onResponsePress={onResponsePress}
                headerStyle={contentStyle}
                invalidAnswerLabel={invalidAnswerLabel}
              />
          </View>
        </TouchableWithoutFeedback>
        {expanded ? (
          <AccordionSubItem>
              <DefaultContent
                content={item}
                options={options}
                contentStyle={contentStyle}
                lang={lang}
                onResponsePress={onResponsePress}
                displayNextQuestion={displayNextQuestion}
                isLast={isLast}
                index={index}
                multipleChoiceLabel={multipleChoiceLabel}
                invalidAnswerLabel={invalidAnswerLabel}
              />
          </AccordionSubItem>
        ) : null}
      </>
    );
  }
}

export class QuestionnaireAccordion extends React.Component {
    waitingToSkip = false;
  constructor(props) {
    super(props);
    this.state = {
      selected: props.expanded
    };
  }

  displayNextQuestion(){
    if(!this.waitingToSkip) {
        this.waitingToSkip = true;
        setTimeout(() => {
            if(this.props.options.autoSkip){
                this.setState({
                    selected: this.state.selected + 1,
                });
                this.waitingToSkip = false;
            }
        }, 500);
    }
  }

  setSelected(index) {
    if (this.state.selected === index) {
      this.setState({ selected: undefined });
    } else {
      this.setState({ selected: index });
    }
  }

  render() {
    const {
      contentStyle,
      dataArray,
      expandedIcon,
      expandedIconStyle,
      headerStyle,
      icon,
      iconStyle,
      onAccordionClose,
      onAccordionOpen,
      lang,
      onResponsePress,
      onItemHeaderPress,
      options,
      multipleChoiceLabel,
      invalidAnswerLabel
    } = this.props;

    return (
      <>
      {options.showDashes && <Dash style={{width:'100%'}} dashThickness={1} dashLength={1} dashGap={2}/>}
      { dataArray.map((item: any, index: number) => {
          return (
              <AccordionItem
                key={String(index)}
                contentStyle={contentStyle}
                options={options}
                expanded={(this.state.selected === index || (options.forceExpandItem >= 0 && options.forceExpandItem === index))}
                expandedIcon={expandedIcon}
                expandedIconStyle={expandedIconStyle}
                headerStyle={headerStyle}
                icon={icon}
                iconStyle={iconStyle}
                index={index}
                item={item}
                onItemHeaderPress={onItemHeaderPress}
                onAccordionOpen={onAccordionOpen}
                onAccordionClose={onAccordionClose}
                setSelected={(i: any) => this.setSelected(i)}
                lang={lang}
                onResponsePress={onResponsePress}
                displayNextQuestion={this.displayNextQuestion.bind(this)}
                isLast={index + 1 >= dataArray.length}
                multipleChoiceLabel={multipleChoiceLabel}
                invalidAnswerLabel={invalidAnswerLabel}
              />
          )
      })}
      </>
    );
  }
}

const styles = StyleSheet.create({
    radioButton: {
        width: radioButtonSize,
        height: radioButtonSize,
        borderColor: colors.black,
        borderRadius: radioButtonRadius,
        borderWidth: 1,
        alignSelf: 'baseline',
        marginRight: 5
    },
    noAnswerIcon: {
        height: 25,
        width: 25,
        position: 'absolute',
        bottom: 7.5,
        left: 7.5
    }
});
