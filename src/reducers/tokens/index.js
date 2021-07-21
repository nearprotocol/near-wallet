import reduceReducers from 'reduce-reducers';
import { handleActions } from 'redux-actions';
import { createSelector } from 'reselect';

import { tokens } from '../../actions/tokens';

const initialState = {
    tokens: {}
};

const tokensReducer = handleActions({
    [tokens.tokensDetails.getMetadata]: (state, { ready, error, payload }) =>
        (!ready || error || !payload.metadata)
            ? state
            : ({
                ...state,
                tokens: {
                    ...state.tokens,
                    [payload.contractName]: {
                        contractName: payload.contractName,
                        ...state.tokens[payload.contractName],
                        ...payload.metadata
                    }
                }
            }),
    [tokens.tokensDetails.getBalanceOf]: (state, { ready, error, payload }) =>
        (!ready || error)
            ? state
            : ({
                ...state,
                tokens: {
                    ...state.tokens,
                    [payload.contractName]: {
                        ...state.tokens[payload.contractName],
                        contractName: payload.contractName,
                        balance: payload.balance
                    }
                }
            }),
}, initialState);

const clearReducer = handleActions({
    [tokens.clearState]: () => ({
        ...initialState
    }),
}, initialState);

export default reduceReducers(
    initialState,
    tokensReducer,
    clearReducer
);

const selectTokens = (state) => state.tokens.tokens;
export const selectTokensDetails = createSelector(
  selectTokens,
  (tokens) => Object.keys(tokens).map(key => tokens[key]).sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''))
);