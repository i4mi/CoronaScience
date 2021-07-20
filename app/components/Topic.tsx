import React, { Component } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { View, Text } from 'native-base';
import AppStyle from '../styles/App.style';
import UrlHelper from '../helpers/UrlHelpers';
import Dash from 'react-native-dash';

interface TopicProps {
  name: string;
  url: string;
}

export default class Topic extends Component<TopicProps> {

  render() {
    return (
      <>
        <TouchableOpacity onPress={() => UrlHelper.openURL(this.props.url)}>
          <View style={{ flexDirection: 'row', marginVertical: '4%' }}>
            <View style={{ flex: 4 }}>
              <Text style={AppStyle.textInfo}>{this.props.name}</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row-reverse' }}>
              <Image style={{ height: 20, width: 20 }} source={require("../../resources/images/dashboard/letsGo.png")} />
            </View>
          </View>
        </TouchableOpacity>
        <Dash style={{ width: '100%' }} dashThickness={1} dashLength={1} dashGap={2} />
      </>
    );
  }

}
