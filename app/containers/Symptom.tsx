import React, { Component } from 'react';
import { TouchableOpacity, Image, FlatList } from 'react-native';
import { View, Text } from 'native-base';
import { connect } from 'react-redux';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Dash from 'react-native-dash';
import moment from 'moment';
import { AppStore } from '../store/reducers';
import LabeledSlider from '../components/LabeledSlider'
import BubbleSymptom from '../components/BubbleSymptom';
import AppStyle, { colors, TextSize } from '../styles/App.style';
import LocalesHelper from '../locales';

interface PropsType {
    localesHelper: LocalesHelper;
    onSymptomsDateChange: (_date : Date) => void;
    symptomsData : any;
    symptomsDate : Date
}

interface State {
    isDatePickerVisible : boolean,
}

class Symptom extends Component<PropsType, State> {

    constructor(props: PropsType) {
        super(props);
        this.state = {
            isDatePickerVisible : false,
        };
    }

    updateSymptonValue( _symptom : any, _value : any){
        this.props.symptomsData.filter(function (symptom) {
            return symptom === _symptom;
        }).map( (symptom) => {
            symptom.value = _value;
        });

        this.forceUpdate();
    }

    enableSymptom( _symptom : any, _isEnabled : any){
        this.props.symptomsData.filter(function (symptom) {
            return symptom === _symptom;
        }).map( (symptom) => {
            symptom.enabled = _isEnabled;
        });

        this.forceUpdate();
    }

    renderSliderSymptom( _symptom : any ){
        let possibleResponses = [
            {
                "isFirst" : true,
                "isLast" : false,
                "onPressValue": false,
                "translation" : "common.no"
            },
            {
                "isFirst" : false,
                "isLast" : true,
                "onPressValue": true,
                "translation" : "common.yes"
            }
        ];

        return(
            <View key={_symptom.translationKey}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: AppStyle.button.marginTop}}>
                        <Text style={[AppStyle.textQuestion, {flex: 1.5}]}>
                            {this.props.localesHelper.localeString('healthStatus.symptoms.' + _symptom.translationKey )}
                        </Text>
                        <View style={{flex: 1, flexDirection: 'row', justifyContent: 'flex-end'}}>
                        {
                            possibleResponses.map((possibleResponse) => {
                                return (
                                    <View style={{flexDirection: 'row', justifyContent: 'flex-end', marginLeft: 20}} key={possibleResponse.translation}>
                                        <TouchableOpacity   style={{
                                                                width: 10 * 2,
                                                                height: 10 * 2,
                                                                borderRadius: 10,
                                                                borderColor: colors.black,
                                                                borderWidth: 1.2,
                                                                backgroundColor: _symptom.enabled === possibleResponse.onPressValue ? colors.secondaryNormal : 'transparent',
                                                                alignSelf: 'baseline',
                                                                marginRight: 5
                                                            }}
                                                            onPress={() => { this.enableSymptom( _symptom, possibleResponse.onPressValue ) }}
                                                            activeOpacity={1}
                                                            hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}/>
                                        <Text style={AppStyle.textQuestion}>
                                            {this.props.localesHelper.localeString(possibleResponse.translation)}
                                        </Text>
                                    </View>

                                );
                            })
                        }
                        </View>
                    </View>
                </View>
                {_symptom.enabled &&
                    <LabeledSlider minimum={_symptom.sliderOption.minimum} maximum={_symptom.sliderOption.maximum} unit="°C" value={_symptom.value} onValueChanged={temperature => this.updateSymptonValue(_symptom, temperature)}/>
                }
                <Dash style={{width:'100%', marginTop: 2}} dashThickness={1} dashLength={1} dashGap={2}/>
            </View>
        )
    }

    renderQualifierValueSymptom( symptom : any ){
        let mPossibleResponses = new Array<{"value": string, "isSelected": boolean}>();

        Array.prototype.forEach.call(symptom.item.possibleResponses, (possibleResponse) => {
            let bool = false;
            if(symptom.item.value === possibleResponse || possibleResponse.default)
                bool = true;

            mPossibleResponses.push({"value": possibleResponse, "isSelected": bool})
        });

        return (
                <BubbleSymptom label={this.props.localesHelper.localeString('healthStatus.symptoms.' + symptom.item.translationKey)}
                                possibleResponses={mPossibleResponses}
                                onValueChange={(value) => { this.updateSymptonValue( symptom.item, value ) }}
                />
        );
    }

    render() {
        return (
          <>
            <View style={[AppStyle.contentPadding, {flexDirection: 'row', justifyContent: 'space-between', marginBottom: '5%'}]}>
                <Text style={[AppStyle.sectionTitle]}>
                    {this.props.localesHelper.localeString('healthStatus.symptoms.symptoms')}
                </Text>
                <TouchableOpacity
                    style={{flexDirection: 'row', top:6}}
                    hitSlop={{top: 20, bottom: 10, left: 50, right: 30}}
                    activeOpacity={1}
                    onPress={() => this.setState({isDatePickerVisible: true})}>
                    <Text style={[AppStyle.textQuestion,{fontSize: TextSize.very_small - 2}]}>
                        {moment(this.props.symptomsDate).format('lll')}
                    </Text>
                    <Image source={require('../../resources/images/healthStatus/editDate.png')} style={{width: 20, height: 20, marginTop: -2, marginLeft: 8}} />
                </TouchableOpacity>
            </View>
            <FlatList
                style={[AppStyle.contentPaddingHorizonntal]}
                keyExtractor={(item) => item.translationKey}
                alwaysBounceVertical={false} // disables scroll-bounce when content fits on screen
                ListHeaderComponent={
                  <>
                    {this.props.symptomsData.filter(function (symptom) {
                            return symptom.answerType === 'slider';
                        }).map( (symptom : any) => {
                            return this.renderSliderSymptom(symptom);
                        })
                    }
                  </>
                }
                data={this.props.symptomsData.filter(function (symptom) {
                                          return symptom.answerType === 'qualifierValue';
                                      })}
                renderItem={this.renderQualifierValueSymptom.bind(this)}
                ListFooterComponent={
                    <View style={{marginVertical: 40}}></View>
                }
            />
            <DateTimePickerModal
              isVisible={this.state.isDatePickerVisible}
              headerTextIOS=''
              cancelTextIOS={this.props.localesHelper.localeString('common.cancel')}
              confirmTextIOS={this.props.localesHelper.localeString('common.ok')}
              locale={this.props.localesHelper.getCurrentLanguage()}
              maximumDate={new Date}
              date={this.props.symptomsDate}
              mode="datetime"
              minuteInterval={1}
              onConfirm={date => {this.setState({isDatePickerVisible: false}); this.props.onSymptomsDateChange(date)}}
              onCancel={() => this.setState({isDatePickerVisible: false})}
            />
        </>
      );
    };
}

function mapStateToProps(state: AppStore) {
    return {
        localesHelper: state.LocalesHelperStore,
        QuestionnaireStore: state.QuestionnaireStore
    };
}

export default connect(mapStateToProps)(Symptom);
