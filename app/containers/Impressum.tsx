import React, { Component } from 'react';
import VersionNumber from 'react-native-version-number';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import LocalesHelper from '../locales';
import { AppStore } from '../store/reducers';
import { connect } from 'react-redux';
import { Bundle } from '@i4mi/fhir_r4';
import Config from "react-native-config";
import { PARTNERS } from '../../resources/static/partners';
import { colors, ButtonDimensions } from '../styles/App.style';
import { HeaderBanner } from '../components/HeaderBanner'
import { StackNavigationProp } from '@react-navigation/stack';
import { Separator } from '../components/Separator';
import * as miDataServiceActions from '../store/midataService/actions';
import MiDataServiceStore from '../store/midataService/model';
import * as questionnaireServiceActions from '../store/questionnaire/actions';
import UrlHelper from '../helpers/UrlHelpers';
import QuestionnaireStore from '../model/QuestionnaireDataStore';
import QuestionnaireData from '../model/QuestionnaireData';
import moment from 'moment';
import { QUESTIONNAIRES_TO_CHECK } from './Dashboard';
import { UpdateStatData } from '../store/statData/reducer';
import * as statDataActions from '../store/statData/actions';

interface PropsType {
    navigation: StackNavigationProp<any>;
    localesHelper : LocalesHelper;
    logoutUser: () => void;
    addQuestionnaire: (newData: QuestionnaireData) => void;
    updateStatData: (newData: UpdateStatData) => void;
    questionnaireStore: QuestionnaireStore;
    miDataServiceStore: MiDataServiceStore;
}

const HIT_NEEDED_FOR_CHANGE_PLATFORM : number = 8;

class Impressum extends Component<PropsType> {
    counterChangePlatforme : number = 0;
    CoronaImage = require('../../resources/images/partners/coronascience.png');
    CoronaUrl = this.props.localesHelper.localeString('impressum.partners.corona.hyperlink');

    buildClick(){
        this.counterChangePlatforme++;

        if( this.counterChangePlatforme >= HIT_NEEDED_FOR_CHANGE_PLATFORM){
            Config.HOST = (Config.HOST == 'https://ch.midata.coop') ? 'https://test.midata.coop' : 'https://ch.midata.coop';

            this.props.logoutUser();
            this.props.questionnaireStore.clearAvailableQuestionnaire();

            // Update StatData -> fetch numbers from the selected platform
            // TODO fetch StatData numbers in one place (redundancy with Dashboard.tsx, updateCountersNumbers
            this.props.miDataServiceStore.fetch(Config.OPEN_DATA_URL + '/fhir/Observation?code=project-participant-count&date=' + moment().format('YYYY-MM-DD'), 'GET')
            .then((responseProjectParticipant : Bundle) =>{
                this.props.miDataServiceStore.fetch(Config.OPEN_DATA_URL + '/fhir/Observation?code=project-panels-reported&date=' + moment().format('YYYY-MM-DD'), 'GET')
                .then((responseProjectPanelsReported : Bundle) =>{
                    try{
                        if(responseProjectParticipant.entry && responseProjectParticipant.entry.length > 0){
                            this.props.updateStatData({
                                totalUser: responseProjectParticipant.entry[0].resource.valueQuantity.value,
                            });
                        }else{
                            this.props.updateStatData({
                                totalUser: 0
                            });
                        }
                    }catch(error){
                        console.error("Error while retrieving data : " + error);
                        this.props.updateStatData({
                            totalUser: 0
                        });
                    }

                    try{
                        if(responseProjectPanelsReported.entry && responseProjectPanelsReported.entry.length > 0){
                            this.props.updateStatData({
                                totalCollectedData : responseProjectPanelsReported.entry[0].resource.valueQuantity.value,
                            });
                        }else{
                            this.props.updateStatData({
                                totalCollectedData : 0
                            });
                        }
                    }catch(error){
                        console.error("Error while retrieving stats data : " + error);
                        this.props.updateStatData({
                            totalCollectedData : 0
                        });
                    }
                });
            });
    
            QUESTIONNAIRES_TO_CHECK.forEach( (questionnaireToCheck) => {
                this.props.miDataServiceStore.fetch(Config.OPEN_DATA_URL + '/fhir/Questionnaire?status=active&effective=ap' + moment().format('YYYY-MM-DD') + '&context-type-value=prom$http://midata.coop/codesystems/coronascience-questionnaire-type|' + questionnaireToCheck["context-type-value"], 'GET')
                .then((responseBundle : Bundle) =>{
                    try{
                        if(responseBundle.total > 0){
                            this.props.addQuestionnaire( new QuestionnaireData( responseBundle.entry[0].resource, questionnaireToCheck.type ) );
                        }
                    }catch(error){
                        // for example network error
                        console.error("Error while retrieving questionnaire data : " + error);
                    }
                });
            });

            this.counterChangePlatforme = 0;
            this.forceUpdate();
        }
    }

