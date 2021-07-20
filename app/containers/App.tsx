import * as React from 'react';
import { SafeAreaView, StatusBar, Image, StyleSheet, Platform } from 'react-native'
import { Provider } from 'react-redux';
import { store, persistor } from '../store';
import Impressum from './Impressum';
import Dashboard from './Dashboard';
import Information from './Information';
import Settings from './Settings'
import Profile from './Profile'
import DataEntry from './DataEntry';
import { Root as NbRoot} from 'native-base'
import IntroSlide from '../components/IntroSlide'
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, LoadDefaultComponentStyle, scale } from '../styles/App.style';
import { PersistGate } from 'redux-persist/integration/react';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-community/async-storage';
import Moment from 'moment';
import RNBootSplash from 'react-native-bootsplash';
import messaging from '@react-native-firebase/messaging';

const RootStack = createStackNavigator();
const Tab = createBottomTabNavigator();

export enum NOTIFICATION_TOPIC {
  GENERAL = 'general',
  REMINDER = 'reminder',
  QUESTION_OF_THE_DAY = 'question-of-the-day'
}

export enum NOTIFICATION_ACTION {
  HEALTH_STATUS = 'health-status',
  QUESTION_OF_THE_DAY = 'question-of-the-day'
}

export enum SCREEN {
  INTRO = 'Intro',
  DASHBOARD = 'Dashboard',
  INFORMATION = 'Information',
  HEALTH_STATUS = 'HealthStatus',
  SITUATION = 'Situation',
  SETTINGS = 'Settings',
  IMPRESSUM = 'Impressum'
}

// Flags stored in local storage.
// !!! Caution: the flags that need to be reset on logout must be explicitly reset
// !!! in the app/store/midataService/action.ts, function logoutUser()
export enum STORAGE {
  SHOULD_DISPLAY_INTRO = '@displayIntro',
  INTRO_SKIPPED = '@IntroSkipped',
  INTRO_DATE = '@IntroDate',
  ASK_NOTIFICATIONS_PERMISSION = '@AskNotificationPermission',
  LAST_HEALTH_STATUS_UPDATE = '@LastHealthStatusUpdate',
  QUESTION_OF_THE_DAY_ANSWERED = '@QuestionOfTheDayAnswered' 
}

const images : any = {
  'dashboard' : {
    actif : require('../../resources/images/tabBar/dashboardActive.png'),
    inactif : require('../../resources/images/tabBar/dashboardInactive.png')
  },
  'information' : {
    actif : require('../../resources/images/tabBar/informationActive.png'),
    inactif : require('../../resources/images/tabBar/informationInactive.png')
  },
  'healthStatus' : {
    actif : require('../../resources/images/tabBar/healthStatusActive.png'),
    inactif : require('../../resources/images/tabBar/healthStatusInactive.png')
  },
  'situation' : {
    actif : require('../../resources/images/tabBar/situationActive.png'),
    inactif : require('../../resources/images/tabBar/situationInactive.png')
  },
  'settings' : {
    actif : require('../../resources/images/tabBar/settingsActive.png'),
    inactif : require('../../resources/images/tabBar/settingsInactive.png')
  }
};

function generateTabImage(tabId : string, isActive : boolean) {
  const sourceImage = isActive ? images[tabId].actif : images[tabId].inactif;
  return (<Image source={sourceImage} style={styles.tabImage}/>);
}

function Root() {
  // the <NbRoot> tag is important for correctly showing the upload-Toast while
  // navigating back to Dashboard
  return (
    <>
    <NbRoot>
      <Tab.Navigator
      tabBarOptions={{
        style: {height: scale(50)},
        activeTintColor: colors.black,
        inactiveTintColor: colors.mediumGray,
        showLabel: false,
        adaptive: true,
        activeBackgroundColor: colors.lightGray,
        inactiveBackgroundColor: colors.lightGray
      }}
    >
      <Tab.Screen
        name={SCREEN.DASHBOARD}
        component={Dashboard}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            generateTabImage('dashboard', focused)
          )
        }}
      />

      <Tab.Screen
        name={SCREEN.INFORMATION}
        // todo rename to Information
        component={Information}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            generateTabImage('information', focused)
          )
        }}
      />

      <Tab.Screen
        name={SCREEN.HEALTH_STATUS}
        // todo rename to HealthStatus
        component={DataEntry}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            generateTabImage('healthStatus', focused)
          )
        }}
      />

      <Tab.Screen
        name={SCREEN.SITUATION}
        // todo rename to Situation
        component={Profile}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            generateTabImage('situation', focused)
          )
        }}
      />

      <Tab.Screen
        name={SCREEN.SETTINGS}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            generateTabImage('settings', focused)
          )
        }}
      >
          {props => <Settings {...props} />}
      </Tab.Screen>

    </Tab.Navigator>
    </NbRoot>
    </>
  );
}

