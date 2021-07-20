import React, { Component } from 'react';
import { Image, StyleSheet, Dimensions, Platform, StatusBar, ImageSourcePropType, TouchableOpacity, DeviceEventEmitter, TouchableWithoutFeedback } from 'react-native';
import { connect } from 'react-redux';
import { View, Text, Button } from 'native-base';
import Icon from 'react-native-vector-icons/AntDesign';
import Config from 'react-native-config';
import { StackNavigationProp } from '@react-navigation/stack';
import BackgroundTimer from 'react-native-background-timer';
import AsyncStorage from '@react-native-community/async-storage';
import remoteConfig, { FirebaseRemoteConfigTypes } from '@react-native-firebase/remote-config';
import { ScrollView } from 'react-native-gesture-handler';
import notifee, { EventType } from '@notifee/react-native';
import moment from 'moment';
import { Bundle, Resource } from "@i4mi/fhir_r4";
import { BlurView } from "@react-native-community/blur";
import RNBootSplash from 'react-native-bootsplash';
import { authorize } from 'react-native-app-auth';
import Share from 'react-native-share';
import QuickActions from "react-native-quick-actions";
import LocalesHelper from '../locales';
import { AppStore } from '../store/reducers';
import Twitter from '../components/Twitter';
import InfoCard from '../components/InfoCard';
import Login from '../components/Login';
import QuestionList from '../components/QuestionList';
import * as statDataActions from '../store/statData/actions';
import * as questionnaireServiceActions from '../store/questionnaire/actions';
import * as miDataServiceActions from '../store/midataService/actions';
import * as userProfileActions from '../store/userProfile/actions';
import * as MIDATAServiceActions from '../store/midataService/actions';
import { UpdateStatData } from '../store/statData/reducer';
import MiDataServiceStore, { MiDataServiceExceptionCodes } from '../store/midataService/model';
import StatData from '../model/StatData'
import QuestionnaireData from '../model/QuestionnaireData';
import { QuestionnaireType } from '../model/QuestionnaireDataStore';
import QuestionnaireStore from '../model/QuestionnaireDataStore';
import UserProfile from '../model/UserProfile';
import UrlHelper from '../helpers/UrlHelpers';
import MessageHelper, { ToastType } from '../helpers/MessageHelpers';
import AppStyle, { colors, moderateScale, scale, AppFonts, ButtonDimensions, TextSize } from '../styles/App.style';
import { OAUTH_SERVICE_CONFIG } from '../model/UserSession';
import { SOCIAL_MEDIA } from '../../resources/static/socialMedia';
import { NOTIFICATION_ACTION, SCREEN, STORAGE } from '../containers/App';

export const QUESTIONNAIRES_TO_CHECK = [{
  "context-type-value" : "recurring-questions",
  "type" : QuestionnaireType.RECURRING_QUESTIONS
},{
  "context-type-value" : QuestionnaireType.SITUATION_QUESTIONS,
  "type" : QuestionnaireType.SITUATION_QUESTIONS
},{
  "context-type-value" : "question-of-the-day",
  "type" : QuestionnaireType.QUESTION_OF_THE_DAY
}];

const ICON_PATH = '../../resources/images/dashboard/';
const TIMER_TRIGGER_UPDATE_INTERVAL = 179999; // in ms (!) maximum amount of time for the timer is 3 minutes -> https://github.com/ocetnik/react-native-background-timer/issues/68
const COUNTERS_UPDATE_INTERVAL = 15; // in [m]inutes - delay before counters are updated
const QUESTIONNAIRES_UPDATE_INTERVAL = 60; // in [m]inutes - delay before questionnaires are updated

let counterUpdateCountersInterval : number = 5;
let counterUpdateQuestionnairesInterval : number = 20;

interface PropsType {
  navigation: StackNavigationProp<any>;
  localesHelper : LocalesHelper;
  miDataServiceStore: MiDataServiceStore;
  questionnaireStore: QuestionnaireStore;
  userProfile: UserProfile;
  statDataStore : StatData;
  updateStatData: (newData: UpdateStatData) => void;
  addQuestionnaire: (newData: QuestionnaireData) => void;
  uploadPendingResources: () => void;
  pendingResources: Array<Resource>;
  updateUserProfile: (u: Partial<UserProfile>) => void;
  authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => void;
  logoutUser: () => void;
  addResource: (r: Resource) => void;
}

interface State {
  isTwitterDisplayed: boolean;
  twitterBearer: string;
  twitterAccountToFollow: string;
  minimumParticipantToDisplayCard: number;
  minimumDataSetToDisplayCard: number;
  previousPendingResource: number;
  isQuestionOfTheDayUnanswered: boolean;
  isQuestionOfTheDayExpanded: boolean;
  pendingSaveData: boolean;
  isRegisterPopupVisible: boolean;
  totalCollectedData : number;
  totalUser: number;
}

