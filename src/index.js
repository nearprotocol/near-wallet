import "regenerator-runtime/runtime";

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { LocalizeProvider } from 'react-localize-redux';

import { initSentry } from './utils/sentry'

import Routing from './components/Routing'

import configureStore, { history } from './redux/configureStore'

initSentry();

export const store = configureStore()

ReactDOM.render(
    <Provider store={store}>
        <LocalizeProvider store={store}>
            <Routing history={history} />
        </LocalizeProvider>
    </Provider>,
    document.getElementById('root')
)
