/**
 * @format
 */
import React from 'react';
import {AppRegistry, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App, { NOTIFICATION_ACTION, NOTIFICATION_TOPIC, STORAGE } from './app/containers/App';
import {name as appName} from './app.json';
import notifee from '@notifee/react-native';
import {colors} from './app/styles/App.style'
import AsyncStorage from '@react-native-community/async-storage';

export const ONE_DAY = 24 * 60 * 60 * 1000; // in [ms]

// Register background handler for FCM notification handling
messaging().setBackgroundMessageHandler(async remoteMessage => {
    if( __DEV__)
        console.log(JSON.stringify(remoteMessage));

    for (let key of Object.keys(remoteMessage.data)) {
        console.log('Typeof: ' + typeof key);

        // FCM server allow us to send only key value -> JSON to string is send as value, we have to parse the string in object
        if( key !== 'topic' )
            remoteMessage.data[key] = JSON.parse(remoteMessage.data[key]);
    }

    let appLanguage = 'en';

    return AsyncStorage.getItem('app-Language').then((value) =>{
        if(value !== undefined){
            appLanguage = value;
        }

        switch(remoteMessage.data.topic.toString()){
            case NOTIFICATION_TOPIC.GENERAL: return notifyGeneral(NOTIFICATION_TOPIC.GENERAL, remoteMessage.data.title[appLanguage], remoteMessage.data.body[appLanguage]);
                break;
            case NOTIFICATION_TOPIC.REMINDER: return notifyWithAction(NOTIFICATION_TOPIC.REMINDER, remoteMessage.data.title[appLanguage], remoteMessage.data.body[appLanguage], remoteMessage.data.button[appLanguage], NOTIFICATION_ACTION.HEALTH_STATUS);
                break;
            case NOTIFICATION_TOPIC.QUESTION_OF_THE_DAY: return notifyWithAction(NOTIFICATION_TOPIC.QUESTION_OF_THE_DAY, remoteMessage.data.title[appLanguage], remoteMessage.data.body[appLanguage], remoteMessage.data.button[appLanguage], NOTIFICATION_ACTION.QUESTION_OF_THE_DAY);
                break;
        }
    });

});

function notifyGeneral(_channelID, _title, _body){
    return notifee.createChannel({
        id: _channelID,
        name: _channelID,
    }).then((channelId)=>{
        notifee.displayNotification({
            title: _title,
            body: _body,
            android: {
                channelId,
                color: colors.primaryNormal,
                pressAction: {
                                id: 'default',
                                launchActivity: 'default'
                             },
                smallIcon: 'notification_icon'
            }
        });
    });
}

function notifyWithAction(_channelID, _title, _body, _button, _actionId){

    if(_channelID === NOTIFICATION_TOPIC.REMINDER){
        AsyncStorage.getItem(STORAGE.LAST_HEALTH_STATUS_UPDATE).then((value) =>{
            try{
                if( Date.now() - value <= ONE_DAY){
                    return Promise.resolve(); // check if the "Health Status" was answered last 24 hours. If true, don't display a notification!
                }
            }catch(error){}
          })
    }

    if(_channelID === NOTIFICATION_TOPIC.QUESTION_OF_THE_DAY){
        AsyncStorage.getItem(STORAGE.QUESTION_OF_THE_DAY_ANSWERED).then((value) =>{
            try{
                if(value !== 'false'){
                    return Promise.resolve(); // check if the current "Question of the Day" was already answered. If true, don't display a notification!
                }
            }catch(error){}
          })
    }

    if(Platform.OS === 'ios'){
        return notifee.setNotificationCategories([
            {
              id: _channelID,
              actions: [
                {
                  id: _actionId,
                  title: _button,
                  foreground: true
                }
              ]
            }
          ]).then(() => {
            notifee.displayNotification({
                title: _title,
                body: _body,
                ios: {
                    categoryId: _channelID
                  }
            });
        });
    }else{
        return notifee.createChannel({
            id: _channelID,
            name: _channelID,
        }).then((channelId)=>{
            notifee.displayNotification({
                title: _title,
                body: _body,
                android: {
                    channelId,
                    color: colors.primaryNormal,
                    pressAction: {
                                    id: 'default',
                                    launchActivity: 'default'
                                 },
                    smallIcon: 'notification_icon',
                    actions: [
                    {
                        title: _button,
                        pressAction: {
                            id: _actionId,
                            launchActivity: 'default'
                        }
                    }
                    ]
                }
            });
        });
    } 
}

function HeadlessCheck({ isHeadless }) {
  return isHeadless ? null : <App />;
}

AppRegistry.registerComponent(appName, () => HeadlessCheck);