class Dashboard extends Component<PropsType, State> {
  navigation = this.props.navigation;
  windowWidth = Dimensions.get('window').width;

  // The style AppStyle.pagePading ('6%') cannot be used on the dashboard, because we are doing some math furhter in the code
  pagePadingLeft = 0.06*this.windowWidth;
  pagePadingRight = this.pagePadingLeft;

  constructor(props: PropsType) {
    super(props);

    this.state = {
      isTwitterDisplayed : false,
      twitterBearer: Config.TWITTER_BEARER,
      twitterAccountToFollow: Config.TWITTER_ACCOUNT_TO_FOLLOW,
      minimumParticipantToDisplayCard: 2000,
      minimumDataSetToDisplayCard: 2000,
      previousPendingResource: 0,
      isQuestionOfTheDayExpanded: false,
      isQuestionOfTheDayUnanswered: true,
      isRegisterPopupVisible: false,
      pendingSaveData: false,
      totalCollectedData: this.props.statDataStore.getTotalCollectedData(),
      totalUser: this.props.statDataStore.getTotalUser()
    }

    // status bar stuff that only matters on android
    if (Platform.OS === 'android') {
      // when we change to homescreen, we have to use the light gray statusbar
      this.props.navigation.addListener('focus', () => {
        StatusBar.setBackgroundColor(colors.pageBackground);
        StatusBar.setBarStyle('dark-content');
      });
      // when we change to another screen, we have to use the dark purple statusbar
      this.props.navigation.addListener('blur', () => {
        StatusBar.setBackgroundColor(colors.headerGradientEnd);
        StatusBar.setBarStyle('light-content');
      });
    }

    DeviceEventEmitter.addListener("quickActionShortcut", data => {
      switch(data.type){
        case 'ch.bfh.ti.i4mi.coronaScience.addSymptom': this.props.navigation.navigate(SCREEN.HEALTH_STATUS);
          break;
        case 'ch.bfh.ti.i4mi.coronaScience.getInformation': this.props.navigation.navigate(SCREEN.INFORMATION);
          break;
        case 'ch.bfh.ti.i4mi.coronaScience.getProfile': this.props.navigation.navigate(SCREEN.SITUATION);
          break;
      }
    });

    QuickActions.popInitialAction()
      .then(this.coldQuickActions.bind(this))
      .catch(console.error);

    // update the counters and questionnaires on start up
    this.updateCountersNumbers();
    this.updateQuestionnaires();

    // start the timer (time in ms)
    BackgroundTimer.runBackgroundTimer(this.timer_tick.bind(this), TIMER_TRIGGER_UPDATE_INTERVAL);

    this.checkRemoteConfiguration();

    notifee.getInitialNotification().then((initialNotification) => {
      if(initialNotification){
        if(__DEV__){
          console.log('Notification caused application to open', initialNotification.notification);
          console.log('Press action used to open the app', initialNotification.pressAction);
        }

        switch(initialNotification.pressAction.id){
          case NOTIFICATION_ACTION.HEALTH_STATUS: this.props.navigation.navigate(SCREEN.HEALTH_STATUS);
            break;
          case NOTIFICATION_ACTION.QUESTION_OF_THE_DAY: this.setState({isQuestionOfTheDayExpanded: this.state.isQuestionOfTheDayUnanswered});
            break;
        }
      }
    });

    // register background handler for local notification action handling
    notifee.onForegroundEvent(({ type, detail }) => {
      this.notificationsHandler({ type, detail })
    });

    notifee.onBackgroundEvent(async ({ type, detail, headless }) => {
      this.notificationsHandler({ type, detail })
    });

    this.checkIfQuestionOfTheDayIsAnswered();
  }

  notificationsHandler({ type, detail }){
    switch (type) {
      case EventType.DISMISSED: //User dismissed notification
        break;
      case EventType.PRESS: //User pressed notification
        console.log('User event press');
        this.props.navigation.navigate(SCREEN.DASHBOARD);
        break;
      case EventType.ACTION_PRESS: //User pressed notification action
        console.log('User pressed an action with the id: ', detail.pressAction?.id);

        switch(detail.pressAction?.id){
          case NOTIFICATION_ACTION.HEALTH_STATUS: this.props.navigation.navigate(SCREEN.HEALTH_STATUS);
            break
          case NOTIFICATION_ACTION.QUESTION_OF_THE_DAY: this.props.navigation.navigate(SCREEN.DASHBOARD);
            break
        }
        //notifee.cancelNotification(detail.notification.id);

        break;
      case EventType.APP_BLOCKED: //when user blocks/unblocks all notifications for the application
        console.log('User toggled app blocked', detail.blocked);
        break;
      case EventType.CHANNEL_BLOCKED: //when user blocks/unblocks notifications of a specific channel
        console.log('User toggled channel block', detail.blocked);
        break;
      case EventType.CHANNEL_GROUP_BLOCKED: //when user blocks/unblocks notifications of a channel group
        console.log('User toggled channel group block', detail.blocked);
        break;
    }
  }

