import React, { Component } from 'react';
import { StyleSheet, Platform, View, BackHandler } from 'react-native'
import { Button, Text } from 'native-base';
import { connect } from 'react-redux';
import { StackNavigationProp } from '@react-navigation/stack';
import Swiper from 'react-native-swiper'
import Config from 'react-native-config';
import AsyncStorage from '@react-native-community/async-storage';
import { authorize } from 'react-native-app-auth';
import { I4MIBundle, Composition, BundleType, CompositionStatus, CompositionSection, Observation, ObservationStatus, QuantityComparator, BundleHTTPVerb, Resource, BundleEntry } from '@i4mi/fhir_r4';
import moment from 'moment';
import UserProfile from '../model/UserProfile';
import QuestionnaireStore, { QuestionnaireType } from '../model/QuestionnaireDataStore';
import MiDataServiceStore from '../store/midataService/model';
import { AppStore } from '../store/reducers';
import * as miDataServiceActions from '../store/midataService/actions';
import AppStyle, { colors, ButtonDimensions, TextSize } from '../styles/App.style';
import { HeaderBanner } from '../components/HeaderBanner'
import Login from '../components/Login';
import LocalesHelper from '../locales';
import Symptom from './Symptom';
import Questions from './Questions';
import MessageHelper from '../helpers/MessageHelpers';
import { OAUTH_SERVICE_CONFIG } from '../model/UserSession';
import { SYMPTOM_DATA, QUALIFIER_VALUE_ANSWER_OPTIONS } from '../../resources/static/symptoms';
import { COMPOSITION_PATIENTREPORTED_CODEABLE_CONCEPT } from '../../resources/static/codings';
import { SCREEN, STORAGE } from '../containers/App';

interface PropsType {
    navigation: StackNavigationProp<any>
    miDataServiceStore: MiDataServiceStore
    localesHelper: LocalesHelper;
    QuestionnaireStore: QuestionnaireStore;
    userProfile: UserProfile;
    logoutUser: () => void;
    addResource: (r: Resource) => void;
    authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => void
}

interface State {
    numberOfPages : number;
    displayedPage : number;
    symptomsData : typeof SYMPTOM_DATA;
    symptomsDate : Date;
    isRegisterPopupVisible: boolean;
    isPreviouslyLogged: boolean;
    mustUserRelogin: boolean;
    pendingSaveData: boolean;
}

class DataEntry extends Component<PropsType, State>  {

    constructor(props: PropsType){
        super(props);

        this.state = {
            displayedPage: 1,
            numberOfPages: 1 + this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.RECURRING_QUESTIONS ).items.length,
            isRegisterPopupVisible: false,
            mustUserRelogin: false,
            isPreviouslyLogged: props.miDataServiceStore.isAuthenticated(),
            symptomsData: SYMPTOM_DATA,
            symptomsDate: new Date(),
            pendingSaveData: false
        };

        this.props.navigation.addListener('focus', () => {
            if( this.isSymptomEmpty() ){ // only update the date if the form is empty
                this.setState({ symptomsDate : new Date()});
                this.forceUpdate();
            }
        });

