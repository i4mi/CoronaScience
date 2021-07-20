import React, { Component } from 'react';
import { ScrollView } from 'react-native';
import { View, Text } from 'native-base';
import AppStyle, { colors, verticalScale } from '../styles/App.style';
import { HeaderBanner } from '../components/HeaderBanner';
import LocalesHelper from '../locales';
import { AppStore } from '../store/reducers';
import { connect } from 'react-redux';
import { INFORMATION_SITES } from '../../resources/static/informationSites';
import remoteConfig from '@react-native-firebase/remote-config';
import UrlHelper from '../helpers/UrlHelpers';
import Dash from 'react-native-dash';
import Topic from '../components/Topic';

interface PropsType {
  localesHelper: LocalesHelper
}

interface State {
  informationSites: Object
}

class Information extends Component<PropsType, State> {

  constructor(props: PropsType) {
    super(props);

    this.state = {
      informationSites: INFORMATION_SITES
    };

    this.checkDataStatus();
  }

  async checkDataStatus() {
    try {
      await remoteConfig().setDefaults({
        information_sites: this.state.informationSites as string
      });

      await remoteConfig().setConfigSettings({
        isDeveloperModeEnabled: __DEV__
      });

      await remoteConfig().fetch();
      const activated = remoteConfig().activate();
      // const activated = await remoteConfig.remoteConfig().fetchAndActivate(); -> not always working

      if (activated) {
        const informationSitesData = remoteConfig().getValue('information_sites');

        if (__DEV__) {
          console.log("Parameter information sites value: " + informationSitesData.value);
          if (informationSitesData.source === 'remote') {
            console.log('Parameter value was from the Firebase servers.');
          } else if (informationSitesData.source === 'default') {
            console.log('Parameter value was from a default value.');
          } else {
            console.log('Parameter value was from a locally cached value.');
          }
        }
        if (informationSitesData.source !== 'default') {
          this.setState({ informationSites: JSON.parse(informationSitesData.value as string) });
        }
      } else {
        //console.log('Defaults set, however activation failed.');
      }
    } catch (err) { }
  }

  render() {
    var key = 0;
    return (
      <View style={{ backgroundColor: colors.pageBackground, flex: 1 }}>
        <HeaderBanner title={this.props.localesHelper.localeString('information.title')} />
        <ScrollView
          style={[AppStyle.contentPadding]}
          alwaysBounceVertical={false}
          contentInsetAdjustmentBehavior="automatic">
          {INFORMATION_SITES.map((language, index) => {
            if (language.lang == this.props.localesHelper.getCurrentLanguage()) {
              return (
                <View style={{ paddingBottom: 40 }} key={key++} >
                  {language.section.map((section, index) => {
                    return (
                      <View style={index == 0 ? {} : { marginTop: verticalScale(40) }} key={key++}>
                        <View key={key++}>
                          <Text style={[AppStyle.sectionTitle]}>
                            {section.title}
                          </Text>
                        </View>
                        <View key={key++}>
                          {section.infoLineLabel !== (undefined || '') && section.infoLineNumber !== (undefined || '') &&
                            <Text style={[AppStyle.textHint, { marginTop: 10, marginBottom: 5 }]}>
                              {section.infoLineLabel}: <Text style={[AppStyle.textHint]} onPress={() => UrlHelper.openURL('tel:' + section.infoLineNumber.replace(/\s/g, ""))}>{section.infoLineNumber}</Text>
                            </Text>
                          }
                          <Dash style={{ width: '100%', marginTop: verticalScale(15) }} dashThickness={1} dashLength={1} dashGap={2} key={key++} />
                          {section.content.map((site, index) => {
                            return (
                              <Topic name={site.name} url={site.url} key={"topic-" + site.name} />
                            )
                          })}
                        </View>
                      </View>
                    )
                  })}
                </View>
              )
            }
          })}
        </ScrollView>
      </View>
    );
  };
}

function mapStateToProps(state: AppStore) {
  return {
    localesHelper: state.LocalesHelperStore
  };
}

export default connect(mapStateToProps)(Information);
