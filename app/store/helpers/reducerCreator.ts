import Action from "./Action";

export function createReducer(initialState: object, handlers: object) {
    return function reducer(state = initialState, action: Action) {
        if (handlers.hasOwnProperty(action.type)) {
            return handlers[action.type](state, action);
        } else {
            return state;
        }
    };
}