  componentDidMount(){
    RNBootSplash.hide({ duration: 200 });
  }

  componentDidUpdate(){
    if(this.props.miDataServiceStore.isAuthenticated() && this.props.userProfile.isUpToDate()) {
      if(this.state.pendingSaveData){
        this.setState({isRegisterPopupVisible: false});
        this.saveQuestionOfTheDayResponse();
      }
    }

    if( this.state.totalUser != this.props.statDataStore.getTotalUser()){
      this.setState({
        totalUser: this.props.statDataStore.getTotalUser()
      });
    }

    if( this.state.totalCollectedData != this.props.statDataStore.getTotalCollectedData()){
      this.setState({
        totalCollectedData: this.props.statDataStore.getTotalCollectedData(),
      });
    }

    this.checkIfQuestionOfTheDayIsAnswered();
  }

  static getDerivedStateFromProps( props : PropsType, state : State ){
    if(props.pendingResources.length > 0){
      props.uploadPendingResources();
    }
    return state;
  }

  private coldQuickActions(data) {
    if (data == null) return;

    switch(data.type){
      case 'ch.bfh.ti.i4mi.coronaScience.addSymptom': this.props.navigation.navigate(SCREEN.HEALTH_STATUS);
        break;
      case 'ch.bfh.ti.i4mi.coronaScience.getInformation': this.props.navigation.navigate(SCREEN.INFORMATION);
        break;
      case 'ch.bfh.ti.i4mi.coronaScience.getProfile': this.props.navigation.navigate(SCREEN.SITUATION);
        break;
    }
  }

  async checkRemoteConfiguration(){
    try {
      await remoteConfig().setDefaults({
        twitter_enabled: this.state.isTwitterDisplayed,
        twitter_bearer: this.state.twitterBearer,
        twitter_account: this.state.twitterAccountToFollow,
        infoCard_participants_minimum: this.state.minimumParticipantToDisplayCard,
        infoCard_dataSet_minimum: this.state.minimumDataSetToDisplayCard
      });

      await remoteConfig().setConfigSettings({
        isDeveloperModeEnabled: __DEV__
      });


      await remoteConfig().fetch();
      const activated = remoteConfig().activate();
      // const activated = await remoteConfig.remoteConfig().fetchAndActivate(); -> not always working

      if (activated) {
        const twitterEnabledValue = remoteConfig().getValue('twitter_enabled');
        this.remoteConfigurationLog('Twitter enabled', twitterEnabledValue);
        if (twitterEnabledValue.value === true) {
          this.setState({isTwitterDisplayed: true});
        }

        const twitterBearerValue = remoteConfig().getValue('twitter_bearer');
        this.remoteConfigurationLog('Twitter bearer', twitterBearerValue);
        this.setState({twitterBearer: twitterBearerValue.value as string});

        const twitterAccountValue = remoteConfig().getValue('twitter_account');
        this.remoteConfigurationLog('Twitter account', twitterAccountValue);
        this.setState({twitterAccountToFollow: twitterAccountValue.value as string});

        const infoCardParticipantsMinimum = remoteConfig().getValue('infoCard_participants_minimum');
        this.remoteConfigurationLog('infoCard minimum participants', infoCardParticipantsMinimum);
        this.setState({minimumParticipantToDisplayCard: infoCardParticipantsMinimum.value as number});

        const infoCardDataSetMinimum = remoteConfig().getValue('infoCard_dataSet_minimum');
        this.remoteConfigurationLog('infoCard minimum dataSet', infoCardDataSetMinimum);
        this.setState({minimumDataSetToDisplayCard: infoCardDataSetMinimum.value as number});
      }
    } catch (err) {
      console.error(err)
    }
  }

  remoteConfigurationLog( _parameter : string,  _value : FirebaseRemoteConfigTypes.ConfigValue){
    if(__DEV__){
      console.log('Parameter ' + _parameter + ' enabled value: ' + _value.value);
      if (_value.source === 'remote') {
        console.log('Parameter value was from the Firebase servers.');
      } else if (_value.source === 'default') {
        console.log('Parameter value was from a default value.');
      } else {
        console.log('Parameter value was from a locally cached value.');
      }
    }
  }

