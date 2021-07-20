import { createReducer } from '../helpers/reducerCreator';
import { REHYDRATE } from 'redux-persist';
import StatData from '../../model/StatData';
import { RESOURCE_SENT } from '../midataService/reducer';
import { Resource, Bundle } from '@i4mi/fhir_r4';

export const UPDATE_STAT_DATA = 'statData/UPDATE_STAT_DATA';
export type UpdateStatData = Partial<StatData>;

// Definition of actions listeners
const StatDataStore = createReducer(new StatData(), {
  [REHYDRATE](state: StatData, action) {
      if (action.payload && action.payload.StatDataStore) {
        return new StatData(action.payload.StatDataStore);
      }
      return state;
    },
  [UPDATE_STAT_DATA](state: StatData, action) {
    let newState = new StatData(state);
    let newValues: UpdateStatData = action.data;
    newState.updateStatData(newValues);
    return newState;
  },
  [RESOURCE_SENT](state: StatData, action) {
    let newState = new StatData(state);
    let resource = action.resource as Resource;
    let newValue = newState.totalCollectedData;

    if(resource.resourceType === 'Bundle'){
      (resource as Bundle).entry?.forEach((resource) => {
        if(resource.resource?.resourceType === 'Composition') // TODO : check code for survey (and not profile)
          newValue++;
      })
    }

    newState.totalCollectedData = newValue;

    return newState;
  }
});

export default StatDataStore;