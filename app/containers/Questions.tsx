import React, { Component } from 'react';
import { ScrollView, YellowBox, Image } from 'react-native';
import { connect } from 'react-redux';
import { View, Text } from 'native-base';
import LocalesHelper from 'app/locales';
import { AppStore } from 'app/store/reducers';
import UserProfile from 'app/model/UserProfile';
import MiDataServiceStore from '../store/midataService/model';
import IQuestion from '../model/IQuestion';
import AppStyle, { colors } from '../styles/App.style';
import QuestionList from '../components/QuestionList';

// this warning is triggered by toast component (by a known issue of native-base)
YellowBox.ignoreWarnings(['Animated: `useNativeDriver` was not specified.']);

interface PropsType {
    questions: IQuestion[] | undefined;
    userProfile: UserProfile;
    miDataServiceStore: MiDataServiceStore;
    localesHelper: LocalesHelper;
}

interface State {
    mustUserRelogin: boolean;
    isPreviouslyLogged: boolean;
}

class Questions extends Component<PropsType, State> {

  constructor(props: PropsType) {
      super(props);

      this.state ={
          mustUserRelogin : false,
          isPreviouslyLogged: props.miDataServiceStore.isAuthenticated()
      };
      // BackHandler.addEventListener('hardwareBackPress', this.navigateBackToSymptoms); // TODO back button for Android
  }

  componentDidUpdate(){
      if(this.props.miDataServiceStore.isAuthenticated() && this.props.userProfile.isUpToDate()) {
        //this.props.onSave()
      }
  }

  // TODO : check -> devrived from logout
  static getDerivedStateFromProps(props : PropsType, state : State){
      state.isPreviouslyLogged = props.miDataServiceStore.isAuthenticated();
      return state;
  }

  render() {
      return (
            <>
                <View style={[AppStyle.contentPadding, {flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10}]}>
                    <Text style={[AppStyle.sectionTitle]}>{this.props.localesHelper.localeString('healthStatus.furtherInfo')}</Text>
                </View>
                <ScrollView
                    alwaysBounceVertical={false}
                    style={[AppStyle.contentPaddingHorizonntal]}
                    contentInsetAdjustmentBehavior="automatic">
                    <View style={{paddingBottom: 60}}>
                      <View style={{flexDirection:'row', marginBottom: '10%'}}>
                        <Image style={{height: 20, width: 20}} source={require('../../resources/images/questions/noAnswer.png')} />
                        <Text style={[AppStyle.textHint, {marginLeft: 10}]}>
                            {this.props.localesHelper.localeString('healthStatus.noAnswer')}
                        </Text>
                      </View>

                      <QuestionList
                        questionsData={this.props.questions}
                        style={{
                            itemBackground: {
                                active: colors.questionBoxBackground,
                                inactive: 'transparent'
                            },
                            sideBarColor: colors.primaryDark
                        }}
                        accordionOptions= {{
                            autoSkip: false,
                            showSideBar: true,
                            showAnswersInHeader: true
                        }}/>
                    </View>
                </ScrollView>
            </>
      );
  };
}

function mapStateToProps(state: AppStore) {
  return {
      miDataServiceStore: state.MiDataServiceStore,
      userProfile: state.UserProfileStore,
      localesHelper: state.LocalesHelperStore,
  };
}

export default connect(mapStateToProps)(Questions);
