/**
* HL7 codings for resource category.
* just add as the category property to the symptoms observation
* resource.
**/
export const SYMPTOM_CATEGORY = {
    survey: [
        {
            coding: [
                {
                    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                    code: 'survey',
                    display: 'Survey'
                }
            ]
        }
    ],
    vitalSigns: [
        {
            coding: [
                {
                    system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                    code: 'vital-signs',
                    display: 'Vital Signs'
                }
            ]
        }
    ]
}
/**
* Codeable concept for a patient reported outcome in composition.
**/
export const COMPOSITION_PATIENTREPORTED_CODEABLE_CONCEPT = {
	coding: [
		{
			system: 'http://loinc.org',
			code: '89196-0',
			display: 'Patient reported outcome measure panel'
		}
	]
}



export const QUESTIONNAIRE_ITEM_CONTROL_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl';
export const QUESTIONNAIRE_ITEM_CONTROL_EXTENSION_SYSTEM = 'http://hl7.org/fhir/questionnaire-item-control';

export const QUESTIONNAIRE_OBSERVATIONLINK_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/questionnaire-observationLinkPeriod';
export const QUESTIONNAIRE_UNITS_OF_MEASURE_SYSTEM = 'http://unitsofmeasure.org';

export const QUESTIONNAIRE_PLZ_LOCAL_VALUESET = 'http://fhir.ch/ig/covid-19-prom/ValueSet/PLZ';
export const QUESTIONNAIRE_PLZ_CODING_SYSTEM = 'http://www.swisstopo.admin.ch/codesystem/swissZipCode ';
export const QUESTIONNAIRE_CANTON_CODING_SYSTEM = 'http://www.admin.ch/codesystem/swissCanton';

/**
* Coding to add to QuestionnaireResponse (as extension)
**/
export const QUESTIONNAIRERESPONSE_CODING_EXTENSION = [
    {
        url: 'http://midata.coop/extensions/response-code',
        valueCoding: {
            'system': 'http://loinc.org',
            'code': '89196-0',
            'display': 'Patient reported outcome measure panel'
        }
    }
]
