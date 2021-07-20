import React, { Component } from 'react';
import { View, Text } from 'native-base';
import Slider from '@react-native-community/slider';
import AppStyle, { colors } from '../styles/App.style';

interface PropsType {
    minimum: number;
    maximum: number;
    unit?: string;
    value: number;
    onValueChanged(func: value) : void;
}

interface State {
    label : number[];
    value : string;
}

class LabeledSlider extends Component<PropsType, State>{
    constructor(props: PropsType) {
        super(props);

        let _label = [];
        for (let i = this.props.minimum; i <= this.props.maximum; i++) {
            _label.push(i);
        }

        this.state = {
            value: this.props.value,
            label: _label
        };
    }

    render(){
        return(
            <View>
                <Text style={[AppStyle.textQuestion, {color: colors.secondaryNormal, alignSelf: 'center', marginTop: 10}]}>
                    {this.state.value} {this.props.unit}
                </Text>
                <Slider
                    style={{width: '100%', height: 40}}
                    minimumValue={this.props.minimum - 0.1}
                    maximumValue={this.props.maximum + 0.1}
                    step={0.1}
                    value={this.props.value}
                    thumbTintColor={colors.secondaryNormal}
                    minimumTrackTintColor={colors.secondaryNormal}
                    maximumTrackTintColor={colors.mediumGray}
                    onValueChange={temperature => {
                      if(temperature < this.props.minimum)
                        temperature = '<' + this.props.minimum;
                      else if(temperature > this.props.maximum)
                        temperature = '>' + this.props.maximum;
                      else
                        temperature = Math.round(temperature * 10)/10;

                      this.setState({value: temperature});
                    }}
                    onSlidingComplete={temperature => { this.props.onValueChanged( Math.round(temperature * 10)/10 );}}
                />
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: -8, marginRight: "3.5%", marginLeft: "3.5%"}}>
                {
                    this.state.label.map( (item) =>
                        <Text style={[AppStyle.textQuestion, {color: colors.mediumGray}]} key={item}>{item}</Text>
                    )
                }
                </View>
            </View>
        )
    }
}

export default LabeledSlider;
