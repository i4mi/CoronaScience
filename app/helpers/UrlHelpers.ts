import { Linking }  from 'react-native';

class UrlHelper {

    static encodeData(data: Map<string, string>): string {
        return Object.keys(data).map(function(key: string) {
            const dataAny: any = data; // prevent TSX bad error
            return [key, dataAny[key]].map(encodeURIComponent).join("=");
        }).join("&");
    } 

    static openURL( _url : string) {
        Linking.canOpenURL(_url).then(supported => {
            if (supported) {
              Linking.openURL(_url);
            } else {
              console.warn("Don't know how to open URI: " + _url);
            }
        });
    }
}

export default UrlHelper;