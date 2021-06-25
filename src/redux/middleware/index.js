import { applyMiddleware, compose } from 'redux'
import { routerMiddleware } from 'connected-react-router'

import readyStatePromise from './readyStatePromise'
import thunkWithActiveAccount from './thunkWithActiveAccount'

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

export default (history) => composeEnhancers(
    applyMiddleware(
        routerMiddleware(history),
        readyStatePromise,
        thunkWithActiveAccount
    )
)