const styles = StyleSheet.create({
  tabImage: {
    marginTop: '4%',
    width: scale(22),
    height: scale(22),
    overflow: 'visible'
  },
  linearGradient: {
    width: 62,
    height: 40,
    borderRadius: 50,
    borderWidth: 0,
    top: -7,
    paddingTop: 7,
    paddingLeft: 19
  }
});

interface PropsType {
}

interface State {
  showRealApp : boolean,
  showOnlyNotificationPermission: boolean | undefined
}

export default class App extends React.Component<PropsType, State> {
  constructor(props: PropsType) {
    super(props);
    this.state = {
      showRealApp: false,
      showOnlyNotificationPermission: undefined
    };

    this.checkContentToDisplay()

    LoadDefaultComponentStyle();
    
    if(!messaging().isAutoInitEnabled){
      this.registerAppWithFCM();
    }
    messaging().subscribeToTopic(NOTIFICATION_TOPIC.GENERAL);
    messaging().subscribeToTopic(NOTIFICATION_TOPIC.REMINDER);
    messaging().subscribeToTopic(NOTIFICATION_TOPIC.QUESTION_OF_THE_DAY);
  }

  async registerAppWithFCM() {
    await messaging().registerDeviceForRemoteMessages();
  }

  async checkContentToDisplay(){
    await AsyncStorage.getItem(STORAGE.SHOULD_DISPLAY_INTRO).then(async (value) =>{
      if(value == 'false'){
        if(Platform.OS === 'ios'){
          await AsyncStorage.getItem(STORAGE.ASK_NOTIFICATIONS_PERMISSION).then((value) =>{
            if(value !== null){ // in case of migration -> intro should no more displayed but we are asking for the permission to display notifications
              this.setState({
                showRealApp: true
              });
            }else{
              this.setState({
                showOnlyNotificationPermission: true
              });
            }
            RNBootSplash.hide({ duration: 200 });
          })
        }else{
          this.setState({
            showRealApp: true
          });
          RNBootSplash.hide({ duration: 200 });
        }
      }else{
        this.setState({
          showOnlyNotificationPermission: false
        });
        RNBootSplash.hide({ duration: 200 }); 
      }
    })
  }

  _onDone = () => {
    try {
      const first = [STORAGE.SHOULD_DISPLAY_INTRO, 'false']
      const second = [STORAGE.INTRO_SKIPPED, 'true']
      const third = [STORAGE.INTRO_DATE, Moment().toISOString()]

      AsyncStorage.multiSet([first, second, third])
    } catch (e) {
      // saving error
    }

    this.setState({ showRealApp: true });
  };

  _onSkip = () => {
    try {
      const first = [STORAGE.SHOULD_DISPLAY_INTRO, 'false']
      const second = [STORAGE.INTRO_SKIPPED, 'true']
      const third = [STORAGE.INTRO_DATE, Moment().toISOString()]

      AsyncStorage.multiSet([first, second, third])
    } catch (e) {
      // saving error
    }

    this.setState({ showRealApp: true });
  };

  render() {
    if (this.state.showRealApp) {
      return (
        <>
          <Provider store={store}>
            <PersistGate
              persistor={persistor}>
              <NavigationContainer>
                <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} />
                <SafeAreaView style={{ flex: 0, backgroundColor: colors.headerGradientEnd }} />
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.lightGray }}>
                  <RootStack.Navigator mode="modal">
                    <RootStack.Screen
                      name="Main"
                      component={Root}
                      options={{ headerShown: false }}
                    />
                    <RootStack.Screen
                      name={SCREEN.IMPRESSUM}
                      component={Impressum}
                      options={{ headerShown: false }}
                    />
                    <RootStack.Screen
                      name={SCREEN.INTRO}
                      component={IntroSlide}
                      options={{ headerShown: false }}
                    />
                  </RootStack.Navigator>
                </SafeAreaView>
              </NavigationContainer>
            </PersistGate>
          </Provider>
      </>
    );
    }else if(this.state.showOnlyNotificationPermission !== undefined){
      return (
        <Provider store={store}>
          <IntroSlide
            showOnlyNotificationPermission={this.state.showOnlyNotificationPermission}
            onSkip={this._onSkip.bind(this)}
            onDone={this._onDone.bind(this)}
          />
        </Provider>
      );
    }else{
      return (
        <></>
        );
    }
    
  }  
}

  
