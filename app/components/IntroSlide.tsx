import React, { Component } from 'react';
import { Image, StyleSheet, View, Platform, Dimensions } from 'react-native'
import { Text, Button } from 'native-base'
import { StackNavigationProp } from '@react-navigation/stack';
import AppIntroSlider from 'react-native-app-intro-slider';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-community/async-storage';
import LocalesHelper from '../locales';
import { AppStore } from '../store/reducers';
import { connect } from 'react-redux';
import { colors, scale, verticalScale, AppFonts, ButtonDimensions, TextSize } from '../styles/App.style';
import * as localesHelperActions from '../store/localesHelper/actions';
import { STORAGE } from '../containers/App';

const introSlides = [
  {
    key: '1',
    title: 'intro.community.title',
    text: 'intro.community.text',
    image: require('../../resources/images/sigle.png')
  },
  {
    key: '2',
    title: 'intro.measures.title',
    text: 'intro.measures.text',
    image: require('../../resources/images/intro/measures.png')
  },
  {
    key: '3',
    title: 'intro.dataSharing.title',
    text: 'intro.dataSharing.text',
    image: require('../../resources/images/intro/dataSharing.png')
  },
  {
    key: '4',
    title: 'intro.research.title',
    text: 'intro.research.text',
    image: require('../../resources/images/intro/research.png')
  }
];

interface PropsType {
  navigation?: StackNavigationProp<any>;
  localesHelper: LocalesHelper;
  changeAppLanguage: (lang: string)=> void;
  onSkip?: () => void;
  onDone?: () => void;
  showOnlyNotificationPermission: boolean;
}

class IntroSlide extends Component<PropsType> {
  _slider: any;
  currentSlide: number = 0;
  displayNotificationPermission: boolean = true;
  slides: {
    key: string;
    title: string;
    text: string;
    image: any;
  }[] = [];

  constructor(props: PropsType) {
    super(props);

    if (this.props.showOnlyNotificationPermission) {
      // In this mode, only the permission slide is shown
      this.addNotificationPermissionSlide();
    } else {
      // Show all intro slides...
      this.slides = introSlides.slice();
      if (Platform.OS === 'android') {
        // Android doesn't have a screen for asking the user notifications permission
        this.displayNotificationPermission = false;
      } else {
        // ... and eventually additionally the permission slide
        this.checkDisplayNotificationPermission();
      }
    }
  }

  async checkDisplayNotificationPermission(){
    await AsyncStorage.getItem(STORAGE.ASK_NOTIFICATIONS_PERMISSION).then((value) =>{
      if(value !== null){
        this.displayNotificationPermission = false;
      }
    })

    if(this.displayNotificationPermission){
      this.addNotificationPermissionSlide();
    }
  }

  addNotificationPermissionSlide(){
    this.slides.push({
      key: '5',
      title: 'common.notifications.title',
      text: 'intro.notifications.text',
      image: require('../../resources/images/intro/notifications.png'),
    });
  }

  updateCurrentSlide(pageNum : number, prevNum : number){
    this.currentSlide = pageNum;
  }

  async requestNotificationAutorisations(){
    AsyncStorage.setItem(STORAGE.ASK_NOTIFICATIONS_PERMISSION , Date.now().toString());
    await messaging().requestPermission();

    this._onDone();
  }

  /* Intro should be closed, either on pressing "OK" button or "Later" / "Allow" for notification authorization */
  _onDone() {
    // call then passed onDone method or just navigate back when no method passed (e.g. when calling the intro from the dasboard)
    if (this.props.onDone != undefined)
      this.props.onDone()
    else if (this.props.navigation != undefined)
      this.props.navigation.goBack();
  };

  _renderNotificationPermissionButton = () => {
    return (
      <Button style={styles.button} onPress={this.requestNotificationAutorisations.bind(this)}>
        <Text style={styles.buttonText}>
          {this.props.localesHelper.localeString('common.notifications.allow')}
        </Text>
      </Button>
    );
  };