        this.setSymptomsPossibleResponses();
        BackHandler.addEventListener('hardwareBackPress', this.handleHardwareBackButtonForAndroid.bind(this));
    }


    handleHardwareBackButtonForAndroid(): boolean {
        if (this.props.navigation.isFocused()) {
            // when dataEntry page is focused, we navigate back
            this.swipePrevious();
            // return true suppresses default back button behaviour (we don't want to navigate back just after navigating ;-) )
            return true;
        } else {
            // else we just let the default behaviour of the back button happen by returning false
            return false;
        }
    }

    static getDerivedStateFromProps(props : PropsType, state : State){
        if(state.isPreviouslyLogged && !props.miDataServiceStore.isAuthenticated() && !state.mustUserRelogin){
            state.isRegisterPopupVisible = false;
            props.navigation.navigate(SCREEN.DASHBOARD);
        }
        state.isPreviouslyLogged = props.miDataServiceStore.isAuthenticated();
        return state;
    }

    componentDidUpdate(){
        if(this.props.miDataServiceStore.isAuthenticated() && this.props.userProfile.isUpToDate()) {
          if(this.state.pendingSaveData){
            this.setState({isRegisterPopupVisible: false});
            this.saveResponsesAsFHIRResource();
          }
        }
    }

    swipeNext(){
        if( this.state.displayedPage < this.state.numberOfPages){
            this.refs.swiper.scrollBy(1);
            this.setState({
                displayedPage: this.state.displayedPage + 1
            });
        }
    }

    swipePrevious(){
        if( this.state.displayedPage > 1){
            this.refs.swiper.scrollBy(-1);
            this.setState({
                displayedPage: this.state.displayedPage - 1
            });
        }
    }

    // for user with iOS < 11
    async loginUser(){
        // use the client to make the auth request and receive the authState
        try {
        OAUTH_SERVICE_CONFIG.issuer = Config.HOST + '/fhir';
        OAUTH_SERVICE_CONFIG.serviceConfiguration = {
            authorizationEndpoint: Config.HOST + Config.AUTHORIZATION_ENDPOINT,
            tokenEndpoint: Config.HOST + Config.TOKEN_ENDPOINT
        }
        const newAuthState = await authorize(OAUTH_SERVICE_CONFIG); // result includes accessToken, accessTokenExpirationDate and refreshToken

        this.props.authenticateUser(newAuthState.accessToken, newAuthState.accessTokenExpirationDate, newAuthState.refreshToken, Config.HOST);
        this.saveResponsesAsFHIRResource.bind(this)
        } catch (error) {
            console.error("Error while login : " + JSON.stringify(error));
        }
    }

    displayLoginModal(){
        this.setState({isRegisterPopupVisible: true})
    }

    resetSymptomsData(){
        this.setSymptomsPossibleResponses();
        this.forceUpdate();
    }

    setSymptomsPossibleResponses(){
        this.state.symptomsData.forEach(symptom => {
            if(symptom.answerType === 'qualifierValue'){
                symptom.possibleResponses = QUALIFIER_VALUE_ANSWER_OPTIONS;
                symptom.possibleResponses.forEach(possibleResponse => {
                    if(possibleResponse.hasOwnProperty('default') && possibleResponse.default === true){
                        symptom.value = possibleResponse;
                        return;
                    }
                });
            }else{ // temperature
                symptom.possibleResponses = null;
                symptom.enabled = false; // spec defaults to false
                symptom.value = symptom.sliderOption.defaultValue;
            }
        });
    }

    isSymptomEmpty() : boolean {
        const defaultQualifierResponse = QUALIFIER_VALUE_ANSWER_OPTIONS.find( (answerOption ) => { return (answerOption.hasOwnProperty('default') && answerOption.default === true); });
        for (const symptom of this.state.symptomsData) {
            if(symptom.answerType === 'qualifierValue'){
                if(symptom.value.coding[0].code !== defaultQualifierResponse.coding[0].code){
                    return false;
                }
            }else{ // temperature
                if(symptom.enabled)
                    return false;
            }
        }


        return true;
    }

    symptomsToFHIR(_symptoms : any) : I4MIBundle{
        const bundle = new I4MIBundle(BundleType.TRANSACTION);

        // create composition for logical bundling
        // TODO : i18n ???
        const composition: Composition = {
            status: CompositionStatus.PRELIMINARY,
            resourceType: 'Composition',
            type: COMPOSITION_PATIENTREPORTED_CODEABLE_CONCEPT,
            date: this.state.symptomsDate.toISOString(),
            title: 'Corona Science symptoms from ' + moment(this.state.symptomsDate).format('DD.MM.YYYY, HH:mm:ss'),
            section: new Array<CompositionSection>(),
            author: [
                {
                    reference: 'Patient/' + this.props.userProfile.getId(),
                    display: this.props.userProfile.getFullName()
                }
            ]
        }

        // generate Observations for all symptoms
        this.state.symptomsData.forEach((_symptom : any) => {
            // don't add temperature if not measured.
            if(_symptom.hasOwnProperty('enabled')){
              if(!_symptom.enabled)
                return;
            }

            let observation : Observation = {
                resourceType: 'Observation',
                status: ObservationStatus.PRELIMINARY,
                category: _symptom.category,
                code: _symptom.code,
                effectiveDateTime: this.state.symptomsDate.toISOString(),
                subject: {
                    reference: 'Patient/' + this.props.userProfile.getId()
                }
            };

            if(_symptom.answerType === 'slider'){
                observation.valueQuantity = _symptom.valueQuantity;
                if( _symptom.value < _symptom.sliderOption.minimum){
                  observation.valueQuantity.comparator = QuantityComparator.LT;
                  observation.valueQuantity.value = _symptom.sliderOption.minimum;
                }else if( _symptom.value > _symptom.sliderOption.maximum){
                  observation.valueQuantity.comparator = QuantityComparator.GT;
                  observation.valueQuantity.value = _symptom.sliderOption.maximum;
                }else{
                  observation.valueQuantity.value = _symptom.value;
                  observation.valueQuantity.comparator = undefined;
                }
            }else if(_symptom.answerType === 'qualifierValue'){
                observation.valueCodeableConcept = { coding: _symptom.value.coding}
            }

            bundle.addEntry(BundleHTTPVerb.POST, 'Observation', observation);

            // generate title and display for composition
            let type = '';
            if (observation.code && observation.code.coding && observation.code.coding[0] && observation.code.coding[0].display) {
                type = observation.code.coding[0].display.split('(')[0];
            }
            const title = 'Observation: ' + type;
            let detail = '';
            if (observation.valueCodeableConcept && observation.valueCodeableConcept.coding && observation.valueCodeableConcept.coding[0] && observation.valueCodeableConcept.coding[0].display) {
                detail = observation.valueCodeableConcept.coding[0].display.split('(')[0];
            } else if (observation.valueQuantity && observation.valueQuantity.value && observation.valueQuantity.unit) {
                const comparator = observation.valueQuantity.comparator ? observation.valueQuantity.comparator : '';
                detail = comparator + observation.valueQuantity.value + ' ' + observation.valueQuantity.unit;
            }
            const display = type + ': ' + detail.trim() + ' ' + moment(this.state.symptomsDate).format('(DD.MM.YYYY, HH:mm)');

            // now we have an ID, we can add the resource to the composition (check for id is necessary for tslint not to complain)
            if(composition.section){
                composition.section.push({
                    entry: [
                        {
                            reference: 'Observation/' + observation.id,
                            display: display
                        }
                    ],
                    title: title
                });
            }
        });

        // finally add composition to bundle
        bundle.addEntry(BundleHTTPVerb.POST, 'Composition', composition);

        return bundle;
    }

    async saveResponsesAsFHIRResource(){
        if (!this.props.miDataServiceStore.isAuthenticated()) {
            this.displayLoginModal();
            this.setState({
              pendingSaveData : true
            });
            return
        }else if(!this.props.userProfile.isUpToDate()){
          this.props.miDataServiceStore.getUserProfile().then((userProfile : UserProfile) => {
            this.saveResponsesAsFHIRResource();
          }).catch((exception) => {
              if(exception.code != MiDataServiceExceptionCodes.NETWORK_ISSUE){
                  this.props.logoutUser();
              }
          });
          return;
        }

        this.setState({pendingSaveData: false});
        const bundle = this.symptomsToFHIR( this.state.symptomsData );

        const patientReference = this.props.userProfile.getFhirReference();
        const response = this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.RECURRING_QUESTIONS ).getQuestionnaireResponse(this.props.localesHelper.getCurrentLanguage(), patientReference);

        // add response to bundle, which gives it an ID
        bundle.addEntry(BundleHTTPVerb.POST, 'QuestionnaireResponse', response);

        // set display and title and then add response to composition
        // TODO : i18n ???
        const display = 'QuestionnaireResponse for ' + this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.RECURRING_QUESTIONS ).getQuestionnaireTitle(this.props.localesHelper.getCurrentLanguage());
        const title = 'QuestionnaireResponse from ' + moment(new Date()).format('(DD.MM.YYYY, HH:mm)');

        bundle.entry.filter(function (entry) {
            return entry.resource?.resourceType === 'Composition';
        }).forEach( (entry : BundleEntry ) => {
            const composition = entry.resource as Composition;
            if(composition.section){
                composition.section.push({
                    entry: [
                        {
                            reference: 'QuestionnaireResponse/' + response.id,
                            display: display
                        }
                    ],
                    title: title
                });
            }
            if (patientReference) {
                composition.author = [patientReference];
            }
        });

        this.props.addResource(bundle);
        AsyncStorage.setItem(STORAGE.LAST_HEALTH_STATUS_UPDATE , Date.now().toString());

        MessageHelper.showToast(this.props.localesHelper.localeString('healthStatus.thankYou'));

        // reset Symptoms
        this.resetSymptomsData();
        this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.RECURRING_QUESTIONS ).resetResponse();

        // buggy react-native-swiper plugin -> hack to make it work :-(
        setTimeout(() => {
            setTimeout(() => {
                this.props.navigation.navigate(SCREEN.DASHBOARD);
            }, 1)
            this.refs.swiper.scrollTo(0, false);
            this.setState({displayedPage: 1});
        }, 2);
    }

    render() {
        let slides = [];
        slides.push(
            <View key="SymptomSlide" style={{marginBottom: 40}}>
                <Symptom    symptomsData={this.state.symptomsData}
                            symptomsDate={this.state.symptomsDate}
                            onSymptomsDateChange={(_symptomsDate : Date) => this.setState({symptomsDate: _symptomsDate})}/>
            </View>
        );

        this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.RECURRING_QUESTIONS ).items.map((item, index) => {
            slides.push(
                <View key={'QuestionsSlide' + index}
                      style={{ marginBottom: 40 }}>
                    <Questions  questionnaireData={this.props.QuestionnaireStore.getQuestionnaire( QuestionnaireType.RECURRING_QUESTIONS )}
                                questions={item.subItems}/>
                </View>
            )
        })

        return (
            <>
            <View style={{backgroundColor: colors.pageBackground, height: '100%'}}>
                <HeaderBanner   title={this.props.localesHelper.localeString('healthStatus.symptoms.title')}
                                leftPart={ this.state.displayedPage + '/' + (this.state.numberOfPages)}
                                btnBack={this.state.displayedPage > 1}
                                onBack={this.swipePrevious.bind(this)}/>

                <Swiper ref='swiper'
                        style={styles.wrapper}
                        showsButtons={false}
                        scrollEnabled={false}
                        showsPagination={false}
                        loop={false}>
                    {   // see https://github.com/leecade/react-native-swiper/issues/233
                        slides.map((item) => {
                            return ( item );
                        })
                    }
                </Swiper>
                <View style={{
                    position: 'absolute',
                    flexDirection:'row',
                    justifyContent: 'space-around',
                    bottom: 0,
                    width: '100%',
                    paddingBottom: 10,
                    backgroundColor: 'rgba(256, 256, 256, 0)'}}>
                    {this.state.displayedPage < this.state.numberOfPages ?
                    <Button style={[AppStyle.buttonFilled, {width: ButtonDimensions.actionButtonWidth, height: ButtonDimensions.largeButtonHeight}]} onPress={this.swipeNext.bind(this)}>
                        <Text style={AppStyle.textButtonFilled}>{this.props.localesHelper.localeString('common.next')}</Text>
                    </Button>
                :<>

                    {!this.props.miDataServiceStore.isAuthenticated() && Platform.OS === 'ios' && Platform.Version < '11' ?
                        <View style={{flexDirection: 'column', width: '100%', alignItems: 'center', backgroundColor: colors.white}}>
                            <Text style={[AppStyle.textQuestion, { fontSize: TextSize.very_small - 2, color: colors.black, paddingHorizontal:0, textAlign:'center', paddingTop: 15}]}>
                                {this.props.localesHelper.localeString('common.loginPromptText')}
                            </Text>
                            <Button style={[AppStyle.button, {width: ButtonDimensions.actionButtonWidth, minWidth: 250}]} onPress={this.loginUser.bind(this)}>
                                <Text style={AppStyle.textButton}>{this.props.localesHelper.localeString('common.login')}</Text>
                            </Button>
                        </View>
                        :
                        <Button style={[AppStyle.button, {width: ButtonDimensions.actionButtonWidth}]} onPress={this.saveResponsesAsFHIRResource.bind(this)}>
                            <Text style={AppStyle.textButton}>{this.props.localesHelper.localeString('common.save')}</Text>
                        </Button>
                    }
                </>
                }

                </View>
            </View>
            <Login
                title={this.props.localesHelper.localeString('common.loginPromptTitle')}
                label={this.props.localesHelper.localeString('common.loginPromptText')}
                buttonText={this.props.localesHelper.localeString('common.login')}
                isLoginOpen={this.state.isRegisterPopupVisible }
                onClose={() => this.setState({isRegisterPopupVisible: false, pendingSaveData: false})}/>
            </>
          )
    }
}

const styles = StyleSheet.create({
    wrapper: {},
    text: {
      color: '#fff',
      fontSize: 30,
      fontWeight: 'bold'
    }
})

function mapStateToProps(state: AppStore) {
    return {
        miDataServiceStore: state.MiDataServiceStore,
        localesHelper: state.LocalesHelperStore,
        QuestionnaireStore: state.QuestionnaireStore,
        userProfile: state.UserProfileStore,
    };
}

function mapDispatchToProps(dispatch: any) {
    return {
      authenticateUser: (accessToken: string, accessTokenExpirationDate: string, refreshToken: string, server: string) => miDataServiceActions.authenticateUser(dispatch, accessToken, accessTokenExpirationDate, refreshToken, server),
      logoutUser: () => miDataServiceActions.logoutUser(dispatch),
      addResource: (resource : Resource) => miDataServiceActions.addResource(dispatch, resource)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(DataEntry);
