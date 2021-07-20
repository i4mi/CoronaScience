import * as React from 'react';
import { colors, moderateScale, TextSize, AppFonts } from '../styles/App.style';
import { StyleSheet, Image } from 'react-native';
import { View, Text, Card, CardItem, Body } from 'native-base';
import 'intl';

interface PropsType {
    flex: number,
    text: string,
    icon: string,
    count: number
}

interface StateType {
    initInfoNumber : number;
    currentInfoNumber: number;
    intervalId: any;
}

const standardIconSize = 50;

/**
 * Component to display a numerical value with a description text and an icon
 **/
export default class InfoCard extends React.Component<PropsType, StateType> {
    _mounted = false;

    constructor(props: PropsType) {
        super(props);
        this.state = {
            initInfoNumber: this.props.count,
            currentInfoNumber: 0,
            intervalId: setInterval(this.updateInfoNumber.bind(this), 300 * (Math.random()))
        }
    }

    componentDidMount() {
        this._mounted = true;
    }

    componentDidUpdate(){
      if(this.state.initInfoNumber != this.props.count){
        this.setState({
          initInfoNumber: this.props.count,
          currentInfoNumber: 0,
          intervalId: setInterval(this.updateInfoNumber.bind(this), 300 * (Math.random()))
        });
      }
    }

    componentWillUnmount() {
        this._mounted = false;
    }

    updateInfoNumber() {
        if(this._mounted && this.state.currentInfoNumber < this.props.count) {
            let increment = this.state.currentInfoNumber + Math.floor(Math.random() * 3);
            const newValue = Math.min(this.state.currentInfoNumber + increment, this.props.count);            
            this.setState({
                currentInfoNumber: newValue
            });
        } else {
          clearInterval( this.state.intervalId );
        }
    }

    render () {
      return (
          <Card transparent style={{flex: this.props.flex, marginTop: 5}}>
            <CardItem style={[styles.cardItem]}>
              <Body>
                <View style={{flexDirection: 'row'}}>
                  <View style={[styles.infoCardIconBackground]}>
                    <Image
                      style={[styles.infoCardImage]}
                      resizeMode='contain'
                      source={ this.props.icon }
                    />
                  </View>
                  <View style={{flex:1, flexDirection: 'column'}}>
                    <Text style={[styles.infoCardNumber, {fontSize: 0.8 * TextSize.big, paddingTop: (TextSize.very_big - 0.8 * TextSize.big) / 2}]}>
                      {new Intl.NumberFormat("de-CH", {useGrouping: true}).format(this.state.currentInfoNumber).replace(' ', '\'')}
                    </Text>
                    <Text style={[styles.infoCardText]}>
                             {this.props.text}</Text>
                  </View>
                </View>
              </Body>
            </CardItem>
          </Card>
      );
    }
  }

const styles = StyleSheet.create({
    infoCardIconBackground: {
      alignContent: 'center',
      justifyContent: 'center',
      width: moderateScale(standardIconSize),
      height: moderateScale(standardIconSize)
    },
    infoCardImage: {
      width: '100%',
      height: '100%'
    },
    infoCardNumber: {
      color: colors.black,
      fontFamily: AppFonts.normal,
      fontSize: TextSize.very_big,
      paddingLeft: moderateScale(10)
    },
    infoCardText: {
      color: colors.mediumGray,
      fontFamily: AppFonts.light,
      fontSize: moderateScale(TextSize.very_small),
      fontWeight: 'normal',
      marginTop: -2,
      paddingLeft: moderateScale(10)
    },
    cardItem:{
      /* has to be set to 0, the default CardItem padding has to be overwritten */
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0
    }
  });
