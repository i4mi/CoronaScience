import MiDataServiceStore from "../store/midataService/model";
import UserProfile from "../model/UserProfile";
import { Bundle, Patient } from "@i4mi/fhir_r4";
import Exception from "../model/Exception";

export const UserProfileServiceExceptionCodes = {
    BAD_USER: "BAD_USER",
}

class UserProfileService { // why this store?
    readonly USERPROFILE_ENDPOINT = "/fhir/Patient";

    private miDataServiceStore: MiDataServiceStore;

    constructor(midataService: MiDataServiceStore) {
        this.miDataServiceStore = midataService;
    }

    async getUserProfile() : Promise<UserProfile> {
        // TODO : try/catch when user's token no more valid!
        const responseBundle : Bundle = await this.miDataServiceStore.fetch(this.USERPROFILE_ENDPOINT, 'GET');
        if(responseBundle.entry === undefined)
            throw new Exception(UserProfileServiceExceptionCodes.BAD_USER, 'No user returned', responseBundle);
        // Parsing of entry :
        try {  
            // on part du principe que la première entrée est la bonne
            let patientResource = responseBundle.entry[0].resource as Patient;
            return new UserProfile({patientData: patientResource});  
        } catch (error) {
            const message = "UserProfileService : error while parsing userProfile. ";
            throw new Exception(UserProfileServiceExceptionCodes.BAD_USER, message, error)
        }
    }
}

export default UserProfileService;
  