  _renderItem = ({ item }) => {
    return (
      <View
        style={styles.viewItem}>
        <View style={styles.viewTitle}>
          <Text style={styles.title}>
            {this.props.localesHelper.localeString(item.title)}
          </Text>
        </View>
        <View style={styles.viewImage}>
          <Image style={styles.image} source={item.image} resizeMode="contain"/>
        </View>
        <View style={styles.viewText}>
          <Text style={styles.text}>
            {this.props.localesHelper.localeString(item.text)}
          </Text>
          {item.key === '5' &&
            <>
            <Button
              style={[styles.button, {marginTop: scale(25), marginBottom: '4%', backgroundColor: colors.primarySemiLight}]}
              onPress={this._onDone.bind(this)}>
              <Text style={[styles.buttonText, {color: colors.primaryNormal, fontSize: scale(TextSize.small)}]}>
                {this.props.localesHelper.localeString('intro.notifications.later')}
              </Text>
            </Button>
            {this.props.showOnlyNotificationPermission &&
              this._renderNotificationPermissionButton()
            }
            </>
          }
        </View>
      </View>
    );
  };

  _renderDoneButton = () => {
    if (this.displayNotificationPermission) {
      return (
        // Ask for permission to send notifications.
        // Hint: when only this page of the intro is displayed, the "ok" button must NOT be shown!
        !this.props.showOnlyNotificationPermission &&
          this._renderNotificationPermissionButton()
      );
    } else {
      return (
        <Button style={styles.button} onPress={this._onDone.bind(this)}>
          <Text style={styles.buttonText}>
            {this.props.localesHelper.localeString('common.ok')}
          </Text>
        </Button>
      );
    }
  };

  _renderNextButton = () => {
    return (
      <Button style={styles.button} onPress={() => this._slider.goToSlide(this.currentSlide + 1, true)}>
        <Text style={styles.buttonText}>
          {this.props.localesHelper.localeString('common.next')}
        </Text>
      </Button>
    );
  };

  _renderSkipButton = () => {
    return (
      <Button style={styles.button} onPress={this.props.onSkip}>
        <Text style={styles.buttonText}>
          {this.props.localesHelper.localeString('common.skip')}
        </Text>
      </Button>
    );
  };

  render() {
      return (
        <AppIntroSlider
          ref={(ref: AppIntroSlider) => this._slider = ref}
          data={this.slides}
          renderItem={this._renderItem}
          onSlideChange={this.updateCurrentSlide.bind(this)}
          activeDotStyle={{backgroundColor: colors.primaryNormal}}

          bottomButton
          showNextButton={true}
          renderNextButton={this._renderNextButton.bind(this)}

          renderDoneButton={this._renderDoneButton}

          showSkipButton={false}
          renderSkipButton={this._renderSkipButton}
          onSkip={this.props.onSkip}
        />
      );
  }
}

const styles = StyleSheet.create({
  viewItem: {
    height: '82%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  viewTitle: {
    flex: verticalScale(0.8),
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '80%'
  },
  viewImage: {
    flex: scale(1.2),
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  viewText: {
    flex: verticalScale(1),
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '80%'
  },
  image: {
      width: verticalScale(180)
  },
  title: {
    fontFamily: AppFonts.normal,
    fontSize: scale(30),
    marginBottom: verticalScale(10)
  },
  text: {
    fontFamily: AppFonts.normal,
    fontSize: scale(TextSize.small),
    marginHorizontal: '5%',
    marginTop: verticalScale(20),
    textAlign: 'center'
  },
  button:{
    backgroundColor: colors.primaryNormal,
    borderRadius: ButtonDimensions.largeButtonBorderRadius,
    alignSelf: 'center',
    width: 0.65 * Dimensions.get('window').width,
    height: ButtonDimensions.largeButtonHeight,
    marginVertical: '2%'
  },
  buttonText:{
    color: colors.white,
    fontFamily: AppFonts.normal,
    fontSize: scale(TextSize.small),
    width: '100%',
    textAlign: 'center'
  }
});

function mapStateToProps(state: AppStore) {
  return {
      localesHelper : state.LocalesHelperStore
  };
}

function mapDispatchToProps(dispatch: any) {
  return {
      changeAppLanguage: (newLang: string) => localesHelperActions.updateAppLanguage(dispatch, newLang),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(IntroSlide);