  share(){
    const url = 'https://coronascience.ch';
    const title = 'Corona Science';
    const message = this.props.localesHelper.localeString('dashboard.slogan') + ' #coronascience #covid19 #corona';
    const options = Platform.select({
      ios: {
        activityItemSources: [
          {
            placeholderItem: { type: 'url', content: url },
            item: {
              default: { type: 'url', content: url },
            },
            subject: {
              default: title,
            },
            linkMetadata: { originalUrl: url, url, title },
          },
          {
            placeholderItem: { type: 'text', content: message },
            item: {
              default: { type: 'text', content: message },
              message: null, // Specify no text to share via Messages app.
            },
          },
        ],
      },
      default: {
        title,
        subject: title,
        message: `${message} ${url}`,
      },
    });

    Share.open(options)
  }

  async timer_tick(){
    counterUpdateCountersInterval++;

    if(counterUpdateCountersInterval > (COUNTERS_UPDATE_INTERVAL/(TIMER_TRIGGER_UPDATE_INTERVAL/60000)) - .2 ){
      counterUpdateCountersInterval = 0;
      await this.updateCountersNumbers();
    }

    counterUpdateQuestionnairesInterval++;

    if(counterUpdateQuestionnairesInterval > (QUESTIONNAIRES_UPDATE_INTERVAL/(TIMER_TRIGGER_UPDATE_INTERVAL/60000)) - .2 ){
      counterUpdateQuestionnairesInterval = 0;
      this.updateQuestionnaires();
      this.updateUserProfile();
    }
  }

  async updateCountersNumbers() {
    // TODO fetch StatData numbers in one place (redundancy with Impressum.tsx)
    await this.props.miDataServiceStore.fetch(Config.OPEN_DATA_URL + '/fhir/Observation?code=project-participant-count&date=' + moment().format('YYYY-MM-DD'), 'GET')
      .then((responseProjectParticipant : Bundle) =>{
        this.props.miDataServiceStore.fetch(Config.OPEN_DATA_URL + '/fhir/Observation?code=project-panels-reported&date=' + moment().format('YYYY-MM-DD'), 'GET')
          .then((responseProjectPanelsReported : Bundle) =>{
            try{
              if(responseProjectParticipant.entry && responseProjectParticipant.entry.length > 0){
                this.props.updateStatData({
                  totalUser: responseProjectParticipant.entry[0].resource.valueQuantity.value,
                });
              }
            }catch(error){
              console.error("Error while retrieving data : " + error);
            }

            try{
              if(responseProjectPanelsReported.entry && responseProjectPanelsReported.entry.length > 0){
                // Update the local number of collect data ONLY if the number fetched from the platform is higher.
                // Reason: new collected datasets might be still buffered locally and not yet stored on the platform.
                // The local number of datasets is increased when saving new data, so the user gets direct feedback on the dashboard.
                if(this.state.totalCollectedData < responseProjectPanelsReported.entry[0].resource.valueQuantity.value ){
                  this.props.updateStatData({
                    totalCollectedData : responseProjectPanelsReported.entry[0].resource.valueQuantity.value,
                  });
                }
              }
            }catch(error){
              console.error("Error while retrieving stats data : " + error);
            }
          });
      });
  }

  /**
   * Called all 15 minutes to update FHIR questionnaires
   **/
  updateQuestionnaires() {
      QUESTIONNAIRES_TO_CHECK.forEach( (questionnaireToCheck) => {
        this.props.miDataServiceStore.fetch(Config.OPEN_DATA_URL + '/fhir/Questionnaire?status=active&effective=ap' + moment().format('YYYY-MM-DD') + '&context-type-value=prom$http://midata.coop/codesystems/coronascience-questionnaire-type|' + questionnaireToCheck["context-type-value"], 'GET')
        .then((responseBundle : Bundle) =>{
          try {
            if (responseBundle.total > 0) {
              this.props.addQuestionnaire( new QuestionnaireData(responseBundle.entry[0].resource, questionnaireToCheck.type) );
              if (questionnaireToCheck.type === QuestionnaireType.SITUATION_QUESTIONS && this.props.userProfile.getPersonalSituation().authored) {
                  this.props.questionnaireStore.getQuestionnaire(QuestionnaireType.SITUATION_QUESTIONS)?.restoreAnswersFromQuestionnaireResponse(this.props.userProfile.getPersonalSituation());
              }
            }
          } catch(error) {
            // for example network error
            console.error("Error while retrieving questionnaire data: " + error);
          }
        });
      });
  }

  /**
   * Called all 15 minutes to update user profile (Situation Question, AgeGroup)
   * In case the user uses several devices (pseudo synchronization)
   **/
  updateUserProfile() {
    if(this.props.miDataServiceStore.isAuthenticated()){
      this.props.miDataServiceStore.getUserProfile().then((userProfile : UserProfile) => {
        this.props.updateUserProfile( userProfile );
      }).catch((exception) => {
        if(exception.code != MiDataServiceExceptionCodes.NETWORK_ISSUE){
          this.props.logoutUser();
        }
      });
    }
  }

