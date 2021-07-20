import { StyleSheet, Dimensions } from 'react-native';
import { Text } from 'native-base';

export function LoadDefaultComponentStyle() {
    Text.defaultProps.uppercase = false;
}

// Screen size (iPhone 5: w320/h568/r1.78; iPhone 7: w375/h667/r1.78; iPhone 11: w414/h896/r2.16)
export const windowWidth = Dimensions.get('window').width;
export const windowHeight = Dimensions.get('window').height;

// Scaling method used by Soluto Engineering (see method 3)
//   https://medium.com/soluto-engineering/size-matters-5aeeb462900a
//   https://stackoverflow.com/questions/33628677/react-native-responsive-font-size
//
// Corona Science guideline sizes are based on iPhone 7 screen size
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 667;

export const scale = size => windowWidth / guidelineBaseWidth * size;
export const verticalScale = size => windowHeight / guidelineBaseHeight * size;
export const moderateScale = (size, factor = 0.5) => size + ( scale(size) - size ) * factor;

// Fonts
export const AppFonts = {
    normal: 'RobotoCondensed-Regular',
    light: 'RobotoCondensed-Light',
    bold: 'RobotoCondensed-Bold'
};

// Text sizes
export const TextSize = {
    very_small: 16,
    small: 18,
    normal: 20,
    big: 24,
    very_big: 30
};

// Button sizes
export const ButtonDimensions = {
    actionButtonWidth: 0.4*Dimensions.get('window').width,
    largeButtonHeight: scale(35),
    largeButtonBorderRadius: scale(8),
    padding_small: 10,
    padding_big: 20
};

// Colors
export const colors = {
    black: '#1a1917',
    white: '#FFFFFF',
    lightGray: '#EFEFEF',
    mediumGray: '#888888',
    darkGray: '#666666',
    coronaGray: '#494949',

    pageBackground: '#FFFFFF',

    primaryNormal: '#008aa5',
    primarySemiLight: '#E8F4F7',
    primarySemiDark: '#BADBE3',
    primaryLight: '#FFFFFF',
    primaryDark: '#cccccc',

    secondaryNormal: '#b2304c',

    headerGradientBegin: '#008aa5',
    headerGradientEnd: '#008aa5',

    questionBoxBackground: '#E8F4F7',

    success: '#69C344',
    warning: '#fb8c00',
    alert: '#E8283F',
};

export default StyleSheet.create({
    statusBar: {
        flex: 1,
        backgroundColor: colors.primaryNormal
    },
    contentPadding: {
        paddingHorizontal: '6%',
        paddingTop: '6%'
    },
    contentPaddingHorizonntal: {
        paddingHorizontal: '6%'
    },
    button:{
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.black,
        width: '100%',
        marginTop: 15,
        height: 35
    },
    buttonFilled:{
        backgroundColor: colors.primaryNormal,
        borderWidth: 1,
        borderColor: colors.primaryNormal,
        width: '100%',
        marginTop: 15,
        height: 35,
    },
    textButton:{
        color: colors.secondaryNormal,
        width: '100%',
        textAlign: 'center',
        fontFamily: AppFonts.normal,
        fontSize: TextSize.very_small,
        borderRadius: 10
    },
    textButtonFilled:{
        color: colors.white,
        width: '100%',
        textAlign: 'center',
        fontFamily: AppFonts.normal,
        fontSize: TextSize.very_small,
        borderRadius: 10
    },
    textHint:{
        color: colors.darkGray,
        fontFamily: AppFonts.light,
        fontSize: TextSize.very_small
    },
    textInfo:{
        color: colors.black,
        fontFamily: AppFonts.normal,
        fontSize: TextSize.very_small,
        borderRadius: 10
    },
    textQuestion:{
        fontFamily: AppFonts.light,
        fontSize: TextSize.very_small
    },
    sectionTitle:{
        color: colors.secondaryNormal,
        fontFamily: AppFonts.normal,
        fontSize: TextSize.normal
    }
});
