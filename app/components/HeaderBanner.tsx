import * as React from 'react';
import {View, Text} from "native-base";
import {TouchableOpacity} from 'react-native';
import {colors, TextSize, AppFonts} from '../styles/App.style';
import Icon from 'react-native-vector-icons/AntDesign';

interface PropsType {
    title: string;
    btnClose?: boolean;
    onClose?: () => void;
    btnBack?: boolean;
    onBack?: () => void;
    leftPart? : string;
}

export const HeaderBanner: React.FunctionComponent<PropsType> = ({ title, btnClose = false, onClose, btnBack = false, onBack, leftPart = undefined }) =>
    <View style={{width:'100%', height:60, backgroundColor: colors.headerGradientBegin}}>
            <View style={{top: '3%', flexDirection: 'row', width:'100%'}}>
                <Text style={{  width: '100%',
                                color: colors.white,
                                fontSize: TextSize.big,
                                fontFamily:AppFonts.normal,
                                textAlign: 'center'}}>
                    {title}
                </Text>
                {leftPart !== undefined &&
                <Text style={{  left: -75,
                                color: colors.white,
                                fontSize: TextSize.big,
                                fontFamily:AppFonts.normal,
                                textAlign: 'center'}}>
                    {leftPart}
                </Text>
                }
            </View>

            {btnClose &&
                <TouchableOpacity onPress={onClose} style={{left:20, top: "28%", position: "absolute"}}>
                    <Icon name='close' color={colors.white} size={25} />
                </TouchableOpacity>
            }

            {btnBack &&
                <TouchableOpacity onPress={onBack} style={{left:20, top: "25%", position: "absolute"}}>
                    <Icon name='left' color={colors.white} size={25} />
                </TouchableOpacity>
            }


    </View>
    ;