  // for user with iOS < 11
  async loginUser(){
      if (!this.props.questionnaireStore.getQuestionnaire( QuestionnaireType.QUESTION_OF_THE_DAY ).isResponseComplete()) {
        MessageHelper.showToast(this.props.localesHelper.localeString('dashboard.questionOfTheDay.noAnswer'), ToastType.WARNING);
        return;
      }
      // use the client to make the auth request and receive the authState
      try {
      OAUTH_SERVICE_CONFIG.issuer = Config.HOST + '/fhir';
      OAUTH_SERVICE_CONFIG.serviceConfiguration = {
          authorizationEndpoint: Config.HOST + Config.AUTHORIZATION_ENDPOINT,
          tokenEndpoint: Config.HOST + Config.TOKEN_ENDPOINT
      }
      const newAuthState = await authorize(OAUTH_SERVICE_CONFIG); // result includes accessToken, accessTokenExpirationDate and refreshToken

      this.props.authenticateUser(newAuthState.accessToken, newAuthState.accessTokenExpirationDate, newAuthState.refreshToken, Config.HOST);
      this.saveQuestionOfTheDayResponse();
      } catch (error) {
          console.error("Error while login : " + JSON.stringify(error));
      }
  }

  checkIfQuestionOfTheDayIsAnswered() {
    AsyncStorage.getItem(STORAGE.QUESTION_OF_THE_DAY_ANSWERED).then((value) =>{
      try {
        if(value === 'true'){
          // the user has already answered the question of the day on this device
          if (this.state.isQuestionOfTheDayUnanswered) {
            this.setState({isQuestionOfTheDayUnanswered: false});
          }
        }else if( value === null){
          // on this device, the user hasn't already answered the question of the day;
          // we check on MIDATA if the user has already answered the question on another device
          const questionnaire = this.props.questionnaireStore.getQuestionnaire( QuestionnaireType.QUESTION_OF_THE_DAY )?.fhirQuestionnaire;
          if( this.props.miDataServiceStore.isAuthenticated() && questionnaire ){
            this.props.miDataServiceStore.fetch('/fhir/QuestionnaireResponse?questionnaire=' + questionnaire.url + '|' + questionnaire.version)
            .then((responseBundle : Bundle) => {
              if(responseBundle.total > 0){
                // the user already answered this question of the day; update the local storage
                AsyncStorage.setItem(STORAGE.QUESTION_OF_THE_DAY_ANSWERED, 'true');
                if (this.state.isQuestionOfTheDayUnanswered) {
                  this.setState({isQuestionOfTheDayUnanswered: false});
                }
              } else {
                // no answer yet; update the local storage
                AsyncStorage.setItem(STORAGE.QUESTION_OF_THE_DAY_ANSWERED, 'false');
                if (!this.state.isQuestionOfTheDayUnanswered) {
                  this.setState({isQuestionOfTheDayUnanswered: true});
                }
              }
            }).catch(() => {
              AsyncStorage.setItem(STORAGE.QUESTION_OF_THE_DAY_ANSWERED, 'false');
              if (!this.state.isQuestionOfTheDayUnanswered) {
                this.setState({isQuestionOfTheDayUnanswered: true});
              }
            });
          } else {
            // no user is logged in, so the question of the day is presented as not answered
            if (!this.state.isQuestionOfTheDayUnanswered) {
              this.setState({isQuestionOfTheDayUnanswered: true});
            }
          }
        } else { //value === 'false'
          // no answer yet
          if (!this.state.isQuestionOfTheDayUnanswered) {
            this.setState({isQuestionOfTheDayUnanswered: true});
          }
        }
      }
      catch(error) {
        if (!this.state.isQuestionOfTheDayUnanswered) {
          this.setState({isQuestionOfTheDayUnanswered: true});
        }
      }
    });
  }

  saveQuestionOfTheDayResponse() {
    if (!this.props.questionnaireStore.getQuestionnaire( QuestionnaireType.QUESTION_OF_THE_DAY ).isResponseComplete()) {
      MessageHelper.showToast(this.props.localesHelper.localeString('dashboard.questionOfTheDay.noAnswer'), ToastType.WARNING);
      return;
    }
    if (!this.props.miDataServiceStore.isAuthenticated()) {
      this.setState({
        isRegisterPopupVisible: true,
        pendingSaveData : true
      });
      return;
    } else if (!this.props.userProfile.isUpToDate()){
      this.props.miDataServiceStore.getUserProfile().then(() => {
        this.saveQuestionOfTheDayResponse();
      }).catch((exception) => {
          if(exception.code != MiDataServiceExceptionCodes.NETWORK_ISSUE){
              this.props.logoutUser();
          }
      });
      return;
    }
    this.setState({pendingSaveData: false});
    const patientReference = this.props.userProfile.getFhirReference();
    const response = this.props.questionnaireStore.getQuestionnaire( QuestionnaireType.QUESTION_OF_THE_DAY ).getQuestionnaireResponse(this.props.localesHelper.getCurrentLanguage(), patientReference);
    AsyncStorage.setItem(STORAGE.QUESTION_OF_THE_DAY_ANSWERED, 'true');
    this.props.addResource(response);
    this.setState({
      isQuestionOfTheDayUnanswered: false,
      isQuestionOfTheDayExpanded: false
    });
  }

