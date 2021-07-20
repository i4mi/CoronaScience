import React, { Component } from 'react';
import { Image, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { HeaderBanner } from '../components/HeaderBanner'
import LocalesHelper from '../locales';
import { AppStore } from '../store/reducers';
import { connect } from 'react-redux';
import { Button, Text, ListItem, Left, Right, Picker } from 'native-base';
import AppStyle, { colors, AppFonts, scale, verticalScale } from '../styles/App.style';
import { StackNavigationProp } from '@react-navigation/stack';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-community/async-storage';
import * as localesHelperActions from '../store/localesHelper/actions';
import * as miDataServiceActions from '../store/midataService/actions';
import MiDataServiceStore from 'app/store/midataService/model';
import { SCREEN, STORAGE } from '../containers/App'
import UserProfile from '../model/UserProfile';
import Dash from 'react-native-dash';
import Topic from '../components/Topic';
import { OAUTH_SERVICE_CONFIG } from '../model/UserSession';
import Config from 'react-native-config';
import { authorize } from 'react-native-app-auth';

interface PropsType {
  navigation: StackNavigationProp<any>;
  localesHelper : LocalesHelper;
  miDataServiceStore: MiDataServiceStore;
  userProfile: UserProfile;
  changeAppLanguage: (lang: string)=> void;
  authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => void;
  logoutUser: () => void;
}

interface State {
  displayButtonNotificationPermission : boolean
}

class Settings extends Component<PropsType, State> {

  navigation = this.props.navigation;

  constructor(props: PropsType) {
    super(props);
    this.state = {
      displayButtonNotificationPermission : false
    }

    if(Platform.OS === 'ios'){
      AsyncStorage.getItem(STORAGE.ASK_NOTIFICATIONS_PERMISSION).then((value) =>{
        if(value === null){
          this.setState({
            displayButtonNotificationPermission: true
          });
        }
      })
    }
  }

  goToImpressum(){
    this.props.navigation.navigate(SCREEN.IMPRESSUM);
  }

  async requestNotificationAutorisations(){
    AsyncStorage.setItem(STORAGE.ASK_NOTIFICATIONS_PERMISSION , Date.now().toString());
    this.setState({
      displayButtonNotificationPermission: false
    });
    //this.forceUpdate;
    await messaging().requestPermission();
  }

  async login(){
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

  render() {
    return (
      <>
        <View style={{backgroundColor: colors.pageBackground, height: '100%'}}>
          <HeaderBanner title={this.props.localesHelper.localeString('settings.title')}/>
          <ScrollView style={[AppStyle.contentPadding]} alwaysBounceVertical={false}>
              <View style={{flex: 1}}>

                {/* Connect/disconnect to/from MIDATA */}
                <View style={{flex: 1, paddingBottom: verticalScale(30)}}>
                  <Text style={[AppStyle.sectionTitle]}>
                    {this.props.localesHelper.localeString('settings.myAccount.title')}
                  </Text>
                  {/* Disconnect */}                
                  { this.props.miDataServiceStore.isAuthenticated() &&
                    <>
                    <Text style={[AppStyle.textQuestion, {marginTop: 10}]}>
                      {this.props.userProfile.getFullName()}
                    </Text>
                    <Text style={[AppStyle.textQuestion, {marginTop: 5}]}>
                      {this.props.userProfile.getEmail()}
                    </Text>
                    <Button style={[AppStyle.button]}
                            onPress={(() => {this.props.logoutUser()})}>
                      <Text style={[AppStyle.textButton]}>
                        {this.props.localesHelper.localeString('common.logout')}
                      </Text>
                    </Button>
                    </>
                  }
                  {/* Connect or register */}
                  { !this.props.miDataServiceStore.isAuthenticated() &&
                    <>
                    <Text style={[AppStyle.textQuestion, {marginTop: 10}]}>
                      {this.props.localesHelper.localeString('common.loginPromptText')}
                    </Text>
                    <Button style={[AppStyle.button]}
                            onPress={this.login.bind(this)}>
                      <Text style={[AppStyle.textButton]}>
                        {this.props.localesHelper.localeString('common.login')}
                      </Text>
                    </Button>
                    </>
                  }
                </View>
              
                {/* Notification permission, if not already asked for (see IntroSlide) */}
                {this.state.displayButtonNotificationPermission &&
                  <View style={{flex: 1, paddingBottom: verticalScale(30)}}>
                    <Text style={[AppStyle.sectionTitle]}>
                      {this.props.localesHelper.localeString('common.notifications.title')}
                    </Text>
                    <Button style={[AppStyle.button]} onPress={this.requestNotificationAutorisations.bind(this)}>
                      <Text style={[AppStyle.textButton]}>{this.props.localesHelper.localeString('common.notifications.allow')}</Text>
                    </Button>
                  </View>
                }

                {/* TODO Jump to device settings to change notification permission
                <View style={{flex: 0, opacity: 0}}>
                  <Text style={[AppStyle.sectionTitle,{marginBottom: 5}]}>
                      {this.props.localesHelper.localeString('common.notifications.title')}
                  </Text>
                  <Text style={[AppStyle.textQuestion]}>
                    {this.props.localesHelper.localeString('settings.notifications.information')}
                  </Text>
                  <ListItem noIndent>
                    <Left>
                      <Text style={[AppStyle.textQuestion, {fontSize:TextSize.normal}]}>
                        {this.props.localesHelper.localeString('common.notifications.allow')}
                      </Text>
                    </Left>
                    <Right>
                      <Switch/>
                    </Right>
                  </ListItem>
                </View>
                */}

                {/* Language selection */}
                <View style={{flex: 1, paddingBottom: verticalScale(30)}}>
                  <Text style={[AppStyle.sectionTitle]}>
                    {this.props.localesHelper.localeString('settings.userInterface.title')}
                  </Text>
                  <Dash style={{ width: '100%', marginTop: '6%' }} dashThickness={1} dashLength={1} dashGap={2} />
                  <ListItem style={{marginTop: -10, marginLeft: Platform.OS === 'ios' ? -32 : -26, marginBottom: -10, marginRight: -10}} noIndent noBorder>
                    <Left>
                      <Picker
                        style={{width: scale(320)}}
                        mode="dropdown"
                        iosHeader={this.props.localesHelper.localeString('settings.userInterface.selectLanguage')}
                        headerBackButtonText={'<'}
                        headerBackButtonTextStyle={[AppStyle.sectionTitle, {fontSize: 30, marginTop: -3}]}
                        headerTitleStyle={[AppStyle.sectionTitle, {fontWeight: 'normal'}]}
                        itemTextStyle={{fontFamily: AppFonts.normal}}
                        textStyle={{fontFamily: AppFonts.normal}}
                        note={false}
                        selectedValue={this.props.localesHelper.getCurrentLanguage()}
                        onValueChange={this.props.changeAppLanguage}
                      >
                        <Picker.Item label="Deutsch" value="de" />
                        <Picker.Item label="English" value="en" />
                        <Picker.Item label="Français" value="fr" />
                        <Picker.Item label="Italiano" value="it" />
                        <Picker.Item label="Rumantsch" value="rm" />
                        <Picker.Item label="Schwizerdütsch" value="gsw" />
                      </Picker>
                    </Left>
                    {Platform.OS === 'ios'&&
                      <Right>
                        <Image style={{ height: 20, width: 20 }} source={require("../../resources/images/dashboard/letsGo.png")} />
                      </Right>
                    }
                  </ListItem>
                  <Dash style={{ width: '100%' }} dashThickness={1} dashLength={1} dashGap={2} />
                </View>

                {/* About Corona Science */}
                <View style={{flex: 2, paddingBottom: 40}}>
                    <Text style={[AppStyle.sectionTitle]}>
                        {this.props.localesHelper.localeString('settings.other.title')}
                    </Text>
                    <Dash style={{ width: '100%', marginTop: '6%' }} dashThickness={1} dashLength={1} dashGap={2} />

                    <TouchableOpacity onPress={() => this.goToImpressum()}>
                      <View style={{ flexDirection: 'row', marginVertical: '4%' }}>
                        <View style={{ flex: 4 }}>
                          <Text style={AppStyle.textInfo}>{this.props.localesHelper.localeString('settings.other.impressum')}</Text>
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row-reverse' }}>
                          <Image style={{ height: 20, width: 20 }} source={require("../../resources/images/dashboard/letsGo.png")} />
                        </View>
                      </View>
                    </TouchableOpacity>
                    <Dash style={{ width: '100%' }} dashThickness={1} dashLength={1} dashGap={2} />

                    <Topic
                      name={this.props.localesHelper.localeString('settings.other.termsOfUse.title')}
                      url={this.props.localesHelper.localeString('settings.other.termsOfUse.url')}
                    />

                    <Topic
                      name={this.props.localesHelper.localeString('settings.other.privacyPolicy.title')}
                      url={this.props.localesHelper.localeString('settings.other.privacyPolicy.url')}
                    />

                    <Topic
                      name={this.props.localesHelper.localeString('settings.other.contact.title')}
                      url={this.props.localesHelper.localeString('settings.other.contact.url')}
                    />

                    {/* TODO app feeback on store
                    <Topic
                      name={this.props.localesHelper.localeString('settings.other.feedback.title')}
                      url={this.props.localesHelper.localeString('settings.other.feedback.url')}
                    />
                    */}
                </View>
              </View>
          </ScrollView>
        </View>
      </>
    );
  };
}

function mapStateToProps(state: AppStore) {
  return {
      localesHelper : state.LocalesHelperStore,
      miDataServiceStore: state.MiDataServiceStore,
      userProfile: state.UserProfileStore
  };
}

function mapDispatchToProps(dispatch: any) {
  return {
      changeAppLanguage: (newLang: string) => localesHelperActions.updateAppLanguage(dispatch, newLang),
      authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => miDataServiceActions.authenticateUser(dispatch, accessToken, accessTokenExpirationDate, refreshToken, server),
      logoutUser: () => miDataServiceActions.logoutUser(dispatch)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
