class StringHelper {

    static capitalizeFirstLetter(theString: string) {
        if (theString) {
            return theString[0].toUpperCase() + theString.slice(1);
        }
        return theString;
    }
}

export default StringHelper;
