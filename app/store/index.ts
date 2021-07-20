import { createStore, applyMiddleware, compose, Middleware } from 'redux';
import logger from 'redux-logger';
import { persistStore, persistReducer } from 'redux-persist';
import reducers  from './reducers';
import createSensitiveStorage from 'redux-persist-sensitive-storage';
import { checkAgeGroupMiddleWare } from './middleware'

// Storage configuraiton :
const storage = createSensitiveStorage({
  keychainService: 'myKeychain',
  sharedPreferencesName: 'mySharedPrefs'
});

const persistConfig = {
  timeout: 0,
  key: 'root',
  storage: storage,
  whitelist: ['MiDataServiceStore', 'LocalesHelperStore', 'StatDataStore', 'UserProfileStore', 'QuestionnaireStore'] // fix #31 ???
  // debug: true
};
const persistedReducers = persistReducer(persistConfig, reducers);

// Middleware configuration :
const middlewares:any = [
  __DEV__ && logger, // add logger only on dev mode.
  checkAgeGroupMiddleWare
].filter(Boolean);

const enhancer = compose(
  applyMiddleware(
    ...middlewares
  )
);

// Instanciation of store :
export const store: any = createStore(persistedReducers, enhancer);
export const persistor = persistStore(store);