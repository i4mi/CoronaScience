import { SYMPTOM_CATEGORY } from '../../resources/static/codings';

export const SYMPTOM_DATA = [
    {
        answerType: 'slider',
        sliderOption: {
            minimum : 35,
            maximum : 42,
            defaultValue : 36.8,
            unit: "°C"
        },
        translationKey: 'measuredTemperature',
        category : SYMPTOM_CATEGORY.vitalSigns,
        code:{
            coding: [
                {
                    system: 'http://loinc.org',
                    code: '8310-5',
                    display: 'Body temperature'
                },
                {
                    system: 'http://snomed.info/sct',
                    code: '105723007',
                    display: 'Body temperature finding (finding)'
                }
            ]
        },    
        valueQuantity: {
            value: '',
            unit: '°C',
            system: 'http://unitsofmeasure.org',
            code: 'Cel'
        }
    },
    {
        answerType: 'qualifierValue',
        translationKey: 'cough',
        category : SYMPTOM_CATEGORY.survey,
        code:{
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '49727002',
                    display: 'Cough (finding)'
                }
            ]
        },
    },
    {
        answerType: 'qualifierValue',
        translationKey: 'headache',
        category : SYMPTOM_CATEGORY.survey,
        code:{
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '25064002',
                    display: 'Headache (finding)'
                }
            ]
        }
    },
    {
        answerType: 'qualifierValue',
        translationKey: 'throatPain',
        category : SYMPTOM_CATEGORY.survey,
        code:{
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '162397003',
                    display: 'Pain in throat (finding)'
                }
            ]
        }
    },
    {
        answerType: 'qualifierValue',
        translationKey: 'anosmia',
        category : SYMPTOM_CATEGORY.survey,
        code:{
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '44169009',
                    display: 'Loss of sense of smell (finding)'
                }
            ]
        }
    },
    {
        answerType: 'qualifierValue',
        translationKey: 'dyspnea',
        category : SYMPTOM_CATEGORY.survey,
        code:{
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '267036007',
                    display: 'Dyspnea (finding)'
                }
            ]
        }
    },
    {
        answerType: 'qualifierValue',
        translationKey: 'fatigue',
        category : SYMPTOM_CATEGORY.survey,
        code:{
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '84229001',
                    display: 'Fatigue (finding)'
                }
            ]
        }
    },
    {
        answerType: 'qualifierValue',
        translationKey: 'limbPain',
        category : SYMPTOM_CATEGORY.survey,
        code:{
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '90834002',
                    display: 'Pain in limb (finding)'
                }
            ]
        }
    },
    {
        answerType: 'qualifierValue',
        translationKey: 'diarrhea',
        category : SYMPTOM_CATEGORY.survey,
        code:{
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '62315008',
                    display: 'Diarrhea (finding)'
                }
            ]
        }
    },
];

export const QUALIFIER_VALUE_ANSWER_OPTIONS = [{
                                    translationPosition: 0,
                                    coding: [
                                        {
                                            system: 'http://snomed.info/sct',
                                            code: '260413007',
                                            display: 'None (qualifier value)'
                                        }
                                    ],
                                    default: true
                                },{
                                    translationPosition: 1,
                                    coding: [
                                        {
                                            system: 'http://snomed.info/sct',
                                            code: '255604002',
                                            display: 'Mild (qualifier value)'
                                        }
                                    ]
                                },{
                                    translationPosition: 2, 
                                    coding: [
                                        {
                                            system: 'http://snomed.info/sct',
                                            code: '6736007',
                                            display: 'Moderate (severity modifier) (qualifier value)'
                                        }
                                    ]
                                },{
                                    translationPosition: 3,
                                    coding: [
                                        {
                                            system: 'http://snomed.info/sct',
                                            code: '24484000',
                                            display: 'Severe (severity modifier) (qualifier value)'
                                        }
                                    ]
                                }];