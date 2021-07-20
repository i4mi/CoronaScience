import { refresh } from 'react-native-app-auth';
import Config from 'react-native-config';
import { authenticateUser } from '../store/midataService/actions';
import { store } from '../store';

export const OAUTH_SERVICE_CONFIG = {
    issuer: Config.HOST + '/fhir',
    clientId: Config.CLIENT_ID,
    redirectUrl: Config.REDIRECT_URL,
    scopes: ['user/*.*'],
    serviceConfiguration: {
        authorizationEndpoint: Config.HOST + Config.AUTHORIZATION_ENDPOINT,
        tokenEndpoint: Config.HOST + Config.TOKEN_ENDPOINT
    }
};

export default class UserSession {
    private accessToken: string | undefined = undefined;
    private accessTokenExpirationDate: string | undefined = undefined;
    private refreshToken: string | undefined = undefined;
    private server: string | undefined = undefined;
    private isCurrentlyRefreshingToken = false;
    private callbacksWhenTokenRefreshed = new Array<(token: string | undefined) => void>();

    constructor(userSession?: UserSession) {
        if (userSession) {
            this.accessToken = userSession.accessToken;
            this.accessTokenExpirationDate = userSession.accessTokenExpirationDate;
            this.refreshToken = userSession.refreshToken;
            this.server = userSession.server;
            if( userSession.server != undefined)
                Config.HOST = userSession.server;
        }
    }

    /**
     * do not call directly, or the new refreshtoken will not be persisted when app is closed and rehydrated
     */
    public updateToken(accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) {
        this.accessToken = accessToken;
        this.accessTokenExpirationDate = accessTokenExpirationDate;
        this.refreshToken = refreshToken;
        this.server = server;
    }

    /**
     * Check validity of the token. Update the token if needed with the refresh token.
     * This method tries to refresh the token with the refresh token and then returns the
     * refreshed token (or undefined if it could not be refreshed, e.g. because the user is
     * not logged in).
     * Returns the valid token if it's valid, or undefined if its not
     */
    public getValidAccessToken(): Promise<string | undefined> {
      return new Promise((resolve, reject) => {
        if (this.isAccessTokenExpired()) {
          if(this.refreshToken !== undefined) {
            if (this.isCurrentlyRefreshingToken) {
              // because we are already refreshing the token, we wait until the
              // initial refresh is done and resolve via callback function
              this.callbacksWhenTokenRefreshed.push(
                (token: string | undefined) => {
                  resolve(token);
                }
              )
            } else {
              // lock token refresh for other requests so they dont interfere
              this.isCurrentlyRefreshingToken = true;
              // need to update in case user switched platform
              this.updateAuthConfig();
              refresh(OAUTH_SERVICE_CONFIG, {
                refreshToken: this.refreshToken,
            }).then((result) => {
                if(result.refreshToken === null || this.server === undefined) {
                    return resolve(undefined);
                } else {
                    // call authenticateUser with dispatch, so refresh token is persisted also when the app rehydrates
                    authenticateUser(store.dispatch, result.accessToken, result.accessTokenExpirationDate, result.refreshToken, this.server);
                    // this.updateToken has to be called also, because pending requests on "old" UserSession could try to refresh using now
                    // invalid refreshToken and cause the app to log out
                    this.updateToken(result.accessToken, result.accessTokenExpirationDate, result.refreshToken, this.server);
                    while(this.callbacksWhenTokenRefreshed.length > 0) {
                        const callback = this.callbacksWhenTokenRefreshed.pop();
                        if(callback) {
                            callback(result.accessToken);
                        }
                    }
                    // now we are done, we can unlock again
                    this.isCurrentlyRefreshingToken = false;
                    return resolve(result.accessToken);
                }
              }).catch((error) => {
                console.warn('UserSession : Can not refresh the user token.', error);
                // resolve the queued promises and then unlock
                while(this.callbacksWhenTokenRefreshed.length > 0) {
                    const callback = this.callbacksWhenTokenRefreshed.pop();
                    if(callback) {
                        callback(undefined);
                    }
                }
                this.isCurrentlyRefreshingToken = false;
                return resolve(undefined);
              });
            }
          } else {
            return resolve(undefined);
          }
        } else {
          return resolve(this.accessToken);
        }
      });
    }

    public resetToken() {
        this.accessToken = this.accessTokenExpirationDate = this.refreshToken = this.server = undefined;
    }

    isTokenValid() {
        if(this.accessToken === undefined && this.refreshToken === undefined) {
            return false;
        } else if(this.refreshToken === undefined) {
            // Check token validity :
            if(this.accessTokenExpirationDate) {
                return !this.isAccessTokenExpired();
            } else
                return false;
        }
        return true;
    }

    isAccessTokenExpired() {
        if(this.accessTokenExpirationDate !== undefined) {
            return new Date(this.accessTokenExpirationDate) < new Date();
        } else {
            return true;
        }
    }

    private updateAuthConfig() {
        OAUTH_SERVICE_CONFIG.issuer = Config.HOST;
        OAUTH_SERVICE_CONFIG.serviceConfiguration = {
            authorizationEndpoint: Config.HOST + Config.AUTHORIZATION_ENDPOINT,
            tokenEndpoint: Config.HOST + Config.TOKEN_ENDPOINT
        }
    }
}
