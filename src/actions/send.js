import { createActions } from 'redux-actions';

import { selectTokenDetails } from '../reducers/tokens';
import { showAlert } from '../utils/alerts';
import { wallet } from '../utils/wallet';
import { WalletError } from '../utils/walletError';

export const TOKEN_TYPES = {
    NEAR: 'NEAR',
    NEP141: 'NEP141'
};

export const transfer = ({ 
    type,
    isStorageBalanceAvailable,
    params: {
        contractName, 
        amount, 
        receiverId,
        memo
    }
}) => async (dispatch, getState) => {

    switch (type) {
        case TOKEN_TYPES.NEAR: {
            const { transaction, status } = await dispatch(send.transfer.near(receiverId, amount));

            if (status?.SuccessValue) {
                dispatch(send.setTxStatus({
                    hash: transaction.hash,
                    status: 'success'
                }));
            }
            break;
        }
        case TOKEN_TYPES.NEP141: {
            if (isStorageBalanceAvailable === false) {
                const { status } = await dispatch(send.payStorageDeposit(contractName, receiverId));

                if (!status.SuccessValue || typeof status.SuccessValue !== 'string') {
                    const { error_message, error_type} = status.Failure;
                    throw new WalletError(error_message, error_type);
                }
            }

            const { transaction: { hash }, status } = await dispatch(send.transfer.nep141({
                token: { 
                    contractName,
                    metadata: selectTokenDetails(getState(), contractName)
                },
                amount,
                receiverId,
                memo
            }));

            if (!status.SuccessValue || typeof status.SuccessValue !== 'string') {
                const { error_message, error_type} = status.Failure;
                throw new WalletError(error_message, error_type);
            } else {
                dispatch(send.setTxStatus({
                    hash,
                    status: 'success'
                }));
            }
            break;
        }
        default:
            throw new WalletError(`Could not transfer unsupported token: ${type}`, 'send.unsupportedToken', { type });
    }
};

export const { send } = createActions({
    SEND: {
        TRANSFER: {
            NEAR: [
                (...args) => wallet.sendMoney(...args),
                (receiverId, amount) => ({
                    ...showAlert({ onlyError: true }),
                    receiverId,
                    amount
                })
            ],
            NEP141: [
                (...args) => wallet.fungibleTokens.transfer(...args),
                ({
                    amount,
                    receiverId
                }) => ({
                    ...showAlert({ onlyError: true }),
                    amount,
                    receiverId
                })
            ],
        },
        PAY_STORAGE_DEPOSIT: [
            (...args) => wallet.fungibleTokens.transferStorageDeposit(...args),
            () => showAlert({ onlyError: true })
        ],
        IS_STORAGE_BALANCE_AVAILABLE: [
            (...args) => wallet.fungibleTokens.isStorageBalanceAvailable(...args),
            () => showAlert({ onlyError: true })
        ],
        SET_TX_STATUS: null,
    }
});
