import { createActions } from 'redux-actions'
import { getLikelyTokenContracts, getMetadata, getBalanceOf } from '../../../utils/tokens'

const WHITELISTED_CONTRACTS = (process.env.TOKEN_CONTRACTS || 'berryclub.ek.near,farm.berryclub.ek.near,wrap.near').split(',');

export const handleGetTokens = () => async (dispatch, getState) => {
    const { accountId } = getState().account

    const tokenContractsNames = [...new Set([...(await getLikelyTokenContracts(accountId)), ...WHITELISTED_CONTRACTS])]

    await Promise.all(tokenContractsNames.map(async contractName => {
        await dispatch(tokens.tokensDetails.getMetadata(contractName, accountId))
    }))

    Object.keys(getState().tokens.tokens).map(contractName => {
        dispatch(tokens.tokensDetails.getBalanceOf(contractName, accountId))
    })
}

export const tokens = createActions({
    TOKENS_DETAILS: {
        GET_METADATA: getMetadata,
        GET_BALANCE_OF: getBalanceOf
    },
    CLEAR_STATE: null
})
