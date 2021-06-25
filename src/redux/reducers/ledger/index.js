import { handleActions } from 'redux-actions'
import reduceReducers from 'reduce-reducers'

import {
    getLedgerAccountIds,
    addLedgerAccountId,
    saveAndSelectLedgerAccounts,
    refreshAccountOwner,
    setLedgerTxSigned,
    clearSignInWithLedgerModalState,
    showLedgerModal
} from '../../actions/account'

import { HIDE_SIGN_IN_WITH_LEDGER_ENTER_ACCOUNT_ID_MODAL } from '../../../utils/wallet'

const initialState = {
    modal: {}
}

const ledgerModalReducer = (state, { error, ready, type }) => {
    if (state.modal?.show && type === state.modal?.action && (ready || error)) {
        return {
            ...state,
            modal: undefined,
            txSigned: undefined
        }
    }

    return state
}

// TODO: Extract actions related to signInWithLedger so that all state is automatically scoped there. Is txSigned ledger-specific?
const ledgerActions = handleActions({
    [getLedgerAccountIds]: (state, { error, payload, ready }) => {
        if (error) {
            return {
                ...state,
                signInWithLedgerStatus: (payload.messageCode === 'walletErrorCodes.getLedgerAccountIds.noAccounts' && !HIDE_SIGN_IN_WITH_LEDGER_ENTER_ACCOUNT_ID_MODAL) ? 'enter-accountId' : undefined,
                signInWithLedger: undefined,
                txSigned: undefined
            }
        }

        return {
            ...state,
            txSigned: ready ? undefined : state.txSigned,
            signInWithLedgerStatus: !ready ? 'confirm-public-key' : 'confirm-accounts',
            signInWithLedger: payload 
                ? payload.reduce((r, accountId) => ({
                    ...r,
                    [accountId]: {
                        status: 'waiting'
                    }
                }), {})
                : {}
        }
    },
    [addLedgerAccountId]: (state, { error, ready, meta, payload }) => {
        return {
            ...state,
            signInWithLedgerStatus: 'confirm-accounts',
            signInWithLedger: {
                ...state.signInWithLedger,
                [meta.accountId]: {
                    status: error
                        ? payload?.name === 'TransportStatusError' ? 'rejected' : 'error'
                        : (ready ? 'success' : 'confirm')
                }
            }
        }
    },
    [saveAndSelectLedgerAccounts]: (state, { error, ready }) => {
        if (error) {
            return {
                ...state,
                signInWithLedgerStatus: undefined,
                signInWithLedger: undefined
            }
        }

        return ready 
            ? {
                ...state,
                signInWithLedgerStatus: ready ? undefined : state.signInWithLedgerStatus,
                signInWithLedger: undefined
            }
            : state
    },
    [refreshAccountOwner]: (state, { payload }) => {
        return {
            ...state,
            ...(payload && payload.ledger)
        }
    },
    [setLedgerTxSigned]: (state, { payload, meta }) => {
        const signInWithLedger = (meta.accountId && Object.keys(state.signInWithLedger || {}).length )
            ? {
                ...state.signInWithLedger,
                [meta.accountId]: {
                    status: (state.signInWithLedger[meta.accountId].status === 'confirm' && payload.status)
                        ? 'pending'
                        : state.signInWithLedger[meta.accountId].status
                }
            }
            : undefined

        return {
            ...state,
            txSigned: payload.status,
            signInWithLedger
        }
    },
    [clearSignInWithLedgerModalState]: (state) => {
        return {
            ...state,
            txSigned: undefined,
            signInWithLedgerStatus: undefined,
            signInWithLedger: undefined
        }
    },
    // TODO: Make it clear how this interacts with ledgerModalReducer
    [showLedgerModal]: (state, { payload }) => {
        return {
            ...state,
            modal: {
                ...state.modal,
                show: !state.signInWithLedgerStatus && payload.show,
                action: payload.action,
                textId: `ledgerSignTxModal.${payload.action}`
            },
            txSigned: undefined
        }
    },
}, initialState)

export default reduceReducers(
    initialState,
    ledgerActions,
    ledgerModalReducer
)
