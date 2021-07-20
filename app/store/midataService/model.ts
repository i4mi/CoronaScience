import Config from 'react-native-config';
import UserSession from '../../model/UserSession';
import Exception from '../../model/Exception';
import { Bundle, Resource, Observation, ObservationStatus, Patient, QuestionnaireResponse } from "@i4mi/fhir_r4";
import UserProfile from '../../model/UserProfile';
import moment from 'moment';
import { UserProfileServiceExceptionCodes } from '../../services/UserProfileService'

export const MiDataServiceExceptionCodes = {
    USER_NOT_VALID: "USER_NOT_VALID",
    NETWORK_ISSUE: "NETWORK_ISSUE",
}

class MiDataServiceStore {
    currentSession: UserSession = new UserSession();
    pendingResources : Array<{resource : Resource, isUploading : boolean, mustBeSynchronized : boolean}> = new Array<{resource : Resource, isUploading : boolean, mustBeSynchronized : boolean}>();

    readonly OBSERVATION_ENDPOINT = "/fhir/Observation";
    readonly USER_AGE_CATEGORY_ENDPOINT = this.OBSERVATION_ENDPOINT + "?code=46251-5";
    readonly PATIENT_ENDPOINT = "/fhir/Patient";
    readonly PERSONAL_SITUATION_ENDPOINT = "/fhir/QuestionnaireResponse?questionnaire:below=http://fhir.ch/ig/covid-19-prom/Questionnaire/coronascience-situation-questions-QS1&_sort=-authored&_count=1";

    constructor(miDataServiceStore?: MiDataServiceStore) {
        if (miDataServiceStore) {
            this.currentSession = new UserSession(miDataServiceStore.currentSession);

            if(miDataServiceStore.hasOwnProperty('pendingResources') ){
                this.setPendingResources( miDataServiceStore.pendingResources );
            }
        }
    }
    /**
     * This function modify the store. Do not run it outside of a reducer.
     * @param accessToken
     * @param accessTokenExpirationDate
     * @param refreshToken
     */
    public authenticateUser(accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) {
        this.currentSession.updateToken(accessToken, accessTokenExpirationDate, refreshToken, server);
    }

    /**
     * This function modify the store. Do not run it outside of a reducer.
     */
    public logoutUser() {
        this.currentSession.resetToken();
        this.pendingResources = new Array<{resource : Resource, isUploading : boolean, mustBeSynchronized : boolean}>(); // delete all pending (not uploaded) resources // TODO : warn the user before logout
    }

    public isAuthenticated() {
        return this.currentSession.isTokenValid();
    }

    public async getUserProfile() : Promise<UserProfile> {
        // TODO : try/catch when user's token no more valid!
        return await this.fetch(this.PATIENT_ENDPOINT, 'GET').then(async (patientResponseBundle : Bundle) => {
            if(patientResponseBundle.entry === undefined)
                throw new Exception(UserProfileServiceExceptionCodes.BAD_USER, 'No user returned', patientResponseBundle);
            // Parsing of entry :
            try {
                // on part du principe que la première entrée est la bonne
                let patientResource = patientResponseBundle.entry[0].resource as Patient;

                let personalSituation = await this.fetch(this.PERSONAL_SITUATION_ENDPOINT, 'GET').then((situationResponseBundle : Bundle) : QuestionnaireResponse | undefined => {
                    if(situationResponseBundle.entry !== undefined){
                        return situationResponseBundle.entry[0].resource as QuestionnaireResponse;
                    }else{
                        return undefined;
                    }
                });
                if (personalSituation !== undefined) {
                    return new UserProfile({patientData: patientResource, profileQuestionnaireReponse: personalSituation});
                } else {
                    return new UserProfile({patientData: patientResource});
                }
            } catch (error) {
                const message = "UserProfileService : error while parsing userProfile. ";
                throw new Exception(UserProfileServiceExceptionCodes.BAD_USER, message, error)
            }
        });
    }