  render() {
    return (
      <>
        <ScrollView style={{ backgroundColor: colors.pageBackground, paddingLeft: this.pagePadingLeft, height: '100%'}}
                    alwaysBounceVertical={false}>
          <TouchableOpacity activeOpacity={1}
                            onPress={() => {this.setState({isQuestionOfTheDayExpanded: false}); return true}}>
            <>
            {/* header with "Corona Science" logo and slogan */}
              <View style={{flex: 1, flexDirection: 'row', alignItems: 'flex-start', paddingTop: '10%', paddingBottom: '5%', marginRight: this.pagePadingRight}}>
                {/* logo in 1/5 flex width; set height so the image resizes correctly */}
                <View style={{flex: 0.18, height: 0.18 * (this.windowWidth - this.pagePadingLeft - this.pagePadingRight)}}>
                  <TouchableOpacity onPress={() => this.props.navigation.navigate(SCREEN.INTRO)}>
                    <Image style={{height: '100%', width: '100%'}}
                           resizeMode='cover'
                           source={require('../../resources/images/sigle.png')}
                    />
                  </TouchableOpacity>
                </View>
                {/* slogan in 3/5 flex width – the last 1/5 flex width left to the slogan stays empty */}
                <View style={{flex: 0.8}}>
                  {/* supplementary View needed for the slogan to be centered vertically */}
                  <View style={{flex: 1, justifyContent: 'center'}}>
                    <Text style={[styles.logoText]}
                          onPress={this.share.bind(this)}>
                      {this.props.localesHelper.localeString('dashboard.slogan')}
                    </Text>
                  </View>
                </View>
              </View>

            {/* buttons and counters if enabled */}
              <View style={{flex: 1, marginRight: this.pagePadingRight, zIndex: 1}}>
                <LargeButton title={this.props.localesHelper.localeString('dashboard.enterHealthStatus')}
                             target={SCREEN.HEALTH_STATUS}
                             icon={require(ICON_PATH + 'enterHealthStatus.png')}
                             navigation={this.props.navigation}
                             backgroundColor={colors.secondaryNormal}
                />
                { !this.props.questionnaireStore.getQuestionnaire( QuestionnaireType.SITUATION_QUESTIONS ).isResponseComplete() &&
                  <LargeButton title={this.props.localesHelper.localeString('dashboard.completeSituation')}
                               target={SCREEN.SITUATION}
                               icon={require(ICON_PATH + 'completeSituation.png')}
                               navigation={this.props.navigation}
                               backgroundColor={colors.secondaryNormal}
                  />
                }
                <LargeButton title={this.props.localesHelper.localeString('dashboard.getInfo')}
                             target={SCREEN.INFORMATION}
                             icon={require(ICON_PATH + 'getInfo.png')}
                             navigation={this.props.navigation}
                             backgroundColor={colors.primaryNormal}
                />
              </View>

            {/* show participant and dataset counters, if the numbers are big enought ;-) */}
              <View style={{flex: 1}}>
                <View style={{flexDirection: 'row', marginBottom: '8%', marginTop: '8%'}}>
                  { this.state.totalUser !== undefined && this.state.totalUser > /*this.state.minimumParticipantToDisplayCard*/ 0 &&
                    <InfoCard flex={0.42}
                              text={this.props.localesHelper.localeString('dashboard.totalUser')}
                              icon={require('../../resources/images/dashboard/participants.png')}
                              count={this.state.totalUser}
                    />
                  }
                  { this.state.totalCollectedData !== undefined && this.state.totalCollectedData > /*this.state.minimumDataSetToDisplayCard*/ 0 &&
                    <InfoCard flex={0.58}
                              text={this.props.localesHelper.localeString('dashboard.totalCollectedData')}
                              icon={require('../../resources/images/dashboard/sharedDatasets.png')}
                              count={this.state.totalCollectedData}
                    />
                  }
                </View>
              </View>

            {/* Twitter viewer if enabled */}
              { this.state.isTwitterDisplayed &&
                <View style={{flex: 1, marginRight: this.pagePadingRight}}>
                  <Twitter bearer={Config.TWITTER_BEARER}
                           accountToFollow={Config.TWITTER_ACCOUNT_TO_FOLLOW}
                  />
                </View>
              }

            {/* info box for the question of the day */}
              { this.state.isQuestionOfTheDayExpanded &&  Platform.OS !== 'android' &&
                <BlurView style={{position: "absolute",
                                  zIndex: 5,
                                  top: 0,
                                  left: -25,
                                  bottom: 0,
                                  right: 0,
                                  height: '150%'}}
                          blurType="dark"
                          blurAmount={2}
                          reducedTransparencyFallbackColor={colors.mediumGray}
                />
              }
              {this.props.questionnaireStore.getQuestionnaire( QuestionnaireType.QUESTION_OF_THE_DAY ) &&
                <TouchableWithoutFeedback onPress={() => {
                                            this.setState({isQuestionOfTheDayExpanded: this.state.isQuestionOfTheDayUnanswered});
                                          }}>
                  <View style={[{zIndex: 12},
                      this.state.isQuestionOfTheDayExpanded
                          ? Platform.OS === 'ios'
                              ? {flex: 1, borderRadius: 0, backgroundColor: colors.questionBoxBackground, padding: 25, marginTop: -175, marginLeft: -25}
                              : {flex: 1, borderTopLeftRadius: 10, borderBottomLeftRadius: 10, backgroundColor: colors.questionBoxBackground, padding: 25, marginTop: -175, marginLeft: 0, paddingLeft: 15}
                          : {flex: 1, borderTopLeftRadius: 10, borderBottomLeftRadius: 10, backgroundColor: colors.questionBoxBackground, padding: 15}
                  ]}>
                    { this.state.isQuestionOfTheDayExpanded &&
                    <TouchableOpacity onPress={() => this.setState({isQuestionOfTheDayExpanded: false})} style={{right:20, top:20, position: "absolute", zIndex: 13}}>
                      <Icon name='close' color={colors.primaryNormal} size={25} />
                    </TouchableOpacity>
                    }
                    <Text style={[AppStyle.sectionTitle, {color: colors.primaryNormal, marginBottom: 5, marginLeft: 7, zIndex: 10}]}>
                      { this.props.questionnaireStore.getQuestionnaire( QuestionnaireType.QUESTION_OF_THE_DAY ).getQuestionnaireTitle(this.props.localesHelper.getCurrentLanguage()) }
                    </Text>

                    { this.state.isQuestionOfTheDayUnanswered
                      ? <>
                          <QuestionList questionsData={this.props.questionnaireStore.getQuestionnaire( QuestionnaireType.QUESTION_OF_THE_DAY ).getQuestions()}
                                        style={{
                                          itemBackground: {
                                            active: 'transparent',
                                            inactive: 'transparent'
                                          },
                                          sideBarColor: colors.primarySemiDark }}
                                        onItemHeaderPress= {() => { this.setState({isQuestionOfTheDayExpanded: this.state.isQuestionOfTheDayUnanswered}) }}
                                        accordionOptions= {{
                                          autoSkip: false,
                                          showSideBar: false,
                                          showAnswersInHeader: false,
                                          showExpandIcon: false,
                                          defaultExpandedItem: -1,
                                          forceExpandItem: this.state.isQuestionOfTheDayExpanded ? 0 : -1,
                                          showDashes: false
                                        }}
                          />
                          { this.state.isQuestionOfTheDayExpanded
                            ? (!this.props.miDataServiceStore.isAuthenticated() && Platform.OS === 'ios' && Platform.Version < '11')
                                ? <View style={{flexDirection: 'column', alignItems: 'center'}}>
                                  <Text style={[AppStyle.textQuestion, { fontSize: TextSize.very_small - 2, color: colors.black, paddingHorizontal:0, textAlign:'center', paddingTop: 15}]}>
                                    {this.props.localesHelper.localeString('common.loginPromptText')}
                                  </Text>
                                  <Button style={[AppStyle.button, {width: ButtonDimensions.actionButtonWidth, minWidth: 250}]} onPress={this.loginUser.bind(this)}>
                                    <Text style={AppStyle.textButton}>{this.props.localesHelper.localeString('common.login')}</Text>
                                  </Button>
                                </View>
                                : <Button style={[AppStyle.button, {width: ButtonDimensions.actionButtonWidth, marginTop: 10, alignSelf: 'center'}]}
                                          onPress={this.saveQuestionOfTheDayResponse.bind(this)}>
                                    <Text style={AppStyle.textButton}>
                                      {this.props.localesHelper.localeString('common.save')}
                                    </Text>
                                  </Button>
                            : <Image style={{height: 20, width: 20, marginLeft: 7}}
                                     source={require("../../resources/images/dashboard/letsGo.png")}
                              />
                          }
                        </>
                      : <Text style={[AppStyle.textQuestion, {marginLeft: 7}]}>
                          { this.props.localesHelper.localeString('dashboard.questionOfTheDay.thankYou') }
                        </Text>
                    }
                  </View>
                </TouchableWithoutFeedback>
              }

            {/* FAQ and links to social media */}
              <View style={{flex: 1, marginTop: 30, justifyContent:'flex-end', marginRight: this.pagePadingRight, zIndex: 4}}>
                <View style={{flex: 0.5, justifyContent:'center', alignItems:'center'}}>
                  <TouchableOpacity onPress={() => UrlHelper.openURL(this.props.localesHelper.localeString('dashboard.faq.hyperlink'))} style={{flex:1}}>
                    <Image
                      style={styles.socialMediaImage}
                      source={require("../../resources/images/dashboard/faq.png")}
                    />
                    <Text style={styles.faqText}>FAQ</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.socialMediaContainer}>
                  { SOCIAL_MEDIA.map((socialMedia, index) => {
                    return (
                      <View style={{flex: 0.5, justifyContent:'center', alignItems:'center'}} key={'socialMedia' + index}>
                        <TouchableOpacity onPress={() => UrlHelper.openURL(socialMedia.url)} style={{flex:1}}>
                          <Image style={styles.socialMediaImage}
                                 source={socialMedia.icon}
                          />
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                </View>
              </View>
            </>
          </TouchableOpacity>
        </ScrollView>
        <Login title={this.props.localesHelper.localeString('common.loginPromptTitle')}
               label={this.props.localesHelper.localeString('common.loginPromptText')}
               buttonText={this.props.localesHelper.localeString('common.login')}
               isLoginOpen={this.state.isRegisterPopupVisible }
               onClose={() => this.setState({isRegisterPopupVisible: false, pendingSaveData: false})}
        />
      </>
    );
  }
}

/**
 * Component to display a prominent button with color gradient, used to navigate to another tab
 * @param: navigation the Tab.Navigator object
 * @param: target the name of the tab the button should navigate to
 * @param: icon the name of the icon to be used in the button (only if screen is big enough) - should be from the ionicons set from https://oblador.github.io/react-native-vector-icons/
 * @param: title the text displayed on the button
**/

interface LargeButtonProps {
    navigation: any;
    target: string;
    icon: ImageSourcePropType;
    title: string;
    backgroundColor: string;
}

class LargeButton extends Component<LargeButtonProps> {
    icon: string = '../../resources/images/dashboard/' + this.props.icon;

    render() {
        return (
          <Button style={[styles.largeButton, {zIndex: 1}, {backgroundColor: this.props.backgroundColor}]} onPress={() => this.props.navigation.navigate(this.props.target)}>
            <Text style={[styles.largeButtonText]}>
              {this.props.title}
            </Text>
            <Image source={this.props.icon} style={{width: scale(22), height: scale(22)}} />
          </Button>
        );
    }
}

const styles = StyleSheet.create({
  logoText: {
    marginLeft: '8%',
    marginRight: '20%',
    flexWrap: 'wrap',
    fontFamily: AppFonts.normal,
    fontSize: moderateScale(TextSize.normal)
  },
  largeButton: {
    borderRadius: ButtonDimensions.largeButtonBorderRadius,
    borderWidth: 0,
    height: ButtonDimensions.largeButtonHeight,
    paddingLeft: 0,
    paddingRight: 15,
    marginTop: 16
  },
  largeButtonText: {
    borderWidth: 0,
    marginRight: 0,
    color: colors.white,
    fontFamily: AppFonts.normal,
    fontSize: moderateScale(TextSize.small)
  },
  socialMediaContainer: {
    flex: 1,
    flexDirection: 'row',
    marginVertical: '5%',
    paddingHorizontal:'25%'
  },
  faqText: {
    fontFamily: AppFonts.normal,
    fontSize: TextSize.small
  },
  socialMediaImage: {
    width: 30,
    height: 30
  }
});

function mapStateToProps(state: AppStore) {
  return {
      miDataServiceStore: state.MiDataServiceStore,
      localesHelper : state.LocalesHelperStore,
      userProfile: state.UserProfileStore,
      statDataStore: state.StatDataStore,
      pendingResources: state.MiDataServiceStore.pendingResources,
      questionnaireStore: state.QuestionnaireStore
  };
}

function mapDispatchToProps(dispatch: any) {
  return {
      updateStatData: (newData: UpdateStatData) => statDataActions.updateStatData(dispatch, newData),
      addQuestionnaire: (newData: QuestionnaireData) => questionnaireServiceActions.addQuestionnaire(dispatch, newData),
      uploadPendingResources: () => MIDATAServiceActions.uploadPendingResources(dispatch),
      updateUserProfile: (userProfile: Partial<UserProfile>) => userProfileActions.updateUserProfile(dispatch, userProfile),
      authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => miDataServiceActions.authenticateUser(dispatch, accessToken, accessTokenExpirationDate, refreshToken, server),
      logoutUser: () => miDataServiceActions.logoutUser(dispatch),
      addResource: (resource : Resource) => miDataServiceActions.addResource(dispatch, resource)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
