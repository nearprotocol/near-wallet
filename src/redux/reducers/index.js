import { combineReducers } from 'redux'

import combinedAccountReducers from './combinedAccountReducers'
import combinedMainReducers from './combinedMainReducers'

import { wallet } from '../../utils/wallet'
import { store } from '../../'

const setupReducers = (history) => {
    const accounts = Object.keys(wallet.accounts)
    if (!accounts) {
        return {}
    }

    return accounts.reduce((x, accountId) => {
        const reducer = combinedAccountReducers(history)
        const inicialState = reducer(store?.getState()[accountId], {})

        return ({
            ...x,
            [accountId]: (state = inicialState, action) => (
                (accountId === wallet.accountId)
                    ? reducer(state, action)
                    : state
            )
        })
    }, {})
}

export default (history) => combineReducers({
    ...combinedMainReducers(history),
    ...setupReducers(history)
})
