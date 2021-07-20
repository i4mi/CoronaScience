export default class StatData {
    totalUser: number = 0;
    totalCollectedData: number = 0;

    constructor(statData?: StatData) {
        if(statData) {
            this.updateStatData(statData);
        }
    }

    updateStatData(statData: Partial<StatData>) {
        Object.assign(this, statData);
    } 

    getTotalUser() {
        return this.totalUser;
    }

    getTotalCollectedData() {
        return this.totalCollectedData;
    }
}