    private setPendingResources(_resources: Array<{resource : Resource, isUploading : boolean, mustBeSynchronized : boolean}>) {
        this.pendingResources = new Array<{resource : Resource, isUploading : boolean, mustBeSynchronized : boolean}>();
        if (_resources) { // TODO : is it necessary?
            _resources.forEach(resource => {
                this.pendingResources.push(resource);
            });
        }
    }

    public async fetch(endpoint: string, method = 'GET', body: string|undefined = undefined) : Promise<Bundle> {

        let headersContent = {
            'Accept': 'application/json',
            'Content-Type': 'application/fhir+json; fhirVersion=4.0',
            'Authorization': ''
        }

        if(!endpoint.startsWith(Config.OPEN_DATA_URL)){
            // get valid token:
            const accessToken = await this.currentSession.getValidAccessToken();
            if (!accessToken) {
                throw new Exception(MiDataServiceExceptionCodes.USER_NOT_VALID, 'Can\'t fetch when no user logged in first or token is no longuer valid.', null);
            }
            headersContent.Authorization = 'Bearer ' + accessToken;
        }

        //return Promise.reject();
        return fetch( `${Config.HOST}${endpoint}`, {
            method: method,
            headers: headersContent,
            body: body
        }).then(response => {
            if (response.status >= 200 && response.status < 300) {
                return response.text().then(responseText => {
                    return Promise.resolve( JSON.parse(responseText) as Bundle );
                }).catch(_e => {
                    throw new Exception(MiDataServiceExceptionCodes.NETWORK_ISSUE, "Unknow server response with status : " + response.status, response);
                });
            } else {
                throw new Exception(MiDataServiceExceptionCodes.NETWORK_ISSUE, "Bad response with status : " + response.status, response);
            }
        }
        ).catch((e => {
            throw new Exception(MiDataServiceExceptionCodes.NETWORK_ISSUE, "Can't reach server.", e);
        }));
    }

    async checkAgeGroup( _userProfile: Patient | undefined ) : Promise<Observation | undefined> {
        if( _userProfile === undefined)
            return undefined;

        // TODO : try/catch when user's token no more valid!
        return await this.fetch(this.USER_AGE_CATEGORY_ENDPOINT, 'GET').then((response) => {

            // user range
            let year = moment(_userProfile.birthDate).year();
            let bottomRange = year - ( year % 5);
            let highRange = moment().year(bottomRange).add( 4, "y").year();

            if(response.total < 1){
                // new have to register a new Observation, not registred until now
                let ageObservation : Observation = {
                    resourceType: 'Observation',
                    status: ObservationStatus.PRELIMINARY,
                    category: [{
                        "coding" : [
                        {
                            "system" : "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code" : "social-history",
                            "display" : "Social History"
                        }
                        ]
                    }],
                    "code" : {
                    "coding" : [
                        {
                        "system" : "http://loinc.org",
                        "code" : "46251-5",
                        "display" : "Age group"
                        }
                    ]},
                    effectiveDateTime: moment().toISOString(),
                    "valueRange": {
                        "low": {
                          "value": bottomRange,
                          "unit": "a",
                          "system" : "http://unitsofmeasure.org",
                          "code" : "a"
                        },
                        "high": {
                          "value": highRange,
                          "unit": "a",
                          "system" : "http://unitsofmeasure.org",
                          "code" : "a"
                        }
                    }

                };
                try{
                    this.fetch( this.USER_AGE_CATEGORY_ENDPOINT, 'POST', JSON.stringify(ageObservation));
                }catch(e){}

                return ageObservation;
            }else{
                let observation = response.entry[0].resource as Observation;
                if(observation.valueRange?.low?.value !== bottomRange || observation.valueRange?.high?.value !== highRange){
                    // we have to update the Observation!
                    observation.valueRange.low.value = bottomRange;
                    observation.valueRange.high.value = highRange;

                    try{
                        // TODO : try/catch when user's token no more valid!
                        this.fetch( this.OBSERVATION_ENDPOINT + '/' + observation.id, 'PUT', JSON.stringify(observation));
                    }catch(e){}
                }
                return observation;
            }
        }).catch((error) => {
            console.warn(error);
            return undefined;
        });
    }
}

export default MiDataServiceStore;
