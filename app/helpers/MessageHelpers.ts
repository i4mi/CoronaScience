import { Platform } from 'react-native';
import { Toast } from 'native-base';
import { colors } from '../styles/App.style';

class MessageHelper {
    static showToast(message : string, type : ToastType = ToastType.SUCCESS) : void {
        let bgColor = colors.primaryNormal; // defaut color for SUCCESS
        switch( type ){
            case ToastType.WARNING: bgColor = colors.warning; break;
            case ToastType.DANGER:  bgColor = colors.alert; break;
        }

        Toast.show({
            text: message,
            duration: 5000,
            type: type,
            style: {
                backgroundColor: bgColor,
                marginBottom: Platform.OS === 'ios' ? 50: 0
            },
            textStyle: {
              textAlign: 'center'
            }
        });
    }
}

export enum ToastType{
    SUCCESS = 'success',
    WARNING = 'warning',
    DANGER = 'danger'
}

export default MessageHelper;
