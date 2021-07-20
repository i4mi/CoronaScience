import * as React from 'react';
import {View} from 'native-base';
import { colors } from '../styles/App.style';

export const Separator: React.FunctionComponent = ({}) =>
    <View
        style={{
            borderBottomColor: colors.primaryDark,
            borderBottomWidth: .9,
            marginTop: 12,
            marginBottom: 12,
        }}
    />;