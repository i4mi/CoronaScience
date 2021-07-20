import * as React from 'react';
import AppStyle, {colors} from '../styles/App.style';
import { View, Text } from 'native-base';
import { TouchableOpacity } from 'react-native';
import Dash from 'react-native-dash';
import Exception from '../model/Exception';

interface PropsType {
    label: string
    possibleResponses: Array<{"value": string, "isSelected": boolean}>
    onValueChange: (value: string)=> void;
}

export default class BubbleSymptom extends React.Component<PropsType>{

    bubbles = new Array<{radius: number, color: string, value: string, isSelected: boolean}>();
    indexBubbleActive : number = -1;

    constructor(props: PropsType) {
        super(props);

        if(this.props.possibleResponses.length < 2){
            throw new Exception("-1", "Minimum possibleResponses must be greater than 2", undefined);
        }
    }

    renderBubble( _item : {radius: number, color: string, value: string, isSelected: boolean}, index: number ){
        return (
                <TouchableOpacity style={{
                                    width: _item.radius * 2,
                                    height: _item.radius * 2,
                                    borderRadius: _item.radius,
                                    borderColor: colors.black,
                                    borderWidth: 1.2,
                                    backgroundColor: _item.isSelected ? _item.color : 'transparent',
                                    alignSelf: 'baseline' }}
                                    onPress={() => {
                                        this.props.onValueChange( _item.value );
                                    }}
                                    activeOpacity={1}
                                    hitSlop={{top: 15, bottom: 15, left: 10, right: 10}}
                                    key={_item.value + index}
                                    />
        );
    }

    render(){
        this.props.possibleResponses.forEach((possibleResponse, index) => {
            if(possibleResponse.isSelected)
                this.indexBubbleActive = index;
        });

        this.props.possibleResponses.forEach((possibleResponse, index) => {
            let isSelected : boolean = index <= this.indexBubbleActive;
            if(index === 0){
                isSelected = this.indexBubbleActive <= 0
            }

            this.bubbles[index] =
                {
                    // radius: 0->6, 1->8, 2->10, 3->12
                    "radius": 6+2*index,
                    "color": index == 0 ? colors.primaryNormal : colors.secondaryNormal,
                    "value": possibleResponse.value,
                    "isSelected": isSelected
                }
            ;
        });
        return (
            <>
            <View style={{marginVertical: '1%', marginTop: 20}}>
                <View style={{flexDirection: 'row', justifyContent:'space-between', width:'100%'}}>
                    <Text style={[AppStyle.textQuestion, {flex:1, alignSelf: 'baseline', marginRight: 10}]}>
                        {this.props.label}
                    </Text>
                    <View style={{flex:1, flexDirection: 'row', justifyContent:'space-between', alignSelf: 'baseline'}}>
                        {
                            this.bubbles.map( (item, index) =>  {
                                return this.renderBubble( item, index )
                            })

                        }
                    </View>
                </View>
                <Dash style={{width:'100%', marginTop: 2}} dashThickness={1} dashLength={1} dashGap={2}/>
            </View>
            </>
        );
    }
}