    renderPartners(partnersList: any[]) {
        return partnersList.map((partner, index) => {
            const url = this.props.localesHelper.localeString('impressum.partners.' + partner.id + '.hyperlink');
            return (
                <View key={index}>
                    <TouchableOpacity key={partner.id} style={styles.imageContainer} onPress={() => UrlHelper.openURL(url)}>
                        <Image style={styles.partnerImage} resizeMode='contain' source={partner.image}/>
                    </TouchableOpacity>
                    {(index < partnersList.length - 1) && <Separator />}
                </View>
            );
        });
    }

    render() {
        return (
        <>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 0, backgroundColor: colors.headerGradientEnd }} />
                <HeaderBanner title='Impressum' btnClose={true} onClose={() => this.props.navigation.goBack()}/>
                <ScrollView style={[styles.container]}>
                    <View style={styles.cardsContainer}>
                        <View style={styles.card}>
                            <View style={styles.partnerContainer}>
                                <View style={styles.coronaImageContainer}>
                                    <TouchableOpacity onPress={() => UrlHelper.openURL(this.CoronaUrl)}>
                                        <Image style={styles.coronaImage} resizeMode='contain' source={this.CoronaImage}/>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={this.buildClick.bind(this)} activeOpacity={1}>
                                        <Text style={styles.partnerLabel}>{VersionNumber.appVersion + ' (Build ' + VersionNumber.buildVersion + ') on ' + Config.HOST}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                    <View style={{paddingBottom: 20}}>
                    {PARTNERS.map((partnerCategory, index) => {
                    return (
                        <View key={index} style={styles.card}>
                            <View style={styles.partnerContainer} key={partnerCategory.categoryId}>
                                <View style={[styles.subtitleContainer, {width: 270}]}>
                                    <Text style={styles.titleCategory}>{this.props.localesHelper.localeString('impressum.categories.' + partnerCategory.categoryId + '.title')}</Text>
                                    {this.props.localesHelper.localeString('impressum.categories.' + partnerCategory.categoryId + '.subtitle').length > 0 &&
                                        <Text style={styles.subtitleCategory}>{this.props.localesHelper.localeString('impressum.categories.' + partnerCategory.categoryId + '.subtitle')}</Text>}
                                </View>
                                <View style={styles.partnerList}>
                                    {this.renderPartners(partnerCategory.partners)}
                                </View>
                            </View>
                        </View>
                    );})}
                    </View>
                </ScrollView>
        </>
    );
    }
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      height: "100%",
      paddingHorizontal: ButtonDimensions.padding_big,
      paddingVertical: ButtonDimensions.padding_small,
      backgroundColor: colors.lightGray
    },
    cardsContainer:{
        paddingBottom: ButtonDimensions.padding_big
    },
    card:{
        paddingVertical: ButtonDimensions.padding_small,
        marginVertical: ButtonDimensions.padding_small,
        backgroundColor: colors.white,
        borderRadius: 10
    },
    subtitleContainer: {
        padding: 10,
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
    },
    titleCategory: {
        textAlign: 'left',
        fontSize: 15,
        color: colors.black
    },
    subtitleCategory: {
        marginTop: 5,
        textAlign: 'left',
        fontSize: 10,
        color: colors.mediumGray
    },
    partnerContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    partnerList: {
        flex: 1,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-around',
        flexDirection: 'row'
    },
    partnerImage: {
        marginHorizontal: 10,
        marginVertical: 0,
        height: 100,
        maxWidth: 250
    },
    imageContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-around'
    },
    coronaImageContainer: {
        width: '100%',
        alignItems: 'center',
    },
    coronaImage: {
        marginHorizontal: 10,
        marginVertical: 0,
        height: 100,
        maxWidth: 250
    },
    partnerLabel: {
        margin: 5,
        textAlign: 'center',
        fontSize: 10
    }
  });

function mapStateToProps(state: AppStore) {
    return {
        miDataServiceStore: state.MiDataServiceStore,
        localesHelper : state.LocalesHelperStore,
        questionnaireStore: state.QuestionnaireStore
    };
}

function mapDispatchToProps(dispatch: any) {
    return {
        logoutUser: () => miDataServiceActions.logoutUser(dispatch),
        addQuestionnaire: (newData: QuestionnaireData) => questionnaireServiceActions.addQuestionnaire(dispatch, newData),
        updateStatData: (newData: UpdateStatData) => statDataActions.updateStatData(dispatch, newData)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Impressum);
