import React, { Component } from 'react';
import { ScrollView, Platform, Animated, Easing } from 'react-native';
import { View, Text, Button  } from 'native-base';
import AppStyle, {colors, ButtonDimensions, TextSize } from '../styles/App.style';
import { HeaderBanner } from '../components/HeaderBanner'
import Login from '../components/Login';
import { StackNavigationProp } from '@react-navigation/stack';
import MiDataServiceStore from '../store/midataService/model';
import { AppStore } from '../store/reducers';
import { connect } from 'react-redux';
import * as miDataServiceActions from '../store/midataService/actions';
import * as userProfileActions from '../store/userProfile/actions';
import UserProfile from '../model/UserProfile';
import LocalesHelper from '../locales';
import { OAUTH_SERVICE_CONFIG } from '../model/UserSession';
import Config from 'react-native-config';
import { authorize } from 'react-native-app-auth';
import MessageHelper, { ToastType } from '../helpers/MessageHelpers';
import QuestionList from '../components/QuestionList';
import QuestionnaireStore, { QuestionnaireType } from '../model/QuestionnaireDataStore';
import IQuestion from 'app/model/IQuestion';
import { Resource, QuestionnaireItemAnswerOption, ObservationStatus } from '@i4mi/fhir_r4';
import { SCREEN } from '../containers/App';

interface PropsType {
  navigation: StackNavigationProp<any>;
  miDataServiceStore: MiDataServiceStore;
  userProfile: UserProfile;
  localesHelper : LocalesHelper;
  logoutUser: () => void;
  synchronizeResource: (r: Resource) => void;
  authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => void;
  updateUserProfile: (u: Partial<UserProfile>) => void;
  QuestionnaireStore: QuestionnaireStore;
}

interface State {
  isLoginPopupVisible: boolean;
  isPreviouslyLogged: boolean;
  mustUserRelogin: boolean;
}

class Profile extends Component<PropsType, State> {

  constructor(props: PropsType) {
    super(props);
    this.state = {
      isLoginPopupVisible: true,
      isPreviouslyLogged: props.miDataServiceStore.isAuthenticated(),
      mustUserRelogin: false
    };
    this.props.navigation.addListener('focus', this.onScreenFocus.bind(this));
  }

  static getDerivedStateFromProps(props: PropsType, state: State){
    if (state.isPreviouslyLogged && !props.miDataServiceStore.isAuthenticated() && !state.mustUserRelogin) {
      props.navigation.navigate(SCREEN.DASHBOARD);
      state.isLoginPopupVisible = false;
      props.QuestionnaireStore.getQuestionnaire(QuestionnaireType.SITUATION_QUESTIONS).resetResponse();
    }
    state.isPreviouslyLogged = props.miDataServiceStore.isAuthenticated();
    return state;
  }


  async loginUser(){
    // use the client to make the auth request and receive the authState
    try {
      OAUTH_SERVICE_CONFIG.issuer = Config.HOST + '/fhir';
      OAUTH_SERVICE_CONFIG.serviceConfiguration = {
        authorizationEndpoint: Config.HOST + Config.AUTHORIZATION_ENDPOINT,
        tokenEndpoint: Config.HOST + Config.TOKEN_ENDPOINT
      }
      const newAuthState = await authorize(OAUTH_SERVICE_CONFIG); // result includes accessToken, accessTokenExpirationDate and refreshToken

      this.props.authenticateUser(newAuthState.accessToken, newAuthState.accessTokenExpirationDate, newAuthState.refreshToken, Config.HOST);
      } catch (error) {
        console.error("Error while login : " + JSON.stringify(error));
    }
  }

  onScreenFocus() {
    // Screen was focused, our on focus logic goes here
    this.setState({isLoginPopupVisible: true});
  }

  onLoginCancelled() {
    this.setState({isLoginPopupVisible: false});
    this.props.navigation.navigate(SCREEN.DASHBOARD);
  }

