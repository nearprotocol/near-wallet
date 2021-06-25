
import { createStore } from 'redux'
import { createBrowserHistory } from 'history'

import createRootReducer from './reducers'
import createMiddleware from './middleware'

export const history = createBrowserHistory()

export default () => {
    const store = createStore(createRootReducer(history), createMiddleware(history))

    store.injectReducer = () => {
        store.replaceReducer(createRootReducer(history))
    }

    return store
}
