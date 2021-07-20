import Action from '../helpers/Action';
import { UPDATE_STAT_DATA, UpdateStatData } from './reducer';

export function updateStatData(dispatch, statData: UpdateStatData) {
    dispatch(new Action(UPDATE_STAT_DATA, statData).getObjectAction());
}
