import reduceReducers from 'reduce-reducers';
import { handleActions } from 'redux-actions';

import { send } from '../../actions/send';

// sample items states for near and fungible tokens transfer
// const items = [
//     {
//         hash: '',
//         type: 'NEP141',
//         details: {
//             token: {
//                 contractName: '',
//                 name: '',
//                 symbol: ''
//             },
//             amount: '',
//             receiver: {
//                 accountId: '',
//             },
//         },
//         status: {
//             txStatus: '',
//             networkFees: ''
//         }
//     },
//     {
//         hash: '',
//         type: 'NEAR',
//         details: {
//             amount: '',
//             receiver: {
//                 accountId: ''
//             }
//         },
//         status: {
//             txStatus: '',
//             networkFees: ''
//         }
//     }
// ]

const initialState = {
    items: []
};

const sendReducer = handleActions({
    [send.transfer.near]: (state, { payload, meta, ready, error }) => 
        (!ready || error)
            ? state
            : ({
                ...state,
                items: [
                    ...state.items,
                    {
                        hash: payload.transaction.hash,
                        type: 'NEAR',
                        details: {
                            amount: meta.amount,
                            receiver: {
                                accountId: meta.receiverId
                            }
                        },
                        status: {
                            txStatus: 'pending',
                            networkFees: payload.transaction_outcome.outcome.gas_burnt,
                        }
                    }
                ]
            }),
    [send.transfer.nep141]: (state, { payload, meta, ready, error }) => 
        (!ready || error)
            ? state
            : ({
                ...state,
                items: [
                    ...state.items,
                    {
                        hash: payload.transaction.hash,
                        type: 'NEP141',
                        details: {
                            token: {
                                contractName: payload.transaction.receiver_id
                            },
                            amount: meta.amount,
                            receiver: {
                                accountId: meta.receiverId
                            }
                        },
                        status: {
                            txStatus: 'pending',
                            networkFees: payload.transaction_outcome.outcome.gas_burnt,
                        }
                    }
                ]
            }),
    [send.setTxStatus]: (state, { payload }) => ({
        ...state,
        items: state.items.map((item) => item.hash === payload.hash
            ? ({
                ...item,
                status: {
                    ...item.status,
                    txStatus: payload.newStatus
                }
            })
            : item
        )
    })
}, initialState);

export default reduceReducers(
    initialState,
    sendReducer
);
