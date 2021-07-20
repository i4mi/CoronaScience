import React, { Component } from 'react';
import ModalBaseScene from './ModalBaseScene';
import AppStyle, {colors, TextSize} from '../styles/App.style';
import {StyleSheet, View, TouchableOpacity} from 'react-native';
import {Button, Text} from 'native-base'
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import Icon from 'react-native-vector-icons/AntDesign';
import { authorize } from 'react-native-app-auth';
import MiDataServiceStore from '../store/midataService/model';
import * as miDataServiceActions from '../store/midataService/actions';
import { AppStore } from '../store/reducers';
import { connect } from 'react-redux';
import { OAUTH_SERVICE_CONFIG } from '../model/UserSession';
import Config from 'react-native-config';

type PropType = {
  isLoginOpen: boolean;
  onClose: ()=>void;
  miDataServiceStore: MiDataServiceStore
  authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => void
  title: string;
  label: string;
  buttonText: string;
}

class Login extends Component<PropType> {

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
      <ModalBaseScene
        style={styles.view}
        isVisible={this.props.isLoginOpen}
        onSwipeComplete={this.props.onClose}>
        <View>
          <Svg width='100%' height='250'>
            <Defs>
              <LinearGradient id="linearMain" x1="0" y1="100%" x2="0" y2="0">
                  <Stop offset="0" stopColor={colors.headerGradientBegin}/>
                  <Stop offset="1" stopColor={colors.headerGradientEnd}/>
              </LinearGradient>
            </Defs>
            <Rect x='0' y='0' width='100%' height='100%' fill='url(#linearMain)'/>
          </Svg>
          <View style={styles.viewContainer}>
            <TouchableOpacity onPress={this.props.onClose} style={{right:20, top:-4, position: "absolute"}}>
                <Icon name='close' color={colors.white} size={25} />
            </TouchableOpacity>
            <Text style={styles.titleText}>
              {this.props.title}
            </Text>
            <Text style={styles.mainText}>
              {this.props.label}
            </Text>
            <Button style={[AppStyle.button, styles.button]} onPress={this.login.bind(this)}>
              <Text style={[AppStyle.textButton]}>
                {this.props.buttonText}
              </Text>
            </Button>
          </View>
        </View>
      </ModalBaseScene>
    );
  }
}

const styles = StyleSheet.create({
  view: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  viewContainer: {
    padding: 10,
    left:20,
    top: 25,
    position: "absolute"
  },
  titleText: {
    left: 40,
    top: -5,
    position: "absolute",
    fontSize: TextSize.big,
    textAlign: "center",
    color: colors.white,
    width: '80%'
  },
  mainText: {
    color: colors.white,
    fontSize: TextSize.normal,
    textAlign: "center",
    width: '95%',
    top: 50,
    position: "absolute",
  },
  button:{
    top: 125,
    width: '95%'
  }
});

function mapStateToProps(state: AppStore) {
  return {
      miDataServiceStore: state.MiDataServiceStore
  };
}

function mapDispatchToProps(dispatch: any) {
  return {
      authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => miDataServiceActions.authenticateUser(dispatch, accessToken, accessTokenExpirationDate, refreshToken, server)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
