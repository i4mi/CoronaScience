import { Patient, Reference, QuestionnaireResponseStatus, QuestionnaireResponse, Observation, ObservationStatus } from '@i4mi/fhir_r4';

export default class UserProfile {

    patientData: Patient = {};
    profileQuestionnaireReponse: QuestionnaireResponse = { status: QuestionnaireResponseStatus.IN_PROGRESS };
    ageGroup: Observation = { status: ObservationStatus.UNKNOWN, code: {} };

    constructor(userProfile?: Partial<UserProfile>) {
        if (userProfile) {
            this.updateProfile(userProfile);
        }
    }

    updateProfile(attributs: Partial<UserProfile>) {
        if (attributs.patientData != undefined) this.patientData = { ...attributs.patientData };
        if (attributs.profileQuestionnaireReponse != undefined) this.profileQuestionnaireReponse = { ...attributs.profileQuestionnaireReponse };
        if (attributs.ageGroup != undefined && attributs.ageGroup.valueRange) this.ageGroup = { ...attributs.ageGroup };
    }

    resetProfileData() {
        this.patientData = {};
        this.profileQuestionnaireReponse = { status: QuestionnaireResponseStatus.IN_PROGRESS };
        this.ageGroup = { status: ObservationStatus.UNKNOWN, code: {} };
    }

    isUpToDate() {
        return this.patientData.id != null && this.patientData.id != undefined && this.ageGroup.status != ObservationStatus.UNKNOWN;
    }

    getId() {
        return this.patientData.id;
    }

    getFullName(): string | undefined {
        const name = this.patientData.name;
        if (name !== undefined && name.length > 0) {
            const primaryName = name[0];
            let fullName = '';
            if (primaryName.given !== undefined && primaryName.given.length > 0) {
                fullName = primaryName.given[0] + ' ';
            }
            if (primaryName.family && primaryName.family.length > 0) {
                fullName += primaryName.family;
            }
            return fullName;
        }
        return undefined;
    }

    getFhirReference(): Reference | undefined {
        if (this.isUpToDate()) {
            return {
                display: this.getFullName(),
                reference: 'Patient/' + this.patientData.id
            };
        } else {
            return undefined;
        }
    }

    getAddresses(): City[] {
        const address = this.patientData.address;
        if (address != undefined) {
            return address.map(rawAddress => {
                const city: City = {
                    name: rawAddress.city,
                    nipCode: rawAddress.postalCode,
                }
                return city;
            });
        } else return [];
    }

    getEmail(): string | undefined {
        const telecom = this.patientData.telecom;
        if (telecom !== undefined && telecom.length > 0) {
            for (var i = 0; i < telecom.length; i++) {
                if (telecom[i].system == 'email') {
                    return telecom[i].value;
                }
            }
        }
        return undefined;
    }

    setAgeGroup(_ageGroup: Observation): void {
        if (_ageGroup.status !== ObservationStatus.UNKNOWN) {
            this.ageGroup = _ageGroup;
        }
    }

    getAgeGroup(): Observation {
        return this.ageGroup;
    }

    setPersonalSituation(_questionnaireResponse: QuestionnaireResponse): void {
        this.profileQuestionnaireReponse = _questionnaireResponse;
    }

    getPersonalSituation(): QuestionnaireResponse {
        return this.profileQuestionnaireReponse;
    }

}
