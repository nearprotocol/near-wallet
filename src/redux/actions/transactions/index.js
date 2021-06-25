import { createActions } from 'redux-actions'
import { getTransactions as getTransactionsApi, transactionExtraInfo } from '../../../utils/explorer-api'

export const { getTransactions, getTransactionStatus } = createActions({
    GET_TRANSACTIONS: [
        getTransactionsApi, 
        (accountId) => ({ accountId })
    ],
    GET_TRANSACTION_STATUS: [
        transactionExtraInfo,
        (hash, signer_id, accountId) => ({ hash, accountId })
    ]
})