  restoreAnswers() {
    // special handling for the age group (LOINC 46251-5)
    if (this.props.userProfile.getAgeGroup().valueRange) {
      const ageGroupItem = this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.SITUATION_QUESTIONS ).findQuestionByCode('46251-5', this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.SITUATION_QUESTIONS ).items);
      if(ageGroupItem) {
        const ageGroupCode = {
          valueString: this.props.userProfile.getAgeGroup().valueRange?.low?.value + ' - ' + this.props.userProfile.getAgeGroup().valueRange?.high?.value
          } as QuestionnaireItemAnswerOption;
        ageGroupItem.answerOptions = [{
          answer: ageGroupItem.label,
          code: ageGroupCode
        }];
        ageGroupItem.selectedAnswers = [ ageGroupCode ];
      }
    }
  }

  saveAsFHIRResource() {
    if (!this.props.miDataServiceStore.isAuthenticated()) {
      this.setState({isLoginPopupVisible: true});
      return;
    }

    const patientReference = this.props.userProfile.getFhirReference();
    const questionnaireResponse = this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.SITUATION_QUESTIONS ).getQuestionnaireResponse(this.props.localesHelper.getCurrentLanguage(), patientReference);

    this.props.synchronizeResource(questionnaireResponse);

    // show a message to the user, with different text depending is the questionnaire is completely answered or not
    var message = this.props.localesHelper.localeString('situation.thankYou');
    if (this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.SITUATION_QUESTIONS ).isResponseComplete()) {
      message += '\n' + this.props.localesHelper.localeString('situation.complete');
    } else {
      message += '\n' + this.props.localesHelper.localeString('situation.incomplete');
    }
    MessageHelper.showToast(message, ToastType.SUCCESS);
  }

  render() {
    if (!this.props.miDataServiceStore.isAuthenticated()) {
      if (Platform.OS === 'ios' && Platform.Version < '11') {
        return this.renderLegacyLogin()
      } else {
        return (
          <View>
            <Login title={this.props.localesHelper.localeString('common.loginPromptTitle')}
                   label={this.props.localesHelper.localeString('common.loginPromptText')}
                   buttonText={this.props.localesHelper.localeString('common.login')}
                   isLoginOpen={this.state.isLoginPopupVisible}
                   onClose={this.onLoginCancelled.bind(this)}
            />
          </View>
        );
      }
    } else {
      return this.renderUserProfile();
    }
  }

  renderLegacyLogin(){
    return (
      <>
        <HeaderBanner title={this.props.localesHelper.localeString('common.loginPromptTitle')}/>
        <View style={{paddingHorizontal:'10%', paddingTop: 20}}>
          <Text style={[AppStyle.textQuestion,{paddingHorizontal:0, textAlign:'center', paddingBottom: 5}]}>
            {this.props.localesHelper.localeString('common.loginPromptText')}
          </Text>
          <Button style={[AppStyle.button]}
                  onPress={this.loginUser.bind(this)}>
            <Text style={[AppStyle.textButton]}>
              {this.props.localesHelper.localeString('common.login')}
            </Text>
          </Button>
        </View>
      </>
    );
  }

  renderUserProfile() {
    if (!this.props.userProfile.isUpToDate() || this.props.userProfile.getAgeGroup().status == ObservationStatus.UNKNOWN) {
      if(!this.props.userProfile.isUpToDate()) {
        this.props.miDataServiceStore.getUserProfile().then((userProfile : UserProfile) => {
          this.props.updateUserProfile( userProfile );
        }).catch((exception) => {
            if(exception.code != MiDataServiceExceptionCodes.NETWORK_ISSUE){
                this.props.logoutUser();
            }
        });
      }

      let spinValue = new Animated.Value(0)

      // define animation for loading logo
      Animated.loop (
        Animated.timing (
          spinValue,
            {
              toValue: 1,
              duration: 1818, // rotate with the speed of a '33 vinyl disc 🕺
              easing: Easing.linear,
              useNativeDriver: true
            }
          )
        ).start()

        // Second interpolate beginning and end values (in this case 0 and 1)
        const spin = spinValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg']
        })

        return (
          <View style={{backgroundColor: colors.primarySemiLight, height: '100%'}}>
            <Animated.Image style={{
                              width: 100,
                              height: 100,
                              marginTop: 150,
                              alignSelf: 'center',
                              transform: [{rotate: (spin)}] }}
                            source={require('../../resources/images/sigle.png')}
            />
            <Text style={[AppStyle.textQuestion, {textAlign: 'center', width: '100%', paddingTop: 50, paddingBottom: 20, paddingHorizontal: '10%'}]}>
              {this.props.localesHelper.localeString('common.loading')}{"..."}
            </Text>
            <Button style={[AppStyle.button, {marginHorizontal: '10%', width: '80%'}]}
                    onPress={this.props.logoutUser}>
              <Text style={[AppStyle.textButton]}>
                {this.props.localesHelper.localeString('common.logout')}
              </Text>
            </Button>
          </View>
        );
    } else {
      this.restoreAnswers();
      return (
        <View style={{backgroundColor: colors.primarySemiLight, height: '100%'}}>
          <HeaderBanner title={this.props.localesHelper.localeString('situation.title')}/>
          <ScrollView style={[AppStyle.contentPadding]} automaticallyAdjustContentInsets={true} keyboardShouldPersistTaps="always">
            {this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.SITUATION_QUESTIONS ).getQuestions().map((questionGroup: IQuestion) => {
              return (
                <View key={questionGroup.id}>
                   <View>
                    <Text style={[AppStyle.sectionTitle, {marginBottom: 10}]}>
                      {questionGroup.label[this.props.localesHelper.currentLang || 'de']}
                    </Text>
                  </View>
                  <View style={{marginBottom: 30}}>
                    <QuestionList questionsData={questionGroup.subItems}
                                  style={{
                                    itemBackground: {
                                      active: colors.white,
                                      inactive: 'transparent'
                                    },
                                    sideBarColor: colors.primarySemiDark }}
                                  accordionOptions= {{
                                    autoSkip: false,
                                    showSideBar: false,
                                    showAnswersInHeader: true,
                                    // TODO expand first item only if empty
                                    // defaultExpandedItem: index === 0 ? 0 : -1
                                    defaultExpandedItem: -1
                                  }}
                    />
                  </View>
                </View>
              );
            })}
            <View style={{flexDirection:'row', justifyContent: 'space-around', marginBottom: 60, marginHorizontal: 20}}>
              { !this.props.miDataServiceStore.isAuthenticated()
                && Platform.OS === 'ios'
                && Platform.Version < '11'
                  ? <>
                      <View style={{flexDirection: 'column', alignItems: 'center'}}>
                        <Text style={[AppStyle.textQuestion, { fontSize: TextSize.very_small - 2, color: colors.black, paddingHorizontal:0, textAlign:'center', paddingTop: 15}]}>
                          {this.props.localesHelper.localeString('common.loginPromptText')}
                        </Text>
                        <Button style={[AppStyle.button, {width: ButtonDimensions.actionButtonWidth, minWidth: 250}]} onPress={this.loginUser}>
                          <Text style={AppStyle.textButton}>
                            {this.props.localesHelper.localeString('common.login')}
                          </Text>
                        </Button>
                      </View>
                    </>
                  : <>
                    <Button style={[AppStyle.button, {width: ButtonDimensions.actionButtonWidth, marginTop: 0}]} onPress={this.saveAsFHIRResource.bind(this)}>
                        <Text style={AppStyle.textButton}>
                          {this.props.localesHelper.localeString('common.save')}
                        </Text>
                      </Button>
                    </>
              }
            </View>
          </ScrollView>
        </View>
      )
    }
  }
}

function mapStateToProps(state: AppStore) {
  return {
    miDataServiceStore: state.MiDataServiceStore,
    userProfile: state.UserProfileStore,
    localesHelper : state.LocalesHelperStore,
    QuestionnaireStore: state.QuestionnaireStore
  };
}

function mapDispatchToProps(dispatch: any) {
  return {
    authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => miDataServiceActions.authenticateUser(dispatch, accessToken, accessTokenExpirationDate, refreshToken, server),
    updateUserProfile: (userProfile: Partial<UserProfile>) => userProfileActions.updateUserProfile(dispatch, userProfile),
    logoutUser: () => miDataServiceActions.logoutUser(dispatch),
    synchronizeResource: (resource : Resource) => miDataServiceActions.synchronizeResource(dispatch, resource)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Profile);
