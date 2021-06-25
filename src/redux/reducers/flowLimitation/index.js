import { handleActions } from 'redux-actions'
import reduceReducers from 'reduce-reducers'

import {
    setFlowLimitation,
    clearFlowLimitation
} from '../../actions/flowLimitation'

const initialState = {
    mainMenu: false,
    subMenu: false,
    accountPages: false,
    accountData: false,
    accountBalance: false
}

const flowLimitationReducer = handleActions({
    [setFlowLimitation]: (state, { payload }) => ({
        ...state,
        ...payload
    }),
    [clearFlowLimitation]: (state) => ({
        ...state,
        ...initialState
    }),
}, initialState)

export default reduceReducers(
    initialState,
    flowLimitationReducer
)
