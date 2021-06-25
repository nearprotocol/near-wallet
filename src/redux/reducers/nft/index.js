import { handleActions } from 'redux-actions'
import reduceReducers from 'reduce-reducers'

import { nft } from '../../actions/nft'

const initialState = {
    likelyContracts: [],
    nft: {}
}

const likelyContractsReducer = handleActions({
    [nft.likelyContracts.get]: (state, { ready, error, payload: likelyContracts }) =>
        (!ready || error)
            ? state
            : ({
                ...state,
                likelyContracts
            }),
}, initialState)

const nftReducer = handleActions({
    [nft.tokensDetails.getMetadata]: (state, { ready, error, payload }) =>
        (!ready || error || !payload.metadata)
            ? state
            : ({
                ...state,
                nft: {
                    ...state.nft,
                    [payload.contractName]: {
                        ...state.nft[payload.contractName],
                        ...payload.metadata,
                        contractName: payload.contractName
                    }
                }
            }),
    [nft.tokensDetails.getTokens]: (state, { ready, error, payload }) => 
        (!ready || error)
            ? state
            : ({
                ...state,
                nft: {
                    ...state.nft,
                    [payload.contractName]: {
                        ...state.nft[payload.contractName],
                        tokens: payload.tokens
                    }
                }
            }),
}, initialState)

const clearReducer = handleActions({
    [nft.clearState]: () => ({
        ...initialState
    }),
}, initialState)

export default reduceReducers(
    initialState,
    likelyContractsReducer,
    nftReducer,
    clearReducer
)

export const selectNFT = state => state.nft.nft
