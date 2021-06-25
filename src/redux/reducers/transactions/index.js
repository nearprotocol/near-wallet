import { handleActions } from 'redux-actions'

import {
    getTransactions,
    getTransactionStatus
} from '../../actions/transactions'

import { selectAccount } from '../../actions/account'

const initialState = {}

const transactions = handleActions({
    [getTransactions]: (state, { error, payload, ready, meta }) => {
        const transactions = state ? state[meta.accountId] : undefined

        const hash = transactions && transactions.reduce((h, t) => ({
            ...h,
            [t.hash_with_index]: t
        }), {})
        
        return ({
            ...state,
            [meta.accountId]: (ready && !error) 
                ? payload[meta.accountId].map((t) => (
                    (hash && Object.keys(hash).includes(t.hash_with_index))
                        ? {
                            ...t,
                            status: hash[t.hash_with_index].status,
                            checkStatus: hash[t.hash_with_index].checkStatus
                        } 
                        : t
                ))
                : transactions
        })
    },
    [getTransactionStatus]: (state, { error, payload, ready, meta }) => ({
        ...state,
        [meta.accountId]: state[meta.accountId].map((t) => (
            t.hash === meta.hash
                ? {
                    ...t,
                    checkStatus: (ready && !error) 
                        ? !['SuccessValue', 'Failure'].includes(Object.keys(payload.status)[0]) 
                        : false,
                    status: (ready && !error) 
                        ? Object.keys(payload.status)[0] 
                        : error 
                            ? 'notAvailable' 
                            : ''
                }
                : t
        ))
    }),
    [selectAccount]: () => {
        return initialState
    }
}, initialState)

export default transactions
